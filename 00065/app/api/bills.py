from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from datetime import datetime, timedelta
from ..database import get_db
from .. import models, schemas
from ..security import require_role, get_current_active_user

router = APIRouter(prefix="/bills", tags=["账单管理"])


def calculate_cost_with_rules(usage_amount: float, pricing_rule: models.PricingRule) -> tuple[float, list]:
    pricing_type = pricing_rule.pricing_type
    rules = pricing_rule.rules
    details = []
    total_cost = 0.0
    
    if pricing_type == models.PricingType.FLAT:
        unit_price = rules.get("unit_price", 0)
        total_cost = usage_amount * unit_price
        details.append({
            "type": "flat",
            "usage": usage_amount,
            "unit_price": unit_price,
            "subtotal": total_cost
        })
    
    elif pricing_type == models.PricingType.TIERED:
        tiers = rules.get("tiers", [])
        remaining_usage = usage_amount
        for tier in tiers:
            min_usage = tier.get("min_usage", 0)
            max_usage = tier.get("max_usage", float("inf"))
            unit_price = tier.get("unit_price", 0)
            
            if max_usage == float("inf"):
                tier_usage = max(0, remaining_usage - min_usage)
            else:
                tier_usage = max(0, min(remaining_usage, max_usage) - min_usage)
            
            if tier_usage > 0:
                tier_cost = tier_usage * unit_price
                total_cost += tier_cost
                details.append({
                    "type": "tier",
                    "range": f"{min_usage}-{max_usage if max_usage != float('inf') else '∞'}",
                    "usage": tier_usage,
                    "unit_price": unit_price,
                    "subtotal": tier_cost
                })
    
    elif pricing_type == models.PricingType.TIME_OF_USE:
        time_periods = rules.get("periods", [])
        default_price = rules.get("default_price", 0)
        
        if not time_periods:
            total_cost = usage_amount * default_price
            details.append({
                "type": "default",
                "usage": usage_amount,
                "unit_price": default_price,
                "subtotal": total_cost
            })
        else:
            avg_price = sum(p.get("price", default_price) for p in time_periods) / len(time_periods)
            total_cost = usage_amount * avg_price
            details.append({
                "type": "time_of_use_avg",
                "usage": usage_amount,
                "avg_unit_price": avg_price,
                "subtotal": total_cost
            })
    
    return total_cost, details


@router.post("/generate-monthly", response_model=dict, dependencies=[Depends(require_role(models.UserRole.ADMIN, models.UserRole.PROPERTY))])
async def generate_monthly_bills(
    year: int = None,
    month: int = None,
    db: AsyncSession = Depends(get_db)
):
    if not year or not month:
        now = datetime.utcnow()
        year = now.year
        month = now.month
    
    billing_month = f"{year}-{month:02d}"
    
    result = await db.execute(select(models.Tenant).where(models.Tenant.is_active == True))
    tenants = result.scalars().all()
    
    generated_bills = []
    
    for tenant in tenants:
        contract_result = await db.execute(
            select(models.Contract).where(
                and_(
                    models.Contract.tenant_id == tenant.id,
                    models.Contract.is_active == True
                )
            )
        )
        contract = contract_result.scalar_one_or_none()
        
        if not contract:
            continue
        
        existing_bill = await db.execute(
            select(models.Bill).where(
                and_(
                    models.Bill.tenant_id == tenant.id,
                    models.Bill.billing_month == billing_month
                )
            )
        )
        if existing_bill.scalar_one_or_none():
            continue
        
        bill_no = f"BILL{billing_month.replace('-', '')}{tenant.id:04d}"
        
        device_result = await db.execute(
            select(models.Device).where(models.Device.tenant_id == tenant.id)
        )
        devices = device_result.scalars().all()
        
        pricing_rules_result = await db.execute(
            select(models.PricingRule).where(models.PricingRule.contract_id == contract.id)
        )
        pricing_rules = {r.utility_type: r for r in pricing_rules_result.scalars().all()}
        
        electricity_usage = 0
        water_usage = 0
        electricity_cost = 0
        water_cost = 0
        bill_details = []
        
        for device in devices:
            usage_result = await db.execute(
                select(func.sum(models.UsageRecord.usage_amount)).where(
                    and_(
                        models.UsageRecord.device_id == device.id,
                        models.UsageRecord.period.like(f"{billing_month}%")
                    )
                )
            )
            usage = usage_result.scalar_one() or 0
            
            if usage <= 0:
                continue
            
            pricing_rule = pricing_rules.get(device.device_type)
            if pricing_rule:
                cost, pricing_details = calculate_cost_with_rules(usage, pricing_rule)
                
                avg_price = cost / usage if usage > 0 else 0
                bill_detail = models.BillDetail(
                    device_id=device.id,
                    utility_type=device.device_type,
                    usage_amount=usage,
                    unit_price=avg_price,
                    subtotal=cost,
                    pricing_details={"breakdown": pricing_details}
                )
                bill_details.append(bill_detail)
                
                if device.device_type == models.DeviceType.ELECTRICITY:
                    electricity_usage += usage
                    electricity_cost += cost
                elif device.device_type == models.DeviceType.WATER:
                    water_usage += usage
                    water_cost += cost
        
        total_amount = electricity_cost + water_cost
        due_date = datetime(year, month, 28) + timedelta(days=5)
        
        bill = models.Bill(
            bill_no=bill_no,
            tenant_id=tenant.id,
            contract_id=contract.id,
            billing_month=billing_month,
            electricity_usage=electricity_usage,
            water_usage=water_usage,
            electricity_cost=electricity_cost,
            water_cost=water_cost,
            total_amount=total_amount,
            status=models.BillStatus.PENDING,
            due_date=due_date
        )
        db.add(bill)
        await db.flush()
        
        for detail in bill_details:
            detail.bill_id = bill.id
            db.add(detail)
        
        generated_bills.append({
            "bill_no": bill_no,
            "tenant_id": tenant.id,
            "total_amount": total_amount
        })
    
    await db.commit()
    return {"message": "Monthly bills generated", "bills": generated_bills}


@router.get("/", response_model=List[schemas.BillResponse])
async def list_bills(
    skip: int = 0,
    limit: int = 100,
    tenant_id: int = None,
    billing_month: str = None,
    status: models.BillStatus = None,
    current_user: models.User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(models.Bill)
    
    if current_user.role == models.UserRole.TENANT:
        query = query.where(models.Bill.tenant_id == current_user.tenant_id)
    elif tenant_id:
        query = query.where(models.Bill.tenant_id == tenant_id)
    
    if billing_month:
        query = query.where(models.Bill.billing_month == billing_month)
    if status:
        query = query.where(models.Bill.status == status)
    
    query = query.order_by(models.Bill.created_at.desc())
    result = await db.execute(query.offset(skip).limit(limit))
    bills = result.scalars().all()
    return bills


@router.get("/{bill_id}", response_model=schemas.BillResponse)
async def get_bill(
    bill_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(models.Bill).where(models.Bill.id == bill_id))
    bill = result.scalar_one_or_none()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    
    if current_user.role == models.UserRole.TENANT and current_user.tenant_id != bill.tenant_id:
        raise HTTPException(status_code=403, detail="Not allowed to access this bill")
    
    return bill


@router.post("/{bill_id}/pay", response_model=schemas.BillResponse)
async def pay_bill(
    bill_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(models.Bill).where(models.Bill.id == bill_id))
    bill = result.scalar_one_or_none()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    
    if current_user.role == models.UserRole.TENANT and current_user.tenant_id != bill.tenant_id:
        raise HTTPException(status_code=403, detail="Not allowed to pay this bill")
    
    if bill.status == models.BillStatus.PAID:
        raise HTTPException(status_code=400, detail="Bill already paid")
    
    prepaid_result = await db.execute(
        select(models.PrepaidAccount).where(
            and_(
                models.PrepaidAccount.tenant_id == bill.tenant_id,
                models.PrepaidAccount.is_active == True
            )
        )
    )
    prepaid_account = prepaid_result.scalar_one_or_none()
    
    if prepaid_account and prepaid_account.balance >= bill.total_amount:
        prepaid_account.balance -= bill.total_amount
        transaction = models.PrepaidTransaction(
            account_id=prepaid_account.id,
            transaction_type="bill_payment",
            amount=bill.total_amount,
            balance_before=prepaid_account.balance + bill.total_amount,
            balance_after=prepaid_account.balance,
            remark=f"Bill payment for {bill.billing_month}",
            operator=current_user.username
        )
        db.add(transaction)
    else:
        raise HTTPException(status_code=400, detail="Insufficient balance or no prepaid account")
    
    bill.status = models.BillStatus.PAID
    bill.paid_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(bill)
    return bill
