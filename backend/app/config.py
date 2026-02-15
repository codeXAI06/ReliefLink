"""
Application configuration using pydantic-settings
Reads from .env file and environment variables
"""
from pydantic_settings import BaseSettings
from functools import lru_cache
import os


class Settings(BaseSettings):
    """Application settings loaded from environment"""
    # Auth
    SECRET_KEY: str = "relieflink-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # Database
    DATABASE_URL: str = "sqlite:///./relieflink.db"

    # CORS
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173"

    # App
    DEBUG: bool = True
    APP_NAME: str = "ReliefLink API"
    APP_VERSION: str = "2.0.0"

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    class Config:
        env_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".env")
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
