import sys
import os
from datetime import datetime
from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.cron import CronTrigger

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config.settings import SCHEDULE_CONFIG, API_DATA_CONFIG
from modules import (
    run_daily_credit_update,
    run_daily_collection_scan,
    run_monthly_report
)
from modules.api_client import DataSyncManager, run_mock_sync


class TaskScheduler:
    def __init__(self):
        self.scheduler = BlockingScheduler(timezone='Asia/Shanghai')

    def daily_credit_update_task(self):
        print(f"\n{'='*60}")
        print(f"[定时任务] 每日信用评估更新 - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print('='*60)
        try:
            run_daily_credit_update()
        except Exception as e:
            print(f"[错误] 每日信用评估更新失败: {e}")

    def daily_collection_scan_task(self):
        print(f"\n{'='*60}")
        print(f"[定时任务] 每日催收扫描 - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print('='*60)
        try:
            run_daily_collection_scan()
        except Exception as e:
            print(f"[错误] 每日催收扫描失败: {e}")

    def monthly_report_task(self):
        print(f"\n{'='*60}")
        print(f"[定时任务] 月度风险报告生成 - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print('='*60)
        try:
            run_monthly_report()
        except Exception as e:
            print(f"[错误] 月度风险报告生成失败: {e}")

    def crm_transaction_sync_task(self):
        print(f"\n{'='*60}")
        print(f"[定时任务] CRM交易记录同步 - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print('='*60)
        try:
            sync_manager = DataSyncManager()
            sync_manager.sync_crm_only()
        except Exception as e:
            print(f"[错误] CRM交易记录同步失败: {e}")

    def finance_payment_sync_task(self):
        print(f"\n{'='*60}")
        print(f"[定时任务] 财务系统付款记录同步 - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print('='*60)
        try:
            sync_manager = DataSyncManager()
            sync_manager.sync_finance_only()
        except Exception as e:
            print(f"[错误] 财务系统付款记录同步失败: {e}")

    def mock_data_sync_task(self):
        print(f"\n{'='*60}")
        print(f"[定时任务] 模拟数据同步 - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print('='*60)
        try:
            run_mock_sync()
        except Exception as e:
            print(f"[错误] 模拟数据同步失败: {e}")

    def setup_schedule(self):
        credit_config = SCHEDULE_CONFIG['daily_score_update']
        self.scheduler.add_job(
            self.daily_credit_update_task,
            CronTrigger(hour=credit_config['hour'], minute=credit_config['minute']),
            id='daily_credit_update',
            name='每日信用评估更新',
            replace_existing=True
        )

        collection_config = SCHEDULE_CONFIG['daily_overdue_scan']
        self.scheduler.add_job(
            self.daily_collection_scan_task,
            CronTrigger(hour=collection_config['hour'], minute=collection_config['minute']),
            id='daily_collection_scan',
            name='每日催收扫描',
            replace_existing=True
        )

        report_config = SCHEDULE_CONFIG['monthly_report']
        self.scheduler.add_job(
            self.monthly_report_task,
            CronTrigger(day=report_config['day'], hour=report_config['hour'], minute=report_config['minute']),
            id='monthly_report',
            name='月度风险报告生成',
            replace_existing=True
        )

        crm_sync_config = API_DATA_CONFIG['sync_schedule']['crm_transactions']
        self.scheduler.add_job(
            self.crm_transaction_sync_task,
            CronTrigger(hour=crm_sync_config['hour'], minute=crm_sync_config['minute']),
            id='crm_transaction_sync',
            name='CRM交易记录同步',
            replace_existing=True
        )

        finance_sync_config = API_DATA_CONFIG['sync_schedule']['finance_payments']
        self.scheduler.add_job(
            self.finance_payment_sync_task,
            CronTrigger(hour=finance_sync_config['hour'], minute=finance_sync_config['minute']),
            id='finance_payment_sync',
            name='财务系统付款记录同步',
            replace_existing=True
        )

    def start(self):
        self.setup_schedule()
        print("\n" + "="*60)
        print("定时任务调度器已启动")
        print("已配置任务:")
        for job in self.scheduler.get_jobs():
            print(f"  - {job.name}: {job.trigger}")
        print("按 Ctrl+C 停止调度器")
        print("="*60 + "\n")
        try:
            self.scheduler.start()
        except (KeyboardInterrupt, SystemExit):
            print("\n调度器已停止")

    def run_manual(self, task_name):
        print(f"\n手动执行任务: {task_name}")
        if task_name == 'credit_update':
            self.daily_credit_update_task()
        elif task_name == 'collection_scan':
            self.daily_collection_scan_task()
        elif task_name == 'monthly_report':
            self.monthly_report_task()
        elif task_name == 'crm_sync':
            self.crm_transaction_sync_task()
        elif task_name == 'finance_sync':
            self.finance_payment_sync_task()
        elif task_name == 'mock_sync':
            self.mock_data_sync_task()
        elif task_name == 'all_sync':
            self.crm_transaction_sync_task()
            self.finance_payment_sync_task()
            self.daily_credit_update_task()
            self.daily_collection_scan_task()
        else:
            print(f"未知任务: {task_name}")
            print("支持的任务: credit_update, collection_scan, monthly_report, crm_sync, finance_sync, mock_sync, all_sync")
        return True


def start_scheduler():
    scheduler = TaskScheduler()
    scheduler.start()


def run_manual_task(task_name):
    scheduler = TaskScheduler()
    return scheduler.run_manual(task_name)
