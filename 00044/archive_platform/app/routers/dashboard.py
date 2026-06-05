from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from app.database import get_db
from app.models import Archive, BorrowRequest, User, CopyRequest, DestructionRequest
from app.schemas import DashboardStats, HotArchive, OverdueItem
from app.auth import get_current_user, require_role
from typing import List

router = APIRouter(prefix="/api/dashboard", tags=["数据看板"])


@router.get("/stats", response_model=DashboardStats)
def get_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    public_count = db.query(Archive).filter(Archive.classification == "public", Archive.status == "active").count()
    internal_count = db.query(Archive).filter(Archive.classification == "internal", Archive.status == "active").count()
    confidential_count = db.query(Archive).filter(Archive.classification == "confidential", Archive.status == "active").count()
    total = public_count + internal_count + confidential_count
    active_borrows = db.query(BorrowRequest).filter(BorrowRequest.status == "approved").count()
    overdue_count = db.query(BorrowRequest).filter(
        BorrowRequest.status == "approved",
        BorrowRequest.due_date < datetime.utcnow(),
    ).count()
    pending_approvals = (
        db.query(BorrowRequest).filter(BorrowRequest.status == "pending").count()
        + db.query(CopyRequest).filter(CopyRequest.status == "pending").count()
        + db.query(DestructionRequest).filter(DestructionRequest.status.in_(["pending", "level1_approved"])).count()
    )
    return DashboardStats(
        public_count=public_count,
        internal_count=internal_count,
        confidential_count=confidential_count,
        total_archives=total,
        active_borrows=active_borrows,
        overdue_count=overdue_count,
        pending_approvals=pending_approvals,
    )


@router.get("/hot-archives", response_model=List[HotArchive])
def hot_archives(limit: int = 10, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    items = db.query(Archive).filter(Archive.status == "active").order_by(Archive.borrow_count.desc()).limit(limit).all()
    return [HotArchive(archive_no=a.archive_no, title=a.title, classification=a.classification, borrow_count=a.borrow_count) for a in items]


@router.get("/overdue", response_model=List[OverdueItem])
def overdue_list(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    now = datetime.utcnow()
    items = db.query(BorrowRequest).filter(
        BorrowRequest.status == "approved",
        BorrowRequest.due_date < now,
    ).all()
    result = []
    for b in items:
        archive = db.query(Archive).filter(Archive.id == b.archive_id).first()
        borrower = db.query(User).filter(User.id == b.borrower_id).first()
        days_overdue = (now - b.due_date).days if b.due_date else 0
        result.append(OverdueItem(
            id=b.id,
            archive_no=archive.archive_no if archive else "",
            archive_title=archive.title if archive else "",
            borrower_name=borrower.real_name if borrower else "",
            due_date=b.due_date,
            days_overdue=days_overdue,
        ))
    return result


@router.get("/retention-alerts")
def retention_alerts(db: Session = Depends(get_db), current_user: User = Depends(require_role("admin"))):
    now = datetime.utcnow()
    alert_date = now + timedelta(days=30)
    archives = db.query(Archive).filter(
        Archive.status == "active",
        Archive.retention_end_date != None,
        Archive.retention_end_date <= alert_date,
        Archive.retention_end_date >= now,
    ).all()
    expired = db.query(Archive).filter(
        Archive.status == "active",
        Archive.retention_end_date != None,
        Archive.retention_end_date < now,
    ).all()
    return {
        "expiring_soon": [{"id": a.id, "archive_no": a.archive_no, "title": a.title, "retention_end_date": a.retention_end_date.isoformat()} for a in archives],
        "expired": [{"id": a.id, "archive_no": a.archive_no, "title": a.title, "retention_end_date": a.retention_end_date.isoformat()} for a in expired],
    }
