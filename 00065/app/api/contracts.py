from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload
from typing import List
from ..database import get_db
from .. import models, schemas
from ..security import require_role, get_current_active_user

router = APIRouter(prefix="/contracts", tags=["合同管理"])


@router.post("/", response_model=schemas.ContractResponse, dependencies=[Depends(require_role(models.UserRole.ADMIN, models.UserRole.PROPERTY))])
async def create_contract(
    contract: schemas.ContractCreate,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(models.Contract).where(models.Contract.contract_code == contract.contract_code))
    db_contract = result.scalar_one_or_none()
    if db_contract:
        raise HTTPException(status_code=400, detail="Contract code already exists")
    
    db_contract = models.Contract(**contract.model_dump())
    db.add(db_contract)
    await db.commit()
    await db.refresh(db_contract)
    return db_contract


@router.get("/", response_model=List[schemas.ContractResponse])
async def list_contracts(
    skip: int = 0,
    limit: int = 100,
    tenant_id: int = None,
    current_user: models.User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(models.Contract)
    
    if current_user.role == models.UserRole.TENANT:
        query = query.where(models.Contract.tenant_id == current_user.tenant_id)
    elif tenant_id:
        query = query.where(models.Contract.tenant_id == tenant_id)
    
    result = await db.execute(query.offset(skip).limit(limit))
    contracts = result.scalars().all()
    return contracts


@router.get("/{contract_id}", response_model=schemas.ContractResponse)
async def get_contract(
    contract_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(models.Contract).where(models.Contract.id == contract_id))
    contract = result.scalar_one_or_none()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    if current_user.role == models.UserRole.TENANT and current_user.tenant_id != contract.tenant_id:
        raise HTTPException(status_code=403, detail="Not allowed to access this contract")
    
    return contract


@router.put("/{contract_id}", response_model=schemas.ContractResponse, dependencies=[Depends(require_role(models.UserRole.ADMIN, models.UserRole.PROPERTY))])
async def update_contract(
    contract_id: int,
    contract_update: schemas.ContractUpdate,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(models.Contract).where(models.Contract.id == contract_id))
    contract = result.scalar_one_or_none()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    update_data = contract_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(contract, field, value)
    
    await db.commit()
    await db.refresh(contract)
    return contract


@router.post("/pricing-rules", response_model=schemas.PricingRuleResponse, dependencies=[Depends(require_role(models.UserRole.ADMIN, models.UserRole.PROPERTY))])
async def create_pricing_rule(
    pricing_rule: schemas.PricingRuleCreate,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(models.Contract).where(models.Contract.id == pricing_rule.contract_id))
    contract = result.scalar_one_or_none()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    db_rule = models.PricingRule(**pricing_rule.model_dump())
    db.add(db_rule)
    await db.commit()
    await db.refresh(db_rule)
    return db_rule


@router.get("/{contract_id}/pricing-rules", response_model=List[schemas.PricingRuleResponse])
async def get_contract_pricing_rules(
    contract_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(models.Contract).where(models.Contract.id == contract_id))
    contract = result.scalar_one_or_none()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    if current_user.role == models.UserRole.TENANT and current_user.tenant_id != contract.tenant_id:
        raise HTTPException(status_code=403, detail="Not allowed to access this contract")
    
    result = await db.execute(select(models.PricingRule).where(models.PricingRule.contract_id == contract_id))
    rules = result.scalars().all()
    return rules
