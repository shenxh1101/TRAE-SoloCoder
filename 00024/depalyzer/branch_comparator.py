from __future__ import annotations

import subprocess
import tempfile
from pathlib import Path
from typing import Any

from .analyzer import DependencyAnalyzer
from .utils import is_version_greater


class BranchComparator:
    def __init__(self, repo_path: Path):
        self.repo_path = repo_path

    def compare(self, branch1: str, branch2: str) -> dict[str, Any]:
        deps1 = self._get_branch_dependencies(branch1)
        deps2 = self._get_branch_dependencies(branch2)

        differences = {}

        all_pkg_managers = set(deps1.keys()) | set(deps2.keys())

        for pkg_manager in all_pkg_managers:
            diff = self._compare_package_manager(
                deps1.get(pkg_manager, {}),
                deps2.get(pkg_manager, {}),
            )
            if any(diff.values()):
                differences[pkg_manager] = diff

        return {
            "branch1": branch1,
            "branch2": branch2,
            "differences": differences,
        }

    def _get_branch_dependencies(self, branch: str) -> dict[str, Any]:
        with tempfile.TemporaryDirectory() as tmpdir:
            self._checkout_branch(branch, tmpdir)
            analyzer = DependencyAnalyzer(Path(tmpdir))
            return analyzer.analyze()

    def _checkout_branch(self, branch: str, target_dir: str):
        try:
            subprocess.run(
                ["git", "clone", "--depth", "1", "--branch", branch, str(self.repo_path), target_dir],
                check=True,
                capture_output=True,
            )
        except subprocess.CalledProcessError as e:
            raise RuntimeError(f"无法检出分支 {branch}: {e.stderr.decode() if e.stderr else str(e)}")

    def _compare_package_manager(
        self,
        deps1: dict[str, Any],
        deps2: dict[str, Any],
    ) -> dict[str, list]:
        added = []
        removed = []
        upgraded = []
        downgraded = []

        deps1_map = {d["name"]: d for d in deps1.get("all_dependencies", [])}
        deps2_map = {d["name"]: d for d in deps2.get("all_dependencies", [])}

        for name, dep2 in deps2_map.items():
            if name not in deps1_map:
                added.append(dep2)

        for name, dep1 in deps1_map.items():
            if name not in deps2_map:
                removed.append(dep1)

        for name in set(deps1_map.keys()) & set(deps2_map.keys()):
            dep1 = deps1_map[name]
            dep2 = deps2_map[name]

            v1 = dep1.get("version", "")
            v2 = dep2.get("version", "")

            if v1 != v2:
                comparison = {
                    "name": name,
                    "old_version": v1,
                    "new_version": v2,
                }

                if is_version_greater(v2, v1):
                    upgraded.append(comparison)
                else:
                    downgraded.append(comparison)

        return {
            "added": added,
            "removed": removed,
            "upgraded": upgraded,
            "downgraded": downgraded,
        }


