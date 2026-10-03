from datetime import UTC, datetime, timedelta

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.database import Base
from app.models import AudioNote, NoteStatus
from app.services.notes import get_note, list_notes, transition


def make_note(filename: str, created_at: datetime) -> AudioNote:
    return AudioNote(
        original_filename=filename,
        media_type="audio/mpeg",
        size_bytes=100,
        storage_key=f"uploads/{filename}",
        status=NoteStatus.QUEUED.value,
        created_at=created_at,
        updated_at=created_at,
        attempt_count=0,
    )


def test_note_round_trip_ordering_and_status_transition() -> None:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    now = datetime.now(UTC)

    with Session(engine, expire_on_commit=False) as db:
        older = make_note("older.mp3", now - timedelta(minutes=1))
        newer = make_note("newer.mp3", now)
        db.add_all([older, newer])
        db.commit()

        assert [note.original_filename for note in list_notes(db)] == ["newer.mp3", "older.mp3"]
        assert get_note(db, older.id) is older

        transition(db, older, NoteStatus.TRANSCRIBING)
        assert older.status == NoteStatus.TRANSCRIBING.value
        assert older.updated_at >= now
