import json
import logging
import os
import threading
import time
from datetime import datetime, timedelta
from logging.handlers import TimedRotatingFileHandler
from typing import Any, Dict, Optional


class GatewayLogger:
    def __init__(self, log_dir: str = "logs", log_level: str = "INFO"):
        self.log_dir = log_dir
        self.log_level = getattr(logging, log_level.upper(), logging.INFO)
        self._lock = threading.Lock()
        self._setup_logger()
        self._access_logger = self._setup_access_logger()

    def _setup_logger(self) -> None:
        if not os.path.exists(self.log_dir):
            os.makedirs(self.log_dir, exist_ok=True)

        self.logger = logging.getLogger("api_gateway")
        self.logger.setLevel(self.log_level)
        self.logger.propagate = False

        if not self.logger.handlers:
            formatter = logging.Formatter(
                "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
            )

            file_handler = TimedRotatingFileHandler(
                filename=os.path.join(self.log_dir, "gateway.log"),
                when="midnight",
                interval=1,
                backupCount=30,
                encoding="utf-8"
            )
            file_handler.setFormatter(formatter)
            file_handler.setLevel(self.log_level)
            self.logger.addHandler(file_handler)

            console_handler = logging.StreamHandler()
            console_handler.setFormatter(formatter)
            console_handler.setLevel(self.log_level)
            self.logger.addHandler(console_handler)

    def _setup_access_logger(self) -> logging.Logger:
        access_logger = logging.getLogger("api_gateway_access")
        access_logger.setLevel(logging.INFO)
        access_logger.propagate = False

        if not access_logger.handlers:
            access_handler = TimedRotatingFileHandler(
                filename=os.path.join(self.log_dir, "access.log"),
                when="midnight",
                interval=1,
                backupCount=30,
                encoding="utf-8"
            )
            access_handler.setFormatter(logging.Formatter("%(message)s"))
            access_logger.addHandler(access_handler)

        return access_logger

    def log_request(self, log_data: Dict[str, Any]) -> None:
        with self._lock:
            log_entry = {
                "timestamp": datetime.now().isoformat(),
                **log_data
            }
            self._access_logger.info(json.dumps(log_entry, ensure_ascii=False))

    def info(self, message: str, **kwargs) -> None:
        self.logger.info(message, extra=kwargs)

    def warning(self, message: str, **kwargs) -> None:
        self.logger.warning(message, extra=kwargs)

    def error(self, message: str, **kwargs) -> None:
        self.logger.error(message, extra=kwargs)

    def debug(self, message: str, **kwargs) -> None:
        self.logger.debug(message, extra=kwargs)

    def create_request_log(
        self,
        request_id: str,
        method: str,
        path: str,
        client_ip: str,
        user_agent: str,
        route_prefix: Optional[str] = None,
        backend_url: Optional[str] = None,
        auth_method: Optional[str] = None,
        auth_success: Optional[bool] = None,
        rate_limited: bool = False,
        rate_limit_info: Optional[Dict[str, Any]] = None,
        status_code: Optional[int] = None,
        duration_ms: Optional[float] = None,
        mock_mode: bool = False,
        error: Optional[str] = None
    ) -> Dict[str, Any]:
        log_data = {
            "request_id": request_id,
            "method": method,
            "path": path,
            "client_ip": client_ip,
            "user_agent": user_agent,
            "route_prefix": route_prefix,
            "backend_url": backend_url,
            "auth_method": auth_method,
            "auth_success": auth_success,
            "rate_limited": rate_limited,
            "rate_limit_info": rate_limit_info,
            "status_code": status_code,
            "duration_ms": duration_ms,
            "mock_mode": mock_mode,
            "error": error
        }
        return log_data

    def get_log_files(self) -> list:
        if not os.path.exists(self.log_dir):
            return []
        files = []
        for f in sorted(os.listdir(self.log_dir), reverse=True):
            if f.endswith(".log"):
                filepath = os.path.join(self.log_dir, f)
                stat = os.stat(filepath)
                files.append({
                    "name": f,
                    "size": stat.st_size,
                    "modified": datetime.fromtimestamp(stat.st_mtime).isoformat()
                })
        return files

    def read_log_file(self, filename: str, lines: int = 100) -> list:
        filepath = os.path.join(self.log_dir, filename)
        if not os.path.exists(filepath):
            return []
        
        with open(filepath, "r", encoding="utf-8") as f:
            all_lines = f.readlines()
        
        return [line.strip() for line in all_lines[-lines:]]

    def query_logs(
        self,
        date: Optional[str] = None,
        path: Optional[str] = None,
        status_code: Optional[int] = None,
        client_ip: Optional[str] = None,
        limit: int = 100
    ) -> list:
        if not os.path.exists(self.log_dir):
            return []

        results = []
        log_files = self.get_log_files()
        
        target_file = f"access.log"
        if date:
            target_file = f"access.log.{date}"
        
        for log_file in log_files:
            if target_file not in log_file["name"] and "access" in log_file["name"]:
                continue
            
            lines = self.read_log_file(log_file["name"], lines=limit * 2)
            for line in lines:
                try:
                    entry = json.loads(line)
                    if path and not entry.get("path", "").startswith(path):
                        continue
                    if status_code and entry.get("status_code") != status_code:
                        continue
                    if client_ip and entry.get("client_ip") != client_ip:
                        continue
                    results.append(entry)
                    if len(results) >= limit:
                        return results
                except (json.JSONDecodeError, KeyError):
                    continue
        
        return results[:limit]
