from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=("../.env", ".env"), extra="ignore")

    app_name: str = "Audio Notes API"
    environment: str = "development"
    local_development_mode: bool = False
    local_storage_path: str = "../work/local-storage"
    database_url: str = "postgresql+psycopg://audio_notes:audio_notes@localhost:5432/audio_notes"
    redis_url: str = "redis://localhost:6379/0"
    cors_origins: str = "http://localhost:3000"

    storage_endpoint_url: str | None = "http://localhost:9000"
    storage_region: str = "us-east-1"
    storage_bucket: str = "audio-notes"
    storage_access_key: str = "minioadmin"
    storage_secret_key: str = "minioadmin"
    storage_force_path_style: bool = True

    gemini_api_key: str | None = None
    gemini_detection_model: str = "gemini-3.5-flash-lite"
    gemini_summary_model: str = "gemini-3.5-flash-lite"
    gemini_request_timeout_ms: int = Field(default=300_000, ge=1_000)

    gnani_api_key: str | None = None
    gnani_api_url: str = "https://api.vachana.ai/stt/v3"
    gnani_request_timeout_seconds: int = Field(default=300, ge=10)

    max_upload_bytes: int = Field(default=100 * 1024 * 1024, ge=1)
    upload_chunk_bytes: int = Field(default=1024 * 1024, ge=64 * 1024)
    task_max_retries: int = Field(default=2, ge=0, le=10)

    @property
    def allowed_origins(self) -> list[str]:
        return [value.strip() for value in self.cors_origins.split(",") if value.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
