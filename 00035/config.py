import os
from datetime import timedelta

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, 'document_management.db')

ALLOWED_FORMATS = {
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.txt': 'text/plain'
}

MAX_FILE_SIZE = 50 * 1024 * 1024

SENSITIVE_WORDS = {
    '政治敏感': ['台独', '港独', '藏独', '法轮功', '邪教'],
    '违规内容': ['赌博', '色情', '毒品', '暴力', '诈骗']
}

CONFIDENTIAL_KEYWORDS = [
    '绝密', '机密', '秘密', '内部资料', '保密',
    '商业秘密', '核心技术', '财务数据', '客户名单', '未公开'
]

DOCUMENT_TYPE_REVIEWERS = {
    '技术文档': ['tech_lead@company.com', 'cto@company.com'],
    '财务文档': ['finance_manager@company.com', 'cfo@company.com'],
    '人事文档': ['hr_manager@company.com', 'hr_director@company.com'],
    '市场文档': ['marketing_manager@company.com', 'cmo@company.com'],
    '法务文档': ['legal_counsel@company.com', 'chief_legal@company.com'],
    '行政文档': ['admin_manager@company.com', 'coo@company.com']
}

SUPERIOR_HIERARCHY = {
    'tech_lead@company.com': 'cto@company.com',
    'finance_manager@company.com': 'cfo@company.com',
    'hr_manager@company.com': 'hr_director@company.com',
    'marketing_manager@company.com': 'cmo@company.com',
    'legal_counsel@company.com': 'chief_legal@company.com',
    'admin_manager@company.com': 'coo@company.com'
}

DEPARTMENT_GROUPS = {
    '技术部': 'tech_department_group',
    '财务部': 'finance_department_group',
    '人事部': 'hr_department_group',
    '市场部': 'marketing_department_group',
    '法务部': 'legal_department_group',
    '行政部': 'admin_department_group',
    '全公司': 'all_company_group'
}

SUBSCRIPTION_TAGS = {
    '技术更新': ['技术部'],
    '财务公告': ['财务部', '全公司'],
    '人事政策': ['人事部', '全公司'],
    '市场动态': ['市场部', '全公司'],
    '法务通知': ['法务部', '全公司'],
    '行政规定': ['行政部', '全公司']
}

REVIEW_TIMEOUT_HOURS = 48
EXPIRY_REMINDER_DAYS = 30
DOCUMENT_EXPIRY_DAYS = 365

SMTP_CONFIG = {
    'host': 'smtp.company.com',
    'port': 587,
    'username': 'system@company.com',
    'password': 'your_password',
    'use_tls': True
}

WECOM_WEBHOOKS = {
    'tech_department_group': 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx',
    'finance_department_group': 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx',
    'hr_department_group': 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx',
    'marketing_department_group': 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx',
    'legal_department_group': 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx',
    'admin_department_group': 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx',
    'all_company_group': 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx'
}

WECOM_CONFIG = {
    'enabled': False,
    'default_webhook': 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=YOUR_DEFAULT_KEY_HERE',
    'notify_types': {
        'document_published': True,
        'review_assigned': True,
        'review_reminder': True,
        'expiry_reminder': True,
        'weekly_report': True,
        'system_alert': True
    },
    'message_template': {
        'document_published': {
            'msgtype': 'news',
            'title': '新文档发布通知',
            'description': '{author}发布了新文档：{title}'
        },
        'review_assigned': {
            'msgtype': 'text',
            'content': '您有新的文档审核任务：{title}，请在{timeout}小时内处理。'
        },
        'expiry_reminder': {
            'msgtype': 'text',
            'content': '【文档过期提醒】{title} 将在{days}天后过期，请及时更新。'
        }
    }
}

SCHEDULER_CONFIG = {
    'enabled': True,
    'timezone': 'Asia/Shanghai',
    'jobs': {
        'daily_maintenance': {
            'enabled': True,
            'trigger': 'cron',
            'hour': 8,
            'minute': 0,
            'description': '每日维护任务：扫描过期文档、检查超时审核'
        },
        'expiry_scan': {
            'enabled': True,
            'trigger': 'cron',
            'hour': 9,
            'minute': 0,
            'description': '每日扫描即将过期文档，提前30天提醒作者'
        },
        'timeout_check': {
            'enabled': True,
            'trigger': 'interval',
            'hours': 6,
            'description': '每6小时检查超时审核，自动升级'
        },
        'weekly_report': {
            'enabled': True,
            'trigger': 'cron',
            'day_of_week': 'mon',
            'hour': 10,
            'minute': 0,
            'description': '每周一生成上周质量报告并导出PDF/Excel'
        },
        'expired_takedown': {
            'enabled': True,
            'trigger': 'cron',
            'hour': 22,
            'minute': 0,
            'description': '每日晚上10点自动下架过期文档'
        }
    }
}

EXPORT_CONFIG = {
    'pdf': {
        'enabled': True,
        'font': 'Helvetica',
        'page_size': 'A4',
        'margin': 2,
        'include_charts': True
    },
    'excel': {
        'enabled': True,
        'freeze_header': True,
        'auto_width': True,
        'include_styles': True
    },
    'output_dir': os.path.join(BASE_DIR, 'reports'),
    'filename_format': '{type}_{date}_{time}.{ext}'
}

NOTIFICATION_CONFIG = {
    'channels': ['email', 'wecom'],
    'email_enabled': True,
    'wecom_enabled': False,
    'retry_attempts': 3,
    'retry_interval': 60
}
