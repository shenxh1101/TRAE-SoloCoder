from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Optional

from . import __version__
from .analyzer import DependencyAnalyzer
from .conflict_detector import ConflictDetector
from .graph_generator import GraphGenerator
from .vulnerability_scanner import VulnerabilityScanner
from .branch_comparator import BranchComparator
from .license_analyzer import LicenseAnalyzer


def main():
    parser = argparse.ArgumentParser(
        description="Depalyzer - 代码仓库依赖分析工具",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  depalyzer analyze /path/to/repo
  depalyzer tree /path/to/repo
  depalyzer conflicts /path/to/repo
  depalyzer graph /path/to/repo --format dot
  depalyzer vuln /path/to/repo --vuln-db vulnerabilities.json
  depalyzer compare /path/to/repo --branch1 main --branch2 develop
  depalyzer licenses /path/to/repo
        """,
    )

    parser.add_argument("--version", action="version", version=f"depalyzer {__version__}")

    subparsers = parser.add_subparsers(dest="command", help="可用命令")

    analyze_parser = subparsers.add_parser("analyze", help="分析仓库依赖")
    analyze_parser.add_argument("repo_path", help="Git仓库路径")
    analyze_parser.add_argument("--output", "-o", help="输出文件路径")
    analyze_parser.add_argument("--format", choices=["json", "text"], default="text", help="输出格式")

    tree_parser = subparsers.add_parser("tree", help="显示依赖树")
    tree_parser.add_argument("repo_path", help="Git仓库路径")
    tree_parser.add_argument("--depth", type=int, default=3, help="显示深度")

    conflict_parser = subparsers.add_parser("conflicts", help="检测版本冲突")
    conflict_parser.add_argument("repo_path", help="Git仓库路径")

    graph_parser = subparsers.add_parser("graph", help="生成依赖图谱")
    graph_parser.add_argument("repo_path", help="Git仓库路径")
    graph_parser.add_argument("--format", choices=["text", "dot"], default="text", help="输出格式")
    graph_parser.add_argument("--output", "-o", help="输出文件路径")

    vuln_parser = subparsers.add_parser("vuln", help="漏洞扫描")
    vuln_parser.add_argument("repo_path", help="Git仓库路径")
    vuln_parser.add_argument("--vuln-db", required=True, help="漏洞库JSON文件路径")

    compare_parser = subparsers.add_parser("compare", help="对比分支依赖")
    compare_parser.add_argument("repo_path", help="Git仓库路径")
    compare_parser.add_argument("--branch1", required=True, help="第一个分支名")
    compare_parser.add_argument("--branch2", required=True, help="第二个分支名")
    compare_parser.add_argument("--output", "-o", help="输出文件路径")

    license_parser = subparsers.add_parser("licenses", help="分析许可证")
    license_parser.add_argument("repo_path", help="Git仓库路径")
    license_parser.add_argument("--strict", action="store_true", help="严格模式，标记非宽松许可证")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return 1

    try:
        return run_command(args)
    except Exception as e:
        print(f"错误: {e}", file=sys.stderr)
        return 1


def run_command(args) -> int:
    repo_path = Path(args.repo_path).resolve()

    if not repo_path.exists():
        print(f"错误: 路径不存在: {repo_path}", file=sys.stderr)
        return 1

    analyzer = DependencyAnalyzer(repo_path)

    if args.command == "analyze":
        result = analyzer.analyze()
        output = format_analysis_result(result, args.format)
        if args.output:
            with open(args.output, "w") as f:
                f.write(output)
        else:
            print(output)

    elif args.command == "tree":
        result = analyzer.analyze()
        tree = build_dependency_tree(result)
        print_tree(tree, args.depth)

    elif args.command == "conflicts":
        result = analyzer.analyze()
        detector = ConflictDetector(result)
        conflicts = detector.detect()
        print_conflicts(conflicts)

    elif args.command == "graph":
        result = analyzer.analyze()
        generator = GraphGenerator(result)
        if args.format == "dot":
            dot_content = generator.generate_dot()
            if args.output:
                with open(args.output, "w") as f:
                    f.write(dot_content)
            else:
                print(dot_content)
        else:
            print(generator.generate_text_graph())

    elif args.command == "vuln":
        result = analyzer.analyze()
        scanner = VulnerabilityScanner(args.vuln_db)
        vulnerabilities = scanner.scan(result)
        print_vulnerabilities(vulnerabilities)

    elif args.command == "compare":
        comparator = BranchComparator(repo_path)
        diff = comparator.compare(args.branch1, args.branch2)
        output = format_comparison_result(diff)
        if args.output:
            with open(args.output, "w") as f:
                f.write(output)
        else:
            print(output)

    elif args.command == "licenses":
        result = analyzer.analyze()
        license_analyzer = LicenseAnalyzer(result)
        summary = license_analyzer.analyze()
        print_license_summary(summary, args.strict)

    return 0


def format_analysis_result(result: dict, format_type: str) -> str:
    if format_type == "json":
        return json.dumps(result, indent=2, ensure_ascii=False)

    lines = []
    lines.append("=" * 60)
    lines.append("依赖分析结果")
    lines.append("=" * 60)

    for pkg_type, data in result.items():
        lines.append(f"\n【{pkg_type.upper()}】")
        lines.append(f"- 直接依赖: {data.get('direct_count', 0)} 个")
        lines.append(f"- 间接依赖: {data.get('transitive_count', 0)} 个")
        lines.append(f"- 总计: {data.get('total_count', 0)} 个")

        if data.get("direct_dependencies"):
            lines.append("\n直接依赖列表:")
            for dep in sorted(data["direct_dependencies"], key=lambda x: x["name"]):
                version = dep.get("version", "latest")
                lines.append(f"  - {dep['name']}@{version}")

    return "\n".join(lines)


def build_dependency_tree(result: dict) -> dict:
    tree = {}
    for pkg_type, data in result.items():
        tree[pkg_type] = {
            "root": True,
            "children": {},
        }
        deps = {d["name"]: d for d in data.get("all_dependencies", [])}

        for dep in data.get("direct_dependencies", []):
            tree[pkg_type]["children"][dep["name"]] = {
                "version": dep.get("version", "latest"),
                "children": {},
            }

        for dep in data.get("transitive_dependencies", []):
            parent = dep.get("parent")
            if parent and parent in tree[pkg_type]["children"]:
                tree[pkg_type]["children"][parent]["children"][dep["name"]] = {
                    "version": dep.get("version", "latest"),
                    "children": {},
                }

    return tree


def print_tree(tree: dict, max_depth: int, current_depth: int = 0, prefix: str = ""):
    if current_depth >= max_depth:
        return

    for pkg_type, data in tree.items():
        print(f"\n📦 {pkg_type.upper()}")
        _print_node_children(data.get("children", {}), max_depth, 0, "")


def _print_node_children(children: dict, max_depth: int, current_depth: int, prefix: str):
    if current_depth >= max_depth:
        return

    items = list(children.items())
    for i, (name, data) in enumerate(items):
        is_last = i == len(items) - 1
        connector = "└── " if is_last else "├── "
        version = data.get("version", "latest")

        print(f"{prefix}{connector}{name}@{version}")

        new_prefix = prefix + ("    " if is_last else "│   ")
        _print_node_children(data.get("children", {}), max_depth, current_depth + 1, new_prefix)


def print_conflicts(conflicts: list):
    if not conflicts:
        print("✅ 未检测到版本冲突")
        return

    print(f"⚠️  检测到 {len(conflicts)} 个版本冲突:\n")
    for i, conflict in enumerate(conflicts, 1):
        print(f"{i}. {conflict['package']} ({conflict['package_manager']})")
        for location, version in conflict["locations"].items():
            print(f"   - {version} (来自: {location})")
        print()


def print_vulnerabilities(vulnerabilities: list):
    if not vulnerabilities:
        print("✅ 未检测到已知漏洞")
        return

    print(f"⚠️  检测到 {len(vulnerabilities)} 个漏洞:\n")
    for vuln in vulnerabilities:
        severity = vuln.get("severity", "unknown").upper()
        severity_color = {"CRITICAL": "🔴", "HIGH": "🟠", "MEDIUM": "🟡", "LOW": "🟢"}.get(severity, "⚪")

        print(f"{severity_color} [{severity}] {vuln['package']}@{vuln['version']}")
        print(f"   CVE: {vuln.get('cve', 'N/A')}")
        print(f"   描述: {vuln.get('description', 'N/A')}")
        print(f"   修复版本: {vuln.get('fixed_version', 'N/A')}")
        print()


def format_comparison_result(diff: dict) -> str:
    lines = []
    lines.append("=" * 60)
    lines.append(f"分支对比: {diff['branch1']} vs {diff['branch2']}")
    lines.append("=" * 60)

    for pkg_type, data in diff["differences"].items():
        lines.append(f"\n【{pkg_type.upper()}】")

        added = data.get("added", [])
        removed = data.get("removed", [])
        upgraded = data.get("upgraded", [])
        downgraded = data.get("downgraded", [])

        if added:
            lines.append(f"\n✅ 新增依赖 ({len(added)}):")
            for dep in added:
                lines.append(f"   + {dep['name']}@{dep['version']}")

        if removed:
            lines.append(f"\n❌ 删除依赖 ({len(removed)}):")
            for dep in removed:
                lines.append(f"   - {dep['name']}@{dep['version']}")

        if upgraded:
            lines.append(f"\n⬆️  升级依赖 ({len(upgraded)}):")
            for dep in upgraded:
                lines.append(f"   ↑ {dep['name']}: {dep['old_version']} → {dep['new_version']}")

        if downgraded:
            lines.append(f"\n⬇️  降级依赖 ({len(downgraded)}):")
            for dep in downgraded:
                lines.append(f"   ↓ {dep['name']}: {dep['old_version']} → {dep['new_version']}")

        if not any([added, removed, upgraded, downgraded]):
            lines.append("\n   无变化")

    return "\n".join(lines)


def print_license_summary(summary: dict, strict: bool = False):
    print("=" * 60)
    print("许可证分析")
    print("=" * 60)

    restrictive_licenses = ["GPL", "AGPL", "LGPL", "CC-BY-SA", "MPL"]

    for pkg_type, data in summary.items():
        print(f"\n【{pkg_type.upper()}】")

        license_counts = data.get("license_counts", {})
        if license_counts:
            print("\n许可证分布:")
            for license_name, count in sorted(license_counts.items(), key=lambda x: -x[1]):
                is_restrictive = any(r in license_name.upper() for r in restrictive_licenses)
                flag = " ⚠️" if is_restrictive and strict else ""
                print(f"  - {license_name}: {count} 个{flag}")

        packages = data.get("packages", [])
        if strict:
            restrictive_packages = [
                p for p in packages
                if p.get("license") and any(r in p["license"].upper() for r in restrictive_licenses)
            ]
            if restrictive_packages:
                print(f"\n⚠️  非宽松许可证依赖 ({len(restrictive_packages)}):")
                for pkg in restrictive_packages:
                    print(f"  - {pkg['name']}@{pkg['version']}: {pkg['license']}")

        unknown_licenses = [p for p in packages if not p.get("license")]
        if unknown_licenses:
            print(f"\n❓ 未知许可证依赖 ({len(unknown_licenses)}):")
            for pkg in unknown_licenses[:10]:
                print(f"  - {pkg['name']}@{pkg['version']}")
            if len(unknown_licenses) > 10:
                print(f"  ... 还有 {len(unknown_licenses) - 10} 个")


if __name__ == "__main__":
    sys.exit(main())
