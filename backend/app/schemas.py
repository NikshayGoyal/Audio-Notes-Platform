import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class NoteRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    original_filename: str
    media_type: str
    size_bytes: int
    status: str
    source_language: str
    summary_language: str
    detected_language: str | None
    detected_language_name: str | None
    is_code_switched: bool | None
    transcript: str | None
    summary: str | None
    error_code: str | None
    error_message: str | None
    attempt_count: int
    created_at: datetime
    updated_at: datetime
    completed_at: datetime | None


class NoteListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    original_filename: str
    size_bytes: int
    status: str
    source_language: str
    summary_language: str
    detected_language_name: str | None
    error_message: str | None
    created_at: datetime
    updated_at: datetime


class HealthResponse(BaseModel):
    status: str


class LanguageOption(BaseModel):
    code: str
    name: str


class RetryRequest(BaseModel):
    source_language: str | None = None
    summary_language: str | None = None
