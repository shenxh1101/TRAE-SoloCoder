import os
import re
import json
import hashlib
import smtplib
import requests
from datetime import datetime, timedelta
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from config import (
    ALLOWED_FORMATS, MAX_FILE_SIZE, SENSITIVE_WORDS,
    CONFIDENTIAL_KEYWORDS, SMTP_CONFIG, WECOM_WEBHOOKS
)
from models import get_connection

def validate_file_format(file_path):
    _, ext = os.path.splitext(file_path.lower())
    if ext not in ALLOWED_FORMATS:
        return False, f"不支持的文件格式: {ext}，支持格式: {', '.join(ALLOWED_FORMATS.keys())}"
    return True, "格式验证通过"

def validate_file_size(file_path):
    if not os.path.exists(file_path):
        return False, "文件不存在"
    file_size = os.path.getsize(file_path)
    if file_size > MAX_FILE_SIZE:
        return False, f"文件大小超过限制: {file_size / 1024 / 1024:.2f}MB > {MAX_FILE_SIZE / 1024 / 1024}MB"
    return True, "大小验证通过"

def extract_text_content(file_path):
    _, ext = os.path.splitext(file_path.lower())
    text_content = ""
    
    try:
        if ext == '.txt':
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                text_content = f.read()
        elif ext == '.md':
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                text_content = f.read()
        else:
            text_content = os.path.basename(file_path)
    except Exception as e:
        print(f"提取文本内容失败: {e}")
    
    return text_content

def check_sensitive_words(text):
    found_sensitive = {}
    for category, words in SENSITIVE_WORDS.items():
        found = []
        for word in words:
            if word in text:
                found.append(word)
        if found:
            found_sensitive[category] = found
    return found_sensitive

def check_confidential(text):
    found_confidential = []
    for keyword in CONFIDENTIAL_KEYWORDS:
        if keyword in text:
            found_confidential.append(keyword)
    return found_confidential

def send_email(to_email, subject, content):
    try:
        msg = MIMEMultipart()
        msg['From'] = SMTP_CONFIG['username']
        msg['To'] = to_email
        msg['Subject'] = subject
        
        msg.attach(MIMEText(content, 'html', 'utf-8'))
        
        with smtplib.SMTP(SMTP_CONFIG['host'], SMTP_CONFIG['port']) as server:
            if SMTP_CONFIG['use_tls']:
                server.starttls()
            server.login(SMTP_CONFIG['username'], SMTP_CONFIG['password'])
            server.send_message(msg)
        
        return True, "邮件发送成功"
    except Exception as e:
        return False, f"邮件发送失败: {str(e)}"

def send_wecom_notification(group_name, title, content):
    if group_name not in WECOM_WEBHOOKS:
        return False, f"未找到群组: {group_name}"
    
    webhook_url = WECOM_WEBHOOKS[group_name]
    
    data = {
        "msgtype": "markdown",
        "markdown": {
            "content": f"**{title}**\n\n{content}"
        }
    }
    
    try:
        response = requests.post(webhook_url, json=data, timeout=10)
        if response.status_code == 200:
            return True, "企业微信通知发送成功"
        return False, f"发送失败: {response.text}"
    except Exception as e:
        return False, f"企业微信通知异常: {str(e)}"

def create_notification(recipient_type, recipient_id, notification_type, title, content, document_id=None, review_id=None):
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        INSERT INTO notifications (
            recipient_type, recipient_id, notification_type, title, content,
            document_id, review_id, sent_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        recipient_type, recipient_id, notification_type, title, content,
        document_id, review_id, datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    ))
    
    conn.commit()
    conn.close()

def create_audit_log(document_id, action, actor_id, actor_name, details=None, ip_address=None):
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        INSERT INTO audit_logs (
            document_id, action, actor_id, actor_name, details, ip_address, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (
        document_id, action, actor_id, actor_name, details,
        ip_address, datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    ))
    
    conn.commit()
    conn.close()

def parse_version(version_str):
    match = re.match(r'(\d+)\.(\d+)', version_str)
    if match:
        return int(match.group(1)), int(match.group(2))
    return 1, 0

def increment_version(current_version, is_major=False):
    major, minor = parse_version(current_version)
    if is_major:
        return f"{major + 1}.0"
    return f"{major}.{minor + 1}"

def generate_file_hash(file_path):
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()

def format_datetime(dt_str):
    if not dt_str:
        return ""
    try:
        dt = datetime.strptime(dt_str, '%Y-%m-%d %H:%M:%S')
        return dt.strftime('%Y-%m-%d %H:%M:%S')
    except:
        return dt_str

def get_time_diff_hours(start_time, end_time=None):
    if end_time is None:
        end_time = datetime.now()
    if isinstance(start_time, str):
        start_time = datetime.strptime(start_time, '%Y-%m-%d %H:%M:%S')
    diff = end_time - start_time
    return diff.total_seconds() / 3600
