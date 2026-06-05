import numpy as np
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from .. import models
from ..services.weather import (
    fetch_weather_forecast, WeatherForecast, DailyWeather,
    WeatherServiceError
)
from ..config import get_settings
import logging

logger = logging.getLogger(__name__)

COMFORT_TEMP_LOW = 18.0
COMFORT_TEMP_HIGH = 26.0
HOT_THRESHOLD = 30.0
COLD_THRESHOLD = 5.0
RAIN_THRESHOLD = 1.0


def compute_weather_factors(forecast: WeatherForecast) -> Dict[str, Any]:
    if not forecast.daily_forecasts:
        return {
            "avg_temp": 20.0, "avg_humidity": 50.0,
            "total_precipitation": 0.0, "hot_days": 0,
            "cold_days": 0, "rainy_days": 0,
            "temp_deviation": 0.0, "humidity_deviation": 0.0,
            "electricity_temp_factor": 1.0, "water_precip_factor": 1.0,
            "source": "none", "forecast_days": 0
        }

    temps = [d.temp_avg for d in forecast.daily_forecasts]
    humidities = [d.humidity for d in forecast.daily_forecasts]
    precipitations = [d.precipitation for d in forecast.daily_forecasts]

    avg_temp = float(np.mean(temps))
    avg_humidity = float(np.mean(humidities))
    total_precip = float(np.sum(precipitations))
    hot_days = sum(1 for t in temps if t > HOT_THRESHOLD)
    cold_days = sum(1 for t in temps if t < COLD_THRESHOLD)
    rainy_days = sum(1 for p in precipitations if p > RAIN_THRESHOLD)

    reference_temp = 20.0
    reference_humidity = 55.0

    temp_deviation = avg_temp - reference_temp
    humidity_deviation = avg_humidity - reference_humidity

    electricity_temp_factor = _calc_electricity_temp_factor(avg_temp, hot_days, cold_days)
    water_precip_factor = _calc_water_precip_factor(total_precip, rainy_days, avg_humidity)

    return {
        "avg_temp": round(avg_temp, 1),
        "avg_humidity": round(avg_humidity, 1),
        "total_precipitation": round(total_precip, 1),
        "hot_days": hot_days,
        "cold_days": cold_days,
        "rainy_days": rainy_days,
        "temp_deviation": round(temp_deviation, 1),
        "humidity_deviation": round(humidity_deviation, 1),
        "electricity_temp_factor": round(electricity_temp_factor, 4),
        "water_precip_factor": round(water_precip_factor, 4),
        "source": forecast.daily_forecasts[0].weather_desc if forecast.daily_forecasts else "none",
        "forecast_days": len(forecast.daily_forecasts)
    }


def _calc_electricity_temp_factor(avg_temp: float, hot_days: int, cold_days: int) -> float:
    factor = 1.0

    if avg_temp > COMFORT_TEMP_HIGH:
        excess = avg_temp - COMFORT_TEMP_HIGH
        factor += excess * 0.03
    elif avg_temp < COMFORT_TEMP_LOW:
        deficit = COMFORT_TEMP_LOW - avg_temp
        factor += deficit * 0.025

    if hot_days > 0:
        factor += hot_days * 0.008
    if cold_days > 0:
        factor += cold_days * 0.006

    return max(0.7, min(1.5, factor))


def _calc_water_precip_factor(total_precip: float, rainy_days: int, avg_humidity: float) -> float:
    factor = 1.0

    if total_precip > 50:
        factor -= 0.05
    elif total_precip < 10:
        factor += 0.03

    if rainy_days > 10:
        factor -= 0.03
    elif rainy_days < 3:
        factor += 0.02

    if avg_humidity > 75:
        factor -= 0.02

    return max(0.8, min(1.2, factor))


def _calc_historical_temp_deviation(billing_month: str) -> float:
    seasonal_avg = {
        "01": -3, "02": 0, "03": 8, "04": 16, "05": 22,
        "06": 27, "07": 30, "08": 29, "09": 23, "10": 15,
        "11": 6, "12": -1
    }
    month_str = billing_month[-2:]
    reference = 20.0
    historical_temp = float(seasonal_avg.get(month_str, 20))
    return historical_temp - reference


def weather_enhanced_predict(
    electricity_usages: List[float],
    water_usages: List[float],
    total_costs: List[float],
    billing_months: List[str],
    weather_factors: Dict[str, Any],
    num_history: int
) -> Tuple[float, float, float, float, Dict[str, Any]]:
    if not electricity_usages:
        return 0, 0, 0, 0, {}

    weights = np.array([2 ** i for i in range(len(electricity_usages))])
    weights = weights / weights.sum()

    base_electricity = float(np.average(electricity_usages, weights=weights))
    base_water = float(np.average(water_usages, weights=weights)) if water_usages else 0
    base_cost = float(np.average(total_costs, weights=weights)) if total_costs else 0

    elec_weather_factor = weather_factors.get("electricity_temp_factor", 1.0)
    water_weather_factor = weather_factors.get("water_precip_factor", 1.0)
    avg_temp = weather_factors.get("avg_temp", 20.0)

    predicted_electricity = base_electricity * elec_weather_factor

    predicted_water = base_water * water_weather_factor
    if avg_temp > COMFORT_TEMP_HIGH:
        predicted_water *= 1.02
    elif avg_temp < COMFORT_TEMP_LOW:
        predicted_water *= 0.98

    elec_ratio = predicted_electricity / base_electricity if base_electricity > 0 else 1.0
    water_ratio = predicted_water / base_water if base_water > 0 else 1.0
    blended_ratio = elec_ratio * 0.7 + water_ratio * 0.3
    predicted_cost = base_cost * blended_ratio

    history_confidence = min(1.0, num_history / 6) * 0.7
    weather_confidence = 0.3 if weather_factors.get("forecast_days", 0) >= 7 else 0.15
    total_confidence = min(1.0, history_confidence + weather_confidence)

    forecast_summary = {
        "weather_source": weather_factors.get("source", "unknown"),
        "forecast_days": weather_factors.get("forecast_days", 0),
        "avg_temp_forecast": weather_factors.get("avg_temp", 0),
        "hot_days_forecast": weather_factors.get("hot_days", 0),
        "cold_days_forecast": weather_factors.get("cold_days", 0),
        "rainy_days_forecast": weather_factors.get("rainy_days", 0),
        "total_precipitation_forecast": weather_factors.get("total_precipitation", 0),
        "electricity_weather_adjustment": f"{(elec_weather_factor - 1) * 100:+.1f}%",
        "water_weather_adjustment": f"{(water_weather_factor - 1) * 100:+.1f}%",
        "base_prediction_method": "weighted_moving_average",
        "weather_adjustment_method": "temperature_humidity_regression"
    }

    return (
        round(predicted_electricity, 2),
        round(predicted_water, 2),
        round(predicted_cost, 2),
        round(total_confidence, 2),
        forecast_summary
    )


async def get_cached_or_fetch_weather(db: AsyncSession) -> Optional[WeatherForecast]:
    settings = get_settings()

    result = await db.execute(
        select(models.WeatherCache)
        .where(models.WeatherCache.expires_at > datetime.utcnow())
        .order_by(models.WeatherCache.created_at.desc())
        .limit(1)
    )
    cached = result.scalar_one_or_none()

    if cached:
        logger.info(f"Using cached weather data from {cached.created_at}")
        daily_forecasts = []
        for day_data in (cached.forecast_data or []):
            daily_forecasts.append(DailyWeather(
                date=day_data.get("date", ""),
                temp_max=day_data.get("temp_max", 0),
                temp_min=day_data.get("temp_min", 0),
                temp_avg=day_data.get("temp_avg", 0),
                humidity=day_data.get("humidity", 50),
                precipitation=day_data.get("precipitation", 0),
                weather_code=day_data.get("weather_code", ""),
                weather_desc=day_data.get("weather_desc", "")
            ))
        return WeatherForecast(
            location=cached.location_name,
            latitude=cached.latitude,
            longitude=cached.longitude,
            daily_forecasts=daily_forecasts,
            fetched_at=cached.created_at
        )

    try:
        forecast = await fetch_weather_forecast(
            latitude=settings.WEATHER_LATITUDE,
            longitude=settings.WEATHER_LONGITUDE,
            location_name=settings.WEATHER_LOCATION_NAME
        )

        forecast_data = []
        for d in forecast.daily_forecasts:
            forecast_data.append({
                "date": d.date,
                "temp_max": d.temp_max,
                "temp_min": d.temp_min,
                "temp_avg": d.temp_avg,
                "humidity": d.humidity,
                "precipitation": d.precipitation,
                "weather_code": d.weather_code,
                "weather_desc": d.weather_desc
            })

        dates = [d.date for d in forecast.daily_forecasts if d.date]
        temps = [d.temp_avg for d in forecast.daily_forecasts]
        humidities = [d.humidity for d in forecast.daily_forecasts]
        precipitations = [d.precipitation for d in forecast.daily_forecasts]

        cache_entry = models.WeatherCache(
            location_name=forecast.location,
            latitude=forecast.latitude,
            longitude=forecast.longitude,
            forecast_data=forecast_data,
            forecast_start_date=dates[0] if dates else "",
            forecast_end_date=dates[-1] if dates else "",
            avg_temp=round(float(np.mean(temps)), 1) if temps else 0,
            avg_humidity=round(float(np.mean(humidities)), 1) if humidities else 0,
            total_precipitation=round(float(np.sum(precipitations)), 1) if precipitations else 0,
            hot_days_count=sum(1 for t in temps if t > HOT_THRESHOLD),
            cold_days_count=sum(1 for t in temps if t < COLD_THRESHOLD),
            rainy_days_count=sum(1 for p in precipitations if p > RAIN_THRESHOLD),
            source="api",
            expires_at=datetime.utcnow() + timedelta(hours=6)
        )
        db.add(cache_entry)
        await db.commit()

        logger.info(f"Weather data fetched and cached: {len(forecast.daily_forecasts)} days")
        return forecast

    except WeatherServiceError as e:
        logger.error(f"Weather service error: {e}")
        return None
    except Exception as e:
        logger.error(f"Unexpected error fetching weather: {e}")
        return None
