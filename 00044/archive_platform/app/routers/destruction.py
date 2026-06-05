import os
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List
from app.database import get_db
from app.models import Archive, DestructionRequest, DestructionStatusEnum, User, Notification, ArchiveStatusEnum
from app.schemas import DestructionRequestOut
from app.auth import get_current_user, require_role

router = APIRouter(prefix="/api/destruction", tags=["销毁管理"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")


@router.post("/", response_model=DestructionRequestOut)
def create_destruction_request(archive_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role("admin"))):
    archive = db.query(Archive).filter(Archive.id == archive_id).first()
    if not archive:
        raise HTTPException(status_code=404, detail="档案不存在")
    if archive.status != "active":
        raise HTTPException(status_code=400, detail="该档案状态不可发起销毁")
    existing = db.query(DestructionRequest).filter(
        DestructionRequest.archive_id == archive_id,
        DestructionRequest.status.in_(["pending", "level1_approved"]),
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="该档案已有进行中的销毁申请")
    req = DestructionRequest(
        archive_id=archive_id,
        requested_by=current_user.id,
    )
    db.add(req)
    archive.status = ArchiveStatusEnum.pending_destruction.value
    supervisors = db.query(User).filter(User.role == "supervisor").all()
    for sup in supervisors:
        notif = Notification(
            user_id=sup.id,
            type="destruction_request",
            message=f"销毁申请：档案[{archive.archive_no}]{archive.title}，需一级审批",
        )
        db.add(notif)
    db.commit()
    db.refresh(req)
    return _enrich_destruction(req, db)


@router.get("/pending", response_model=List[DestructionRequestOut])
def pending_destructions(db: Session = Depends(get_db), current_user: User = Depends(require_role("admin", "supervisor", "executive"))):
    items = db.query(DestructionRequest).filter(
        DestructionRequest.status.in_(["pending", "level1_approved"])
    ).order_by(DestructionRequest.id.desc()).all()
    return [_enrich_destruction(d, db) for d in items]


@router.put("/{destruction_id}/approve-level1")
def approve_level1(destruction_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role("supervisor", "executive"))):
    req = db.query(DestructionRequest).filter(DestructionRequest.id == destruction_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="销毁申请不存在")
    if req.status != "pending":
        raise HTTPException(status_code=400, detail="当前状态不可一级审批")
    req.level1_approver = current_user.id
    req.level1_approved_date = datetime.utcnow()
    req.status = DestructionStatusEnum.level1_approved.value
    archive = db.query(Archive).filter(Archive.id == req.archive_id).first()
    executives = db.query(User).filter(User.role == "executive").all()
    for ex in executives:
        notif = Notification(
            user_id=ex.id,
            type="destruction_level2",
            message=f"销毁申请需二级审批：档案[{archive.archive_no if archive else ''}]{archive.title if archive else ''}",
        )
        db.add(notif)
    db.commit()
    return {"message": "一级审批通过"}


@router.put("/{destruction_id}/approve-level2")
def approve_level2(destruction_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role("executive"))):
    req = db.query(DestructionRequest).filter(DestructionRequest.id == destruction_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="销毁申请不存在")
    if req.status != "level1_approved":
        raise HTTPException(status_code=400, detail="当前状态不可二级审批")
    req.level2_approver = current_user.id
    req.level2_approved_date = datetime.utcnow()
    req.status = DestructionStatusEnum.level2_approved.value
    db.commit()
    return {"message": "二级审批通过，请上传销毁影像"}


@router.put("/{destruction_id}/upload-video")
def upload_destruction_video(destruction_id: int, video: UploadFile = File(...), db: Session = Depends(get_db), current_user: User = Depends(require_role("admin"))):
    req = db.query(DestructionRequest).filter(DestructionRequest.id == destruction_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="销毁申请不存在")
    if req.status != "level2_approved":
        raise HTTPException(status_code=400, detail="需二级审批通过后才能上传影像")
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    file_path = os.path.join(UPLOAD_DIR, f"destruction_{destruction_id}_{video.filename}")
    with open(file_path, "wb") as f:
        content = video.file.read()
        f.write(content)
    req.video_path = file_path
    req.status = DestructionStatusEnum.completed.value
    req.completed_date = datetime.utcnow()
    archive = db.query(Archive).filter(Archive.id == req.archive_id).first()
    if archive:
        archive.status = ArchiveStatusEnum.destroyed.value
    db.commit()
    return {"message": "销毁完成"}


@router.put("/{destruction_id}/reject")
def reject_destruction(destruction_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role("supervisor", "executive"))):
    req = db.query(DestructionRequest).filter(DestructionRequest.id == destruction_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="销毁申请不存在")
    if req.status not in ("pending", "level1_approved"):
        raise HTTPException(status_code=400, detail="当前状态不可拒绝")
    req.status = DestructionStatusEnum.rejected.value
    archive = db.query(Archive).filter(Archive.id == req.archive_id).first()
    if archive:
        archive.status = ArchiveStatusEnum.active.value
    db.commit()
    return {"message": "销毁申请已拒绝"}


@router.get("/all", response_model=List[DestructionRequestOut])
def all_destructions(db: Session = Depends(get_db), current_user: User = Depends(require_role("admin"))):
    items = db.query(DestructionRequest).order_by(DestructionRequest.id.desc()).all()
    return [_enrich_destruction(d, db) for d in items]


def _enrich_destruction(req: DestructionRequest, db: Session) -> dict:
    archive = db.query(Archive).filter(Archive.id == req.archive_id).first()
    requester = db.query(User).filter(User.id == req.requested_by).first()
    return DestructionRequestOut(
        id=req.id,
        archive_id=req.archive_id,
        archive_no=archive.archive_no if archive else "",
        archive_title=archive.title if archive else "",
        requested_by=req.requested_by,
        requester_name=requester.real_name if requester else "",
        requested_date=req.requested_date,
        level1_approver=req.level1_approver,
        level1_approved_date=req.level1_approved_date,
        level2_approver=req.level2_approver,
        level2_approved_date=req.level2_approved_date,
        status=req.status,
        video_path=req.video_path,
        completed_date=req.completed_date,
    )
