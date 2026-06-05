import os
import shutil
from datetime import datetime, timedelta
from config import EXPIRY_REMINDER_DAYS
from models import get_connection
from utils import create_notification, create_audit_log, format_datetime, increment_version

class LifecycleManager:
    def __init__(self, upload_dir='uploads'):
        self.upload_dir = upload_dir
        os.makedirs(upload_dir, exist_ok=True)
    
    def scan_expiring_documents(self):
        """
        每天扫描即将过期文档，提前30天提醒作者更新
        """
        conn = get_connection()
        cursor = conn.cursor()
        
        reminder_date = (datetime.now() + timedelta(days=EXPIRY_REMINDER_DAYS)).strftime('%Y-%m-%d')
        
        cursor.execute('''
            SELECT d.*, 
                   julianday(expiry_date) - julianday('now') as days_left
            FROM documents d
            WHERE status = 'published'
              AND expiry_date <= ?
              AND expiry_date > datetime('now')
            ORDER BY expiry_date ASC
        ''', (reminder_date + ' 23:59:59',))
        
        expiring_docs = cursor.fetchall()
        reminded_count = 0
        
        for doc in expiring_docs:
            days_left = int(doc['days_left'])
            
            if days_left <= EXPIRY_REMINDER_DAYS:
                self._send_expiry_reminder(doc, days_left)
                reminded_count += 1
        
        conn.close()
        
        return {
            'success': True,
            'expiring_count': len(expiring_docs),
            'reminded_count': reminded_count,
            'message': f'扫描到 {len(expiring_docs)} 个即将过期文档，已提醒 {reminded_count} 位作者'
        }
    
    def _send_expiry_reminder(self, doc, days_left):
        """
        发送过期提醒给作者
        """
        title = f"文档过期提醒 - 剩余 {days_left} 天"
        content = f"""
        <p>您的文档即将过期，请及时更新。</p>
        <p><strong>文档标题:</strong> {doc['title']}</p>
        <p><strong>文档类型:</strong> {doc['doc_type']}</p>
        <p><strong>当前版本:</strong> {doc['version']}</p>
        <p><strong>过期日期:</strong> {format_datetime(doc['expiry_date'])}</p>
        <p><strong>剩余天数:</strong> {days_left} 天</p>
        <p>请尽快登录系统更新文档，过期后将自动下架。</p>
        """
        
        create_notification(
            'author', doc['author_id'], 'expiry_reminder',
            title, content, doc['id']
        )
        
        print(f"[提醒] 文档 '{doc['title']}' 剩余 {days_left} 天过期，已提醒作者 {doc['author_name']}")
    
    def take_down_expired_documents(self):
        """
        过期未更新自动下架并通知读者
        """
        conn = get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT * FROM documents 
            WHERE status = 'published' 
              AND expiry_date <= datetime('now')
        ''')
        
        expired_docs = cursor.fetchall()
        taken_down_count = 0
        
        for doc in expired_docs:
            self._take_down_document(doc, conn, cursor)
            taken_down_count += 1
        
        conn.commit()
        conn.close()
        
        return {
            'success': True,
            'expired_count': len(expired_docs),
            'taken_down_count': taken_down_count,
            'message': f'扫描到 {len(expired_docs)} 个过期文档，已下架 {taken_down_count} 个'
        }
    
    def _take_down_document(self, doc, conn, cursor):
        """
        下架过期文档
        """
        cursor.execute('''
            UPDATE documents 
            SET status = 'expired', updated_at = ?
            WHERE id = ?
        ''', (
            datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            doc['id']
        ))
        
        self._notify_readers_document_expired(doc)
        
        create_audit_log(
            doc['id'], 'expire',
            'system', '系统',
            f"文档过期自动下架: {doc['title']}"
        )
        
        print(f"[下架] 文档 '{doc['title']}' 已过期下架")
    
    def _notify_readers_document_expired(self, doc):
        """
        通知读者文档已过期
        """
        conn = get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT DISTINCT reader_id, reader_name, reader_email
            FROM document_readers
            WHERE document_id = ?
        ''', (doc['id'],))
        
        readers = cursor.fetchall()
        
        for reader in readers:
            title = f"文档过期通知"
            content = f"""
            <p>您之前阅读的文档已过期下架。</p>
            <p><strong>文档标题:</strong> {doc['title']}</p>
            <p><strong>文档作者:</strong> {doc['author_name']}</p>
            <p><strong>过期日期:</strong> {format_datetime(doc['expiry_date'])}</p>
            <p>如需继续使用，请联系作者更新文档。</p>
            """
            
            create_notification(
                'reader', reader['reader_id'], 'document_expired',
                title, content, doc['id']
            )
        
        conn.close()
        print(f"[通知] 已通知 {len(readers)} 位读者文档过期")
    
    def revise_document(self, document_id, new_file_path, author_info, change_log=""):
        """
        修订文档，自动校验版本号并保留历史
        """
        conn = get_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM documents WHERE id = ?', (document_id,))
        old_doc = cursor.fetchone()
        
        if not old_doc:
            conn.close()
            return {'success': False, 'error': '文档不存在'}
        
        if old_doc['author_id'] != author_info['id']:
            conn.close()
            return {'success': False, 'error': '无权修订此文档'}
        
        new_version = increment_version(old_doc['version'])
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        _, ext = os.path.splitext(new_file_path)
        new_filename = f"{author_info['id']}_{timestamp}{ext}"
        new_saved_path = os.path.join(self.upload_dir, new_filename)
        shutil.copy2(new_file_path, new_saved_path)
        
        cursor.execute('''
            INSERT INTO document_history (
                document_id, version, file_path, change_log,
                created_by, created_at
            ) VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            document_id, old_doc['version'], old_doc['file_path'],
            change_log or '文档修订',
            author_info['id'], datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        ))
        
        cursor.execute('''
            UPDATE documents 
            SET file_path = ?, version = ?, status = 'pending_review',
                updated_at = ?
            WHERE id = ?
        ''', (
            new_saved_path, new_version,
            datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            document_id
        ))
        
        create_audit_log(
            document_id, 'revise',
            author_info['id'], author_info['name'],
            f"修订文档: {old_doc['title']}, 新版本: {new_version}, 修改日志: {change_log}"
        )
        
        conn.commit()
        conn.close()
        
        return {
            'success': True,
            'document_id': document_id,
            'old_version': old_doc['version'],
            'new_version': new_version,
            'status': 'pending_review',
            'message': f'文档修订成功，新版本 {new_version} 已提交审核'
        }
    
    def withdraw_document(self, document_id, operator_info, reason=""):
        """
        撤回已发布的文档
        """
        conn = get_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM documents WHERE id = ?', (document_id,))
        doc = cursor.fetchone()
        
        if not doc:
            conn.close()
            return {'success': False, 'error': '文档不存在'}
        
        if doc['author_id'] != operator_info['id'] and not operator_info.get('is_admin'):
            conn.close()
            return {'success': False, 'error': '无权撤回此文档'}
        
        if doc['status'] not in ['published', 'pending_review', 'pending_second_review']:
            conn.close()
            return {'success': False, 'error': f'文档状态 {doc["status"]} 不可撤回'}
        
        cursor.execute('''
            UPDATE documents 
            SET status = 'withdrawn', withdrawn_at = ?, updated_at = ?
            WHERE id = ?
        ''', (
            datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            document_id
        ))
        
        create_audit_log(
            document_id, 'withdraw',
            operator_info['id'], operator_info['name'],
            f"撤回文档: {doc['title']}, 原因: {reason}"
        )
        
        self._notify_readers_document_withdrawn(doc, reason)
        
        conn.commit()
        conn.close()
        
        return {
            'success': True,
            'document_id': document_id,
            'title': doc['title'],
            'message': '文档撤回成功'
        }
    
    def _notify_readers_document_withdrawn(self, doc, reason):
        """
        通知读者文档已撤回
        """
        conn = get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT DISTINCT reader_id, reader_name, reader_email
            FROM document_readers
            WHERE document_id = ?
        ''', (doc['id'],))
        
        readers = cursor.fetchall()
        
        for reader in readers:
            title = f"文档撤回通知"
            content = f"""
            <p>您之前阅读的文档已被撤回。</p>
            <p><strong>文档标题:</strong> {doc['title']}</p>
            <p><strong>文档作者:</strong> {doc['author_name']}</p>
            <p><strong>撤回原因:</strong> {reason or '未说明'}</p>
            <p><strong>撤回时间:</strong> {format_datetime(datetime.now().strftime('%Y-%m-%d %H:%M:%S'))}</p>
            """
            
            create_notification(
                'reader', reader['reader_id'], 'document_withdrawn',
                title, content, doc['id']
            )
        
        conn.close()
        print(f"[通知] 已通知 {len(readers)} 位读者文档撤回")
    
    def get_document_history(self, document_id):
        """
        获取文档历史版本
        """
        conn = get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT * FROM document_history 
            WHERE document_id = ?
            ORDER BY created_at DESC
        ''', (document_id,))
        
        history = [dict(row) for row in cursor.fetchall()]
        
        cursor.execute('SELECT * FROM documents WHERE id = ?', (document_id,))
        current = cursor.fetchone()
        if current:
            history.insert(0, dict(current))
        
        conn.close()
        return history
    
    def record_document_read(self, document_id, reader_info):
        """
        记录文档阅读
        """
        conn = get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO document_readers (
                document_id, reader_id, reader_name, reader_email, read_at
            ) VALUES (?, ?, ?, ?, ?)
        ''', (
            document_id, reader_info['id'], reader_info['name'],
            reader_info['email'], datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        ))
        
        cursor.execute('''
            UPDATE documents 
            SET view_count = view_count + 1
            WHERE id = ?
        ''', (document_id,))
        
        conn.commit()
        conn.close()
        
        return {'success': True, 'message': '阅读记录已保存'}
    
    def extend_expiry_date(self, document_id, operator_info, days=365):
        """
        延长文档过期时间
        """
        conn = get_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM documents WHERE id = ?', (document_id,))
        doc = cursor.fetchone()
        
        if not doc:
            conn.close()
            return {'success': False, 'error': '文档不存在'}
        
        if doc['author_id'] != operator_info['id'] and not operator_info.get('is_admin'):
            conn.close()
            return {'success': False, 'error': '无权操作此文档'}
        
        if doc['expiry_date']:
            current_expiry = datetime.strptime(doc['expiry_date'], '%Y-%m-%d %H:%M:%S')
        else:
            current_expiry = datetime.now()
        
        new_expiry = max(current_expiry, datetime.now()) + timedelta(days=days)
        
        cursor.execute('''
            UPDATE documents 
            SET expiry_date = ?, updated_at = ?
            WHERE id = ?
        ''', (
            new_expiry.strftime('%Y-%m-%d %H:%M:%S'),
            datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            document_id
        ))
        
        create_audit_log(
            document_id, 'extend_expiry',
            operator_info['id'], operator_info['name'],
            f"延长文档过期时间: {doc['title']}, 新过期时间: {new_expiry.strftime('%Y-%m-%d')}"
        )
        
        conn.commit()
        conn.close()
        
        return {
            'success': True,
            'document_id': document_id,
            'new_expiry_date': new_expiry.strftime('%Y-%m-%d %H:%M:%S'),
            'message': f'文档过期时间已延长至 {new_expiry.strftime("%Y-%m-%d")}'
        }
