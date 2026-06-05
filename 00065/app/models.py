from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, Text, Enum, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base
import enum


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    PROPERTY = "property"
    TENANT = "tenant"


class DeviceType(str, enum.Enum):
    ELECTRICITY = "electricity"
    WATER = "water"


class PricingType(str, enum.Enum):
    TIERED = "tiered"
    TIME_OF_USE = "time_of_use"
    FLAT = "flat"


class BillStatus(str, enum.Enum):
    PENDING = "pending"
    PAID = "paid"
    OVERDUE = "overdue"
    VOID = "void"


class AlertType(str, enum.Enum):
    USAGE_SPIKE = "usage_spike"
    LOW_BALANCE = "low_balance"
    POWER_LIMITED = "power_limited"


class AlertSeverity(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class WorkOrderStatus(str, enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class NotificationType(str, enum.Enum):
    BILL = "bill"
    ALERT = "alert"
    USAGE = "usage"
    WORK_ORDER = "work_order"


class PowerStatus(str, enum.Enum):
    NORMAL = "normal"
    LIMITED = "limited"
    CUT_OFF = "cut_off"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True)
    email = Column(String(100), unique=True, index=True)
    hashed_password = Column(String(255))
    full_name = Column(String(100))
    role = Column(Enum(UserRole), default=UserRole.TENANT)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    tenant = relationship("Tenant", back_populates="users")
    notifications = relationship("Notification", back_populates="user")


class Tenant(Base):
    __tablename__ = "tenants"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, index=True)
    contact_person = Column(String(50))
    contact_phone = Column(String(20))
    contact_email = Column(String(100))
    building = Column(String(50))
    floor = Column(String(20))
    room = Column(String(50))
    area = Column(Float)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    users = relationship("User", back_populates="tenant")
    devices = relationship("Device", back_populates="tenant")
    contracts = relationship("Contract", back_populates="tenant")
    prepaid_accounts = relationship("PrepaidAccount", back_populates="tenant")
    bills = relationship("Bill", back_populates="tenant")


class Device(Base):
    __tablename__ = "devices"

    id = Column(Integer, primary_key=True, index=True)
    device_code = Column(String(50), unique=True, index=True)
    device_name = Column(String(100))
    device_type = Column(Enum(DeviceType))
    tenant_id = Column(Integer, ForeignKey("tenants.id"))
    location = Column(String(100))
    installation_date = Column(DateTime)
    last_reading = Column(Float, default=0)
    last_reading_time = Column(DateTime(timezone=True))
    is_active = Column(Boolean, default=True)
    power_status = Column(Enum(PowerStatus), default=PowerStatus.NORMAL)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    tenant = relationship("Tenant", back_populates="devices")
    readings = relationship("MeterReading", back_populates="device")


class MeterReading(Base):
    __tablename__ = "meter_readings"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, ForeignKey("devices.id"))
    reading_value = Column(Float)
    reading_time = Column(DateTime(timezone=True), server_default=func.now())
    source = Column(String(50), default="auto")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    device = relationship("Device", back_populates="readings")


class UsageRecord(Base):
    __tablename__ = "usage_records"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, ForeignKey("devices.id"))
    tenant_id = Column(Integer, ForeignKey("tenants.id"))
    usage_type = Column(Enum(DeviceType))
    start_reading = Column(Float)
    end_reading = Column(Float)
    usage_amount = Column(Float)
    start_time = Column(DateTime(timezone=True))
    end_time = Column(DateTime(timezone=True))
    period = Column(String(20))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = {"sqlite_autoincrement": True}


class Contract(Base):
    __tablename__ = "contracts"

    id = Column(Integer, primary_key=True, index=True)
    contract_code = Column(String(50), unique=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"))
    name = Column(String(100))
    start_date = Column(DateTime)
    end_date = Column(DateTime)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    tenant = relationship("Tenant", back_populates="contracts")
    pricing_rules = relationship("PricingRule", back_populates="contract")


class PricingRule(Base):
    __tablename__ = "pricing_rules"

    id = Column(Integer, primary_key=True, index=True)
    contract_id = Column(Integer, ForeignKey("contracts.id"))
    utility_type = Column(Enum(DeviceType))
    pricing_type = Column(Enum(PricingType))
    rules = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    contract = relationship("Contract", back_populates="pricing_rules")


class Bill(Base):
    __tablename__ = "bills"

    id = Column(Integer, primary_key=True, index=True)
    bill_no = Column(String(50), unique=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"))
    contract_id = Column(Integer, ForeignKey("contracts.id"))
    billing_month = Column(String(7))
    electricity_usage = Column(Float, default=0)
    water_usage = Column(Float, default=0)
    electricity_cost = Column(Float, default=0)
    water_cost = Column(Float, default=0)
    total_amount = Column(Float, default=0)
    status = Column(Enum(BillStatus), default=BillStatus.PENDING)
    due_date = Column(DateTime)
    paid_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    tenant = relationship("Tenant", back_populates="bills")
    bill_details = relationship("BillDetail", back_populates="bill")


class BillDetail(Base):
    __tablename__ = "bill_details"

    id = Column(Integer, primary_key=True, index=True)
    bill_id = Column(Integer, ForeignKey("bills.id"))
    device_id = Column(Integer, ForeignKey("devices.id"))
    utility_type = Column(Enum(DeviceType))
    usage_amount = Column(Float)
    unit_price = Column(Float)
    subtotal = Column(Float)
    pricing_details = Column(JSON)

    bill = relationship("Bill", back_populates="bill_details")


class PrepaidAccount(Base):
    __tablename__ = "prepaid_accounts"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"))
    balance = Column(Float, default=0)
    safety_threshold = Column(Float, default=100)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    tenant = relationship("Tenant", back_populates="prepaid_accounts")
    transactions = relationship("PrepaidTransaction", back_populates="account")


class PrepaidTransaction(Base):
    __tablename__ = "prepaid_transactions"

    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("prepaid_accounts.id"))
    transaction_type = Column(String(20))
    amount = Column(Float)
    balance_before = Column(Float)
    balance_after = Column(Float)
    remark = Column(String(255))
    operator = Column(String(50))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    account = relationship("PrepaidAccount", back_populates="transactions")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"))
    device_id = Column(Integer, ForeignKey("devices.id"), nullable=True)
    alert_type = Column(Enum(AlertType))
    severity = Column(Enum(AlertSeverity))
    title = Column(String(100))
    message = Column(Text)
    is_read = Column(Boolean, default=False)
    is_resolved = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class WorkOrder(Base):
    __tablename__ = "work_orders"

    id = Column(Integer, primary_key=True, index=True)
    order_no = Column(String(50), unique=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"))
    alert_id = Column(Integer, ForeignKey("alerts.id"), nullable=True)
    title = Column(String(100))
    description = Column(Text)
    status = Column(Enum(WorkOrderStatus), default=WorkOrderStatus.PENDING)
    assigned_to = Column(String(50))
    priority = Column(String(20), default="medium")
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    notification_type = Column(Enum(NotificationType))
    title = Column(String(100))
    message = Column(Text)
    data = Column(JSON, nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="notifications")


class UsagePrediction(Base):
    __tablename__ = "usage_predictions"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"))
    prediction_month = Column(String(7))
    predicted_electricity = Column(Float)
    predicted_water = Column(Float)
    predicted_cost = Column(Float)
    confidence = Column(Float)
    model_version = Column(String(20))
    weather_factors = Column(JSON, nullable=True)
    weather_forecast_summary = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class WeatherCache(Base):
    __tablename__ = "weather_cache"

    id = Column(Integer, primary_key=True, index=True)
    location_name = Column(String(100))
    latitude = Column(Float)
    longitude = Column(Float)
    forecast_data = Column(JSON)
    forecast_start_date = Column(String(10))
    forecast_end_date = Column(String(10))
    avg_temp = Column(Float)
    avg_humidity = Column(Float)
    total_precipitation = Column(Float)
    hot_days_count = Column(Integer, default=0)
    cold_days_count = Column(Integer, default=0)
    rainy_days_count = Column(Integer, default=0)
    source = Column(String(50))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True))
