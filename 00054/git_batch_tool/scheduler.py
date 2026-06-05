import time
import logging
import os
import sys
from datetime import datetime
from typing import List, Dict, Optional, TextIO

import schedule

from .config import ConfigManager
from .executor import BatchExecutor
from .reporter import Reporter


class Scheduler:
    def __init__(self, config_path: str, cron_expression: str, 
                 log_dir: str = "./logs", max_workers: int = 4,
                 exclude_tags: List[str] = None, include_tags: List[str] = None,
                 exclude_repos: List[str] = None, log_file: str = None,
                 daemon: bool = False, pid_file: str = None):
        self.config_path = config_path
        self.cron_expression = cron_expression
        self.log_dir = log_dir
        self.max_workers = max_workers
        self.exclude_tags = exclude_tags
        self.include_tags = include_tags
        self.exclude_repos = exclude_repos
        self.log_file = log_file
        self.daemon = daemon
        self.pid_file = pid_file
        self.logger = None
        self._setup_logging()
        self._setup_pid_file()

    def _setup_logging(self):
        if not os.path.exists(self.log_dir):
            os.makedirs(self.log_dir)
        
        if not self.log_file:
            self.log_file = os.path.join(self.log_dir, f"git_batch_{datetime.now().strftime('%Y%m%d')}.log")
        
        self.logger = logging.getLogger("git_batch_scheduler")
        self.logger.setLevel(logging.INFO)
        self.logger.propagate = False
        
        if not self.logger.handlers:
            file_handler = logging.FileHandler(self.log_file)
            file_handler.setLevel(logging.INFO)
            file_formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
            file_handler.setFormatter(file_formatter)
            self.logger.addHandler(file_handler)
            
            if not self.daemon:
                console_handler = logging.StreamHandler()
                console_handler.setLevel(logging.INFO)
                console_formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
                console_handler.setFormatter(console_formatter)
                self.logger.addHandler(console_handler)

    def _setup_pid_file(self):
        if self.pid_file:
            pid_dir = os.path.dirname(self.pid_file)
            if pid_dir and not os.path.exists(pid_dir):
                os.makedirs(pid_dir)
            with open(self.pid_file, 'w') as f:
                f.write(str(os.getpid()))

    def _cleanup_pid_file(self):
        if self.pid_file and os.path.exists(self.pid_file):
            os.remove(self.pid_file)

    def _pull_all_repos(self):
        task_start_time = datetime.now()
        self.logger.info("=" * 60)
        self.logger.info(f"Starting scheduled git pull task at {task_start_time}")
        self.logger.info("=" * 60)
        
        try:
            config_manager = ConfigManager(self.config_path)
            repos = config_manager.get_repos(
                exclude_tags=self.exclude_tags,
                include_tags=self.include_tags,
                exclude_repos=self.exclude_repos
            )
            
            if not repos:
                self.logger.warning("No repositories found to process")
                return
            
            self.logger.info(f"Processing {len(repos)} repositories")
            
            executor = BatchExecutor(max_workers=self.max_workers)
            reporter = executor.execute_pull(repos)
            
            success_count = sum(1 for r in reporter.results if r["success"])
            fail_count = len(reporter.results) - success_count
            
            self.logger.info(f"Task completed: {success_count} success, {fail_count} failed")
            
            for result in reporter.results:
                if result["success"]:
                    self.logger.info(f"SUCCESS - {result['repo_name']}: {result['output'][:100]}")
                else:
                    self.logger.error(f"FAILED - {result['repo_name']}: {result['error']}")
            
            report_path = os.path.join(
                self.log_dir, 
                f"report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            )
            reporter.export_report(report_path)
            self.logger.info(f"Report saved to {report_path}")
            
        except Exception as e:
            self.logger.error(f"Error in scheduled task: {str(e)}", exc_info=True)

    def _parse_cron(self, expression: str):
        parts = expression.strip().split()
        if len(parts) != 5:
            raise ValueError(f"Invalid cron expression: {expression}. Expected 5 parts.")
        return parts

    def daemonize(self):
        try:
            pid = os.fork()
            if pid > 0:
                sys.exit(0)
        except OSError as e:
            self.logger.error(f"Fork #1 failed: {e}")
            sys.exit(1)
        
        os.chdir("/")
        os.setsid()
        os.umask(0)
        
        try:
            pid = os.fork()
            if pid > 0:
                sys.exit(0)
        except OSError as e:
            self.logger.error(f"Fork #2 failed: {e}")
            sys.exit(1)
        
        sys.stdout.flush()
        sys.stderr.flush()
        
        with open('/dev/null', 'r') as devnull:
            os.dup2(devnull.fileno(), sys.stdin.fileno())
        with open('/dev/null', 'a+b') as devnull:
            os.dup2(devnull.fileno(), sys.stdout.fileno())
            os.dup2(devnull.fileno(), sys.stderr.fileno())

    def start(self):
        if self.daemon:
            self.daemonize()
        
        self.logger.info(f"Starting scheduler with cron expression: {self.cron_expression}")
        self.logger.info(f"Log file: {self.log_file}")
        if self.pid_file:
            self.logger.info(f"PID file: {self.pid_file}")
        
        minute, hour, day, month, day_of_week = self._parse_cron(self.cron_expression)
        
        if hour != "*" and minute != "*":
            schedule.every().day.at(f"{hour}:{minute}").do(self._pull_all_repos)
            self.logger.info(f"Scheduled job: daily at {hour}:{minute}")
        elif minute.startswith("*/"):
            interval = int(minute[2:])
            schedule.every(interval).minutes.do(self._pull_all_repos)
            self.logger.info(f"Scheduled job: every {interval} minutes")
        elif minute != "*" and minute.isdigit():
            schedule.every(int(minute)).minutes.do(self._pull_all_repos)
            self.logger.info(f"Scheduled job: every {minute} minutes")
        elif hour != "*":
            schedule.every().hour.at(f":00").do(self._pull_all_repos)
            self.logger.info("Scheduled job: every hour")
        else:
            schedule.every().hour.do(self._pull_all_repos)
            self.logger.info("Scheduled job: every hour")
        
        self.logger.info("Scheduler started. Press Ctrl+C to stop.")
        
        try:
            while True:
                schedule.run_pending()
                time.sleep(1)
        except KeyboardInterrupt:
            self.logger.info("Scheduler stopped by user")
        finally:
            self._cleanup_pid_file()
