import argparse
import json
import sys
from typing import Dict, List, Optional

from .exporter import export_csv, print_todos_by_file, print_todos_flat
from .models import Priority, TodoItem
from .priority import PriorityEngine
from .scanner import Scanner
from .tagger import ProjectTagger


def parse_priority_overrides(raw: Optional[List[str]]) -> Optional[Dict[str, str]]:
    if not raw:
        return None
    result = {}
    for item in raw:
        if "=" not in item:
            print(f"警告: 忽略无效的优先级关键词格式 '{item}'，期望格式: 关键词=级别", file=sys.stderr)
            continue
        kw, level = item.split("=", 1)
        result[kw.strip()] = level.strip()
    return result if result else None


def parse_tag_rules(raw: Optional[List[str]]) -> Optional[Dict[str, List[str]]]:
    if not raw:
        return None
    result: Dict[str, List[str]] = {}
    for item in raw:
        if "=" not in item:
            print(f"警告: 忽略无效的标签规则格式 '{item}'，期望格式: 标签名=关键词1,关键词2", file=sys.stderr)
            continue
        tag_name, keywords_str = item.split("=", 1)
        keywords = [k.strip() for k in keywords_str.split(",") if k.strip()]
        result[tag_name.strip()] = keywords
    return result if result else None


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="md-todo",
        description="从 Markdown 笔记中提取待办事项，按优先级排序，支持导出 CSV",
    )
    parser.add_argument(
        "path",
        nargs="?",
        default=".",
        help="要扫描的文件夹路径（默认: 当前目录）",
    )
    parser.add_argument(
        "--ignore",
        "-i",
        nargs="*",
        default=[],
        help="要忽略的子目录名称（可指定多个）",
    )
    parser.add_argument(
        "--priority",
        "-p",
        nargs="*",
        default=[],
        help="自定义优先级关键词，格式: 关键词=级别（级别: urgent/high/normal/low 或 紧急/高/普通/低）",
    )
    parser.add_argument(
        "--tag",
        "-t",
        nargs="*",
        default=[],
        help="自定义项目标签规则，格式: 标签名=关键词1,关键词2",
    )
    parser.add_argument(
        "--csv",
        "-c",
        metavar="FILE",
        default=None,
        help="将待办事项导出为 CSV 文件",
    )
    parser.add_argument(
        "--flat",
        "-f",
        action="store_true",
        help="平铺显示（不按文件分组）",
    )
    parser.add_argument(
        "--no-color",
        action="store_true",
        help="禁用彩色输出",
    )
    parser.add_argument(
        "--sort",
        "-s",
        choices=["priority", "file", "tag"],
        default="file",
        help="排序方式（默认: file，按文件分组，组内按优先级）",
    )
    return parser


def main(argv: Optional[List[str]] = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    if args.no_color:
        import os
        os.environ["NO_COLOR"] = "1"

    try:
        scanner = Scanner(root_path=args.path, ignore_dirs=args.ignore)
        todos = scanner.scan()
    except (FileNotFoundError, NotADirectoryError) as e:
        print(f"错误: {e}", file=sys.stderr)
        return 1

    if not todos:
        print("在指定路径下未找到包含待办事项的 Markdown 文件。")
        return 0

    priority_overrides = parse_priority_overrides(args.priority)
    engine = PriorityEngine(custom_keywords=priority_overrides)
    todos = engine.apply(todos)

    tag_overrides = parse_tag_rules(args.tag)
    tagger = ProjectTagger(custom_rules=tag_overrides)
    todos = tagger.apply(todos)

    if args.sort == "priority":
        todos.sort(key=lambda x: x.priority)
    elif args.sort == "file":
        todos.sort(key=lambda x: (x.file_path, x.priority))
    elif args.sort == "tag":
        todos.sort(key=lambda x: (",".join(sorted(x.tags)), x.priority))

    if args.csv:
        csv_todos = sorted(todos, key=lambda x: (x.file_path, x.priority))
        export_csv(csv_todos, args.csv)
    elif args.flat:
        print_todos_flat(todos)
    else:
        print_todos_by_file(todos)

    return 0
