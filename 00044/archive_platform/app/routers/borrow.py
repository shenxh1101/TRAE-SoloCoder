from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional, List
from app.database import get_db
from app.models import Archive, BorrowRequest, BorrowStatusEnum, User, Notification
from app.schemas import BorrowRequestCreate, BorrowRequestOut
from app.auth import get_current_user, require_role
from app.services.permissions import can_access_classification, is_frozen

router = APIRouter(prefix="/api/borrow", tags=["借阅管理"])


@router.post("/", response_model=BorrowRequestOut)
def create_borrow_request(data: BorrowRequestCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if is_frozen(current_user):
        raise HTTPException(status_code=403, detail=f"借阅权限已冻结，解冻日期：{current_user.frozen_until.strftime('%Y-%m-%d')}")
    archive = db.query(Archive).filter(Archive.id == data.archive_id).first()
    if not archive:
        raise HTTPException(status_code=404, detail="档案不存在")
    if archive.status != "active":
        raise HTTPException(status_code=400, detail="该档案不可借阅")
    if archive.available_quantity <= 0:
        raise HTTPException(status_code=400, detail="该档案库存不足，暂时无法借阅")
    if not can_access_classification(current_user, archive.classification):
        raise HTTPException(status_code=403, detail=f"您的角色({current_user.role})无权借阅{archive.classification}级档案")
    active_borrow = db.query(BorrowRequest).filter(
        BorrowRequest.borrower_id == current_user.id,
        BorrowRequest.archive_id == data.archive_id,
        BorrowRequest.status.in_(["pending", "approved"]),
    ).first()
    if active_borrow:
        raise HTTPException(status_code=400, detail="您已借阅或正在申请借阅该档案")
    borrow = BorrowRequest(
        archive_id=data.archive_id,
        borrower_id=current_user.id,
        due_date=datetime.utcnow() + timedelta(days=data.days),
    )
    db.add(borrow)
    db.flush()
    admins = db.query(User).filter(User.role == "admin").all()
    for admin in admins:
        notif = Notification(
            user_id=admin.id,
            type="borrow_request",
            message=f"{current_user.real_name}申请借阅档案[{archive.archive_no}]{archive.title}",
            related_id=borrow.id,
        )
        db.add(notif)
    db.commit()
    db.refresh(borrow)
    result = _enrich_borrow(borrow, db)
    return result


@router.get("/my", response_model=List[BorrowRequestOut])
def my_borrows(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(BorrowRequest).filter(BorrowRequest.borrower_id == current_user.id)
    if status:
        query = query.filter(BorrowRequest.status == status)
    items = query.order_by(BorrowRequest.id.desc()).all()
    return [_enrich_borrow(b, db) for b in items]


@router.get("/pending", response_model=List[BorrowRequestOut])
def pending_borrows(db: Session = Depends(get_db), current_user: User = Depends(require_role("admin", "supervisor"))):
    items = db.query(BorrowRequest).filter(BorrowRequest.status == "pending").order_by(BorrowRequest.id.desc()).all()
    return [_enrich_borrow(b, db) for b in items]


@router.put("/{borrow_id}/approve")
def approve_borrow(borrow_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role("admin", "supervisor"))):
    borrow = db.query(BorrowRequest).filter(BorrowRequest.id == borrow_id).first()
    if not borrow:
        raise HTTPException(status_code=404, detail="借阅申请不存在")
    if borrow.status != "pending":
        raise HTTPException(status_code=400, detail="该申请已处理")
    archive = db.query(Archive).filter(Archive.id == borrow.archive_id).first()
    if archive and archive.available_quantity <= 0:
        raise HTTPException(status_code=400, detail="库存不足，无法批准")
    borrow.status = BorrowStatusEnum.approved.value
    borrow.approved_by = current_user.id
    borrow.approved_date = datetime.utcnow()
    if archive:
        archive.borrow_count += 1
        archive.available_quantity -= 1
    notif = Notification(
        user_id=borrow.borrower_id,
        type="borrow_approved",
        message=f"您的借阅申请[{archive.archive_no if archive else ''}]已批准",
    )
    db.add(notif)
    db.commit()
    return {"message": "已批准"}


@router.put("/{borrow_id}/reject")
def reject_borrow(borrow_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role("admin", "supervisor"))):
    borrow = db.query(BorrowRequest).filter(BorrowRequest.id == borrow_id).first()
    if not borrow:
        raise HTTPException(status_code=404, detail="借阅申请不存在")
    if borrow.status != "pending":
        raise HTTPException(status_code=400, detail="该申请已处理")
    archive = db.query(Archive).filter(Archive.id == borrow.archive_id).first()
    borrow.status = BorrowStatusEnum.rejected.value
    borrow.approved_by = current_user.id
    borrow.approved_date = datetime.utcnow()
    notif = Notification(
        user_id=borrow.borrower_id,
        type="borrow_rejected",
        message=f"您的借阅申请[{archive.archive_no if archive else ''}]已拒绝",
    )
    db.add(notif)
    db.commit()
    return {"message": "已拒绝"}


@router.put("/{borrow_id}/return")
def return_borrow(borrow_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    borrow = db.query(BorrowRequest).filter(BorrowRequest.id == borrow_id).first()
    if not borrow:
        raise HTTPException(status_code=404, detail="借阅记录不存在")
    if borrow.borrower_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="无权操作")
    if borrow.status != "approved" and borrow.status != "overdue":
        raise HTTPException(status_code=400, detail="该借阅不在进行中")
    borrow.status = BorrowStatusEnum.returned.value
    borrow.return_date = datetime.utcnow()
    archive = db.query(Archive).filter(Archive.id == borrow.archive_id).first()
    if archive:
        archive.available_quantity += 1
    db.commit()
    return {"message": "已归还"}


@router.get("/all", response_model=List[BorrowRequestOut])
def all_borrows(
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "supervisor", "executive")),
):
    query = db.query(BorrowRequest)
    if status:
        query = query.filter(BorrowRequest.status == status)
    items = query.order_by(BorrowRequest.id.desc()).offset((page - 1) * size).limit(size).all()
    return [_enrich_borrow(b, db) for b in items]


@router.get("/export")
def export_borrows(db: Session = Depends(get_db), current_user: User = Depends(require_role("admin"))):
    import csv
    import io
    items = db.query(BorrowRequest).order_by(BorrowRequest.id.desc()).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "档案编号", "档案名称", "借阅人", "申请日期", "审批人", "审批日期", "到期日期", "归还日期", "状态"])
    for b in items:
        archive = db.query(Archive).filter(Archive.id == b.archive_id).first()
        borrower = db.query(User).filter(User.id == b.borrower_id).first()
        writer.writerow([
            b.id,
            archive.archive_no if archive else "",
            archive.title if archive else "",
            borrower.real_name if borrower else "",
            b.request_date.strftime("%Y-%m-%d %H:%M") if b.request_date else "",
            b.approved_by or "",
            b.approved_date.strftime("%Y-%m-%d %H:%M") if b.approved_date else "",
            b.due_date.strftime("%Y-%m-%d %H:%M") if b.due_date else "",
            b.return_date.strftime("%Y-%m-%d %H:%M") if b.return_date else "",
            b.status,
        ])
    from fastapi.responses import StreamingResponse
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8-sig")),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=borrow_report.csv"},
    )


def _enrich_borrow(borrow: BorrowRequest, db: Session) -> dict:
    archive = db.query(Archive).filter(Archive.id == borrow.archive_id).first()
    borrower = db.query(User).filter(User.id == borrow.borrower_id).first()
    result = BorrowRequestOut(
        id=borrow.id,
        archive_id=borrow.archive_id,
        archive_no=archive.archive_no if archive else "",
        archive_title=archive.title if archive else "",
        archive_classification=archive.classification if archive else "",
        borrower_id=borrow.borrower_id,
        borrower_name=borrower.real_name if borrower else "",
        request_date=borrow.request_date,
        approved_by=borrow.approved_by,
        approved_date=borrow.approved_date,
        due_date=borrow.due_date,
        return_date=borrow.return_date,
        status=borrow.status,
        is_escalated=borrow.is_escalated,
    )
    return result
