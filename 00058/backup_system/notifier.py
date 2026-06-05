import smtplib
import json
import requests
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.header import Header
from typing import List, Dict, Any, Optional
from .config import ConfigManager
from .logger import get_logger


class Notifier:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        self._config = ConfigManager().config
        self._notif_config = self._config.notification
        self._logger = get_logger("notifier")

    def send_alert(self, subject: str, message: str, 
                   level: str = "warning", 
                   details: Optional[Dict[str, Any]] = None):
        if not self._notif_config.enabled:
            self._logger.info("Notification disabled, skipping alert")
            return False

        full_message = self._format_message(subject, message, level, details)
        
        success = False
        if self._notif_config.email_host:
            success = self._send_email(subject, full_message) or success
        
        if self._notif_config.webhook_url:
            success = self._send_webhook(subject, full_message, level) or success
        
        return success

    def send_cleanup_notification(self, system_name: str, 
                                 backup_count: int, 
                                 total_size: int) -> bool:
        subject = f"备份清理确认 - {system_name}"
        message = (
            f"系统 [{system_name}] 有 {backup_count} 个备份即将被清理，"
            f"总大小: {self._format_size(total_size)}。\n"
            f"请在24小时内确认是否阻止清理。"
        )
        return self.send_alert(subject, message, "info", {
            "system_name": system_name,
            "backup_count": backup_count,
            "total_size": total_size
        })

    def send_backup_failure(self, system_name: str, backup_type: str,
                           error_message: str, retry_count: int) -> bool:
        subject = f"备份失败告警 - {system_name}"
        message = (
            f"系统 [{system_name}] 的 {backup_type} 备份失败。\n"
            f"错误信息: {error_message}\n"
            f"已重试次数: {retry_count}/{self._config.max_retry_count}"
        )
        return self.send_alert(subject, message, "error", {
            "system_name": system_name,
            "backup_type": backup_type,
            "error_message": error_message,
            "retry_count": retry_count
        })

    def send_verification_failure(self, system_name: str, backup_version: str,
                                 error_message: str, retry_count: int) -> bool:
        subject = f"备份校验失败告警 - {system_name}"
        message = (
            f"系统 [{system_name}] 备份版本 [{backup_version}] 校验失败。\n"
            f"错误信息: {error_message}\n"
            f"已重试次数: {retry_count}/{self._config.max_retry_count}"
        )
        return self.send_alert(subject, message, "error", {
            "system_name": system_name,
            "backup_version": backup_version,
            "error_message": error_message,
            "retry_count": retry_count
        })

    def send_restore_failure(self, system_name: str, backup_version: str,
                            error_message: str) -> bool:
        subject = f"恢复失败告警 - {system_name}"
        message = (
            f"系统 [{system_name}] 从版本 [{backup_version}] 恢复失败。\n"
            f"错误信息: {error_message}"
        )
        return self.send_alert(subject, message, "error", {
            "system_name": system_name,
            "backup_version": backup_version,
            "error_message": error_message
        })

    def send_restore_hash_mismatch(self, system_name: str, backup_version: str,
                                  diff_report_path: str) -> bool:
        subject = f"恢复数据不一致告警 - {system_name}"
        message = (
            f"系统 [{system_name}] 从版本 [{backup_version}] 恢复后，"
            f"数据哈希校验不通过。\n"
            f"差异报告路径: {diff_report_path}"
        )
        return self.send_alert(subject, message, "error", {
            "system_name": system_name,
            "backup_version": backup_version,
            "diff_report_path": diff_report_path
        })

    def send_weekly_report(self, report_path: str, stats: Dict[str, Any]) -> bool:
        subject = f"每周备份报告 - {stats.get('period', '本周')}"
        message = (
            f"备份统计报告:\n"
            f"- 总备份数: {stats.get('total_backups', 0)}\n"
            f"- 成功备份: {stats.get('successful_backups', 0)}\n"
            f"- 失败备份: {stats.get('failed_backups', 0)}\n"
            f"- 成功率: {stats.get('success_rate', 0)}%\n"
            f"- 总占用空间: {self._format_size(stats.get('total_size', 0))}\n"
            f"- 恢复测试数: {stats.get('restore_tests', 0)}\n"
            f"- 成功恢复数: {stats.get('successful_restores', 0)}\n\n"
            f"详细报告见附件: {report_path}"
        )
        return self.send_alert(subject, message, "info", stats)

    def _format_message(self, subject: str, message: str, 
                       level: str, details: Optional[Dict[str, Any]]) -> str:
        import datetime
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        header = f"[{level.upper()}] {subject}\n时间: {timestamp}\n\n"
        detail_str = "\n"
        if details:
            detail_str = "\n详细信息:\n"
            for k, v in details.items():
                detail_str += f"  {k}: {v}\n"
        return header + message + detail_str

    def _send_email(self, subject: str, message: str) -> bool:
        try:
            msg = MIMEMultipart()
            msg['From'] = self._notif_config.email_from or self._notif_config.email_user
            msg['To'] = ", ".join(self._notif_config.admin_emails)
            msg['Subject'] = Header(subject, 'utf-8')

            msg.attach(MIMEText(message, 'plain', 'utf-8'))

            server = smtplib.SMTP(
                self._notif_config.email_host,
                self._notif_config.email_port
            )
            server.starttls()
            
            if self._notif_config.email_user and self._notif_config.email_password:
                server.login(
                    self._notif_config.email_user,
                    self._notif_config.email_password
                )
            
            server.sendmail(
                msg['From'],
                self._notif_config.admin_emails,
                msg.as_string()
            )
            server.quit()
            
            self._logger.info(f"Email notification sent successfully: {subject}")
            return True
        except Exception as e:
            self._logger.error(f"Failed to send email notification: {e}")
            return False

    def _send_webhook(self, subject: str, message: str, level: str) -> bool:
        try:
            payload = {
                "subject": subject,
                "message": message,
                "level": level,
                "timestamp": __import__("datetime").datetime.now().isoformat()
            }

            headers = {
                "Content-Type": "application/json"
            }

            response = requests.post(
                self._notif_config.webhook_url,
                data=json.dumps(payload),
                headers=headers,
                timeout=10
            )
            response.raise_for_status()
            
            self._logger.info(f"Webhook notification sent successfully: {subject}")
            return True
        except Exception as e:
            self._logger.error(f"Failed to send webhook notification: {e}")
            return False

    @staticmethod
    def _format_size(size_bytes: int) -> str:
        if size_bytes == 0:
            return "0 B"
        size_names = ["B", "KB", "MB", "GB", "TB"]
        import math
        i = int(math.floor(math.log(size_bytes, 1024)))
        p = math.pow(1024, i)
        s = round(size_bytes / p, 2)
        return f"{s} {size_names[i]}"
