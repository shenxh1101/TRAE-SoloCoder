from __future__ import annotations

import re
from pathlib import Path
from typing import Any

from .base import BaseParser


class PipParser(BaseParser):
    @property
    def name(self) -> str:
        return "pip"

    @property
    def dependency_files(self) -> list[str]:
        return [
            "requirements.txt",
            "requirements*.txt",
            "Pipfile",
            "Pipfile.lock",
            "pyproject.toml",
            "poetry.lock",
            "setup.py",
            "setup.cfg",
        ]

    def parse(self, repo_path: Path) -> dict[str, Any]:
        result = {
            "direct_dependencies": [],
            "transitive_dependencies": [],
            "all_dependencies": [],
            "all_dep_entries": [],
            "files_found": [],
            "direct_count": 0,
            "transitive_count": 0,
            "total_count": 0,
        }

        all_files = self.find_dependency_files(repo_path)
        result["files_found"] = [str(f.relative_to(repo_path)) for f in all_files]

        all_deps = {}
        seen = set()

        for f in all_files:
            location = str(f.relative_to(repo_path))

            if f.name == "requirements.txt" or f.name.startswith("requirements"):
                self._parse_requirements_txt(f, all_deps, seen, result, location)
            elif f.name == "Pipfile":
                self._parse_pipfile(f, all_deps, seen, result, location)
            elif f.name == "Pipfile.lock":
                self._parse_pipfile_lock(f, all_deps, result)
            elif f.name == "pyproject.toml":
                self._parse_pyproject_toml(f, all_deps, seen, result, location)
            elif f.name == "poetry.lock":
                self._parse_poetry_lock(f, all_deps, result)

        result["all_dependencies"] = list(all_deps.values())
        result["direct_count"] = len(result["direct_dependencies"])
        result["transitive_count"] = len(result["transitive_dependencies"])
        result["total_count"] = len(result["all_dependencies"])

        return result

    def _parse_requirements_txt(self, file_path: Path, all_deps: dict, seen: set, result: dict, location: str):
        try:
            with open(file_path, "r") as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith("#"):
                        continue

                    name, version = self._parse_package_line(line)
                    if name:
                        dep_info = {
                            "name": name,
                            "version": version or "",
                            "type": "direct",
                            "location": location,
                        }
                        result["all_dep_entries"].append(dep_info)
                        if name not in seen:
                            result["direct_dependencies"].append(dep_info)
                            all_deps[name] = dep_info
                            seen.add(name)
        except IOError:
            pass

    def _parse_package_line(self, line: str) -> tuple[str | None, str | None]:
        line = line.split("#")[0].strip()

        if line.startswith("-r") or line.startswith("--requirement"):
            return None, None

        match = re.match(r'^([a-zA-Z0-9_.-]+)\s*([<>=!~]+.*)?$', line)
        if match:
            name = match.group(1).lower().replace("_", "-")
            version = match.group(2) or ""
            return name, self._clean_version(version.strip() if version else "")

        return None, None

    def _clean_version(self, version: str) -> str:
        version = version.strip()
        for prefix in ["==", ">=", "<=", "!=", "~=", ">", "<", "~", "="]:
            while version.startswith(prefix):
                version = version[len(prefix):]
        return version.strip()

    def _parse_pipfile(self, file_path: Path, all_deps: dict, seen: set, result: dict, location: str):
        try:
            import toml

            with open(file_path, "r") as f:
                data = toml.load(f)

            for section in ["packages", "dev-packages"]:
                for name, version in data.get(section, {}).items():
                    name = name.lower().replace("_", "-")
                    if name not in seen:
                        version_str = version if isinstance(version, str) else version.get("version", "")
                        dep_info = {
                            "name": name,
                            "version": version_str,
                            "type": section,
                            "location": location,
                        }
                        result["direct_dependencies"].append(dep_info)
                        all_deps[name] = dep_info
                        seen.add(name)
        except (ImportError, IOError):
            pass

    def _parse_pipfile_lock(self, file_path: Path, all_deps: dict, result: dict):
        try:
            import json

            with open(file_path, "r") as f:
                data = json.load(f)

            for section in ["default", "develop"]:
                for name, pkg_data in data.get(section, {}).items():
                    name = name.lower().replace("_", "-")
                    if name not in all_deps:
                        dep_info = {
                            "name": name,
                            "version": pkg_data.get("version", "").lstrip("="),
                            "type": "transitive",
                            "location": str(file_path.relative_to(file_path.parent)),
                        }
                        result["transitive_dependencies"].append(dep_info)
                        all_deps[name] = dep_info
        except (json.JSONDecodeError, IOError):
            pass

    def _parse_pyproject_toml(self, file_path: Path, all_deps: dict, seen: set, result: dict, location: str):
        try:
            import toml

            with open(file_path, "r") as f:
                data = toml.load(f)

            project = data.get("project", {})
            for dep in project.get("dependencies", []):
                name, version = self._parse_package_line(dep)
                if name and name not in seen:
                    dep_info = {
                        "name": name,
                        "version": version or "",
                        "type": "direct",
                        "location": location,
                    }
                    result["direct_dependencies"].append(dep_info)
                    all_deps[name] = dep_info
                    seen.add(name)

            for dep in project.get("optional-dependencies", {}).get("dev", []):
                name, version = self._parse_package_line(dep)
                if name and name not in seen:
                    dep_info = {
                        "name": name,
                        "version": version or "",
                        "type": "dev",
                        "location": location,
                    }
                    result["direct_dependencies"].append(dep_info)
                    all_deps[name] = dep_info
                    seen.add(name)

            poetry = data.get("tool", {}).get("poetry", {})
            for section in ["dependencies", "dev-dependencies", "group"]:
                deps = poetry.get(section, {})
                if section == "group":
                    for group in deps.values():
                        for name, version in group.get("dependencies", {}).items():
                            self._add_poetry_dep(name, version, all_deps, seen, result, location)
                else:
                    for name, version in deps.items():
                        if name != "python":
                            self._add_poetry_dep(name, version, all_deps, seen, result, location)
        except (ImportError, IOError):
            pass

    def _add_poetry_dep(self, name: str, version: any, all_deps: dict, seen: set, result: dict, location: str):
        name = name.lower().replace("_", "-")
        if name not in seen:
            version_str = version if isinstance(version, str) else version.get("version", "")
            dep_info = {
                "name": name,
                "version": version_str,
                "type": "direct",
                "location": location,
            }
            result["direct_dependencies"].append(dep_info)
            all_deps[name] = dep_info
            seen.add(name)

    def _parse_poetry_lock(self, file_path: Path, all_deps: dict, result: dict):
        try:
            import toml

            with open(file_path, "r") as f:
                data = toml.load(f)

            for pkg in data.get("package", []):
                name = pkg.get("name", "").lower().replace("_", "-")
                if name and name not in all_deps:
                    dep_info = {
                        "name": name,
                        "version": pkg.get("version", ""),
                        "type": "transitive",
                        "location": str(file_path.relative_to(file_path.parent)),
                    }
                    result["transitive_dependencies"].append(dep_info)
                    all_deps[name] = dep_info
        except (ImportError, IOError):
            pass
