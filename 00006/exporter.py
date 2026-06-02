import os
from typing import Optional

from generator import Script
from filming_tips import format_tip


def is_fpdf2_available() -> bool:
    try:
        from fpdf import FPDF  # noqa: F401
        return True
    except ImportError:
        return False


def script_to_text(script: Script, include_tips: bool = True) -> str:
    full = script.get_full_script()
    lines = []
    lines.append("=" * 50)
    lines.append(f"  短视频脚本 - {script.product_name}")
    lines.append("=" * 50)
    lines.append("")

    segment_labels = {
        "hook": "【开头钩子】",
        "pain_point": "【痛点展示】",
        "solution": "【产品解决方案】",
        "cta": "【结尾引导】",
    }

    for item in full:
        seg_type = item["segment_type"]
        content = item["content"]
        label = segment_labels.get(seg_type, seg_type)
        lines.append(label)
        lines.append(content)
        if include_tips and item.get("filming_tip"):
            lines.append(format_tip(item["filming_tip"]))
        lines.append("")

    lines.append("-" * 50)
    lines.append(f"核心卖点：{'、'.join(script.selling_points)}")
    if script.segments.get("hook") and script.segments["hook"].matched_hook_style:
        lines.append(f"匹配开头风格：{script.segments['hook'].matched_hook_style}")
    lines.append("-" * 50)

    return "\n".join(lines)


def script_all_versions_to_text(script: Script, include_tips: bool = True) -> str:
    lines = []
    lines.append("=" * 50)
    lines.append(f"  短视频脚本（全部版本）- {script.product_name}")
    lines.append("=" * 50)
    lines.append("")

    segment_labels = {
        "hook": "【开头钩子】",
        "pain_point": "【痛点展示】",
        "solution": "【产品解决方案】",
        "cta": "【结尾引导】",
    }

    for seg_key, label in segment_labels.items():
        seg = script.segments.get(seg_key)
        if not seg:
            continue
        lines.append(label)
        if seg.matched_hook_style:
            lines.append(f"  风格：{seg.matched_hook_style}")
        lines.append("")
        for i, version in enumerate(seg.versions, 1):
            lines.append(f"  版本{i}：{version}")
            if include_tips and i - 1 < len(seg.filming_tips):
                lines.append(f"  {format_tip(seg.filming_tips[i - 1])}")
            lines.append("")
        lines.append("")

    lines.append("-" * 50)
    lines.append(f"核心卖点：{'、'.join(script.selling_points)}")
    lines.append("-" * 50)

    return "\n".join(lines)


def export_txt(script: Script, filepath: str, include_tips: bool = True, all_versions: bool = False):
    if all_versions:
        text = script_all_versions_to_text(script, include_tips)
    else:
        text = script_to_text(script, include_tips)

    os.makedirs(os.path.dirname(filepath) if os.path.dirname(filepath) else ".", exist_ok=True)
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(text)


class PDFNotAvailableError(ImportError):
    pass


def export_pdf(script: Script, filepath: str, include_tips: bool = True, all_versions: bool = False):
    try:
        from fpdf import FPDF
    except ImportError:
        raise PDFNotAvailableError(
            "PDF 导出需要 fpdf2 库，请先运行：pip install fpdf2\n"
            "安装后即可使用 PDF 导出功能，当前可使用 TXT 格式导出作为替代。"
        )

    if all_versions:
        text = script_all_versions_to_text(script, include_tips)
    else:
        text = script_to_text(script, include_tips)

    font_path = _find_chinese_font()
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()

    if font_path:
        pdf.add_font("chinese", "", font_path, uni=True)
        pdf.set_font("chinese", size=12)
    else:
        pdf.set_font("Helvetica", size=12)

    for line in text.split("\n"):
        pdf.cell(0, 8, line, ln=True)

    os.makedirs(os.path.dirname(filepath) if os.path.dirname(filepath) else ".", exist_ok=True)
    pdf.output(filepath)


def export_pdf_with_fallback(script: Script, filepath: str, include_tips: bool = True, all_versions: bool = False) -> tuple[str, bool]:
    try:
        export_pdf(script, filepath, include_tips=include_tips, all_versions=all_versions)
        return filepath, True
    except PDFNotAvailableError:
        txt_path = filepath
        if txt_path.endswith(".pdf"):
            txt_path = txt_path[:-4] + ".txt"
        export_txt(script, txt_path, include_tips=include_tips, all_versions=all_versions)
        return txt_path, False


def _find_chinese_font() -> Optional[str]:
    candidates = [
        "/System/Library/Fonts/STHeiti Medium.ttc",
        "/System/Library/Fonts/PingFang.ttc",
        "/System/Library/Fonts/Hiragino Sans GB.ttc",
        "/System/Library/Fonts/Supplemental/Songti.ttc",
        "/Library/Fonts/Arial Unicode.ttf",
        "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc",
        "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
        "/usr/share/fonts/truetype/droid/DroidSansFallbackFull.ttf",
    ]
    for path in candidates:
        if os.path.exists(path):
            return path
    return None


def export_scripts_batch(scripts: list[Script], output_dir: str, fmt: str = "txt", include_tips: bool = True) -> list[dict]:
    os.makedirs(output_dir, exist_ok=True)
    exported = []
    for script in scripts:
        safe_name = "".join(c for c in script.product_name if c.isalnum() or c in "._- ") or "unnamed"

        if fmt == "pdf":
            pdf_filepath = os.path.join(output_dir, f"{safe_name}_脚本.pdf")
            actual_path, is_pdf = export_pdf_with_fallback(script, pdf_filepath, include_tips, all_versions=True)
            exported.append({"path": actual_path, "is_pdf": is_pdf, "product_name": script.product_name})
        else:
            filepath = os.path.join(output_dir, f"{safe_name}_脚本.txt")
            export_txt(script, filepath, include_tips, all_versions=True)
            exported.append({"path": filepath, "is_pdf": False, "product_name": script.product_name})
    return exported
