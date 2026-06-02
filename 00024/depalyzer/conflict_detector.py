from __future__ import annotations

from collections import defaultdict
from typing import Any


class ConflictDetector:
    def __init__(self, analysis_result: dict[str, Any]):
        self.analysis_result = analysis_result

    def detect(self) -> list[dict[str, Any]]:
        conflicts = []

        for pkg_manager, data in self.analysis_result.items():
            package_versions = defaultdict(dict)

            all_deps = data.get("all_dep_entries", data.get("all_dependencies", []))
            for dep in all_deps:
                name = dep.get("name")
                version = dep.get("version", "")
                location = dep.get("location", "unknown")

                if name:
                    package_versions[name][location] = version

            for package_name, locations in package_versions.items():
                versions = set(locations.values())
                if len(versions) > 1:
                    conflicts.append({
                        "package": package_name,
                        "package_manager": pkg_manager,
                        "locations": locations,
                    })

        return conflicts
