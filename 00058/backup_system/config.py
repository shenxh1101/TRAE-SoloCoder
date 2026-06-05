import os
import yaml
from typing import Dict, Any, List
from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class SystemConfig:
    name: str
    source_path: str
    backup_schedule: str = "0 2 * * *"
    incremental_enabled: bool = True
    full_backup_interval: int = 7
    retention_days: int = 30
    excludes: List[str] = field(default_factory=list)


@dataclass
class StorageConfig:
    type: str = "local"
    local_path: str = ""
    remote_host: str = ""
    remote_port: int = 22
    remote_user: str = ""
    remote_path: str = ""
    s3_bucket: str = ""
    s3_region: str = ""
    s3_access_key: str = ""
    s3_secret_key: str = ""


@dataclass
class NotificationConfig:
    enabled: bool = False
    email_host: str = ""
    email_port: int = 25
    email_user: str = ""
    email_password: str = ""
    email_from: str = ""
    admin_emails: List[str] = field(default_factory=list)
    webhook_url: str = ""


@dataclass
class SchedulerConfig:
    daemon_enabled: bool = True
    retention_cleanup_schedule: str = "0 3 * * *"
    weekly_report_schedule: str = "0 8 * * 0"
    misfire_grace_time: int = 3600
    max_instances: int = 1
    coalesce: bool = True
    timezone: str = "Asia/Shanghai"


@dataclass
class AppConfig:
    base_dir: Path
    log_dir: Path
    data_dir: Path
    database_path: Path
    systems: Dict[str, SystemConfig] = field(default_factory=dict)
    storage: StorageConfig = field(default_factory=StorageConfig)
    notification: NotificationConfig = field(default_factory=NotificationConfig)
    scheduler: SchedulerConfig = field(default_factory=SchedulerConfig)
    max_retry_count: int = 2
    verify_timeout: int = 300
    report_day: str = "sunday"


class ConfigManager:
    _instance = None
    _config: AppConfig = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if self._config is None:
            self._load_config()

    def _load_config(self):
        base_dir = Path("/Users/mac/AI Coding/solo coder/00058")
        config_path = base_dir / "config.yaml"

        self._config = AppConfig(
            base_dir=base_dir,
            log_dir=base_dir / "logs",
            data_dir=base_dir / "data",
            database_path=base_dir / "data" / "backup_system.db"
        )

        if config_path.exists():
            with open(config_path, "r", encoding="utf-8") as f:
                yaml_config = yaml.safe_load(f) or {}

            self._parse_yaml_config(yaml_config)
        else:
            self._create_default_config(config_path)

    def _parse_yaml_config(self, yaml_config: Dict[str, Any]):
        if "max_retry_count" in yaml_config:
            self._config.max_retry_count = yaml_config["max_retry_count"]
        if "verify_timeout" in yaml_config:
            self._config.verify_timeout = yaml_config["verify_timeout"]
        if "report_day" in yaml_config:
            self._config.report_day = yaml_config["report_day"]

        if "storage" in yaml_config:
            storage = yaml_config["storage"]
            self._config.storage = StorageConfig(
                type=storage.get("type", "local"),
                local_path=storage.get("local_path", ""),
                remote_host=storage.get("remote_host", ""),
                remote_port=storage.get("remote_port", 22),
                remote_user=storage.get("remote_user", ""),
                remote_path=storage.get("remote_path", ""),
                s3_bucket=storage.get("s3_bucket", ""),
                s3_region=storage.get("s3_region", ""),
                s3_access_key=storage.get("s3_access_key", ""),
                s3_secret_key=storage.get("s3_secret_key", "")
            )

        if "notification" in yaml_config:
            notif = yaml_config["notification"]
            self._config.notification = NotificationConfig(
                enabled=notif.get("enabled", False),
                email_host=notif.get("email_host", ""),
                email_port=notif.get("email_port", 25),
                email_user=notif.get("email_user", ""),
                email_password=notif.get("email_password", ""),
                email_from=notif.get("email_from", ""),
                admin_emails=notif.get("admin_emails", []),
                webhook_url=notif.get("webhook_url", "")
            )

        if "scheduler" in yaml_config:
            sched = yaml_config["scheduler"]
            self._config.scheduler = SchedulerConfig(
                daemon_enabled=sched.get("daemon_enabled", True),
                retention_cleanup_schedule=sched.get("retention_cleanup_schedule", "0 3 * * *"),
                weekly_report_schedule=sched.get("weekly_report_schedule", "0 8 * * 0"),
                misfire_grace_time=sched.get("misfire_grace_time", 3600),
                max_instances=sched.get("max_instances", 1),
                coalesce=sched.get("coalesce", True),
                timezone=sched.get("timezone", "Asia/Shanghai")
            )

        if "systems" in yaml_config:
            for sys_name, sys_cfg in yaml_config["systems"].items():
                self._config.systems[sys_name] = SystemConfig(
                    name=sys_name,
                    source_path=sys_cfg.get("source_path", ""),
                    backup_schedule=sys_cfg.get("backup_schedule", "0 2 * * *"),
                    incremental_enabled=sys_cfg.get("incremental_enabled", True),
                    full_backup_interval=sys_cfg.get("full_backup_interval", 7),
                    retention_days=sys_cfg.get("retention_days", 30),
                    excludes=sys_cfg.get("excludes", [])
                )

    def _create_default_config(self, config_path: Path):
        default_config = {
            "max_retry_count": 2,
            "verify_timeout": 300,
            "report_day": "sunday",
            "storage": {
                "type": "local",
                "local_path": str(self._config.data_dir / "backups")
            },
            "notification": {
                "enabled": False,
                "admin_emails": ["admin@example.com"]
            },
            "scheduler": {
                "daemon_enabled": True,
                "retention_cleanup_schedule": "0 3 * * *",
                "weekly_report_schedule": "0 8 * * 0",
                "misfire_grace_time": 3600,
                "max_instances": 1,
                "coalesce": True,
                "timezone": "Asia/Shanghai"
            },
            "systems": {
                "example_system": {
                    "source_path": "/path/to/source",
                    "backup_schedule": "0 2 * * *",
                    "incremental_enabled": True,
                    "full_backup_interval": 7,
                    "retention_days": 30,
                    "excludes": ["*.tmp", "*.log", "node_modules"]
                }
            }
        }

        os.makedirs(self._config.log_dir, exist_ok=True)
        os.makedirs(self._config.data_dir, exist_ok=True)

        with open(config_path, "w", encoding="utf-8") as f:
            yaml.dump(default_config, f, default_flow_style=False, allow_unicode=True, indent=2)

    @property
    def config(self) -> AppConfig:
        return self._config

    @property
    def app_config(self) -> AppConfig:
        return self._config

    def get_system(self, system_name: str) -> SystemConfig:
        return self._config.systems.get(system_name)

    def get_systems(self) -> Dict[str, SystemConfig]:
        return self._config.systems

    def list_systems(self) -> List[str]:
        return list(self._config.systems.keys())
