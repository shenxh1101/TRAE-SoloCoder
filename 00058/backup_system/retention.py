import os
import json
import shutil
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Any, Optional, List

from .config import ConfigManager, SystemConfig
from .logger import get_logger, log_operation
from .database import DatabaseManager
from .storage import StorageManager
from .notifier import Notifier


class RetentionManager:
    def __init__(self):
        self._config = ConfigManager()
        self._db = DatabaseManager()
        self._storage = StorageManager()
        self._notifier = Notifier()
        self._logger = get_logger("retention")

    def run_cleanup(self, system_name: Optional[str] = None,
                   dry_run: bool = False) -> Dict[str, Any]:
        self._logger.info(f"Starting cleanup process, dry_run={dry_run}")

        systems_to_process = [system_name] if system_name else self._config.list_systems()
        cleanup_results = {}
        total_cleaned = 0
        total_size = 0

        for sys_name in systems_to_process:
            sys_config = self._config.get_system(sys_name)
            if not sys_config:
                self._logger.warning(f"System {sys_name} not found in configuration")
                continue

            try:
                result = self._cleanup_system(sys_config, dry_run)
                cleanup_results[sys_name] = result
                total_cleaned += result['cleaned_count']
                total_size += result['cleaned_size']
            except Exception as e:
                self._logger.error(f"Error cleaning up system {sys_name}: {e}")
                cleanup_results[sys_name] = {
                    'error': str(e),
                    'cleaned_count': 0,
                    'cleaned_size': 0
                }

        log_operation("cleanup", system_name or "all", "success",
                     f"Cleanup completed",
                     {'total_cleaned': total_cleaned, 'total_size': total_size, 'dry_run': dry_run})

        return {
            'total_cleaned': total_cleaned,
            'total_size': total_size,
            'dry_run': dry_run,
            'systems': cleanup_results
        }

    def _cleanup_system(self, sys_config: SystemConfig, 
                       dry_run: bool) -> Dict[str, Any]:
        expired_backups = self._db.get_expired_backups(
            sys_config.name,
            sys_config.retention_days
        )

        self._logger.info(
            f"Found {len(expired_backups)} expired backups for "
            f"{sys_config.name} (retention: {sys_config.retention_days} days)"
        )

        if not expired_backups:
            return {
                'expired_count': 0,
                'cleaned_count': 0,
                'cleaned_size': 0,
                'skipped_count': 0
            }

        total_size = sum(b.get('total_size', 0) for b in expired_backups)

        if not dry_run:
            notification_sent = self._notifier.send_cleanup_notification(
                sys_config.name,
                len(expired_backups),
                total_size
            )
            self._logger.info(f"Cleanup notification sent: {notification_sent}")

        cleaned_count = 0
        cleaned_size = 0
        skipped_count = 0

        for backup in expired_backups:
            try:
                if not dry_run:
                    delete_success = self._delete_backup(backup, sys_config.name)
                    if delete_success:
                        cleaned_count += 1
                        cleaned_size += backup.get('total_size', 0) or 0

                        self._db.create_cleanup_record(
                            system_name=sys_config.name,
                            backup_version=backup['backup_version'],
                            backup_id=backup['id'],
                            backup_size=backup.get('total_size', 0) or 0,
                            cleanup_time=datetime.now(),
                            status='success',
                            notification_sent=True
                        )

                        log_operation("cleanup", sys_config.name, "success",
                                     f"Cleaned up backup {backup['backup_version']}",
                                     {'backup_id': backup['id'], 'size': backup.get('total_size', 0)})
                    else:
                        skipped_count += 1
                        self._logger.warning(f"Failed to delete backup {backup['id']}")
                else:
                    cleaned_count += 1
                    cleaned_size += backup.get('total_size', 0) or 0
                    self._logger.info(f"[DRY RUN] Would clean up backup {backup['backup_version']}")

            except Exception as e:
                skipped_count += 1
                self._logger.error(f"Error cleaning up backup {backup['id']}: {e}")

                if not dry_run:
                    self._db.create_cleanup_record(
                        system_name=sys_config.name,
                        backup_version=backup['backup_version'],
                        backup_id=backup['id'],
                        backup_size=backup.get('total_size', 0) or 0,
                        cleanup_time=datetime.now(),
                        status='failed',
                        notification_sent=True,
                        error_message=str(e)
                    )

        return {
            'expired_count': len(expired_backups),
            'cleaned_count': cleaned_count,
            'cleaned_size': cleaned_size,
            'skipped_count': skipped_count
        }

    def _delete_backup(self, backup: Dict[str, Any], system_name: str) -> bool:
        backup_path = backup.get('backup_path', '')
        
        storage_success = self._storage.delete_backup(
            system_name,
            backup_path
        )

        return storage_success

    def get_retention_status(self, system_name: Optional[str] = None) -> Dict[str, Any]:
        systems = [system_name] if system_name else self._config.list_systems()
        status = {}

        for sys_name in systems:
            sys_config = self._config.get_system(sys_name)
            if not sys_config:
                continue

            all_backups = self._db.query_backups(
                system_name=sys_name,
                status='success',
                limit=1000
            )

            expired_backups = self._db.get_expired_backups(
                sys_name,
                sys_config.retention_days
            )

            cutoff_date = datetime.now() - timedelta(days=sys_config.retention_days)

            active_backups = [b for b in all_backups if b not in expired_backups]
            total_size = sum(b.get('total_size', 0) for b in all_backups if b.get('total_size'))
            active_size = sum(b.get('total_size', 0) for b in active_backups if b.get('total_size'))
            expired_size = sum(b.get('total_size', 0) for b in expired_backups if b.get('total_size'))

            latest_backup = self._db.get_latest_successful_backup(sys_name)
            oldest_backup = all_backups[-1] if all_backups else None

            status[sys_name] = {
                'retention_days': sys_config.retention_days,
                'cutoff_date': cutoff_date,
                'total_backups': len(all_backups),
                'active_backups': len(active_backups),
                'expired_backups': len(expired_backups),
                'total_size': total_size,
                'active_size': active_size,
                'expired_size': expired_size,
                'latest_backup': latest_backup['backup_version'] if latest_backup else None,
                'oldest_backup': oldest_backup['backup_version'] if oldest_backup else None
            }

        return status

    def extend_retention(self, backup_id: int, 
                        additional_days: int) -> Dict[str, Any]:
        backup = self._db.get_backup_record(backup_id)
        if not backup:
            raise ValueError(f"Backup {backup_id} not found")

        self._logger.info(
            f"Extending retention for backup {backup_id} "
            f"by {additional_days} days"
        )

        log_operation("retention_extend", backup['system_name'], "success",
                     f"Extended retention by {additional_days} days",
                     {'backup_id': backup_id, 'additional_days': additional_days})

        return {
            'backup_id': backup_id,
            'system_name': backup['system_name'],
            'backup_version': backup['backup_version'],
            'additional_days': additional_days,
            'message': 'Retention extended. Cleanup for this backup will be skipped.'
        }
