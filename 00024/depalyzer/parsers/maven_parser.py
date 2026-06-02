from __future__ import annotations

import re
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Any

from .base import BaseParser


class MavenParser(BaseParser):
    @property
    def name(self) -> str:
        return "maven"

    @property
    def dependency_files(self) -> list[str]:
        return ["pom.xml", "build.gradle", "build.gradle.kts"]

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

        for f in all_files:
            location = str(f.relative_to(repo_path))

            if f.name == "pom.xml":
                self._parse_pom_xml(f, all_deps, seen, result, location)
            elif f.name in ["build.gradle", "build.gradle.kts"]:
                self._parse_gradle(f, all_deps, seen, result, location)

        result["all_dependencies"] = list(all_deps.values())
        result["direct_count"] = len(result["direct_dependencies"])
        result["transitive_count"] = len(result["transitive_dependencies"])
        result["total_count"] = len(result["all_dependencies"])

        return result

    def _parse_pom_xml(self, file_path: Path, all_deps: dict, seen: set, result: dict, location: str):
        try:
            tree = ET.parse(file_path)
            root = tree.getroot()

            ns = {"m": "http://maven.apache.org/POM/4.0.0"}

            for dep in root.findall(".//m:dependencies/m:dependency", ns):
                group_id = dep.find("m:groupId", ns)
                artifact_id = dep.find("m:artifactId", ns)
                version = dep.find("m:version", ns)
                scope = dep.find("m:scope", ns)

                if group_id is not None and artifact_id is not None:
                    name = f"{group_id.text}:{artifact_id.text}"
                    if name not in seen:
                        dep_info = {
                            "name": name,
                            "version": version.text if version is not None else "",
                            "type": scope.text if scope is not None else "compile",
                            "location": location,
                        }
                        result["direct_dependencies"].append(dep_info)
                        all_deps[name] = dep_info
                        seen.add(name)

        except (ET.ParseError, IOError):
            pass

    def _parse_gradle(self, file_path: Path, all_deps: dict, seen: set, result: dict, location: str):
        try:
            with open(file_path, "r") as f:
                content = f.read()

            patterns = [
                r'implementation\s+[\'"]?([^\s:]+):([^\s:]+):([^\s"\']+)[\'"]?',
                r'compile\s+[\'"]?([^\s:]+):([^\s:]+):([^\s"\']+)[\'"]?',
                r'api\s+[\'"]?([^\s:]+):([^\s:]+):([^\s"\']+)[\'"]?',
                r'debugImplementation\s+[\'"]?([^\s:]+):([^\s:]+):([^\s"\']+)[\'"]?',
                r'testImplementation\s+[\'"]?([^\s:]+):([^\s:]+):([^\s"\']+)[\'"]?',
            ]

            for pattern in patterns:
                for match in re.finditer(pattern, content):
                    group = match.group(1)
                    artifact = match.group(2)
                    version = match.group(3)
                    name = f"{group}:{artifact}"

                    if name not in seen:
                        dep_info = {
                            "name": name,
                            "version": version,
                            "type": "direct",
                            "location": location,
                        }
                        result["direct_dependencies"].append(dep_info)
                        all_deps[name] = dep_info
                        seen.add(name)

        except IOError:
            pass
