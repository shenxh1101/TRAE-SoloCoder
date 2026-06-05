import os
import json
import tarfile
import tempfile
import shutil
from datetime import datetime, timedelta
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


class VerificationManager:
    def __init__(self):
        self._config = ConfigManager()
        self._db = DatabaseManager()
        self._storage = StorageManager()
        self._notifier = Notifier()
        self._logger = get_logger("verifier")

    def verify_backup(self, backup_id: int, verify_type: str = "full") -> Dict[str, Any]:
        backup_record = self._db.get_backup_record(backup_id)
        if not backup_record:
            raise ValueError(f"Backup record {backup_id} not found")

        if backup_record['status'] != 'success':
            raise ValueError(f"Backup {backup_id} is not in success state")

        start_time = datetime.now()
        result = {
            'backup_id': backup_id,
            'system_name': backup_record['system_name'],
            'backup_version': backup_record['backup_version'],
            'verify_type': verify_type,
            'status': 'running',
            'start_time': start_time,
            'checksum_match': False
        }

        try:
            self._logger.info(f"Starting {verify_type} verification for backup {backup_id}")
            log_operation("verify", backup_record['system_name'], "start",
                         f"Starting {verify_type} verification",
                         {'backup_id': backup_id, 'backup_version': backup_record['backup_version']})

            verify_result = self._perform_verification(backup_record, verify_type)
            
            end_time = datetime.now()
            duration = int((end_time - start_time).total_seconds())

            if verify_result['success']:
                result.update({
                    'status': 'success',
                    'checksum_match': True,
                    'end_time': end_time,
                    'duration': duration
                })

                self._db.create_verification_record(
                    backup_id=backup_id,
                    verify_type=verify_type,
                    status='success',
                    checksum_match=True,
                    retry_count=0
                )

                log_operation("verify", backup_record['system_name'], "success",
                             f"Verification passed",
                             {'backup_id': backup_id})
            else:
                retry_result = self._handle_verification_retry(
                    backup_id, backup_record, verify_type, verify_result['error']
                )
                
                if retry_result['success']:
                    result.update({
                        'status': 'success',
                        'checksum_match': True,
                        'end_time': datetime.now(),
                        'duration': int((datetime.now() - start_time).total_seconds()),
                        'retry_count': retry_result['retry_count']
                    })
                else:
                    result.update({
                        'status': 'failed',
                        'checksum_match': False,
                        'error_message': verify_result['error'],
                        'end_time': end_time,
                        'duration': duration,
                        'retry_count': self._config.config.max_retry_count
                    })

                    self._db.create_verification_record(
                        backup_id=backup_id,
                        verify_type=verify_type,
                        status='failed',
                        checksum_match=False,
                        error_message=verify_result['error'],
                        retry_count=self._config.config.max_retry_count
                    )

                    log_operation("verify", backup_record['system_name'], "error",
                                 f"Verification failed after {self._config.config.max_retry_count} retries",
                                 {'backup_id': backup_id, 'error': verify_result['error']})

                    self._notifier.send_verification_failure(
                        backup_record['system_name'],
                        backup_record['backup_version'],
                        verify_result['error'],
                        self._config.config.max_retry_count
                    )

        except Exception as e:
            error_msg = str(e)
            end_time = datetime.now()
            
            result.update({
                'status': 'failed',
                'error_message': error_msg,
                'end_time': end_time,
                'duration': int((end_time - start_time).total_seconds())
            })

            self._db.create_verification_record(
                backup_id=backup_id,
                verify_type=verify_type,
                status='failed',
                checksum_match=False,
                error_message=error_msg,
                retry_count=0
            )

            log_operation("verify", backup_record['system_name'], "error",
                         f"Verification error: {error_msg}",
                         {'backup_id': backup_id})

        return result

    def _perform_verification(self, backup_record: Dict[str, Any], 
                            verify_type: str) -> Dict[str, Any]:
        system_name = backup_record['system_name']
        backup_version = backup_record['backup_version']
        expected_checksum = backup_record['checksum']

        temp_dir = Path(tempfile.mkdtemp(prefix="verify_"))
        
        try:
            backup_tarball = temp_dir / f"{system_name}_{backup_version}.tar.gz"
            extract_dir = temp_dir / "extracted"

            download_success = self._storage.download_backup(
                system_name,
                backup_record['backup_path'],
                str(backup_tarball)
            )
            
            if not download_success:
                return {'success': False, 'error': 'Failed to download backup from storage'}

            stored_checksum = calculate_file_hash(str(backup_tarball))
            self._logger.debug(f"Downloaded file checksum: {stored_checksum}")

            extract_success = extract_tarball(str(backup_tarball), str(extract_dir))
            if not extract_success:
                return {'success': False, 'error': 'Failed to extract backup tarball'}

            if verify_type == "full":
                actual_checksum, _ = calculate_directory_hash(str(extract_dir))
                
                if actual_checksum != expected_checksum:
                    return {
                        'success': False,
                        'error': f'Checksum mismatch. Expected: {expected_checksum}, Actual: {actual_checksum}'
                    }

                stored_hashes = self._db.get_file_hashes(backup_record['id'])
                hash_mismatches = []
                
                for stored_hash in stored_hashes:
                    file_path = extract_dir / stored_hash['file_path']
                    if file_path.exists():
                        actual_file_hash = calculate_file_hash(str(file_path))
                        if actual_file_hash != stored_hash['file_hash']:
                            hash_mismatches.append({
                                'file': stored_hash['file_path'],
                                'expected': stored_hash['file_hash'],
                                'actual': actual_file_hash
                            })
                    else:
                        hash_mismatches.append({
                            'file': stored_hash['file_path'],
                            'error': 'File missing in backup'
                        })

                if hash_mismatches:
                    return {
                        'success': False,
                        'error': f'File hash mismatches found: {len(hash_mismatches)} files',
                        'mismatches': hash_mismatches
                    }

            elif verify_type == "quick":
                metadata = json.loads(backup_record.get('metadata', '{}'))
                stored_files = metadata.get('files', [])
                
                if len(stored_files) != backup_record['file_count']:
                    return {
                        'success': False,
                        'error': f'File count mismatch. Expected: {backup_record["file_count"]}, Actual: {len(stored_files)}'
                    }

            return {'success': True}

        finally:
            shutil.rmtree(temp_dir, ignore_errors=True)

    def _handle_verification_retry(self, backup_id: int, 
                                   backup_record: Dict[str, Any],
                                   verify_type: str, 
                                   initial_error: str) -> Dict[str, Any]:
        max_retries = self._config.config.max_retry_count
        result = {'success': False, 'retry_count': 0}

        for retry_count in range(1, max_retries + 1):
            self._logger.warning(f"Verification retry {retry_count}/{max_retries} for backup {backup_id}")
            log_operation("verify_retry", backup_record['system_name'], "warning",
                         f"Retry {retry_count} after failure: {initial_error}")

            try:
                retry_result = self._perform_verification(backup_record, verify_type)
                
                if retry_result['success']:
                    self._db.create_verification_record(
                        backup_id=backup_id,
                        verify_type=verify_type,
                        status='success',
                        checksum_match=True,
                        retry_count=retry_count
                    )
                    
                    log_operation("verify", backup_record['system_name'], "success",
                                 f"Verification passed on retry {retry_count}")
                    
                    result['success'] = True
                    result['retry_count'] = retry_count
                    break
                else:
                    self._db.create_verification_record(
                        backup_id=backup_id,
                        verify_type=verify_type,
                        status='failed',
                        checksum_match=False,
                        error_message=retry_result['error'],
                        retry_count=retry_count
                    )

            except Exception as e:
                self._logger.error(f"Verification retry {retry_count} failed: {e}")
                continue

        return result

    def verify_recent_backups(self, system_name: Optional[str] = None,
                             hours: int = 24) -> List[Dict[str, Any]]:
        self._logger.info(f"Verifying backups from last {hours} hours")
        
        start_time = datetime.now() - timedelta(hours=hours)
        
        backups = self._db.query_backups(
            system_name=system_name,
            start_time=start_time,
            status='success'
        )

        results = []
        for backup in backups:
            try:
                result = self.verify_backup(backup['id'], "quick")
                results.append(result)
            except Exception as e:
                self._logger.error(f"Failed to verify backup {backup['id']}: {e}")
                results.append({
                    'backup_id': backup['id'],
                    'status': 'error',
                    'error_message': str(e)
                })

        return results

    def verify_backup_integrity(self, system_name: str, 
                                backup_version: str) -> Dict[str, Any]:
        backup = self._db.get_backup_by_version(system_name, backup_version)
        if not backup:
            raise ValueError(f"Backup version {backup_version} not found for system {system_name}")
        
        return self.verify_backup(backup['id'], "full")
