from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite+aiosqlite:///./energy_monitor.db"
    SECRET_KEY: str = "your-secret-key-here-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    WEATHER_PROVIDER: str = "mock"
    WEATHER_API_KEY: str = ""
    WEATHER_LATITUDE: float = 39.9042
    WEATHER_LONGITUDE: float = 116.4074
    WEATHER_LOCATION_NAME: str = "北京"

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings():
    return Settings()
