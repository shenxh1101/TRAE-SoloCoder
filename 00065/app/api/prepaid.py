from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from datetime import datetime
from ..database import get_db
from .. import models, schemas
from ..security import require_role, get_current_active_user

router = APIRouter(prefix="/prepaid", tags=["预付费管理"])


@router.post("/accounts", response_model=schemas.PrepaidAccountResponse, dependencies=[Depends(require_role(models.UserRole.ADMIN, models.UserRole.PROPERTY))])
async def create_prepaid_account(
    account: schemas.PrepaidAccountCreate,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(models.PrepaidAccount).where(
            and_(
                models.PrepaidAccount.tenant_id == account.tenant_id,
                models.PrepaidAccount.is_active == True
            )
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Tenant already has an active prepaid account")
    
    db_account = models.PrepaidAccount(**account.model_dump())
    db.add(db_account)
    await db.commit()
    await db.refresh(db_account)
    return db_account


@router.get("/accounts", response_model=List[schemas.PrepaidAccountResponse])
async def list_prepaid_accounts(
    skip: int = 0,
    limit: int = 100,
    tenant_id: int = None,
    current_user: models.User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(models.PrepaidAccount)
    
    if current_user.role == models.UserRole.TENANT:
        query = query.where(models.PrepaidAccount.tenant_id == current_user.tenant_id)
    elif tenant_id:
        query = query.where(models.PrepaidAccount.tenant_id == tenant_id)
    
    result = await db.execute(query.offset(skip).limit(limit))
    accounts = result.scalars().all()
    return accounts


@router.get("/accounts/{account_id}", response_model=schemas.PrepaidAccountResponse)
async def get_prepaid_account(
    account_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(models.PrepaidAccount).where(models.PrepaidAccount.id == account_id))
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=404, detail="Prepaid account not found")
    
    if current_user.role == models.UserRole.TENANT and current_user.tenant_id != account.tenant_id:
        raise HTTPException(status_code=403, detail="Not allowed to access this account")
    
    return account


@router.post("/accounts/{account_id}/recharge", response_model=schemas.PrepaidTransactionResponse)
async def recharge_account(
    account_id: int,
    amount: float,
    remark: str = None,
    current_user: models.User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(models.PrepaidAccount).where(models.PrepaidAccount.id == account_id))
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=404, detail="Prepaid account not found")
    
    if current_user.role == models.UserRole.TENANT and current_user.tenant_id != account.tenant_id:
        raise HTTPException(status_code=403, detail="Not allowed to access this account")
    
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Recharge amount must be positive")
    
    balance_before = account.balance
    account.balance += amount
    
    transaction = models.PrepaidTransaction(
        account_id=account.id,
        transaction_type="recharge",
        amount=amount,
        balance_before=balance_before,
        balance_after=account.balance,
        remark=remark or "Account recharge",
        operator=current_user.username
    )
    db.add(transaction)
    
    if account.balance >= account.safety_threshold:
        device_result = await db.execute(
            select(models.Device).where(
                and_(
                    models.Device.tenant_id == account.tenant_id,
                    models.Device.power_status != models.PowerStatus.NORMAL
                )
            )
        )
        devices = device_result.scalars().all()
        for device in devices:
            if device.device_type == models.DeviceType.ELECTRICITY:
                device.power_status = models.PowerStatus.NORMAL
    
    await db.commit()
    await db.refresh(transaction)
    return transaction


@router.get("/accounts/{account_id}/transactions", response_model=List[schemas.PrepaidTransactionResponse])
async def get_account_transactions(
    account_id: int,
    skip: int = 0,
    limit: int = 100,
    current_user: models.User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(models.PrepaidAccount).where(models.PrepaidAccount.id == account_id))
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=404, detail="Prepaid account not found")
    
    if current_user.role == models.UserRole.TENANT and current_user.tenant_id != account.tenant_id:
        raise HTTPException(status_code=403, detail="Not allowed to access this account")
    
    result = await db.execute(
        select(models.PrepaidTransaction)
        .where(models.PrepaidTransaction.account_id == account_id)
        .order_by(models.PrepaidTransaction.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    transactions = result.scalars().all()
    return transactions


@router.post("/check-balance-alerts", response_model=dict, dependencies=[Depends(require_role(models.UserRole.ADMIN, models.UserRole.PROPERTY))])
async def check_balance_alerts(
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(models.PrepaidAccount).where(
            and_(
                models.PrepaidAccount.is_active == True,
                models.PrepaidAccount.balance < models.PrepaidAccount.safety_threshold
            )
        )
    )
    low_balance_accounts = result.scalars().all()
    
    alerts_created = []
    
    for account in low_balance_accounts:
        existing_alert = await db.execute(
            select(models.Alert).where(
                and_(
                    models.Alert.tenant_id == account.tenant_id,
                    models.Alert.alert_type == models.AlertType.LOW_BALANCE,
                    models.Alert.is_resolved == False
                )
            )
        )
        if existing_alert.scalar_one_or_none():
            continue
        
        alert = models.Alert(
            tenant_id=account.tenant_id,
            alert_type=models.AlertType.LOW_BALANCE,
            severity=models.AlertSeverity.MEDIUM,
            title="预付费账户余额不足",
            message=f"账户余额{account.balance}元，低于安全阈值{account.safety_threshold}元，请及时充值"
        )
        db.add(alert)
        alerts_created.append({
            "tenant_id": account.tenant_id,
            "balance": account.balance
        })
        
        if account.balance <= 0:
            device_result = await db.execute(
                select(models.Device).where(
                    and_(
                        models.Device.tenant_id == account.tenant_id,
                        models.Device.device_type == models.DeviceType.ELECTRICITY,
                        models.Device.power_status == models.PowerStatus.NORMAL
                    )
                )
            )
            devices = device_result.scalars().all()
            for device in devices:
                device.power_status = models.PowerStatus.LIMITED
                
                power_alert = models.Alert(
                    tenant_id=account.tenant_id,
                    device_id=device.id,
                    alert_type=models.AlertType.POWER_LIMITED,
                    severity=models.AlertSeverity.HIGH,
                    title="用电已受限",
                    message=f"因账户余额不足，设备{device.device_name}已被限电，请充值后申请恢复"
                )
                db.add(power_alert)
    
    await db.commit()
    return {"message": "Balance check completed", "alerts_created": alerts_created}
