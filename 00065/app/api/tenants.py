from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from ..database import get_db
from .. import models, schemas
from ..security import require_role, get_current_active_user

router = APIRouter(prefix="/tenants", tags=["租户管理"])


@router.post("/", response_model=schemas.TenantResponse, dependencies=[Depends(require_role(models.UserRole.ADMIN, models.UserRole.PROPERTY))])
async def create_tenant(
    tenant: schemas.TenantCreate,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(models.Tenant).where(models.Tenant.name == tenant.name))
    db_tenant = result.scalar_one_or_none()
    if db_tenant:
        raise HTTPException(status_code=400, detail="Tenant name already exists")
    
    db_tenant = models.Tenant(**tenant.model_dump())
    db.add(db_tenant)
    await db.commit()
    await db.refresh(db_tenant)
    return db_tenant


@router.get("/", response_model=List[schemas.TenantResponse])
async def list_tenants(
    skip: int = 0,
    limit: int = 100,
    current_user: models.User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(models.Tenant)
    
    if current_user.role == models.UserRole.TENANT:
        query = query.where(models.Tenant.id == current_user.tenant_id)
    
    result = await db.execute(query.offset(skip).limit(limit))
    tenants = result.scalars().all()
    return tenants


@router.get("/{tenant_id}", response_model=schemas.TenantResponse)
async def get_tenant(
    tenant_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(models.Tenant).where(models.Tenant.id == tenant_id))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    if current_user.role == models.UserRole.TENANT and current_user.tenant_id != tenant_id:
        raise HTTPException(status_code=403, detail="Not allowed to access this tenant")
    
    return tenant


@router.put("/{tenant_id}", response_model=schemas.TenantResponse, dependencies=[Depends(require_role(models.UserRole.ADMIN, models.UserRole.PROPERTY))])
async def update_tenant(
    tenant_id: int,
    tenant_update: schemas.TenantUpdate,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(models.Tenant).where(models.Tenant.id == tenant_id))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    update_data = tenant_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(tenant, field, value)
    
    await db.commit()
    await db.refresh(tenant)
    return tenant


@router.delete("/{tenant_id}", dependencies=[Depends(require_role(models.UserRole.ADMIN))])
async def delete_tenant(
    tenant_id: int,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(models.Tenant).where(models.Tenant.id == tenant_id))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    tenant.is_active = False
    await db.commit()
    return {"message": "Tenant deactivated successfully"}
