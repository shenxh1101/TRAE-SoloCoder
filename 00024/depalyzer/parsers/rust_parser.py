from __future__ import annotations

from pathlib import Path
from typing import Any

from .base import BaseParser


class RustParser(BaseParser):
    @property
    def name(self) -> str:
        return "rust"

    @property
    def dependency_files(self) -> list[str]:
        return ["Cargo.toml", "Cargo.lock"]

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

        all_files = self.find_dependency_files(repo_path)
        result["files_found"] = [str(f.relative_to(repo_path)) for f in all_files]

        all_deps = {}
        seen = set()

        cargo_tomls = [f for f in all_files if f.name == "Cargo.toml"]
        cargo_locks = [f for f in all_files if f.name == "Cargo.lock"]

        for f in cargo_tomls:
            self._parse_cargo_toml(f, all_deps, seen, result)

        for f in cargo_locks:
            self._parse_cargo_lock(f, all_deps, result)

        result["all_dependencies"] = list(all_deps.values())
        result["direct_count"] = len(result["direct_dependencies"])
        result["transitive_count"] = len(result["transitive_dependencies"])
        result["total_count"] = len(result["all_dependencies"])

        return result

    def _parse_cargo_toml(self, file_path: Path, all_deps: dict, seen: set, result: dict):
        location = str(file_path.relative_to(file_path.parent))
        try:
            import toml

            with open(file_path, "r") as f:
                data = toml.load(f)

            for section in ["dependencies", "dev-dependencies", "build-dependencies"]:
                for name, version in data.get(section, {}).items():
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

    def _parse_cargo_lock(self, file_path: Path, all_deps: dict, result: dict):
        try:
            import toml

            with open(file_path, "r") as f:
                data = toml.load(f)

            for pkg in data.get("package", []):
                name = pkg.get("name", "")
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
