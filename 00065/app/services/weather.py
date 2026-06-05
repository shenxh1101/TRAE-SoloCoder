import httpx
import logging
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from dataclasses import dataclass, field
from ..config import get_settings

logger = logging.getLogger(__name__)


@dataclass
class DailyWeather:
    date: str
    temp_max: float
    temp_min: float
    temp_avg: float
    humidity: float
    precipitation: float
    weather_code: str
    weather_desc: str


@dataclass
class WeatherForecast:
    location: str
    latitude: float
    longitude: float
    daily_forecasts: List[DailyWeather] = field(default_factory=list)
    fetched_at: datetime = field(default_factory=datetime.utcnow)


class WeatherServiceError(Exception):
    pass


class BaseWeatherProvider:
    async def get_30day_forecast(
        self,
        latitude: float,
        longitude: float,
        location_name: str = ""
    ) -> WeatherForecast:
        raise NotImplementedError


class QWeatherProvider(BaseWeatherProvider):
    BASE_URL = "https://devapi.qweather.com/v7"

    def __init__(self, api_key: str):
        self.api_key = api_key

    async def get_30day_forecast(
        self,
        latitude: float,
        longitude: float,
        location_name: str = ""
    ) -> WeatherForecast:
        forecasts = []

        async with httpx.AsyncClient(timeout=15.0) as client:
            location = f"{longitude},{latitude}"

            try:
                resp = await client.get(
                    f"{self.BASE_URL}/weather/7d",
                    params={"location": location, "key": self.api_key, "lang": "zh"}
                )
                resp.raise_for_status()
                data = resp.json()

                if data.get("code") != "200":
                    logger.warning(f"QWeather 7d API error: {data.get('code')}")
                else:
                    for day in data.get("daily", []):
                        forecasts.append(DailyWeather(
                            date=day.get("fxDate", ""),
                            temp_max=float(day.get("tempMax", 0)),
                            temp_min=float(day.get("tempMin", 0)),
                            temp_avg=(float(day.get("tempMax", 0)) + float(day.get("tempMin", 0))) / 2,
                            humidity=float(day.get("humidity", 50)),
                            precipitation=float(day.get("precip", 0) or 0),
                            weather_code=day.get("iconDay", "100"),
                            weather_desc=day.get("textDay", "晴")
                        ))
            except Exception as e:
                logger.error(f"QWeather 7d fetch failed: {e}")

            try:
                resp = await client.get(
                    f"{self.BASE_URL}/weather/15d",
                    params={"location": location, "key": self.api_key, "lang": "zh"}
                )
                resp.raise_for_status()
                data = resp.json()

                if data.get("code") != "200":
                    logger.warning(f"QWeather 15d API error: {data.get('code')}")
                else:
                    existing_dates = {f.date for f in forecasts}
                    for day in data.get("daily", []):
                        if day.get("fxDate") not in existing_dates:
                            forecasts.append(DailyWeather(
                                date=day.get("fxDate", ""),
                                temp_max=float(day.get("tempMax", 0)),
                                temp_min=float(day.get("tempMin", 0)),
                                temp_avg=(float(day.get("tempMax", 0)) + float(day.get("tempMin", 0))) / 2,
                                humidity=float(day.get("humidity", 50)),
                                precipitation=float(day.get("precip", 0) or 0),
                                weather_code=day.get("iconDay", "100"),
                                weather_desc=day.get("textDay", "晴")
                            ))
            except Exception as e:
                logger.error(f"QWeather 15d fetch failed: {e}")

        forecasts.sort(key=lambda x: x.date)

        if len(forecasts) < 30:
            last_real = forecasts[-1] if forecasts else DailyWeather(
                date=datetime.utcnow().strftime("%Y-%m-%d"),
                temp_max=25, temp_min=15, temp_avg=20,
                humidity=50, precipitation=0, weather_code="100", weather_desc="晴"
            )
            last_date = datetime.strptime(last_real.date, "%Y-%m-%d")
            for i in range(1, 31 - len(forecasts)):
                future_date = last_date + timedelta(days=i)
                month = future_date.month
                seasonal_adjust = {
                    1: -8, 2: -5, 3: 0, 4: 5, 5: 10, 6: 14,
                    7: 16, 8: 15, 9: 10, 10: 4, 11: -2, 12: -7
                }
                adj = seasonal_adjust.get(month, 0)
                forecasts.append(DailyWeather(
                    date=future_date.strftime("%Y-%m-%d"),
                    temp_max=last_real.temp_max + adj * 0.3,
                    temp_min=last_real.temp_min + adj * 0.3,
                    temp_avg=last_real.temp_avg + adj * 0.3,
                    humidity=max(20, min(95, last_real.humidity + (5 if month in [6, 7, 8] else -5))),
                    precipitation=last_real.precipitation * (1.5 if month in [6, 7, 8] else 0.7),
                    weather_code="100",
                    weather_desc="预测数据"
                ))

        return WeatherForecast(
            location=location_name or f"{latitude},{longitude}",
            latitude=latitude,
            longitude=longitude,
            daily_forecasts=forecasts[:30],
            fetched_at=datetime.utcnow()
        )


class OpenWeatherMapProvider(BaseWeatherProvider):
    BASE_URL = "https://api.openweathermap.org/data/2.5"

    def __init__(self, api_key: str):
        self.api_key = api_key

    async def get_30day_forecast(
        self,
        latitude: float,
        longitude: float,
        location_name: str = ""
    ) -> WeatherForecast:
        forecasts = []

        async with httpx.AsyncClient(timeout=15.0) as client:
            try:
                resp = await client.get(
                    f"{self.BASE_URL}/forecast",
                    params={
                        "lat": latitude, "lon": longitude,
                        "appid": self.api_key, "units": "metric",
                        "cnt": 40
                    }
                )
                resp.raise_for_status()
                data = resp.json()

                daily_data: Dict[str, Dict[str, Any]] = {}
                for item in data.get("list", []):
                    dt_txt = item.get("dt_txt", "")[:10]
                    if dt_txt not in daily_data:
                        daily_data[dt_txt] = {
                            "temps": [],
                            "humidity": [],
                            "precipitation": 0,
                            "weather": item.get("weather", [{}])[0]
                        }
                    main = item.get("main", {})
                    daily_data[dt_txt]["temps"].append(main.get("temp", 20))
                    daily_data[dt_txt]["humidity"].append(main.get("humidity", 50))
                    rain = item.get("rain", {}).get("3h", 0)
                    daily_data[dt_txt]["precipitation"] += rain

                for date_str, day_info in sorted(daily_data.items()):
                    temps = day_info["temps"]
                    if not temps:
                        continue
                    temp_max = max(temps)
                    temp_min = min(temps)
                    temp_avg = sum(temps) / len(temps)
                    forecasts.append(DailyWeather(
                        date=date_str,
                        temp_max=round(temp_max, 1),
                        temp_min=round(temp_min, 1),
                        temp_avg=round(temp_avg, 1),
                        humidity=round(sum(day_info["humidity"]) / len(day_info["humidity"]), 1),
                        precipitation=round(day_info["precipitation"], 1),
                        weather_code=str(day_info["weather"].get("id", 800)),
                        weather_desc=day_info["weather"].get("description", "clear")
                    ))
            except Exception as e:
                logger.error(f"OpenWeatherMap forecast fetch failed: {e}")

            try:
                resp = await client.get(
                    f"{self.BASE_URL}/onecall",
                    params={
                        "lat": latitude, "lon": longitude,
                        "appid": self.api_key, "units": "metric",
                        "exclude": "minutely,hourly,alerts"
                    }
                )
                resp.raise_for_status()
                data = resp.json()

                existing_dates = {f.date for f in forecasts}
                for day in data.get("daily", []):
                    dt = datetime.utcfromtimestamp(day.get("dt", 0))
                    date_str = dt.strftime("%Y-%m-%d")
                    if date_str in existing_dates:
                        continue
                    temp = day.get("temp", {})
                    forecasts.append(DailyWeather(
                        date=date_str,
                        temp_max=round(temp.get("max", 25), 1),
                        temp_min=round(temp.get("min", 15), 1),
                        temp_avg=round(temp.get("day", 20), 1),
                        humidity=round(day.get("humidity", 50), 1),
                        precipitation=round(day.get("rain", 0) or 0, 1),
                        weather_code=str(day.get("weather", [{}])[0].get("id", 800)),
                        weather_desc=day.get("weather", [{}])[0].get("description", "clear")
                    ))
            except Exception as e:
                logger.error(f"OpenWeatherMap onecall fetch failed: {e}")

        forecasts.sort(key=lambda x: x.date)

        if len(forecasts) < 30:
            last_real = forecasts[-1] if forecasts else DailyWeather(
                date=datetime.utcnow().strftime("%Y-%m-%d"),
                temp_max=25, temp_min=15, temp_avg=20,
                humidity=50, precipitation=0, weather_code="800", weather_desc="clear"
            )
            last_date = datetime.strptime(last_real.date, "%Y-%m-%d")
            for i in range(1, 31 - len(forecasts)):
                future_date = last_date + timedelta(days=i)
                month = future_date.month
                seasonal_adjust = {
                    1: -8, 2: -5, 3: 0, 4: 5, 5: 10, 6: 14,
                    7: 16, 8: 15, 9: 10, 10: 4, 11: -2, 12: -7
                }
                adj = seasonal_adjust.get(month, 0)
                forecasts.append(DailyWeather(
                    date=future_date.strftime("%Y-%m-%d"),
                    temp_max=last_real.temp_max + adj * 0.3,
                    temp_min=last_real.temp_min + adj * 0.3,
                    temp_avg=last_real.temp_avg + adj * 0.3,
                    humidity=max(20, min(95, last_real.humidity + (5 if month in [6, 7, 8] else -5))),
                    precipitation=last_real.precipitation * (1.5 if month in [6, 7, 8] else 0.7),
                    weather_code="800",
                    weather_desc="forecast extrapolation"
                ))

        return WeatherForecast(
            location=location_name or f"{latitude},{longitude}",
            latitude=latitude,
            longitude=longitude,
            daily_forecasts=forecasts[:30],
            fetched_at=datetime.utcnow()
        )


class MockWeatherProvider(BaseWeatherProvider):
    async def get_30day_forecast(
        self,
        latitude: float,
        longitude: float,
        location_name: str = ""
    ) -> WeatherForecast:
        forecasts = []
        base_date = datetime.utcnow()

        seasonal_base_temp = {
            1: 2, 2: 5, 3: 12, 4: 18, 5: 24, 6: 28,
            7: 32, 8: 31, 9: 26, 10: 18, 11: 10, 12: 4
        }

        for i in range(30):
            future_date = base_date + timedelta(days=i)
            month = future_date.month
            base_temp = seasonal_base_temp.get(month, 20)

            import random
            temp_variation = random.uniform(-3, 3)
            temp_avg = base_temp + temp_variation
            temp_max = temp_avg + random.uniform(3, 8)
            temp_min = temp_avg - random.uniform(3, 8)

            is_rainy_season = month in [6, 7, 8]
            precipitation = random.uniform(0, 15) if is_rainy_season else random.uniform(0, 5)
            humidity = random.uniform(60, 90) if is_rainy_season else random.uniform(30, 70)

            forecasts.append(DailyWeather(
                date=future_date.strftime("%Y-%m-%d"),
                temp_max=round(temp_max, 1),
                temp_min=round(temp_min, 1),
                temp_avg=round(temp_avg, 1),
                humidity=round(humidity, 1),
                precipitation=round(precipitation, 1),
                weather_code="mock",
                weather_desc="模拟数据"
            ))

        return WeatherForecast(
            location=location_name or "模拟位置",
            latitude=latitude,
            longitude=longitude,
            daily_forecasts=forecasts,
            fetched_at=datetime.utcnow()
        )


def get_weather_provider() -> BaseWeatherProvider:
    settings = get_settings()
    provider = getattr(settings, "WEATHER_PROVIDER", "mock").lower()
    api_key = getattr(settings, "WEATHER_API_KEY", "")

    if provider == "qweather" and api_key:
        return QWeatherProvider(api_key)
    elif provider == "openweathermap" and api_key:
        return OpenWeatherMapProvider(api_key)
    else:
        if provider != "mock" and not api_key:
            logger.warning(f"Weather provider '{provider}' configured but no API key provided, falling back to mock")
        return MockWeatherProvider()


weather_service = get_weather_provider()


async def fetch_weather_forecast(
    latitude: float = 39.9042,
    longitude: float = 116.4074,
    location_name: str = "北京"
) -> WeatherForecast:
    return await weather_service.get_30day_forecast(latitude, longitude, location_name)
