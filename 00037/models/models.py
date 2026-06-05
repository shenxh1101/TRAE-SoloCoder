from sqlalchemy import Column, Integer, String, Float, Date, DateTime, Boolean, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base


class Customer(Base):
    __tablename__ = 'customers'

    id = Column(Integer, primary_key=True, index=True)
    customer_code = Column(String(50), unique=True, index=True)
    name = Column(String(200), index=True)
    contact_person = Column(String(100))
    phone = Column(String(50))
    email = Column(String(200))
    address = Column(Text)
    industry = Column(String(100))
    credit_score = Column(Float, default=60.0)
    credit_level = Column(String(10), default='BBB')
    credit_limit = Column(Float, default=100000.0)
    current_balance = Column(Float, default=0.0)
    available_credit = Column(Float, default=100000.0)
    registration_date = Column(Date)
    last_score_update = Column(DateTime)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    financial_records = relationship("FinancialRecord", back_populates="customer")
    orders = relationship("Order", back_populates="customer")
    credit_score_history = relationship("CreditScoreHistory", back_populates="customer")
    receivables = relationship("Receivable", back_populates="customer")
    collection_tasks = relationship("CollectionTask", back_populates="customer")


class FinancialRecord(Base):
    __tablename__ = 'financial_records'

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey('customers.id'))
    report_period = Column(String(20))
    report_date = Column(Date)
    total_assets = Column(Float)
    total_liabilities = Column(Float)
    current_assets = Column(Float)
    current_liabilities = Column(Float)
    inventory = Column(Float)
    cash_and_equivalents = Column(Float)
    operating_cash_flow = Column(Float)
    current_liabilities_operating = Column(Float)
    revenue = Column(Float)
    net_profit = Column(Float)
    asset_liability_ratio = Column(Float)
    current_ratio = Column(Float)
    quick_ratio = Column(Float)
    cash_flow_ratio = Column(Float)
    financial_health_score = Column(Float)
    source_file = Column(String(500))
    uploaded_by = Column(String(100))
    created_at = Column(DateTime, default=datetime.now)

    customer = relationship("Customer", back_populates="financial_records")


class Order(Base):
    __tablename__ = 'orders'

    id = Column(Integer, primary_key=True, index=True)
    order_number = Column(String(50), unique=True, index=True)
    customer_id = Column(Integer, ForeignKey('customers.id'))
    order_date = Column(Date)
    total_amount = Column(Float)
    credit_limit_at_time = Column(Float)
    available_credit_at_time = Column(Float)
    exceeds_credit_limit = Column(Boolean, default=False)
    approval_level = Column(Integer, default=0)
    approval_status = Column(String(20), default='pending')
    is_frozen = Column(Boolean, default=False)
    order_status = Column(String(20), default='created')
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    customer = relationship("Customer", back_populates="orders")
    approvals = relationship("Approval", back_populates="order")


class Approval(Base):
    __tablename__ = 'approvals'

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey('orders.id'))
    approval_level = Column(Integer)
    approver_role = Column(String(100))
    approver_name = Column(String(100))
    approval_decision = Column(String(20))
    approval_notes = Column(Text)
    approved_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.now)

    order = relationship("Order", back_populates="approvals")


class CreditScoreHistory(Base):
    __tablename__ = 'credit_score_history'

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey('customers.id'))
    old_score = Column(Float)
    new_score = Column(Float)
    old_level = Column(String(10))
    new_level = Column(String(10))
    old_limit = Column(Float)
    new_limit = Column(Float)
    change_reason = Column(String(500))
    payment_history_score = Column(Float)
    credit_utilization_score = Column(Float)
    order_frequency_score = Column(Float)
    average_order_value_score = Column(Float)
    years_as_customer_score = Column(Float)
    financial_health_score = Column(Float)
    calculated_at = Column(DateTime, default=datetime.now)

    customer = relationship("Customer", back_populates="credit_score_history")


class Receivable(Base):
    __tablename__ = 'receivables'

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey('customers.id'))
    invoice_number = Column(String(50))
    invoice_date = Column(Date)
    due_date = Column(Date)
    total_amount = Column(Float)
    paid_amount = Column(Float, default=0.0)
    remaining_amount = Column(Float)
    days_overdue = Column(Integer, default=0)
    status = Column(String(20), default='normal')
    last_reminder_date = Column(Date)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    customer = relationship("Customer", back_populates="receivables")


class CollectionTask(Base):
    __tablename__ = 'collection_tasks'

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey('customers.id'))
    receivable_id = Column(Integer, ForeignKey('receivables.id'))
    task_type = Column(String(50))
    priority = Column(String(20))
    assigned_to_sales = Column(String(100))
    assigned_to_finance = Column(String(100))
    actions_required = Column(Text)
    status = Column(String(20), default='pending')
    completed_at = Column(DateTime)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.now)

    customer = relationship("Customer", back_populates="collection_tasks")


class OperationLog(Base):
    __tablename__ = 'operation_logs'

    id = Column(Integer, primary_key=True, index=True)
    operation_type = Column(String(50), index=True)
    customer_id = Column(Integer, index=True)
    customer_name = Column(String(200), index=True)
    credit_level = Column(String(10), index=True)
    order_id = Column(Integer, index=True)
    operation_details = Column(Text)
    operator = Column(String(100))
    operation_time = Column(DateTime, default=datetime.now, index=True)
    ip_address = Column(String(50))


class APISyncLog(Base):
    __tablename__ = 'api_sync_logs'

    id = Column(Integer, primary_key=True, index=True)
    sync_type = Column(String(50), index=True)
    data_source = Column(String(50), index=True)
    status = Column(String(20), index=True)
    records_synced = Column(Integer, default=0)
    records_updated = Column(Integer, default=0)
    records_inserted = Column(Integer, default=0)
    error_message = Column(Text)
    sync_start_time = Column(DateTime)
    sync_end_time = Column(DateTime)
    raw_data_file = Column(String(500))
    created_at = Column(DateTime, default=datetime.now)


class FileUploadRecord(Base):
    __tablename__ = 'file_upload_records'

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, index=True)
    customer_name = Column(String(200), index=True)
    file_name = Column(String(500))
    file_path = Column(String(500))
    file_size = Column(Integer)
    file_type = Column(String(50))
    uploader = Column(String(100))
    upload_ip = Column(String(50))
    upload_time = Column(DateTime, default=datetime.now)
    parse_status = Column(String(20), default='pending')
    parse_message = Column(Text)
    financial_record_id = Column(Integer)
    created_at = Column(DateTime, default=datetime.now)
