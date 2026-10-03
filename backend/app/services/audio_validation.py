from pathlib import Path
from typing import BinaryIO


MEDIA_TYPE_BY_SUFFIX = {
    ".mp3": "audio/mpeg",
    ".m4a": "audio/mp4",
    ".mp4": "audio/mp4",
    ".wav": "audio/wav",
    ".webm": "audio/webm",
    ".ogg": "audio/ogg",
    ".oga": "audio/ogg",
    ".flac": "audio/flac",
}

CANONICAL_MEDIA_TYPES = {
    "audio/mp3": "audio/mpeg",
    "audio/mpeg": "audio/mpeg",
    "audio/mp4": "audio/mp4",
    "audio/x-m4a": "audio/mp4",
    "audio/wav": "audio/wav",
    "audio/x-wav": "audio/wav",
    "audio/webm": "audio/webm",
    "audio/ogg": "audio/ogg",
    "audio/flac": "audio/flac",
}

SUFFIX_BY_MEDIA_TYPE = {
    "audio/mpeg": ".mp3",
    "audio/mp4": ".m4a",
    "audio/wav": ".wav",
    "audio/webm": ".webm",
    "audio/ogg": ".ogg",
    "audio/flac": ".flac",
}


def normalize_media_type(filename: str, supplied_media_type: str | None) -> str | None:
    supplied = (supplied_media_type or "").lower().split(";", 1)[0].strip()
    if supplied in CANONICAL_MEDIA_TYPES:
        return CANONICAL_MEDIA_TYPES[supplied]
    if supplied in {"", "application/octet-stream"}:
        return MEDIA_TYPE_BY_SUFFIX.get(Path(filename).suffix.lower())
    return None


def has_valid_audio_signature(stream: BinaryIO, media_type: str) -> bool:
    position = stream.tell()
    header = stream.read(64)
    stream.seek(position)
    if media_type == "audio/wav":
        return len(header) >= 12 and header[:4] in {b"RIFF", b"RF64"} and header[8:12] == b"WAVE"
    if media_type == "audio/flac":
        return header.startswith(b"fLaC")
    if media_type == "audio/ogg":
        return header.startswith(b"OggS")
    if media_type == "audio/webm":
        return header.startswith(b"\x1a\x45\xdf\xa3")
    if media_type == "audio/mp4":
        return len(header) >= 12 and header[4:8] == b"ftyp"
    if media_type == "audio/mpeg":
        return header.startswith(b"ID3") or (
            len(header) >= 2 and header[0] == 0xFF and header[1] & 0xE0 == 0xE0
        )
    return False


def safe_display_filename(filename: str | None) -> str:
    basename = Path((filename or "audio").replace("\\", "/")).name
    printable = "".join(character for character in basename if character.isprintable()).strip()
    return (printable or "audio")[:255]
