import sqlite3
import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
from contextlib import contextmanager
from .config import ConfigManager
from .logger import get_logger


class DatabaseManager:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        self._config = ConfigManager().config
        self._db_path = self._config.database_path
        self._logger = get_logger("database")
        self._init_database()

    @contextmanager
    def _get_connection(self):
        conn = sqlite3.connect(self._db_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
            conn.commit()
        except Exception as e:
            conn.rollback()
            self._logger.error(f"Database error: {e}")
            raise
        finally:
            conn.close()

    def _init_database(self):
        Path(self._db_path).parent.mkdir(parents=True, exist_ok=True)
        
        with self._get_connection() as conn:
            cursor = conn.cursor()

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS backup_records (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    system_name TEXT NOT NULL,
                    backup_type TEXT NOT NULL,
                    backup_version TEXT NOT NULL,
                    source_path TEXT NOT NULL,
                    backup_path TEXT NOT NULL,
                    file_count INTEGER DEFAULT 0,
                    total_size INTEGER DEFAULT 0,
                    checksum TEXT,
                    status TEXT NOT NULL,
                    retry_count INTEGER DEFAULT 0,
                    start_time DATETIME NOT NULL,
                    end_time DATETIME,
                    duration INTEGER,
                    error_message TEXT,
                    metadata TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS restore_records (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    system_name TEXT NOT NULL,
                    backup_version TEXT NOT NULL,
                    backup_id INTEGER,
                    restore_path TEXT NOT NULL,
                    source_hash TEXT,
                    restore_hash TEXT,
                    hash_match BOOLEAN,
                    status TEXT NOT NULL,
                    start_time DATETIME NOT NULL,
                    end_time DATETIME,
                    duration INTEGER,
                    error_message TEXT,
                    diff_report_path TEXT,
                    metadata TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (backup_id) REFERENCES backup_records(id)
                )
            """)

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS file_hashes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    backup_id INTEGER,
                    file_path TEXT NOT NULL,
                    file_hash TEXT NOT NULL,
                    file_size INTEGER,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (backup_id) REFERENCES backup_records(id)
                )
            """)

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS cleanup_records (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    system_name TEXT NOT NULL,
                    backup_version TEXT NOT NULL,
                    backup_id INTEGER,
                    backup_size INTEGER,
                    cleanup_time DATETIME NOT NULL,
                    status TEXT NOT NULL,
                    notification_sent BOOLEAN DEFAULT FALSE,
                    error_message TEXT,
                    FOREIGN KEY (backup_id) REFERENCES backup_records(id)
                )
            """)

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS verification_records (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    backup_id INTEGER,
                    verify_type TEXT NOT NULL,
                    status TEXT NOT NULL,
                    checksum_match BOOLEAN,
                    error_message TEXT,
                    retry_count INTEGER DEFAULT 0,
                    verified_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (backup_id) REFERENCES backup_records(id)
                )
            """)

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS report_records (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    report_type TEXT NOT NULL,
                    report_period TEXT NOT NULL,
                    start_date DATETIME NOT NULL,
                    end_date DATETIME NOT NULL,
                    total_backups INTEGER DEFAULT 0,
                    successful_backups INTEGER DEFAULT 0,
                    failed_backups INTEGER DEFAULT 0,
                    success_rate REAL,
                    total_size INTEGER DEFAULT 0,
                    restore_tests INTEGER DEFAULT 0,
                    successful_restores INTEGER DEFAULT 0,
                    report_path TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)

            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_backup_system ON backup_records(system_name)
            """)
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_backup_type ON backup_records(backup_type)
            """)
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_backup_version ON backup_records(backup_version)
            """)
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_backup_status ON backup_records(status)
            """)
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_backup_time ON backup_records(start_time)
            """)
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_restore_system ON restore_records(system_name)
            """)
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_file_backup ON file_hashes(backup_id)
            """)

    def create_backup_record(self, system_name: str, backup_type: str,
                            backup_version: str, source_path: str,
                            backup_path: str, start_time: datetime) -> int:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO backup_records 
                (system_name, backup_type, backup_version, source_path, 
                 backup_path, status, start_time)
                VALUES (?, ?, ?, ?, ?, 'running', ?)
            """, (system_name, backup_type, backup_version, source_path,
                  backup_path, start_time))
            return cursor.lastrowid

    def update_backup_record(self, backup_id: int, **kwargs):
        fields = ", ".join([f"{k} = ?" for k in kwargs.keys()])
        values = list(kwargs.values()) + [backup_id]
        
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(f"UPDATE backup_records SET {fields} WHERE id = ?", values)

    def get_backup_record(self, backup_id: int) -> Optional[Dict[str, Any]]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM backup_records WHERE id = ?", (backup_id,))
            row = cursor.fetchone()
            return dict(row) if row else None

    def get_latest_successful_backup(self, system_name: str, 
                                    backup_type: Optional[str] = None) -> Optional[Dict[str, Any]]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            if backup_type:
                cursor.execute("""
                    SELECT * FROM backup_records 
                    WHERE system_name = ? AND backup_type = ? AND status = 'success'
                    ORDER BY start_time DESC LIMIT 1
                """, (system_name, backup_type))
            else:
                cursor.execute("""
                    SELECT * FROM backup_records 
                    WHERE system_name = ? AND status = 'success'
                    ORDER BY start_time DESC LIMIT 1
                """, (system_name,))
            row = cursor.fetchone()
            return dict(row) if row else None

    def get_backup_by_version(self, system_name: str, 
                              backup_version: str) -> Optional[Dict[str, Any]]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM backup_records 
                WHERE system_name = ? AND backup_version = ? AND status = 'success'
                ORDER BY start_time DESC LIMIT 1
            """, (system_name, backup_version))
            row = cursor.fetchone()
            return dict(row) if row else None

    def query_backups(self, system_name: Optional[str] = None,
                     backup_type: Optional[str] = None,
                     start_time: Optional[datetime] = None,
                     end_time: Optional[datetime] = None,
                     status: Optional[str] = None,
                     limit: int = 100,
                     offset: int = 0) -> List[Dict[str, Any]]:
        query = "SELECT * FROM backup_records WHERE 1=1"
        params = []

        if system_name:
            query += " AND system_name = ?"
            params.append(system_name)
        if backup_type:
            query += " AND backup_type = ?"
            params.append(backup_type)
        if status:
            query += " AND status = ?"
            params.append(status)
        if start_time:
            query += " AND start_time >= ?"
            params.append(start_time)
        if end_time:
            query += " AND start_time <= ?"
            params.append(end_time)

        query += " ORDER BY start_time DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, params)
            return [dict(row) for row in cursor.fetchall()]

    def create_restore_record(self, system_name: str, backup_version: str,
                             backup_id: int, restore_path: str,
                             start_time: datetime) -> int:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO restore_records 
                (system_name, backup_version, backup_id, restore_path, 
                 status, start_time)
                VALUES (?, ?, ?, ?, 'running', ?)
            """, (system_name, backup_version, backup_id, restore_path, start_time))
            return cursor.lastrowid

    def update_restore_record(self, restore_id: int, **kwargs):
        fields = ", ".join([f"{k} = ?" for k in kwargs.keys()])
        values = list(kwargs.values()) + [restore_id]
        
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(f"UPDATE restore_records SET {fields} WHERE id = ?", values)

    def query_restores(self, system_name: Optional[str] = None,
                      start_time: Optional[datetime] = None,
                      end_time: Optional[datetime] = None,
                      status: Optional[str] = None,
                      limit: int = 100) -> List[Dict[str, Any]]:
        query = "SELECT * FROM restore_records WHERE 1=1"
        params = []

        if system_name:
            query += " AND system_name = ?"
            params.append(system_name)
        if status:
            query += " AND status = ?"
            params.append(status)
        if start_time:
            query += " AND start_time >= ?"
            params.append(start_time)
        if end_time:
            query += " AND start_time <= ?"
            params.append(end_time)

        query += " ORDER BY start_time DESC LIMIT ?"
        params.append(limit)

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, params)
            return [dict(row) for row in cursor.fetchall()]

    def save_file_hashes(self, backup_id: int, hashes: List[Tuple[str, str, int]]):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.executemany("""
                INSERT INTO file_hashes (backup_id, file_path, file_hash, file_size)
                VALUES (?, ?, ?, ?)
            """, [(backup_id, fp, fh, fs) for fp, fh, fs in hashes])

    def get_file_hashes(self, backup_id: int) -> List[Dict[str, Any]]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM file_hashes WHERE backup_id = ?", (backup_id,))
            return [dict(row) for row in cursor.fetchall()]

    def create_verification_record(self, backup_id: int, verify_type: str,
                                   status: str, checksum_match: bool = None,
                                   error_message: str = None,
                                   retry_count: int = 0) -> int:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO verification_records 
                (backup_id, verify_type, status, checksum_match, 
                 error_message, retry_count)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (backup_id, verify_type, status, checksum_match,
                  error_message, retry_count))
            return cursor.lastrowid

    def create_cleanup_record(self, system_name: str, backup_version: str,
                             backup_id: int, backup_size: int,
                             cleanup_time: datetime, status: str,
                             notification_sent: bool = False,
                             error_message: str = None) -> int:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO cleanup_records 
                (system_name, backup_version, backup_id, backup_size, 
                 cleanup_time, status, notification_sent, error_message)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (system_name, backup_version, backup_id, backup_size,
                  cleanup_time, status, notification_sent, error_message))
            return cursor.lastrowid

    def get_expired_backups(self, system_name: str, 
                           retention_days: int) -> List[Dict[str, Any]]:
        cutoff_date = datetime.now() - timedelta(days=retention_days)
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM backup_records 
                WHERE system_name = ? AND status = 'success' 
                AND start_time < ?
                AND id NOT IN (
                    SELECT backup_id FROM cleanup_records WHERE status = 'success'
                )
                ORDER BY start_time ASC
            """, (system_name, cutoff_date))
            return [dict(row) for row in cursor.fetchall()]

    def create_report_record(self, report_type: str, report_period: str,
                            start_date: datetime, end_date: datetime,
                            **kwargs) -> int:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO report_records 
                (report_type, report_period, start_date, end_date,
                 total_backups, successful_backups, failed_backups,
                 success_rate, total_size, restore_tests, 
                 successful_restores, report_path)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                report_type, report_period, start_date, end_date,
                kwargs.get('total_backups', 0),
                kwargs.get('successful_backups', 0),
                kwargs.get('failed_backups', 0),
                kwargs.get('success_rate', 0.0),
                kwargs.get('total_size', 0),
                kwargs.get('restore_tests', 0),
                kwargs.get('successful_restores', 0),
                kwargs.get('report_path', '')
            ))
            return cursor.lastrowid

    def get_backup_statistics(self, start_date: datetime, 
                             end_date: datetime) -> Dict[str, Any]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful,
                    SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
                    SUM(CASE WHEN status = 'success' THEN total_size ELSE 0 END) as total_size
                FROM backup_records
                WHERE start_time >= ? AND start_time <= ?
            """, (start_date, end_date))
            
            backup_stats = dict(cursor.fetchone())
            
            cursor.execute("""
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful
                FROM restore_records
                WHERE start_time >= ? AND start_time <= ?
            """, (start_date, end_date))
            
            restore_stats = dict(cursor.fetchone())
            
            success_rate = 0.0
            if backup_stats['total'] > 0:
                success_rate = (backup_stats['successful'] / backup_stats['total']) * 100
            
            return {
                'total_backups': backup_stats['total'] or 0,
                'successful_backups': backup_stats['successful'] or 0,
                'failed_backups': backup_stats['failed'] or 0,
                'success_rate': round(success_rate, 2),
                'total_size': backup_stats['total_size'] or 0,
                'restore_tests': restore_stats['total'] or 0,
                'successful_restores': restore_stats['successful'] or 0
            }

    def query_cleanups(self, system_name: Optional[str] = None,
                      start_time: Optional[datetime] = None,
                      end_time: Optional[datetime] = None,
                      limit: int = 100) -> List[Dict[str, Any]]:
        query = "SELECT * FROM cleanup_records WHERE 1=1"
        params = []

        if system_name:
            query += " AND system_name = ?"
            params.append(system_name)
        if start_time:
            query += " AND cleanup_time >= ?"
            params.append(start_time)
        if end_time:
            query += " AND cleanup_time <= ?"
            params.append(end_time)

        query += " ORDER BY cleanup_time DESC LIMIT ?"
        params.append(limit)

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, params)
            return [dict(row) for row in cursor.fetchall()]
