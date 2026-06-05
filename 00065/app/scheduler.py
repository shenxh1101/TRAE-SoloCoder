from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from .database import AsyncSessionLocal
from . import tasks


async def calculate_daily_usage_task():
    async with AsyncSessionLocal() as db:
        try:
            await tasks.calculate_daily_usage_task(db=db)
            print(f"[{datetime.now()}] Daily usage calculation completed")
        except Exception as e:
            print(f"[{datetime.now()}] Error in daily usage calculation: {e}")


async def check_balance_alerts_task():
    async with AsyncSessionLocal() as db:
        try:
            await tasks.check_balance_alerts_task(db=db)
            print(f"[{datetime.now()}] Balance alerts check completed")
        except Exception as e:
            print(f"[{datetime.now()}] Error in balance alerts check: {e}")


async def check_usage_spike_task():
    async with AsyncSessionLocal() as db:
        try:
            await tasks.check_usage_spike_task(db=db)
            print(f"[{datetime.now()}] Usage spike check completed")
        except Exception as e:
            print(f"[{datetime.now()}] Error in usage spike check: {e}")


async def generate_monthly_bills_task():
    async with AsyncSessionLocal() as db:
        try:
            now = datetime.now()
            await tasks.generate_monthly_bills_task(db=db, year=now.year, month=now.month)
            print(f"[{datetime.now()}] Monthly bills generation completed")
        except Exception as e:
            print(f"[{datetime.now()}] Error in monthly bills generation: {e}")


async def predict_usage_task():
    async with AsyncSessionLocal() as db:
        try:
            await tasks.predict_usage_task(db=db)
            print(f"[{datetime.now()}] Usage prediction completed")
        except Exception as e:
            print(f"[{datetime.now()}] Error in usage prediction: {e}")


def start_scheduler():
    scheduler = AsyncIOScheduler()
    
    scheduler.add_job(
        calculate_daily_usage_task,
        trigger=CronTrigger(hour=23, minute=55),
        id="daily_usage_calc"
    )
    
    scheduler.add_job(
        check_balance_alerts_task,
        trigger=CronTrigger(hour="*/6"),
        id="balance_alerts_check"
    )
    
    scheduler.add_job(
        check_usage_spike_task,
        trigger=CronTrigger(hour=23, minute=30),
        id="usage_spike_check"
    )
    
    scheduler.add_job(
        generate_monthly_bills_task,
        trigger=CronTrigger(day=1, hour=1, minute=0),
        id="monthly_bills_gen"
    )
    
    scheduler.add_job(
        predict_usage_task,
        trigger=CronTrigger(day=25, hour=2, minute=0),
        id="usage_prediction"
    )
    
    scheduler.start()
    print("Scheduler started with the following jobs:")
    print("  - Daily usage calculation: 23:55 every day")
    print("  - Balance alerts check: every 6 hours")
    print("  - Usage spike check: 23:30 every day")
    print("  - Monthly bills generation: 01:00 on 1st of every month")
    print("  - Usage prediction: 02:00 on 25th of every month")
    
    return scheduler
