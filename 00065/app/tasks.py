from datetime import datetime, timedelta
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from . import models
from .api.bills import calculate_cost_with_rules


async def calculate_daily_usage_task(db: AsyncSession, date: datetime = None):
    if not date:
        date = datetime.utcnow()
    
    start_of_day = date.replace(hour=0, minute=0, second=0, microsecond=0)
    end_of_day = start_of_day + timedelta(days=1)
    
    result = await db.execute(select(models.Device).where(models.Device.is_active == True))
    devices = result.scalars().all()
    
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
                period = f"{start_of_day.strftime('%Y-%m-%d')}"
                existing = await db.execute(
                    select(models.UsageRecord).where(
                        and_(
                            models.UsageRecord.device_id == device.id,
                            models.UsageRecord.period == period
                        )
                    )
                )
                if not existing.scalar_one_or_none():
                    usage_record = models.UsageRecord(
                        device_id=device.id,
                        tenant_id=device.tenant_id,
                        usage_type=device.device_type,
                        start_reading=start_reading.reading_value,
                        end_reading=end_reading.reading_value,
                        usage_amount=usage_amount,
                        start_time=start_reading.reading_time,
                        end_time=end_reading.reading_time,
                        period=period
                    )
                    db.add(usage_record)
    
    await db.commit()
    return {"message": "Usage calculated successfully"}


async def check_balance_alerts_task(db: AsyncSession):
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


async def check_usage_spike_task(db: AsyncSession):
    today = datetime.utcnow().date()
    today_str = today.strftime("%Y-%m-%d")
    
    last_month = today - timedelta(days=28)
    last_month_str = last_month.strftime("%Y-%m-%d")
    
    alerts_created = []
    
    result = await db.execute(select(models.Tenant).where(models.Tenant.is_active == True))
    tenants = result.scalars().all()
    
    for tenant in tenants:
        for device_type in [models.DeviceType.ELECTRICITY, models.DeviceType.WATER]:
            today_usage_result = await db.execute(
                select(func.sum(models.UsageRecord.usage_amount)).where(
                    and_(
                        models.UsageRecord.tenant_id == tenant.id,
                        models.UsageRecord.usage_type == device_type,
                        models.UsageRecord.period == today_str
                    )
                )
            )
            today_usage = today_usage_result.scalar_one() or 0
            
            if today_usage <= 0:
                continue
            
            last_month_usage_result = await db.execute(
                select(func.sum(models.UsageRecord.usage_amount)).where(
                    and_(
                        models.UsageRecord.tenant_id == tenant.id,
                        models.UsageRecord.usage_type == device_type,
                        models.UsageRecord.period == last_month_str
                    )
                )
            )
            last_month_usage = last_month_usage_result.scalar_one() or 0
            
            if last_month_usage <= 0:
                continue
            
            increase_ratio = (today_usage - last_month_usage) / last_month_usage
            
            if increase_ratio >= 0.5:
                existing_alert = await db.execute(
                    select(models.Alert).where(
                        and_(
                            models.Alert.tenant_id == tenant.id,
                            models.Alert.alert_type == models.AlertType.USAGE_SPIKE,
                            models.Alert.created_at >= datetime.combine(today, datetime.min.time())
                        )
                    )
                )
                if existing_alert.scalar_one_or_none():
                    continue
                
                alert = models.Alert(
                    tenant_id=tenant.id,
                    alert_type=models.AlertType.USAGE_SPIKE,
                    severity=models.AlertSeverity.MEDIUM,
                    title=f"{device_type.value}用量突增告警",
                    message=f"今日{device_type.value}用量{today_usage:.2f}，较上月同期{last_month_usage:.2f}增长{increase_ratio*100:.1f}%，请检查是否存在异常"
                )
                db.add(alert)
                await db.flush()
                
                work_order = models.WorkOrder(
                    order_no=f"WO{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
                    tenant_id=tenant.id,
                    alert_id=alert.id,
                    title=f"{device_type.value}用量突增检查",
                    description=f"租户{tenant.name}{device_type.value}用量突增{increase_ratio*100:.1f}%，需要现场检查",
                    priority="high"
                )
                db.add(work_order)
                
                alerts_created.append({
                    "tenant_id": tenant.id,
                    "device_type": device_type.value,
                    "increase_ratio": increase_ratio,
                    "today_usage": today_usage,
                    "last_month_usage": last_month_usage
                })
    
    await db.commit()
    return {"message": "Usage spike check completed", "alerts_created": alerts_created}


async def generate_monthly_bills_task(db: AsyncSession, year: int = None, month: int = None):
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


async def predict_usage_task(db: AsyncSession, tenant_id: int = None):
    from .services.prediction import (
        compute_weather_factors, weather_enhanced_predict,
        get_cached_or_fetch_weather
    )

    query = select(models.Tenant).where(models.Tenant.is_active == True)
    if tenant_id:
        query = query.where(models.Tenant.id == tenant_id)

    result = await db.execute(query)
    tenants = result.scalars().all()

    predictions = []

    now = datetime.utcnow()
    next_month = now.month + 1 if now.month < 12 else 1
    next_year = now.year if now.month < 12 else now.year + 1
    prediction_month = f"{next_year}-{next_month:02d}"

    forecast = await get_cached_or_fetch_weather(db)
    weather_factors = compute_weather_factors(forecast) if forecast else {}

    for tenant in tenants:
        history_result = await db.execute(
            select(models.Bill).where(
                and_(
                    models.Bill.tenant_id == tenant.id,
                    models.Bill.status == models.BillStatus.PAID
                )
            ).order_by(models.Bill.billing_month.desc()).limit(6)
        )
        history_bills = history_result.scalars().all()

        if len(history_bills) < 2:
            continue

        electricity_usages = [b.electricity_usage for b in history_bills if b.electricity_usage > 0]
        water_usages = [b.water_usage for b in history_bills if b.water_usage > 0]
        total_costs = [b.total_amount for b in history_bills]
        billing_months = [b.billing_month for b in history_bills]

        predicted_electricity, predicted_water, predicted_cost, confidence, forecast_summary = (
            weather_enhanced_predict(
                electricity_usages=electricity_usages,
                water_usages=water_usages,
                total_costs=total_costs,
                billing_months=billing_months,
                weather_factors=weather_factors,
                num_history=len(history_bills)
            )
        )

        existing_pred = await db.execute(
            select(models.UsagePrediction).where(
                and_(
                    models.UsagePrediction.tenant_id == tenant.id,
                    models.UsagePrediction.prediction_month == prediction_month
                )
            )
        )
        if existing_pred.scalar_one_or_none():
            continue

        prediction = models.UsagePrediction(
            tenant_id=tenant.id,
            prediction_month=prediction_month,
            predicted_electricity=predicted_electricity,
            predicted_water=predicted_water,
            predicted_cost=predicted_cost,
            confidence=confidence,
            model_version="v2.0-weather",
            weather_factors=weather_factors,
            weather_forecast_summary=forecast_summary
        )
        db.add(prediction)

        predictions.append({
            "tenant_id": tenant.id,
            "tenant_name": tenant.name,
            "prediction_month": prediction_month,
            "predicted_electricity": predicted_electricity,
            "predicted_water": predicted_water,
            "predicted_cost": predicted_cost,
            "confidence": confidence,
            "weather_adjusted": bool(weather_factors),
            "electricity_weather_adjustment": weather_factors.get("electricity_temp_factor", 1.0),
            "water_weather_adjustment": weather_factors.get("water_precip_factor", 1.0)
        })

    await db.commit()
    return {"message": "Usage predictions generated with weather enhancement", "predictions": predictions}
