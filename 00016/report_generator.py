from typing import Dict, Any
from pathlib import Path
import datetime


class HTMLReportGenerator:
    def __init__(self):
        self.emojis = {
            'excellent': ['🌟', '🏆', '✨', '💎'],
            'good': ['👍', '😊', '✅', '🎉'],
            'average': ['🤔', '😐', '⚠️', '📊'],
            'poor': ['💩', '🔥', '😱', '🤯'],
            'terrible': ['☠️', '💀', '🗑️', '🌋'],
            'high': ['🔴', '🚨', '💢', '⚡'],
            'medium': ['🟡', '⚠️', '🔥', '💫'],
            'low': ['🟢', '✅', '🍀', '✨']
        }

    def generate_report(self, roast_report: Dict[str, Any], output_path: str) -> str:
        html_content = self._build_single_report(roast_report)
        return self._save_report(html_content, output_path)

    def generate_comparison_report(self, comparison: Dict[str, Any], output_path: str) -> str:
        html_content = self._build_comparison_report(comparison)
        return self._save_report(html_content, output_path)

    def _build_single_report(self, report: Dict[str, Any]) -> str:
        score_emoji = random.choice(self.emojis[report['quality_level']])
        
        html = f"""
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>💩 代码屎山吐槽报告</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{ 
            font-family: 'Segoe UI', 'Microsoft YaHei', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }}
        .container {{
            max-width: 900px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            overflow: hidden;
        }}
        .header {{
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }}
        .header h1 {{
            font-size: 2.5em;
            margin-bottom: 10px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }}
        .file-info {{
            background: #f8f9fa;
            padding: 20px;
            border-bottom: 3px solid #e9ecef;
        }}
        .file-info p {{
            margin: 5px 0;
            color: #495057;
        }}
        .score-section {{
            text-align: center;
            padding: 40px 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }}
        .score {{
            font-size: 5em;
            font-weight: bold;
            text-shadow: 3px 3px 6px rgba(0,0,0,0.3);
        }}
        .score-label {{
            font-size: 1.2em;
            margin-top: 10px;
            opacity: 0.9;
        }}
        .metaphor {{
            font-size: 1.5em;
            margin-top: 15px;
            padding: 10px 20px;
            background: rgba(255,255,255,0.2);
            border-radius: 30px;
            display: inline-block;
        }}
        .section {{
            padding: 25px 30px;
            border-bottom: 1px solid #e9ecef;
        }}
        .section h2 {{
            color: #495057;
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            gap: 10px;
        }}
        .overall-roast {{
            background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);
            padding: 20px;
            border-radius: 15px;
            font-size: 1.1em;
            line-height: 1.6;
            color: #8b4513;
        }}
        .roast-list {{
            list-style: none;
        }}
        .roast-item {{
            padding: 15px;
            margin: 10px 0;
            border-radius: 10px;
            background: #f8f9fa;
            border-left: 4px solid #667eea;
            transition: transform 0.2s;
        }}
        .roast-item:hover {{
            transform: translateX(5px);
        }}
        .metrics-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
        }}
        .metric-card {{
            background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
            padding: 15px;
            border-radius: 10px;
            text-align: center;
        }}
        .metric-label {{
            color: #495057;
            font-size: 0.9em;
        }}
        .metric-value {{
            font-size: 1.5em;
            font-weight: bold;
            color: #667eea;
            margin-top: 5px;
        }}
        .suggestion-item {{
            padding: 15px;
            margin: 10px 0;
            border-radius: 10px;
            background: #e8f5e9;
            border-left: 4px solid #4caf50;
        }}
        .suggestion-problem {{
            font-weight: bold;
            color: #2e7d32;
            margin-bottom: 8px;
        }}
        .suggestion-text {{
            color: #388e3c;
        }}
        .footer {{
            text-align: center;
            padding: 20px;
            background: #f8f9fa;
            color: #6c757d;
            font-size: 0.9em;
        }}
        .badge {{
            display: inline-block;
            padding: 3px 10px;
            border-radius: 12px;
            font-size: 0.8em;
            font-weight: bold;
            margin-left: 10px;
        }}
        .badge-high {{ background: #ff4444; color: white; }}
        .badge-medium {{ background: #ffbb33; color: #333; }}
        .badge-low {{ background: #00C851; color: white; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>💩 代码屎山吐槽机</h1>
            <p>专业吐槽，童叟无欺</p>
        </div>
        
        <div class="file-info">
            <p><strong>📁 文件：</strong>{report['file_name']}</p>
            <p><strong>💻 语言：</strong>{report['language']}</p>
            <p><strong>📝 总行数：</strong>{report['total_lines']} 行</p>
            <p><strong>🎭 吐槽风格：</strong>{self._get_style_name(report['style_used'])}</p>
        </div>
        
        <div class="score-section">
            <div class="score">{score_emoji} {report['score']}/100</div>
            <div class="score-label">代码质量评分</div>
            <div class="metaphor">{report['metaphor_emoji']} {report['metaphor']}</div>
        </div>
        
        <div class="section">
            <h2>🔥 总吐槽</h2>
            <div class="overall-roast">
                {report['overall_roast']}
            </div>
        </div>
        
        <div class="section">
            <h2>💢 具体槽点</h2>
            <ul class="roast-list">
                {''.join(f'<li class="roast-item">{roast}</li>' for roast in report['individual_roasts'])}
            </ul>
        </div>
        
        <div class="section">
            <h2>📊 指标一览</h2>
            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-label">📏 最长函数</div>
                    <div class="metric-value">{report['metrics_summary']['max_function_length']}</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">🎁 最深嵌套</div>
                    <div class="metric-value">{report['metrics_summary']['max_nesting_level']}</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">🧬 重复代码</div>
                    <div class="metric-value">{report['metrics_summary']['duplicate_code_count']}</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">📝 注释率</div>
                    <div class="metric-value">{report['metrics_summary']['comment_ratio']}</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">🔧 函数数量</div>
                    <div class="metric-value">{report['metrics_summary']['function_count']}</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">✏️  超长行</div>
                    <div class="metric-value">{report['metrics_summary']['long_lines']}</div>
                </div>
            </div>
        </div>
        
        <div class="section">
            <h2>💡 重构建议 TOP 3</h2>
            {''.join(self._build_suggestion_card(s) for s in report['top_suggestions'])}
        </div>
        
        <div class="footer">
            <p>🤖 本报告由代码屎山吐槽机自动生成 | {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
            <p>⚠️ 吐槽仅供娱乐，重构还需谨慎</p>
        </div>
    </div>
</body>
</html>
"""
        return html

    def _build_comparison_report(self, comparison: Dict[str, Any]) -> str:
        f1 = comparison['file1']['roast']
        f2 = comparison['file2']['roast']
        diff = comparison['differences']
        focus = comparison['focus_change']
        
        score_diff = diff['score_change']
        score_diff_emoji = '📈' if score_diff > 0 else '📉' if score_diff < 0 else '➖'
        score_diff_text = f"+{score_diff}" if score_diff > 0 else str(score_diff)
        
        html = f"""
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>⚔️ 代码屎山对比报告</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{ 
            font-family: 'Segoe UI', 'Microsoft YaHei', sans-serif;
            background: linear-gradient(135deg, #2c3e50 0%, #4ca1af 100%);
            min-height: 100vh;
            padding: 20px;
        }}
        .container {{
            max-width: 1000px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            overflow: hidden;
        }}
        .header {{
            background: linear-gradient(135deg, #ff6b6b 0%, #feca57 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }}
        .header h1 {{
            font-size: 2.5em;
            margin-bottom: 10px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }}
        .vs-badge {{
            display: inline-block;
            background: white;
            color: #ff6b6b;
            padding: 5px 20px;
            border-radius: 20px;
            font-weight: bold;
            font-size: 1.2em;
            margin-top: 10px;
        }}
        .comparison-grid {{
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1px;
            background: #e9ecef;
        }}
        .file-column {{
            padding: 20px;
            background: white;
        }}
        .file-title {{
            text-align: center;
            font-size: 1.1em;
            color: #495057;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 2px solid #e9ecef;
        }}
        .score-box {{
            text-align: center;
            padding: 20px;
            border-radius: 15px;
            margin-bottom: 15px;
        }}
        .score-box.file1 {{
            background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
        }}
        .score-box.file2 {{
            background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);
        }}
        .score {{
            font-size: 3em;
            font-weight: bold;
            color: #495057;
        }}
        .metaphor {{
            margin-top: 10px;
            font-size: 0.9em;
            color: #6c757d;
        }}
        .roast-snippet {{
            padding: 10px;
            background: #f8f9fa;
            border-radius: 8px;
            font-size: 0.85em;
            margin-top: 10px;
            border-left: 3px solid #667eea;
        }}
        .diff-section {{
            padding: 30px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }}
        .diff-section h2 {{
            text-align: center;
            margin-bottom: 20px;
        }}
        .diff-summary {{
            text-align: center;
            font-size: 2em;
            margin-bottom: 20px;
        }}
        .diff-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 15px;
        }}
        .diff-item {{
            background: rgba(255,255,255,0.2);
            padding: 15px;
            border-radius: 10px;
            text-align: center;
        }}
        .diff-label {{
            font-size: 0.9em;
            opacity: 0.9;
        }}
        .diff-value {{
            font-size: 1.5em;
            font-weight: bold;
            margin-top: 5px;
        }}
        .diff-value.positive {{ color: #81c784; }}
        .diff-value.negative {{ color: #ff8a80; }}
        .diff-value.neutral {{ color: white; }}
        .focus-change {{
            padding: 25px 30px;
            background: #fff3e0;
        }}
        .focus-change h2 {{
            color: #e65100;
            margin-bottom: 15px;
        }}
        .focus-list {{
            list-style: none;
        }}
        .focus-item {{
            padding: 10px;
            margin: 5px 0;
            border-radius: 8px;
        }}
        .focus-item.good {{ background: #c8e6c9; color: #2e7d32; }}
        .focus-item.bad {{ background: #ffcdd2; color: #c62828; }}
        .footer {{
            text-align: center;
            padding: 20px;
            background: #f8f9fa;
            color: #6c757d;
            font-size: 0.9em;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⚔️ 代码屎山大对决</h1>
            <div class="vs-badge">VS</div>
            <p style="margin-top: 15px; opacity: 0.9;">看看哪份代码更烂！</p>
        </div>
        
        <div class="comparison-grid">
            <div class="file-column">
                <div class="file-title">📁 {Path(comparison['file1']['path']).name}</div>
                <div class="score-box file1">
                    <div class="score">{f1['score']}/100</div>
                    <div class="metaphor">{f1['metaphor_emoji']} {f1['metaphor']}</div>
                </div>
                <div class="roast-snippet">
                    💬 {f1['overall_roast'][:80]}...
                </div>
            </div>
            <div class="file-column">
                <div class="file-title">📁 {Path(comparison['file2']['path']).name}</div>
                <div class="score-box file2">
                    <div class="score">{f2['score']}/100</div>
                    <div class="metaphor">{f2['metaphor_emoji']} {f2['metaphor']}</div>
                </div>
                <div class="roast-snippet">
                    💬 {f2['overall_roast'][:80]}...
                </div>
            </div>
        </div>
        
        <div class="diff-section">
            <h2>📊 变化统计</h2>
            <div class="diff-summary">{score_diff_emoji} 分数变化: {score_diff_text}</div>
            <div class="diff-grid">
                {self._build_diff_item('总行数', diff['lines_change'], diff['lines_change_percent'])}
                {self._build_diff_item('最长函数', diff['max_function_length_change'])}
                {self._build_diff_item('最深嵌套', diff['max_nesting_change'])}
                {self._build_diff_item('重复代码', diff['duplicate_count_change'])}
                {self._build_diff_item('函数数量', diff['function_count_change'])}
                {self._build_diff_item('TODO数量', diff['todo_count_change'])}
            </div>
        </div>
        
        <div class="focus-change">
            <h2>🎯 吐槽焦点变化</h2>
            <ul class="focus-list">
                {self._build_focus_items(focus)}
            </ul>
        </div>
        
        <div class="footer">
            <p>🤖 本报告由代码屎山吐槽机自动生成 | {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
            <p>⚔️ 没有最烂，只有更烂</p>
        </div>
    </div>
</body>
</html>
"""
        return html

    def _build_diff_item(self, label: str, change: int, percent: float = None) -> str:
        if change > 0:
            cls = 'negative'
            sign = '+'
        elif change < 0:
            cls = 'positive'
            sign = ''
        else:
            cls = 'neutral'
            sign = ''
        
        percent_text = f" ({sign}{percent}%)" if percent is not None else ""
        return f'''
        <div class="diff-item">
            <div class="diff-label">{label}</div>
            <div class="diff-value {cls}">{sign}{change}{percent_text}</div>
        </div>
        '''

    def _build_focus_items(self, focus: Dict) -> str:
        items = []
        for item in focus.get('fixed', []):
            items.append(f'<li class="focus-item good">🎉 修复问题：{item}</li>')
        for item in focus.get('improved', []):
            items.append(f'<li class="focus-item good">👍 改善问题：{item}</li>')
        for item in focus.get('new_issues', []):
            items.append(f'<li class="focus-item bad">⚠️  新增问题：{item}</li>')
        for item in focus.get('worsened', []):
            items.append(f'<li class="focus-item bad">👎 恶化问题：{item}</li>')
        
        if not items:
            items.append('<li class="focus-item" style="background: #e3f2fd; color: #1565c0;">🤔 无明显变化</li>')
        
        return '\n'.join(items)

    def _build_suggestion_card(self, suggestion: Dict) -> str:
        severity_badge = f'<span class="badge badge-{suggestion["severity"]}">{suggestion["severity"].upper()}</span>'
        return f'''
        <div class="suggestion-item">
            <div class="suggestion-problem">🎯 {suggestion['problem']} {severity_badge}</div>
            <div class="suggestion-text">💡 建议：{suggestion['suggestion']}</div>
        </div>
        '''

    def _get_style_name(self, style: str) -> str:
        names = {
            'kitchen': '🍳 厨房烂摊子',
            'construction': '🏗️ 工地现场',
            'war': '⚔️ 战争现场',
            'nature': '🌴 原始丛林',
            'office': '💼 办公室政治'
        }
        return names.get(style, style)

    def _save_report(self, html_content: str, output_path: str) -> str:
        path = Path(output_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(path, 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        return str(path)


import random
