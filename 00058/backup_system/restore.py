import os
import json
import shutil
import tempfile
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional, List, Tuple

from .config import ConfigManager
from .logger import get_logger, log_operation
from .database import DatabaseManager
from .storage import (
    StorageManager,
    calculate_file_hash,
    calculate_directory_hash,
    extract_tarball
)
from .notifier import Notifier


class RestoreManager:
    def __init__(self):
        self._config = ConfigManager()
        self._db = DatabaseManager()
        self._storage = StorageManager()
        self._notifier = Notifier()
        self._logger = get_logger("restore")

    def restore_backup(self, system_name: str, restore_path: str,
                      backup_version: Optional[str] = None,
                      backup_type: Optional[str] = None) -> Dict[str, Any]:
        sys_config = self._config.get_system(system_name)
        if not sys_config:
            raise ValueError(f"System '{system_name}' not found in configuration")

        if backup_version:
            backup = self._db.get_backup_by_version(system_name, backup_version)
            if not backup:
                raise ValueError(f"Backup version {backup_version} not found for system {system_name}")
        else:
            backup = self._db.get_latest_successful_backup(system_name, backup_type)
            if not backup:
                raise ValueError(f"No successful backups found for system {system_name}")

        backup_version = backup['backup_version']
        backup_id = backup['id']

        start_time = datetime.now()

        restore_id = self._db.create_restore_record(
            system_name=system_name,
            backup_version=backup_version,
            backup_id=backup_id,
            restore_path=restore_path,
            start_time=start_time
        )

        result = {
            'restore_id': restore_id,
            'backup_id': backup_id,
            'system_name': system_name,
            'backup_version': backup_version,
            'restore_path': restore_path,
            'status': 'running',
            'start_time': start_time,
            'hash_match': None,
            'diff_report_path': None
        }

        temp_dir = Path(tempfile.mkdtemp(prefix="restore_"))

        try:
            self._logger.info(f"Starting restore of {system_name} version {backup_version} to {restore_path}")
            log_operation("restore", system_name, "start",
                         f"Restoring backup {backup_version} to {restore_path}",
                         {'backup_id': backup_id})

            backup_tarball = temp_dir / f"{system_name}_{backup_version}.tar.gz"
            extract_dir = temp_dir / "extracted"

            download_success = self._storage.download_backup(
                system_name,
                backup['backup_path'],
                str(backup_tarball)
            )
            
            if not download_success:
                raise Exception("Failed to download backup from storage")

            extract_success = extract_tarball(str(backup_tarball), str(extract_dir))
            if not extract_success:
                raise Exception("Failed to extract backup tarball")

            Path(restore_path).mkdir(parents=True, exist_ok=True)
            
            for item in extract_dir.rglob("*"):
                if item.is_file():
                    rel_path = item.relative_to(extract_dir)
                    dst = Path(restore_path) / rel_path
                    dst.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(item, dst)

            source_hash = backup['checksum']
            restore_hash, _ = calculate_directory_hash(restore_path)
            hash_match = (source_hash == restore_hash)

            diff_report_path = None
            if not hash_match:
                diff_report_path = self._generate_diff_report(
                    backup_id, restore_path, system_name, backup_version
                )

            end_time = datetime.now()
            duration = int((end_time - start_time).total_seconds())

            status = 'success' if hash_match else 'hash_mismatch'

            self._db.update_restore_record(
                restore_id,
                status=status,
                source_hash=source_hash,
                restore_hash=restore_hash,
                hash_match=hash_match,
                end_time=end_time,
                duration=duration,
                diff_report_path=diff_report_path
            )

            result.update({
                'status': status,
                'source_hash': source_hash,
                'restore_hash': restore_hash,
                'hash_match': hash_match,
                'diff_report_path': diff_report_path,
                'end_time': end_time,
                'duration': duration
            })

            if hash_match:
                log_operation("restore", system_name, "success",
                             f"Restore completed successfully",
                             {'backup_version': backup_version, 'restore_path': restore_path})
            else:
                log_operation("restore", system_name, "error",
                             f"Restore completed but hash mismatch",
                             {'diff_report_path': diff_report_path})
                
                self._notifier.send_restore_hash_mismatch(
                    system_name, backup_version, diff_report_path
                )

        except Exception as e:
            error_msg = str(e)
            end_time = datetime.now()
            
            self._db.update_restore_record(
                restore_id,
                status='failed',
                error_message=error_msg,
                end_time=end_time,
                duration=int((end_time - start_time).total_seconds())
            )

            result.update({
                'status': 'failed',
                'error_message': error_msg,
                'end_time': end_time,
                'duration': int((end_time - start_time).total_seconds())
            })

            log_operation("restore", system_name, "error",
                         f"Restore failed: {error_msg}",
                         {'backup_version': backup_version})

            self._notifier.send_restore_failure(system_name, backup_version, error_msg)

        finally:
            shutil.rmtree(temp_dir, ignore_errors=True)

        return result

    def restore_latest(self, system_name: str, restore_path: str) -> Dict[str, Any]:
        return self.restore_backup(system_name, restore_path)

    def restore_by_version(self, system_name: str, backup_version: str,
                          restore_path: str) -> Dict[str, Any]:
        return self.restore_backup(system_name, restore_path, backup_version=backup_version)

    def test_restore(self, system_name: str, 
                    backup_version: Optional[str] = None) -> Dict[str, Any]:
        temp_restore_dir = Path(tempfile.mkdtemp(prefix="test_restore_"))
        
        try:
            result = self.restore_backup(
                system_name, 
                str(temp_restore_dir), 
                backup_version
            )
            
            return {
                **result,
                'test_restore': True,
                'temp_path': str(temp_restore_dir)
            }
        finally:
            shutil.rmtree(temp_restore_dir, ignore_errors=True)

    def _generate_diff_report(self, backup_id: int, restore_path: str,
                             system_name: str, backup_version: str) -> str:
        self._logger.info(f"Generating diff report for restore of {system_name} {backup_version}")

        stored_hashes = self._db.get_file_hashes(backup_id)
        stored_hash_map = {h['file_path']: h for h in stored_hashes}

        restore_root = Path(restore_path)
        mismatches = []
        missing_files = []
        extra_files = []

        for stored_file_path, stored_info in stored_hash_map.items():
            restore_file = restore_root / stored_file_path
            
            if not restore_file.exists():
                missing_files.append({
                    'file': stored_file_path,
                    'expected_size': stored_info['file_size']
                })
                continue

            actual_hash = calculate_file_hash(str(restore_file))
            actual_size = restore_file.stat().st_size

            if actual_hash != stored_info['file_hash']:
                mismatches.append({
                    'file': stored_file_path,
                    'expected_hash': stored_info['file_hash'],
                    'actual_hash': actual_hash,
                    'expected_size': stored_info['file_size'],
                    'actual_size': actual_size
                })

        for restore_file in restore_root.rglob("*"):
            if restore_file.is_file():
                rel_path = str(restore_file.relative_to(restore_root))
                if rel_path not in stored_hash_map:
                    extra_files.append({
                        'file': rel_path,
                        'size': restore_file.stat().st_size
                    })

        report_dir = self._config.config.log_dir / "diff_reports"
        report_dir.mkdir(parents=True, exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_path = report_dir / f"diff_{system_name}_{backup_version}_{timestamp}.json"

        report = {
            'system_name': system_name,
            'backup_version': backup_version,
            'restore_path': restore_path,
            'generated_at': datetime.now().isoformat(),
            'summary': {
                'total_files_expected': len(stored_hashes),
                'total_mismatches': len(mismatches),
                'total_missing': len(missing_files),
                'total_extra': len(extra_files)
            },
            'mismatched_files': mismatches,
            'missing_files': missing_files,
            'extra_files': extra_files
        }

        with open(report_path, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)

        self._logger.info(f"Diff report generated at {report_path}")

        return str(report_path)

    def compare_backups(self, backup_id1: int, backup_id2: int) -> Dict[str, Any]:
        backup1 = self._db.get_backup_record(backup_id1)
        backup2 = self._db.get_backup_record(backup_id2)

        if not backup1 or not backup2:
            raise ValueError("One or both backup records not found")

        if backup1['system_name'] != backup2['system_name']:
            raise ValueError("Backups must be from the same system")

        hashes1 = self._db.get_file_hashes(backup_id1)
        hashes2 = self._db.get_file_hashes(backup_id2)

        hash_map1 = {h['file_path']: h for h in hashes1}
        hash_map2 = {h['file_path']: h for h in hashes2}

        all_files = set(hash_map1.keys()) | set(hash_map2.keys())

        added = []
        removed = []
        modified = []
        unchanged = []

        for file_path in sorted(all_files):
            in1 = file_path in hash_map1
            in2 = file_path in hash_map2

            if in1 and not in2:
                removed.append({
                    'file': file_path,
                    'size': hash_map1[file_path]['file_size']
                })
            elif in2 and not in1:
                added.append({
                    'file': file_path,
                    'size': hash_map2[file_path]['file_size']
                })
            else:
                if hash_map1[file_path]['file_hash'] != hash_map2[file_path]['file_hash']:
                    modified.append({
                        'file': file_path,
                        'old_size': hash_map1[file_path]['file_size'],
                        'new_size': hash_map2[file_path]['file_size']
                    })
                else:
                    unchanged.append({
                        'file': file_path,
                        'size': hash_map1[file_path]['file_size']
                    })

        return {
            'backup1': {
                'id': backup_id1,
                'version': backup1['backup_version'],
                'date': backup1['start_time']
            },
            'backup2': {
                'id': backup_id2,
                'version': backup2['backup_version'],
                'date': backup2['start_time']
            },
            'summary': {
                'total_files_backup1': len(hashes1),
                'total_files_backup2': len(hashes2),
                'added': len(added),
                'removed': len(removed),
                'modified': len(modified),
                'unchanged': len(unchanged)
            },
            'added_files': added,
            'removed_files': removed,
            'modified_files': modified,
            'unchanged_files': unchanged
        }
