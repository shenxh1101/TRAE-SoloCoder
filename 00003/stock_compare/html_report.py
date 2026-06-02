import os
from datetime import datetime
from typing import Dict, Tuple, List
import json


class HTMLReport:
    def __init__(self, output_dir: str = "output/reports"):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)

    def generate(self, 
                 comparison_data: Dict,
                 ai_comment: Dict,
                 ascii_chart: str,
                 price_data1: Tuple[List[str], List[float]],
                 price_data2: Tuple[List[str], List[float]]) -> str:
        
        code1 = comparison_data["stock1"]["code"]
        code2 = comparison_data["stock2"]["code"]
        period = comparison_data["period_days"]
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        filename = f"compare_{code1}_{code2}_{period}d_{timestamp}.html"
        filepath = os.path.join(self.output_dir, filename)
        
        html_content = self._build_html(comparison_data, ai_comment, ascii_chart, 
                                        price_data1, price_data2)
        
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(html_content)
        
        return filepath

    def _build_html(self, 
                    comparison_data: Dict,
                    ai_comment: Dict,
                    ascii_chart: str,
                    price_data1: Tuple[List[str], List[float]],
                    price_data2: Tuple[List[str], List[float]]) -> str:
        
        s1 = comparison_data["stock1"]
        s2 = comparison_data["stock2"]
        code1, code2 = s1["code"], s2["code"]
        period = comparison_data["period_days"]
        winner = comparison_data.get("winner", "平局")
        
        pe1 = s1.get("pe") or {}
        pe2 = s2.get("pe") or {}

        norm1 = self._normalize(price_data1[1])
        norm2 = self._normalize(price_data2[1])
        labels = price_data1[0]

        chart1_data = json.dumps({
            "labels": labels,
            "datasets": [
                {"label": code1, "data": norm1, "color": "#3498db"},
                {"label": code2, "data": norm2, "color": "#e74c3c"}
            ]
        })

        chart2_data = json.dumps({
            "labels": [code1, code2],
            "values": [s1["change_percent"] or 0, s2["change_percent"] or 0],
            "colors": ["#3498db", "#e74c3c"]
        })

        chart3_data = json.dumps({
            "labels": [code1, code2],
            "values": [pe1.get("percentile", 0), pe2.get("percentile", 0)],
            "colors": ["#3498db", "#e74c3c"]
        })

        winner_badge = ""
        if winner == code1:
            winner_badge = '<span class="winner-badge">🏆 胜出</span>'
        elif winner == code2:
            winner_badge = '<span class="winner-badge" style="background:#e74c3c">🏆 胜出</span>'

        html = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>股票对比分析 - {code1} vs {code2}</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{ 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }}
        .container {{
            max-width: 1200px;
            margin: 0 auto;
        }}
        .header {{
            text-align: center;
            color: white;
            margin-bottom: 30px;
        }}
        .header h1 {{ font-size: 2.5em; margin-bottom: 10px; }}
        .header .meta {{ opacity: 0.9; }}
        .card {{
            background: white;
            border-radius: 16px;
            padding: 24px;
            margin-bottom: 24px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
        }}
        .card h2 {{
            color: #2c3e50;
            margin-bottom: 20px;
            font-size: 1.5em;
            border-bottom: 3px solid #667eea;
            padding-bottom: 10px;
            display: inline-block;
        }}
        .stock-grid {{
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 20px;
        }}
        .stock-card {{
            padding: 20px;
            border-radius: 12px;
            border: 2px solid #eee;
            position: relative;
        }}
        .stock-card.blue {{ border-color: #3498db; background: #f8f9ff; }}
        .stock-card.red {{ border-color: #e74c3c; background: #fff8f8; }}
        .stock-card h3 {{ font-size: 1.8em; margin-bottom: 15px; }}
        .winner-badge {{
            position: absolute;
            top: 10px;
            right: 10px;
            background: #f1c40f;
            color: #2c3e50;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.85em;
            font-weight: bold;
        }}
        .metric-grid {{
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
        }}
        .metric {{
            background: white;
            padding: 12px;
            border-radius: 8px;
        }}
        .metric-label {{
            font-size: 0.85em;
            color: #7f8c8d;
            margin-bottom: 4px;
        }}
        .metric-value {{
            font-size: 1.3em;
            font-weight: bold;
            color: #2c3e50;
        }}
        .positive {{ color: #27ae60 !important; }}
        .negative {{ color: #e74c3c !important; }}
        .chart-container {{
            position: relative;
            margin: 20px 0;
            text-align: center;
        }}
        .chart-container canvas {{
            width: 100% !important;
            max-width: 100%;
            border: 1px solid #ecf0f1;
            border-radius: 8px;
        }}
        .chart-title {{
            text-align: center;
            color: #2c3e50;
            margin-bottom: 10px;
            font-weight: 600;
        }}
        .chart-row {{
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }}
        .chart-legend {{
            display: flex;
            justify-content: center;
            gap: 20px;
            margin-top: 10px;
        }}
        .legend-item {{
            display: flex;
            align-items: center;
            gap: 6px;
        }}
        .legend-color {{
            width: 16px;
            height: 3px;
            border-radius: 2px;
        }}
        .ascii-chart {{
            font-family: 'Courier New', monospace;
            font-size: 11px;
            line-height: 1.4;
            background: #1e1e1e;
            color: #d4d4d4;
            padding: 15px;
            border-radius: 8px;
            overflow-x: auto;
            white-space: pre;
        }}
        .ai-comment {{
            background: linear-gradient(135deg, #f5f7fa 0%, #e4e8eb 100%);
            padding: 20px;
            border-radius: 12px;
            border-left: 4px solid #667eea;
        }}
        .ai-comment h3 {{
            color: #667eea;
            margin-bottom: 15px;
        }}
        .comment-section {{
            margin-bottom: 15px;
            padding: 12px;
            background: white;
            border-radius: 8px;
        }}
        .comment-section h4 {{
            color: #34495e;
            margin-bottom: 8px;
        }}
        .risk {{ border-left: 3px solid #e74c3c; padding-left: 10px; }}
        .opportunity {{ border-left: 3px solid #27ae60; padding-left: 10px; }}
        .summary {{
            background: #fff9e6;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #f39c12;
            margin-top: 15px;
            font-weight: 500;
        }}
        .disclaimer {{
            font-size: 0.85em;
            color: #95a5a6;
            margin-top: 15px;
            padding-top: 10px;
            border-top: 1px dashed #bdc3c7;
        }}
        .quick-tip {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 15px 20px;
            border-radius: 12px;
            font-size: 1.1em;
            text-align: center;
            margin-bottom: 20px;
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }}
        th, td {{
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ecf0f1;
        }}
        th {{
            background: #f8f9fa;
            font-weight: 600;
            color: #2c3e50;
        }}
        tr:hover {{ background: #f8f9fa; }}
        @media (max-width: 768px) {{
            .stock-grid, .chart-row {{
                grid-template-columns: 1fr;
            }}
            .header h1 {{ font-size: 1.8em; }}
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 股票对比分析报告</h1>
            <div class="meta">
                {code1} vs {code2} &nbsp;|&nbsp; 
                周期: {period}天 &nbsp;|&nbsp; 
                生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
            </div>
        </div>

        <div class="quick-tip">
            💡 {ai_comment.get("summary", "")}
        </div>

        <div class="card">
            <h2>📈 核心指标对比</h2>
            <div class="stock-grid">
                <div class="stock-card blue">
                    {winner_badge if winner == code1 else ''}
                    <h3 style="color:#3498db">{code1}</h3>
                    <div class="metric-grid">
                        <div class="metric">
                            <div class="metric-label">区间涨跌幅</div>
                            <div class="metric-value {self._get_color_class(s1['change_percent'])}">
                                {self._format_pct(s1['change_percent'])}
                            </div>
                        </div>
                        <div class="metric">
                            <div class="metric-label">起始价格</div>
                            <div class="metric-value">{s1.get('start_price', '-'):.2f}</div>
                        </div>
                        <div class="metric">
                            <div class="metric-label">最新价格</div>
                            <div class="metric-value">{s1.get('end_price', '-'):.2f}</div>
                        </div>
                        <div class="metric">
                            <div class="metric-label">波动率</div>
                            <div class="metric-value">{s1.get('volatility', '-')}%</div>
                        </div>
                        <div class="metric">
                            <div class="metric-label">最大回撤</div>
                            <div class="metric-value negative">{s1.get('max_drawdown', '-')}%</div>
                        </div>
                        <div class="metric">
                            <div class="metric-label">PE分位点</div>
                            <div class="metric-value">{pe1.get('percentile', '-')}%</div>
                        </div>
                    </div>
                </div>

                <div class="stock-card red">
                    {winner_badge if winner == code2 else ''}
                    <h3 style="color:#e74c3c">{code2}</h3>
                    <div class="metric-grid">
                        <div class="metric">
                            <div class="metric-label">区间涨跌幅</div>
                            <div class="metric-value {self._get_color_class(s2['change_percent'])}">
                                {self._format_pct(s2['change_percent'])}
                            </div>
                        </div>
                        <div class="metric">
                            <div class="metric-label">起始价格</div>
                            <div class="metric-value">{s2.get('start_price', '-'):.2f}</div>
                        </div>
                        <div class="metric">
                            <div class="metric-label">最新价格</div>
                            <div class="metric-value">{s2.get('end_price', '-'):.2f}</div>
                        </div>
                        <div class="metric">
                            <div class="metric-label">波动率</div>
                            <div class="metric-value">{s2.get('volatility', '-')}%</div>
                        </div>
                        <div class="metric">
                            <div class="metric-label">最大回撤</div>
                            <div class="metric-value negative">{s2.get('max_drawdown', '-')}%</div>
                        </div>
                        <div class="metric">
                            <div class="metric-label">PE分位点</div>
                            <div class="metric-value">{pe2.get('percentile', '-')}%</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="card">
            <h2>📉 走势对比</h2>
            <div class="chart-container">
                <div class="chart-title">归一化涨跌幅对比 (%)</div>
                <canvas id="priceChart" height="400"></canvas>
                <div class="chart-legend">
                    <div class="legend-item">
                        <span class="legend-color" style="background:#3498db"></span>
                        <span>{code1}</span>
                    </div>
                    <div class="legend-item">
                        <span class="legend-color" style="background:#e74c3c"></span>
                        <span>{code2}</span>
                    </div>
                </div>
            </div>
        </div>

        <div class="card">
            <h2>📊 指标图表</h2>
            <div class="chart-row">
                <div class="chart-container">
                    <div class="chart-title">涨跌幅对比</div>
                    <canvas id="changeChart" height="300"></canvas>
                </div>
                <div class="chart-container">
                    <div class="chart-title">PE分位点对比</div>
                    <canvas id="peChart" height="300"></canvas>
                </div>
            </div>
        </div>

        <div class="card">
            <h2>⌨️ ASCII 走势图</h2>
            <div class="ascii-chart">{ascii_chart}</div>
        </div>

        <div class="card">
            <h2>📋 PE估值详细对比</h2>
            <table>
                <thead>
                    <tr>
                        <th>指标</th>
                        <th>{code1}</th>
                        <th>{code2}</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>当前PE</td>
                        <td>{pe1.get('current_pe', '-')}</td>
                        <td>{pe2.get('current_pe', '-')}</td>
                    </tr>
                    <tr>
                        <td>PE分位点</td>
                        <td>{pe1.get('percentile', '-')}%</td>
                        <td>{pe2.get('percentile', '-')}%</td>
                    </tr>
                    <tr>
                        <td>估值水平</td>
                        <td>{pe1.get('valuation', '-')}</td>
                        <td>{pe2.get('valuation', '-')}</td>
                    </tr>
                    <tr>
                        <td>历史最低PE</td>
                        <td>{pe1.get('min_pe', '-')}</td>
                        <td>{pe2.get('min_pe', '-')}</td>
                    </tr>
                    <tr>
                        <td>历史最高PE</td>
                        <td>{pe1.get('max_pe', '-')}</td>
                        <td>{pe2.get('max_pe', '-')}</td>
                    </tr>
                    <tr>
                        <td>历史均值PE</td>
                        <td>{pe1.get('mean_pe', '-')}</td>
                        <td>{pe2.get('mean_pe', '-')}</td>
                    </tr>
                    <tr>
                        <td>历史中位PE</td>
                        <td>{pe1.get('median_pe', '-')}</td>
                        <td>{pe2.get('median_pe', '-')}</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div class="card">
            <h2>🤖 AI 锐评</h2>
            <div class="ai-comment">
                <div class="comment-section">
                    <h4>🎯 {code1} 分析</h4>
                    <div class="risk">
                        <strong>⚠️ 风险提示：</strong>{ai_comment['stock1']['risk']}
                    </div>
                    <br>
                    <div class="opportunity">
                        <strong>✨ 机会展望：</strong>{ai_comment['stock1']['opportunity']}
                    </div>
                </div>

                <div class="comment-section">
                    <h4>🎯 {code2} 分析</h4>
                    <div class="risk">
                        <strong>⚠️ 风险提示：</strong>{ai_comment['stock2']['risk']}
                    </div>
                    <br>
                    <div class="opportunity">
                        <strong>✨ 机会展望：</strong>{ai_comment['stock2']['opportunity']}
                    </div>
                </div>

                <div class="summary">
                    📝 {ai_comment['summary']}
                </div>

                <div class="disclaimer">
                    {ai_comment['disclaimer']}
                </div>
            </div>
        </div>
    </div>

    <script>
        const chart1Data = {chart1_data};
        const chart2Data = {chart2_data};
        const chart3Data = {chart3_data};

        function drawLineChart(canvasId, data) {{
            const canvas = document.getElementById(canvasId);
            const ctx = canvas.getContext('2d');
            
            const dpr = window.devicePixelRatio || 1;
            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width * dpr;
            canvas.height = canvas.height * dpr;
            ctx.scale(dpr, dpr);
            
            const width = rect.width;
            const height = rect.height;
            const padding = {{ top: 30, right: 30, bottom: 50, left: 60 }};
            const chartWidth = width - padding.left - padding.right;
            const chartHeight = height - padding.top - padding.bottom;

            ctx.clearRect(0, 0, width, height);

            const allValues = data.datasets.flatMap(d => d.data);
            const minVal = Math.min(...allValues);
            const maxVal = Math.max(...allValues);
            const range = maxVal - minVal || 1;

            const yTicks = 5;
            for (let i = 0; i <= yTicks; i++) {{
                const y = padding.top + (chartHeight / yTicks) * i;
                const val = maxVal - (range / yTicks) * i;
                ctx.beginPath();
                ctx.moveTo(padding.left, y);
                ctx.lineTo(width - padding.right, y);
                ctx.strokeStyle = '#ecf0f1';
                ctx.lineWidth = 1;
                ctx.stroke();
                
                ctx.fillStyle = '#7f8c8d';
                ctx.font = '12px sans-serif';
                ctx.textAlign = 'right';
                ctx.fillText(val.toFixed(1) + '%', padding.left - 10, y + 4);
            }}

            const nPoints = data.labels.length;
            for (let i = 0; i < nPoints; i++) {{
                const x = padding.left + (chartWidth / (nPoints - 1)) * i;
                if (i % Math.max(1, Math.floor(nPoints / 6)) === 0) {{
                    ctx.fillStyle = '#7f8c8d';
                    ctx.font = '11px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText(data.labels[i].slice(5), x, height - padding.bottom + 20);
                }}
            }}

            data.datasets.forEach(dataset => {{
                ctx.beginPath();
                ctx.strokeStyle = dataset.color;
                ctx.lineWidth = 2;
                ctx.lineJoin = 'round';

                dataset.data.forEach((val, i) => {{
                    const x = padding.left + (chartWidth / (nPoints - 1)) * i;
                    const y = padding.top + chartHeight - ((val - minVal) / range) * chartHeight;
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }});
                ctx.stroke();

                dataset.data.forEach((val, i) => {{
                    const x = padding.left + (chartWidth / (nPoints - 1)) * i;
                    const y = padding.top + chartHeight - ((val - minVal) / range) * chartHeight;
                    ctx.beginPath();
                    ctx.arc(x, y, 3, 0, Math.PI * 2);
                    ctx.fillStyle = dataset.color;
                    ctx.fill();
                }});
            }});
        }}

        function drawBarChart(canvasId, data, horizontal = false) {{
            const canvas = document.getElementById(canvasId);
            const ctx = canvas.getContext('2d');
            
            const dpr = window.devicePixelRatio || 1;
            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width * dpr;
            canvas.height = canvas.height * dpr;
            ctx.scale(dpr, dpr);
            
            const width = rect.width;
            const height = rect.height;
            const padding = {{ top: 30, right: 30, bottom: 40, left: 60 }};
            const chartWidth = width - padding.left - padding.right;
            const chartHeight = height - padding.top - padding.bottom;

            ctx.clearRect(0, 0, width, height);

            const maxVal = Math.max(...data.values, Math.abs(Math.min(...data.values)));
            const hasNegative = Math.min(...data.values) < 0;

            if (!horizontal) {{
                const barWidth = (chartWidth / data.labels.length) * 0.6;
                const gap = (chartWidth / data.labels.length) * 0.4;

                const yZero = padding.top + chartHeight;
                const yScale = chartHeight / (maxVal * (hasNegative ? 2 : 1.2));

                if (hasNegative) {{
                    ctx.beginPath();
                    ctx.moveTo(padding.left, yZero - chartHeight / 2);
                    ctx.lineTo(width - padding.right, yZero - chartHeight / 2);
                    ctx.strokeStyle = '#bdc3c7';
                    ctx.stroke();
                }}

                data.values.forEach((val, i) => {{
                    const x = padding.left + gap / 2 + i * (barWidth + gap);
                    const barHeight = Math.abs(val) * yScale;
                    const y = val >= 0 ? yZero - barHeight : yZero;
                    
                    ctx.fillStyle = data.colors[i];
                    ctx.fillRect(x, y, barWidth, barHeight);

                    ctx.fillStyle = '#2c3e50';
                    ctx.font = 'bold 14px sans-serif';
                    ctx.textAlign = 'center';
                    const labelY = val >= 0 ? y - 8 : y + barHeight + 20;
                    ctx.fillText((val > 0 ? '+' : '') + val.toFixed(2) + '%', x + barWidth / 2, labelY);

                    ctx.fillStyle = '#7f8c8d';
                    ctx.font = '12px sans-serif';
                    ctx.fillText(data.labels[i], x + barWidth / 2, height - padding.bottom + 15);
                }});
            }} else {{
                const barHeight = (chartHeight / data.labels.length) * 0.6;
                const gap = (chartHeight / data.labels.length) * 0.4;

                data.values.forEach((val, i) => {{
                    const y = padding.top + gap / 2 + i * (barHeight + gap);
                    const barWidth = (val / 100) * chartWidth;
                    
                    ctx.fillStyle = data.colors[i];
                    ctx.fillRect(padding.left, y, barWidth, barHeight);

                    ctx.fillStyle = '#2c3e50';
                    ctx.font = 'bold 14px sans-serif';
                    ctx.textAlign = 'left';
                    ctx.fillText(val.toFixed(1) + '%', padding.left + barWidth + 10, y + barHeight / 2 + 5);

                    ctx.fillStyle = '#7f8c8d';
                    ctx.font = '12px sans-serif';
                    ctx.textAlign = 'right';
                    ctx.fillText(data.labels[i], padding.left - 10, y + barHeight / 2 + 5);
                }});

                ctx.beginPath();
                ctx.moveTo(padding.left, padding.top);
                ctx.lineTo(padding.left, height - padding.bottom);
                ctx.strokeStyle = '#ecf0f1';
                ctx.stroke();

                for (let p = 0; p <= 100; p += 25) {{
                    const x = padding.left + (p / 100) * chartWidth;
                    ctx.beginPath();
                    ctx.moveTo(x, padding.top);
                    ctx.lineTo(x, height - padding.bottom);
                    ctx.strokeStyle = '#ecf0f1';
                    ctx.setLineDash([3, 3]);
                    ctx.stroke();
                    ctx.setLineDash([]);

                    ctx.fillStyle = '#7f8c8d';
                    ctx.font = '10px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText(p + '%', x, height - padding.bottom + 15);
                }}
            }}
        }}

        function drawAllCharts() {{
            drawLineChart('priceChart', chart1Data);
            drawBarChart('changeChart', chart2Data, false);
            drawBarChart('peChart', chart3Data, true);
        }}

        window.addEventListener('load', drawAllCharts);
        window.addEventListener('resize', drawAllCharts);
    </script>
</body>
</html>"""
        return html

    @staticmethod
    def _normalize(prices: List[float]) -> List[float]:
        if not prices or prices[0] == 0:
            return [0.0] * len(prices)
        base = prices[0]
        return [round((p - base) / base * 100, 2) for p in prices]

    @staticmethod
    def _format_pct(value):
        if value is None:
            return "-"
        prefix = "+" if value > 0 else ""
        return f"{prefix}{value}%"

    @staticmethod
    def _get_color_class(value):
        if value is None:
            return ""
        return "positive" if value > 0 else "negative"
