from __future__ import annotations

from abc import ABC, abstractmethod
from pathlib import Path
from typing import Any


class BaseParser(ABC):
    @property
    @abstractmethod
    def name(self) -> str:
        pass

    @property
    @abstractmethod
    def dependency_files(self) -> list[str]:
        pass

    @abstractmethod
    def parse(self, repo_path: Path) -> dict[str, Any]:
        pass

    def find_dependency_files(self, repo_path: Path) -> list[Path]:
        found = []
        for pattern in self.dependency_files:
            found.extend(repo_path.rglob(pattern))
        return [f for f in found if ".git" not in f.parts]
