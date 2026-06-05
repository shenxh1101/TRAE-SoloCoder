from datetime import datetime, timedelta
from config import (
    DOCUMENT_TYPE_REVIEWERS, SUPERIOR_HIERARCHY,
    REVIEW_TIMEOUT_HOURS
)
from models import get_connection
from utils import create_notification, create_audit_log, format_datetime, get_time_diff_hours

class ReviewManager:
    def __init__(self):
        pass
    
    def assign_reviewer(self, document_id):
        """
        按文档类型自动分配审核人
        """
        conn = get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, title, doc_type, author_name, author_email, is_confidential
            FROM documents WHERE id = ?
        ''', (document_id,))
        doc = cursor.fetchone()
        
        if not doc:
            conn.close()
            return {'success': False, 'error': '文档不存在'}
        
        doc_type = doc['doc_type']
        is_confidential = doc['is_confidential']
        
        reviewers = DOCUMENT_TYPE_REVIEWERS.get(doc_type, ['default_reviewer@company.com'])
        
        if is_confidential:
            review_level = 2
            primary_reviewer_email = reviewers[1] if len(reviewers) > 1 else reviewers[0]
        else:
            review_level = 1
            primary_reviewer_email = reviewers[0]
        
        reviewer_info = self._get_reviewer_info(primary_reviewer_email)
        
        cursor.execute('''
            INSERT INTO reviews (
                document_id, reviewer_id, reviewer_name, reviewer_email,
                review_level, status, assigned_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            document_id, reviewer_info['id'], reviewer_info['name'],
            reviewer_info['email'], review_level, 'pending',
            datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        ))
        
        review_id = cursor.lastrowid
        
        conn.commit()
        conn.close()
        
        self._send_review_notification(review_id, dict(doc), reviewer_info, review_level)
        
        return {
            'success': True,
            'review_id': review_id,
            'reviewer': reviewer_info,
            'review_level': review_level,
            'message': f'已分配审核人: {reviewer_info["name"]}'
        }
    
    def _get_reviewer_info(self, email):
        """
        获取审核人信息（模拟数据，实际应从用户系统获取）
        """
        name_map = {
            'tech_lead@company.com': {'id': 'tech_lead_001', 'name': '技术主管', 'email': 'tech_lead@company.com'},
            'cto@company.com': {'id': 'cto_001', 'name': '技术总监', 'email': 'cto@company.com'},
            'finance_manager@company.com': {'id': 'finance_001', 'name': '财务主管', 'email': 'finance_manager@company.com'},
            'cfo@company.com': {'id': 'cfo_001', 'name': '财务总监', 'email': 'cfo@company.com'},
            'hr_manager@company.com': {'id': 'hr_001', 'name': '人事主管', 'email': 'hr_manager@company.com'},
            'hr_director@company.com': {'id': 'hr_dir_001', 'name': '人事总监', 'email': 'hr_director@company.com'},
            'marketing_manager@company.com': {'id': 'marketing_001', 'name': '市场主管', 'email': 'marketing_manager@company.com'},
            'cmo@company.com': {'id': 'cmo_001', 'name': '市场总监', 'email': 'cmo@company.com'},
            'legal_counsel@company.com': {'id': 'legal_001', 'name': '法务顾问', 'email': 'legal_counsel@company.com'},
            'chief_legal@company.com': {'id': 'chief_legal_001', 'name': '法务总监', 'email': 'chief_legal@company.com'},
            'admin_manager@company.com': {'id': 'admin_001', 'name': '行政主管', 'email': 'admin_manager@company.com'},
            'coo@company.com': {'id': 'coo_001', 'name': '运营总监', 'email': 'coo@company.com'},
            'default_reviewer@company.com': {'id': 'default_001', 'name': '系统管理员', 'email': 'default_reviewer@company.com'}
        }
        return name_map.get(email, {'id': 'unknown', 'name': '未知审核人', 'email': email})
    
    def _send_review_notification(self, review_id, doc, reviewer_info, review_level):
        """
        发送审核通知
        """
        level_text = "二级" if review_level == 2 else "一级"
        title = f"文档审核通知 - {level_text}审核"
        content = f"""
        <p>您有一份新的文档需要审核。</p>
        <p><strong>文档标题:</strong> {doc['title']}</p>
        <p><strong>文档类型:</strong> {doc['doc_type']}</p>
        <p><strong>提交人:</strong> {doc['author_name']}</p>
        <p><strong>审核级别:</strong> {level_text}</p>
        <p><strong>分配时间:</strong> {format_datetime(datetime.now().strftime('%Y-%m-%d %H:%M:%S'))}</p>
        <p>请在 {REVIEW_TIMEOUT_HOURS} 小时内完成审核，超时将自动升级给上级。</p>
        """
        
        create_notification(
            'reviewer', reviewer_info['id'], 'review_assigned',
            title, content, doc['id'], review_id
        )
        
        print(f"[通知] 已发送审核通知给 {reviewer_info['name']}")
    
    def process_review(self, review_id, reviewer_id, status, comments=""):
        """
        处理审核结果
        """
        if status not in ['approved', 'rejected']:
            return {'success': False, 'error': '无效的审核状态'}
        
        conn = get_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM reviews WHERE id = ?', (review_id,))
        review = cursor.fetchone()
        
        if not review:
            conn.close()
            return {'success': False, 'error': '审核记录不存在'}
        
        if review['reviewer_id'] != reviewer_id:
            conn.close()
            return {'success': False, 'error': '无权审核此文档'}
        
        if review['status'] != 'pending':
            conn.close()
            return {'success': False, 'error': '此审核已处理'}
        
        cursor.execute('''
            UPDATE reviews 
            SET status = ?, reviewed_at = ?, comments = ?
            WHERE id = ?
        ''', (
            status, datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            comments, review_id
        ))
        
        cursor.execute('SELECT * FROM documents WHERE id = ?', (review['document_id'],))
        doc = cursor.fetchone()
        
        doc_dict = dict(doc) if doc else None
        need_second_level = status == 'approved' and doc and review['review_level'] == 1 and doc['is_confidential']
        
        if status == 'approved':
            if not need_second_level:
                doc_status = 'published'
                cursor.execute('''
                    UPDATE documents 
                    SET status = ?, published_at = ?, updated_at = ?
                    WHERE id = ?
                ''', (
                    doc_status, datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                    datetime.now().strftime('%Y-%m-%d %H:%M:%S'), doc['id']
                ))
            else:
                doc_status = 'pending_second_review'
        else:
            doc_status = 'rejected'
            cursor.execute('''
                UPDATE documents 
                SET status = ?, updated_at = ?
                WHERE id = ?
            ''', (
                doc_status, datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                doc['id']
            ))
        
        conn.commit()
        conn.close()
        
        create_audit_log(
            doc_dict['id'], f'review_{status}',
            reviewer_id, self._get_reviewer_info(review['reviewer_email'])['name'],
            f"审核结果: {status}, 备注: {comments}"
        )
        
        self._notify_author_review_result(doc_dict, status, comments)
        
        if need_second_level:
            self._assign_second_level_review(doc_dict['id'], doc_dict)
        
        return {
            'success': True,
            'document_id': doc_dict['id'],
            'document_status': doc_status,
            'message': f'审核完成，文档状态: {doc_status}'
        }
    
    def _assign_second_level_review(self, document_id, doc):
        """
        分配二级审核
        """
        conn = get_connection()
        cursor = conn.cursor()
        
        reviewers = DOCUMENT_TYPE_REVIEWERS.get(doc['doc_type'], ['default_reviewer@company.com'])
        reviewer_email = reviewers[1] if len(reviewers) > 1 else reviewers[0]
        reviewer_info = self._get_reviewer_info(reviewer_email)
        
        cursor.execute('''
            INSERT INTO reviews (
                document_id, reviewer_id, reviewer_name, reviewer_email,
                review_level, status, assigned_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            document_id, reviewer_info['id'], reviewer_info['name'],
            reviewer_info['email'], 2, 'pending',
            datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        ))
        
        review_id = cursor.lastrowid
        
        conn.commit()
        conn.close()
        
        self._send_review_notification(review_id, doc, reviewer_info, 2)
    
    def _notify_author_review_result(self, doc, status, comments):
        """
        通知作者审核结果
        """
        status_text = "通过" if status == 'approved' else "拒绝"
        title = f"文档审核结果通知 - {status_text}"
        content = f"""
        <p>您的文档审核结果如下:</p>
        <p><strong>文档标题:</strong> {doc['title']}</p>
        <p><strong>审核结果:</strong> {status_text}</p>
        <p><strong>审核意见:</strong> {comments or '无'}</p>
        <p><strong>审核时间:</strong> {format_datetime(datetime.now().strftime('%Y-%m-%d %H:%M:%S'))}</p>
        """
        
        create_notification(
            'author', doc['author_id'], 'review_result',
            title, content, doc['id']
        )
        
        print(f"[通知] 已通知作者 {doc['author_name']} 审核结果")
    
    def check_timeout_reviews(self):
        """
        检查超时未处理的审核，自动升级给上级
        """
        conn = get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT r.*, d.title, d.doc_type, d.author_name
            FROM reviews r
            JOIN documents d ON r.document_id = d.id
            WHERE r.status = 'pending' AND r.is_escalated = 0
        ''')
        
        pending_reviews = cursor.fetchall()
        escalated_count = 0
        
        for review in pending_reviews:
            hours_diff = get_time_diff_hours(review['assigned_at'])
            
            if hours_diff >= REVIEW_TIMEOUT_HOURS:
                self._escalate_review(review, conn, cursor)
                escalated_count += 1
        
        conn.commit()
        conn.close()
        
        return {
            'success': True,
            'checked_count': len(pending_reviews),
            'escalated_count': escalated_count,
            'message': f'检查了 {len(pending_reviews)} 个待审核，升级了 {escalated_count} 个'
        }
    
    def _escalate_review(self, review, conn, cursor):
        """
        升级审核给上级
        """
        current_reviewer_email = review['reviewer_email']
        superior_email = SUPERIOR_HIERARCHY.get(current_reviewer_email)
        
        if not superior_email:
            print(f"[警告] 未找到 {current_reviewer_email} 的上级")
            return
        
        superior_info = self._get_reviewer_info(superior_email)
        
        cursor.execute('''
            UPDATE reviews 
            SET is_escalated = 1, escalated_at = ?, escalation_reason = ?
            WHERE id = ?
        ''', (
            datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            f'超过 {REVIEW_TIMEOUT_HOURS} 小时未处理，自动升级',
            review['id']
        ))
        
        cursor.execute('''
            INSERT INTO reviews (
                document_id, reviewer_id, reviewer_name, reviewer_email,
                review_level, status, assigned_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            review['document_id'], superior_info['id'], superior_info['name'],
            superior_info['email'], review['review_level'] + 1, 'pending',
            datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        ))
        
        self._send_escalation_notification(review, superior_info)
        
        print(f"[升级] 审核 {review['id']} 已升级给 {superior_info['name']}")
    
    def _send_escalation_notification(self, review, superior_info):
        """
        发送升级通知
        """
        title = "审核升级通知"
        content = f"""
        <p>一份文档审核已超时升级给您处理。</p>
        <p><strong>文档标题:</strong> {review['title']}</p>
        <p><strong>原审核人:</strong> {review['reviewer_name']}</p>
        <p><strong>超时时间:</strong> {REVIEW_TIMEOUT_HOURS} 小时</p>
        <p><strong>分配时间:</strong> {format_datetime(review['assigned_at'])}</p>
        <p>请您及时处理。</p>
        """
        
        create_notification(
            'reviewer', superior_info['id'], 'review_escalated',
            title, content, review['document_id']
        )
        
        print(f"[通知] 已发送升级通知给 {superior_info['name']}")
    
    def send_reminder(self, review_id):
        """
        发送催办通知
        """
        conn = get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT r.*, d.title, d.doc_type
            FROM reviews r
            JOIN documents d ON r.document_id = d.id
            WHERE r.id = ?
        ''', (review_id,))
        review = cursor.fetchone()
        
        if not review:
            conn.close()
            return {'success': False, 'error': '审核记录不存在'}
        
        hours_diff = get_time_diff_hours(review['assigned_at'])
        
        title = "审核催办提醒"
        content = f"""
        <p>请尽快处理以下文档审核:</p>
        <p><strong>文档标题:</strong> {review['title']}</p>
        <p><strong>已等待:</strong> {hours_diff:.1f} 小时</p>
        <p><strong>剩余时间:</strong> {max(0, REVIEW_TIMEOUT_HOURS - hours_diff):.1f} 小时</p>
        <p>若超时未处理，审核将自动升级给上级。</p>
        """
        
        create_notification(
            'reviewer', review['reviewer_id'], 'review_reminder',
            title, content, review['document_id'], review_id
        )
        
        conn.close()
        
        return {
            'success': True,
            'message': f'已发送催办通知给 {review["reviewer_name"]}'
        }
    
    def get_pending_reviews(self, reviewer_id=None):
        """
        获取待审核列表
        """
        conn = get_connection()
        cursor = conn.cursor()
        
        if reviewer_id:
            cursor.execute('''
                SELECT r.*, d.title, d.doc_type, d.author_name, d.author_email
                FROM reviews r
                JOIN documents d ON r.document_id = d.id
                WHERE r.reviewer_id = ? AND r.status = 'pending'
                ORDER BY r.assigned_at DESC
            ''', (reviewer_id,))
        else:
            cursor.execute('''
                SELECT r.*, d.title, d.doc_type, d.author_name, d.author_email
                FROM reviews r
                JOIN documents d ON r.document_id = d.id
                WHERE r.status = 'pending'
                ORDER BY r.assigned_at DESC
            ''')
        
        reviews = [dict(row) for row in cursor.fetchall()]
        conn.close()
        
        return reviews
