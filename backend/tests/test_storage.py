"""Tests for ObjectStorage local filesystem backend."""

import io
from pathlib import Path
from unittest.mock import patch

import pytest

from app.services.storage import ObjectStorage


@pytest.fixture
def local_storage(tmp_path: Path):
    """Create an ObjectStorage using local filesystem mode."""
    mock_settings = type("S", (), {
        "local_development_mode": True,
        "local_storage_path": str(tmp_path / "store"),
        "storage_bucket": "test-bucket",
        "storage_endpoint_url": "",
        "storage_region": "us-east-1",
        "storage_access_key": "",
        "storage_secret_key": "",
        "storage_force_path_style": True,
    })()
    with patch("app.services.storage.get_settings", return_value=mock_settings):
        storage = ObjectStorage()
    return storage


def test_upload_and_download_round_trip(local_storage: ObjectStorage) -> None:
    content = b"fake audio content for testing"
    stream = io.BytesIO(content)
    local_storage.upload(stream, "uploads/test.mp3", "audio/mpeg")

    result = io.BytesIO()
    local_storage.download("uploads/test.mp3", result)
    result.seek(0)
    assert result.read() == content


def test_delete_removes_file(local_storage: ObjectStorage) -> None:
    stream = io.BytesIO(b"delete me")
    local_storage.upload(stream, "uploads/deletable.mp3", "audio/mpeg")

    local_storage.delete("uploads/deletable.mp3")

    result = io.BytesIO()
    with pytest.raises(FileNotFoundError):
        local_storage.download("uploads/deletable.mp3", result)


def test_delete_missing_file_is_safe(local_storage: ObjectStorage) -> None:
    # Should not raise
    local_storage.delete("uploads/nonexistent.mp3")


def test_path_traversal_is_blocked(local_storage: ObjectStorage) -> None:
    with pytest.raises(ValueError, match="Invalid storage key"):
        local_storage.upload(io.BytesIO(b"evil"), "../../etc/passwd", "text/plain")


def test_upload_creates_nested_directories(local_storage: ObjectStorage) -> None:
    stream = io.BytesIO(b"nested content")
    local_storage.upload(stream, "uploads/deep/nested/file.mp3", "audio/mpeg")

    result = io.BytesIO()
    local_storage.download("uploads/deep/nested/file.mp3", result)
    result.seek(0)
    assert result.read() == b"nested content"
