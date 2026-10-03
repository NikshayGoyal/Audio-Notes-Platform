from unittest.mock import Mock

from fastapi.testclient import TestClient

from app.database import get_db
from app.main import app
from app.services.storage import get_storage


def fake_db():
    yield Mock()


app.dependency_overrides[get_db] = fake_db
app.dependency_overrides[get_storage] = lambda: Mock()
client = TestClient(app)


def test_health() -> None:
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_languages_exposes_supported_catalog() -> None:
    response = client.get("/api/languages")
    assert response.status_code == 200
    assert {item["code"] for item in response.json()} >= {"en-IN", "hi-IN", "kn-IN"}


def test_upload_rejects_unsupported_content_type_before_storage() -> None:
    response = client.post("/api/notes", files={"audio": ("notes.txt", b"not audio", "text/plain")})
    assert response.status_code == 415
    assert response.json()["detail"] == "Unsupported audio format"


def test_upload_rejects_empty_audio() -> None:
    response = client.post("/api/notes", files={"audio": ("empty.mp3", b"", "audio/mpeg")})
    assert response.status_code == 400
    assert response.json()["detail"] == "Audio file is empty"


def test_upload_rejects_disguised_non_audio_content() -> None:
    response = client.post(
        "/api/notes", files={"audio": ("fake.mp3", b"plain text in disguise", "audio/mpeg")}
    )
    assert response.status_code == 415
    assert response.json()["detail"] == "File contents do not match a supported audio format"
