from pydantic import BaseModel, field_validator
from datetime import datetime
from typing import Optional, List, Dict, Any
import re
from .models import (
    UserRole, DeviceType, PricingType, BillStatus, 
    AlertType, AlertSeverity, WorkOrderStatus, 
    NotificationType, PowerStatus
)


class UserBase(BaseModel):
    username: str
    email: str
    full_name: str
    role: UserRole
    tenant_id: Optional[int] = None

    @field_validator('email')
    @classmethod
    def validate_email(cls, v):
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(pattern, v):
            raise ValueError('Invalid email format')
        return v


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    email: Optional[str] = None
    full_name: Optional[str] = None
    role: Optional[UserRole] = None
    tenant_id: Optional[int] = None
    is_active: Optional[bool] = None

    @field_validator('email')
    @classmethod
    def validate_email_update(cls, v):
        if v is not None:
            pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
            if not re.match(pattern, v):
                raise ValueError('Invalid email format')
        return v


class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: Optional[str] = None


class TenantBase(BaseModel):
    name: str
    contact_person: str
    contact_phone: str
    contact_email: str
    building: str
    floor: str
    room: str
    area: float

    @field_validator('contact_email')
    @classmethod
    def validate_contact_email(cls, v):
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(pattern, v):
            raise ValueError('Invalid email format')
        return v


class TenantCreate(TenantBase):
    pass


class TenantUpdate(BaseModel):
    name: Optional[str] = None
    contact_person: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    building: Optional[str] = None
    floor: Optional[str] = None
    room: Optional[str] = None
    area: Optional[float] = None
    is_active: Optional[bool] = None

    @field_validator('contact_email')
    @classmethod
    def validate_contact_email_update(cls, v):
        if v is not None:
            pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
            if not re.match(pattern, v):
                raise ValueError('Invalid email format')
        return v


class TenantResponse(TenantBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class DeviceBase(BaseModel):
    device_code: str
    device_name: str
    device_type: DeviceType
    tenant_id: int
    location: str
    installation_date: Optional[datetime] = None


class DeviceCreate(DeviceBase):
    pass


class DeviceUpdate(BaseModel):
    device_name: Optional[str] = None
    tenant_id: Optional[int] = None
    location: Optional[str] = None
    is_active: Optional[bool] = None
    power_status: Optional[PowerStatus] = None


class DeviceResponse(DeviceBase):
    id: int
    last_reading: float
    last_reading_time: Optional[datetime]
    is_active: bool
    power_status: PowerStatus
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class MeterReadingBase(BaseModel):
    device_id: int
    reading_value: float
    source: Optional[str] = "auto"


class MeterReadingCreate(MeterReadingBase):
    pass


class MeterReadingResponse(MeterReadingBase):
    id: int
    reading_time: datetime
    created_at: datetime

    class Config:
        from_attributes = True


class UsageRecordResponse(BaseModel):
    id: int
    device_id: int
    tenant_id: int
    usage_type: DeviceType
    start_reading: float
    end_reading: float
    usage_amount: float
    start_time: datetime
    end_time: datetime
    period: str
    created_at: datetime

    class Config:
        from_attributes = True


class ContractBase(BaseModel):
    contract_code: str
    tenant_id: int
    name: str
    start_date: datetime
    end_date: datetime


class ContractCreate(ContractBase):
    pass


class ContractUpdate(BaseModel):
    name: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    is_active: Optional[bool] = None


class ContractResponse(ContractBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class PricingRuleBase(BaseModel):
    contract_id: int
    utility_type: DeviceType
    pricing_type: PricingType
    rules: Dict[str, Any]


class PricingRuleCreate(PricingRuleBase):
    pass


class PricingRuleResponse(PricingRuleBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class BillDetailResponse(BaseModel):
    id: int
    device_id: int
    utility_type: DeviceType
    usage_amount: float
    unit_price: float
    subtotal: float
    pricing_details: Dict[str, Any]

    class Config:
        from_attributes = True


class BillBase(BaseModel):
    tenant_id: int
    contract_id: int
    billing_month: str
    due_date: datetime


class BillResponse(BillBase):
    id: int
    bill_no: str
    electricity_usage: float
    water_usage: float
    electricity_cost: float
    water_cost: float
    total_amount: float
    status: BillStatus
    paid_at: Optional[datetime]
    created_at: datetime
    bill_details: List[BillDetailResponse] = []

    class Config:
        from_attributes = True


class PrepaidAccountBase(BaseModel):
    tenant_id: int
    safety_threshold: float = 100


class PrepaidAccountCreate(PrepaidAccountBase):
    pass


class PrepaidTransactionCreate(BaseModel):
    account_id: int
    transaction_type: str
    amount: float
    remark: Optional[str] = None
    operator: Optional[str] = None


class PrepaidAccountResponse(BaseModel):
    id: int
    tenant_id: int
    balance: float
    safety_threshold: float
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class PrepaidTransactionResponse(BaseModel):
    id: int
    account_id: int
    transaction_type: str
    amount: float
    balance_before: float
    balance_after: float
    remark: Optional[str]
    operator: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class AlertResponse(BaseModel):
    id: int
    tenant_id: int
    device_id: Optional[int]
    alert_type: AlertType
    severity: AlertSeverity
    title: str
    message: str
    is_read: bool
    is_resolved: bool
    created_at: datetime

    class Config:
        from_attributes = True


class WorkOrderBase(BaseModel):
    tenant_id: int
    title: str
    description: str
    assigned_to: Optional[str] = None
    priority: Optional[str] = "medium"


class WorkOrderCreate(WorkOrderBase):
    alert_id: Optional[int] = None


class WorkOrderUpdate(BaseModel):
    status: Optional[WorkOrderStatus] = None
    assigned_to: Optional[str] = None
    priority: Optional[str] = None
    description: Optional[str] = None


class WorkOrderResponse(WorkOrderBase):
    id: int
    order_no: str
    alert_id: Optional[int]
    status: WorkOrderStatus
    completed_at: Optional[datetime]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class NotificationResponse(BaseModel):
    id: int
    user_id: int
    notification_type: NotificationType
    title: str
    message: str
    data: Optional[Dict[str, Any]]
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class UsagePredictionResponse(BaseModel):
    id: int
    tenant_id: int
    prediction_month: str
    predicted_electricity: float
    predicted_water: float
    predicted_cost: float
    confidence: float
    model_version: str
    weather_factors: Optional[Dict[str, Any]] = None
    weather_forecast_summary: Optional[Dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True


class WeatherForecastResponse(BaseModel):
    location_name: str
    latitude: float
    longitude: float
    avg_temp: float
    avg_humidity: float
    total_precipitation: float
    hot_days_count: int
    cold_days_count: int
    rainy_days_count: int
    forecast_days: int
    source: str
    fetched_at: str


class BatchReadingCreate(BaseModel):
    readings: List[MeterReadingCreate]
