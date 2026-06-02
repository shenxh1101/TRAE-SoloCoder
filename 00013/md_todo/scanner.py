import re
from pathlib import Path
from typing import List, Optional, Set

from .models import TodoItem

TODO_PATTERNS = [
    re.compile(r"^\s*- \[ \]\s*(.*)"),
    re.compile(r"^\s*TODO[:：]?\s*(.*)", re.IGNORECASE),
]

HEADING_PATTERN = re.compile(r"^(#{1,6})\s+(.+)$")


class Scanner:
    def __init__(
        self,
        root_path: str,
        ignore_dirs: Optional[List[str]] = None,
    ):
        self.root_path = Path(root_path).resolve()
        self.ignore_dirs: Set[str] = set(ignore_dirs or [])

    def _should_ignore(self, path: Path) -> bool:
        rel = path.relative_to(self.root_path)
        for part in rel.parts:
            if part in self.ignore_dirs:
                return True
        return False

    def _find_md_files(self) -> List[Path]:
        if not self.root_path.exists():
            raise FileNotFoundError(f"路径不存在: {self.root_path}")
        if not self.root_path.is_dir():
            raise NotADirectoryError(f"不是目录: {self.root_path}")

        md_files = []
        for p in self.root_path.rglob("*.md"):
            if self._should_ignore(p):
                continue
            md_files.append(p)
        return sorted(md_files)

    def _extract_todos_from_file(self, file_path: Path) -> List[TodoItem]:
        todos = []
        current_headings: List[str] = []

        try:
            with open(file_path, "r", encoding="utf-8") as f:
                lines = f.readlines()
        except (UnicodeDecodeError, PermissionError):
            return todos

        for line_num, line in enumerate(lines, start=1):
            line_stripped = line.rstrip("\n\r")

            heading_match = HEADING_PATTERN.match(line_stripped)
            if heading_match:
                current_headings.append(heading_match.group(2).strip())
                continue

            for pattern in TODO_PATTERNS:
                match = pattern.match(line_stripped)
                if match:
                    content = match.group(1).strip()
                    if not content:
                        content = line_stripped.strip()

                    heading = current_headings[-1] if current_headings else None

                    todos.append(
                        TodoItem(
                            content=content,
                            file_path=str(file_path),
                            line_number=line_num,
                            heading=heading,
                            raw_line=line_stripped,
                        )
                    )
                    break

        return todos

    def scan(self) -> List[TodoItem]:
        all_todos = []
        md_files = self._find_md_files()
        for f in md_files:
            todos = self._extract_todos_from_file(f)
            all_todos.extend(todos)
        return all_todos
