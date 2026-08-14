from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: str = "development"
    database_url: str = "postgresql+asyncpg://sos:sos_local_only@localhost:5432/sos"
    jwt_secret: str = "local-development-secret-change-before-production-2026"
    access_token_minutes: int = 20
    data_encryption_key: str = "local-only-data-encryption-key-change-in-production"
    allowed_origins: list[str] = Field(default=["http://localhost:5173"])


@lru_cache
def get_settings() -> Settings:
    return Settings()
