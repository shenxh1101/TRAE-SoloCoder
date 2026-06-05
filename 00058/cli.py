#!/usr/bin/env python3
"""企业数据备份与恢复管理系统 - 命令行接口"""

import sys
import os
import argparse
import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from backup_system import __version__
from backup_system.config import ConfigManager
from backup_system.backup import BackupManager
from backup_system.restore import RestoreManager
from backup_system.verifier import VerificationManager
from backup_system.report import ReportGenerator
from backup_system.retention import RetentionManager
from backup_system.query import QueryManager
from backup_system.scheduler import BackupScheduler, CronManager, APSCHEDULER_AVAILABLE
from backup_system.logger import get_logger


class BackupCLI:
    def __init__(self):
        self._config = ConfigManager()
        self._backup = BackupManager()
        self._restore = RestoreManager()
        self._verify = VerificationManager()
        self._report = ReportGenerator()
        self._retention = RetentionManager()
        self._query = QueryManager()
        self._scheduler = None
        self._cron = CronManager()
        self._logger = get_logger("cli")

    def run(self):
        parser = self._create_parser()
        args = parser.parse_args()

        if hasattr(args, 'func'):
            try:
                args.func(args)
            except Exception as e:
                self._logger.error(f"Command failed: {e}")
                print(f"错误: {e}", file=sys.stderr)
                sys.exit(1)
        else:
            parser.print_help()

    def _create_parser(self) -> argparse.ArgumentParser:
        parser = argparse.ArgumentParser(
            description="企业数据备份与恢复管理系统",
            formatter_class=argparse.RawDescriptionHelpFormatter,
            epilog=f"版本: {__version__}\n"
        )

        parser.add_argument('--version', action='version', 
                          version=f'Backup System v{__version__}')

        subparsers = parser.add_subparsers(dest='command', 
                                         title='可用命令',
                                         metavar='COMMAND')

        self._add_backup_commands(subparsers)
        self._add_restore_commands(subparsers)
        self._add_verify_commands(subparsers)
        self._add_report_commands(subparsers)
        self._add_retention_commands(subparsers)
        self._add_query_commands(subparsers)
        self._add_system_commands(subparsers)
        self._add_daemon_commands(subparsers)
        self._add_cron_commands(subparsers)

        return parser

    def _add_backup_commands(self, subparsers):
        backup_parser = subparsers.add_parser('backup', 
                                            help='备份相关操作',
                                            description='执行备份操作')
        backup_sub = backup_parser.add_subparsers(dest='backup_command')

        full_parser = backup_sub.add_parser('full', help='创建全量备份')
        full_parser.add_argument('system', help='系统名称')
        full_parser.add_argument('--force', action='store_true', 
                               help='强制备份（忽略修改时间检查）')
        full_parser.set_defaults(func=self._cmd_backup_full)

        inc_parser = backup_sub.add_parser('incremental', help='创建增量备份')
        inc_parser.add_argument('system', help='系统名称')
        inc_parser.add_argument('--force', action='store_true',
                              help='强制备份（忽略修改时间检查）')
        inc_parser.set_defaults(func=self._cmd_backup_incremental)

        auto_parser = backup_sub.add_parser('auto', help='自动执行计划备份')
        auto_parser.add_argument('system', nargs='?', help='系统名称（可选，不传则执行所有）')
        auto_parser.set_defaults(func=self._cmd_backup_auto)

    def _add_restore_commands(self, subparsers):
        restore_parser = subparsers.add_parser('restore',
                                             help='恢复相关操作',
                                             description='执行恢复操作')
        restore_sub = restore_parser.add_subparsers(dest='restore_command')

        latest_parser = restore_sub.add_parser('latest', help='恢复最新备份')
        latest_parser.add_argument('system', help='系统名称')
        latest_parser.add_argument('path', help='恢复目标路径')
        latest_parser.add_argument('--type', choices=['full', 'incremental'],
                                 help='指定备份类型')
        latest_parser.set_defaults(func=self._cmd_restore_latest)

        version_parser = restore_sub.add_parser('version', help='恢复指定版本')
        version_parser.add_argument('system', help='系统名称')
        version_parser.add_argument('version', help='备份版本号')
        version_parser.add_argument('path', help='恢复目标路径')
        version_parser.set_defaults(func=self._cmd_restore_version)

        test_parser = restore_sub.add_parser('test', help='测试恢复')
        test_parser.add_argument('system', help='系统名称')
        test_parser.add_argument('--version', help='指定备份版本（可选）')
        test_parser.set_defaults(func=self._cmd_restore_test)

        compare_parser = restore_sub.add_parser('compare', help='比较两个备份')
        compare_parser.add_argument('backup_id1', type=int, help='第一个备份ID')
        compare_parser.add_argument('backup_id2', type=int, help='第二个备份ID')
        compare_parser.set_defaults(func=self._cmd_restore_compare)

    def _add_verify_commands(self, subparsers):
        verify_parser = subparsers.add_parser('verify',
                                            help='校验相关操作',
                                            description='验证备份完整性')
        verify_sub = verify_parser.add_subparsers(dest='verify_command')

        backup_parser = verify_sub.add_parser('backup', help='校验指定备份')
        backup_parser.add_argument('backup_id', type=int, help='备份ID')
        backup_parser.add_argument('--type', choices=['full', 'quick'], 
                                 default='full', help='校验类型')
        backup_parser.set_defaults(func=self._cmd_verify_backup)

        recent_parser = verify_sub.add_parser('recent', help='校验近期备份')
        recent_parser.add_argument('--system', help='指定系统名称（可选）')
        recent_parser.add_argument('--hours', type=int, default=24,
                                 help='检查过去多少小时的备份')
        recent_parser.set_defaults(func=self._cmd_verify_recent)

        integrity_parser = verify_sub.add_parser('integrity', 
                                               help='按版本校验完整性')
        integrity_parser.add_argument('system', help='系统名称')
        integrity_parser.add_argument('version', help='备份版本号')
        integrity_parser.set_defaults(func=self._cmd_verify_integrity)

    def _add_report_commands(self, subparsers):
        report_parser = subparsers.add_parser('report',
                                            help='报告相关操作',
                                            description='生成备份报告')
        report_sub = report_parser.add_subparsers(dest='report_command')

        weekly_parser = report_sub.add_parser('weekly', help='生成周报')
        weekly_parser.add_argument('--format', choices=['pdf', 'excel', 'json', 'both'],
                                 default='pdf', help='输出格式')
        weekly_parser.set_defaults(func=self._cmd_report_weekly)

        monthly_parser = report_sub.add_parser('monthly', help='生成月报')
        monthly_parser.add_argument('--format', choices=['pdf', 'excel', 'json', 'both'],
                                  default='pdf', help='输出格式')
        monthly_parser.set_defaults(func=self._cmd_report_monthly)

        custom_parser = report_sub.add_parser('custom', help='生成自定义报告')
        custom_parser.add_argument('start_date', help='开始日期 (YYYY-MM-DD)')
        custom_parser.add_argument('end_date', help='结束日期 (YYYY-MM-DD)')
        custom_parser.add_argument('--system', help='指定系统名称（可选）')
        custom_parser.add_argument('--format', choices=['pdf', 'excel', 'json', 'both'],
                                 default='pdf', help='输出格式')
        custom_parser.set_defaults(func=self._cmd_report_custom)

    def _add_retention_commands(self, subparsers):
        retention_parser = subparsers.add_parser('retention',
                                               help='保留期相关操作',
                                               description='管理备份保留期')
        retention_sub = retention_parser.add_subparsers(dest='retention_command')

        cleanup_parser = retention_sub.add_parser('cleanup', help='清理过期备份')
        cleanup_parser.add_argument('--system', help='指定系统名称（可选）')
        cleanup_parser.add_argument('--dry-run', action='store_true',
                                  help='试运行，不实际删除')
        cleanup_parser.set_defaults(func=self._cmd_retention_cleanup)

        status_parser = retention_sub.add_parser('status', help='查看保留期状态')
        status_parser.add_argument('--system', help='指定系统名称（可选）')
        status_parser.set_defaults(func=self._cmd_retention_status)

        extend_parser = retention_sub.add_parser('extend', help='延长备份保留期')
        extend_parser.add_argument('backup_id', type=int, help='备份ID')
        extend_parser.add_argument('days', type=int, help='延长天数')
        extend_parser.set_defaults(func=self._cmd_retention_extend)

    def _add_query_commands(self, subparsers):
        query_parser = subparsers.add_parser('query',
                                           help='查询相关操作',
                                           description='查询备份和恢复记录')
        query_sub = query_parser.add_subparsers(dest='query_command')

        backup_q_parser = query_sub.add_parser('backups', help='查询备份记录')
        backup_q_parser.add_argument('--system', help='系统名称')
        backup_q_parser.add_argument('--type', choices=['full', 'incremental'],
                                   help='备份类型')
        backup_q_parser.add_argument('--status', choices=['success', 'failed', 'running'],
                                   help='备份状态')
        backup_q_parser.add_argument('--start', help='开始时间 (YYYY-MM-DD)')
        backup_q_parser.add_argument('--end', help='结束时间 (YYYY-MM-DD)')
        backup_q_parser.add_argument('--limit', type=int, default=100,
                                   help='返回记录数')
        backup_q_parser.add_argument('--output', help='输出文件路径（导出时使用）')
        backup_q_parser.add_argument('--format', choices=['csv', 'json', 'excel'],
                                   default='csv', help='导出格式')
        backup_q_parser.set_defaults(func=self._cmd_query_backups)

        restore_q_parser = query_sub.add_parser('restores', help='查询恢复记录')
        restore_q_parser.add_argument('--system', help='系统名称')
        restore_q_parser.add_argument('--status', choices=['success', 'failed', 'running', 'hash_mismatch'],
                                    help='恢复状态')
        restore_q_parser.add_argument('--start', help='开始时间 (YYYY-MM-DD)')
        restore_q_parser.add_argument('--end', help='结束时间 (YYYY-MM-DD)')
        restore_q_parser.add_argument('--limit', type=int, default=100,
                                    help='返回记录数')
        restore_q_parser.set_defaults(func=self._cmd_query_restores)

        cleanup_q_parser = query_sub.add_parser('cleanups', help='查询清理记录')
        cleanup_q_parser.add_argument('--system', help='系统名称')
        cleanup_q_parser.add_argument('--limit', type=int, default=100,
                                    help='返回记录数')
        cleanup_q_parser.set_defaults(func=self._cmd_query_cleanups)

        detail_parser = query_sub.add_parser('detail', help='查看备份详情')
        detail_parser.add_argument('backup_id', type=int, help='备份ID')
        detail_parser.set_defaults(func=self._cmd_query_detail)

        versions_parser = query_sub.add_parser('versions', help='查看备份版本列表')
        versions_parser.add_argument('system', help='系统名称')
        versions_parser.add_argument('--limit', type=int, default=20,
                                   help='返回记录数')
        versions_parser.set_defaults(func=self._cmd_query_versions)

        export_parser = query_sub.add_parser('export', help='批量导出备份清单')
        export_parser.add_argument('output', help='输出文件路径')
        export_parser.add_argument('--system', help='系统名称')
        export_parser.add_argument('--type', choices=['full', 'incremental'],
                                  help='备份类型')
        export_parser.add_argument('--start', help='开始时间 (YYYY-MM-DD)')
        export_parser.add_argument('--end', help='结束时间 (YYYY-MM-DD)')
        export_parser.add_argument('--status', choices=['success', 'failed', 'running'],
                                  help='备份状态')
        export_parser.add_argument('--format', choices=['csv', 'json', 'excel'],
                                  default='csv', help='导出格式')
        export_parser.set_defaults(func=self._cmd_query_export)

        stats_parser = query_sub.add_parser('stats', help='查看统计摘要')
        stats_parser.add_argument('--start', help='开始时间 (YYYY-MM-DD)')
        stats_parser.add_argument('--end', help='结束时间 (YYYY-MM-DD)')
        stats_parser.set_defaults(func=self._cmd_query_stats)

    def _add_system_commands(self, subparsers):
        system_parser = subparsers.add_parser('system',
                                            help='系统相关操作',
                                            description='管理配置的系统')
        system_sub = system_parser.add_subparsers(dest='system_command')

        list_parser = system_sub.add_parser('list', help='列出配置的系统')
        list_parser.set_defaults(func=self._cmd_system_list)

        show_parser = system_sub.add_parser('show', help='显示系统配置详情')
        show_parser.add_argument('system', help='系统名称')
        show_parser.set_defaults(func=self._cmd_system_show)

    def _add_daemon_commands(self, subparsers):
        daemon_parser = subparsers.add_parser('daemon',
                                            help='后台调度相关操作',
                                            description='管理内置定时调度器（APScheduler）')
        daemon_sub = daemon_parser.add_subparsers(dest='daemon_command')

        start_parser = daemon_sub.add_parser('start', help='启动后台调度器')
        start_parser.set_defaults(func=self._cmd_daemon_start)

        stop_parser = daemon_sub.add_parser('stop', help='停止后台调度器')
        stop_parser.set_defaults(func=self._cmd_daemon_stop)

        status_parser = daemon_sub.add_parser('status', help='查看调度器状态')
        status_parser.set_defaults(func=self._cmd_daemon_status)

        jobs_parser = daemon_sub.add_parser('jobs', help='查看调度任务列表')
        jobs_parser.set_defaults(func=self._cmd_daemon_jobs)

        run_parser = daemon_sub.add_parser('run', help='立即执行指定任务')
        run_parser.add_argument('job_id', help='任务ID')
        run_parser.set_defaults(func=self._cmd_daemon_run)

    def _add_cron_commands(self, subparsers):
        cron_parser = subparsers.add_parser('cron',
                                          help='系统crontab相关操作',
                                          description='管理系统crontab定时任务')
        cron_sub = cron_parser.add_subparsers(dest='cron_command')

        install_parser = cron_sub.add_parser('install', help='安装crontab任务')
        install_parser.set_defaults(func=self._cmd_cron_install)

        uninstall_parser = cron_sub.add_parser('uninstall', help='卸载crontab任务')
        uninstall_parser.set_defaults(func=self._cmd_cron_uninstall)

        list_parser = cron_sub.add_parser('list', help='查看crontab任务列表')
        list_parser.set_defaults(func=self._cmd_cron_list)

    def _cmd_daemon_start(self, args):
        if not APSCHEDULER_AVAILABLE:
            print("\033[91m错误: APScheduler 未安装\033[0m")
            print("请先安装依赖: pip install APScheduler>=3.10.0")
            print()
            print("或者使用系统crontab方式: python3 cli.py cron install")
            return

        print("启动后台调度器...")
        try:
            self._scheduler = BackupScheduler()
            self._scheduler.start()
            
            jobs = self._scheduler.list_jobs()
            print(f"\n调度器已启动，共 {len(jobs)} 个任务:")
            self._print_jobs_list(jobs)
            
            print("\n按 Ctrl+C 停止调度器...")
            
            import time
            try:
                while True:
                    time.sleep(60)
            except KeyboardInterrupt:
                print("\n正在停止调度器...")
                self._scheduler.stop()
                print("调度器已停止")
                
        except Exception as e:
            self._logger.error(f"Failed to start scheduler: {e}")
            print(f"启动失败: {e}")

    def _cmd_daemon_stop(self, args):
        print("停止后台调度器...")
        if self._scheduler:
            self._scheduler.stop()
            print("调度器已停止")
        else:
            print("调度器未运行")

    def _cmd_daemon_status(self, args):
        if not APSCHEDULER_AVAILABLE:
            print("\033[93m警告: APScheduler 未安装\033[0m")
            print("请安装: pip install APScheduler>=3.10.0")
            return

        if self._scheduler and self._scheduler._running:
            print("调度器状态: \033[92m运行中\033[0m")
            jobs = self._scheduler.list_jobs()
            print(f"已注册任务: {len(jobs)} 个")
        else:
            print("调度器状态: \033[91m未运行\033[0m")
            print("使用 'python3 cli.py daemon start' 启动调度器")

    def _cmd_daemon_jobs(self, args):
        if not APSCHEDULER_AVAILABLE:
            print("\033[91m错误: APScheduler 未安装\033[0m")
            print("请先安装依赖: pip install APScheduler>=3.10.0")
            return

        if not self._scheduler:
            self._scheduler = BackupScheduler()
        
        self._scheduler.start()
        jobs = self._scheduler.list_jobs()
        self._scheduler.stop()
        
        print(f"\n调度任务列表 (共 {len(jobs)} 个):")
        self._print_jobs_list(jobs)

    def _cmd_daemon_run(self, args):
        if not APSCHEDULER_AVAILABLE:
            print("\033[91m错误: APScheduler 未安装\033[0m")
            print("请先安装依赖: pip install APScheduler>=3.10.0")
            return

        print(f"立即执行任务: {args.job_id}")
        if not self._scheduler:
            self._scheduler = BackupScheduler()
            self._scheduler.start()
        
        result = self._scheduler.run_job_now(args.job_id)
        if result.get('success'):
            print(f"\033[92m✓ {result.get('message')}\033[0m")
        else:
            print(f"\033[91m✗ 失败: {result.get('error')}\033[0m")

    def _cmd_cron_install(self, args):
        print("安装系统crontab任务...")
        result = self._cron.install()
        
        if result.get('success'):
            print(f"\033[92m✓ 成功安装 {result.get('entries')} 个crontab任务\033[0m")
            print(f"涉及系统: {', '.join(result.get('systems', []))}")
            print("\n已添加的任务:")
            entries = self._cron.list()
            for entry in entries:
                print(f"  {entry['schedule']}  {entry['command'][:80]}...")
        else:
            print(f"\033[91m✗ 安装失败: {result.get('error')}\033[0m")

    def _cmd_cron_uninstall(self, args):
        print("卸载系统crontab任务...")
        result = self._cron.uninstall()
        
        if result.get('success'):
            print(f"\033[92m✓ 成功卸载 {result.get('removed')} 个crontab任务\033[0m")
        else:
            print(f"\033[91m✗ 卸载失败: {result.get('error')}\033[0m")

    def _cmd_cron_list(self, args):
        entries = self._cron.list()
        
        if entries:
            print(f"\n已安装的crontab任务 (共 {len(entries)} 个):")
            print(f"{'计划':<15} 命令")
            print("-" * 80)
            for entry in entries:
                cmd = entry['command']
                if len(cmd) > 60:
                    cmd = cmd[:57] + "..."
                print(f"{entry['schedule']:<15} {cmd}")
        else:
            print("\n\033[93m未找到备份系统的crontab任务\033[0m")
            print("使用 'python3 cli.py cron install' 安装")

    def _print_jobs_list(self, jobs):
        print(f"{'任务ID':<25} {'计划':<20} {'下次运行':<20} 名称")
        print("-" * 80)
        for job in jobs:
            next_run = job.get('next_run', '-')
            print(f"{job['id']:<25} {job['schedule']:<20} {next_run:<20} {job.get('name', '')}")

    def _cmd_backup_full(self, args):
        print(f"开始全量备份: {args.system}")
        result = self._backup.create_full_backup(args.system, args.force)
        self._print_backup_result(result)

    def _cmd_backup_incremental(self, args):
        print(f"开始增量备份: {args.system}")
        result = self._backup.create_incremental_backup(args.system, args.force)
        self._print_backup_result(result)

    def _cmd_backup_auto(self, args):
        if args.system:
            print(f"开始执行计划备份: {args.system}")
            system_list = [args.system]
        else:
            print("开始执行所有系统的计划备份...")
            system_list = self._config.list_systems()
        
        for system_name in system_list:
            print(f"\n处理系统: {system_name}")
            result = self._backup.create_backup(system_name, backup_type="auto")
            self._print_backup_result(result)
        
        print("\n计划备份执行完成")

    def _cmd_restore_latest(self, args):
        print(f"恢复最新备份: {args.system} -> {args.path}")
        result = self._restore.restore_latest(args.system, args.path)
        self._print_restore_result(result)

    def _cmd_restore_version(self, args):
        print(f"恢复指定版本: {args.system} {args.version} -> {args.path}")
        result = self._restore.restore_by_version(args.system, args.version, args.path)
        self._print_restore_result(result)

    def _cmd_restore_test(self, args):
        print(f"测试恢复: {args.system}")
        result = self._restore.test_restore(args.system, args.version)
        self._print_restore_result(result)

    def _cmd_restore_compare(self, args):
        print(f"比较备份: {args.backup_id1} vs {args.backup_id2}")
        result = self._restore.compare_backups(args.backup_id1, args.backup_id2)
        print(json.dumps(result, indent=2, ensure_ascii=False, default=str))

    def _cmd_verify_backup(self, args):
        print(f"校验备份: ID={args.backup_id}, 类型={args.type}")
        result = self._verify.verify_backup(args.backup_id, args.type)
        self._print_verify_result(result)

    def _cmd_verify_recent(self, args):
        print(f"校验近期备份: 过去 {args.hours} 小时")
        results = self._verify.verify_recent_backups(args.system, args.hours)
        for r in results:
            self._print_verify_result(r)

    def _cmd_verify_integrity(self, args):
        print(f"校验完整性: {args.system} {args.version}")
        result = self._verify.verify_backup_integrity(args.system, args.version)
        self._print_verify_result(result)

    def _cmd_report_weekly(self, args):
        print(f"生成周报, 格式: {args.format}")
        result = self._report.generate_weekly_report(args.format)
        self._print_report_result(result)

    def _cmd_report_monthly(self, args):
        print(f"生成月报, 格式: {args.format}")
        result = self._report.generate_monthly_report(args.format)
        self._print_report_result(result)

    def _cmd_report_custom(self, args):
        start = datetime.strptime(args.start_date, "%Y-%m-%d")
        end = datetime.strptime(args.end_date, "%Y-%m-%d")
        print(f"生成自定义报告: {start.date()} 到 {end.date()}")
        result = self._report.generate_report(
            "custom", start, end, args.format, args.system
        )
        self._print_report_result(result)

    def _cmd_retention_cleanup(self, args):
        mode = "试运行" if args.dry_run else "实际执行"
        print(f"清理过期备份: {mode}")
        result = self._retention.run_cleanup(args.system, args.dry_run)
        print(json.dumps(result, indent=2, ensure_ascii=False, default=str))

    def _cmd_retention_status(self, args):
        print("保留期状态:")
        status = self._retention.get_retention_status(args.system)
        print(json.dumps(status, indent=2, ensure_ascii=False, default=str))

    def _cmd_retention_extend(self, args):
        print(f"延长备份 {args.backup_id} 保留期 {args.days} 天")
        result = self._retention.extend_retention(args.backup_id, args.days)
        print(json.dumps(result, indent=2, ensure_ascii=False))

    def _cmd_query_backups(self, args):
        start = self._parse_date(args.start)
        end = self._parse_date(args.end, end_of_day=True)
        
        if args.output:
            output_path = self._query.export_backups(
                args.output, args.system, args.type,
                start, end, args.status, args.format
            )
            print(f"已导出到: {output_path}")
        else:
            result = self._query.query_backups(
                args.system, args.type, start, end, args.status, args.limit
            )
            self._print_backup_list(result)

    def _cmd_query_restores(self, args):
        start = self._parse_date(args.start)
        end = self._parse_date(args.end, end_of_day=True)
        result = self._query.query_restores(
            args.system, start, end, args.status, args.limit
        )
        self._print_restore_list(result)

    def _cmd_query_cleanups(self, args):
        result = self._query.query_cleanups(args.system, limit=args.limit)
        print(json.dumps(result, indent=2, ensure_ascii=False, default=str))

    def _cmd_query_detail(self, args):
        detail = self._query.get_backup_details(args.backup_id)
        if detail:
            print(json.dumps(detail, indent=2, ensure_ascii=False, default=str))
        else:
            print(f"备份ID {args.backup_id} 不存在")

    def _cmd_query_versions(self, args):
        versions = self._query.get_backup_versions(args.system, args.limit)
        print(f"\n系统 {args.system} 的备份版本:")
        print(f"{'ID':<8} {'版本':<22} {'类型':<12} {'时间':<20} {'文件数':<10} {'大小'}")
        print("-" * 80)
        for v in versions:
            start_time = v['start_time']
            if isinstance(start_time, str):
                start_time = datetime.fromisoformat(start_time)
            size = self._format_size(v['total_size'])
            print(f"{v['backup_id']:<8} {v['backup_version']:<22} {v['backup_type']:<12} "
                  f"{start_time.strftime('%Y-%m-%d %H:%M'):<20} "
                  f"{v['file_count']:<10} {size}")

    def _cmd_query_export(self, args):
        start = self._parse_date(args.start)
        end = self._parse_date(args.end, end_of_day=True)
        output_path = self._query.export_backups(
            args.output, args.system, args.type,
            start, end, args.status, args.format
        )
        print(f"已导出备份清单到: {output_path}")

    def _cmd_query_stats(self, args):
        start = self._parse_date(args.start)
        end = self._parse_date(args.end, end_of_day=True)
        stats = self._query.get_statistics_summary(start, end)
        print(json.dumps(stats, indent=2, ensure_ascii=False, default=str))

    def _cmd_system_list(self, args):
        systems = self._config.list_systems()
        print("\n配置的系统列表:")
        print(f"{'名称':<20} {'源路径':<40} {'计划':<15} {'保留期(天)'}")
        print("-" * 90)
        for sys_name in systems:
            cfg = self._config.get_system(sys_name)
            print(f"{cfg.name:<20} {cfg.source_path:<40} {cfg.backup_schedule:<15} {cfg.retention_days}")
        print()

    def _cmd_system_show(self, args):
        cfg = self._config.get_system(args.system)
        if cfg:
            print(f"\n系统配置: {cfg.name}")
            print("-" * 40)
            print(f"源路径:          {cfg.source_path}")
            print(f"备份计划:        {cfg.backup_schedule}")
            print(f"增量备份:        {'启用' if cfg.incremental_enabled else '禁用'}")
            print(f"全量备份间隔:    {cfg.full_backup_interval} 天")
            print(f"保留期:          {cfg.retention_days} 天")
            print(f"排除模式:        {', '.join(cfg.excludes) if cfg.excludes else '无'}")
            print()
        else:
            print(f"系统 {args.system} 不存在")

    def _parse_date(self, date_str: Optional[str], 
                   end_of_day: bool = False) -> Optional[datetime]:
        if not date_str:
            return None
        dt = datetime.strptime(date_str, "%Y-%m-%d")
        if end_of_day:
            dt = dt.replace(hour=23, minute=59, second=59)
        return dt

    def _print_backup_result(self, result: dict):
        status = result.get('status', 'unknown')
        status_color = "\033[92m" if status == 'success' else "\033[91m"
        reset_color = "\033[0m"

        print(f"\n备份结果: {status_color}{status.upper()}{reset_color}")
        print(f"  系统:       {result.get('system_name')}")
        print(f"  类型:       {result.get('backup_type')}")
        print(f"  版本:       {result.get('backup_version')}")
        print(f"  备份ID:     {result.get('backup_id')}")
        
        if status == 'success':
            print(f"  文件数:     {result.get('file_count')}")
            print(f"  总大小:     {self._format_size(result.get('total_size', 0))}")
            print(f"  校验和:     {result.get('checksum')}")
            print(f"  存储路径:   {result.get('remote_path')}")
            print(f"  耗时:       {result.get('duration')} 秒")
        
        if status == 'skipped':
            print(f"  原因:       {result.get('message')}")
        
        if status == 'failed':
            print(f"  错误:       {result.get('error_message')}")
            print(f"  重试次数:   {result.get('retry_count')}")
        
        print()

    def _print_restore_result(self, result: dict):
        status = result.get('status', 'unknown')
        status_color = "\033[92m" if status == 'success' else "\033[91m"
        reset_color = "\033[0m"

        print(f"\n恢复结果: {status_color}{status.upper()}{reset_color}")
        print(f"  恢复ID:     {result.get('restore_id')}")
        print(f"  系统:       {result.get('system_name')}")
        print(f"  版本:       {result.get('backup_version')}")
        print(f"  目标路径:   {result.get('restore_path')}")
        
        if status == 'success':
            print(f"  源哈希:     {result.get('source_hash')}")
            print(f"  恢复哈希:   {result.get('restore_hash')}")
            print(f"  哈希匹配:   {result.get('hash_match')}")
            print(f"  耗时:       {result.get('duration')} 秒")
        
        if status == 'hash_mismatch':
            print(f"  源哈希:     {result.get('source_hash')}")
            print(f"  恢复哈希:   {result.get('restore_hash')}")
            print(f"  哈希匹配:   {result.get('hash_match')}")
            print(f"  差异报告:   {result.get('diff_report_path')}")
        
        if status == 'failed':
            print(f"  错误:       {result.get('error_message')}")
        
        print()

    def _print_verify_result(self, result: dict):
        status = result.get('status', 'unknown')
        status_color = "\033[92m" if status == 'success' else "\033[91m"
        reset_color = "\033[0m"

        print(f"\n校验结果: {status_color}{status.upper()}{reset_color}")
        print(f"  备份ID:     {result.get('backup_id')}")
        print(f"  系统:       {result.get('system_name')}")
        print(f"  版本:       {result.get('backup_version')}")
        print(f"  校验类型:   {result.get('verify_type')}")
        print(f"  校验匹配:   {result.get('checksum_match')}")
        
        if result.get('retry_count'):
            print(f"  重试次数:   {result.get('retry_count')}")
        
        if status == 'failed':
            print(f"  错误:       {result.get('error_message')}")
        
        print()

    def _print_report_result(self, result: dict):
        stats = result.get('statistics', {})
        print(f"\n报告生成完成!")
        print(f"  报告ID:     {result.get('report_id')}")
        print(f"  类型:       {result.get('report_type')}")
        print(f"  周期:       {result.get('period')}")
        print(f"\n统计摘要:")
        print(f"  总备份数:   {stats.get('total_backups')}")
        print(f"  成功:       {stats.get('successful_backups')}")
        print(f"  失败:       {stats.get('failed_backups')}")
        print(f"  成功率:     {stats.get('success_rate')}%")
        print(f"  总大小:     {self._format_size(stats.get('total_size'))}")
        print(f"\n报告文件:")
        for path in result.get('report_paths', []):
            print(f"  - {path}")
        print()

    def _print_backup_list(self, result: dict):
        records = result.get('records', [])
        print(f"\n共 {result.get('total')} 条备份记录:")
        print(f"{'ID':<6} {'系统':<12} {'类型':<8} {'版本':<20} {'状态':<10} {'文件数':<8} {'大小':<12} {'开始时间'}")
        print("-" * 90)
        for r in records:
            status_color = "\033[92m" if r['status'] == 'success' else (
                "\033[93m" if r['status'] == 'running' else "\033[91m"
            )
            reset = "\033[0m"
            print(f"{r['backup_id']:<6} {r['system_name']:<12} {r['backup_type']:<8} "
                  f"{r['backup_version']:<20} {status_color}{r['status']:<10}{reset} "
                  f"{r['file_count']:<8} {r['total_size_formatted']:<12} "
                  f"{r['start_time_str']}")
        print()

    def _print_restore_list(self, result: dict):
        records = result.get('records', [])
        print(f"\n共 {result.get('total')} 条恢复记录:")
        print(f"{'ID':<6} {'系统':<12} {'版本':<20} {'状态':<14} {'哈希匹配':<10} {'开始时间'}")
        print("-" * 75)
        for r in records:
            status_color = "\033[92m" if r['status'] == 'success' else (
                "\033[93m" if r['status'] == 'running' else "\033[91m"
            )
            reset = "\033[0m"
            hash_match = "✓" if r.get('hash_match') else ("✗" if r.get('hash_match') is not None else "-")
            print(f"{r['restore_id']:<6} {r['system_name']:<12} {r['backup_version']:<20} "
                  f"{status_color}{r['status']:<14}{reset} {hash_match:<10} "
                  f"{r['start_time_str']}")
        print()

    @staticmethod
    def _format_size(size_bytes: int) -> str:
        import math
        if size_bytes == 0:
            return "0 B"
        size_names = ["B", "KB", "MB", "GB", "TB"]
        i = int(math.floor(math.log(size_bytes, 1024)))
        p = math.pow(1024, i)
        s = round(size_bytes / p, 2)
        return f"{s} {size_names[i]}"


def main():
    cli = BackupCLI()
    cli.run()


if __name__ == "__main__":
    main()
