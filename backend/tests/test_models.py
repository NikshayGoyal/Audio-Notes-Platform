from app.models import NoteStatus


def test_processing_statuses_are_stable_api_values() -> None:
    assert [status.value for status in NoteStatus] == [
        "queued", "detecting_language", "transcribing", "summarizing", "completed", "failed"
    ]
