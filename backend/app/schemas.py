from typing import Literal
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ActionItem(BaseModel):
    task: str
    owner: str | None = None
    priority: Literal["low", "medium", "high"] = "medium"
    completed: bool = False


class KeyDecision(BaseModel):
    decision: str
    rationale: str | None = None


class SpeakerTurn(BaseModel):
    speaker: str
    text: str


class StructuredSummary(BaseModel):
    title: str | None = None
    overview: str
    key_points: list[str] = []
    action_items: list[ActionItem] = []
    decisions: list[KeyDecision] = []
    topics: list[str] = []
    speakers: list[str] = []
    speaker_turns: list[SpeakerTurn] = []



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
    structured_data: dict | None = None
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
    snippet: str | None = None
    created_at: datetime
    updated_at: datetime


class NoteUpdate(BaseModel):
    title: str | None = None
    structured_data: dict | None = None


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


class NoteChatMessage(BaseModel):
    message: str


class NoteChatResponse(BaseModel):
    reply: str


class LibraryChatSource(BaseModel):
    note_id: uuid.UUID
    title: str
    created_at: datetime


class LibraryChatRequest(BaseModel):
    message: str


class LibraryChatResponse(BaseModel):
    reply: str
    sources: list[LibraryChatSource] = []


class ActionItemsAnalytics(BaseModel):
    total: int = 0
    completed: int = 0
    pending: int = 0
    completion_rate_pct: int = 0
    high_priority: int = 0
    medium_priority: int = 0
    low_priority: int = 0
    by_owner: dict[str, int] = {}


class TopicFrequency(BaseModel):
    topic: str
    count: int


class SpeakerFrequency(BaseModel):
    speaker: str
    count: int


class LanguageDistribution(BaseModel):
    language: str
    count: int


class RecentDecision(BaseModel):
    note_id: uuid.UUID
    note_title: str
    decision: str
    rationale: str | None = None


class AnalyticsResponse(BaseModel):
    total_notes: int = 0
    completed_notes: int = 0
    failed_notes: int = 0
    active_notes: int = 0
    total_duration_seconds: float = 0.0
    total_words: int = 0
    avg_words_per_minute: int = 0
    action_items: ActionItemsAnalytics = ActionItemsAnalytics()
    total_decisions: int = 0
    recent_decisions: list[RecentDecision] = []
    top_topics: list[TopicFrequency] = []
    top_speakers: list[SpeakerFrequency] = []
    languages: list[LanguageDistribution] = []
    code_switched_notes: int = 0


