import sys
import os
import re
from datetime import datetime, date
import pandas as pd

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from models import SessionLocal, Customer, FinancialRecord
from utils import (
    calculate_financial_ratios, calculate_financial_health_score,
    parse_date, notifier, logger
)


class FinancialStatementParser:
    def __init__(self):
        self.db = SessionLocal()

    def parse_pdf(self, file_path):
        try:
            import pdfplumber
        except ImportError:
            raise ImportError("请安装 pdfplumber: pip install pdfplumber")

        extracted_data = {}
        full_text = ""

        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    full_text += text + "\n"

        extracted_data.update(self._extract_key_numbers(full_text))
        extracted_data['report_period'] = self._extract_report_period(full_text)
        extracted_data['raw_text'] = full_text
        extracted_data['source_file'] = file_path

        return self._standardize_data(extracted_data)

    def parse_excel(self, file_path):
        try:
            xl = pd.ExcelFile(file_path)
        except ImportError:
            raise ImportError("请安装 pandas 和 openpyxl")

        extracted_data = {}

        for sheet_name in xl.sheet_names:
            df = pd.read_excel(file_path, sheet_name=sheet_name)
            sheet_text = df.to_string()
            extracted_data.update(self._extract_key_numbers(sheet_text))

            if '报告期' in sheet_name or '资产负债' in sheet_name or '利润' in sheet_name or '现金' in sheet_name:
                for col in df.columns:
                    col_str = str(col)
                    if any(kw in col_str for kw in ['202', '201', '报告期', '期间']):
                        extracted_data['report_period'] = col_str
                        break

        extracted_data['source_file'] = file_path
        return self._standardize_data(extracted_data)

    def _extract_key_numbers(self, text):
        patterns = {
            'total_assets': [r'(总资产|资产总计)[^\d]*([\d,\.]+)', r'Assets\s+Total[^\d]*([\d,\.]+)'],
            'total_liabilities': [r'(总负债|负债合计)[^\d]*([\d,\.]+)', r'Liabilities\s+Total[^\d]*([\d,\.]+)'],
            'current_assets': [r'(流动资产合计|流动资产)[^\d]*([\d,\.]+)', r'Current\s+Assets[^\d]*([\d,\.]+)'],
            'current_liabilities': [r'(流动负债合计|流动负债)[^\d]*([\d,\.]+)', r'Current\s+Liabilities[^\d]*([\d,\.]+)'],
            'inventory': [r'(存货|库存商品)[^\d]*([\d,\.]+)', r'Inventory[^\d]*([\d,\.]+)'],
            'cash_and_equivalents': [r'(货币资金|现金及现金等价物)[^\d]*([\d,\.]+)', r'Cash[^\d]*([\d,\.]+)'],
            'operating_cash_flow': [r'(经营活动产生的现金流量净额|经营现金流)[^\d]*([\d,\.]+)', r'Operating\s+Cash\s+Flow[^\d]*([\d,\.]+)'],
            'revenue': [r'(营业收入|销售收入)[^\d]*([\d,\.]+)', r'(Revenue|Sales)[^\d]*([\d,\.]+)'],
            'net_profit': [r'(净利润|归属于母公司所有者的净利润)[^\d]*([\d,\.]+)', r'Net\s+Profit[^\d]*([\d,\.]+)'],
        }

        results = {}
        for key, regex_list in patterns.items():
            for regex in regex_list:
                match = re.search(regex, text)
                if match:
                    value_str = match.group(len(match.groups()))
                    value_str = value_str.replace(',', '')
                    try:
                        value = float(value_str)
                        results[key] = self._normalize_amount(value)
                        break
                    except (ValueError, TypeError):
                        continue
        return results

    def _normalize_amount(self, value):
        if abs(value) >= 1000000000:
            return value
        elif abs(value) >= 10000000:
            return value * 100
        elif abs(value) >= 100000:
            return value * 10000
        return value

    def _extract_report_period(self, text):
        patterns = [
            r'(20\d{2})[年\-/](\d{1,2})[月\-/]?(\d{0,2})',
            r'(20\d{2})年度',
            r'(20\d{2})年第([一二三四1-4])季度',
        ]
        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                groups = match.groups()
                if len(groups) >= 3 and groups[2]:
                    return f"{groups[0]}-{groups[1].zfill(2)}-{groups[2].zfill(2)}"
                elif len(groups) >= 2 and groups[1]:
                    if groups[1] in ['一', '1']:
                        return f"{groups[0]}-Q1"
                    elif groups[1] in ['二', '2']:
                        return f"{groups[0]}-Q2"
                    elif groups[1] in ['三', '3']:
                        return f"{groups[0]}-Q3"
                    elif groups[1] in ['四', '4']:
                        return f"{groups[0]}-Q4"
                    else:
                        return f"{groups[0]}-{groups[1].zfill(2)}"
                else:
                    return f"{groups[0]}-年度"
        return None

    def _standardize_data(self, data):
        required_fields = ['total_assets', 'total_liabilities', 'current_assets', 'current_liabilities']
        missing = [f for f in required_fields if f not in data or data[f] is None]
        if missing:
            raise ValueError(f"缺少必要财务数据: {', '.join(missing)}")

        data['current_liabilities_operating'] = data.get('current_liabilities', 0)
        if 'inventory' not in data:
            data['inventory'] = 0
        if 'cash_and_equivalents' not in data:
            data['cash_and_equivalents'] = data.get('current_assets', 0) * 0.1
        if 'operating_cash_flow' not in data:
            data['operating_cash_flow'] = data.get('revenue', 0) * 0.05
        if 'revenue' not in data:
            data['revenue'] = 0
        if 'net_profit' not in data:
            data['net_profit'] = 0

        ratios = calculate_financial_ratios(data)
        health_score = calculate_financial_health_score(ratios)

        return {
            'raw_data': data,
            'ratios': ratios,
            'financial_health_score': health_score,
            'report_period': data.get('report_period', date.today().strftime('%Y-%m')),
            'source_file': data.get('source_file', '')
        }

    def manual_input(self, customer_id, financial_data, report_period=None, uploaded_by='system'):
        customer = self.db.query(Customer).filter(Customer.id == customer_id).first()
        if not customer:
            raise ValueError(f"客户ID {customer_id} 不存在")

        data_for_calc = financial_data.copy()
        if 'current_liabilities_operating' not in data_for_calc:
            data_for_calc['current_liabilities_operating'] = financial_data.get('current_liabilities', 0)

        ratios = calculate_financial_ratios(data_for_calc)
        health_score = calculate_financial_health_score(ratios)

        record = FinancialRecord(
            customer_id=customer_id,
            report_period=report_period or date.today().strftime('%Y-%m'),
            report_date=parse_date(report_period) if report_period else date.today(),
            total_assets=financial_data.get('total_assets'),
            total_liabilities=financial_data.get('total_liabilities'),
            current_assets=financial_data.get('current_assets'),
            current_liabilities=financial_data.get('current_liabilities'),
            inventory=financial_data.get('inventory', 0),
            cash_and_equivalents=financial_data.get('cash_and_equivalents', 0),
            operating_cash_flow=financial_data.get('operating_cash_flow', 0),
            current_liabilities_operating=financial_data.get('current_liabilities', 0),
            revenue=financial_data.get('revenue', 0),
            net_profit=financial_data.get('net_profit', 0),
            asset_liability_ratio=ratios['asset_liability_ratio'],
            current_ratio=ratios['current_ratio'],
            quick_ratio=ratios['quick_ratio'],
            cash_flow_ratio=ratios['cash_flow_ratio'],
            financial_health_score=health_score,
            source_file='manual_input',
            uploaded_by=uploaded_by
        )
        self.db.add(record)
        self.db.commit()
        self.db.refresh(record)

        logger.log_financial_report_upload(customer, record, uploaded_by)

        return record, ratios, health_score

    def upload_financial_statement(self, customer_id, file_path, uploaded_by='system'):
        customer = self.db.query(Customer).filter(Customer.id == customer_id).first()
        if not customer:
            raise ValueError(f"客户ID {customer_id} 不存在")

        if not os.path.exists(file_path):
            raise FileNotFoundError(f"文件不存在: {file_path}")

        ext = os.path.splitext(file_path)[1].lower()

        if ext == '.pdf':
            parsed_data = self.parse_pdf(file_path)
        elif ext in ['.xlsx', '.xls']:
            parsed_data = self.parse_excel(file_path)
        else:
            raise ValueError(f"不支持的文件格式: {ext}，请上传PDF或Excel文件")

        raw_data = parsed_data['raw_data']
        ratios = parsed_data['ratios']
        health_score = parsed_data['financial_health_score']

        record = FinancialRecord(
            customer_id=customer_id,
            report_period=parsed_data['report_period'],
            report_date=parse_date(parsed_data['report_period']) or date.today(),
            total_assets=raw_data.get('total_assets'),
            total_liabilities=raw_data.get('total_liabilities'),
            current_assets=raw_data.get('current_assets'),
            current_liabilities=raw_data.get('current_liabilities'),
            inventory=raw_data.get('inventory', 0),
            cash_and_equivalents=raw_data.get('cash_and_equivalents', 0),
            operating_cash_flow=raw_data.get('operating_cash_flow', 0),
            current_liabilities_operating=raw_data.get('current_liabilities', 0),
            revenue=raw_data.get('revenue', 0),
            net_profit=raw_data.get('net_profit', 0),
            asset_liability_ratio=ratios['asset_liability_ratio'],
            current_ratio=ratios['current_ratio'],
            quick_ratio=ratios['quick_ratio'],
            cash_flow_ratio=ratios['cash_flow_ratio'],
            financial_health_score=health_score,
            source_file=parsed_data['source_file'],
            uploaded_by=uploaded_by
        )
        self.db.add(record)
        self.db.commit()
        self.db.refresh(record)

        logger.log_financial_report_upload(customer, record, uploaded_by)

        if health_score < 60:
            from modules.credit_scoring import CreditScoringEngine
            scorer = CreditScoringEngine()
            scorer.update_customer_credit(
                customer,
                reason=f'财务报表显示财务健康状况不佳（评分{health_score:.1f}），自动调整信用等级'
            )
            scorer.close()

        return {
            'record': record,
            'ratios': ratios,
            'health_score': health_score,
            'customer': customer.name
        }

    def get_customer_financial_history(self, customer_id):
        return self.db.query(FinancialRecord).filter(
            FinancialRecord.customer_id == customer_id
        ).order_by(FinancialRecord.report_date.desc()).all()

    def close(self):
        self.db.close()
