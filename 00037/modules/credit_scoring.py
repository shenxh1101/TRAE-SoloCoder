import sys
import os
from datetime import datetime, timedelta, date
from collections import defaultdict

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from models import SessionLocal, Customer, CreditScoreHistory, Order, Receivable, FinancialRecord
from config.settings import CREDIT_SCORE_WEIGHTS, CREDIT_LEVELS
from utils import get_credit_level, get_credit_multiplier, days_between, notifier, logger


class CreditScoringEngine:
    def __init__(self):
        self.db = SessionLocal()

    def fetch_crm_data(self, customer):
        one_year_ago = date.today() - timedelta(days=365)
        orders = self.db.query(Order).filter(
            Order.customer_id == customer.id,
            Order.order_date >= one_year_ago,
            Order.order_status != 'cancelled'
        ).all()

        order_dates = [o.order_date for o in orders] if orders else []
        order_values = [o.total_amount for o in orders] if orders else []

        return {
            'order_count': len(orders),
            'total_order_value': sum(order_values),
            'average_order_value': sum(order_values) / len(order_values) if order_values else 0,
            'order_dates': order_dates,
            'order_frequency': len(orders) / 12 if orders else 0
        }

    def fetch_finance_data(self, customer):
        one_year_ago = date.today() - timedelta(days=365)

        receivables = self.db.query(Receivable).filter(
            Receivable.customer_id == customer.id
        ).all()

        paid_on_time = 0
        total_paid = 0
        overdue_count = 0
        total_overdue_days = 0
        max_overdue_days = 0

        for rec in receivables:
            if rec.paid_amount > 0:
                total_paid += 1
                if rec.days_overdue <= 0:
                    paid_on_time += 1
            if rec.days_overdue > 0:
                overdue_count += 1
                total_overdue_days += rec.days_overdue
                max_overdue_days = max(max_overdue_days, rec.days_overdue)

        return {
            'total_invoices': len(receivables),
            'paid_invoices': total_paid,
            'paid_on_time': paid_on_time,
            'overdue_count': overdue_count,
            'average_overdue_days': total_overdue_days / overdue_count if overdue_count else 0,
            'max_overdue_days': max_overdue_days,
            'current_balance': customer.current_balance,
            'outstanding_receivables': sum(r.remaining_amount for r in receivables if r.remaining_amount > 0)
        }

    def fetch_financial_health(self, customer):
        latest_financial = self.db.query(FinancialRecord).filter(
            FinancialRecord.customer_id == customer.id
        ).order_by(FinancialRecord.report_date.desc()).first()

        if latest_financial:
            return latest_financial.financial_health_score
        return 70.0

    def calculate_payment_history_score(self, finance_data):
        if finance_data['total_invoices'] == 0:
            return 75.0

        on_time_ratio = finance_data['paid_on_time'] / finance_data['total_invoices'] if finance_data['total_invoices'] > 0 else 1.0
        overdue_penalty = min(finance_data['max_overdue_days'] * 0.5, 40)

        base_score = 40 + on_time_ratio * 60
        final_score = max(0, min(100, base_score - overdue_penalty))
        return final_score

    def calculate_credit_utilization_score(self, customer, finance_data):
        if customer.credit_limit <= 0:
            return 50.0

        utilization = finance_data['outstanding_receivables'] / customer.credit_limit
        if utilization <= 0.3:
            return 100.0
        elif utilization <= 0.5:
            return 85.0
        elif utilization <= 0.7:
            return 70.0
        elif utilization <= 0.9:
            return 50.0
        else:
            return max(20, 100 - (utilization - 0.7) * 200)

    def calculate_order_frequency_score(self, crm_data):
        frequency = crm_data['order_frequency']
        if frequency >= 4:
            return 100.0
        elif frequency >= 2:
            return 80.0
        elif frequency >= 1:
            return 65.0
        elif frequency >= 0.5:
            return 50.0
        else:
            return 35.0

    def calculate_average_order_value_score(self, crm_data):
        avg_value = crm_data['average_order_value']
        if avg_value >= 500000:
            return 100.0
        elif avg_value >= 200000:
            return 85.0
        elif avg_value >= 100000:
            return 70.0
        elif avg_value >= 50000:
            return 55.0
        else:
            return 40.0

    def calculate_years_as_customer_score(self, customer):
        if not customer.registration_date:
            return 60.0
        years = days_between(customer.registration_date, date.today()) / 365.25
        if years >= 10:
            return 100.0
        elif years >= 5:
            return 85.0
        elif years >= 3:
            return 70.0
        elif years >= 1:
            return 55.0
        else:
            return 40.0

    def calculate_credit_score(self, customer):
        crm_data = self.fetch_crm_data(customer)
        finance_data = self.fetch_finance_data(customer)
        financial_health = self.fetch_financial_health(customer)

        scores = {
            'payment_history': self.calculate_payment_history_score(finance_data),
            'credit_utilization': self.calculate_credit_utilization_score(customer, finance_data),
            'order_frequency': self.calculate_order_frequency_score(crm_data),
            'average_order_value': self.calculate_average_order_value_score(crm_data),
            'years_as_customer': self.calculate_years_as_customer_score(customer),
            'financial_health': financial_health
        }

        total_score = sum(
            scores[key] * CREDIT_SCORE_WEIGHTS[key]
            for key in CREDIT_SCORE_WEIGHTS
        )

        return total_score, scores

    def calculate_credit_limit(self, customer, score):
        level = get_credit_level(score)
        multiplier = get_credit_multiplier(level)

        crm_data = self.fetch_crm_data(customer)
        avg_monthly_revenue = crm_data['total_order_value'] / 12 if crm_data['total_order_value'] > 0 else 50000

        base_limit = max(avg_monthly_revenue, 50000)
        credit_limit = base_limit * multiplier

        return round(credit_limit, 2), level

    def update_customer_credit(self, customer, reason='定期信用评估', notify=True):
        old_score = customer.credit_score
        old_level = customer.credit_level
        old_limit = customer.credit_limit

        new_score, score_details = self.calculate_credit_score(customer)
        new_limit, new_level = self.calculate_credit_limit(customer, new_score)

        new_score = round(new_score, 2)

        customer.credit_score = new_score
        customer.credit_level = new_level
        customer.credit_limit = new_limit
        customer.available_credit = new_limit - customer.current_balance
        customer.last_score_update = datetime.now()

        history = CreditScoreHistory(
            customer_id=customer.id,
            old_score=old_score,
            new_score=new_score,
            old_level=old_level,
            new_level=new_level,
            old_limit=old_limit,
            new_limit=new_limit,
            change_reason=reason,
            payment_history_score=score_details['payment_history'],
            credit_utilization_score=score_details['credit_utilization'],
            order_frequency_score=score_details['order_frequency'],
            average_order_value_score=score_details['average_order_value'],
            years_as_customer_score=score_details['years_as_customer'],
            financial_health_score=score_details['financial_health']
        )
        self.db.add(history)
        self.db.commit()
        self.db.refresh(customer)

        if old_level != new_level or abs(old_limit - new_limit) > 0.01:
            logger.log_credit_adjustment(
                customer, old_score, new_score, old_level, new_level,
                old_limit, new_limit, reason
            )
            if notify:
                notifier.send_credit_adjustment_notification(
                    customer, old_level, new_level, old_limit, new_limit, reason
                )

        return {
            'customer': customer.name,
            'old_score': old_score,
            'new_score': new_score,
            'old_level': old_level,
            'new_level': new_level,
            'old_limit': old_limit,
            'new_limit': new_limit,
            'score_details': score_details
        }

    def update_all_customers_credit(self, reason='每日批量信用评估'):
        customers = self.db.query(Customer).filter(Customer.is_active == True).all()
        results = []
        for customer in customers:
            result = self.update_customer_credit(customer, reason=reason, notify=False)
            results.append(result)

        significant_changes = [
            r for r in results
            if r['old_level'] != r['new_level'] or abs(r['old_limit'] - r['new_limit']) > 10000
        ]

        for change in significant_changes:
            customer = self.db.query(Customer).filter(Customer.name == change['customer']).first()
            if customer:
                notifier.send_credit_adjustment_notification(
                    customer, change['old_level'], change['new_level'],
                    change['old_limit'], change['new_limit'], reason
                )

        return {
            'total_processed': len(results),
            'significant_changes': len(significant_changes),
            'details': results
        }

    def close(self):
        self.db.close()


def run_daily_credit_update():
    engine = CreditScoringEngine()
    try:
        result = engine.update_all_customers_credit()
        print(f"\n每日信用评估完成: 处理 {result['total_processed']} 个客户, "
              f"{result['significant_changes']} 个客户信用发生重大调整")
        return result
    finally:
        engine.close()
