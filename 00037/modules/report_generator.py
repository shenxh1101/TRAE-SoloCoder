import sys
import os
from datetime import datetime, date, timedelta
from collections import defaultdict
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns
from io import BytesIO

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from models import SessionLocal, Customer, Order, Receivable, CreditScoreHistory, OperationLog
from config.settings import REPORTS_DIR, CREDIT_LEVELS
from utils import format_currency, credit_level_order, notifier, logger

try:
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib import colors
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
    from reportlab.lib.units import inch
    REPORTLAB_AVAILABLE = True
except ImportError:
    REPORTLAB_AVAILABLE = False


class CreditRiskReportGenerator:
    def __init__(self):
        self.db = SessionLocal()
        self.report_dir = REPORTS_DIR
        os.makedirs(self.report_dir, exist_ok=True)

    def collect_statistics(self, report_date=None):
        report_date = report_date or date.today()
        first_day_of_month = report_date.replace(day=1)
        last_month_end = first_day_of_month - timedelta(days=1)
        first_day_last_month = last_month_end.replace(day=1)

        stats = {}

        all_customers = self.db.query(Customer).all()
        active_customers = [c for c in all_customers if c.is_active]

        level_distribution = defaultdict(int)
        for customer in active_customers:
            level_distribution[customer.credit_level] += 1

        sorted_levels = sorted(level_distribution.keys(), key=credit_level_order)
        stats['level_distribution'] = {
            level: level_distribution[level] for level in sorted_levels
        }
        stats['total_customers'] = len(active_customers)

        total_receivables = self.db.query(Receivable).filter(
            Receivable.remaining_amount > 0
        ).all()

        bad_debt_threshold = 90
        bad_debt_amount = sum(
            r.remaining_amount for r in total_receivables
            if r.days_overdue >= bad_debt_threshold
        )
        total_receivable_amount = sum(r.remaining_amount for r in total_receivables)

        stats['total_receivables'] = total_receivable_amount
        stats['bad_debt_amount'] = bad_debt_amount
        stats['bad_debt_rate'] = bad_debt_amount / total_receivable_amount if total_receivable_amount > 0 else 0

        month_orders = self.db.query(Order).filter(
            Order.created_at >= first_day_last_month,
            Order.created_at < first_day_of_month
        ).all()

        over_limit_orders = [o for o in month_orders if o.exceeds_credit_limit]
        stats['total_orders'] = len(month_orders)
        stats['over_limit_orders'] = len(over_limit_orders)
        stats['over_limit_ratio'] = len(over_limit_orders) / len(month_orders) if month_orders else 0
        stats['over_limit_amount'] = sum(o.total_amount for o in over_limit_orders)

        over_limit_customers = set()
        for customer in active_customers:
            if customer.current_balance > customer.credit_limit:
                over_limit_customers.add(customer.id)

        stats['over_limit_customers'] = len(over_limit_customers)
        stats['over_limit_customer_ratio'] = len(over_limit_customers) / len(active_customers) if active_customers else 0

        overdue_receivables = [r for r in total_receivables if r.days_overdue > 0]
        stats['overdue_count'] = len(overdue_receivables)
        stats['overdue_amount'] = sum(r.remaining_amount for r in overdue_receivables)

        aging_buckets = defaultdict(lambda: {'count': 0, 'amount': 0})
        for r in overdue_receivables:
            if r.days_overdue <= 15:
                bucket = '0-15天'
            elif r.days_overdue <= 30:
                bucket = '16-30天'
            elif r.days_overdue <= 60:
                bucket = '31-60天'
            elif r.days_overdue <= 90:
                bucket = '61-90天'
            else:
                bucket = '90天以上'
            aging_buckets[bucket]['count'] += 1
            aging_buckets[bucket]['amount'] += r.remaining_amount

        stats['aging_analysis'] = dict(aging_buckets)

        score_changes = self.db.query(CreditScoreHistory).filter(
            CreditScoreHistory.calculated_at >= first_day_last_month,
            CreditScoreHistory.calculated_at < first_day_of_month
        ).all()

        upgrades = [c for c in score_changes if credit_level_order(c.new_level) < credit_level_order(c.old_level)]
        downgrades = [c for c in score_changes if credit_level_order(c.new_level) > credit_level_order(c.old_level)]

        stats['credit_changes'] = {
            'total': len(score_changes),
            'upgrades': len(upgrades),
            'downgrades': len(downgrades)
        }

        stats['report_month'] = last_month_end.strftime('%Y年%m月')
        stats['generated_at'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

        return stats

    def generate_charts(self, stats, temp_dir):
        os.makedirs(temp_dir, exist_ok=True)
        chart_paths = {}

        plt.rcParams['font.sans-serif'] = ['Arial Unicode MS', 'SimHei', 'DejaVu Sans']
        plt.rcParams['axes.unicode_minus'] = False

        fig, ax = plt.subplots(figsize=(10, 6))
        levels = list(stats['level_distribution'].keys())
        counts = [max(0, int(c)) for c in stats['level_distribution'].values()]
        colors_list = ['#2E8B57', '#3CB371', '#90EE90', '#FFD700', '#FFA500', '#FF6347', '#DC143C']
        if sum(counts) > 0:
            ax.pie(counts, labels=levels, colors=colors_list[:len(levels)], autopct='%1.1f%%', startangle=90)
        else:
            ax.text(0.5, 0.5, '暂无数据', ha='center', va='center', fontsize=14)
        ax.set_title('客户信用等级分布', fontsize=14, fontweight='bold')
        pie_path = os.path.join(temp_dir, 'level_distribution.png')
        plt.tight_layout()
        plt.savefig(pie_path, dpi=150, bbox_inches='tight')
        plt.close()
        chart_paths['level_distribution'] = pie_path

        fig, ax = plt.subplots(figsize=(10, 6))
        buckets = ['0-15天', '16-30天', '31-60天', '61-90天', '90天以上']
        amounts = [float(stats['aging_analysis'].get(b, {'amount': 0})['amount']) / 10000 for b in buckets]
        amounts = [max(0, a) for a in amounts]
        bars = ax.bar(buckets, amounts, color=['#90EE90', '#FFD700', '#FFA500', '#FF6347', '#DC143C'])
        ax.set_xlabel('逾期天数')
        ax.set_ylabel('金额 (万元)')
        ax.set_title('应收账款账龄分析', fontsize=14, fontweight='bold')
        for bar in bars:
            height = bar.get_height()
            if height > 0:
                ax.text(bar.get_x() + bar.get_width() / 2, height, f'{height:,.1f}', ha='center', va='bottom')
        aging_path = os.path.join(temp_dir, 'aging_analysis.png')
        plt.tight_layout()
        plt.savefig(aging_path, dpi=150, bbox_inches='tight')
        plt.close()
        chart_paths['aging_analysis'] = aging_path

        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 5))

        risk_labels = ['正常订单', '超限订单']
        risk_values = [max(0, stats['total_orders'] - stats['over_limit_orders']), max(0, stats['over_limit_orders'])]
        if sum(risk_values) > 0:
            ax1.pie(risk_values, labels=risk_labels, colors=['#90EE90', '#FF6347'], autopct='%1.1f%%', startangle=90)
        else:
            ax1.text(0.5, 0.5, '暂无数据', ha='center', va='center', fontsize=12)
        ax1.set_title('订单超限比例', fontsize=12, fontweight='bold')

        change_labels = ['信用提升', '信用下降', '无变化']
        change_values = [
            max(0, stats['credit_changes']['upgrades']),
            max(0, stats['credit_changes']['downgrades']),
            max(0, stats['credit_changes']['total'] - stats['credit_changes']['upgrades'] - stats['credit_changes']['downgrades'])
        ]
        if sum(change_values) > 0:
            ax2.pie(change_values, labels=change_labels, colors=['#3CB371', '#FF6347', '#D3D3D3'], autopct='%1.1f%%', startangle=90)
        else:
            ax2.text(0.5, 0.5, '暂无数据', ha='center', va='center', fontsize=12)
        ax2.set_title('信用等级变动', fontsize=12, fontweight='bold')

        risk_path = os.path.join(temp_dir, 'risk_analysis.png')
        plt.tight_layout()
        plt.savefig(risk_path, dpi=150, bbox_inches='tight')
        plt.close()
        chart_paths['risk_analysis'] = risk_path

        return chart_paths

    def generate_excel_report(self, stats, output_path=None):
        if output_path is None:
            output_path = os.path.join(
                self.report_dir,
                f"信用风险报告_{stats['report_month']}.xlsx"
            )

        with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
            df_summary = pd.DataFrame([
                {'指标': '报告期', '数值': stats['report_month']},
                {'指标': '客户总数', '数值': stats['total_customers']},
                {'指标': '应收账款总额', '数值': stats['total_receivables']},
                {'指标': '坏账金额', '数值': stats['bad_debt_amount']},
                {'指标': '坏账率', '数值': f"{stats['bad_debt_rate']*100:.2f}%"},
                {'指标': '本月订单数', '数值': stats['total_orders']},
                {'指标': '超限订单数', '数值': stats['over_limit_orders']},
                {'指标': '超限比例', '数值': f"{stats['over_limit_ratio']*100:.2f}%"},
                {'指标': '超限客户数', '数值': stats['over_limit_customers']},
                {'指标': '超限客户比例', '数值': f"{stats['over_limit_customer_ratio']*100:.2f}%"},
                {'指标': '逾期应收账款笔数', '数值': stats['overdue_count']},
                {'指标': '逾期应收账款金额', '数值': stats['overdue_amount']},
            ])
            df_summary.to_excel(writer, sheet_name='报告摘要', index=False)

            df_levels = pd.DataFrame([
                {'信用等级': level, '客户数量': count,
                 '占比': f"{count/stats['total_customers']*100:.2f}%" if stats['total_customers'] > 0 else '0%'}
                for level, count in stats['level_distribution'].items()
            ])
            df_levels.to_excel(writer, sheet_name='客户等级分布', index=False)

            df_aging = pd.DataFrame([
                {'逾期期间': bucket,
                 '笔数': data['count'],
                 '金额': data['amount'],
                 '占比': f"{data['amount']/stats['overdue_amount']*100:.2f}%" if stats['overdue_amount'] > 0 else '0%'}
                for bucket, data in stats['aging_analysis'].items()
            ])
            df_aging.to_excel(writer, sheet_name='账龄分析', index=False)

            df_changes = pd.DataFrame([
                {'变动类型': '信用等级调整总数', '数量': stats['credit_changes']['total']},
                {'变动类型': '信用提升', '数量': stats['credit_changes']['upgrades']},
                {'变动类型': '信用下降', '数量': stats['credit_changes']['downgrades']},
            ])
            df_changes.to_excel(writer, sheet_name='信用等级变动', index=False)

            customers = self.db.query(Customer).filter(Customer.is_active == True).all()
            df_customers = pd.DataFrame([
                {
                    '客户编码': c.customer_code,
                    '客户名称': c.name,
                    '行业': c.industry,
                    '信用评分': c.credit_score,
                    '信用等级': c.credit_level,
                    '信用额度': c.credit_limit,
                    '当前余额': c.current_balance,
                    '可用额度': c.available_credit,
                    '注册日期': c.registration_date
                }
                for c in customers
            ])
            df_customers.to_excel(writer, sheet_name='客户明细', index=False)

            for sheet in writer.sheets.values():
                for column in sheet.columns:
                    max_length = 0
                    column_name = column[0].column_letter
                    for cell in column:
                        try:
                            if len(str(cell.value)) > max_length:
                                max_length = len(str(cell.value))
                        except:
                            pass
                    sheet.column_dimensions[column_name].width = min(max_length + 2, 50)

        return output_path

    def generate_pdf_report(self, stats, chart_paths, output_path=None):
        if not REPORTLAB_AVAILABLE:
            return None

        if output_path is None:
            output_path = os.path.join(
                self.report_dir,
                f"信用风险报告_{stats['report_month']}.pdf"
            )

        doc = SimpleDocTemplate(output_path, pagesize=landscape(A4),
                               rightMargin=36, leftMargin=36,
                               topMargin=36, bottomMargin=36)

        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#1F3A5F'),
            alignment=1,
            spaceAfter=20
        )
        subtitle_style = ParagraphStyle(
            'CustomSubtitle',
            parent=styles['Heading2'],
            fontSize=14,
            textColor=colors.HexColor('#4A7BB7'),
            spaceAfter=12
        )
        normal_style = styles['Normal']
        normal_style.fontSize = 10

        story = []
        story.append(Paragraph(f"客户信用风险评估报告 - {stats['report_month']}", title_style))
        story.append(Paragraph(f"生成时间: {stats['generated_at']}", styles['Italic']))
        story.append(Spacer(1, 20))

        summary_data = [
            ['指标', '数值', '指标', '数值'],
            ['客户总数', stats['total_customers'], '应收账款总额', format_currency(stats['total_receivables'])],
            ['坏账金额', format_currency(stats['bad_debt_amount']), '坏账率', f"{stats['bad_debt_rate']*100:.2f}%"],
            ['本月订单数', stats['total_orders'], '超限订单数', stats['over_limit_orders']],
            ['超限比例', f"{stats['over_limit_ratio']*100:.2f}%", '超限客户数', stats['over_limit_customers']],
            ['逾期金额', format_currency(stats['overdue_amount']), '逾期笔数', stats['overdue_count']],
        ]
        summary_table = Table(summary_data, colWidths=[1.8*inch, 1.8*inch, 1.8*inch, 1.8*inch])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1F3A5F')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 11),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
            ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#F5F7FA')),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#D0D7DE')),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
        ]))
        story.append(Paragraph('一、报告摘要', subtitle_style))
        story.append(summary_table)
        story.append(Spacer(1, 15))

        story.append(Paragraph('二、客户信用等级分布', subtitle_style))
        level_img = Image(chart_paths['level_distribution'], width=4*inch, height=2.5*inch)
        story.append(level_img)
        story.append(Spacer(1, 10))

        level_data = [['信用等级', '客户数量', '占比']]
        for level, count in stats['level_distribution'].items():
            pct = f"{count/stats['total_customers']*100:.2f}%" if stats['total_customers'] > 0 else '0%'
            level_data.append([level, count, pct])
        level_table = Table(level_data, colWidths=[1.5*inch, 1.5*inch, 1.5*inch])
        level_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2E8B57')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#D0D7DE')),
        ]))
        story.append(level_table)
        story.append(Spacer(1, 15))

        story.append(Paragraph('三、应收账款账龄分析', subtitle_style))
        aging_img = Image(chart_paths['aging_analysis'], width=4*inch, height=2.5*inch)
        story.append(aging_img)
        story.append(Spacer(1, 10))

        aging_data = [['逾期期间', '笔数', '金额', '占比']]
        for bucket, data in stats['aging_analysis'].items():
            pct = f"{data['amount']/stats['overdue_amount']*100:.2f}%" if stats['overdue_amount'] > 0 else '0%'
            aging_data.append([bucket, data['count'], format_currency(data['amount']), pct])
        aging_table = Table(aging_data, colWidths=[1.3*inch, 1.2*inch, 1.8*inch, 1.2*inch])
        aging_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#FF8C00')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#D0D7DE')),
        ]))
        story.append(aging_table)
        story.append(Spacer(1, 15))

        story.append(Paragraph('四、风险分析', subtitle_style))
        risk_img = Image(chart_paths['risk_analysis'], width=6*inch, height=2.5*inch)
        story.append(risk_img)

        doc.build(story)
        return output_path

    def generate_monthly_report(self, report_date=None):
        stats = self.collect_statistics(report_date)
        temp_dir = os.path.join(self.report_dir, 'temp_charts')

        try:
            chart_paths = self.generate_charts(stats, temp_dir)

            excel_path = self.generate_excel_report(stats)
            pdf_path = self.generate_pdf_report(stats, chart_paths)

            report_paths = {
                'excel': excel_path,
                'pdf': pdf_path,
                'report_month': stats['report_month']
            }

            logger.log_monthly_report(stats['report_month'], stats, excel_path)
            notifier.send_report_notification(excel_path, stats['report_month'], stats)

            return report_paths, stats
        finally:
            import shutil
            if os.path.exists(temp_dir):
                shutil.rmtree(temp_dir)

    def close(self):
        self.db.close()


def run_monthly_report():
    generator = CreditRiskReportGenerator()
    try:
        report_paths, stats = generator.generate_monthly_report()
        print(f"\n月度信用风险报告生成完成:")
        print(f"  Excel报告: {report_paths['excel']}")
        if report_paths['pdf']:
            print(f"  PDF报告: {report_paths['pdf']}")
        print(f"  客户总数: {stats['total_customers']}")
        print(f"  坏账率: {stats['bad_debt_rate']*100:.2f}%")
        print(f"  超限比例: {stats['over_limit_ratio']*100:.2f}%")
        return report_paths, stats
    finally:
        generator.close()
