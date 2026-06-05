from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional, List
from app.database import get_db
from app.models import Archive, CopyRequest, CopyStatusEnum, User, Department, Notification
from app.schemas import CopyRequestCreate, CopyRequestOut
from app.auth import get_current_user, require_role
from app.services.permissions import can_access_classification

router = APIRouter(prefix="/api/copy", tags=["复印管理"])


@router.post("/", response_model=CopyRequestOut)
def create_copy_request(data: CopyRequestCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    archive = db.query(Archive).filter(Archive.id == data.archive_id).first()
    if not archive:
        raise HTTPException(status_code=404, detail="档案不存在")
    if not can_access_classification(current_user, archive.classification):
        raise HTTPException(status_code=403, detail="无权复印该密级档案")
    dept = db.query(Department).filter(Department.id == current_user.department_id).first()
    requires_supervisor = False
    if dept:
        now = datetime.utcnow()
        if dept.quota_year != now.year or dept.quota_month != now.month:
            dept.quota_year = now.year
            dept.quota_month = now.month
            dept.used_copy_quota = 0
        if dept.used_copy_quota + data.pages > dept.monthly_copy_quota:
            requires_supervisor = True
    copy_req = CopyRequest(
        archive_id=data.archive_id,
        requester_id=current_user.id,
        pages=data.pages,
        reason=data.reason,
        requires_supervisor=requires_supervisor,
    )
    db.add(copy_req)
    if requires_supervisor:
        supervisors = db.query(User).filter(User.department_id == current_user.department_id, User.role == "supervisor").all()
        for sup in supervisors:
            notif = Notification(
                user_id=sup.id,
                type="copy_over_quota",
                message=f"{current_user.real_name}复印申请超出部门月度配额，需审批",
            )
            db.add(notif)
    else:
        admins = db.query(User).filter(User.role == "admin").all()
        for admin in admins:
            notif = Notification(
                user_id=admin.id,
                type="copy_request",
                message=f"{current_user.real_name}申请复印档案[{archive.archive_no}]{archive.title}",
            )
            db.add(notif)
    db.commit()
    db.refresh(copy_req)
    return _enrich_copy(copy_req, db)


@router.get("/my", response_model=List[CopyRequestOut])
def my_copies(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    items = db.query(CopyRequest).filter(CopyRequest.requester_id == current_user.id).order_by(CopyRequest.id.desc()).all()
    return [_enrich_copy(c, db) for c in items]


@router.get("/pending", response_model=List[CopyRequestOut])
def pending_copies(db: Session = Depends(get_db), current_user: User = Depends(require_role("admin", "supervisor"))):
    query = db.query(CopyRequest).filter(CopyRequest.status == "pending")
    if current_user.role == "supervisor":
        query = query.filter(CopyRequest.requires_supervisor == True)
    items = query.order_by(CopyRequest.id.desc()).all()
    return [_enrich_copy(c, db) for c in items]


@router.put("/{copy_id}/approve")
def approve_copy(copy_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role("admin", "supervisor"))):
    copy_req = db.query(CopyRequest).filter(CopyRequest.id == copy_id).first()
    if not copy_req:
        raise HTTPException(status_code=404, detail="复印申请不存在")
    if copy_req.status != "pending":
        raise HTTPException(status_code=400, detail="该申请已处理")
    copy_req.status = CopyStatusEnum.approved.value
    copy_req.approved_by = current_user.id
    copy_req.approved_date = datetime.utcnow()
    requester = db.query(User).filter(User.id == copy_req.requester_id).first()
    if requester:
        dept = db.query(Department).filter(Department.id == requester.department_id).first()
        if dept:
            now = datetime.utcnow()
            if dept.quota_year != now.year or dept.quota_month != now.month:
                dept.quota_year = now.year
                dept.quota_month = now.month
                dept.used_copy_quota = 0
            dept.used_copy_quota += copy_req.pages
    notif = Notification(
        user_id=copy_req.requester_id,
        type="copy_approved",
        message="您的复印申请已批准",
    )
    db.add(notif)
    db.commit()
    return {"message": "已批准"}


@router.put("/{copy_id}/reject")
def reject_copy(copy_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role("admin", "supervisor"))):
    copy_req = db.query(CopyRequest).filter(CopyRequest.id == copy_id).first()
    if not copy_req:
        raise HTTPException(status_code=404, detail="复印申请不存在")
    if copy_req.status != "pending":
        raise HTTPException(status_code=400, detail="该申请已处理")
    copy_req.status = CopyStatusEnum.rejected.value
    copy_req.approved_by = current_user.id
    copy_req.approved_date = datetime.utcnow()
    notif = Notification(
        user_id=copy_req.requester_id,
        type="copy_rejected",
        message="您的复印申请已拒绝",
    )
    db.add(notif)
    db.commit()
    return {"message": "已拒绝"}


def _enrich_copy(copy_req: CopyRequest, db: Session) -> dict:
    archive = db.query(Archive).filter(Archive.id == copy_req.archive_id).first()
    requester = db.query(User).filter(User.id == copy_req.requester_id).first()
    return CopyRequestOut(
        id=copy_req.id,
        archive_id=copy_req.archive_id,
        archive_no=archive.archive_no if archive else "",
        archive_title=archive.title if archive else "",
        requester_id=copy_req.requester_id,
        requester_name=requester.real_name if requester else "",
        pages=copy_req.pages,
        reason=copy_req.reason,
        request_date=copy_req.request_date,
        approved_by=copy_req.approved_by,
        status=copy_req.status,
        requires_supervisor=copy_req.requires_supervisor,
    )
