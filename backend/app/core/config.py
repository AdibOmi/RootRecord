from functools import lru_cache
from typing import Annotated, Literal

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

DEV_JWT_SECRET = "dev-only-insecure-secret-change-me"

ThinkingLevel = Literal["minimal", "low", "medium", "high"]


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
    max_upload_mb: int = 15

    # Prescription photo extraction (Gemini vision, free tier). Without a key,
    # scans are still saved and the dentist fills the record in by hand.
    gemini_api_key: str | None = None
    gemini_model: str = "gemini-3.6-flash"
    # Model for the quick read of the patient's name and phone while the assistant
    # waits at the counter. Empty: use gemini_model. A "-lite" model is faster.
    gemini_header_model: str | None = None
    # How much the model "thinks" before answering. Lower is faster. Gemini 3 models
    # take minimal / low / medium / high; leave empty for older models (2.x).
    gemini_thinking_level: ThinkingLevel | None = "low"
    gemini_header_thinking_level: ThinkingLevel | None = "minimal"

    # Printed at the top of prescription PDFs shared with patients.
    clinic_name: str = "Dental Clinic"
    clinic_address: str | None = None
    clinic_phone: str | None = None

    bootstrap_admin_email: str = "admin@rootrecord.app"
    bootstrap_admin_password: str = "Admin@12345"
    bootstrap_admin_name: str = "Clinic Admin"

    @field_validator(
        "gemini_header_model", "gemini_thinking_level", "gemini_header_thinking_level", mode="before"
    )
    @classmethod
    def _blank_is_none(cls, value: object) -> object:
        return None if isinstance(value, str) and not value.strip() else value

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
