from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from datetime import datetime
from ..database import get_db
from .. import models, schemas
from ..security import require_role, get_current_active_user

router = APIRouter(prefix="/work-orders", tags=["工单管理"])


@router.post("/", response_model=schemas.WorkOrderResponse, dependencies=[Depends(require_role(models.UserRole.ADMIN, models.UserRole.PROPERTY))])
async def create_work_order(
    work_order: schemas.WorkOrderCreate,
    db: AsyncSession = Depends(get_db)
):
    order_no = f"WO{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
    db_order = models.WorkOrder(
        **work_order.model_dump(),
        order_no=order_no
    )
    db.add(db_order)
    await db.commit()
    await db.refresh(db_order)
    return db_order


@router.get("/", response_model=List[schemas.WorkOrderResponse])
async def list_work_orders(
    skip: int = 0,
    limit: int = 100,
    tenant_id: int = None,
    status: models.WorkOrderStatus = None,
    priority: str = None,
    current_user: models.User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(models.WorkOrder)
    
    if current_user.role == models.UserRole.TENANT:
        query = query.where(models.WorkOrder.tenant_id == current_user.tenant_id)
    elif tenant_id:
        query = query.where(models.WorkOrder.tenant_id == tenant_id)
    
    if status:
        query = query.where(models.WorkOrder.status == status)
    if priority:
        query = query.where(models.WorkOrder.priority == priority)
    
    query = query.order_by(models.WorkOrder.created_at.desc())
    result = await db.execute(query.offset(skip).limit(limit))
    orders = result.scalars().all()
    return orders


@router.get("/{order_id}", response_model=schemas.WorkOrderResponse)
async def get_work_order(
    order_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(models.WorkOrder).where(models.WorkOrder.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Work order not found")
    
    if current_user.role == models.UserRole.TENANT and current_user.tenant_id != order.tenant_id:
        raise HTTPException(status_code=403, detail="Not allowed to access this work order")
    
    return order


@router.put("/{order_id}", response_model=schemas.WorkOrderResponse)
async def update_work_order(
    order_id: int,
    order_update: schemas.WorkOrderUpdate,
    current_user: models.User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(models.WorkOrder).where(models.WorkOrder.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Work order not found")
    
    if current_user.role == models.UserRole.TENANT:
        raise HTTPException(status_code=403, detail="Not allowed to update work orders")
    
    update_data = order_update.model_dump(exclude_unset=True)
    
    if 'status' in update_data and update_data['status'] == models.WorkOrderStatus.COMPLETED:
        order.completed_at = datetime.utcnow()
    
    for field, value in update_data.items():
        setattr(order, field, value)
    
    await db.commit()
    await db.refresh(order)
    return order


@router.delete("/{order_id}", dependencies=[Depends(require_role(models.UserRole.ADMIN))])
async def delete_work_order(
    order_id: int,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(models.WorkOrder).where(models.WorkOrder.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Work order not found")
    
    await db.delete(order)
    await db.commit()
    return {"message": "Work order deleted successfully"}
