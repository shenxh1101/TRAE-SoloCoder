#!/usr/bin/env python3
"""
模拟Ollama AI调用成功的演示脚本
展示真实AI生成的股票锐评效果
"""

import json
from stock_compare.data_loader import DataLoader
from stock_compare.analysis import StockAnalyzer
from stock_compare.ai_commentator import AICommentator


def mock_ollama_success():
    """模拟Ollama调用成功，返回真实AI风格的响应"""
    
    loader = DataLoader()
    analyzer = StockAnalyzer()
    
    stock1, stock2 = "600519", "000858"
    period = 7
    
    print("=" * 78)
    print("  🎬 模拟 Ollama AI 调用成功演示")
    print("=" * 78)
    
    print(f"\n📥 加载股票数据: {stock1} vs {stock2}")
    df1 = loader.load_stock_data(stock1, period)
    df2 = loader.load_stock_data(stock2, period)
    
    print("\n📊 进行对比分析...")
    comparison = analyzer.compare_stocks(df1, df2, stock1, stock2, period)
    
    print("\n" + "=" * 78)
    print("  🤖 AI 锐评 (模拟 qwen2:7b 生成)")
    print("=" * 78)
    
    s1 = comparison["stock1"]
    s2 = comparison["stock2"]
    pe1 = s1.get("pe") or {}
    pe2 = s2.get("pe") or {}
    
    mock_ai_response = f"""{{
    "stock1_risk": "虽然{s1.get('change_percent')}%的涨幅表现稳健，但PE分位点{pe1.get('percentile')}%处于中性水平，若市场情绪转向可能面临估值回调压力。同时需关注宏观政策对高端消费的影响。",
    "stock1_opportunity": "作为白酒行业绝对龙头，品牌护城河深厚，{s1.get('change_percent')}%的涨幅显示资金关注度持续提升。当前估值处于合理区间，若能有效突破前期高点，有望打开新的上涨空间。长期配置价值突出。",
    "stock2_risk": "区间最大回撤{s2.get('max_drawdown')}%显示短期存在抛压，PE分位点{pe2.get('percentile')}%略高于历史均值，需警惕获利盘回吐风险。行业竞争加剧可能影响利润率。",
    "stock2_opportunity": "近期{s2.get('change_percent')}%的涨幅小幅领先，量能配合良好，技术形态呈现上升趋势。作为次高端白酒龙头，全国化进程加速，市场认可度提升，短期有望延续强势表现。",
    "summary": "综合对比分析，{stock2}短期走势略强，{s2.get('change_percent')}%的涨幅和良好的量价配合显示资金青睐，但{pe2.get('percentile')}%的PE分位点略高需警惕回调风险。{stock1}作为行业龙头，{pe1.get('percentile')}%的PE分位点更具安全边际，长期配置价值突出。建议：激进投资者可关注{stock2}的短期交易机会，稳健投资者可逢低布局{stock1}中长期持有。同时关注白酒行业动销数据和消费复苏进度，灵活调整仓位。"
}}"""
    
    print("\n🤖 正在调用AI模型 (ollama: qwen2:7b)...")
    print("🔍 解析AI响应...")
    print("✅ AI分析完成")
    
    ai_result = json.loads(mock_ai_response)
    
    print(f"\n  🎯 {stock1} 分析:")
    print(f"     ⚠️  风险: {ai_result['stock1_risk']}")
    print(f"     ✨ 机会: {ai_result['stock1_opportunity']}")
    
    print(f"\n  🎯 {stock2} 分析:")
    print(f"     ⚠️  风险: {ai_result['stock2_risk']}")
    print(f"     ✨ 机会: {ai_result['stock2_opportunity']}")
    
    print(f"\n  📝 综合评价: {ai_result['summary']}")
    
    print(f"\n  💡 {AICommentator.get_quick_tip(comparison)}")
    
    print(f"\n  【免责声明】本评论仅供参考，不构成投资建议。股市有风险，投资需谨慎。")
    
    print("\n" + "=" * 78)
    print("  💡 提示：实际使用时请确保Ollama服务已启动")
    print("     命令: ollama serve && ollama pull qwen2:7b")
    print("=" * 78 + "\n")


def mock_ai_vs_template():
    """对比AI生成和模板生成的区别"""
    
    print("\n" + "=" * 78)
    print("  📊 AI生成 vs 模板生成 对比")
    print("=" * 78)
    
    print("\n🤖 AI生成的锐评特点:")
    print("  ✅ 结合具体数据分析，内容更丰富")
    print("  ✅ 有逻辑推理，不是简单拼接")
    print("  ✅ 语言更自然流畅")
    print("  ✅ 投资建议更具体")
    print("  ✅ 每次调用结果都不同")
    
    print("\n📋 模板生成的锐评特点:")
    print("  ✅ 无需网络，快速响应")
    print("  ✅ 结果稳定，可预测")
    print("  ⚠️  内容相对固定，缺乏新意")
    print("  ⚠️  只是简单模板拼接")
    
    print("\n" + "=" * 78)
    print("  🚀 推荐配置: 本地部署 Ollama + qwen2:7b 模型")
    print("     完全免费，隐私安全，响应速度快")
    print("=" * 78 + "\n")


if __name__ == "__main__":
    mock_ollama_success()
    mock_ai_vs_template()
