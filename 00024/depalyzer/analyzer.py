from __future__ import annotations

from pathlib import Path
from typing import Any

from .parsers import (
    GoParser,
    MavenParser,
    NpmParser,
    PipParser,
    RustParser,
)


class DependencyAnalyzer:
    def __init__(self, repo_path: Path):
        self.repo_path = repo_path
        self.parsers = [
            NpmParser(),
            PipParser(),
            GoParser(),
            MavenParser(),
            RustParser(),
        ]

    def analyze(self) -> dict[str, Any]:
        result = {}

        for parser in self.parsers:
            parser_result = parser.parse(self.repo_path)
            if parser_result.get("files_found"):
                result[parser.name] = parser_result

        return result
