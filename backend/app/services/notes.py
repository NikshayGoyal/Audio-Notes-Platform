import os
import tempfile
import uuid
from datetime import UTC, datetime
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import AudioNote, NoteStatus
from app.languages import AUTO_LANGUAGE, SAME_LANGUAGE, language_name
from app.services.gemini import GeminiService
from app.services.gnani import GnaniService
from app.services.audio_validation import SUFFIX_BY_MEDIA_TYPE
from app.services.storage import get_storage


def get_note(db: Session, note_id: uuid.UUID) -> AudioNote | None:
    return db.get(AudioNote, note_id)


def list_notes(db: Session, *, limit: int = 50) -> list[AudioNote]:
    statement = select(AudioNote).order_by(AudioNote.created_at.desc()).limit(limit)
    return list(db.scalars(statement))


def transition(db: Session, note: AudioNote, status: NoteStatus) -> None:
    note.status = status.value
    note.updated_at = datetime.now(UTC)
    db.commit()


def process_note(db: Session, note: AudioNote) -> None:
    note.attempt_count += 1
    note.error_code = None
    note.error_message = None
    gemini = GeminiService()
    if not note.transcript:
        storage = get_storage()
        suffix = SUFFIX_BY_MEDIA_TYPE.get(note.media_type, ".audio")
        descriptor, temporary_name = tempfile.mkstemp(suffix=suffix)
        os.close(descriptor)
        temporary_path = Path(temporary_name)
        try:
            with temporary_path.open("wb") as temp_audio:
                storage.download(note.storage_key, temp_audio)
            if not note.detected_language:
                if note.source_language == AUTO_LANGUAGE:
                    transition(db, note, NoteStatus.DETECTING_LANGUAGE)
                    detection = gemini.detect_language(temporary_path, note.media_type)
                    note.detected_language = detection.language_code
                    note.detected_language_name = detection.language_name
                    note.is_code_switched = detection.is_code_switched
                else:
                    note.detected_language = note.source_language
                    note.detected_language_name = language_name(note.source_language)
                    note.is_code_switched = None
            transition(db, note, NoteStatus.TRANSCRIBING)
            note.transcript = GnaniService().transcribe(
                temporary_path,
                note.media_type,
                note.detected_language,
            )
        finally:
            temporary_path.unlink(missing_ok=True)
    transition(db, note, NoteStatus.SUMMARIZING)
    output_code = (
        note.detected_language if note.summary_language == SAME_LANGUAGE else note.summary_language
    )
    note.summary = gemini.summarize(note.transcript, language_name(output_code))

    note.status = NoteStatus.COMPLETED.value
    note.completed_at = datetime.now(UTC)
    note.updated_at = datetime.now(UTC)
    db.commit()
