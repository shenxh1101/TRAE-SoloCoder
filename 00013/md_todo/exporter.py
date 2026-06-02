import csv
import sys
from collections import defaultdict
from pathlib import Path
from typing import List

from .models import Priority, TodoItem

RESET = "\033[0m"
BOLD = "\033[1m"
DIM = "\033[2m"
CYAN = "\033[96m"
BLUE = "\033[94m"


def _supports_color() -> bool:
    return hasattr(sys.stdout, "isatty") and sys.stdout.isatty()


def print_todos_by_file(items: List[TodoItem]) -> None:
    if not items:
        print("没有找到待办事项。")
        return

    use_color = _supports_color()
    grouped: dict[str, List[TodoItem]] = defaultdict(list)
    for item in items:
        grouped[item.file_path].append(item)

    total = len(items)
    file_count = len(grouped)
    if use_color:
        print(f"\n{BOLD}📋 共找到 {total} 个待办事项（来自 {file_count} 个文件）{RESET}\n")
    else:
        print(f"\n共找到 {total} 个待办事项（来自 {file_count} 个文件）\n")

    for file_path, file_items in sorted(grouped.items()):
        p = Path(file_path)
        rel = str(p)
        if use_color:
            print(f"{BOLD}{BLUE}📄 文件：{rel}{RESET}")
        else:
            print(f"📄 文件：{rel}")
        print("─" * min(len(rel) + 7, 80))

        for item in sorted(file_items, key=lambda x: x.priority):
            if use_color:
                color = item.priority.color
                p_label = f"{color}[{item.priority.label}]{RESET}"
            else:
                p_label = f"[{item.priority.label}]"

            tags_str = ""
            if item.tags:
                tag_joined = ", ".join(item.tags)
                tags_str = f" {DIM}[{tag_joined}]{RESET}" if use_color else f" [{tag_joined}]"

            heading_str = ""
            if item.heading:
                heading_str = f" {DIM}(#{item.heading}){RESET}" if use_color else f" (#{item.heading})"

            print(f"  {p_label} {item.content}{tags_str}{heading_str}")

        print()


def print_todos_flat(items: List[TodoItem]) -> None:
    if not items:
        print("没有找到待办事项。")
        return

    use_color = _supports_color()

    for item in items:
        if use_color:
            color = item.priority.color
            p_label = f"{color}[{item.priority.label}]{RESET}"
        else:
            p_label = f"[{item.priority.label}]"

        source = item.source_file
        tags_str = ""
        if item.tags:
            tag_joined = ", ".join(item.tags)
            tags_str = f" {DIM}[{tag_joined}]{RESET}" if use_color else f" [{tag_joined}]"

        if use_color:
            print(f"{p_label} {item.content} {DIM}← {source}{RESET}{tags_str}")
        else:
            print(f"{p_label} {item.content} ← {source}{tags_str}")


def export_csv(items: List[TodoItem], output_path: str) -> None:
    fieldnames = [
        "优先级",
        "优先级数值",
        "内容",
        "来源文件",
        "行号",
        "标题上下文",
        "项目标签",
        "完整文件路径",
    ]

    with open(output_path, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()

        for item in items:
            writer.writerow(
                {
                    "优先级": item.priority.label,
                    "优先级数值": int(item.priority),
                    "内容": item.content,
                    "来源文件": item.source_file,
                    "行号": item.line_number,
                    "标题上下文": item.heading or "",
                    "项目标签": ", ".join(item.tags),
                    "完整文件路径": item.file_path,
                }
            )

    print(f"已导出 {len(items)} 条待办事项到: {output_path}")
