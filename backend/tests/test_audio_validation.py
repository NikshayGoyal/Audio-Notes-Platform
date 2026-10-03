from io import BytesIO

import pytest

from app.services.audio_validation import (
    has_valid_audio_signature,
    normalize_media_type,
    safe_display_filename,
)


@pytest.mark.parametrize(
    ("filename", "supplied", "expected"),
    [
        ("note.MP3", "application/octet-stream", "audio/mpeg"),
        ("note.m4a", "audio/x-m4a", "audio/mp4"),
        ("note.exe", "audio/mpeg", "audio/mpeg"),
        ("note.txt", "text/plain", None),
    ],
)
def test_normalize_media_type(filename: str, supplied: str, expected: str | None) -> None:
    assert normalize_media_type(filename, supplied) == expected


@pytest.mark.parametrize(
    ("media_type", "header"),
    [
        ("audio/mpeg", b"ID3\x04\x00\x00"),
        ("audio/mpeg", b"\xff\xfb\x90\x64"),
        ("audio/wav", b"RIFF\x24\x00\x00\x00WAVEfmt "),
        ("audio/flac", b"fLaC\x00\x00"),
        ("audio/ogg", b"OggS\x00\x02"),
        ("audio/webm", b"\x1a\x45\xdf\xa3\x9f"),
        ("audio/mp4", b"\x00\x00\x00\x18ftypM4A "),
    ],
)
def test_valid_audio_signatures(media_type: str, header: bytes) -> None:
    stream = BytesIO(header)
    assert has_valid_audio_signature(stream, media_type)
    assert stream.tell() == 0


def test_rejects_content_that_only_has_audio_filename() -> None:
    assert not has_valid_audio_signature(BytesIO(b"not really audio"), "audio/mpeg")


def test_safe_display_filename_removes_path_and_control_characters() -> None:
    assert safe_display_filename("C:\\fakepath\\meeting\n.mp3") == "meeting.mp3"
