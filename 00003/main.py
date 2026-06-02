#!/usr/bin/env python3
"""
股票对比分析工具
用法:
  python main.py compare <股票1> <股票2> [--period 7] [--no-html]
  python main.py history [--limit 10]
  python main.py trend <股票1> <股票2> [--limit 10]
  python main.py list
  python main.py clear
"""

import sys
import argparse
from datetime import datetime

from stock_compare.data_loader import DataLoader
from stock_compare.analysis import StockAnalyzer
from stock_compare.ascii_chart import ASCIIChart
from stock_compare.ai_commentator import AICommentator
from stock_compare.html_report import HTMLReport
from stock_compare.history import HistoryManager


def print_banner():
    banner = r"""
   _____ _             _      _____                                         
  / ____| |           | |    / ____|                                        
 | (___ | |_ ___   ___| | __| |     ___  _ __ ___  _ __   __ _ _ __ ___  ___ 
  \___ \| __/ _ \ / __| |/ /| |    / _ \| '_ ` _ \| '_ \ / _` | '__/ _ \/ _ \
  ____) | || (_) | (__|   < | |___| (_) | | | | | | |_) | (_| | | |  __/  __/
 |_____/ \__\___/ \___|_|\_\ \_____\___/|_| |_| |_| .__/ \__,_|_|  \___|\___|
                                                  | |                        
                                                  |_|                        
    """
    print(banner)
    print("=" * 78)
    print("  📊 股票对比分析工具 v1.0")
    print("=" * 78)


def compare_stocks(stock1: str, stock2: str, period_days: int = 7, 
                   generate_html: bool = True, save_history: bool = True):
    print(f"\n🚀 开始对比分析: {stock1} vs {stock2}")
    print(f"⏱️  分析周期: 最近 {period_days} 个交易日\n")

    loader = DataLoader()
    analyzer = StockAnalyzer()
    chart = ASCIIChart()
    commentator = AICommentator()
    reporter = HTMLReport()
    history = HistoryManager()

    print("📥 加载股票数据...")
    df1 = loader.load_stock_data(stock1, period_days)
    df2 = loader.load_stock_data(stock2, period_days)

    if df1 is None or df2 is None:
        print("\n❌ 错误: 无法加载股票数据，请检查CSV文件是否存在于 data/ 目录")
        print(f"   预期文件: data/{stock1}.csv, data/{stock2}.csv")
        print("\n   CSV格式要求:")
        print("   date,close,high,low,volume")
        print("   2024-01-01,100.0,105.0,98.0,1000000")
        return False

    if len(df1) < 2 or len(df2) < 2:
        print("\n❌ 错误: 数据不足，至少需要2个交易日的数据")
        return False

    print(f"   ✅ {stock1}: 加载 {len(df1)} 条数据")
    print(f"   ✅ {stock2}: 加载 {len(df2)} 条数据")

    print("\n📊 进行对比分析...")
    comparison = analyzer.compare_stocks(df1, df2, stock1, stock2, period_days)

    print("\n" + "=" * 78)
    print("  📈 涨跌幅对比")
    print("=" * 78)
    
    s1 = comparison["stock1"]
    s2 = comparison["stock2"]
    
    c1 = s1["change_percent"]
    c2 = s2["change_percent"]
    c1_str = f"+{c1}%" if c1 and c1 > 0 else f"{c1}%" if c1 else "-"
    c2_str = f"+{c2}%" if c2 and c2 > 0 else f"{c2}%" if c2 else "-"
    
    winner = comparison.get("winner", "平局")
    winner_str = f"🏆 {winner} 胜出" if winner else "🤝 平局"
    
    print(f"  {stock1:<12} {c1_str:>10}  |  {stock2:<12} {c2_str:>10}")
    print(f"  {'-' * 30}  |  {'-' * 30}")
    print(f"  起始: {s1.get('start_price', 0):.2f} → 最新: {s1.get('end_price', 0):.2f}  |  起始: {s2.get('start_price', 0):.2f} → 最新: {s2.get('end_price', 0):.2f}")
    print(f"  波动率: {s1.get('volatility', '-')}%  |  波动率: {s2.get('volatility', '-')}%")
    print(f"  最大回撤: {s1.get('max_drawdown', '-')}%  |  最大回撤: {s2.get('max_drawdown', '-')}%")
    print(f"\n  {winner_str}")

    print("\n" + "=" * 78)
    print("  💹 PE分位点对比 (模拟计算)")
    print("=" * 78)
    
    pe1 = s1.get("pe") or {}
    pe2 = s2.get("pe") or {}
    
    if pe1 or pe2:
        print(f"  {stock1:<12} PE: {pe1.get('current_pe', '-'):>8} | 分位点: {pe1.get('percentile', '-'):>6}% | 估值: {pe1.get('valuation', '-')}")
        print(f"  {stock2:<12} PE: {pe2.get('current_pe', '-'):>8} | 分位点: {pe2.get('percentile', '-'):>6}% | 估值: {pe2.get('valuation', '-')}")
        print(f"\n  历史PE区间 {stock1}: {pe1.get('min_pe', '-')} ~ {pe1.get('max_pe', '-')}")
        print(f"  历史PE区间 {stock2}: {pe2.get('min_pe', '-')} ~ {pe2.get('max_pe', '-')}")
    else:
        print("  ⚠️  数据不足，无法计算PE分位点 (至少需要5个交易日)")

    print("\n" + "=" * 78)
    print("  📉 ASCII 走势对比图")
    print("=" * 78)
    
    price_data1 = loader.get_price_series(stock1, period_days)
    price_data2 = loader.get_price_series(stock2, period_days)
    
    ascii_chart = ""
    if price_data1 and price_data2:
        ascii_chart = chart.plot_two_lines(price_data1, price_data2, stock1, stock2)
        print(ascii_chart)

    print("\n" + "=" * 78)
    print("  🤖 AI 锐评")
    print("=" * 78)
    
    ai_comment = commentator.generate_comment(comparison)
    
    print(f"\n  🎯 {stock1} 分析:")
    print(f"     ⚠️  风险: {ai_comment['stock1']['risk']}")
    print(f"     ✨ 机会: {ai_comment['stock1']['opportunity']}")
    
    print(f"\n  🎯 {stock2} 分析:")
    print(f"     ⚠️  风险: {ai_comment['stock2']['risk']}")
    print(f"     ✨ 机会: {ai_comment['stock2']['opportunity']}")
    
    print(f"\n  📝 综合评价: {ai_comment['summary']}")
    print(f"\n  {commentator.get_quick_tip(comparison)}")
    print(f"\n  {ai_comment['disclaimer']}")

    report_path = None
    if generate_html:
        print("\n📄 生成HTML报告...")
        report_path = reporter.generate(comparison, ai_comment, ascii_chart, 
                                        price_data1, price_data2)
        print(f"   ✅ 报告已保存到: {report_path}")

    if save_history:
        print("\n💾 保存到历史记录...")
        history.add_record(comparison, ai_comment, report_path or "")
        print("   ✅ 已保存到历史记录")

    print("\n" + "=" * 78)
    print("  ✅ 分析完成!")
    print("=" * 78 + "\n")
    
    return True


def show_history(limit: int = 10):
    history = HistoryManager()
    history.print_history(limit)


def show_trend(stock1: str, stock2: str, limit: int = 10):
    history = HistoryManager()
    history.print_trend(stock1, stock2, limit)


def list_stocks():
    loader = DataLoader()
    stocks = loader.list_available_stocks()
    
    print(f"\n{'=' * 78}")
    print(f"  📋 可用股票数据 (共 {len(stocks)} 只)")
    print(f"{'=' * 78}")
    
    if not stocks:
        print("  📭 暂无可用数据，请将CSV文件放入 data/ 目录")
        print("  CSV文件名格式: 股票代码.csv (如: 600519.csv)")
    else:
        for i, code in enumerate(stocks, 1):
            info = loader.get_stock_info(code)
            if info:
                print(f"  {i:>2}. {code:<10} 最新价: {info.get('latest_price', '-'):>8}  "
                      f"日期: {info.get('latest_date', '-')}")
            else:
                print(f"  {i:>2}. {code:<10} (数据格式错误)")
    
    print(f"{'=' * 78}\n")


def clear_history():
    history = HistoryManager()
    count = history.clear()
    print(f"\n✅ 已清除 {count} 条历史记录\n")


def show_ai_config():
    AICommentator.print_config()


def main():
    parser = argparse.ArgumentParser(
        description="股票对比分析工具",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  %(prog)s compare 600519 000858              # 对比两只股票 (默认7天)
  %(prog)s compare 600519 000858 --period 3   # 对比最近3天
  %(prog)s compare 600519 000858 --no-html    # 不生成HTML报告
  %(prog)s history                             # 查看历史记录
  %(prog)s trend 600519 000858                # 查看历史对比趋势
  %(prog)s list                                # 列出可用股票
  %(prog)s clear                               # 清除历史记录
        """
    )
    
    subparsers = parser.add_subparsers(dest="command", help="可用命令")
    
    compare_parser = subparsers.add_parser("compare", help="对比两只股票")
    compare_parser.add_argument("stock1", help="股票1代码")
    compare_parser.add_argument("stock2", help="股票2代码")
    compare_parser.add_argument("--period", type=int, default=7, 
                                help="对比周期 (天数), 默认7天")
    compare_parser.add_argument("--no-html", action="store_true",
                                help="不生成HTML报告")
    compare_parser.add_argument("--no-history", action="store_true",
                                help="不保存到历史记录")
    
    history_parser = subparsers.add_parser("history", help="查看历史记录")
    history_parser.add_argument("--limit", type=int, default=10,
                                help="显示最近N条记录")
    
    trend_parser = subparsers.add_parser("trend", help="查看历史对比趋势")
    trend_parser.add_argument("stock1", help="股票1代码")
    trend_parser.add_argument("stock2", help="股票2代码")
    trend_parser.add_argument("--limit", type=int, default=10,
                              help="显示最近N条记录")
    
    subparsers.add_parser("list", help="列出可用股票")
    subparsers.add_parser("clear", help="清除历史记录")
    subparsers.add_parser("ai-config", help="查看AI评论器配置")
    
    args = parser.parse_args()
    
    if args.command is None:
        parser.print_help()
        return
    
    print_banner()
    
    if args.command == "compare":
        success = compare_stocks(
            args.stock1, args.stock2,
            period_days=args.period,
            generate_html=not args.no_html,
            save_history=not args.no_history
        )
        sys.exit(0 if success else 1)
    
    elif args.command == "history":
        show_history(args.limit)
    
    elif args.command == "trend":
        show_trend(args.stock1, args.stock2, args.limit)
    
    elif args.command == "list":
        list_stocks()
    
    elif args.command == "clear":
        clear_history()
    
    elif args.command == "ai-config":
        show_ai_config()


if __name__ == "__main__":
    main()
