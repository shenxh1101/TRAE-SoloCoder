from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from datetime import datetime, timedelta
from ..database import get_db
from .. import models, schemas
from ..security import require_role, get_current_active_user

router = APIRouter(prefix="/meter-readings", tags=["读数管理"])


@router.post("/", response_model=schemas.MeterReadingResponse)
async def create_meter_reading(
    reading: schemas.MeterReadingCreate,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(models.Device).where(models.Device.id == reading.device_id))
    device = result.scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    db_reading = models.MeterReading(**reading.model_dump())
    db.add(db_reading)
    
    device.last_reading = reading.reading_value
    device.last_reading_time = datetime.utcnow()
    
    await db.commit()
    await db.refresh(db_reading)
    return db_reading


@router.get("/", response_model=List[schemas.MeterReadingResponse])
async def list_meter_readings(
    skip: int = 0,
    limit: int = 100,
    device_id: int = None,
    start_date: datetime = None,
    end_date: datetime = None,
    current_user: models.User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(models.MeterReading)
    
    if device_id:
        query = query.where(models.MeterReading.device_id == device_id)
    
    if current_user.role == models.UserRole.TENANT:
        device_query = select(models.Device.id).where(models.Device.tenant_id == current_user.tenant_id)
        device_result = await db.execute(device_query)
        device_ids = [row[0] for row in device_result.all()]
        query = query.where(models.MeterReading.device_id.in_(device_ids))
    
    if start_date:
        query = query.where(models.MeterReading.reading_time >= start_date)
    if end_date:
        query = query.where(models.MeterReading.reading_time <= end_date)
    
    query = query.order_by(models.MeterReading.reading_time.desc())
    result = await db.execute(query.offset(skip).limit(limit))
    readings = result.scalars().all()
    return readings


@router.get("/{reading_id}", response_model=schemas.MeterReadingResponse)
async def get_meter_reading(
    reading_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(models.MeterReading).where(models.MeterReading.id == reading_id))
    reading = result.scalar_one_or_none()
    if not reading:
        raise HTTPException(status_code=404, detail="Reading not found")
    
    if current_user.role == models.UserRole.TENANT:
        device_result = await db.execute(select(models.Device).where(models.Device.id == reading.device_id))
        device = device_result.scalar_one_or_none()
        if device and device.tenant_id != current_user.tenant_id:
            raise HTTPException(status_code=403, detail="Not allowed to access this reading")
    
    return reading


@router.post("/calculate-usage", response_model=dict)
async def calculate_daily_usage(
    date: datetime = None,
    db: AsyncSession = Depends(get_db)
):
    if not date:
        date = datetime.utcnow()
    
    start_of_day = date.replace(hour=0, minute=0, second=0, microsecond=0)
    end_of_day = start_of_day + timedelta(days=1)
    
    result = await db.execute(select(models.Device).where(models.Device.is_active == True))
    devices = result.scalars().all()
    
    usage_records = []
    
    for device in devices:
        reading_result = await db.execute(
            select(models.MeterReading)
            .where(
                and_(
                    models.MeterReading.device_id == device.id,
                    models.MeterReading.reading_time >= start_of_day,
                    models.MeterReading.reading_time < end_of_day
                )
            )
            .order_by(models.MeterReading.reading_time)
        )
        readings = reading_result.scalars().all()
        
        if len(readings) >= 2:
            start_reading = readings[0]
            end_reading = readings[-1]
            usage_amount = end_reading.reading_value - start_reading.reading_value
            
            if usage_amount > 0:
                usage_record = models.UsageRecord(
                    device_id=device.id,
                    tenant_id=device.tenant_id,
                    usage_type=device.device_type,
                    start_reading=start_reading.reading_value,
                    end_reading=end_reading.reading_value,
                    usage_amount=usage_amount,
                    start_time=start_reading.reading_time,
                    end_time=end_reading.reading_time,
                    period=f"{start_of_day.strftime('%Y-%m-%d')}"
                )
                db.add(usage_record)
                usage_records.append({
                    "device_id": device.id,
                    "usage_amount": usage_amount
                })
    
    await db.commit()
    return {"message": "Usage calculated successfully", "records": usage_records}


@router.get("/usage-records", response_model=List[schemas.UsageRecordResponse])
async def list_usage_records(
    skip: int = 0,
    limit: int = 100,
    tenant_id: int = None,
    device_id: int = None,
    start_date: str = None,
    end_date: str = None,
    usage_type: models.DeviceType = None,
    current_user: models.User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(models.UsageRecord)
    
    if current_user.role == models.UserRole.TENANT:
        query = query.where(models.UsageRecord.tenant_id == current_user.tenant_id)
    elif tenant_id:
        query = query.where(models.UsageRecord.tenant_id == tenant_id)
    
    if device_id:
        query = query.where(models.UsageRecord.device_id == device_id)
    if usage_type:
        query = query.where(models.UsageRecord.usage_type == usage_type)
    if start_date:
        query = query.where(models.UsageRecord.period >= start_date)
    if end_date:
        query = query.where(models.UsageRecord.period <= end_date)
    
    query = query.order_by(models.UsageRecord.start_time.desc())
    result = await db.execute(query.offset(skip).limit(limit))
    records = result.scalars().all()
    return records
