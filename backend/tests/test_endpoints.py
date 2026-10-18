import uuid
from unittest.mock import Mock, patch

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db, get_session_factory
from app.main import app
from app.models import AudioNote, NoteStatus
from app.services.gemini import get_gemini_service
from app.services.storage import get_storage

# StaticPool ensures all threads share a single SQLite in-memory connection.
engine = create_engine(
    "sqlite+pysqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
Base.metadata.create_all(engine)
session_factory_fixture = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_test_db():
    with session_factory_fixture() as session:
        yield session


mock_gemini = Mock()
mock_gemini.answer_question.return_value = "The team decided to ship SQLite and Next.js."
mock_gemini.answer_global_question.return_value = "Across your meetings, the team decided to adopt pgvector and launch Monday."

app.dependency_overrides[get_db] = get_test_db
app.dependency_overrides[get_session_factory] = lambda: session_factory_fixture
app.dependency_overrides[get_gemini_service] = lambda: mock_gemini
app.dependency_overrides[get_storage] = lambda: Mock()
client = TestClient(app)


def _clear():
    with Session(engine) as db:
        db.query(AudioNote).delete()
        db.commit()


def _seed_note(
    *,
    user_id: str = "anonymous",
    filename: str = "meeting.mp3",
    status: str = NoteStatus.QUEUED.value,
    transcript: str | None = None,
    summary: str | None = None,
    error_code: str | None = None,
    error_message: str | None = None,
) -> AudioNote:
    with Session(engine, expire_on_commit=False) as db:
        note = AudioNote(
            user_id=user_id,
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


def test_list_notes_search_query_matches_transcript_and_returns_snippet() -> None:
    _clear()
    _seed_note(
        filename="meeting1.mp3",
        transcript="The engineering team decided to migrate our cache to Redis cluster.",
    )
    _seed_note(
        filename="meeting2.mp3",
        transcript="Discussing UI styling and color tokens with marketing.",
    )

    response = client.get("/api/notes?q=Redis")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["original_filename"] == "meeting1.mp3"
    assert "snippet" in data[0]
    assert "Redis" in data[0]["snippet"]


def test_list_notes_search_query_no_match() -> None:
    _clear()
    _seed_note(filename="meeting1.mp3", transcript="General sync.")
    response = client.get("/api/notes?q=KubernetesClusterNotMentioned")
    assert response.status_code == 200
    assert response.json() == []


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


# --- Real-Time SSE Streaming ---


def test_stream_note_events_completed() -> None:
    _clear()
    note = _seed_note(
        status=NoteStatus.COMPLETED.value,
        transcript="Test transcript",
        summary="Test summary",
    )

    response = client.get(f"/api/notes/{note.id}/stream")
    assert response.status_code == 200
    assert "text/event-stream" in response.headers["content-type"]
    content = response.text
    assert "event: note_update" in content
    assert "event: complete" in content
    assert str(note.id) in content


def test_stream_note_events_not_found() -> None:
    response = client.get(f"/api/notes/{uuid.uuid4()}/stream")
    assert response.status_code == 404


def test_stream_note_events_with_token_query() -> None:
    _clear()
    note = _seed_note(status=NoteStatus.FAILED.value, user_id="guest_user123")
    response = client.get(f"/api/notes/{note.id}/stream?token=guest_user123")
    assert response.status_code == 200
    assert "event: complete" in response.text


# --- "Ask AI" Conversational Q&A ---


def test_chat_with_note_success() -> None:
    _clear()
    note = _seed_note(
        status=NoteStatus.COMPLETED.value,
        transcript="We decided to launch the feature on Monday.",
    )

    response = client.post(
        f"/api/notes/{note.id}/chat",
        json={"message": "What did the team decide?"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "reply" in data
    assert "SQLite and Next.js" in data["reply"]


def test_chat_with_note_missing_transcript() -> None:
    _clear()
    note = _seed_note(
        status=NoteStatus.QUEUED.value,
        transcript=None,
    )

    response = client.post(
        f"/api/notes/{note.id}/chat",
        json={"message": "What happened?"},
    )
    assert response.status_code == 400
    assert "Transcript is not yet available" in response.json()["detail"]


def test_chat_with_note_empty_message() -> None:
    _clear()
    note = _seed_note(
        status=NoteStatus.COMPLETED.value,
        transcript="Some meeting content.",
    )

    response = client.post(
        f"/api/notes/{note.id}/chat",
        json={"message": "   "},
    )
    assert response.status_code == 422


# --- Global Library Knowledge Base Q&A ---


def test_chat_with_library_success() -> None:
    _clear()
    note1 = _seed_note(
        status=NoteStatus.COMPLETED.value,
        filename="sprint1.mp3",
        transcript="Discussed database migration to pgvector.",
    )
    note2 = _seed_note(
        status=NoteStatus.COMPLETED.value,
        filename="sprint2.mp3",
        transcript="Discussed launching product on Monday.",
    )

    response = client.post(
        "/api/chat",
        json={"message": "What decisions were made across our meetings?"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "reply" in data
    assert "Across your meetings" in data["reply"]
    assert len(data["sources"]) == 2
    source_ids = [s["note_id"] for s in data["sources"]]
    assert str(note1.id) in source_ids
    assert str(note2.id) in source_ids


def test_chat_with_library_no_notes() -> None:
    _clear()
    response = client.post(
        "/api/chat",
        json={"message": "What did we decide?"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "don't have any completed audio notes" in data["reply"]
    assert data["sources"] == []


def test_chat_with_library_empty_message() -> None:
    _clear()
    response = client.post(
        "/api/chat",
        json={"message": "    "},
    )
    assert response.status_code == 422


def test_chat_with_library_tenant_isolation() -> None:
    _clear()
    _seed_note(
        user_id="guest_alice",
        status=NoteStatus.COMPLETED.value,
        transcript="Alice confidential roadmap.",
    )
    _seed_note(
        user_id="guest_bob",
        status=NoteStatus.COMPLETED.value,
        transcript="Bob secret project.",
    )

    response = client.post(
        "/api/chat",
        headers={"Authorization": "Bearer guest_alice"},
        json={"message": "What is the roadmap?"},
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["sources"]) == 1

