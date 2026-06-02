from __future__ import annotations

from collections import defaultdict
from pathlib import Path
from typing import Any

from .license_db import LICENSE_DB


class LicenseAnalyzer:
    def __init__(self, analysis_result: dict[str, Any]):
        self.analysis_result = analysis_result

    def analyze(self) -> dict[str, Any]:
        summary = {}

        for pkg_manager, data in self.analysis_result.items():
            license_counts = defaultdict(int)
            packages_with_licenses = []

            for dep in data.get("all_dependencies", []):
                package_name = dep.get("name", "")
                license_info = self._get_license_info(package_name, pkg_manager)
                license_name = license_info.get("license", "Unknown")

                license_counts[license_name] += 1

                packages_with_licenses.append({
                    **dep,
                    "license": license_name,
                    "license_url": license_info.get("url", ""),
                })

            summary[pkg_manager] = {
                "license_counts": dict(license_counts),
                "packages": packages_with_licenses,
            }

        return summary

    def _get_license_info(self, package_name: str, pkg_manager: str) -> dict[str, str]:
        manager_db = LICENSE_DB.get(pkg_manager, {})
        return manager_db.get(package_name.lower(), {"license": "Unknown", "url": ""})
