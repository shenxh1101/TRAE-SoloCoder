from datetime import datetime
from config import DEPARTMENT_GROUPS, SUBSCRIPTION_TAGS
from models import get_connection
from utils import create_notification, create_audit_log, send_wecom_notification, format_datetime

class PublishManager:
    def __init__(self):
        pass
    
    def publish_document(self, document_id):
        """
        审核通过后自动发布文档
        """
        conn = get_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM documents WHERE id = ?', (document_id,))
        doc = cursor.fetchone()
        
        if not doc:
            conn.close()
            return {'success': False, 'error': '文档不存在'}
        
        if doc['status'] not in ['approved', 'pending_review', 'pending_second_review']:
            conn.close()
            return {'success': False, 'error': f'文档状态 {doc["status"]} 不可发布'}
        
        cursor.execute('''
            UPDATE documents 
            SET status = 'published', published_at = ?, updated_at = ?
            WHERE id = ?
        ''', (
            datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            document_id
        ))
        
        create_audit_log(
            document_id, 'publish',
            'system', '系统',
            f"文档自动发布: {doc['title']}"
        )
        
        push_result = self._push_to_department_groups(doc)
        
        self._notify_subscribers(doc)
        
        conn.commit()
        conn.close()
        
        return {
            'success': True,
            'document_id': document_id,
            'title': doc['title'],
            'push_result': push_result,
            'message': '文档发布成功'
        }
    
    def _push_to_department_groups(self, doc):
        """
        按订阅标签推送到部门群
        """
        tags = doc['subscription_tags'].split(',') if doc['subscription_tags'] else []
        pushed_groups = []
        
        for tag in tags:
            departments = SUBSCRIPTION_TAGS.get(tag.strip(), [])
            for dept in departments:
                group_key = DEPARTMENT_GROUPS.get(dept)
                if group_key and group_key not in pushed_groups:
                    pushed_groups.append(group_key)
                    
                    title = f"新文档发布: {doc['title']}"
                    content = f"""
**文档类型:** {doc['doc_type']}
**发布人:** {doc['author_name']}
**发布时间:** {format_datetime(datetime.now().strftime('%Y-%m-%d %H:%M:%S'))}
**标签:** {doc['subscription_tags'] or '无'}

请相关人员查阅。
                    """
                    
                    send_wecom_notification(group_key, title, content)
                    print(f"[推送] 已推送到 {dept} 群")
        
        return pushed_groups
    
    def _notify_subscribers(self, doc):
        """
        通知订阅用户
        """
        conn = get_connection()
        cursor = conn.cursor()
        
        doc_tags = set([t.strip() for t in doc['subscription_tags'].split(',') if t.strip()]) if doc['subscription_tags'] else set()
        
        cursor.execute('SELECT * FROM subscribers WHERE is_active = 1')
        subscribers = cursor.fetchall()
        
        notified_count = 0
        
        for sub in subscribers:
            sub_tags = set([t.strip() for t in sub['subscription_tags'].split(',') if t.strip()]) if sub['subscription_tags'] else set()
            
            if doc_tags & sub_tags:
                title = f"订阅更新: 新文档发布"
                content = f"""
                <p>您订阅的标签有新文档发布。</p>
                <p><strong>文档标题:</strong> {doc['title']}</p>
                <p><strong>文档类型:</strong> {doc['doc_type']}</p>
                <p><strong>发布人:</strong> {doc['author_name']}</p>
                <p><strong>匹配标签:</strong> {', '.join(doc_tags & sub_tags)}</p>
                """
                
                create_notification(
                    'subscriber', sub['user_id'], 'subscription_update',
                    title, content, doc['id']
                )
                notified_count += 1
        
        conn.close()
        print(f"[通知] 已通知 {notified_count} 位订阅用户")
        return notified_count
    
    def get_published_documents(self, department=None, tag=None):
        """
        获取已发布文档列表
        """
        conn = get_connection()
        cursor = conn.cursor()
        
        query = '''
            SELECT * FROM documents 
            WHERE status = 'published'
        '''
        params = []
        
        if department:
            query += ' AND department = ?'
            params.append(department)
        
        if tag:
            query += ' AND subscription_tags LIKE ?'
            params.append(f'%{tag}%')
        
        query += ' ORDER BY published_at DESC'
        
        cursor.execute(query, params)
        docs = [dict(row) for row in cursor.fetchall()]
        
        conn.close()
        return docs
    
    def add_subscriber(self, user_id, user_name, user_email, department, subscription_tags):
        """
        添加订阅用户
        """
        conn = get_connection()
        cursor = conn.cursor()
        
        tags_str = ','.join(subscription_tags) if subscription_tags else ''
        
        cursor.execute('''
            INSERT INTO subscribers (
                user_id, user_name, user_email, department,
                subscription_tags, created_at, is_active
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            user_id, user_name, user_email, department, tags_str,
            datetime.now().strftime('%Y-%m-%d %H:%M:%S'), 1
        ))
        
        sub_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return {
            'success': True,
            'subscriber_id': sub_id,
            'message': '订阅成功'
        }
    
    def update_subscription(self, user_id, subscription_tags):
        """
        更新用户订阅
        """
        conn = get_connection()
        cursor = conn.cursor()
        
        tags_str = ','.join(subscription_tags) if subscription_tags else ''
        
        cursor.execute('''
            UPDATE subscribers 
            SET subscription_tags = ?
            WHERE user_id = ?
        ''', (tags_str, user_id))
        
        conn.commit()
        conn.close()
        
        return {
            'success': True,
            'message': '订阅更新成功'
        }
