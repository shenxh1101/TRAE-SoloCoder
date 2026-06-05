import sys
import os
from datetime import datetime, date, timedelta
from collections import defaultdict

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from models import SessionLocal, Customer, Receivable, CollectionTask
from config.settings import COLLECTION_STRATEGIES
from utils import days_between, generate_invoice_number, notifier, logger, credit_level_order


class ReceivableManager:
    def __init__(self):
        self.db = SessionLocal()

    def create_receivable(self, customer_id, total_amount, invoice_date=None,
                          due_date=None, invoice_number=None, paid_amount=0):
        customer = self.db.query(Customer).filter(Customer.id == customer_id).first()
        if not customer:
            raise ValueError(f"客户ID {customer_id} 不存在")

        invoice_date = invoice_date or date.today()
        due_date = due_date or (invoice_date + timedelta(days=30))
        invoice_number = invoice_number or generate_invoice_number()

        days_overdue = max(0, days_between(due_date, date.today()))
        remaining_amount = total_amount - paid_amount

        if days_overdue > 0:
            status = 'overdue'
        elif remaining_amount > 0:
            status = 'normal'
        else:
            status = 'paid'

        receivable = Receivable(
            customer_id=customer_id,
            invoice_number=invoice_number,
            invoice_date=invoice_date,
            due_date=due_date,
            total_amount=total_amount,
            paid_amount=paid_amount,
            remaining_amount=remaining_amount,
            days_overdue=days_overdue,
            status=status
        )
        self.db.add(receivable)
        self.db.commit()
        self.db.refresh(receivable)

        return receivable

    def record_payment(self, receivable_id, amount, payment_date=None):
        receivable = self.db.query(Receivable).filter(Receivable.id == receivable_id).first()
        if not receivable:
            raise ValueError(f"应收账款ID {receivable_id} 不存在")

        payment_date = payment_date or date.today()
        receivable.paid_amount += amount
        receivable.remaining_amount = receivable.total_amount - receivable.paid_amount

        if receivable.remaining_amount <= 0:
            receivable.status = 'paid'
            receivable.days_overdue = 0
        else:
            days_overdue = max(0, days_between(receivable.due_date, payment_date))
            receivable.days_overdue = max(receivable.days_overdue, days_overdue)

        self.db.commit()
        return receivable

    def update_overdue_status(self):
        today = date.today()
        receivables = self.db.query(Receivable).filter(
            Receivable.status != 'paid',
            Receivable.remaining_amount > 0
        ).all()

        updated = []
        for rec in receivables:
            days_overdue = max(0, days_between(rec.due_date, today))
            rec.days_overdue = days_overdue

            if days_overdue > 0 and rec.status == 'normal':
                rec.status = 'overdue'
            elif days_overdue == 0 and rec.status == 'overdue':
                rec.status = 'normal'

            updated.append({
                'invoice_number': rec.invoice_number,
                'customer_name': rec.customer.name if rec.customer else '未知',
                'remaining_amount': rec.remaining_amount,
                'days_overdue': days_overdue,
                'status': rec.status
            })

        self.db.commit()
        return updated

    def get_collection_strategy(self, customer, receivable):
        level_order = credit_level_order(customer.credit_level)

        for strategy in COLLECTION_STRATEGIES:
            min_level_order = credit_level_order(strategy['min_credit_level'])
            if level_order >= min_level_order and receivable.days_overdue <= strategy['max_days']:
                return strategy

        return COLLECTION_STRATEGIES[-1]

    def get_assignee(self, priority, sales_pool=None, finance_pool=None):
        sales_pool = sales_pool or ['张三', '李四', '王五']
        finance_pool = finance_pool or ['赵六', '钱七', '孙八']

        if priority == 'critical':
            return sales_pool[0], finance_pool[0]
        elif priority == 'high':
            return sales_pool[0], finance_pool[1]
        elif priority == 'medium':
            return sales_pool[1], finance_pool[1]
        else:
            return sales_pool[2], finance_pool[2]

    def scan_overdue_receivables(self, notify=True):
        self.update_overdue_status()

        today = date.today()
        seven_days_later = today + timedelta(days=7)

        receivables = self.db.query(Receivable).filter(
            Receivable.status.in_(['overdue', 'normal']),
            Receivable.remaining_amount > 0,
            Receivable.due_date <= seven_days_later
        ).all()

        tasks = []
        pending_tasks = []
        for rec in receivables:
            customer = self.db.query(Customer).filter(Customer.id == rec.customer_id).first()
            if not customer or not customer.is_active:
                continue

            strategy = self.get_collection_strategy(customer, rec)
            sales_assignee, finance_assignee = self.get_assignee(strategy['priority'])

            existing_task = self.db.query(CollectionTask).filter(
                CollectionTask.receivable_id == rec.id,
                CollectionTask.status == 'pending'
            ).first()

            if not existing_task:
                task = CollectionTask(
                    customer_id=customer.id,
                    receivable_id=rec.id,
                    task_type='payment_reminder' if rec.days_overdue == 0 else 'collection',
                    priority=strategy['priority'],
                    assigned_to_sales=sales_assignee,
                    assigned_to_finance=finance_assignee,
                    actions_required=', '.join(strategy['actions']),
                    status='pending'
                )
                self.db.add(task)

                if strategy['priority'] in ['high', 'critical'] and rec.days_overdue > 0:
                    self._apply_collection_actions(customer, strategy)

                pending_tasks.append({
                    'task': task,
                    'customer_obj': customer,
                    'customer_name': customer.name,
                    'receivable': rec,
                    'strategy': strategy,
                    'sales_assignee': sales_assignee,
                    'finance_assignee': finance_assignee,
                    'notify': notify
                })

        self.db.commit()

        for pt in pending_tasks:
            task = pt['task']
            customer = pt['customer_obj']
            customer_name = pt['customer_name']
            rec = pt['receivable']
            strategy = pt['strategy']
            sales_assignee = pt['sales_assignee']
            finance_assignee = pt['finance_assignee']
            should_notify = pt['notify']

            self.db.refresh(task)

            if should_notify:
                notifier.send_collection_notification(
                    customer, rec, strategy['actions'],
                    strategy['priority'], sales_assignee, finance_assignee
                )

            logger.log_collection_task(task, customer, rec, strategy['actions'])

            tasks.append({
                'task': task,
                'customer': customer_name,
                'receivable': rec,
                'strategy': strategy
            })

        return tasks

    def _apply_collection_actions(self, customer, strategy):
        actions = strategy['actions']

        if '暂停新订单' in actions or '冻结所有业务' in actions:
            pending_orders = self.db.query(Receivable).filter(
                Receivable.customer_id == customer.id,
                Receivable.status == 'pending'
            ).all()
            for order in pending_orders:
                order.status = 'frozen'

        if '客户黑名单' in actions or '行业通报' in actions:
            customer.is_active = False

        self.db.commit()

    def complete_collection_task(self, task_id, notes=None):
        task = self.db.query(CollectionTask).filter(CollectionTask.id == task_id).first()
        if not task:
            raise ValueError(f"催收任务ID {task_id} 不存在")

        task.status = 'completed'
        task.completed_at = datetime.now()
        task.notes = notes
        self.db.commit()
        return task

    def get_overdue_summary(self):
        self.update_overdue_status()

        summary = defaultdict(lambda: {
            'count': 0,
            'total_amount': 0,
            'customers': set()
        })

        receivables = self.db.query(Receivable).filter(
            Receivable.status == 'overdue',
            Receivable.remaining_amount > 0
        ).all()

        for rec in receivables:
            customer = self.db.query(Customer).filter(Customer.id == rec.customer_id).first()
            if not customer:
                continue

            if rec.days_overdue <= 15:
                bucket = '0-15天'
            elif rec.days_overdue <= 30:
                bucket = '16-30天'
            elif rec.days_overdue <= 60:
                bucket = '31-60天'
            elif rec.days_overdue <= 90:
                bucket = '61-90天'
            else:
                bucket = '90天以上'

            summary[bucket]['count'] += 1
            summary[bucket]['total_amount'] += rec.remaining_amount
            summary[bucket]['customers'].add(customer.name)

        result = []
        for bucket in ['0-15天', '16-30天', '31-60天', '61-90天', '90天以上']:
            if summary[bucket]['count'] > 0:
                result.append({
                    'overdue_period': bucket,
                    'count': summary[bucket]['count'],
                    'total_amount': summary[bucket]['total_amount'],
                    'customer_count': len(summary[bucket]['customers']),
                    'customers': list(summary[bucket]['customers'])
                })

        return result

    def get_pending_collection_tasks(self, priority=None):
        query = self.db.query(CollectionTask).filter(CollectionTask.status == 'pending')
        if priority:
            query = query.filter(CollectionTask.priority == priority)
        return query.order_by(
            CollectionTask.priority.desc(),
            CollectionTask.created_at.asc()
        ).all()

    def get_customer_receivables(self, customer_id, status=None):
        query = self.db.query(Receivable).filter(Receivable.customer_id == customer_id)
        if status:
            query = query.filter(Receivable.status == status)
        return query.order_by(Receivable.due_date.desc()).all()

    def close(self):
        self.db.close()


def run_daily_collection_scan():
    manager = ReceivableManager()
    try:
        tasks = manager.scan_overdue_receivables()
        summary = manager.get_overdue_summary()

        print(f"\n每日催收扫描完成: 生成 {len(tasks)} 个催收任务")
        print("\n逾期账龄分布:")
        for item in summary:
            print(f"  {item['overdue_period']}: {item['count']}笔, "
                  f"¥{item['total_amount']:,.2f}, 涉及{item['customer_count']}个客户")

        return {'tasks': tasks, 'summary': summary}
    finally:
        manager.close()
