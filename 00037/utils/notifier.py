import sys
import os
import json
from datetime import datetime
from tabulate import tabulate

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config.settings import NOTIFICATION_CONFIG, LOGS_DIR
from models import SessionLocal, OperationLog


class Notifier:
    def __init__(self):
        self.notifications = []
        self.log_file = os.path.join(LOGS_DIR, 'notifications.log')

    def send_approval_notification(self, order, approvers, level):
        message = {
            'type': 'approval_request',
            'order_number': order.order_number,
            'customer_name': order.customer.name if order.customer else '未知客户',
            'order_amount': order.total_amount,
            'approval_level': level,
            'approvers': approvers,
            'message': f'订单【{order.order_number}】金额¥{order.total_amount:,.2f}超出信用额度，需{level}级审批',
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }
        self._send(message)
        return message

    def send_collection_notification(self, customer, receivable, actions, priority, assigned_to_sales, assigned_to_finance):
        message = {
            'type': 'collection_task',
            'customer_name': customer.name,
            'invoice_number': receivable.invoice_number,
            'remaining_amount': receivable.remaining_amount,
            'days_overdue': receivable.days_overdue,
            'priority': priority,
            'actions': actions,
            'assigned_to_sales': assigned_to_sales,
            'assigned_to_finance': assigned_to_finance,
            'message': f'客户【{customer.name}】应收账款逾期{receivable.days_overdue}天，金额¥{receivable.remaining_amount:,.2f}',
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }
        self._send(message)
        return message

    def send_credit_adjustment_notification(self, customer, old_level, new_level, old_limit, new_limit, reason):
        message = {
            'type': 'credit_adjustment',
            'customer_name': customer.name,
            'old_credit_level': old_level,
            'new_credit_level': new_level,
            'old_credit_limit': old_limit,
            'new_credit_limit': new_limit,
            'change_reason': reason,
            'message': f'客户【{customer.name}】信用等级由{old_level}调整为{new_level}，额度由¥{old_limit:,.2f}调整为¥{new_limit:,.2f}',
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }
        self._send(message)
        return message

    def send_report_notification(self, report_path, report_month, statistics):
        message = {
            'type': 'monthly_report',
            'report_month': report_month,
            'report_path': report_path,
            'statistics': statistics,
            'message': f'{report_month}月度信用风险报告已生成',
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }
        self._send(message)
        return message

    def _send(self, message):
        self.notifications.append(message)

        if NOTIFICATION_CONFIG.get('push_notification_enabled', True):
            self._push_notification(message)

        self._log_to_file(message)

    def _push_notification(self, message):
        print(f"\n{'='*60}")
        print(f"【{message['type'].upper()}】{message['message']}")
        print(f"时间: {message['timestamp']}")
        if message['type'] == 'approval_request':
            print(f"审批人: {', '.join(message['approvers'])}")
        elif message['type'] == 'collection_task':
            print(f"优先级: {message['priority']}")
            print(f"应执行措施: {', '.join(message['actions'])}")
            print(f"销售负责人: {message['assigned_to_sales']}")
            print(f"财务负责人: {message['assigned_to_finance']}")
        elif message['type'] == 'credit_adjustment':
            print(f"调整原因: {message['change_reason']}")
        elif message['type'] == 'monthly_report':
            print(f"报告路径: {message['report_path']}")
        print('='*60 + '\n')

    def _log_to_file(self, message):
        os.makedirs(os.path.dirname(self.log_file), exist_ok=True)
        with open(self.log_file, 'a', encoding='utf-8') as f:
            f.write(json.dumps(message, ensure_ascii=False) + '\n')

    def get_pending_notifications(self):
        return self.notifications


class OperationLogger:
    def __init__(self):
        pass

    def log_operation(self, operation_type, customer_id=None, customer_name=None,
                      credit_level=None, order_id=None, operation_details=None,
                      operator='system', ip_address=None):
        db = SessionLocal()
        try:
            log = OperationLog(
                operation_type=operation_type,
                customer_id=customer_id,
                customer_name=customer_name,
                credit_level=credit_level,
                order_id=order_id,
                operation_details=operation_details,
                operator=operator,
                ip_address=ip_address
            )
            db.add(log)
            db.commit()
            db.refresh(log)
            return log
        except Exception as e:
            db.rollback()
            raise e
        finally:
            db.close()

    def log_credit_adjustment(self, customer, old_score, new_score, old_level, new_level,
                              old_limit, new_limit, reason, operator='system'):
        details = (f"信用评分: {old_score:.2f} -> {new_score:.2f}, "
                   f"信用等级: {old_level} -> {new_level}, "
                   f"信用额度: ¥{old_limit:,.2f} -> ¥{new_limit:,.2f}, "
                   f"调整原因: {reason}")
        return self.log_operation(
            operation_type='credit_adjustment',
            customer_id=customer.id,
            customer_name=customer.name,
            credit_level=new_level,
            operation_details=details,
            operator=operator
        )

    def log_order_approval(self, order, customer, approval_level, approvers, operator='system'):
        details = (f"订单金额: ¥{order.total_amount:,.2f}, "
                   f"信用额度: ¥{order.credit_limit_at_time:,.2f}, "
                   f"可用额度: ¥{order.available_credit_at_time:,.2f}, "
                   f"超出额度: ¥{max(0, order.total_amount - order.available_credit_at_time):,.2f}, "
                   f"审批等级: {approval_level}级, "
                   f"审批人: {', '.join(approvers)}")
        return self.log_operation(
            operation_type='order_approval',
            customer_id=customer.id,
            customer_name=customer.name,
            credit_level=customer.credit_level,
            order_id=order.id,
            operation_details=details,
            operator=operator
        )

    def log_collection_task(self, task, customer, receivable, actions, operator='system'):
        details = (f"发票编号: {receivable.invoice_number}, "
                   f"逾期金额: ¥{receivable.remaining_amount:,.2f}, "
                   f"逾期天数: {receivable.days_overdue}天, "
                   f"优先级: {task.priority}, "
                   f"应执行措施: {', '.join(actions)}, "
                   f"销售负责人: {task.assigned_to_sales}, "
                   f"财务负责人: {task.assigned_to_finance}")
        return self.log_operation(
            operation_type='collection_task',
            customer_id=customer.id,
            customer_name=customer.name,
            credit_level=customer.credit_level,
            operation_details=details,
            operator=operator
        )

    def log_financial_report_upload(self, customer, financial_record, operator='system'):
        def fmt_pct(val):
            return f"{val*100:.2f}%" if val is not None else "N/A"
        def fmt_num(val):
            return f"{val:.2f}" if val is not None else "N/A"

        details = (f"报告期: {financial_record.report_period}, "
                   f"资产负债率: {fmt_pct(financial_record.asset_liability_ratio)}, "
                   f"流动比率: {fmt_num(financial_record.current_ratio)}, "
                   f"速动比率: {fmt_num(financial_record.quick_ratio)}, "
                   f"现金流比率: {fmt_num(financial_record.cash_flow_ratio)}, "
                   f"财务健康评分: {fmt_num(financial_record.financial_health_score)}")
        return self.log_operation(
            operation_type='financial_report_upload',
            customer_id=customer.id,
            customer_name=customer.name,
            credit_level=customer.credit_level,
            operation_details=details,
            operator=operator
        )

    def log_monthly_report(self, report_month, statistics, report_path, operator='system'):
        details = (f"报告期: {report_month}, "
                   f"客户总数: {statistics.get('total_customers', 0)}, "
                   f"坏账率: {statistics.get('bad_debt_rate', 0)*100:.2f}%, "
                   f"超限比例: {statistics.get('over_limit_ratio', 0)*100:.2f}%, "
                   f"报告路径: {report_path}")
        return self.log_operation(
            operation_type='monthly_report',
            operation_details=details,
            operator=operator
        )

    def close(self):
        pass


notifier = Notifier()
logger = OperationLogger()
