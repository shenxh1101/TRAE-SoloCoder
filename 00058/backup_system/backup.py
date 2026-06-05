import os
import json
import fnmatch
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Any, Optional, List, Tuple
import shutil

from .config import ConfigManager, SystemConfig
from .logger import get_logger, log_operation
from .database import DatabaseManager
from .storage import (
    StorageManager, 
    create_tarball, 
    calculate_directory_hash,
    calculate_file_hash
)
from .notifier import Notifier


class BackupManager:
    def __init__(self):
        self._config = ConfigManager()
        self._db = DatabaseManager()
        self._storage = StorageManager()
        self._notifier = Notifier()
        self._logger = get_logger("backup")

    def run_scheduled_backups(self):
        self._logger.info("Starting scheduled backup scan...")
        
        for system_name in self._config.list_systems():
            try:
                sys_config = self._config.get_system(system_name)
                if self._should_run_backup(sys_config):
                    backup_type = self._determine_backup_type(sys_config)
                    self._logger.info(f"Running {backup_type} backup for {system_name}")
                    self.create_backup(system_name, backup_type)
            except Exception as e:
                self._logger.error(f"Error processing scheduled backup for {system_name}: {e}")

    def _should_run_backup(self, sys_config: SystemConfig) -> bool:
        now = datetime.now()
        
        last_backup = self._db.get_latest_successful_backup(sys_config.name)
        if not last_backup:
            return True
        
        last_time = datetime.fromisoformat(last_backup['start_time']) if isinstance(last_backup['start_time'], str) else last_backup['start_time']
        
        cron_parts = sys_config.backup_schedule.split()
        if len(cron_parts) == 5:
            minute, hour, day, month, weekday = cron_parts
            
            if minute != '*' and int(minute) != now.minute:
                return False
            if hour != '*' and int(hour) != now.hour:
                return False
            if day != '*' and int(day) != now.day:
                return False
            if month != '*' and int(month) != now.month:
                return False
            if weekday != '*':
                target_weekday = int(weekday)
                if target_weekday == 7:
                    target_weekday = 0
                if target_weekday != now.weekday():
                    return False
            
            return True
        
        return (now - last_time) >= timedelta(hours=24)

    def _determine_backup_type(self, sys_config: SystemConfig) -> str:
        if not sys_config.incremental_enabled:
            return "full"
        
        last_full = self._db.get_latest_successful_backup(sys_config.name, "full")
        if not last_full:
            return "full"
        
        last_full_time = datetime.fromisoformat(last_full['start_time']) if isinstance(last_full['start_time'], str) else last_full['start_time']
        days_since_full = (datetime.now() - last_full_time).days
        
        if days_since_full >= sys_config.full_backup_interval:
            return "full"
        
        return "incremental"

    def create_backup(self, system_name: str, backup_type: str = "auto",
                     force: bool = False) -> Dict[str, Any]:
        sys_config = self._config.get_system(system_name)
        if not sys_config:
            raise ValueError(f"System '{system_name}' not found in configuration")

        if backup_type == "auto":
            backup_type = self._determine_backup_type(sys_config)

        start_time = datetime.now()
        backup_version = start_time.strftime("%Y%m%d_%H%M%S")
        
        temp_dir = self._config.config.data_dir / "temp" / f"{system_name}_{backup_version}"
        temp_dir.mkdir(parents=True, exist_ok=True)
        
        backup_filename = f"{system_name}_{backup_type}_{backup_version}.tar.gz"
        backup_path = temp_dir / backup_filename
        
        backup_id = self._db.create_backup_record(
            system_name=system_name,
            backup_type=backup_type,
            backup_version=backup_version,
            source_path=sys_config.source_path,
            backup_path=str(backup_path),
            start_time=start_time
        )

        result = {
            'backup_id': backup_id,
            'system_name': system_name,
            'backup_type': backup_type,
            'backup_version': backup_version,
            'status': 'running',
            'start_time': start_time
        }

        try:
            self._logger.info(f"Creating {backup_type} backup for {system_name}, version: {backup_version}")
            log_operation("backup", system_name, "start", f"Starting {backup_type} backup", 
                         {'backup_version': backup_version})

            files_to_backup, file_count = self._scan_files(sys_config, backup_type, force)
            
            if backup_type == "incremental" and not files_to_backup:
                self._logger.info(f"No changes detected for {system_name}, skipping incremental backup")
                end_time = datetime.now()
                self._db.update_backup_record(
                    backup_id,
                    status='skipped',
                    file_count=0,
                    total_size=0,
                    end_time=end_time,
                    duration=int((end_time - start_time).total_seconds())
                )
                result.update({
                    'status': 'skipped',
                    'message': 'No changes detected'
                })
                log_operation("backup", system_name, "success", "Backup skipped - no changes")
                return result

            backup_dir = temp_dir / "backup_data"
            backup_dir.mkdir(exist_ok=True)
            
            total_size = self._copy_files(files_to_backup, sys_config.source_path, backup_dir)
            
            dir_hash, file_hashes = calculate_directory_hash(str(backup_dir))
            
            success, tar_size = create_tarball(
                str(backup_dir),
                str(backup_path),
                sys_config.excludes
            )
            
            if not success:
                raise Exception("Failed to create tarball")

            self._db.save_file_hashes(backup_id, file_hashes)

            upload_success, remote_path = self._storage.upload_backup(
                str(backup_path),
                system_name,
                f"{backup_type}_{backup_version}/{backup_filename}"
            )
            
            if not upload_success:
                raise Exception("Failed to upload backup to remote storage")

            end_time = datetime.now()
            duration = int((end_time - start_time).total_seconds())

            self._db.update_backup_record(
                backup_id,
                status='success',
                file_count=file_count,
                total_size=tar_size,
                checksum=dir_hash,
                backup_path=remote_path,
                end_time=end_time,
                duration=duration,
                metadata=json.dumps({
                    'source_hash': dir_hash,
                    'files': [{'path': fp, 'hash': fh, 'size': fs} for fp, fh, fs in file_hashes]
                })
            )

            result.update({
                'status': 'success',
                'file_count': file_count,
                'total_size': tar_size,
                'checksum': dir_hash,
                'remote_path': remote_path,
                'end_time': end_time,
                'duration': duration
            })

            log_operation("backup", system_name, "success", 
                         f"{backup_type} backup completed successfully",
                         {'file_count': file_count, 'total_size': tar_size})

            self._logger.info(f"Backup completed successfully for {system_name}, version: {backup_version}")

        except Exception as e:
            error_msg = str(e)
            self._logger.error(f"Backup failed for {system_name}: {error_msg}")
            
            retry_result = self._handle_backup_retry(
                backup_id, system_name, backup_type, 
                sys_config, start_time, error_msg
            )
            
            if retry_result['retry_success']:
                result = retry_result['result']
            else:
                end_time = datetime.now()
                self._db.update_backup_record(
                    backup_id,
                    status='failed',
                    error_message=error_msg,
                    end_time=end_time,
                    duration=int((end_time - start_time).total_seconds())
                )
                
                result.update({
                    'status': 'failed',
                    'error_message': error_msg,
                    'retry_count': self._config.config.max_retry_count
                })
                
                log_operation("backup", system_name, "error", 
                             f"Backup failed after {self._config.config.max_retry_count} retries",
                             {'error': error_msg})
                
                self._notifier.send_backup_failure(
                    system_name, backup_type, error_msg, 
                    self._config.config.max_retry_count
                )

        finally:
            self._cleanup_temp(temp_dir)

        return result

    def _scan_files(self, sys_config: SystemConfig, backup_type: str,
                   force: bool = False) -> Tuple[List[Path], int]:
        source_path = Path(sys_config.source_path)
        if not source_path.exists():
            raise ValueError(f"Source path does not exist: {source_path}")

        files = []
        last_backup_time = None

        if backup_type == "incremental" and not force:
            last_backup = self._db.get_latest_successful_backup(sys_config.name)
            if last_backup:
                last_backup_time = datetime.fromisoformat(last_backup['start_time']) if isinstance(last_backup['start_time'], str) else last_backup['start_time']
                self._logger.info(f"Scanning for changes since {last_backup_time}")

        for item in source_path.rglob("*"):
            if not item.is_file():
                continue

            rel_path = item.relative_to(source_path)
            
            if self._should_exclude(str(rel_path), sys_config.excludes):
                continue

            if backup_type == "incremental" and last_backup_time and not force:
                mtime = datetime.fromtimestamp(item.stat().st_mtime)
                if mtime <= last_backup_time:
                    continue

            files.append(item)

        return files, len(files)

    def _should_exclude(self, file_path: str, excludes: List[str]) -> bool:
        for pattern in excludes:
            if fnmatch.fnmatch(file_path, pattern):
                return True
            if fnmatch.fnmatch(Path(file_path).name, pattern):
                return True
        return False

    def _copy_files(self, files: List[Path], source_root: Path, 
                   dest_root: Path) -> int:
        total_size = 0
        for src_file in files:
            rel_path = src_file.relative_to(source_root)
            dst_file = dest_root / rel_path
            dst_file.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src_file, dst_file)
            total_size += dst_file.stat().st_size
        return total_size

    def _handle_backup_retry(self, backup_id: int, system_name: str,
                            backup_type: str, sys_config: SystemConfig,
                            start_time: datetime, initial_error: str) -> Dict[str, Any]:
        max_retries = self._config.config.max_retry_count
        result = {'retry_success': False, 'result': None}

        for retry_count in range(1, max_retries + 1):
            self._logger.warning(f"Retry {retry_count}/{max_retries} for backup {backup_id}")
            log_operation("backup_retry", system_name, "warning", 
                         f"Retry {retry_count} after failure: {initial_error}")

            try:
                self._db.update_backup_record(
                    backup_id,
                    retry_count=retry_count,
                    status='retrying'
                )

                backup_version = start_time.strftime("%Y%m%d_%H%M%S")
                temp_dir = self._config.config.data_dir / "temp" / f"{system_name}_{backup_version}_retry{retry_count}"
                temp_dir.mkdir(parents=True, exist_ok=True)
                
                backup_filename = f"{system_name}_{backup_type}_{backup_version}.tar.gz"
                backup_path = temp_dir / backup_filename
                backup_dir = temp_dir / "backup_data"
                backup_dir.mkdir(exist_ok=True)

                files_to_backup, file_count = self._scan_files(sys_config, backup_type, force=True)
                
                total_size = self._copy_files(files_to_backup, sys_config.source_path, backup_dir)
                
                dir_hash, file_hashes = calculate_directory_hash(str(backup_dir))
                
                success, tar_size = create_tarball(
                    str(backup_dir),
                    str(backup_path),
                    sys_config.excludes
                )
                
                if not success:
                    raise Exception("Retry: Failed to create tarball")

                self._db.save_file_hashes(backup_id, file_hashes)

                upload_success, remote_path = self._storage.upload_backup(
                    str(backup_path),
                    system_name,
                    f"{backup_type}_{backup_version}/{backup_filename}"
                )
                
                if not upload_success:
                    raise Exception("Retry: Failed to upload backup")

                end_time = datetime.now()
                duration = int((end_time - start_time).total_seconds())

                self._db.update_backup_record(
                    backup_id,
                    status='success',
                    file_count=file_count,
                    total_size=tar_size,
                    checksum=dir_hash,
                    backup_path=remote_path,
                    end_time=end_time,
                    duration=duration,
                    retry_count=retry_count
                )

                result['retry_success'] = True
                result['result'] = {
                    'backup_id': backup_id,
                    'system_name': system_name,
                    'backup_type': backup_type,
                    'backup_version': backup_version,
                    'status': 'success',
                    'file_count': file_count,
                    'total_size': tar_size,
                    'checksum': dir_hash,
                    'remote_path': remote_path,
                    'start_time': start_time,
                    'end_time': end_time,
                    'duration': duration,
                    'retry_count': retry_count
                }

                log_operation("backup", system_name, "success", 
                             f"Backup succeeded on retry {retry_count}")
                
                self._cleanup_temp(temp_dir)
                break

            except Exception as retry_error:
                error_msg = str(retry_error)
                self._logger.error(f"Retry {retry_count} failed: {error_msg}")
                
                if retry_count == max_retries:
                    self._notifier.send_verification_failure(
                        system_name, 
                        start_time.strftime("%Y%m%d_%H%M%S"),
                        error_msg,
                        retry_count
                    )
                
                self._cleanup_temp(temp_dir)
                continue

        return result

    def _cleanup_temp(self, temp_dir: Path):
        try:
            if temp_dir.exists():
                shutil.rmtree(temp_dir)
        except Exception as e:
            self._logger.warning(f"Failed to cleanup temp directory {temp_dir}: {e}")

    def create_full_backup(self, system_name: str, force: bool = False) -> Dict[str, Any]:
        return self.create_backup(system_name, "full", force)

    def create_incremental_backup(self, system_name: str, force: bool = False) -> Dict[str, Any]:
        return self.create_backup(system_name, "incremental", force)
