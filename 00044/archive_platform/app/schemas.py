from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    username: str
    role: str
    real_name: str


class UserOut(BaseModel):
    id: int
    username: str
    real_name: str
    role: str
    department_id: Optional[int] = None
    violation_count: int = 0
    frozen_until: Optional[datetime] = None
    is_active: bool = True


class DepartmentOut(BaseModel):
    id: int
    name: str
    monthly_copy_quota: int
    used_copy_quota: int
    quota_year: int
    quota_month: int


class DepartmentCreate(BaseModel):
    name: str
    monthly_copy_quota: int = 100


class ArchiveCreate(BaseModel):
    title: str
    description: str = ""
    classification: str
    storage_location: str
    retention_years: Optional[int] = None
    quantity: int = 1


class ArchiveOut(BaseModel):
    id: int
    archive_no: str
    title: str
    description: str
    classification: str
    storage_location: str
    retention_years: Optional[int] = None
    entry_date: datetime
    retention_end_date: Optional[datetime] = None
    status: str
    borrow_count: int
    total_quantity: int
    available_quantity: int
    created_by: Optional[int] = None


class BorrowRequestCreate(BaseModel):
    archive_id: int
    days: int = 7


class BorrowRequestOut(BaseModel):
    id: int
    archive_id: int
    archive_no: Optional[str] = None
    archive_title: Optional[str] = None
    archive_classification: Optional[str] = None
    borrower_id: int
    borrower_name: Optional[str] = None
    request_date: datetime
    approved_by: Optional[int] = None
    approved_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    return_date: Optional[datetime] = None
    status: str
    is_escalated: bool


class CopyRequestCreate(BaseModel):
    archive_id: int
    pages: int = 1
    reason: str = ""


class CopyRequestOut(BaseModel):
    id: int
    archive_id: int
    archive_no: Optional[str] = None
    archive_title: Optional[str] = None
    requester_id: int
    requester_name: Optional[str] = None
    pages: int
    reason: str
    request_date: datetime
    approved_by: Optional[int] = None
    status: str
    requires_supervisor: bool


class DestructionRequestCreate(BaseModel):
    archive_id: int


class DestructionRequestOut(BaseModel):
    id: int
    archive_id: int
    archive_no: Optional[str] = None
    archive_title: Optional[str] = None
    requested_by: int
    requester_name: Optional[str] = None
    requested_date: datetime
    level1_approver: Optional[int] = None
    level1_approved_date: Optional[datetime] = None
    level2_approver: Optional[int] = None
    level2_approved_date: Optional[datetime] = None
    status: str
    video_path: Optional[str] = None
    completed_date: Optional[datetime] = None


class NotificationOut(BaseModel):
    id: int
    type: str
    message: str
    is_read: bool
    related_id: Optional[int] = None
    created_at: datetime


class DashboardStats(BaseModel):
    public_count: int
    internal_count: int
    confidential_count: int
    total_archives: int
    active_borrows: int
    overdue_count: int
    pending_approvals: int


class HotArchive(BaseModel):
    archive_no: str
    title: str
    classification: str
    borrow_count: int


class OverdueItem(BaseModel):
    id: int
    archive_no: Optional[str] = None
    archive_title: Optional[str] = None
    borrower_name: Optional[str] = None
    due_date: Optional[datetime] = None
    days_overdue: int


class ArchiveSearch(BaseModel):
    keyword: Optional[str] = None
    classification: Optional[str] = None
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    status: Optional[str] = None
