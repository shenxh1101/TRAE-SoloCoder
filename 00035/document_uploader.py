import os
import shutil
from datetime import datetime, timedelta
from config import DOCUMENT_EXPIRY_DAYS, ALLOWED_FORMATS
from models import get_connection
from utils import (
    validate_file_format, validate_file_size, extract_text_content,
    check_sensitive_words, check_confidential, create_notification,
    create_audit_log, format_datetime
)

class DocumentUploader:
    def __init__(self, upload_dir='uploads'):
        self.upload_dir = upload_dir
        os.makedirs(upload_dir, exist_ok=True)
    
    def upload_document(self, file_path, title, doc_type, author_info, 
                        subscription_tags=None, is_revision=False, 
                        parent_doc_id=None, change_log=""):
        """
        上传文档并进行格式检测、敏感词检测和机密检测
        """
        try:
            is_valid_format, format_msg = validate_file_format(file_path)
            if not is_valid_format:
                return {
                    'success': False,
                    'error': format_msg,
                    'error_code': 'INVALID_FORMAT'
                }
            
            is_valid_size, size_msg = validate_file_size(file_path)
            if not is_valid_size:
                return {
                    'success': False,
                    'error': size_msg,
                    'error_code': 'INVALID_SIZE'
                }
            
            text_content = extract_text_content(file_path)
            
            sensitive_words = check_sensitive_words(text_content)
            if sensitive_words:
                return {
                    'success': False,
                    'error': f"文档包含敏感内容: {sensitive_words}",
                    'error_code': 'SENSITIVE_CONTENT',
                    'sensitive_words': sensitive_words
                }
            
            confidential_keywords = check_confidential(text_content)
            is_confidential = len(confidential_keywords) > 0
            
            saved_path = self._save_file(file_path, author_info['id'])
            
            doc_id = self._save_document_to_db(
                saved_path, title, doc_type, author_info,
                subscription_tags, is_confidential, confidential_keywords,
                is_revision, parent_doc_id, change_log
            )
            
            create_audit_log(
                doc_id, 'upload',
                author_info['id'], author_info['name'],
                f"上传文档: {title}, 类型: {doc_type}"
            )
            
            result = {
                'success': True,
                'document_id': doc_id,
                'title': title,
                'is_confidential': is_confidential,
                'confidential_keywords': confidential_keywords,
                'review_level': 2 if is_confidential else 1,
                'message': '文档上传成功，已进入审核流程'
            }
            
            if is_confidential:
                self._notify_supervisor_for_confidential(doc_id, title, author_info)
            
            return result
            
        except Exception as e:
            return {
                'success': False,
                'error': f"上传失败: {str(e)}",
                'error_code': 'UPLOAD_ERROR'
            }
    
    def _save_file(self, file_path, author_id):
        """
        保存文件到上传目录
        """
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        _, ext = os.path.splitext(file_path)
        new_filename = f"{author_id}_{timestamp}{ext}"
        saved_path = os.path.join(self.upload_dir, new_filename)
        shutil.copy2(file_path, saved_path)
        return saved_path
    
    def _save_document_to_db(self, file_path, title, doc_type, author_info,
                             subscription_tags, is_confidential, confidential_keywords,
                             is_revision, parent_doc_id, change_log):
        """
        保存文档信息到数据库
        """
        conn = get_connection()
        cursor = conn.cursor()
        
        file_ext = os.path.splitext(file_path)[1].lower()
        file_size = os.path.getsize(file_path)
        expiry_date = (datetime.now() + timedelta(days=DOCUMENT_EXPIRY_DAYS)).strftime('%Y-%m-%d %H:%M:%S')
        
        version = '1.0'
        if is_revision and parent_doc_id:
            cursor.execute('SELECT version FROM documents WHERE id = ?', (parent_doc_id,))
            row = cursor.fetchone()
            if row:
                major, minor = row['version'].split('.')
                version = f"{major}.{int(minor) + 1}"
        
        tags_str = ','.join(subscription_tags) if subscription_tags else ''
        
        confidential_level = None
        if is_confidential:
            if '绝密' in confidential_keywords:
                confidential_level = '绝密'
            elif '机密' in confidential_keywords:
                confidential_level = '机密'
            elif '秘密' in confidential_keywords:
                confidential_level = '秘密'
            else:
                confidential_level = '内部'
        
        cursor.execute('''
            INSERT INTO documents (
                title, doc_type, file_path, file_format, file_size,
                author_id, author_name, author_email, department,
                subscription_tags, version, parent_doc_id, status,
                is_confidential, confidential_level, expiry_date,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            title, doc_type, file_path, file_ext, file_size,
            author_info['id'], author_info['name'], author_info['email'],
            author_info['department'], tags_str, version, parent_doc_id,
            'pending_review', 1 if is_confidential else 0,
            confidential_level, expiry_date,
            datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        ))
        
        doc_id = cursor.lastrowid
        
        if is_revision and parent_doc_id:
            cursor.execute('''
                INSERT INTO document_history (
                    document_id, version, file_path, change_log,
                    created_by, created_at
                ) VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                doc_id, version, file_path, change_log or '文档修订',
                author_info['id'], datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            ))
        
        conn.commit()
        conn.close()
        
        return doc_id
    
    def _notify_supervisor_for_confidential(self, doc_id, title, author_info):
        """
        机密文档通知主管
        """
        notification_title = "机密文档审核提醒"
        notification_content = f"""
        <p>员工 <strong>{author_info['name']}</strong> 上传了一份包含机密内容的文档，需要您进行二级审核。</p>
        <p><strong>文档标题:</strong> {title}</p>
        <p><strong>文档ID:</strong> {doc_id}</p>
        <p><strong>上传时间:</strong> {format_datetime(datetime.now().strftime('%Y-%m-%d %H:%M:%S'))}</p>
        <p>请及时登录系统进行审核。</p>
        """
        
        create_notification(
            'supervisor', 'all', 'confidential_review',
            notification_title, notification_content, doc_id
        )
        
        print(f"[通知] 机密文档已通知主管: {title}")
    
    def get_document_info(self, doc_id):
        """
        获取文档信息
        """
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM documents WHERE id = ?', (doc_id,))
        doc = cursor.fetchone()
        conn.close()
        
        if doc:
            return dict(doc)
        return None
