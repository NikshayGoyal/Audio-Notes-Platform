from types import SimpleNamespace
from unittest.mock import Mock, patch

from app.models import AudioNote, NoteStatus
from app.services.notes import process_note


def make_note(*, transcript: str | None = None) -> AudioNote:
    return AudioNote(
        original_filename="meeting.mp3",
        media_type="audio/mpeg",
        size_bytes=100,
        storage_key="uploads/example.mp3",
        status=NoteStatus.QUEUED.value,
        source_language="en-IN",
        summary_language="same",
        detected_language="en-IN" if transcript else None,
        detected_language_name="English (India)" if transcript else None,
        transcript=transcript,
        attempt_count=0,
    )


@patch("app.services.notes.GeminiService")
@patch("app.services.notes.GnaniService")
@patch("app.services.notes.get_storage")
def test_processing_persists_transcript_summary_and_completion(
    get_storage: Mock, gnani_class: Mock, gemini_class: Mock
) -> None:
    db = Mock()
    note = make_note()
    get_storage.return_value.download.side_effect = lambda _key, stream: stream.write(b"ID3 audio")
    gemini = gemini_class.return_value
    gnani_class.return_value.transcribe.return_value = "Discussed the launch plan."
    gemini.summarize.return_value = "OVERVIEW\nLaunch plan discussion."

    process_note(db, note)

    assert note.status == NoteStatus.COMPLETED.value
    assert note.transcript == "Discussed the launch plan."
    assert note.summary == "OVERVIEW\nLaunch plan discussion."
    assert note.completed_at is not None
    assert note.attempt_count == 1
    gnani_class.return_value.transcribe.assert_called_once()
    gemini.summarize.assert_called_once_with(note.transcript, "English (India)")
    assert db.commit.call_count == 3


@patch("app.services.notes.GeminiService")
@patch("app.services.notes.GnaniService")
@patch("app.services.notes.get_storage")
def test_summary_retry_reuses_existing_transcript(
    get_storage: Mock, gnani_class: Mock, gemini_class: Mock
) -> None:
    db = Mock()
    note = make_note(transcript="Already transcribed")
    gemini = gemini_class.return_value
    gemini.summarize.return_value = "OVERVIEW\nRecovered summary."

    process_note(db, note)

    get_storage.return_value.download.assert_not_called()
    gnani_class.return_value.transcribe.assert_not_called()
    gemini.summarize.assert_called_once_with("Already transcribed", "English (India)")
    assert note.status == NoteStatus.COMPLETED.value


@patch("app.services.notes.GeminiService")
@patch("app.services.notes.GnaniService")
@patch("app.services.notes.get_storage")
def test_auto_language_detection_precedes_gnani_transcription(
    get_storage: Mock, gnani_class: Mock, gemini_class: Mock
) -> None:
    db = Mock()
    note = make_note()
    note.source_language = "auto"
    committed_statuses: list[str] = []
    db.commit.side_effect = lambda: committed_statuses.append(note.status)
    get_storage.return_value.download.side_effect = lambda _key, stream: stream.write(b"ID3 audio")
    gemini = gemini_class.return_value
    gemini.detect_language.return_value = SimpleNamespace(
        language_code="hi-IN",
        language_name="Hindi",
        is_code_switched=True,
    )
    gnani_class.return_value.transcribe.return_value = "आज की बैठक"
    gemini.summarize.return_value = "सारांश"

    process_note(db, note)

    assert committed_statuses == [
        NoteStatus.DETECTING_LANGUAGE.value,
        NoteStatus.TRANSCRIBING.value,
        NoteStatus.SUMMARIZING.value,
        NoteStatus.COMPLETED.value,
    ]
    assert note.detected_language == "hi-IN"
    assert note.detected_language_name == "Hindi"
    assert note.is_code_switched is True
    gnani_class.return_value.transcribe.assert_called_once()
    gemini.summarize.assert_called_once_with("आज की बैठक", "Hindi")
