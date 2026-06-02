#!/usr/bin/env python3
import argparse
import sys
import os

from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.prompt import Prompt, Confirm, IntPrompt
from rich.text import Text
from rich.columns import Columns

from generator import generate_script, get_available_styles, Script
from exporter import (
    export_txt, export_pdf, export_pdf_with_fallback,
    script_to_text, script_all_versions_to_text,
    is_fpdf2_available, PDFNotAvailableError,
)
from batch import batch_generate
from filming_tips import format_tip

console = Console()


def print_banner():
    banner = Text()
    banner.append("🎬 短视频脚本生成器", style="bold magenta")
    banner.append("\n   输入商品信息，一键生成爆款脚本", style="dim")
    console.print(Panel(banner, border_style="magenta"))


def print_segment_options(seg_key: str, script: Script):
    seg = script.segments[seg_key]
    segment_labels = {
        "hook": "🔥 开头钩子",
        "pain_point": "😤 痛点展示",
        "solution": "💡 产品解决方案",
        "cta": "🎯 结尾引导",
    }
    label = segment_labels.get(seg_key, seg_key)

    table = Table(title=label, show_lines=True, expand=True)
    table.add_column("版本", style="cyan bold", width=6)
    table.add_column("话术内容", style="white", ratio=3)
    table.add_column("拍摄建议", style="dim", ratio=2)

    for i, (version, tip) in enumerate(zip(seg.versions, seg.filming_tips)):
        tip_str = f"镜头：{tip.shot_type}\n{tip.detail}\n字幕：{tip.subtitle_position}"
        marker = " ★" if script.selected_versions.get(seg_key) == i else ""
        table.add_row(f"V{i+1}{marker}", version, tip_str)

    console.print(table)


def interactive_select(script: Script) -> Script:
    segment_keys = ["hook", "pain_point", "solution", "cta"]

    console.print("\n[bold yellow]📋 请为每段选择话术版本（输入版本号 1/2/3）：[/bold yellow]\n")

    for seg_key in segment_keys:
        print_segment_options(seg_key, script)

    console.print()
    for seg_key in segment_keys:
        seg = script.segments[seg_key]
        current = script.selected_versions.get(seg_key, 0) + 1
        segment_labels = {
            "hook": "开头钩子",
            "pain_point": "痛点展示",
            "solution": "产品解决方案",
            "cta": "结尾引导",
        }
        choice = IntPrompt.ask(
            f"  {segment_labels[seg_key]} 选择版本 (1-{len(seg.versions)})",
            default=current,
        )
        choice = max(1, min(choice, len(seg.versions)))
        script.select_version(seg_key, choice - 1)

    return script


def show_full_script(script: Script):
    text = script_to_text(script, include_tips=True)
    console.print(Panel(text, title=f"✅ 完整脚本 - {script.product_name}", border_style="green"))


def export_workflow(script: Script):
    pdf_ok = is_fpdf2_available()

    console.print("\n[bold cyan]📁 导出选项：[/bold cyan]")
    console.print("  1. 导出 TXT")
    if pdf_ok:
        console.print("  2. 导出 PDF")
        console.print("  3. 同时导出 TXT 和 PDF")
    else:
        console.print("  2. 导出 PDF [dim red]（不可用，请先运行 pip install fpdf2）[/dim red]")
        console.print("  3. 同时导出 TXT 和 PDF [dim red]（PDF 不可用）[/dim red]")
    console.print("  0. 不导出")

    choice = IntPrompt.ask("请选择", default=1)

    if choice == 0:
        return

    include_tips = Confirm.ask("是否包含拍摄建议？", default=True)
    all_versions = Confirm.ask("是否导出全部版本（否则只导出选中版本）？", default=False)

    base_name = "".join(c for c in script.product_name if c.isalnum() or c in "._- ") or "script"
    output_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "output")

    if choice in (1, 3):
        txt_path = os.path.join(output_dir, f"{base_name}_脚本.txt")
        export_txt(script, txt_path, include_tips=include_tips, all_versions=all_versions)
        console.print(f"  [green]✅ TXT 已导出：{txt_path}[/green]")

    if choice in (2, 3):
        pdf_path = os.path.join(output_dir, f"{base_name}_脚本.pdf")
        try:
            export_pdf(script, pdf_path, include_tips=include_tips, all_versions=all_versions)
            console.print(f"  [green]✅ PDF 已导出：{pdf_path}[/green]")
        except PDFNotAvailableError as e:
            console.print(f"  [red]❌ PDF 导出失败：{e}[/red]")
            fallback = Confirm.ask("  是否改为导出 TXT 格式？", default=True)
            if fallback:
                fallback_path = os.path.join(output_dir, f"{base_name}_脚本_回退.txt")
                export_txt(script, fallback_path, include_tips=include_tips, all_versions=all_versions)
                console.print(f"  [green]✅ 已回退导出 TXT：{fallback_path}[/green]")


def interactive_mode():
    print_banner()

    console.print("[bold cyan]📝 请输入商品信息：[/bold cyan]\n")
    product_name = Prompt.ask("  商品名称")
    if not product_name.strip():
        console.print("[red]商品名称不能为空！[/red]")
        return

    selling_points = []
    for i in range(3):
        sp = Prompt.ask(f"  核心卖点{i+1}")
        if sp.strip():
            selling_points.append(sp.strip())

    if not selling_points:
        console.print("[red]至少需要一个核心卖点！[/red]")
        return

    console.print("\n[bold cyan]🎭 可选开头风格（直接回车随机匹配）：[/bold cyan]")
    styles = get_available_styles()
    for i, s in enumerate(styles, 1):
        console.print(f"  {i}. {s['style_name']} - {s['description']}")

    style_choice = Prompt.ask("选择风格编号", default="0")
    preferred_style = None
    if style_choice.isdigit() and 1 <= int(style_choice) <= len(styles):
        preferred_style = styles[int(style_choice) - 1]["style_name"]

    console.print("\n[bold yellow]⏳ 正在生成脚本...[/bold yellow]")
    script = generate_script(product_name, selling_points, preferred_style)

    if script.segments["hook"].matched_hook_style:
        console.print(f"\n[bold green]🎲 匹配到爆款开头风格：{script.segments['hook'].matched_hook_style}[/bold green]")

    console.print("\n[bold cyan]📄 生成的脚本如下（每段3个版本）：[/bold cyan]\n")
    for seg_key in ["hook", "pain_point", "solution", "cta"]:
        print_segment_options(seg_key, script)

    want_select = Confirm.ask("\n是否选择各段话术版本拼接成完整脚本？", default=True)
    if want_select:
        script = interactive_select(script)

    show_full_script(script)

    want_export = Confirm.ask("\n是否导出脚本文件？", default=True)
    if want_export:
        export_workflow(script)

    console.print("\n[bold magenta]🎬 感谢使用短视频脚本生成器！[/bold magenta]")


def single_command(args):
    product_name = args.product
    selling_points = [sp.strip() for sp in args.points if sp.strip()]

    if not selling_points:
        console.print("[red]至少需要一个核心卖点！[/red]")
        sys.exit(1)

    preferred_style = args.style if hasattr(args, "style") and args.style else None

    script = generate_script(product_name, selling_points, preferred_style)

    if script.segments["hook"].matched_hook_style:
        console.print(f"[green]🎲 匹配开头风格：{script.segments['hook'].matched_hook_style}[/green]\n")

    if args.select:
        script = interactive_select(script)
        show_full_script(script)

    if args.output:
        fmt = args.format or "txt"
        include_tips = not args.no_tips
        all_ver = args.all_versions

        if fmt == "pdf":
            try:
                export_pdf(script, args.output, include_tips=include_tips, all_versions=all_ver)
                console.print(f"[green]✅ 已导出 PDF：{args.output}[/green]")
            except PDFNotAvailableError as e:
                console.print(f"[red]❌ PDF 导出失败：{e}[/red]")
                txt_path = args.output
                if txt_path.endswith(".pdf"):
                    txt_path = txt_path[:-4] + ".txt"
                console.print(f"[yellow]⚠️ 自动回退为 TXT 格式：{txt_path}[/yellow]")
                export_txt(script, txt_path, include_tips=include_tips, all_versions=all_ver)
                console.print(f"[green]✅ 已导出 TXT：{txt_path}[/green]")
        else:
            export_txt(script, args.output, include_tips=include_tips, all_versions=all_ver)
            console.print(f"[green]✅ 已导出 TXT：{args.output}[/green]")
    else:
        text = script_all_versions_to_text(script, include_tips=not args.no_tips)
        console.print(text)


def batch_command(args):
    csv_path = args.csv
    if not os.path.exists(csv_path):
        console.print(f"[red]❌ CSV 文件不存在：{csv_path}[/red]")
        sys.exit(1)

    output_dir = args.output_dir or os.path.join(os.path.dirname(os.path.abspath(__file__)), "output")
    fmt = args.format or "txt"
    include_tips = not args.no_tips

    if fmt == "pdf" and not is_fpdf2_available():
        console.print("[yellow]⚠️ fpdf2 未安装，PDF 导出不可用，将自动回退为 TXT 格式[/yellow]")
        console.print("[dim]提示：运行 pip install fpdf2 后可使用 PDF 导出[/dim]")

    console.print(f"[bold yellow]⏳ 正在批量处理 {csv_path} ...[/bold yellow]")
    exported = batch_generate(csv_path, output_dir, fmt=fmt, include_tips=include_tips)

    if exported:
        console.print(f"\n[bold green]✅ 批量导出完成！共 {len(exported)} 个脚本：[/bold green]")
        for item in exported:
            path = item["path"]
            is_pdf = item["is_pdf"]
            product_name = item["product_name"]
            if is_pdf:
                console.print(f"  📄 {product_name} → {path} [dim](PDF)[/dim]")
            else:
                tag = "[dim yellow](TXT，PDF 回退)[/dim yellow]" if fmt == "pdf" else "[dim](TXT)[/dim]"
                console.print(f"  📄 {product_name} → {path} {tag}")
    else:
        console.print("[yellow]⚠️ 未找到有效的商品信息[/yellow]")


def styles_command(args):
    styles = get_available_styles()
    table = Table(title="🎭 爆款开头风格列表", show_lines=True)
    table.add_column("编号", style="cyan bold", width=6)
    table.add_column("风格名称", style="magenta bold", width=14)
    table.add_column("描述", style="white")

    for i, s in enumerate(styles, 1):
        table.add_row(str(i), s["style_name"], s["description"])

    console.print(table)


def main():
    parser = argparse.ArgumentParser(
        description="🎬 短视频脚本生成器 - 一键生成爆款短视频脚本",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
使用示例:
  # 交互模式（推荐新手使用）
  python cli.py

  # 单条生成
  python cli.py gen "美白精华" "美白" "保湿" "修护"

  # 指定风格生成
  python cli.py gen "美白精华" "美白" "保湿" "修护" --style 对比反转

  # 生成并导出
  python cli.py gen "美白精华" "美白" "保湿" "修护" -o script.txt

  # 生成并导出PDF
  python cli.py gen "美白精华" "美白" "保湿" "修护" -o script.pdf -f pdf

  # 批量生成
  python cli.py batch products.csv

  # 查看可用风格
  python cli.py styles
        """,
    )

    subparsers = parser.add_subparsers(dest="command", help="子命令")

    gen_parser = subparsers.add_parser("gen", help="生成单个商品脚本")
    gen_parser.add_argument("product", help="商品名称")
    gen_parser.add_argument("points", nargs=3, help="三个核心卖点")
    gen_parser.add_argument("--style", "-s", help="开头风格偏好", default=None)
    gen_parser.add_argument("--output", "-o", help="输出文件路径", default=None)
    gen_parser.add_argument("--format", "-f", help="输出格式 (txt/pdf)", default="txt")
    gen_parser.add_argument("--select", action="store_true", help="交互选择话术版本")
    gen_parser.add_argument("--no-tips", action="store_true", help="不包含拍摄建议")
    gen_parser.add_argument("--all-versions", action="store_true", help="导出全部版本")

    batch_parser = subparsers.add_parser("batch", help="批量处理CSV文件")
    batch_parser.add_argument("csv", help="CSV文件路径")
    batch_parser.add_argument("--output-dir", "-d", help="输出目录", default=None)
    batch_parser.add_argument("--format", "-f", help="输出格式 (txt/pdf)", default="txt")
    batch_parser.add_argument("--no-tips", action="store_true", help="不包含拍摄建议")

    styles_parser = subparsers.add_parser("styles", help="查看可用开头风格")

    args = parser.parse_args()

    if args.command == "gen":
        single_command(args)
    elif args.command == "batch":
        batch_command(args)
    elif args.command == "styles":
        styles_command(args)
    else:
        interactive_mode()


if __name__ == "__main__":
    main()
