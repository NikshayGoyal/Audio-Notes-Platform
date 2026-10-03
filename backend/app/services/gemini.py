import logging
from pathlib import Path
from typing import Literal

from google import genai
from google.genai import types
from pydantic import BaseModel

from app.config import get_settings
from app.languages import LANGUAGE_BY_CODE, SUPPORTED_LANGUAGES, normalize_language_name
from app.services.errors import (
    NoSpeechDetectedError,
    ProcessingError,
    UnsupportedLanguageError,
)

logger = logging.getLogger(__name__)


class LanguageDetectionResult(BaseModel):
    has_speech: bool
    language_code: Literal[
        "unsupported",
        "en-IN",
        "hi-IN",
        "kn-IN",
        "ta-IN",
        "te-IN",
        "bn-IN",
        "mr-IN",
        "gu-IN",
        "ml-IN",
        "pa-IN",
        "or-IN",
    ]
    language_name: str
    is_code_switched: bool


SUMMARY_PROMPT = """Turn the transcript below into useful audio notes.
Write the entire response in {output_language}. Return concise plain text with
an OVERVIEW section of 2-4 sentences, a KEY POINTS section with hyphen bullets,
and an ACTION ITEMS section with hyphen bullets only when action items exist.
Do not invent facts. If the transcript is unclear, say so briefly.

TRANSCRIPT:
{transcript}
"""


class GeminiService:
    def __init__(self) -> None:
        settings = get_settings()
        if not settings.gemini_api_key:
            raise ProcessingError(
                "gemini_not_configured",
                "Gemini language detection and summarization are not configured.",
                retryable=False,
            )
        self.client = genai.Client(
            api_key=settings.gemini_api_key,
            http_options=types.HttpOptions(timeout=settings.gemini_request_timeout_ms),
        )
        self.detection_model = settings.gemini_detection_model
        self.summary_model = settings.gemini_summary_model

    def detect_language(self, audio_path: Path, media_type: str) -> LanguageDetectionResult:
        supported = ", ".join(
            f"{language.name} ({language.code})" for language in SUPPORTED_LANGUAGES
        )
        prompt = f"""Identify the dominant spoken language in this recording.
Choose only from this supported set: {supported}.
Set has_speech=false when there is insufficient intelligible speech. If the
recording mixes English with an Indian language, choose the dominant Indian
language and set is_code_switched=true. Do not guess an unsupported language
as a supported one; return its best language name and language_code=unsupported.
The region suffix selects a Gnani ASR model, not the speaker's location: map
English of any accent to en-IN and apply the same language-family rule to the
other supported languages.
"""
        try:
            uploaded = self.client.files.upload(
                file=audio_path,
                config=types.UploadFileConfig(mime_type=media_type),
            )
        except Exception as exc:
            raise ProcessingError(
                "language_detection_failed",
                "Automatic language detection is temporarily unavailable.",
                retryable=True,
            ) from exc
        try:
            response = self.client.models.generate_content(
                model=self.detection_model,
                contents=[uploaded, prompt],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=LanguageDetectionResult,
                ),
            )
            if not response.text:
                raise ProcessingError(
                    "language_detection_failed",
                    "Automatic language detection returned no result. Choose a language manually and retry.",
                    retryable=True,
                )
            result = LanguageDetectionResult.model_validate_json(response.text)
        except ProcessingError:
            raise
        except Exception as exc:
            raise ProcessingError(
                "language_detection_failed",
                "Automatic language detection failed. Choose a language manually or retry shortly.",
                retryable=True,
            ) from exc
        finally:
            if uploaded.name:
                try:
                    self.client.files.delete(name=uploaded.name)
                except Exception:
                    logger.warning("Could not delete temporary Gemini file %s", uploaded.name)

        if not result.has_speech:
            raise NoSpeechDetectedError()
        normalized_code = result.language_code
        if normalized_code not in LANGUAGE_BY_CODE:
            normalized_code = normalize_language_name(result.language_name) or "unsupported"
        if normalized_code not in LANGUAGE_BY_CODE:
            raise UnsupportedLanguageError(result.language_name or "unknown")
        expected_name = LANGUAGE_BY_CODE[normalized_code].name
        return result.model_copy(
            update={"language_code": normalized_code, "language_name": expected_name}
        )

    def summarize(self, transcript: str, output_language: str) -> str:
        try:
            response = self.client.models.generate_content(
                model=self.summary_model,
                contents=SUMMARY_PROMPT.format(
                    transcript=transcript,
                    output_language=output_language,
                ),
            )
        except Exception as exc:
            raise ProcessingError(
                "summary_failed",
                "Summary generation is temporarily unavailable.",
                retryable=True,
            ) from exc
        summary = (response.text or "").strip()
        if not summary:
            raise ProcessingError(
                "summary_empty",
                "Gemini returned an empty summary.",
                retryable=True,
            )
        return summary
