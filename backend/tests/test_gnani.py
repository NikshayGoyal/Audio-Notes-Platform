from types import SimpleNamespace
from unittest.mock import Mock, patch

import pytest

from app.services.errors import ProcessingError
from app.services.gnani import GnaniService


SETTINGS = SimpleNamespace(
    gnani_api_key="test-key",
    gnani_api_url="https://example.test/stt",
    gnani_request_timeout_seconds=30,
)


@patch("app.services.gnani.get_settings", return_value=SETTINGS)
@patch("app.services.gnani.httpx.post")
def test_transcribe_sends_language_and_returns_clean_transcript(
    post: Mock, _settings: Mock, tmp_path
) -> None:
    audio = tmp_path / "sample.mp3"
    audio.write_bytes(b"ID3 audio")
    post.return_value.status_code = 200
    post.return_value.json.return_value = {"success": True, "transcript": "  Hello world  "}

    transcript = GnaniService().transcribe(audio, "audio/mpeg", "en-IN")

    assert transcript == "Hello world"
    call = post.call_args
    assert call.kwargs["headers"] == {"X-API-Key-ID": "test-key"}
    assert call.kwargs["data"]["language_code"] == "en-IN"
    assert call.kwargs["data"]["preferred_language"] == "en-IN"


@patch("app.services.gnani.get_settings", return_value=SETTINGS)
@patch("app.services.gnani.httpx.post")
def test_transcribe_rejects_empty_provider_result(post: Mock, _settings: Mock, tmp_path) -> None:
    audio = tmp_path / "sample.mp3"
    audio.write_bytes(b"ID3 audio")
    post.return_value.status_code = 200
    post.return_value.json.return_value = {"success": True, "transcript": ""}

    with pytest.raises(ProcessingError) as caught:
        GnaniService().transcribe(audio, "audio/mpeg", "en-IN")

    assert caught.value.code == "gnani_empty_transcript"
    assert caught.value.retryable is False
