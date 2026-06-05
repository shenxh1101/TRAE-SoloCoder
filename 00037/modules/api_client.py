#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
API客户端基类和数据同步管理器
"""
import sys
import os
import json
import time
import requests
from datetime import datetime, timedelta
from functools import wraps
import warnings
warnings.filterwarnings('ignore')

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config.settings import CRM_CONFIG, FINANCE_CONFIG, API_DATA_CONFIG, DATA_DIR
from models.database import SessionLocal
from models.models import APISyncLog, Customer, Order, Receivable


def with_api_retry(max_retries=3, delay=2.0):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            last_exception = None
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    last_exception = e
                    if attempt < max_retries - 1:
                        print(f"API调用失败，第 {attempt + 1} 次重试...")
                        time.sleep(delay * (attempt + 1))
                    else:
                        raise last_exception
            raise last_exception
        return wrapper
    return decorator


class BaseAPIClient:
    def __init__(self, config):
        self.base_url = config['base_url']
        self.api_key = config['api_key']
        self.timeout = config['timeout']
        self.retry_times = config['retry_times']
        self.retry_delay = config['retry_delay']
        self.endpoints = config['endpoints']
        self.enabled = config['enabled']
        self.sync_days = config['sync_days']
        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': f'Bearer {self.api_key}',
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })

    @with_api_retry(max_retries=3)
    def _get(self, endpoint, params=None):
        url = f"{self.base_url}{endpoint}"
        response = self.session.get(url, params=params, timeout=self.timeout)
        response.raise_for_status()
        return response.json()

    @with_api_retry(max_retries=3)
    def _post(self, endpoint, data=None):
        url = f"{self.base_url}{endpoint}"
        response = self.session.post(url, json=data, timeout=self.timeout)
        response.raise_for_status()
        return response.json()

    def _save_raw_data(self, data_source, data_type, data):
        if not API_DATA_CONFIG['save_raw_data']:
            return None
        raw_dir = os.path.join(DATA_DIR, 'raw_api_data')
        os.makedirs(raw_dir, exist_ok=True)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        file_name = f"{data_source}_{data_type}_{timestamp}.json"
        file_path = os.path.join(raw_dir, file_name)
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return file_path

    def _log_sync(self, sync_type, data_source, status, records_synced=0,
                  records_updated=0, records_inserted=0, error_message=None,
                  sync_start_time=None, raw_data_file=None):
        db = SessionLocal()
        try:
            log = APISyncLog(
                sync_type=sync_type,
                data_source=data_source,
                status=status,
                records_synced=records_synced,
                records_updated=records_updated,
                records_inserted=records_inserted,
                error_message=error_message,
                sync_start_time=sync_start_time,
                sync_end_time=datetime.now(),
                raw_data_file=raw_data_file
            )
            db.add(log)
            db.commit()
            return log
        except Exception as e:
            db.rollback()
            raise e
        finally:
            db.close()


class CRMClient(BaseAPIClient):
    def __init__(self):
        super().__init__(CRM_CONFIG)
        self.source_name = 'CRM'

    def get_customers(self, last_sync=None):
        params = {}
        if last_sync:
            params['updated_after'] = last_sync.isoformat()
        endpoint = self.endpoints['customers']
        return self._get(endpoint, params=params)

    def get_customer_orders(self, customer_code, start_date=None, end_date=None):
        if not start_date:
            start_date = datetime.now() - timedelta(days=self.sync_days)
        if not end_date:
            end_date = datetime.now()
        params = {
            'customer_code': customer_code,
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat()
        }
        endpoint = self.endpoints['orders']
        return self._get(endpoint, params=params)

    def get_transactions(self, start_date=None, end_date=None):
        if not start_date:
            start_date = datetime.now() - timedelta(days=self.sync_days)
        if not end_date:
            end_date = datetime.now()
        params = {
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat()
        }
        endpoint = self.endpoints['transactions']
        return self._get(endpoint, params=params)

    def sync_transactions(self):
        if not self.enabled:
            print(f"[{self.source_name}] API未启用，跳过同步")
            return {'enabled': False}

        sync_start = datetime.now()
        print(f"\n[{self.source_name}] 开始同步交易记录...")

        try:
            data = self.get_transactions()
            raw_file = self._save_raw_data('crm', 'transactions', data)

            db = SessionLocal()
            records_inserted = 0
            records_updated = 0

            try:
                transactions = data.get('data', []) if isinstance(data, dict) else data

                for trans in transactions:
                    customer_code = trans.get('customer_code')
                    if not customer_code:
                        continue

                    customer = db.query(Customer).filter(
                        Customer.customer_code == customer_code
                    ).first()

                    if not customer:
                        continue

                    existing_order = db.query(Order).filter(
                        Order.order_number == trans.get('order_number')
                    ).first()

                    if existing_order:
                        existing_order.total_amount = trans.get('amount', existing_order.total_amount)
                        existing_order.updated_at = datetime.now()
                        records_updated += 1
                    else:
                        from utils.helpers import generate_order_number
                        order = Order(
                            order_number=trans.get('order_number') or generate_order_number(),
                            customer_id=customer.id,
                            order_date=datetime.fromisoformat(trans.get('transaction_date', datetime.now().isoformat())).date(),
                            total_amount=trans.get('amount', 0),
                            credit_limit_at_time=customer.credit_limit,
                            available_credit_at_time=customer.available_credit,
                            exceeds_credit_limit=trans.get('amount', 0) > customer.available_credit,
                            approval_status='auto_approved',
                            order_status='completed',
                            notes=f"从CRM同步 - 交易ID: {trans.get('transaction_id')}"
                        )
                        db.add(order)
                        records_inserted += 1

                db.commit()

                self._log_sync(
                    sync_type='transactions',
                    data_source=self.source_name,
                    status='success',
                    records_synced=len(transactions),
                    records_updated=records_updated,
                    records_inserted=records_inserted,
                    sync_start_time=sync_start,
                    raw_data_file=raw_file
                )

                print(f"[{self.source_name}] 同步完成: 共{len(transactions)}条, 新增{records_inserted}条, 更新{records_updated}条")

                return {
                    'success': True,
                    'total': len(transactions),
                    'inserted': records_inserted,
                    'updated': records_updated
                }

            except Exception as e:
                db.rollback()
                self._log_sync(
                    sync_type='transactions',
                    data_source=self.source_name,
                    status='failed',
                    records_synced=len(data.get('data', [])) if isinstance(data, dict) else 0,
                    error_message=str(e),
                    sync_start_time=sync_start,
                    raw_data_file=raw_file
                )
                raise e
            finally:
                db.close()

        except Exception as e:
            print(f"[{self.source_name}] 同步失败: {e}")
            self._log_sync(
                sync_type='transactions',
                data_source=self.source_name,
                status='failed',
                error_message=str(e),
                sync_start_time=sync_start
            )
            raise


class FinanceClient(BaseAPIClient):
    def __init__(self):
        super().__init__(FINANCE_CONFIG)
        self.source_name = 'Finance'

    def get_invoices(self, start_date=None, end_date=None):
        if not start_date:
            start_date = datetime.now() - timedelta(days=self.sync_days)
        if not end_date:
            end_date = datetime.now()
        params = {
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat()
        }
        endpoint = self.endpoints['invoices']
        return self._get(endpoint, params=params)

    def get_payments(self, start_date=None, end_date=None):
        if not start_date:
            start_date = datetime.now() - timedelta(days=self.sync_days)
        if not end_date:
            end_date = datetime.now()
        params = {
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat()
        }
        endpoint = self.endpoints['payments']
        return self._get(endpoint, params=params)

    def get_customer_payments(self, customer_code, start_date=None, end_date=None):
        if not start_date:
            start_date = datetime.now() - timedelta(days=self.sync_days)
        if not end_date:
            end_date = datetime.now()
        params = {
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat()
        }
        endpoint = self.endpoints['customer_payments'].format(customer_id=customer_code)
        return self._get(endpoint, params=params)

    def get_receivables(self, start_date=None, end_date=None):
        if not start_date:
            start_date = datetime.now() - timedelta(days=self.sync_days)
        if not end_date:
            end_date = datetime.now()
        params = {
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat()
        }
        endpoint = self.endpoints['receivables']
        return self._get(endpoint, params=params)

    def sync_payments(self):
        if not self.enabled:
            print(f"[{self.source_name}] API未启用，跳过同步")
            return {'enabled': False}

        sync_start = datetime.now()
        print(f"\n[{self.source_name}] 开始同步付款记录...")

        try:
            data = self.get_payments()
            raw_file = self._save_raw_data('finance', 'payments', data)

            db = SessionLocal()
            records_updated = 0

            try:
                payments = data.get('data', []) if isinstance(data, dict) else data

                for payment in payments:
                    invoice_number = payment.get('invoice_number')
                    if not invoice_number:
                        continue

                    receivable = db.query(Receivable).filter(
                        Receivable.invoice_number == invoice_number
                    ).first()

                    if receivable:
                        paid_amount = payment.get('amount', 0)
                        receivable.paid_amount += paid_amount
                        receivable.remaining_amount = receivable.total_amount - receivable.paid_amount
                        if receivable.remaining_amount <= 0:
                            receivable.status = 'paid'
                            receivable.remaining_amount = 0
                        receivable.updated_at = datetime.now()
                        records_updated += 1

                db.commit()

                self._log_sync(
                    sync_type='payments',
                    data_source=self.source_name,
                    status='success',
                    records_synced=len(payments),
                    records_updated=records_updated,
                    sync_start_time=sync_start,
                    raw_data_file=raw_file
                )

                print(f"[{self.source_name}] 同步完成: 共{len(payments)}条, 更新{records_updated}条")

                return {
                    'success': True,
                    'total': len(payments),
                    'updated': records_updated
                }

            except Exception as e:
                db.rollback()
                self._log_sync(
                    sync_type='payments',
                    data_source=self.source_name,
                    status='failed',
                    records_synced=len(data.get('data', [])) if isinstance(data, dict) else 0,
                    error_message=str(e),
                    sync_start_time=sync_start,
                    raw_data_file=raw_file
                )
                raise e
            finally:
                db.close()

        except Exception as e:
            print(f"[{self.source_name}] 同步失败: {e}")
            self._log_sync(
                sync_type='payments',
                data_source=self.source_name,
                status='failed',
                error_message=str(e),
                sync_start_time=sync_start
            )
            raise

    def sync_receivables(self):
        if not self.enabled:
            print(f"[{self.source_name}] API未启用，跳过同步")
            return {'enabled': False}

        sync_start = datetime.now()
        print(f"\n[{self.source_name}] 开始同步应收账款...")

        try:
            data = self.get_receivables()
            raw_file = self._save_raw_data('finance', 'receivables', data)

            db = SessionLocal()
            records_inserted = 0
            records_updated = 0

            try:
                receivables = data.get('data', []) if isinstance(data, dict) else data

                for rec in receivables:
                    customer_code = rec.get('customer_code')
                    invoice_number = rec.get('invoice_number')

                    if not customer_code or not invoice_number:
                        continue

                    customer = db.query(Customer).filter(
                        Customer.customer_code == customer_code
                    ).first()

                    if not customer:
                        continue

                    existing_rec = db.query(Receivable).filter(
                        Receivable.invoice_number == invoice_number
                    ).first()

                    total_amount = rec.get('total_amount', 0)
                    paid_amount = rec.get('paid_amount', 0)
                    remaining = total_amount - paid_amount

                    if existing_rec:
                        existing_rec.total_amount = total_amount
                        existing_rec.paid_amount = paid_amount
                        existing_rec.remaining_amount = remaining
                        existing_rec.due_date = datetime.fromisoformat(rec.get('due_date', datetime.now().isoformat())).date()
                        existing_rec.updated_at = datetime.now()
                        records_updated += 1
                    else:
                        from utils.helpers import days_between
                        inv_date = datetime.fromisoformat(rec.get('invoice_date', datetime.now().isoformat())).date()
                        due_date = datetime.fromisoformat(rec.get('due_date', datetime.now().isoformat())).date()
                        days_overdue = days_between(due_date, datetime.now().date())

                        receivable = Receivable(
                            customer_id=customer.id,
                            invoice_number=invoice_number,
                            invoice_date=inv_date,
                            due_date=due_date,
                            total_amount=total_amount,
                            paid_amount=paid_amount,
                            remaining_amount=remaining,
                            days_overdue=max(0, days_overdue),
                            status='overdue' if days_overdue > 0 else 'normal'
                        )
                        db.add(receivable)
                        records_inserted += 1

                db.commit()

                self._log_sync(
                    sync_type='receivables',
                    data_source=self.source_name,
                    status='success',
                    records_synced=len(receivables),
                    records_updated=records_updated,
                    records_inserted=records_inserted,
                    sync_start_time=sync_start,
                    raw_data_file=raw_file
                )

                print(f"[{self.source_name}] 同步完成: 共{len(receivables)}条, 新增{records_inserted}条, 更新{records_updated}条")

                return {
                    'success': True,
                    'total': len(receivables),
                    'inserted': records_inserted,
                    'updated': records_updated
                }

            except Exception as e:
                db.rollback()
                self._log_sync(
                    sync_type='receivables',
                    data_source=self.source_name,
                    status='failed',
                    records_synced=len(data.get('data', [])) if isinstance(data, dict) else 0,
                    error_message=str(e),
                    sync_start_time=sync_start,
                    raw_data_file=raw_file
                )
                raise e
            finally:
                db.close()

        except Exception as e:
            print(f"[{self.source_name}] 同步失败: {e}")
            self._log_sync(
                sync_type='receivables',
                data_source=self.source_name,
                status='failed',
                error_message=str(e),
                sync_start_time=sync_start
            )
            raise


class DataSyncManager:
    def __init__(self):
        self.crm_client = CRMClient()
        self.finance_client = FinanceClient()

    def sync_all(self):
        print("\n" + "="*60)
        print("  开始全量数据同步")
        print("="*60)

        results = {}

        try:
            results['crm_transactions'] = self.crm_client.sync_transactions()
        except Exception as e:
            results['crm_transactions'] = {'success': False, 'error': str(e)}

        try:
            results['finance_payments'] = self.finance_client.sync_payments()
        except Exception as e:
            results['finance_payments'] = {'success': False, 'error': str(e)}

        try:
            results['finance_receivables'] = self.finance_client.sync_receivables()
        except Exception as e:
            results['finance_receivables'] = {'success': False, 'error': str(e)}

        print("\n" + "="*60)
        print("  数据同步完成")
        print("="*60)
        for key, value in results.items():
            status = "✅ 成功" if value.get('success', False) or value.get('enabled', False) == False else "❌ 失败"
            print(f"  {key}: {status}")

        return results

    def sync_crm_only(self):
        return self.crm_client.sync_transactions()

    def sync_finance_only(self):
        results = {}
        try:
            results['payments'] = self.finance_client.sync_payments()
        except Exception as e:
            results['payments'] = {'success': False, 'error': str(e)}
        try:
            results['receivables'] = self.finance_client.sync_receivables()
        except Exception as e:
            results['receivables'] = {'success': False, 'error': str(e)}
        return results


class MockDataGenerator:
    def __init__(self):
        from models.database import SessionLocal
        self.db = SessionLocal()

    def generate_mock_crm_transactions(self, count=10):
        from datetime import datetime, timedelta
        import random
        from utils.helpers import generate_order_number

        customers = self.db.query(Customer).all()
        if not customers:
            return []

        transactions = []
        for i in range(count):
            customer = random.choice(customers)
            amount = random.uniform(5000, 200000)
            trans_date = datetime.now() - timedelta(days=random.randint(0, 30))

            transactions.append({
                'transaction_id': f'TXN{datetime.now().strftime("%Y%m%d")}{i+1:04d}',
                'customer_code': customer.customer_code,
                'customer_name': customer.name,
                'order_number': f"{generate_order_number()}-{i}",
                'amount': round(amount, 2),
                'transaction_date': trans_date.isoformat(),
                'transaction_type': random.choice(['sale', 'refund', 'exchange']),
                'status': random.choice(['completed', 'pending', 'cancelled']),
                'salesperson': random.choice(['张三', '李四', '王五', '赵六'])
            })

        return transactions

    def generate_mock_finance_payments(self, count=5):
        from datetime import datetime, timedelta
        import random

        receivables = self.db.query(Receivable).filter(Receivable.status != 'paid').all()
        if not receivables:
            return []

        payments = []
        for i in range(min(count, len(receivables))):
            rec = random.choice(receivables)
            customer = self.db.query(Customer).filter(Customer.id == rec.customer_id).first()
            pay_amount = min(rec.remaining_amount, random.uniform(5000, 50000))
            pay_date = datetime.now() - timedelta(days=random.randint(0, 15))

            payments.append({
                'payment_id': f'PAY{datetime.now().strftime("%Y%m%d")}{i+1:04d}',
                'invoice_number': rec.invoice_number,
                'customer_code': customer.customer_code if customer else '',
                'customer_name': customer.name if customer else '',
                'amount': round(pay_amount, 2),
                'payment_date': pay_date.isoformat(),
                'payment_method': random.choice(['bank_transfer', 'check', 'credit_card', 'cash']),
                'status': 'completed',
                'processed_by': random.choice(['财务-王会计', '财务-李出纳', '财务-张主管'])
            })

        return payments

    def generate_mock_finance_receivables(self, count=8):
        from datetime import datetime, timedelta
        import random

        customers = self.db.query(Customer).all()
        if not customers:
            return []

        receivables = []
        for i in range(count):
            customer = random.choice(customers)
            total_amount = random.uniform(10000, 150000)
            paid_amount = random.uniform(0, total_amount * 0.5) if random.random() > 0.3 else 0
            inv_date = datetime.now() - timedelta(days=random.randint(10, 60))
            due_date = inv_date + timedelta(days=random.randint(15, 45))

            receivables.append({
                'invoice_number': f'INV{datetime.now().strftime("%Y%m%d")}{i+1:04d}',
                'customer_code': customer.customer_code,
                'customer_name': customer.name,
                'total_amount': round(total_amount, 2),
                'paid_amount': round(paid_amount, 2),
                'invoice_date': inv_date.isoformat(),
                'due_date': due_date.isoformat(),
                'status': 'unpaid' if paid_amount < total_amount else 'paid',
                'currency': 'CNY',
                'department': random.choice(['销售一部', '销售二部', '销售三部'])
            })

        return receivables

    def close(self):
        self.db.close()


def run_mock_sync():
    print("\n" + "="*60)
    print("  生成模拟API数据并同步到系统")
    print("="*60)

    generator = MockDataGenerator()
    results = {}

    try:
        transactions = generator.generate_mock_crm_transactions(count=10)
        print(f"\n生成 {len(transactions)} 条CRM交易记录")

        db = SessionLocal()
        inserted = 0
        for trans in transactions:
            customer = db.query(Customer).filter(
                Customer.customer_code == trans['customer_code']
            ).first()

            if customer:
                existing_order = db.query(Order).filter(
                    Order.order_number == trans['order_number']
                ).first()

                if not existing_order:
                    from utils.helpers import generate_order_number
                    order = Order(
                        order_number=trans['order_number'] or generate_order_number(),
                        customer_id=customer.id,
                        order_date=datetime.fromisoformat(trans['transaction_date']).date(),
                        total_amount=trans['amount'],
                        credit_limit_at_time=customer.credit_limit,
                        available_credit_at_time=customer.available_credit,
                        exceeds_credit_limit=trans['amount'] > customer.available_credit,
                        approval_status='auto_approved',
                        order_status='completed',
                        notes=f"模拟CRM数据 - 交易ID: {trans['transaction_id']}"
                    )
                    db.add(order)
                    inserted += 1
        db.commit()
        db.close()
        results['crm_transactions'] = {'success': True, 'total': len(transactions), 'inserted': inserted}
        print(f"同步完成: 新增 {inserted} 条订单")

    except Exception as e:
        print(f"CRM同步失败: {e}")
        import traceback
        traceback.print_exc()
        results['crm_transactions'] = {'success': False, 'error': str(e)}

    try:
        receivables = generator.generate_mock_finance_receivables(count=8)
        print(f"\n生成 {len(receivables)} 条应收账款记录")

        db = SessionLocal()
        inserted = 0
        updated = 0
        for rec_data in receivables:
            customer = db.query(Customer).filter(
                Customer.customer_code == rec_data['customer_code']
            ).first()

            if customer:
                existing_rec = db.query(Receivable).filter(
                    Receivable.invoice_number == rec_data['invoice_number']
                ).first()

                total_amount = rec_data['total_amount']
                paid_amount = rec_data['paid_amount']
                remaining = total_amount - paid_amount

                if existing_rec:
                    existing_rec.total_amount = total_amount
                    existing_rec.paid_amount = paid_amount
                    existing_rec.remaining_amount = remaining
                    existing_rec.due_date = datetime.fromisoformat(rec_data['due_date']).date()
                    existing_rec.updated_at = datetime.now()
                    updated += 1
                else:
                    from utils.helpers import days_between
                    inv_date = datetime.fromisoformat(rec_data['invoice_date']).date()
                    due_date = datetime.fromisoformat(rec_data['due_date']).date()
                    days_overdue = days_between(due_date, datetime.now().date())

                    receivable = Receivable(
                        customer_id=customer.id,
                        invoice_number=rec_data['invoice_number'],
                        invoice_date=inv_date,
                        due_date=due_date,
                        total_amount=total_amount,
                        paid_amount=paid_amount,
                        remaining_amount=remaining,
                        days_overdue=max(0, days_overdue),
                        status='overdue' if days_overdue > 0 else 'normal'
                    )
                    db.add(receivable)
                    inserted += 1
        db.commit()
        db.close()
        results['finance_receivables'] = {'success': True, 'total': len(receivables), 'inserted': inserted, 'updated': updated}
        print(f"同步完成: 新增 {inserted} 条, 更新 {updated} 条应收账款")

    except Exception as e:
        print(f"财务应收同步失败: {e}")
        import traceback
        traceback.print_exc()
        results['finance_receivables'] = {'success': False, 'error': str(e)}

    try:
        payments = generator.generate_mock_finance_payments(count=5)
        print(f"\n生成 {len(payments)} 条付款记录")

        db = SessionLocal()
        updated = 0
        for payment in payments:
            receivable = db.query(Receivable).filter(
                Receivable.invoice_number == payment['invoice_number']
            ).first()

            if receivable:
                paid_amount = payment['amount']
                receivable.paid_amount += paid_amount
                receivable.remaining_amount = receivable.total_amount - receivable.paid_amount
                if receivable.remaining_amount <= 0:
                    receivable.status = 'paid'
                    receivable.remaining_amount = 0
                receivable.updated_at = datetime.now()
                updated += 1
        db.commit()
        db.close()
        results['finance_payments'] = {'success': True, 'total': len(payments), 'updated': updated}
        print(f"同步完成: 更新 {updated} 条应收账款付款状态")

    except Exception as e:
        print(f"财务付款同步失败: {e}")
        import traceback
        traceback.print_exc()
        results['finance_payments'] = {'success': False, 'error': str(e)}

    generator.close()

    print("\n" + "="*60)
    print("  模拟数据同步完成")
    print("="*60)
    for key, value in results.items():
        status = "✅ 成功" if value.get('success', False) else "❌ 失败"
        print(f"  {key}: {status}")

    return results
