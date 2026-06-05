import sys
import os
from datetime import datetime, timedelta, date

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config.settings import CREDIT_LEVELS, APPROVAL_THRESHOLDS, FINANCIAL_INDICATORS


def get_credit_level(score):
    for level, config in sorted(CREDIT_LEVELS.items(), key=lambda x: -x[1]['min_score']):
        if config['min_score'] <= score <= config['max_score']:
            return level
    return 'C'


def get_credit_multiplier(level):
    return CREDIT_LEVELS.get(level, {}).get('multiplier', 0.1)


def get_approval_level(order_amount):
    for threshold in APPROVAL_THRESHOLDS:
        if threshold['min_amount'] <= order_amount < threshold['max_amount']:
            return threshold['level'], threshold['approvers']
    return 3, APPROVAL_THRESHOLDS[-1]['approvers']


def calculate_financial_health_score(indicators):
    total_score = 100.0

    for indicator_name, config in FINANCIAL_INDICATORS.items():
        value = indicators.get(indicator_name)
        if value is None:
            total_score -= config['weight'] * 100
            continue

        if indicator_name == 'asset_liability_ratio':
            target = config['target']
            if value <= target:
                continue
            excess = (value - target) / target
            penalty = min(excess * 20 * config['weight'] * 100, config['max_penalty'] * config['weight'])
            total_score -= penalty

        elif indicator_name in ['current_ratio', 'quick_ratio', 'cash_flow_ratio']:
            target = config['target']
            min_value = config['min_value']
            if value >= target:
                continue
            if value < min_value:
                total_score -= config['weight'] * 100
            else:
                shortfall = (target - value) / (target - min_value)
                penalty = shortfall * config['weight'] * 100
                total_score -= penalty

    return max(0.0, min(100.0, total_score))


def calculate_financial_ratios(data):
    ratios = {}
    ratios['asset_liability_ratio'] = data['total_liabilities'] / data['total_assets'] if data.get('total_assets', 0) > 0 else None
    ratios['current_ratio'] = data['current_assets'] / data['current_liabilities'] if data.get('current_liabilities', 0) > 0 else None
    ratios['quick_ratio'] = (data['current_assets'] - data.get('inventory', 0)) / data['current_liabilities'] if data.get('current_liabilities', 0) > 0 else None
    ratios['cash_flow_ratio'] = data['operating_cash_flow'] / data['current_liabilities_operating'] if data.get('current_liabilities_operating', 0) > 0 else None
    return ratios


def days_between(date1, date2):
    if isinstance(date1, datetime):
        date1 = date1.date()
    if isinstance(date2, datetime):
        date2 = date2.date()
    return (date2 - date1).days


def generate_order_number():
    today = date.today().strftime('%Y%m%d')
    timestamp = datetime.now().strftime('%H%M%S%f')[:-3]
    return f"ORD-{today}-{timestamp}"


def generate_invoice_number():
    today = date.today().strftime('%Y%m%d')
    timestamp = datetime.now().strftime('%H%M%S%f')[:-3]
    return f"INV-{today}-{timestamp}"


def format_currency(amount):
    return f"¥{amount:,.2f}"


def parse_date(date_str):
    if isinstance(date_str, (datetime, date)):
        return date_str
    for fmt in ['%Y-%m-%d', '%Y/%m/%d', '%Y%m%d', '%d-%m-%Y', '%d/%m/%Y']:
        try:
            return datetime.strptime(str(date_str), fmt).date()
        except (ValueError, TypeError):
            continue
    return None


def credit_level_order(level):
    order = {'AAA': 0, 'AA': 1, 'A': 2, 'BBB': 3, 'BB': 4, 'B': 5, 'C': 6}
    return order.get(level, 99)
