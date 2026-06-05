from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models import User, Department
from app.schemas import UserOut, DepartmentOut, DepartmentCreate
from app.auth import get_current_user, require_role, get_password_hash

router = APIRouter(prefix="/api/admin", tags=["系统管理"])


@router.get("/users", response_model=List[UserOut])
def list_users(db: Session = Depends(get_db), current_user: User = Depends(require_role("admin"))):
    return db.query(User).order_by(User.id).all()


@router.put("/users/{user_id}/toggle-active")
def toggle_user_active(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role("admin"))):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="不能禁用自己")
    user.is_active = not user.is_active
    db.commit()
    return {"message": f"用户已{'启用' if user.is_active else '禁用'}"}


@router.get("/departments", response_model=List[DepartmentOut])
def list_departments(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Department).order_by(Department.id).all()


@router.post("/departments", response_model=DepartmentOut)
def create_department(data: DepartmentCreate, db: Session = Depends(get_db), current_user: User = Depends(require_role("admin"))):
    existing = db.query(Department).filter(Department.name == data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="部门已存在")
    dept = Department(name=data.name, monthly_copy_quota=data.monthly_copy_quota)
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return dept


@router.put("/departments/{dept_id}/quota")
def update_quota(dept_id: int, quota: int, db: Session = Depends(get_db), current_user: User = Depends(require_role("admin"))):
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="部门不存在")
    dept.monthly_copy_quota = quota
    db.commit()
    return {"message": "配额已更新"}


@router.post("/reset-password/{user_id}")
def reset_password(user_id: int, new_password: str, db: Session = Depends(get_db), current_user: User = Depends(require_role("admin"))):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    user.hashed_password = get_password_hash(new_password)
    db.commit()
    return {"message": "密码已重置"}
