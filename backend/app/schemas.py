import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class NoteRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: str
    title: str | None = None
    original_filename: str
    media_type: str
    size_bytes: int
    duration_seconds: float | None = None
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
    user_id: str
    title: str | None = None
    original_filename: str
    size_bytes: int
    duration_seconds: float | None = None
    status: str
    source_language: str
    summary_language: str
    detected_language_name: str | None
    error_message: str | None
    created_at: datetime
    updated_at: datetime


class NoteUpdate(BaseModel):
    title: str | None = None


class UserResponse(BaseModel):
    id: str
    email: str | None = None
    is_anonymous: bool = False


class HealthResponse(BaseModel):
    status: str


class LanguageOption(BaseModel):
    code: str
    name: str


class RetryRequest(BaseModel):
    source_language: str | None = None
    summary_language: str | None = None

