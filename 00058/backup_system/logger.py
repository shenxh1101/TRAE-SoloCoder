import logging
import os
from datetime import datetime
from pathlib import Path
from typing import Optional
from .config import ConfigManager


class LoggerManager:
    _instance = None
    _loggers = {}

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if not self._loggers:
            self._config = ConfigManager().config
            self._setup_root_logger()

    def _setup_root_logger(self):
        log_dir = self._config.log_dir
        os.makedirs(log_dir, exist_ok=True)

        root_logger = logging.getLogger("backup_system")
        root_logger.setLevel(logging.DEBUG)
        root_logger.propagate = False

        if not root_logger.handlers:
            formatter = logging.Formatter(
                "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
                datefmt="%Y-%m-%d %H:%M:%S"
            )

            console_handler = logging.StreamHandler()
            console_handler.setLevel(logging.INFO)
            console_handler.setFormatter(formatter)
            root_logger.addHandler(console_handler)

            today = datetime.now().strftime("%Y%m%d")
            file_handler = logging.FileHandler(
                log_dir / f"backup_system_{today}.log",
                encoding="utf-8"
            )
            file_handler.setLevel(logging.DEBUG)
            file_handler.setFormatter(formatter)
            root_logger.addHandler(file_handler)

            error_handler = logging.FileHandler(
                log_dir / f"backup_system_error_{today}.log",
                encoding="utf-8"
            )
            error_handler.setLevel(logging.ERROR)
            error_handler.setFormatter(formatter)
            root_logger.addHandler(error_handler)

    def get_logger(self, name: str) -> logging.Logger:
        if name not in self._loggers:
            logger = logging.getLogger(f"backup_system.{name}")
            logger.setLevel(logging.DEBUG)
            self._loggers[name] = logger
        return self._loggers[name]

    def log_operation(self, operation: str, system_name: str, 
                     status: str, message: str, details: Optional[dict] = None):
        logger = self.get_logger("operation")
        detail_str = f" - {details}" if details else ""
        log_msg = f"[{operation}] System: {system_name} - Status: {status} - Message: {message}{detail_str}"
        
        if status == "success":
            logger.info(log_msg)
        elif status == "warning":
            logger.warning(log_msg)
        elif status == "error":
            logger.error(log_msg)
        else:
            logger.info(log_msg)


def get_logger(name: str) -> logging.Logger:
    return LoggerManager().get_logger(name)


def log_operation(operation: str, system_name: str, 
                  status: str, message: str, details: Optional[dict] = None):
    LoggerManager().log_operation(operation, system_name, status, message, details)
