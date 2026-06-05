from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from datetime import datetime, timedelta
from typing import Optional, List
from app.database import get_db
from app.models import Archive, User, ArchiveStatusEnum, ClassificationEnum
from app.schemas import ArchiveCreate, ArchiveOut, ArchiveSearch
from app.auth import get_current_user, require_role
from app.services.permissions import can_access_classification

router = APIRouter(prefix="/api/archives", tags=["档案管理"])


def generate_archive_no(db: Session) -> str:
    now = datetime.utcnow()
    prefix = f"ARC{now.strftime('%Y%m')}"
    last = db.query(Archive).filter(Archive.archive_no.like(f"{prefix}%")).order_by(Archive.id.desc()).first()
    seq = 1
    if last:
        try:
            seq = int(last.archive_no[-4:]) + 1
        except ValueError:
            seq = 1
    return f"{prefix}{seq:04d}"


@router.post("/", response_model=ArchiveOut)
def create_archive(data: ArchiveCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in ("admin", "supervisor", "executive"):
        raise HTTPException(status_code=403, detail="只有管理员或主管及以上可录入档案")
    archive_no = generate_archive_no(db)
    retention_end_date = None
    if data.retention_years:
        retention_end_date = datetime.utcnow() + timedelta(days=data.retention_years * 365)
    qty = max(1, data.quantity)
    archive = Archive(
        archive_no=archive_no,
        title=data.title,
        description=data.description,
        classification=data.classification,
        storage_location=data.storage_location,
        retention_years=data.retention_years,
        retention_end_date=retention_end_date,
        created_by=current_user.id,
        total_quantity=qty,
        available_quantity=qty,
    )
    db.add(archive)
    db.commit()
    db.refresh(archive)
    return archive


@router.get("/", response_model=List[ArchiveOut])
def list_archives(
    keyword: Optional[str] = None,
    classification: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Archive)
    allowed = {
        "employee": ["public"],
        "supervisor": ["public", "internal"],
        "executive": ["public", "internal", "confidential"],
        "admin": ["public", "internal", "confidential"],
    }
    allowed_cls = allowed.get(current_user.role, ["public"])
    query = query.filter(Archive.classification.in_(allowed_cls))
    if keyword:
        query = query.filter(or_(Archive.title.contains(keyword), Archive.archive_no.contains(keyword), Archive.description.contains(keyword)))
    if classification:
        query = query.filter(Archive.classification == classification)
    if date_from:
        query = query.filter(Archive.entry_date >= datetime.strptime(date_from, "%Y-%m-%d"))
    if date_to:
        query = query.filter(Archive.entry_date <= datetime.strptime(date_to, "%Y-%m-%d") + timedelta(days=1))
    if status:
        query = query.filter(Archive.status == status)
    total = query.count()
    items = query.order_by(Archive.id.desc()).offset((page - 1) * size).limit(size).all()
    return items


@router.get("/{archive_id}", response_model=ArchiveOut)
def get_archive(archive_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    archive = db.query(Archive).filter(Archive.id == archive_id).first()
    if not archive:
        raise HTTPException(status_code=404, detail="档案不存在")
    if not can_access_classification(current_user, archive.classification):
        raise HTTPException(status_code=403, detail="无权查看该密级档案")
    return archive


@router.put("/{archive_id}", response_model=ArchiveOut)
def update_archive(archive_id: int, data: ArchiveCreate, db: Session = Depends(get_db), current_user: User = Depends(require_role("admin"))):
    archive = db.query(Archive).filter(Archive.id == archive_id).first()
    if not archive:
        raise HTTPException(status_code=404, detail="档案不存在")
    archive.title = data.title
    archive.description = data.description
    archive.classification = data.classification
    archive.storage_location = data.storage_location
    archive.retention_years = data.retention_years
    if data.retention_years:
        archive.retention_end_date = archive.entry_date + timedelta(days=data.retention_years * 365)
    db.commit()
    db.refresh(archive)
    return archive


@router.get("/count/by-classification")
def count_by_classification(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from sqlalchemy import func
    results = db.query(Archive.classification, func.count(Archive.id)).filter(Archive.status == "active").group_by(Archive.classification).all()
    return {r[0]: r[1] for r in results}
