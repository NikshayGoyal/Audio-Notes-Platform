import io
import uuid
from unittest.mock import Mock, patch

import jwt
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.api import router
from app.config import Settings, get_settings
from app.database import Base, get_db
from app.main import app
from app.models import AudioNote, NoteStatus
from app.services.storage import get_storage

from sqlalchemy.pool import StaticPool

# Test database setup with SQLite in-memory with StaticPool to share connection
test_engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(bind=test_engine, autoflush=False, expire_on_commit=False)
Base.metadata.create_all(bind=test_engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


mock_storage = Mock()
app.dependency_overrides[get_db] = override_get_db
app.dependency_overrides[get_storage] = lambda: mock_storage

client = TestClient(app)


def test_auth_me_anonymous():
    response = client.get("/api/auth/me")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "anonymous"
    assert data["is_anonymous"] is True


def test_auth_me_guest_token():
    guest_id = "guest_test_abc123"
    response = client.get("/api/auth/me", headers={"Authorization": f"Bearer {guest_id}"})
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == guest_id
    assert data["is_anonymous"] is True


def test_auth_me_jwt_token():
    token = jwt.encode({"sub": "user_456", "email": "test@example.com"}, "a" * 32, algorithm="HS256")
    response = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "user_456"
    assert data["email"] == "test@example.com"
    assert data["is_anonymous"] is False


def test_user_isolation_create_and_list():
    wav_header = b"RIFF" + b"\x24\x00\x00\x00" + b"WAVE" + b"fmt \x10\x00\x00\x00" + b"\x01\x00\x01\x00\x44\xac\x00\x00"
    file_bytes = wav_header + b"\x00" * 100

    # User A creates a note
    headers_a = {"Authorization": "Bearer guest_user_A"}
    response_a = client.post(
        "/api/notes",
        headers=headers_a,
        files={"audio": ("sample_a.wav", file_bytes, "audio/wav")},
        data={"title": "Note by User A"},
    )
    assert response_a.status_code == 202
    note_a = response_a.json()
    assert note_a["user_id"] == "guest_user_A"
    assert note_a["title"] == "Note by User A"

    # User B creates a note
    headers_b = {"Authorization": "Bearer guest_user_B"}
    response_b = client.post(
        "/api/notes",
        headers=headers_b,
        files={"audio": ("sample_b.wav", file_bytes, "audio/wav")},
        data={"title": "Note by User B"},
    )
    assert response_b.status_code == 202
    note_b = response_b.json()
    assert note_b["user_id"] == "guest_user_B"

    # User A lists notes - should only see Note A
    list_a = client.get("/api/notes", headers=headers_a).json()
    assert any(n["id"] == note_a["id"] for n in list_a)
    assert not any(n["id"] == note_b["id"] for n in list_a)

    # User B lists notes - should only see Note B
    list_b = client.get("/api/notes", headers=headers_b).json()
    assert any(n["id"] == note_b["id"] for n in list_b)
    assert not any(n["id"] == note_a["id"] for n in list_b)

    # User B cannot access User A's note detail
    forbidden = client.get(f"/api/notes/{note_a['id']}", headers=headers_b)
    assert forbidden.status_code == 404

    # User A can rename their note and update structured data (e.g. action item completion)
    structured_payload = {
        "title": "Renamed Title A",
        "structured_data": {
            "title": "Renamed Title A",
            "overview": "Overview text",
            "key_points": ["Point 1"],
            "action_items": [{"task": "Review PR", "completed": True, "priority": "high"}],
        },
    }
    rename_resp = client.patch(
        f"/api/notes/{note_a['id']}",
        headers=headers_a,
        json=structured_payload,
    )
    assert rename_resp.status_code == 200
    updated_data = rename_resp.json()
    assert updated_data["title"] == "Renamed Title A"
    assert updated_data["structured_data"]["action_items"][0]["completed"] is True

    # User B cannot rename User A's note
    bad_rename = client.patch(
        f"/api/notes/{note_a['id']}",
        headers=headers_b,
        json={"title": "Hacked Title"},
    )
    assert bad_rename.status_code == 404

    # User B cannot delete User A's note
    bad_delete = client.delete(f"/api/notes/{note_a['id']}", headers=headers_b)
    assert bad_delete.status_code == 404

    # User A can delete their note
    del_resp = client.delete(f"/api/notes/{note_a['id']}", headers=headers_a)
    assert del_resp.status_code == 200
    assert del_resp.json()["status"] == "deleted"

    # Note is now gone
    after_del = client.get(f"/api/notes/{note_a['id']}", headers=headers_a)
    assert after_del.status_code == 404
