from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from datetime import datetime
from ..database import get_db
from .. import models, schemas
from ..security import require_role, get_current_active_user

router = APIRouter(prefix="/devices", tags=["设备管理"])


@router.post("/", response_model=schemas.DeviceResponse, dependencies=[Depends(require_role(models.UserRole.ADMIN, models.UserRole.PROPERTY))])
async def create_device(
    device: schemas.DeviceCreate,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(models.Device).where(models.Device.device_code == device.device_code))
    db_device = result.scalar_one_or_none()
    if db_device:
        raise HTTPException(status_code=400, detail="Device code already exists")
    
    db_device = models.Device(**device.model_dump())
    db.add(db_device)
    await db.commit()
    await db.refresh(db_device)
    return db_device


@router.get("/", response_model=List[schemas.DeviceResponse])
async def list_devices(
    skip: int = 0,
    limit: int = 100,
    device_type: models.DeviceType = None,
    tenant_id: int = None,
    current_user: models.User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(models.Device)
    
    if current_user.role == models.UserRole.TENANT:
        query = query.where(models.Device.tenant_id == current_user.tenant_id)
    elif tenant_id:
        query = query.where(models.Device.tenant_id == tenant_id)
    
    if device_type:
        query = query.where(models.Device.device_type == device_type)
    
    result = await db.execute(query.offset(skip).limit(limit))
    devices = result.scalars().all()
    return devices


@router.get("/{device_id}", response_model=schemas.DeviceResponse)
async def get_device(
    device_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(models.Device).where(models.Device.id == device_id))
    device = result.scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    if current_user.role == models.UserRole.TENANT and current_user.tenant_id != device.tenant_id:
        raise HTTPException(status_code=403, detail="Not allowed to access this device")
    
    return device


@router.put("/{device_id}", response_model=schemas.DeviceResponse, dependencies=[Depends(require_role(models.UserRole.ADMIN, models.UserRole.PROPERTY))])
async def update_device(
    device_id: int,
    device_update: schemas.DeviceUpdate,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(models.Device).where(models.Device.id == device_id))
    device = result.scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    update_data = device_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(device, field, value)
    
    await db.commit()
    await db.refresh(device)
    return device


@router.post("/{device_id}/restore-power", response_model=schemas.DeviceResponse, dependencies=[Depends(require_role(models.UserRole.ADMIN, models.UserRole.PROPERTY))])
async def restore_power(
    device_id: int,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(models.Device).where(models.Device.id == device_id))
    device = result.scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    device.power_status = models.PowerStatus.NORMAL
    await db.commit()
    await db.refresh(device)
    return device


@router.post("/batch-reading", response_model=dict)
async def create_batch_readings(
    batch_data: schemas.BatchReadingCreate,
    db: AsyncSession = Depends(get_db)
):
    for reading_data in batch_data.readings:
        result = await db.execute(select(models.Device).where(models.Device.id == reading_data.device_id))
        device = result.scalar_one_or_none()
        if not device:
            continue
        
        new_reading = models.MeterReading(
            device_id=reading_data.device_id,
            reading_value=reading_data.reading_value,
            source=reading_data.source
        )
        db.add(new_reading)
        
        device.last_reading = reading_data.reading_value
        device.last_reading_time = datetime.utcnow()
    
    await db.commit()
    return {"message": "Batch readings recorded successfully"}
