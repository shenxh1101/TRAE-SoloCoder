import os
import sys
import logging
import signal
import subprocess
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List, Callable
from pathlib import Path

try:
    from apscheduler.schedulers.background import BackgroundScheduler
    from apscheduler.triggers.cron import CronTrigger
    from apscheduler.triggers.interval import IntervalTrigger
    APSCHEDULER_AVAILABLE = True
except ImportError:
    APSCHEDULER_AVAILABLE = False
    BackgroundScheduler = None
    CronTrigger = None
    IntervalTrigger = None

from .config import ConfigManager
from .logger import get_logger, log_operation
from .backup import BackupManager
from .retention import RetentionManager
from .report import ReportGenerator
from .notifier import Notifier


class BackupScheduler:
    def __init__(self):
        self._config = ConfigManager()
        self._logger = get_logger("backup_system.scheduler")
        self._backup = BackupManager()
        self._retention = RetentionManager()
        self._report = ReportGenerator()
        self._notifier = Notifier()
        
        self._scheduler: Optional[BackgroundScheduler] = None
        self._running = False
        self._jobs: Dict[str, str] = {}
        
        signal.signal(signal.SIGINT, self._handle_shutdown)
        signal.signal(signal.SIGTERM, self._handle_shutdown)
    
    def _handle_shutdown(self, signum, frame):
        self._logger.info(f"Received signal {signum}, shutting down scheduler...")
        self.stop()
        sys.exit(0)
    
    def _scheduled_backup(self, system_name: str) -> None:
        try:
            self._logger.info(f"Starting scheduled backup for system: {system_name}")
            log_operation("scheduled_backup", system_name, "start", 
                         f"Starting scheduled backup for {system_name}")
            
            result = self._backup.create_backup(system_name, backup_type="auto")
            status = result.get('status', 'unknown')
            
            if status in ['success', 'skipped']:
                if status == 'success':
                    self._logger.info(f"Scheduled backup completed for {system_name}: "
                                    f"version={result.get('backup_version')}")
                    log_operation("scheduled_backup", system_name, "success",
                                 f"Scheduled backup completed: {result.get('backup_version')}",
                                 {"backup_version": result.get('backup_version')})
                else:
                    self._logger.info(f"Scheduled backup skipped for {system_name}: "
                                    f"{result.get('message')}")
                    log_operation("scheduled_backup", system_name, "success",
                                 f"Scheduled backup skipped: {result.get('message')}",
                                 {"reason": result.get('message')})
            else:
                self._logger.error(f"Scheduled backup failed for {system_name}: "
                                 f"{result.get('error_message')}")
                log_operation("scheduled_backup", system_name, "error",
                             f"Scheduled backup failed: {result.get('error_message')}",
                             {"error": result.get('error_message')})
                
                if self._notifier:
                    self._notifier.send_backup_failure(
                        system_name, 
                        result.get('backup_type', 'auto'),
                        result.get('error_message', 'Unknown error'),
                        result.get('retry_count', 0)
                    )
                    
        except Exception as e:
            self._logger.exception(f"Error in scheduled backup for {system_name}: {e}")
            log_operation("scheduled_backup", system_name, "error",
                         f"Exception in scheduled backup: {str(e)}",
                         {"error": str(e)})
    
    def _scheduled_retention_cleanup(self) -> None:
        try:
            self._logger.info("Starting scheduled retention cleanup")
            log_operation("scheduled_cleanup", "all", "start", 
                         "Starting scheduled retention cleanup")
            
            result = self._retention.cleanup_expired(dry_run=False)
            
            cleaned = result.get('cleaned', [])
            if cleaned:
                self._logger.info(f"Retention cleanup completed: {len(cleaned)} backups cleaned")
                log_operation("scheduled_cleanup", "all", "success",
                             f"Cleaned {len(cleaned)} expired backups",
                             {"count": len(cleaned), "cleaned": cleaned})
                
                if self._notifier:
                    self._notifier.send_cleanup_notification(
                        cleaned_count=len(cleaned),
                        total_freed=sum(b.get('size', 0) for b in cleaned)
                    )
            else:
                self._logger.info("Retention cleanup completed: no expired backups found")
                log_operation("scheduled_cleanup", "all", "success",
                             "No expired backups found")
                             
        except Exception as e:
            self._logger.exception(f"Error in scheduled retention cleanup: {e}")
            log_operation("scheduled_cleanup", "all", "error",
                         f"Exception in retention cleanup: {str(e)}",
                         {"error": str(e)})
    
    def _scheduled_weekly_report(self) -> None:
        try:
            self._logger.info("Starting scheduled weekly report generation")
            log_operation("scheduled_report", "all", "start", 
                         "Starting scheduled weekly report generation")
            
            end_date = datetime.now()
            start_date = end_date - timedelta(days=7)
            
            result = self._report.generate_report(
                report_type="weekly",
                start_date=start_date,
                end_date=end_date,
                output_format="both"
            )
            
            if result.get("success"):
                self._logger.info(f"Weekly report generated: {result.get('file_paths')}")
                log_operation("scheduled_report", "all", "success",
                             "Weekly report generated",
                             {"files": result.get('file_paths', [])})
                
                if self._notifier:
                    self._notifier.send_weekly_report(
                        report_data=result.get('report_data', {}),
                        report_paths=result.get('file_paths', [])
                    )
            else:
                self._logger.error(f"Weekly report generation failed: {result.get('error')}")
                log_operation("scheduled_report", "all", "error",
                             f"Report generation failed: {result.get('error')}",
                             {"error": result.get('error')})
                             
        except Exception as e:
            self._logger.exception(f"Error in scheduled weekly report: {e}")
            log_operation("scheduled_report", "all", "error",
                         f"Exception in report generation: {str(e)}",
                         {"error": str(e)})
    
    def _parse_cron_expression(self, cron_expr: str) -> Dict[str, Any]:
        parts = cron_expr.strip().split()
        if len(parts) != 5:
            raise ValueError(f"Invalid cron expression: {cron_expr}. Expected 5 fields.")
        
        return {
            'minute': parts[0],
            'hour': parts[1],
            'day': parts[2],
            'month': parts[3],
            'day_of_week': parts[4]
        }
    
    def _get_report_cron(self) -> Dict[str, Any]:
        schedule = self._config.app_config.scheduler.weekly_report_schedule
        return self._parse_cron_expression(schedule)
    
    def _get_retention_cron(self) -> Dict[str, Any]:
        schedule = self._config.app_config.scheduler.retention_cleanup_schedule
        return self._parse_cron_expression(schedule)
    
    def start(self) -> None:
        if not APSCHEDULER_AVAILABLE:
            self._logger.error("APScheduler is not installed. Please install it with: "
                             "pip install APScheduler>=3.10.0")
            raise ImportError("APScheduler is required for scheduling functionality")
        
        if self._running:
            self._logger.warning("Scheduler is already running")
            return
        
        scheduler_config = self._config.app_config.scheduler
        self._scheduler = BackgroundScheduler(
            job_defaults={
                'coalesce': scheduler_config.coalesce,
                'max_instances': scheduler_config.max_instances,
                'misfire_grace_time': scheduler_config.misfire_grace_time
            },
            timezone=scheduler_config.timezone
        )
        
        systems = self._config.get_systems()
        
        for system_name, system_config in systems.items():
            if not system_config.backup_schedule:
                continue
            
            try:
                cron_params = self._parse_cron_expression(system_config.backup_schedule)
                job_id = f"backup_{system_name}"
                
                trigger = CronTrigger(**cron_params)
                self._scheduler.add_job(
                    self._scheduled_backup,
                    trigger=trigger,
                    args=[system_name],
                    id=job_id,
                    name=f"Backup for {system_name}",
                    replace_existing=True
                )
                
                self._jobs[job_id] = system_config.backup_schedule
                self._logger.info(f"Scheduled backup job for {system_name}: "
                                f"{system_config.backup_schedule}")
                
            except Exception as e:
                self._logger.error(f"Failed to schedule backup for {system_name}: {e}")
        
        try:
            retention_cron = self._get_retention_cron()
            trigger = CronTrigger(**retention_cron)
            self._scheduler.add_job(
                self._scheduled_retention_cleanup,
                trigger=trigger,
                id="retention_cleanup",
                name="Daily retention cleanup",
                replace_existing=True
            )
            self._jobs["retention_cleanup"] = self._config.app_config.scheduler.retention_cleanup_schedule
            self._logger.info(f"Scheduled retention cleanup: {self._config.app_config.scheduler.retention_cleanup_schedule}")
        except Exception as e:
            self._logger.error(f"Failed to schedule retention cleanup: {e}")
        
        try:
            report_cron = self._get_report_cron()
            trigger = CronTrigger(**report_cron)
            self._scheduler.add_job(
                self._scheduled_weekly_report,
                trigger=trigger,
                id="weekly_report",
                name="Weekly backup report",
                replace_existing=True
            )
            self._jobs["weekly_report"] = self._config.app_config.scheduler.weekly_report_schedule
            self._logger.info(f"Scheduled weekly report: {self._config.app_config.scheduler.weekly_report_schedule}")
        except Exception as e:
            self._logger.error(f"Failed to schedule weekly report: {e}")
        
        self._scheduler.start()
        self._running = True
        self._logger.info("Backup scheduler started successfully")
        log_operation("scheduler", "system", "start", "Backup scheduler started",
                     {"jobs": len(self._jobs)})
    
    def stop(self) -> None:
        if not self._running:
            return
        
        if self._scheduler:
            self._scheduler.shutdown(wait=True)
        
        self._running = False
        self._logger.info("Backup scheduler stopped")
        log_operation("scheduler", "system", "stop", "Backup scheduler stopped")
    
    def list_jobs(self) -> List[Dict[str, Any]]:
        jobs = []
        
        for job_id, cron_expr in self._jobs.items():
            job_info = {
                'id': job_id,
                'schedule': cron_expr
            }
            
            if self._scheduler and self._running:
                job = self._scheduler.get_job(job_id)
                if job:
                    job_info['name'] = job.name
                    job_info['next_run'] = job.next_run_time.strftime('%Y-%m-%d %H:%M:%S') if job.next_run_time else None
            
            jobs.append(job_info)
        
        return jobs
    
    def run_job_now(self, job_id: str) -> Dict[str, Any]:
        if not self._scheduler or not self._running:
            return {"success": False, "error": "Scheduler is not running"}
        
        job = self._scheduler.get_job(job_id)
        if not job:
            return {"success": False, "error": f"Job not found: {job_id}"}
        
        try:
            job.modify(next_run_time=datetime.now())
            return {"success": True, "message": f"Job {job_id} scheduled to run immediately"}
        except Exception as e:
            return {"success": False, "error": str(e)}


class CronManager:
    def __init__(self):
        self._config = ConfigManager()
        self._logger = get_logger("backup_system.cron")
        self._script_path = os.path.abspath(sys.argv[0])
        self._python_path = sys.executable
    
    def _get_cron_identifier(self) -> str:
        return f"# BACKUP_SYSTEM_CRON"
    
    def _build_backup_command(self, system_name: str) -> str:
        return f"{self._python_path} {self._script_path} backup auto {system_name}"
    
    def _build_cleanup_command(self) -> str:
        return f"{self._python_path} {self._script_path} retention cleanup --confirm"
    
    def _build_report_command(self) -> str:
        return f"{self._python_path} {self._script_path} report weekly --format both"
    
    def _read_crontab(self) -> str:
        try:
            result = subprocess.run(
                ['crontab', '-l'],
                capture_output=True,
                text=True,
                check=False
            )
            return result.stdout if result.returncode == 0 else ""
        except Exception as e:
            self._logger.warning(f"Failed to read crontab: {e}")
            return ""
    
    def _write_crontab(self, content: str) -> bool:
        try:
            process = subprocess.Popen(
                ['crontab', '-'],
                stdin=subprocess.PIPE,
                text=True
            )
            process.communicate(input=content)
            return process.returncode == 0
        except Exception as e:
            self._logger.error(f"Failed to write crontab: {e}")
            return False
    
    def install(self) -> Dict[str, Any]:
        current_crontab = self._read_crontab()
        identifier = self._get_cron_identifier()
        
        if identifier in current_crontab:
            return {"success": False, "error": "Backup system cron entries already exist. Use update or uninstall first."}
        
        new_entries = [f"\n{identifier} - DO NOT EDIT MANUALLY"]
        
        systems = self._config.get_systems()
        for system_name, system_config in systems.items():
            if system_config.backup_schedule:
                cmd = self._build_backup_command(system_name)
                log_path = os.path.join(
                    os.path.dirname(self._script_path),
                    'logs',
                    f'cron_backup_{system_name}.log'
                )
                entry = f"{system_config.backup_schedule} {cmd} >> {log_path} 2>&1"
                new_entries.append(entry)
                self._logger.info(f"Added cron entry for {system_name}: {entry}")
        
        retention_cron = self._config.app_config.scheduler.retention_cleanup_schedule
        retention_cmd = self._build_cleanup_command()
        retention_log = os.path.join(
            os.path.dirname(self._script_path),
            'logs',
            'cron_cleanup.log'
        )
        new_entries.append(f"{retention_cron} {retention_cmd} >> {retention_log} 2>&1")
        
        report_cron = self._config.app_config.scheduler.weekly_report_schedule
        report_cmd = self._build_report_command()
        report_log = os.path.join(
            os.path.dirname(self._script_path),
            'logs',
            'cron_report.log'
        )
        new_entries.append(f"{report_cron} {report_cmd} >> {report_log} 2>&1")
        
        new_entries.append(f"{identifier} - END\n")
        
        new_crontab = current_crontab + "\n".join(new_entries)
        
        if self._write_crontab(new_crontab):
            self._logger.info("Successfully installed cron entries")
            log_operation("cron_install", "system", "success", 
                         f"Installed {len(systems) + 2} cron entries")
            return {
                "success": True,
                "entries": len(new_entries) - 2,
                "systems": list(systems.keys())
            }
        else:
            return {"success": False, "error": "Failed to write crontab"}
    
    def uninstall(self) -> Dict[str, Any]:
        current_crontab = self._read_crontab()
        identifier = self._get_cron_identifier()
        
        if identifier not in current_crontab:
            return {"success": False, "error": "No backup system cron entries found"}
        
        lines = current_crontab.split('\n')
        new_lines = []
        in_backup_section = False
        removed_count = 0
        
        for line in lines:
            if line.strip().startswith(identifier):
                in_backup_section = not in_backup_section
                continue
            
            if in_backup_section:
                removed_count += 1
                continue
            
            new_lines.append(line)
        
        new_crontab = '\n'.join(new_lines).strip()
        
        if self._write_crontab(new_crontab):
            self._logger.info(f"Successfully uninstalled {removed_count} cron entries")
            log_operation("cron_uninstall", "system", "success", 
                         f"Uninstalled {removed_count} cron entries")
            return {"success": True, "removed": removed_count}
        else:
            return {"success": False, "error": "Failed to write crontab"}
    
    def list(self) -> List[Dict[str, Any]]:
        current_crontab = self._read_crontab()
        identifier = self._get_cron_identifier()
        
        entries = []
        in_backup_section = False
        
        for line in current_crontab.split('\n'):
            stripped = line.strip()
            
            if stripped.startswith(identifier):
                in_backup_section = not in_backup_section
                continue
            
            if in_backup_section and stripped and not stripped.startswith('#'):
                parts = stripped.split(None, 5)
                if len(parts) >= 6:
                    entries.append({
                        'schedule': ' '.join(parts[:5]),
                        'command': parts[5]
                    })
        
        return entries
