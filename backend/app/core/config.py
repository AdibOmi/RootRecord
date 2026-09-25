from functools import lru_cache
from typing import Annotated, Literal

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

DEV_JWT_SECRET = "dev-only-insecure-secret-change-me"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: Literal["development", "test", "production"] = "development"

    database_url: str = "postgresql+psycopg://rootrecord:rootrecord@db:5432/rootrecord"
    test_database_url: str = (
        "postgresql+psycopg://rootrecord:rootrecord@db:5432/rootrecord_test"
    )

    jwt_secret: str = DEV_JWT_SECRET
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = 15
    refresh_token_days: int = 7
    cookie_secure: bool = False

    cors_origins: Annotated[list[str], NoDecode] = []
    storage_dir: str = "/data/uploads"

    bootstrap_admin_email: str = "admin@rootrecord.app"
    bootstrap_admin_password: str = "Admin@12345"
    bootstrap_admin_name: str = "Clinic Admin"

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_origins(cls, value: object) -> object:
        if isinstance(value, str):
            return [o.strip() for o in value.split(",") if o.strip()]
        return value

    @model_validator(mode="after")
    def _require_real_secret_in_production(self) -> "Settings":
        if self.environment == "production" and self.jwt_secret == DEV_JWT_SECRET:
            raise ValueError("JWT_SECRET must be set in production")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
