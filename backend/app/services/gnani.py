from pathlib import Path

import httpx

from app.config import get_settings
from app.services.errors import ProcessingError


class GnaniService:
    def __init__(self) -> None:
        settings = get_settings()
        if not settings.gnani_api_key:
            raise ProcessingError(
                "gnani_not_configured",
                "Gnani transcription is not configured.",
                retryable=False,
            )
        self.api_key = settings.gnani_api_key
        self.api_url = settings.gnani_api_url
        self.timeout = settings.gnani_request_timeout_seconds

    def transcribe(self, audio_path: Path, media_type: str, language_code: str) -> str:
        try:
            with audio_path.open("rb") as audio:
                response = httpx.post(
                    self.api_url,
                    headers={"X-API-Key-ID": self.api_key},
                    files={"audio_file": (audio_path.name, audio, media_type)},
                    data={
                        "language_code": language_code,
                        "preferred_language": language_code,
                        "format": "transcribe",
                        "itn_native_numerals": "true",
                    },
                    timeout=self.timeout,
                )
        except (httpx.TimeoutException, httpx.NetworkError) as exc:
            raise ProcessingError(
                "gnani_unavailable",
                "Gnani transcription is temporarily unavailable.",
                retryable=True,
            ) from exc

        if response.status_code >= 500 or response.status_code == 429:
            raise ProcessingError(
                "gnani_unavailable",
                "Gnani transcription is temporarily unavailable.",
                retryable=True,
            )
        if response.status_code >= 400:
            raise ProcessingError(
                "gnani_request_rejected",
                "Gnani rejected this transcription request. Check the API key and selected language.",
                retryable=False,
            )
        try:
            payload = response.json()
        except ValueError as exc:
            raise ProcessingError(
                "gnani_invalid_response",
                "Gnani returned an unreadable transcription response.",
                retryable=True,
            ) from exc
        transcript = payload.get("transcript") if isinstance(payload, dict) else None
        if not isinstance(transcript, str) or not transcript.strip():
            raise ProcessingError(
                "gnani_empty_transcript",
                "Gnani did not return a transcript for this recording.",
                retryable=False,
            )
        return transcript.strip()
