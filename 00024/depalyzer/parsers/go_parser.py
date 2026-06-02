from __future__ import annotations

import re
from pathlib import Path
from typing import Any

from .base import BaseParser


class GoParser(BaseParser):
    @property
    def name(self) -> str:
        return "go"

    @property
    def dependency_files(self) -> list[str]:
        return ["go.mod", "go.sum"]

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

        go_mods = [f for f in all_files if f.name == "go.mod"]
        for go_mod in go_mods:
            self._parse_go_mod(go_mod, all_deps, result)

        result["all_dependencies"] = list(all_deps.values())
        result["direct_count"] = len(result["direct_dependencies"])
        result["transitive_count"] = len(result["transitive_dependencies"])
        result["total_count"] = len(result["all_dependencies"])

        return result

    def _parse_go_mod(self, file_path: Path, all_deps: dict, result: dict):
        location = str(file_path.relative_to(file_path.parent))
        try:
            with open(file_path, "r") as f:
                content = f.read()

            require_pattern = r'require\s+([^\s(]+)\s+([^\s]+)(?:\s+//\s+indirect)?'
            requires = re.findall(require_pattern, content)

            in_require_block = False
            for line in content.split("\n"):
                line = line.strip()

                if line.startswith("require ("):
                    in_require_block = True
                    continue
                if in_require_block and line == ")":
                    in_require_block = False
                    continue

                if in_require_block and line and line != ")":
                    match = re.match(r'([^\s(]+)\s+([^\s]+)(?:\s+//\s+(indirect))?', line)
                    if match:
                        name = match.group(1)
                        version = match.group(2)
                        is_indirect = match.group(3) == "indirect"

                        dep_info = {
                            "name": name,
                            "version": version,
                            "type": "transitive" if is_indirect else "direct",
                            "location": location,
                        }
                        result["all_dep_entries"].append(dep_info)
                        if name not in all_deps:
                            if is_indirect:
                                result["transitive_dependencies"].append(dep_info)
                            else:
                                result["direct_dependencies"].append(dep_info)
                            all_deps[name] = dep_info

            for name, version in requires:
                if name.startswith("("):
                    continue
                dep_info = {
                    "name": name,
                    "version": version,
                    "type": "direct",
                    "location": location,
                }
                result["all_dep_entries"].append(dep_info)
                if name not in all_deps:
                    result["direct_dependencies"].append(dep_info)
                    all_deps[name] = dep_info

        except IOError:
            pass
