#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import argparse
import sys
from pathlib import Path

from analyzer import CodeAnalyzer
from roaster import RoastGenerator
from comparator import CodeComparator
from report_generator import HTMLReportGenerator
from style_manager import StylePreferenceManager


def print_banner():
    banner = """
╔══════════════════════════════════════════════════════════════╗
║                    💩 代码屎山吐槽机 💩                      ║
║           专业吐槽你的代码，让重构更有动力                    ║
╚══════════════════════════════════════════════════════════════╝
    """
    print(banner)


def print_report(report: dict):
    print(f"\n{'='*60}")
    print(f"📁 文件名: {report['file_name']}")
    print(f"💻 语言: {report['language']}")
    print(f"📝 总行数: {report['total_lines']} 行")
    print(f"🎭 吐槽风格: {get_style_name(report['style_used'])}")
    print(f"{'='*60}")
    
    print(f"\n🎯 代码质量评分: {report['score']}/100 {report['metaphor_emoji']}")
    print(f"   比喻: {report['metaphor']}")
    
    print(f"\n🔥 总吐槽:")
    print(f"   {report['overall_roast']}")
    
    print(f"\n💢 具体槽点:")
    for i, roast in enumerate(report['individual_roasts'], 1):
        print(f"   {i}. {roast}")
    
    print(f"\n📊 指标一览:")
    for key, value in report['metrics_summary'].items():
        metric_names = {
            'max_function_length': '📏 最长函数',
            'max_nesting_level': '🎁 最深嵌套',
            'duplicate_code_count': '🧬 重复代码',
            'comment_ratio': '📝 注释率',
            'function_count': '🔧 函数数量',
            'long_lines': '✏️  超长行',
            'todo_count': '📋 TODO数量'
        }
        print(f"   {metric_names.get(key, key)}: {value}")
    
    print(f"\n💡 重构建议 TOP 3:")
    for i, suggestion in enumerate(report['top_suggestions'], 1):
        print(f"\n   {i}. 🎯 问题: {suggestion['problem']}")
        print(f"      💡 建议: {suggestion['suggestion']}")
    print(f"\n{'='*60}")


def get_style_name(style: str) -> str:
    names = {
        'kitchen': '🍳 厨房烂摊子',
        'construction': '🏗️ 工地现场',
        'war': '⚔️ 战争现场',
        'nature': '🌴 原始丛林',
        'office': '💼 办公室政治'
    }
    return names.get(style, style)


def print_comparison(comparison: dict):
    f1 = comparison['file1']['roast']
    f2 = comparison['file2']['roast']
    diff = comparison['differences']
    focus = comparison['focus_change']
    
    print(f"\n{'='*60}")
    print("⚔️ 代码屎山大对决 ⚔️")
    print(f"{'='*60}")
    
    print(f"\n📁 文件1: {Path(comparison['file1']['path']).name}")
    print(f"   评分: {f1['score']}/100 | {f1['metaphor_emoji']} {f1['metaphor']}")
    
    print(f"\n📁 文件2: {Path(comparison['file2']['path']).name}")
    print(f"   评分: {f2['score']}/100 | {f2['metaphor_emoji']} {f2['metaphor']}")
    
    score_diff = diff['score_change']
    if score_diff > 0:
        print(f"\n📈 分数变化: +{score_diff} (进步了！🎉)")
    elif score_diff < 0:
        print(f"\n📉 分数变化: {score_diff} (退步了...💩)")
    else:
        print(f"\n➖ 分数变化: 0 (没变化)")
    
    print(f"\n🎯 吐槽焦点变化:")
    print(focus['summary'])
    
    print(f"\n📊 详细变化:")
    lines_sign = '+' if diff['lines_change'] > 0 else ''
    print(f"   总行数变化: {lines_sign}{diff['lines_change']} 行")
    print(f"   最长函数变化: {diff['max_function_length_change']} 行")
    print(f"   最深嵌套变化: {diff['max_nesting_change']} 层")
    print(f"   重复代码变化: {diff['duplicate_count_change']} 处")
    print(f"   函数数量变化: {diff['function_count_change']} 个")
    print(f"{'='*60}")


def ask_for_rating(style_manager: StylePreferenceManager, style_used: str):
    print(f"\n⭐ 请为这次吐槽的\"精准度\"打分 (1-10分):")
    print(f"   1分 = 完全没说到点子上")
    print(f"  10分 = 卧槽太准了，说到我心坎里了")
    
    while True:
        try:
            rating = input("\n请输入你的评分 (直接回车跳过): ").strip()
            if not rating:
                print("跳过评分。")
                break
            rating = int(rating)
            if 1 <= rating <= 10:
                style_manager.rate_roast(style_used, rating)
                print(f"✅ 已记录评分: {rating}/10 分！感谢反馈！")
                break
            else:
                print("❌ 请输入 1-10 之间的数字")
        except ValueError:
            print("❌ 请输入有效的数字")


def show_stats(style_manager: StylePreferenceManager):
    stats = style_manager.get_statistics()
    
    print(f"\n{'='*60}")
    print("📊 吐槽风格偏好统计")
    print(f"{'='*60}")
    print(f"总评分次数: {stats['total_ratings']}")
    print(f"平均评分: {stats['average_score']}/10")
    print(f"\n各风格权重:")
    for style, weight in stats['style_weights'].items():
        bar = '█' * int(weight * 10)
        print(f"  {get_style_name(style)}: {weight:.2f} {bar}")
    print(f"\n最喜欢的风格: {get_style_name(stats['top_style'])}")
    
    if stats['recent_ratings']:
        print(f"\n📜 历史评分记录 (最近10条):")
        print(f"{'='*60}")
        print(f"  {'序号':<4} {'风格':<15} {'评分':<6} {'时间'}")
        print(f"  {'-'*55}")
        for i, rating in enumerate(reversed(stats['recent_ratings']), 1):
            style_name = get_style_name(rating['style'])
            score = rating['score']
            timestamp = rating['timestamp'].split('T')[0] + ' ' + rating['timestamp'].split('T')[1][:8]
            stars = '⭐' * score
            print(f"  {i:<4} {style_name:<15} {score:<6} {stars} {timestamp}")
    
    print(f"{'='*60}")


def rate_roast(file_path: str, score: int):
    try:
        print(f"⭐ 正在为文件打分: {file_path}")
        print(f"   吐槽精准度评分: {score}/10")
        
        style_manager = StylePreferenceManager()
        style_weights = style_manager.get_style_weights()
        
        analyzer = CodeAnalyzer(file_path)
        analysis = analyzer.analyze()
        
        roaster = RoastGenerator(style_weights)
        report = roaster.generate_report(analysis)
        style_used = report['style_used']
        
        print(f"   使用的吐槽风格: {get_style_name(style_used)}")
        
        style_manager.rate_roast(style_used, score)
        
        print(f"\n✅ 评分已记录！")
        print(f"   风格: {get_style_name(style_used)}")
        print(f"   评分: {score}/10 {'⭐' * score}")
        print(f"\n💡 提示: 系统会根据你的评分自动调整吐槽风格偏好")
        
    except Exception as e:
        print(f"❌ 错误: {e}")
        sys.exit(1)


def analyze_file(file_path: str, output_html: str = None, enable_rating: bool = True):
    try:
        print(f"🔍 正在分析文件: {file_path}")
        
        style_manager = StylePreferenceManager()
        style_weights = style_manager.get_style_weights()
        
        analyzer = CodeAnalyzer(file_path)
        analysis = analyzer.analyze()
        
        roaster = RoastGenerator(style_weights)
        report = roaster.generate_report(analysis)
        
        print_report(report)
        
        if output_html:
            html_gen = HTMLReportGenerator()
            html_path = html_gen.generate_report(report, output_html)
            print(f"\n✅ HTML报告已生成: {html_path}")
        
        if enable_rating:
            ask_for_rating(style_manager, report['style_used'])
        
        return report
        
    except Exception as e:
        print(f"❌ 错误: {e}")
        sys.exit(1)


def compare_files(file1: str, file2: str, output_html: str = None):
    try:
        print(f"🔍 正在对比文件...")
        
        comparator = CodeComparator()
        comparison = comparator.compare(file1, file2)
        
        print_comparison(comparison)
        
        if output_html:
            html_gen = HTMLReportGenerator()
            html_path = html_gen.generate_comparison_report(comparison, output_html)
            print(f"\n✅ HTML对比报告已生成: {html_path}")
        
        return comparison
        
    except Exception as e:
        print(f"❌ 错误: {e}")
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(
        description='💩 代码屎山吐槽机 - 专业吐槽你的代码',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  python main.py analyze your_code.py
  python main.py analyze your_code.py --output report.html
  python main.py compare old.py new.py --output compare.html
  python main.py rate your_code.py --score 8
  python main.py stats
  python main.py reset
        """
    )
    
    subparsers = parser.add_subparsers(dest='command', help='可用命令')
    
    analyze_parser = subparsers.add_parser('analyze', help='分析单个文件')
    analyze_parser.add_argument('file', help='要分析的代码文件路径')
    analyze_parser.add_argument('--output', '-o', help='输出HTML报告路径')
    analyze_parser.add_argument('--no-rating', action='store_true', help='禁用评分功能')
    
    compare_parser = subparsers.add_parser('compare', help='对比两个文件')
    compare_parser.add_argument('file1', help='第一个文件（旧版本）')
    compare_parser.add_argument('file2', help='第二个文件（新版本）')
    compare_parser.add_argument('--output', '-o', help='输出HTML对比报告路径')
    
    rate_parser = subparsers.add_parser('rate', help='为吐槽精准度打分')
    rate_parser.add_argument('file', help='要打分的代码文件路径')
    rate_parser.add_argument('--score', '-s', type=int, required=True, 
                            help='吐槽精准度评分 (1-10分，1分=完全不准，10分=太准了)')
    
    subparsers.add_parser('stats', help='显示吐槽风格统计')
    
    subparsers.add_parser('reset', help='重置风格偏好')
    
    args = parser.parse_args()
    
    print_banner()
    
    if args.command == 'analyze':
        analyze_file(args.file, args.output, not args.no_rating)
    
    elif args.command == 'compare':
        compare_files(args.file1, args.file2, args.output)
    
    elif args.command == 'rate':
        if args.score < 1 or args.score > 10:
            print("❌ 评分必须在 1-10 之间！")
            sys.exit(1)
        rate_roast(args.file, args.score)
    
    elif args.command == 'stats':
        style_manager = StylePreferenceManager()
        show_stats(style_manager)
    
    elif args.command == 'reset':
        confirm = input("确定要重置所有风格偏好吗？(y/N): ").strip().lower()
        if confirm == 'y':
            style_manager = StylePreferenceManager()
            style_manager.reset_preferences()
            print("✅ 已重置所有风格偏好！")
        else:
            print("取消重置。")
    
    else:
        parser.print_help()


if __name__ == '__main__':
    main()
