import os
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, 'data')
REPORTS_DIR = os.path.join(BASE_DIR, 'reports')
LOGS_DIR = os.path.join(BASE_DIR, 'logs')

DATABASE_URL = f"sqlite:///{os.path.join(DATA_DIR, 'credit_risk.db')}"

CREDIT_SCORE_WEIGHTS = {
    'payment_history': 0.35,
    'credit_utilization': 0.20,
    'order_frequency': 0.15,
    'average_order_value': 0.10,
    'years_as_customer': 0.10,
    'financial_health': 0.10
}

CREDIT_LEVELS = {
    'AAA': {'min_score': 90, 'max_score': 100, 'multiplier': 3.0},
    'AA': {'min_score': 80, 'max_score': 89.9, 'multiplier': 2.5},
    'A': {'min_score': 70, 'max_score': 79.9, 'multiplier': 2.0},
    'BBB': {'min_score': 60, 'max_score': 69.9, 'multiplier': 1.5},
    'BB': {'min_score': 50, 'max_score': 59.9, 'multiplier': 1.0},
    'B': {'min_score': 40, 'max_score': 49.9, 'multiplier': 0.5},
    'C': {'min_score': 0, 'max_score': 39.9, 'multiplier': 0.1}
}

APPROVAL_THRESHOLDS = [
    {'level': 1, 'min_amount': 0, 'max_amount': 100000, 'approvers': ['销售经理']},
    {'level': 2, 'min_amount': 100000, 'max_amount': 500000, 'approvers': ['销售经理', '财务主管']},
    {'level': 3, 'min_amount': 500000, 'max_amount': float('inf'), 'approvers': ['销售经理', '财务主管', '风控总监']}
]

COLLECTION_STRATEGIES = [
    {
        'min_credit_level': 'AAA',
        'max_days': 15,
        'actions': ['发送友好提醒邮件'],
        'priority': 'low'
    },
    {
        'min_credit_level': 'AA',
        'max_days': 30,
        'actions': ['发送催收邮件', '电话提醒'],
        'priority': 'medium'
    },
    {
        'min_credit_level': 'A',
        'max_days': 45,
        'actions': ['暂停新订单', '发送正式催收函', '负责人介入'],
        'priority': 'high'
    },
    {
        'min_credit_level': 'BBB',
        'max_days': 60,
        'actions': ['冻结所有业务', '发送律师函预警', '高层介入'],
        'priority': 'critical'
    },
    {
        'min_credit_level': 'BB',
        'max_days': 90,
        'actions': ['移交法务部门', '启动坏账准备', '客户黑名单'],
        'priority': 'critical'
    },
    {
        'min_credit_level': 'B',
        'max_days': float('inf'),
        'actions': ['启动法律诉讼', '全额坏账计提', '行业通报'],
        'priority': 'critical'
    }
]

SCHEDULE_CONFIG = {
    'daily_score_update': {'hour': 2, 'minute': 0},
    'daily_overdue_scan': {'hour': 8, 'minute': 0},
    'monthly_report': {'day': 1, 'hour': 0, 'minute': 30}
}

NOTIFICATION_CONFIG = {
    'email_enabled': False,
    'sms_enabled': False,
    'push_notification_enabled': True
}

FINANCIAL_INDICATORS = {
    'asset_liability_ratio': {'weight': 0.25, 'target': 0.5, 'max_penalty': 10},
    'current_ratio': {'weight': 0.25, 'target': 2.0, 'min_value': 1.0},
    'quick_ratio': {'weight': 0.20, 'target': 1.0, 'min_value': 0.5},
    'cash_flow_ratio': {'weight': 0.30, 'target': 0.4, 'min_value': 0.1}
}

CRM_CONFIG = {
    'base_url': os.environ.get('CRM_BASE_URL', 'https://crm.example.com/api'),
    'api_key': os.environ.get('CRM_API_KEY', 'demo_crm_api_key_12345'),
    'timeout': 30,
    'retry_times': 3,
    'retry_delay': 2,
    'endpoints': {
        'customers': '/v1/customers',
        'orders': '/v1/orders',
        'transactions': '/v1/transactions',
        'customer_detail': '/v1/customers/{customer_id}'
    },
    'enabled': os.environ.get('CRM_ENABLED', 'false').lower() == 'true',
    'sync_days': 30
}

FINANCE_CONFIG = {
    'base_url': os.environ.get('FINANCE_BASE_URL', 'https://finance.example.com/api'),
    'api_key': os.environ.get('FINANCE_API_KEY', 'demo_finance_api_key_67890'),
    'timeout': 30,
    'retry_times': 3,
    'retry_delay': 2,
    'endpoints': {
        'invoices': '/v1/invoices',
        'payments': '/v1/payments',
        'receivables': '/v1/receivables',
        'customer_payments': '/v1/customers/{customer_id}/payments'
    },
    'enabled': os.environ.get('FINANCE_ENABLED', 'false').lower() == 'true',
    'sync_days': 30
}

WEB_CONFIG = {
    'host': os.environ.get('WEB_HOST', '0.0.0.0'),
    'port': int(os.environ.get('WEB_PORT', '5000')),
    'debug': os.environ.get('WEB_DEBUG', 'false').lower() == 'true',
    'upload_folder': os.path.join(DATA_DIR, 'uploads'),
    'allowed_extensions': {'pdf', 'xlsx', 'xls'},
    'max_content_length': 50 * 1024 * 1024,
    'secret_key': os.environ.get('WEB_SECRET_KEY', 'credit-risk-secret-key-2024')
}

API_DATA_CONFIG = {
    'sync_schedule': {
        'crm_transactions': {'hour': 1, 'minute': 0},
        'finance_payments': {'hour': 1, 'minute': 30}
    },
    'save_raw_data': True,
    'raw_data_retention_days': 90
}
