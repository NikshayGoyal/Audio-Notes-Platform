import enum
import uuid
from datetime import datetime

from sqlalchemy import BigInteger, DateTime, Index, Integer, String, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class NoteStatus(str, enum.Enum):
    QUEUED = "queued"
    DETECTING_LANGUAGE = "detecting_language"
    TRANSCRIBING = "transcribing"
    SUMMARIZING = "summarizing"
    COMPLETED = "completed"
    FAILED = "failed"


class AudioNote(Base):
    __tablename__ = "audio_notes"
    __table_args__ = (Index("ix_audio_notes_created_at", "created_at"),)

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    original_filename: Mapped[str] = mapped_column(String(255))
    media_type: Mapped[str] = mapped_column(String(100))
    size_bytes: Mapped[int] = mapped_column(BigInteger)
    storage_key: Mapped[str] = mapped_column(String(500), unique=True)
    status: Mapped[str] = mapped_column(String(32), default=NoteStatus.QUEUED.value, index=True)
    source_language: Mapped[str] = mapped_column(String(16), default="auto")
    summary_language: Mapped[str] = mapped_column(String(16), default="same")
    detected_language: Mapped[str | None] = mapped_column(String(16), nullable=True)
    detected_language_name: Mapped[str | None] = mapped_column(String(80), nullable=True)
    is_code_switched: Mapped[bool | None] = mapped_column(nullable=True)
    transcript: Mapped[str | None] = mapped_column(Text, nullable=True)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    error_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    error_message: Mapped[str | None] = mapped_column(String(500), nullable=True)
    attempt_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
