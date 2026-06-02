from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from .base import BaseParser


class NpmParser(BaseParser):
    @property
    def name(self) -> str:
        return "npm"

    @property
    def dependency_files(self) -> list[str]:
        return ["package.json", "package-lock.json", "yarn.lock", "pnpm-lock.yaml"]

    def parse(self, repo_path: Path) -> dict[str, Any]:
        result = {
            "direct_dependencies": [],
            "transitive_dependencies": [],
            "all_dependencies": [],
            "files_found": [],
            "direct_count": 0,
            "transitive_count": 0,
            "total_count": 0,
        }

        package_files = [f for f in self.find_dependency_files(repo_path) if f.name == "package.json"]
        lock_files = [f for f in self.find_dependency_files(repo_path) if f.name in ["package-lock.json", "yarn.lock", "pnpm-lock.yaml"]]

        result["files_found"] = [str(f.relative_to(repo_path)) for f in package_files + lock_files]

        all_deps = {}
        seen = set()
        all_dep_entries = []

        for package_file in package_files:
            try:
                with open(package_file, "r") as f:
                    data = json.load(f)

                location = str(package_file.relative_to(repo_path))

                for dep_type in ["dependencies", "devDependencies", "peerDependencies"]:
                    for name, version in data.get(dep_type, {}).items():
                        dep_info = {
                            "name": name,
                            "version": self._clean_version(version),
                            "type": dep_type,
                            "location": location,
                        }
                        all_dep_entries.append(dep_info)
                        if name not in seen:
                            result["direct_dependencies"].append(dep_info)
                            all_deps[name] = dep_info
                            seen.add(name)
            except (json.JSONDecodeError, IOError):
                continue

        result["all_dep_entries"] = all_dep_entries

        for lock_file in lock_files:
            if lock_file.name == "package-lock.json":
                self._parse_package_lock(lock_file, all_deps, result)
            elif lock_file.name == "yarn.lock":
                self._parse_yarn_lock(lock_file, all_deps, result)
            elif lock_file.name == "pnpm-lock.yaml":
                self._parse_pnpm_lock(lock_file, all_deps, result)

        result["all_dependencies"] = list(all_deps.values())
        result["direct_count"] = len(result["direct_dependencies"])
        result["transitive_count"] = len(result["transitive_dependencies"])
        result["total_count"] = len(result["all_dependencies"])

        return result

    def _clean_version(self, version: str) -> str:
        version = version.strip()
        for prefix in ["^", "~", ">", "<", "=", "*"]:
            while version.startswith(prefix):
                version = version[1:]
        return version

    def _parse_package_lock(self, lock_file: Path, all_deps: dict, result: dict):
        try:
            with open(lock_file, "r") as f:
                data = json.load(f)

            packages = data.get("packages", {})
            for path, pkg_data in packages.items():
                if not path:
                    continue

                name = pkg_data.get("name") or path.split("node_modules/")[-1]
                version = pkg_data.get("version", "")

                if name not in all_deps:
                    dep_info = {
                        "name": name,
                        "version": version,
                        "type": "transitive",
                        "location": str(lock_file.relative_to(lock_file.parent)),
                        "parent": self._find_parent(path, packages),
                    }
                    result["transitive_dependencies"].append(dep_info)
                    all_deps[name] = dep_info
        except (json.JSONDecodeError, IOError):
            pass

    def _find_parent(self, path: str, packages: dict) -> str | None:
        parts = path.split("node_modules/")
        if len(parts) > 2:
            parent_path = "node_modules/".join(parts[:-1]) + "node_modules/" + parts[-2].rstrip("/")
            if parent_path in packages:
                return packages[parent_path].get("name") or parts[-2].rstrip("/")
        return None

    def _parse_yarn_lock(self, lock_file: Path, all_deps: dict, result: dict):
        try:
            with open(lock_file, "r") as f:
                content = f.read()

            import re

            pattern = r'^"?([^@"\n]+@(?:npm:)?[^"\n,]+)"?:\s*$'
            matches = re.finditer(pattern, content, re.MULTILINE)

            for match in matches:
                dep_str = match.group(1)
                name = dep_str.split("@")[0] if "@" in dep_str else dep_str
                if name and name not in all_deps:
                    version_match = re.search(r'version\s+"([^"]+)"', content[match.end():match.end() + 500])
                    version = version_match.group(1) if version_match else ""

                    dep_info = {
                        "name": name,
                        "version": version,
                        "type": "transitive",
                        "location": str(lock_file.relative_to(lock_file.parent)),
                    }
                    result["transitive_dependencies"].append(dep_info)
                    all_deps[name] = dep_info
        except IOError:
            pass

    def _parse_pnpm_lock(self, lock_file: Path, all_deps: dict, result: dict):
        try:
            import yaml

            with open(lock_file, "r") as f:
                data = yaml.safe_load(f)

            packages = data.get("packages", {})
            for path, pkg_data in packages.items():
                if path.startswith("/"):
                    path = path[1:]

                if "@" in path:
                    name, version = path.rsplit("@", 1)
                else:
                    name = path
                    version = pkg_data.get("version", "")

                if name not in all_deps:
                    dep_info = {
                        "name": name,
                        "version": version.split("(")[0],
                        "type": "transitive",
                        "location": str(lock_file.relative_to(lock_file.parent)),
                    }
                    result["transitive_dependencies"].append(dep_info)
                    all_deps[name] = dep_info
        except (ImportError, IOError):
            pass
