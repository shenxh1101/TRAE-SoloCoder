#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
定时调度模块 - 使用APScheduler实现自动化任务调度
"""

import os
import logging
from datetime import datetime
from models import init_db
from review_manager import ReviewManager
from lifecycle_manager import LifecycleManager
from report_manager import ReportManager
from config import SCHEDULER_CONFIG, EXPORT_CONFIG

try:
    from apscheduler.schedulers.background import BackgroundScheduler
    from apscheduler.triggers.cron import CronTrigger
    from apscheduler.triggers.interval import IntervalTrigger
    from apscheduler.events import EVENT_JOB_EXECUTED, EVENT_JOB_ERROR
    APSCHEDULER_AVAILABLE = True
except ImportError:
    APSCHEDULER_AVAILABLE = False
    print("警告: APScheduler 未安装，请运行: pip install apscheduler")

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('DocumentScheduler')

class DocumentScheduler:
    def __init__(self):
        if not APSCHEDULER_AVAILABLE:
            raise ImportError("APScheduler 未安装，请先安装依赖")
        
        init_db()
        
        self.review_manager = ReviewManager()
        self.lifecycle_manager = LifecycleManager()
        self.report_manager = ReportManager()
        
        timezone = SCHEDULER_CONFIG.get('timezone', 'Asia/Shanghai')
        self.scheduler = BackgroundScheduler(timezone=timezone)
        
        self._setup_job_listeners()
        self._register_jobs()
    
    def _setup_job_listeners(self):
        """设置任务监听器"""
        def job_executed(event):
            logger.info(f"任务执行成功: {event.job_id}")
        
        def job_error(event):
            logger.error(f"任务执行失败: {event.job_id}, 错误: {event.exception}")
            if event.traceback:
                logger.error(f"堆栈跟踪: {event.traceback}")
        
        self.scheduler.add_listener(job_executed, EVENT_JOB_EXECUTED)
        self.scheduler.add_listener(job_error, EVENT_JOB_ERROR)
    
    def _register_jobs(self):
        """注册所有定时任务"""
        jobs_config = SCHEDULER_CONFIG.get('jobs', {})
        
        for job_name, job_config in jobs_config.items():
            if not job_config.get('enabled', True):
                logger.info(f"跳过禁用的任务: {job_name}")
                continue
            
            trigger_type = job_config.get('trigger', 'cron')
            job_func = getattr(self, f'job_{job_name}', None)
            
            if not job_func:
                logger.warning(f"未找到任务处理函数: {job_name}")
                continue
            
            try:
                if trigger_type == 'cron':
                    trigger = CronTrigger(
                        year=job_config.get('year'),
                        month=job_config.get('month'),
                        day=job_config.get('day'),
                        week=job_config.get('week'),
                        day_of_week=job_config.get('day_of_week'),
                        hour=job_config.get('hour', 0),
                        minute=job_config.get('minute', 0),
                        second=job_config.get('second', 0)
                    )
                elif trigger_type == 'interval':
                    trigger = IntervalTrigger(
                        weeks=job_config.get('weeks', 0),
                        days=job_config.get('days', 0),
                        hours=job_config.get('hours', 0),
                        minutes=job_config.get('minutes', 0),
                        seconds=job_config.get('seconds', 0)
                    )
                else:
                    logger.warning(f"不支持的触发器类型: {trigger_type}")
                    continue
                
                self.scheduler.add_job(
                    func=job_func,
                    trigger=trigger,
                    id=job_name,
                    name=job_config.get('description', job_name),
                    replace_existing=True
                )
                
                logger.info(f"已注册任务: {job_name} - {job_config.get('description', '')}")
                
            except Exception as e:
                logger.error(f"注册任务失败 {job_name}: {str(e)}")
    
    def job_daily_maintenance(self):
        """每日维护任务"""
        logger.info("开始执行每日维护任务...")
        print(f"\n{'='*60}")
        print(f"[定时任务] 每日维护 - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"{'='*60}")
        
        try:
            timeout_result = self.review_manager.check_timeout_reviews()
            print(f"  ✓ 检查超时审核: {timeout_result['message']}")
            
            expiring_result = self.lifecycle_manager.scan_expiring_documents()
            print(f"  ✓ 扫描即将过期: {expiring_result['message']}")
            
            expired_result = self.lifecycle_manager.take_down_expired_documents()
            print(f"  ✓ 下架过期文档: {expired_result['message']}")
            
            logger.info("每日维护任务执行完成")
            print(f"  ✓ 每日维护任务执行完成")
            return True
        except Exception as e:
            logger.error(f"每日维护任务失败: {str(e)}")
            print(f"  ✗ 每日维护任务失败: {str(e)}")
            return False
    
    def job_expiry_scan(self):
        """扫描即将过期文档"""
        logger.info("开始执行过期文档扫描任务...")
        print(f"\n{'='*60}")
        print(f"[定时任务] 过期文档扫描 - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"{'='*60}")
        
        try:
            result = self.lifecycle_manager.scan_expiring_documents()
            print(f"  ✓ {result['message']}")
            logger.info(f"过期文档扫描完成: {result['message']}")
            return True
        except Exception as e:
            logger.error(f"过期文档扫描失败: {str(e)}")
            print(f"  ✗ 扫描失败: {str(e)}")
            return False
    
    def job_timeout_check(self):
        """检查超时审核"""
        logger.info("开始执行超时审核检查任务...")
        print(f"\n{'='*60}")
        print(f"[定时任务] 超时审核检查 - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"{'='*60}")
        
        try:
            result = self.review_manager.check_timeout_reviews()
            print(f"  ✓ {result['message']}")
            logger.info(f"超时审核检查完成: {result['message']}")
            return True
        except Exception as e:
            logger.error(f"超时审核检查失败: {str(e)}")
            print(f"  ✗ 检查失败: {str(e)}")
            return False
    
    def job_weekly_report(self):
        """生成周质量报告并导出"""
        logger.info("开始生成周质量报告...")
        print(f"\n{'='*60}")
        print(f"[定时任务] 周质量报告生成 - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"{'='*60}")
        
        try:
            report = self.report_manager.generate_weekly_quality_report()
            
            if not report['success']:
                print(f"  ✗ 报告生成失败")
                return False
            
            data = report['report_data']
            print(f"  ✓ 报告生成成功，周期: {data['report_period']['start_date']} ~ {data['report_period']['end_date']}")
            print(f"    - 审核通过率: {data['review_stats']['approval_rate']}%")
            print(f"    - 平均审核时长: {data['review_stats']['avg_review_hours']}小时")
            print(f"    - 已发布文档: {data['expiry_stats']['total_published']}个")
            
            pdf_result = self.report_manager.export_weekly_report_to_pdf(data)
            if pdf_result['success']:
                print(f"  ✓ PDF已导出: {pdf_result['file_path']}")
            else:
                print(f"  ! PDF导出失败: {pdf_result['error']}")
            
            excel_data = []
            for key, value in data['review_stats'].items():
                excel_data.append({'指标': key, '数值': value})
            for key, value in data['expiry_stats'].items():
                excel_data.append({'指标': key, '数值': value})
            
            excel_result = self.report_manager.export_to_excel(
                excel_data, 
                filename=f'weekly_report_{datetime.now().strftime("%Y%m%d")}.xlsx',
                sheet_name='周质量报告'
            )
            if excel_result['success']:
                print(f"  ✓ Excel已导出: {excel_result['file_path']}")
            else:
                print(f"  ! Excel导出失败: {excel_result['error']}")
            
            logger.info("周质量报告生成完成")
            return True
        except Exception as e:
            logger.error(f"周质量报告生成失败: {str(e)}")
            print(f"  ✗ 生成失败: {str(e)}")
            return False
    
    def job_expired_takedown(self):
        """自动下架过期文档"""
        logger.info("开始执行过期文档下架任务...")
        print(f"\n{'='*60}")
        print(f"[定时任务] 过期文档下架 - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"{'='*60}")
        
        try:
            result = self.lifecycle_manager.take_down_expired_documents()
            print(f"  ✓ {result['message']}")
            logger.info(f"过期文档下架完成: {result['message']}")
            return True
        except Exception as e:
            logger.error(f"过期文档下架失败: {str(e)}")
            print(f"  ✗ 下架失败: {str(e)}")
            return False
    
    def start(self):
        """启动调度器"""
        if not self.scheduler.running:
            self.scheduler.start()
            logger.info("调度器已启动")
            print("\n" + "="*60)
            print("文档管理系统定时调度器已启动")
            print("="*60)
            print("\n已注册的任务:")
            for job in self.scheduler.get_jobs():
                print(f"  - {job.id}: {job.name}")
                print(f"    下次执行: {job.next_run_time}")
            print("\n按 Ctrl+C 停止调度器...")
    
    def shutdown(self):
        """关闭调度器"""
        if self.scheduler.running:
            self.scheduler.shutdown()
            logger.info("调度器已关闭")
            print("\n调度器已关闭")
    
    def run_job_now(self, job_name):
        """立即执行指定任务"""
        job = self.scheduler.get_job(job_name)
        if job:
            logger.info(f"立即执行任务: {job_name}")
            job.func()
            return True
        else:
            logger.warning(f"未找到任务: {job_name}")
            return False
    
    def list_jobs(self):
        """列出所有任务"""
        jobs = []
        for job in self.scheduler.get_jobs():
            next_run = job.next_run_time if hasattr(job, 'next_run_time') else '未设置'
            jobs.append({
                'id': job.id,
                'name': job.name,
                'next_run_time': str(next_run),
                'trigger': str(job.trigger)
            })
        return jobs

def run_scheduler():
    """运行调度器主函数"""
    try:
        scheduler = DocumentScheduler()
        scheduler.start()
        
        import time
        try:
            while True:
                time.sleep(1)
        except (KeyboardInterrupt, SystemExit):
            scheduler.shutdown()
            
    except ImportError as e:
        print(f"错误: {e}")
        print("请先安装依赖: pip install apscheduler")
    except Exception as e:
        print(f"启动调度器失败: {e}")

def test_all_jobs():
    """测试所有任务"""
    print("="*60)
    print("测试所有定时任务")
    print("="*60)
    
    scheduler = DocumentScheduler()
    
    print("\n1. 测试过期文档扫描...")
    scheduler.job_expiry_scan()
    
    print("\n2. 测试超时审核检查...")
    scheduler.job_timeout_check()
    
    print("\n3. 测试周质量报告生成...")
    scheduler.job_weekly_report()
    
    print("\n4. 测试每日维护...")
    scheduler.job_daily_maintenance()
    
    print("\n5. 测试过期文档下架...")
    scheduler.job_expired_takedown()
    
    print("\n" + "="*60)
    print("所有任务测试完成!")
    print("="*60)

if __name__ == '__main__':
    import sys
    
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == 'start':
            run_scheduler()
        elif command == 'test':
            test_all_jobs()
        elif command == 'run':
            if len(sys.argv) > 2:
                job_name = sys.argv[2]
                scheduler = DocumentScheduler()
                scheduler.run_job_now(job_name)
            else:
                print("请指定任务名称，可用任务:")
                for job in ['daily_maintenance', 'expiry_scan', 'timeout_check', 'weekly_report', 'expired_takedown']:
                    print(f"  - {job}")
        elif command == 'list':
            scheduler = DocumentScheduler()
            scheduler.scheduler.start()
            jobs = scheduler.list_jobs()
            print("\n已注册的任务:")
            for job in jobs:
                print(f"\n{job['id']}: {job['name']}")
                print(f"  下次执行: {job['next_run_time']}")
                print(f"  触发器: {job['trigger']}")
            scheduler.scheduler.shutdown()
        else:
            print("用法:")
            print("  python scheduler.py start    # 启动调度器")
            print("  python scheduler.py test     # 测试所有任务")
            print("  python scheduler.py run <job_name>  # 立即执行指定任务")
            print("  python scheduler.py list     # 列出所有任务")
    else:
        print("用法:")
        print("  python scheduler.py start    # 启动调度器")
        print("  python scheduler.py test     # 测试所有任务")
        print("  python scheduler.py run <job_name>  # 立即执行指定任务")
        print("  python scheduler.py list     # 列出所有任务")
