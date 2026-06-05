#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
APScheduler定时任务调度器
"""

import os
import sys
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.models.database import SessionLocal
from src.modules import ReportGenerator, LearningMonitor
from src.utils.logger import log_info, log_error

scheduler = BackgroundScheduler(timezone='Asia/Shanghai')

def generate_monthly_report_task():
    """每月1日凌晨2点自动生成上月培训报告"""
    try:
        log_info("开始执行月度报告定时任务")
        
        db = SessionLocal()
        report_generator = ReportGenerator(db)
        
        now = datetime.now()
        last_month = now.month - 1
        year = now.year
        if last_month == 0:
            last_month = 12
            year = now.year - 1
        
        report, report_data, msg = report_generator.generate_monthly_report(
            year=year,
            month=last_month,
            operator='scheduler'
        )
        
        if report:
            log_info(f"月度报告生成成功: {report.report_code}")
        else:
            log_info(f"月度报告生成完成: {msg}")
            
    except Exception as e:
        log_error("月度报告定时任务执行失败", e)
    finally:
        db.close()

def collect_study_time_task():
    """每30分钟自动采集学习时长"""
    try:
        from src.models.models import TrainingPlan
        db = SessionLocal()
        learning_monitor = LearningMonitor(db)
        
        active_plans = db.query(TrainingPlan).filter(
            TrainingPlan.monitoring_status == 'monitoring'
        ).all()
        
        for plan in active_plans:
            log_info(f"自动采集培训计划 {plan.plan_code} 的学习时长")
            results = learning_monitor.batch_collect_study_time(
                training_plan_id=plan.id,
                operator='scheduler'
            )
            
            from web.app import socketio
            socketio.emit('learning_update', {
                'plan_id': plan.id,
                'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                'records_count': len(results)
            }, namespace='/learning')
            
    except Exception as e:
        log_error("学习时长采集任务执行失败", e)
    finally:
        db.close()

def auto_issue_certificates_task():
    """每天凌晨1点自动颁发证书"""
    try:
        log_info("开始执行自动颁发证书定时任务")
        
        db = SessionLocal()
        from src.modules import CertificateManager
        
        certificate_manager = CertificateManager(db)
        results = certificate_manager.auto_issue_certificates(operator='scheduler')
        
        if results:
            success_count = len([r for r in results if r.get('success')])
            log_info(f"自动颁发证书完成，成功: {success_count}/{len(results)}")
        else:
            log_info("没有需要颁发的证书")
            
    except Exception as e:
        log_error("自动颁发证书任务执行失败", e)
    finally:
        db.close()

def init_scheduler():
    """初始化调度器"""
    scheduler.add_job(
        generate_monthly_report_task,
        trigger=CronTrigger(day=1, hour=2, minute=0),
        id='monthly_report_job',
        name='月度报告生成',
        replace_existing=True
    )
    
    scheduler.add_job(
        collect_study_time_task,
        trigger='interval',
        minutes=30,
        id='collect_study_time_job',
        name='每30分钟采集学习时长',
        replace_existing=True
    )
    
    scheduler.add_job(
        auto_issue_certificates_task,
        trigger=CronTrigger(hour=1, minute=0),
        id='auto_issue_certificates_job',
        name='自动颁发证书',
        replace_existing=True
    )
    
    log_info("定时任务调度器已初始化")
    log_info(f"已注册任务: {[job.name for job in scheduler.get_jobs()]}")

def start_scheduler():
    """启动调度器"""
    if not scheduler.running:
        init_scheduler()
        scheduler.start()
        log_info("定时任务调度器已启动")

def stop_scheduler():
    """停止调度器"""
    if scheduler.running:
        scheduler.shutdown()
        log_info("定时任务调度器已停止")
