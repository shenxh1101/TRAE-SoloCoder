from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from datetime import datetime, timedelta
import numpy as np
from ..database import get_db
from .. import models, schemas
from ..security import require_role, get_current_active_user
from ..services.prediction import (
    compute_weather_factors, weather_enhanced_predict,
    get_cached_or_fetch_weather
)
from ..services.weather import fetch_weather_forecast
from ..config import get_settings

router = APIRouter(prefix="/analytics", tags=["分析与预测"])


@router.post("/predict-usage", response_model=dict, dependencies=[Depends(require_role(models.UserRole.ADMIN, models.UserRole.PROPERTY))])
async def predict_next_month_usage(
    tenant_id: int = None,
    latitude: float = None,
    longitude: float = None,
    location_name: str = None,
    db: AsyncSession = Depends(get_db)
):
    settings = get_settings()

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

    lat = latitude or settings.WEATHER_LATITUDE
    lon = longitude or settings.WEATHER_LONGITUDE
    loc = location_name or settings.WEATHER_LOCATION_NAME

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
            "water_weather_adjustment": weather_factors.get("water_precip_factor", 1.0),
            "forecast_summary": forecast_summary
        })

    await db.commit()
    return {
        "message": "Usage predictions generated with weather enhancement",
        "weather_info": {
            "location": loc,
            "avg_temp_forecast": weather_factors.get("avg_temp"),
            "hot_days": weather_factors.get("hot_days"),
            "cold_days": weather_factors.get("cold_days"),
            "rainy_days": weather_factors.get("rainy_days"),
            "total_precipitation": weather_factors.get("total_precipitation"),
            "forecast_days": weather_factors.get("forecast_days")
        },
        "predictions": predictions
    }


@router.get("/predictions", response_model=List[schemas.UsagePredictionResponse])
async def list_predictions(
    skip: int = 0,
    limit: int = 100,
    tenant_id: int = None,
    prediction_month: str = None,
    current_user: models.User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(models.UsagePrediction)
    
    if current_user.role == models.UserRole.TENANT:
        query = query.where(models.UsagePrediction.tenant_id == current_user.tenant_id)
    elif tenant_id:
        query = query.where(models.UsagePrediction.tenant_id == tenant_id)
    
    if prediction_month:
        query = query.where(models.UsagePrediction.prediction_month == prediction_month)
    
    query = query.order_by(models.UsagePrediction.prediction_month.desc())
    result = await db.execute(query.offset(skip).limit(limit))
    predictions = result.scalars().all()
    return predictions


@router.post("/check-usage-spike", response_model=dict, dependencies=[Depends(require_role(models.UserRole.ADMIN, models.UserRole.PROPERTY))])
async def check_usage_spike_alerts(
    db: AsyncSession = Depends(get_db)
):
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


@router.get("/alerts", response_model=List[schemas.AlertResponse])
async def list_alerts(
    skip: int = 0,
    limit: int = 100,
    tenant_id: int = None,
    alert_type: models.AlertType = None,
    is_read: bool = None,
    is_resolved: bool = None,
    current_user: models.User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(models.Alert)
    
    if current_user.role == models.UserRole.TENANT:
        query = query.where(models.Alert.tenant_id == current_user.tenant_id)
    elif tenant_id:
        query = query.where(models.Alert.tenant_id == tenant_id)
    
    if alert_type:
        query = query.where(models.Alert.alert_type == alert_type)
    if is_read is not None:
        query = query.where(models.Alert.is_read == is_read)
    if is_resolved is not None:
        query = query.where(models.Alert.is_resolved == is_resolved)
    
    query = query.order_by(models.Alert.created_at.desc())
    result = await db.execute(query.offset(skip).limit(limit))
    alerts = result.scalars().all()
    return alerts


@router.put("/alerts/{alert_id}/read", response_model=schemas.AlertResponse)
async def mark_alert_read(
    alert_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(models.Alert).where(models.Alert.id == alert_id))
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    if current_user.role == models.UserRole.TENANT and current_user.tenant_id != alert.tenant_id:
        raise HTTPException(status_code=403, detail="Not allowed to access this alert")
    
    alert.is_read = True
    await db.commit()
    await db.refresh(alert)
    return alert


@router.put("/alerts/{alert_id}/resolve", response_model=schemas.AlertResponse, dependencies=[Depends(require_role(models.UserRole.ADMIN, models.UserRole.PROPERTY))])
async def resolve_alert(
    alert_id: int,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(models.Alert).where(models.Alert.id == alert_id))
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    alert.is_resolved = True
    await db.commit()
    await db.refresh(alert)
    return alert


@router.get("/weather-forecast", response_model=schemas.WeatherForecastResponse)
async def get_weather_forecast(
    latitude: float = None,
    longitude: float = None,
    location_name: str = None,
    force_refresh: bool = False,
    current_user: models.User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    settings = get_settings()
    lat = latitude or settings.WEATHER_LATITUDE
    lon = longitude or settings.WEATHER_LONGITUDE
    loc = location_name or settings.WEATHER_LOCATION_NAME

    if force_refresh:
        result = await db.execute(
            select(models.WeatherCache).where(
                models.WeatherCache.expires_at > datetime.utcnow()
            )
        )
        for cache_entry in result.scalars().all():
            await db.delete(cache_entry)
        await db.commit()

    forecast = await get_cached_or_fetch_weather(db)

    if not forecast or not forecast.daily_forecasts:
        raise HTTPException(status_code=503, detail="Weather service unavailable")

    weather_factors = compute_weather_factors(forecast)

    return schemas.WeatherForecastResponse(
        location_name=forecast.location,
        latitude=forecast.latitude,
        longitude=forecast.longitude,
        avg_temp=weather_factors.get("avg_temp", 0),
        avg_humidity=weather_factors.get("avg_humidity", 0),
        total_precipitation=weather_factors.get("total_precipitation", 0),
        hot_days_count=weather_factors.get("hot_days", 0),
        cold_days_count=weather_factors.get("cold_days", 0),
        rainy_days_count=weather_factors.get("rainy_days", 0),
        forecast_days=weather_factors.get("forecast_days", 0),
        source=weather_factors.get("source", "unknown"),
        fetched_at=forecast.fetched_at.isoformat()
    )


@router.get("/weather-daily")
async def get_weather_daily_detail(
    latitude: float = None,
    longitude: float = None,
    location_name: str = None,
    current_user: models.User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    settings = get_settings()
    lat = latitude or settings.WEATHER_LATITUDE
    lon = longitude or settings.WEATHER_LONGITUDE
    loc = location_name or settings.WEATHER_LOCATION_NAME

    forecast = await get_cached_or_fetch_weather(db)

    if not forecast:
        raise HTTPException(status_code=503, detail="Weather service unavailable")

    daily_data = []
    for d in forecast.daily_forecasts:
        daily_data.append({
            "date": d.date,
            "temp_max": d.temp_max,
            "temp_min": d.temp_min,
            "temp_avg": d.temp_avg,
            "humidity": d.humidity,
            "precipitation": d.precipitation,
            "weather_code": d.weather_code,
            "weather_desc": d.weather_desc,
            "is_hot_day": d.temp_avg > 30,
            "is_cold_day": d.temp_avg < 5,
            "is_rainy_day": d.precipitation > 1
        })

    weather_factors = compute_weather_factors(forecast)

    return {
        "location": forecast.location,
        "latitude": forecast.latitude,
        "longitude": forecast.longitude,
        "fetched_at": forecast.fetched_at.isoformat(),
        "summary": {
            "avg_temp": weather_factors.get("avg_temp"),
            "avg_humidity": weather_factors.get("avg_humidity"),
            "total_precipitation": weather_factors.get("total_precipitation"),
            "hot_days": weather_factors.get("hot_days"),
            "cold_days": weather_factors.get("cold_days"),
            "rainy_days": weather_factors.get("rainy_days"),
            "electricity_temp_factor": weather_factors.get("electricity_temp_factor"),
            "water_precip_factor": weather_factors.get("water_precip_factor")
        },
        "daily_forecasts": daily_data
    }


@router.get("/weather-impact")
async def get_weather_impact_analysis(
    current_user: models.User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    forecast = await get_cached_or_fetch_weather(db)

    if not forecast or not forecast.daily_forecasts:
        raise HTTPException(status_code=503, detail="Weather service unavailable")

    weather_factors = compute_weather_factors(forecast)

    elec_factor = weather_factors.get("electricity_temp_factor", 1.0)
    water_factor = weather_factors.get("water_precip_factor", 1.0)
    avg_temp = weather_factors.get("avg_temp", 20)
    hot_days = weather_factors.get("hot_days", 0)
    cold_days = weather_factors.get("cold_days", 0)
    rainy_days = weather_factors.get("rainy_days", 0)

    electricity_impact = "正常"
    if elec_factor > 1.1:
        electricity_impact = "预计用电量将显著增加"
        if hot_days > 10:
            electricity_impact += "（高温天数多，制冷需求大）"
        elif cold_days > 10:
            electricity_impact += "（低温天数多，制热需求大）"
    elif elec_factor < 0.95:
        electricity_impact = "预计用电量将略有下降"

    water_impact = "正常"
    if water_factor < 0.95:
        water_impact = "预计用水量可能下降（降水偏多）"
    elif water_factor > 1.05:
        water_impact = "预计用水量可能上升（降水偏少）"

    budget_advice = []
    if elec_factor > 1.1:
        budget_advice.append("建议适当增加电费预算，预留10-20%的弹性空间")
    if hot_days > 15:
        budget_advice.append("下月高温天数较多，建议提前检查空调设备运行状况")
    if cold_days > 10:
        budget_advice.append("下月低温天数较多，建议检查供暖设备效率")
    if rainy_days > 12:
        budget_advice.append("降水天数较多，注意防范漏水及用电安全隐患")
    if not budget_advice:
        budget_advice.append("天气条件对能耗影响较小，可按常规预算规划")

    return {
        "weather_summary": weather_factors,
        "electricity_impact": electricity_impact,
        "electricity_adjustment_pct": round((elec_factor - 1) * 100, 1),
        "water_impact": water_impact,
        "water_adjustment_pct": round((water_factor - 1) * 100, 1),
        "budget_advice": budget_advice
    }
