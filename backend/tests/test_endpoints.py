import uuid
from unittest.mock import Mock, patch

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models import AudioNote, NoteStatus
from app.services.storage import get_storage

# StaticPool ensures all threads share a single SQLite in-memory connection.
engine = create_engine(
    "sqlite+pysqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
Base.metadata.create_all(engine)


def get_test_db():
    with Session(engine, expire_on_commit=False) as session:
        yield session


app.dependency_overrides[get_db] = get_test_db
app.dependency_overrides[get_storage] = lambda: Mock()
client = TestClient(app)


def _clear():
    with Session(engine) as db:
        db.query(AudioNote).delete()
        db.commit()


def _seed_note(
    *,
    filename: str = "meeting.mp3",
    status: str = NoteStatus.QUEUED.value,
    transcript: str | None = None,
    summary: str | None = None,
    error_code: str | None = None,
    error_message: str | None = None,
) -> AudioNote:
    with Session(engine, expire_on_commit=False) as db:
        note = AudioNote(
            original_filename=filename,
            media_type="audio/mpeg",
            size_bytes=1024,
            storage_key=f"uploads/{uuid.uuid4()}.mp3",
            status=status,
            source_language="auto",
            summary_language="same",
            transcript=transcript,
            summary=summary,
            error_code=error_code,
            error_message=error_message,
            attempt_count=1 if status != NoteStatus.QUEUED.value else 0,
        )
        db.add(note)
        db.commit()
        db.refresh(note)
    return note


# --- GET /api/notes ---


def test_list_notes_returns_empty_when_no_notes() -> None:
    _clear()
    response = client.get("/api/notes")
    assert response.status_code == 200
    assert response.json() == []


def test_list_notes_returns_notes_newest_first() -> None:
    _clear()
    _seed_note(filename="older.mp3")
    _seed_note(filename="newer.mp3")

    response = client.get("/api/notes")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["original_filename"] == "newer.mp3"
    assert data[1]["original_filename"] == "older.mp3"


def test_list_notes_respects_limit_parameter() -> None:
    _clear()
    for i in range(5):
        _seed_note(filename=f"note_{i}.mp3")

    response = client.get("/api/notes?limit=3")
    assert response.status_code == 200
    assert len(response.json()) == 3


def test_list_notes_excludes_transcript_and_summary() -> None:
    _clear()
    _seed_note(
        status=NoteStatus.COMPLETED.value,
        transcript="Full transcript text",
        summary="Summary text",
    )

    response = client.get("/api/notes")
    data = response.json()
    assert len(data) == 1
    assert "transcript" not in data[0]
    assert "summary" not in data[0]


# --- GET /api/notes/{id} ---


def test_get_note_returns_full_detail() -> None:
    _clear()
    note = _seed_note(
        filename="detail.mp3",
        status=NoteStatus.COMPLETED.value,
        transcript="Hello world transcript",
        summary="Hello world summary",
    )

    response = client.get(f"/api/notes/{note.id}")
    assert response.status_code == 200
    data = response.json()
    assert data["original_filename"] == "detail.mp3"
    assert data["status"] == "completed"
    assert data["transcript"] == "Hello world transcript"
    assert data["summary"] == "Hello world summary"


def test_get_note_returns_404_for_unknown_id() -> None:
    response = client.get(f"/api/notes/{uuid.uuid4()}")
    assert response.status_code == 404
    assert response.json()["detail"] == "Audio note not found"


# --- POST /api/notes/{id}/retry ---


@patch("app.api.enqueue_audio_note")
def test_retry_failed_note_requeues(mock_enqueue: Mock) -> None:
    _clear()
    note = _seed_note(
        status=NoteStatus.FAILED.value,
        error_code="transcription_failed",
        error_message="Gnani API timed out",
    )

    response = client.post(f"/api/notes/{note.id}/retry")
    assert response.status_code == 202
    data = response.json()
    assert data["status"] == "queued"
    assert data["error_code"] is None
    assert data["error_message"] is None
    mock_enqueue.assert_called_once_with(str(note.id))


def test_retry_queued_note_returns_409() -> None:
    _clear()
    note = _seed_note(status=NoteStatus.QUEUED.value)

    response = client.post(f"/api/notes/{note.id}/retry")
    assert response.status_code == 409


@patch("app.api.enqueue_audio_note")
def test_retry_completed_note_with_language_override(mock_enqueue: Mock) -> None:
    _clear()
    note = _seed_note(
        status=NoteStatus.COMPLETED.value,
        transcript="Existing transcript",
        summary="Existing summary",
    )

    response = client.post(
        f"/api/notes/{note.id}/retry",
        json={"summary_language": "hi-IN"},
    )
    assert response.status_code == 202
    data = response.json()
    assert data["status"] == "queued"
    assert data["summary_language"] == "hi-IN"
    assert data["summary"] is None  # cleared for re-summarization
    mock_enqueue.assert_called_once_with(str(note.id))


def test_retry_completed_note_without_override_returns_409() -> None:
    _clear()
    note = _seed_note(
        status=NoteStatus.COMPLETED.value,
        transcript="Done",
        summary="Done",
    )

    response = client.post(f"/api/notes/{note.id}/retry")
    assert response.status_code == 409


def test_retry_unknown_note_returns_404() -> None:
    response = client.post(f"/api/notes/{uuid.uuid4()}/retry")
    assert response.status_code == 404


def test_retry_with_invalid_language_returns_422() -> None:
    _clear()
    note = _seed_note(status=NoteStatus.FAILED.value)

    response = client.post(
        f"/api/notes/{note.id}/retry",
        json={"source_language": "xx-FAKE"},
    )
    assert response.status_code == 422


# --- GET /api/ready ---


def test_ready_endpoint() -> None:
    response = client.get("/api/ready")
    assert response.status_code == 200
    assert response.json()["status"] == "ready"
