from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import (
    BorrowRequest, BorrowStatusEnum, User, Notification, Archive, ArchiveStatusEnum,
)
import logging

logger = logging.getLogger(__name__)


def check_escalations():
    db = SessionLocal()
    try:
        cutoff = datetime.utcnow() - timedelta(hours=24)
        pending = db.query(BorrowRequest).filter(
            BorrowRequest.status == BorrowStatusEnum.pending.value,
            BorrowRequest.request_date < cutoff,
            BorrowRequest.is_escalated == False,
        ).all()
        for borrow in pending:
            borrow.is_escalated = True
            executives = db.query(User).filter(User.role == "executive").all()
            archive = db.query(Archive).filter(Archive.id == borrow.archive_id).first()
            borrower = db.query(User).filter(User.id == borrow.borrower_id).first()
            for ex in executives:
                notif = Notification(
                    user_id=ex.id,
                    type="borrow_escalation",
                    message=f"借阅申请超24小时未处理（升级）：{borrower.real_name if borrower else ''}申请[{archive.archive_no if archive else ''}]{archive.title if archive else ''}",
                    related_id=borrow.id,
                )
                db.add(notif)
            logger.info(f"借阅申请 {borrow.id} 已自动升级")
        db.commit()
    finally:
        db.close()


def check_due_reminders():
    db = SessionLocal()
    try:
        now = datetime.utcnow()
        remind_before = now + timedelta(days=3)
        borrows = db.query(BorrowRequest).filter(
            BorrowRequest.status == BorrowStatusEnum.approved.value,
            BorrowRequest.due_date <= remind_before,
            BorrowRequest.due_date > now,
            BorrowRequest.reminded == False,
        ).all()
        for borrow in borrows:
            borrow.reminded = True
            archive = db.query(Archive).filter(Archive.id == borrow.archive_id).first()
            notif = Notification(
                user_id=borrow.borrower_id,
                type="return_reminder",
                message=f"您借阅的档案[{archive.archive_no if archive else ''}]{archive.title if archive else ''}即将到期，请及时归还",
            )
            db.add(notif)
            logger.info(f"借阅 {borrow.id} 已发送催还通知")
        db.commit()
    finally:
        db.close()


def check_overdue_violations():
    db = SessionLocal()
    try:
        now = datetime.utcnow()
        overdue_borrows = db.query(BorrowRequest).filter(
            BorrowRequest.status == BorrowStatusEnum.approved.value,
            BorrowRequest.due_date < now,
        ).all()
        for borrow in overdue_borrows:
            borrow.status = BorrowStatusEnum.overdue.value
            user = db.query(User).filter(User.id == borrow.borrower_id).first()
            if user:
                user.violation_count += 1
                if user.violation_count >= 3:
                    user.frozen_until = now + timedelta(days=30)
                    notif = Notification(
                        user_id=user.id,
                        type="frozen",
                        message=f"您累计违规{user.violation_count}次，借阅权限已冻结30天",
                    )
                    db.add(notif)
                else:
                    notif = Notification(
                        user_id=user.id,
                        type="overdue_violation",
                        message=f"您借阅的档案已超期，违规次数：{user.violation_count}/3",
                    )
                    db.add(notif)
            logger.info(f"借阅 {borrow.id} 已标记超期违规")
        db.commit()
    finally:
        db.close()


def check_retention_expiry():
    db = SessionLocal()
    try:
        now = datetime.utcnow()
        remind_before = now + timedelta(days=30)
        archives = db.query(Archive).filter(
            Archive.status == ArchiveStatusEnum.active.value,
            Archive.retention_end_date != None,
            Archive.retention_end_date <= remind_before,
            Archive.retention_end_date > now,
        ).all()
        for archive in archives:
            admins = db.query(User).filter(User.role == "admin").all()
            for admin in admins:
                existing = db.query(Notification).filter(
                    Notification.user_id == admin.id,
                    Notification.type == "retention_expiry",
                    Notification.related_id == archive.id,
                ).first()
                if not existing:
                    notif = Notification(
                        user_id=admin.id,
                        type="retention_expiry",
                        message=f"档案[{archive.archive_no}]{archive.title}保管期限即将到期，请安排销毁",
                        related_id=archive.id,
                    )
                    db.add(notif)
        db.commit()
    finally:
        db.close()


def run_all_tasks():
    check_escalations()
    check_due_reminders()
    check_overdue_violations()
    check_retention_expiry()
