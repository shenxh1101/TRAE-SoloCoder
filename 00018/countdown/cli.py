import argparse
import sys
from datetime import datetime

from countdown.generator import generate_copy, generate_batch, generate_all_styles
from countdown.exporter import export_to_csv, export_all_styles
from countdown.phrases import get_all_styles


STYLE_NAMES = {
    "suspense": "悬念风",
    "tech": "技术风",
    "emotional": "情怀风",
}


def validate_date(date_str: str) -> bool:
    try:
        parsed = datetime.strptime(date_str, "%Y-%m-%d")
        return parsed.date() >= datetime.now().date()
    except ValueError:
        return False


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="countdown",
        description="产品发布会倒计时每日海报文案生成器",
    )

    parser.add_argument(
        "-p", "--product",
        required=True,
        help="产品名称",
    )

    parser.add_argument(
        "-d", "--date",
        required=True,
        help="发布日期，格式 YYYY-MM-DD",
    )

    parser.add_argument(
        "-s", "--style",
        choices=get_all_styles(),
        default=None,
        help="文案风格：suspense(悬念风) / tech(技术风) / emotional(情怀风)。不指定则生成全部风格",
    )

    parser.add_argument(
        "-k", "--keywords",
        nargs=3,
        metavar=("KW1", "KW2", "KW3"),
        help="3个核心关键词，将融入文案",
    )

    parser.add_argument(
        "-n", "--days-ahead",
        type=int,
        default=10,
        help="提前生成未来N天的文案（默认10天）",
    )

    parser.add_argument(
        "-o", "--output",
        default=None,
        help="导出CSV文件路径",
    )

    parser.add_argument(
        "--today-only",
        action="store_true",
        help="仅生成今天的文案",
    )

    return parser


def print_copy_entry(entry: dict):
    style_cn = STYLE_NAMES.get(entry["style"], entry["style"])
    print(f"  📅 {entry['date']}  |  ⏳ 倒数 {entry['days_remaining']} 天  |  🎨 {style_cn}")
    print(f"     {entry['copy']}")
    print()


def run(args=None):
    parser = build_parser()
    opts = parser.parse_args(args)

    if not validate_date(opts.date):
        print("❌ 发布日期无效或已过去，请输入今天或之后的日期（YYYY-MM-DD）")
        sys.exit(1)

    launch_date = datetime.strptime(opts.date, "%Y-%m-%d").date()
    today = datetime.now().date()
    days_remaining = (launch_date - today).days

    print(f"\n🚀 产品：{opts.product}")
    print(f"📅 发布日期：{opts.date}（距今天还有 {days_remaining} 天）")
    if opts.keywords:
        print(f"🔑 关键词：{' / '.join(opts.keywords)}")
    print()

    if opts.today_only:
        if opts.style:
            copy = generate_copy(
                days_remaining, opts.style, opts.product, opts.keywords
            )
            entry = {
                "date": today.strftime("%Y-%m-%d"),
                "days_remaining": days_remaining,
                "style": opts.style,
                "copy": copy,
            }
            style_cn = STYLE_NAMES.get(opts.style, opts.style)
            print(f"═══ {style_cn} ═══")
            print_copy_entry(entry)
        else:
            for style in get_all_styles():
                style_cn = STYLE_NAMES.get(style, style)
                print(f"═══ {style_cn} ═══")
                copy = generate_copy(
                    days_remaining, style, opts.product, opts.keywords
                )
                entry = {
                    "date": today.strftime("%Y-%m-%d"),
                    "days_remaining": days_remaining,
                    "style": style,
                    "copy": copy,
                }
                print_copy_entry(entry)
    else:
        if opts.style:
            style_cn = STYLE_NAMES.get(opts.style, opts.style)
            print(f"═══ {style_cn} ═══")
            results = generate_batch(
                opts.date, opts.style, opts.product, opts.keywords, opts.days_ahead
            )
            for entry in results:
                print_copy_entry(entry)

            if opts.output:
                export_to_csv(results, opts.output)
                print(f"✅ 已导出到 {opts.output}\n")
        else:
            all_results = generate_all_styles(
                opts.date, opts.product, opts.keywords, opts.days_ahead
            )
            for style, entries in all_results.items():
                style_cn = STYLE_NAMES.get(style, style)
                print(f"═══ {style_cn} ═══")
                for entry in entries:
                    print_copy_entry(entry)

            if opts.output:
                export_all_styles(all_results, opts.output)
                print(f"✅ 已导出到 {opts.output}\n")
