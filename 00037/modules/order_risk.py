import sys
import os
from datetime import datetime, date

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from models import SessionLocal, Customer, Order, Approval
from utils import get_approval_level, generate_order_number, notifier, logger


class OrderRiskController:
    def __init__(self):
        self.db = SessionLocal()

    def create_order(self, customer_id, total_amount, order_date=None, notes=None):
        customer = self.db.query(Customer).filter(Customer.id == customer_id).first()
        if not customer:
            raise ValueError(f"客户ID {customer_id} 不存在")

        if not customer.is_active:
            raise ValueError(f"客户 {customer.name} 已被冻结，无法创建订单")

        order_date = order_date or date.today()
        order_number = generate_order_number()

        available_credit = customer.credit_limit - customer.current_balance
        exceeds_limit = total_amount > available_credit

        order = Order(
            order_number=order_number,
            customer_id=customer_id,
            order_date=order_date,
            total_amount=total_amount,
            credit_limit_at_time=customer.credit_limit,
            available_credit_at_time=available_credit,
            exceeds_credit_limit=exceeds_limit,
            notes=notes
        )
        self.db.add(order)

        if exceeds_limit:
            approval_level, approvers = get_approval_level(total_amount)
            order.approval_level = approval_level
            order.approval_status = 'pending_approval'
            order.is_frozen = True
            order.order_status = 'frozen'
        else:
            order.approval_status = 'auto_approved'
            order.order_status = 'approved'
            customer.current_balance += total_amount
            customer.available_credit = customer.credit_limit - customer.current_balance

        self.db.commit()
        self.db.refresh(order)

        if exceeds_limit:
            logger.log_order_approval(order, customer, approval_level, approvers)
            notifier.send_approval_notification(order, approvers, approval_level)

        return order

    def check_credit_limit(self, customer_id, order_amount):
        customer = self.db.query(Customer).filter(Customer.id == customer_id).first()
        if not customer:
            return {'valid': False, 'message': '客户不存在'}

        available_credit = customer.credit_limit - customer.current_balance
        if order_amount <= available_credit:
            return {
                'valid': True,
                'available_credit': available_credit,
                'credit_limit': customer.credit_limit,
                'current_balance': customer.current_balance,
                'message': '信用额度充足'
            }
        else:
            shortfall = order_amount - available_credit
            approval_level, approvers = get_approval_level(order_amount)
            return {
                'valid': False,
                'available_credit': available_credit,
                'credit_limit': customer.credit_limit,
                'current_balance': customer.current_balance,
                'shortfall': shortfall,
                'approval_level': approval_level,
                'approvers': approvers,
                'message': f'超出信用额度 ¥{shortfall:,.2f}，需{approval_level}级审批'
            }

    def approve_order(self, order_id, approver_role, approver_name, decision, notes=None):
        order = self.db.query(Order).filter(Order.id == order_id).first()
        if not order:
            raise ValueError(f"订单ID {order_id} 不存在")

        if order.approval_status in ['approved', 'rejected']:
            raise ValueError(f"订单 {order.order_number} 已完成审批，无法重复审批")

        approval = Approval(
            order_id=order_id,
            approval_level=order.approval_level,
            approver_role=approver_role,
            approver_name=approver_name,
            approval_decision=decision,
            approval_notes=notes,
            approved_at=datetime.now()
        )
        self.db.add(approval)

        if decision == 'rejected':
            order.approval_status = 'rejected'
            order.order_status = 'rejected'
            order.is_frozen = False
            self.db.commit()
            return {
                'status': 'rejected',
                'order_number': order.order_number,
                'message': f'订单已被 {approver_name} 拒绝'
            }

        existing_approvals = self.db.query(Approval).filter(
            Approval.order_id == order_id,
            Approval.approval_decision == 'approved'
        ).count()

        required_approvals = order.approval_level
        if existing_approvals >= required_approvals:
            order.approval_status = 'approved'
            order.is_frozen = False
            order.order_status = 'approved'

            customer = self.db.query(Customer).filter(Customer.id == order.customer_id).first()
            customer.current_balance += order.total_amount
            customer.available_credit = customer.credit_limit - customer.current_balance

            self.db.commit()
            return {
                'status': 'fully_approved',
                'order_number': order.order_number,
                'message': f'订单已通过全部{required_approvals}级审批，已正式生效',
                'approved_count': existing_approvals,
                'required_count': required_approvals
            }
        else:
            self.db.commit()
            return {
                'status': 'partially_approved',
                'order_number': order.order_number,
                'message': f'已通过{existing_approvals}/{required_approvals}级审批，还需{required_approvals - existing_approvals}人审批',
                'approved_count': existing_approvals,
                'required_count': required_approvals
            }

    def get_pending_approvals(self, approver_role=None):
        query = self.db.query(Order).filter(
            Order.approval_status == 'pending_approval',
            Order.is_frozen == True
        )
        orders = query.all()
        return orders

    def get_frozen_orders(self):
        return self.db.query(Order).filter(Order.is_frozen == True).all()

    def unfreeze_order(self, order_id, reason=None):
        order = self.db.query(Order).filter(Order.id == order_id).first()
        if not order:
            raise ValueError(f"订单ID {order_id} 不存在")

        order.is_frozen = False
        order.order_status = 'processing'
        self.db.commit()
        self.db.refresh(order)

        log_details = f"订单解冻，原因: {reason or '人工审批通过'}"
        logger.log_operation(
            operation_type='order_unfreeze',
            customer_id=order.customer_id,
            order_id=order_id,
            operation_details=log_details
        )

        return order

    def cancel_order(self, order_id, reason=None):
        order = self.db.query(Order).filter(Order.id == order_id).first()
        if not order:
            raise ValueError(f"订单ID {order_id} 不存在")

        if order.order_status == 'approved' and order.customer:
            customer = self.db.query(Customer).filter(Customer.id == order.customer_id).first()
            if customer:
                customer.current_balance -= order.total_amount
                customer.available_credit = customer.credit_limit - customer.current_balance

        order.order_status = 'cancelled'
        order.is_frozen = False
        order.approval_status = 'cancelled'
        self.db.commit()
        self.db.refresh(order)

        log_details = f"订单取消，原因: {reason or '客户取消'}"
        logger.log_operation(
            operation_type='order_cancel',
            customer_id=order.customer_id,
            order_id=order_id,
            operation_details=log_details
        )

        return order

    def complete_order(self, order_id):
        order = self.db.query(Order).filter(Order.id == order_id).first()
        if not order:
            raise ValueError(f"订单ID {order_id} 不存在")

        if order.order_status != 'approved':
            raise ValueError(f"订单 {order.order_number} 未通过审批，无法完成")

        order.order_status = 'completed'
        self.db.commit()
        return order

    def get_order_history(self, customer_id=None, status=None, start_date=None, end_date=None):
        query = self.db.query(Order)

        if customer_id:
            query = query.filter(Order.customer_id == customer_id)
        if status:
            query = query.filter(Order.order_status == status)
        if start_date:
            query = query.filter(Order.order_date >= start_date)
        if end_date:
            query = query.filter(Order.order_date <= end_date)

        return query.order_by(Order.order_date.desc()).all()

    def close(self):
        self.db.close()


def simulate_order_process():
    controller = OrderRiskController()
    try:
        result = controller.check_credit_limit(1, 500000)
        print(f"信用额度检查结果: {result['message']}")

        if not result['valid']:
            order = controller.create_order(1, 500000)
            print(f"创建订单: {order.order_number}, 状态: {order.order_status}")

            r1 = controller.approve_order(order.id, '销售经理', '张三', 'approved', '同意审批')
            print(f"一级审批: {r1['message']}")

            r2 = controller.approve_order(order.id, '财务主管', '李四', 'approved', '财务审核通过')
            print(f"二级审批: {r2['message']}")

            r3 = controller.approve_order(order.id, '风控总监', '王五', 'approved', '风控审核通过')
            print(f"三级审批: {r3['message']}")

        return True
    finally:
        controller.close()
