from dataclasses import dataclass, field
from enum import IntEnum
from typing import List, Optional


class Priority(IntEnum):
    URGENT = 1
    HIGH = 2
    NORMAL = 3
    LOW = 4

    @property
    def label(self) -> str:
        return {
            Priority.URGENT: "紧急",
            Priority.HIGH: "高",
            Priority.NORMAL: "普通",
            Priority.LOW: "低",
        }[self]

    @property
    def color(self) -> str:
        return {
            Priority.URGENT: "\033[91m",
            Priority.HIGH: "\033[93m",
            Priority.NORMAL: "\033[92m",
            Priority.LOW: "\033[90m",
        }[self]


@dataclass
class TodoItem:
    content: str
    file_path: str
    line_number: int
    priority: Priority = Priority.NORMAL
    tags: List[str] = field(default_factory=list)
    heading: Optional[str] = None
    raw_line: str = ""

    @property
    def source_file(self) -> str:
        from pathlib import Path
        return Path(self.file_path).name

    @property
    def source_folder(self) -> str:
        from pathlib import Path
        return Path(self.file_path).parent.name
