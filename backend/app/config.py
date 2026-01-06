from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    app_name: str = "Release Tracker"
    debug: bool = False

    # Database (SQLite for development, PostgreSQL for production)
    database_url: str = "sqlite+aiosqlite:///./release_tracker.db"
    database_url_sync: str = "sqlite:///./release_tracker.db"

    # API
    api_prefix: str = "/api"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    return Settings()
