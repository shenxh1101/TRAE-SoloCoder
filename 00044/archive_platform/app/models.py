from sqlalchemy import Column, Integer, String, DateTime, Float, Text, Boolean, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base
import enum


class RoleEnum(str, enum.Enum):
    employee = "employee"
    supervisor = "supervisor"
    executive = "executive"
    admin = "admin"


class ClassificationEnum(str, enum.Enum):
    public = "public"
    internal = "internal"
    confidential = "confidential"


class ArchiveStatusEnum(str, enum.Enum):
    active = "active"
    pending_destruction = "pending_destruction"
    destroyed = "destroyed"


class BorrowStatusEnum(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    returned = "returned"
    overdue = "overdue"


class CopyStatusEnum(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class DestructionStatusEnum(str, enum.Enum):
    pending = "pending"
    level1_approved = "level1_approved"
    level2_approved = "level2_approved"
    completed = "completed"
    rejected = "rejected"


class Department(Base):
    __tablename__ = "departments"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    monthly_copy_quota = Column(Integer, default=100)
    used_copy_quota = Column(Integer, default=0)
    quota_year = Column(Integer, default=2026)
    quota_month = Column(Integer, default=1)
    users = relationship("User", back_populates="department")


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False)
    hashed_password = Column(String(200), nullable=False)
    real_name = Column(String(50), nullable=False)
    role = Column(String(20), nullable=False, default=RoleEnum.employee.value)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    violation_count = Column(Integer, default=0)
    frozen_until = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    department = relationship("Department", back_populates="users")
    notifications = relationship("Notification", back_populates="user")


class Archive(Base):
    __tablename__ = "archives"
    id = Column(Integer, primary_key=True, index=True)
    archive_no = Column(String(50), unique=True, nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, default="")
    classification = Column(String(20), nullable=False, default=ClassificationEnum.public.value)
    storage_location = Column(String(200), nullable=False)
    retention_years = Column(Integer, nullable=True)
    entry_date = Column(DateTime, default=datetime.utcnow)
    retention_end_date = Column(DateTime, nullable=True)
    status = Column(String(20), default=ArchiveStatusEnum.active.value)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    borrow_count = Column(Integer, default=0)
    total_quantity = Column(Integer, default=1)
    available_quantity = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)


class BorrowRequest(Base):
    __tablename__ = "borrow_requests"
    id = Column(Integer, primary_key=True, index=True)
    archive_id = Column(Integer, ForeignKey("archives.id"), nullable=False)
    borrower_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    request_date = Column(DateTime, default=datetime.utcnow)
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_date = Column(DateTime, nullable=True)
    due_date = Column(DateTime, nullable=True)
    return_date = Column(DateTime, nullable=True)
    status = Column(String(20), default=BorrowStatusEnum.pending.value)
    is_escalated = Column(Boolean, default=False)
    reminded = Column(Boolean, default=False)
    archive = relationship("Archive")
    borrower = relationship("User", foreign_keys=[borrower_id])
    approver = relationship("User", foreign_keys=[approved_by])


class CopyRequest(Base):
    __tablename__ = "copy_requests"
    id = Column(Integer, primary_key=True, index=True)
    archive_id = Column(Integer, ForeignKey("archives.id"), nullable=False)
    requester_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    pages = Column(Integer, default=1)
    reason = Column(Text, default="")
    request_date = Column(DateTime, default=datetime.utcnow)
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_date = Column(DateTime, nullable=True)
    status = Column(String(20), default=CopyStatusEnum.pending.value)
    requires_supervisor = Column(Boolean, default=False)
    archive = relationship("Archive")
    requester = relationship("User", foreign_keys=[requester_id])


class DestructionRequest(Base):
    __tablename__ = "destruction_requests"
    id = Column(Integer, primary_key=True, index=True)
    archive_id = Column(Integer, ForeignKey("archives.id"), nullable=False)
    requested_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    requested_date = Column(DateTime, default=datetime.utcnow)
    level1_approver = Column(Integer, ForeignKey("users.id"), nullable=True)
    level1_approved_date = Column(DateTime, nullable=True)
    level2_approver = Column(Integer, ForeignKey("users.id"), nullable=True)
    level2_approved_date = Column(DateTime, nullable=True)
    status = Column(String(20), default=DestructionStatusEnum.pending.value)
    video_path = Column(String(500), nullable=True)
    completed_date = Column(DateTime, nullable=True)
    archive = relationship("Archive")
    requester = relationship("User", foreign_keys=[requested_by])


class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    type = Column(String(50), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    related_id = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    user = relationship("User", back_populates="notifications")
