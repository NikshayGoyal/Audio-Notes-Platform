import asyncio
import json
import logging
import tempfile
import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse, RedirectResponse, StreamingResponse
from sqlalchemy import text
from sqlalchemy.orm import Session, sessionmaker
from starlette.concurrency import run_in_threadpool

from app.config import Settings, get_settings
from app.database import get_db, get_session_factory
from app.models import AudioNote, NoteStatus
from app.languages import AUTO_LANGUAGE, LANGUAGE_BY_CODE, SAME_LANGUAGE, SUPPORTED_LANGUAGES
from app.schemas import (
    HealthResponse,
    LanguageOption,
    NoteChatMessage,
    NoteChatResponse,
    NoteListItem,
    NoteRead,
    NoteUpdate,
    RetryRequest,
    UserResponse,
)
from app.services.auth import AuthenticatedUser, get_current_user
from app.services.gemini import GeminiService, get_gemini_service
from app.services.notes import delete_note, get_note, list_notes, update_note
from app.services.audio_validation import (
    SUFFIX_BY_MEDIA_TYPE,
    has_valid_audio_signature,
    normalize_media_type,
    safe_display_filename,
)
from app.services.storage import ObjectStorage, get_storage
from app.worker import enqueue_audio_note

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api")


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok")


@router.get("/ready", response_model=HealthResponse)
def ready(db: Session = Depends(get_db)) -> HealthResponse:
    db.execute(text("SELECT 1"))
    return HealthResponse(status="ready")


@router.get("/auth/me", response_model=UserResponse)
def get_me(user: AuthenticatedUser = Depends(get_current_user)) -> UserResponse:
    return UserResponse(id=user.id, email=user.email, is_anonymous=user.is_anonymous)


@router.get("/languages", response_model=list[LanguageOption])
def get_languages() -> list[LanguageOption]:
    return [LanguageOption(code=item.code, name=item.name) for item in SUPPORTED_LANGUAGES]


@router.post("/notes", response_model=NoteRead, status_code=status.HTTP_202_ACCEPTED)
async def create_note(
    audio: UploadFile = File(...),
    title: str | None = Form(default=None),
    source_language: str = Form(default=AUTO_LANGUAGE),
    summary_language: str = Form(default=SAME_LANGUAGE),
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    storage: ObjectStorage = Depends(get_storage),
) -> AudioNote:
    if source_language != AUTO_LANGUAGE and source_language not in LANGUAGE_BY_CODE:
        raise HTTPException(status_code=422, detail="Unsupported source language")
    if summary_language != SAME_LANGUAGE and summary_language not in LANGUAGE_BY_CODE:
        raise HTTPException(status_code=422, detail="Unsupported summary language")
    display_filename = safe_display_filename(audio.filename)
    media_type = normalize_media_type(display_filename, audio.content_type)
    if media_type is None:
        raise HTTPException(status_code=415, detail="Unsupported audio format")

    safe_suffix = SUFFIX_BY_MEDIA_TYPE[media_type]
    object_key = f"uploads/{uuid.uuid4()}{safe_suffix}"
    size = 0
    with tempfile.SpooledTemporaryFile(max_size=8 * 1024 * 1024) as spool:
        while chunk := await audio.read(settings.upload_chunk_bytes):
            size += len(chunk)
            if size > settings.max_upload_bytes:
                raise HTTPException(status_code=413, detail="Audio file exceeds the upload limit")
            spool.write(chunk)
        if size == 0:
            raise HTTPException(status_code=400, detail="Audio file is empty")
        spool.seek(0)
        if not has_valid_audio_signature(spool, media_type):
            raise HTTPException(status_code=415, detail="File contents do not match a supported audio format")
        try:
            await run_in_threadpool(storage.upload, spool, object_key, media_type)
        except Exception as exc:
            logger.exception("Object upload failed")
            raise HTTPException(status_code=503, detail="Audio storage is temporarily unavailable") from exc

    note = AudioNote(
        user_id=user.id,
        title=title.strip() if title else None,
        original_filename=display_filename,
        media_type=media_type,
        size_bytes=size,
        storage_key=object_key,
        status=NoteStatus.QUEUED.value,
        source_language=source_language,
        summary_language=summary_language,
    )
    try:
        db.add(note)
        db.commit()
        db.refresh(note)
    except Exception as exc:
        db.rollback()
        try:
            await run_in_threadpool(storage.delete, object_key)
        except Exception:
            logger.exception("Could not clean up orphaned object %s", object_key)
        raise HTTPException(status_code=503, detail="Could not save the audio note") from exc
    try:
        await run_in_threadpool(enqueue_audio_note, str(note.id))
    except Exception:
        logger.exception("Queue submission failed for note %s", note.id)
        note.status = NoteStatus.FAILED.value
        note.error_code = "queue_unavailable"
        note.error_message = "Processing could not be queued. Please retry shortly."
        db.commit()
    return note


@router.get("/notes", response_model=list[NoteListItem])
def get_notes(
    limit: int = Query(default=50, ge=1, le=100),
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[AudioNote]:
    return list_notes(db, user_id=user.id, limit=limit)


@router.get("/notes/{note_id}", response_model=NoteRead)
def get_note_detail(
    note_id: uuid.UUID,
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AudioNote:
    note = get_note(db, note_id, user_id=user.id)
    if note is None:
        raise HTTPException(status_code=404, detail="Audio note not found")
    return note


@router.get("/notes/{note_id}/stream")
async def stream_note_events(
    note_id: uuid.UUID,
    user: AuthenticatedUser = Depends(get_current_user),
    session_factory: sessionmaker[Session] = Depends(get_session_factory),
):
    with session_factory() as db:
        note = get_note(db, note_id, user_id=user.id)
        if note is None:
            raise HTTPException(status_code=404, detail="Audio note not found")

    async def event_generator():
        last_updated_at = None
        last_status = None
        try:
            for _ in range(600):
                with session_factory() as db:
                    current_note = get_note(db, note_id, user_id=user.id)
                    if not current_note:
                        yield f"event: error\ndata: {json.dumps({'error': 'Note not found'})}\n\n"
                        break

                    if current_note.status != last_status or current_note.updated_at != last_updated_at:
                        last_status = current_note.status
                        last_updated_at = current_note.updated_at
                        read_model = NoteRead.model_validate(current_note)
                        yield f"event: note_update\ndata: {read_model.model_dump_json()}\n\n"

                    if current_note.status in (NoteStatus.COMPLETED.value, NoteStatus.FAILED.value):
                        yield f"event: complete\ndata: {json.dumps({'status': current_note.status})}\n\n"
                        break

                await asyncio.sleep(1.0)
        except asyncio.CancelledError:
            return

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/notes/{note_id}/chat", response_model=NoteChatResponse)
async def chat_with_note(
    note_id: uuid.UUID,
    payload: NoteChatMessage,
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
    gemini: GeminiService = Depends(get_gemini_service),
) -> NoteChatResponse:
    note = get_note(db, note_id, user_id=user.id)
    if note is None:
        raise HTTPException(status_code=404, detail="Audio note not found")

    if not note.transcript:
        raise HTTPException(
            status_code=400,
            detail="Transcript is not yet available for this note. Please wait until processing completes.",
        )

    question = payload.message.strip()
    if not question:
        raise HTTPException(status_code=422, detail="Question message cannot be empty")

    reply = await run_in_threadpool(
        gemini.answer_question,
        transcript=note.transcript,
        structured_data=note.structured_data,
        question=question,
    )
    return NoteChatResponse(reply=reply)



@router.patch("/notes/{note_id}", response_model=NoteRead)
def update_note_detail(
    note_id: uuid.UUID,
    payload: NoteUpdate,
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AudioNote:
    note = get_note(db, note_id, user_id=user.id)
    if note is None:
        raise HTTPException(status_code=404, detail="Audio note not found")
    return update_note(db, note, title=payload.title, structured_data=payload.structured_data)


@router.delete("/notes/{note_id}", status_code=status.HTTP_200_OK)
async def delete_note_endpoint(
    note_id: uuid.UUID,
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
    storage: ObjectStorage = Depends(get_storage),
) -> dict[str, str]:
    note = get_note(db, note_id, user_id=user.id)
    if note is None:
        raise HTTPException(status_code=404, detail="Audio note not found")
    storage_key = note.storage_key
    delete_note(db, note)
    try:
        await run_in_threadpool(storage.delete, storage_key)
    except Exception:
        logger.exception("Could not clean up storage object %s for note %s", storage_key, note_id)
    return {"status": "deleted", "id": str(note_id)}


@router.get("/notes/{note_id}/audio")
async def get_note_audio(
    note_id: uuid.UUID,
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
    storage: ObjectStorage = Depends(get_storage),
):
    note = get_note(db, note_id, user_id=user.id)
    if note is None:
        raise HTTPException(status_code=404, detail="Audio note not found")

    presigned_url = storage.generate_presigned_download_url(note.storage_key)
    if presigned_url:
        return RedirectResponse(url=presigned_url, status_code=status.HTTP_307_TEMPORARY_REDIRECT)

    local_path = storage.get_local_file_path(note.storage_key)
    if local_path and local_path.exists():
        return FileResponse(
            path=str(local_path),
            media_type=note.media_type,
            filename=note.original_filename,
        )

    raise HTTPException(status_code=404, detail="Audio recording file not found in storage")


@router.post("/notes/{note_id}/retry", response_model=NoteRead, status_code=202)
def retry_note(
    note_id: uuid.UUID,
    payload: RetryRequest | None = None,
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AudioNote:
    note = get_note(db, note_id, user_id=user.id)
    if note is None:
        raise HTTPException(status_code=404, detail="Audio note not found")
    payload = payload or RetryRequest()
    has_override = payload.source_language is not None or payload.summary_language is not None
    if note.status != NoteStatus.FAILED.value and not (
        note.status == NoteStatus.COMPLETED.value and has_override
    ):
        raise HTTPException(
            status_code=409,
            detail="Only failed notes can be retried; completed notes require a language override",
        )
    if payload.source_language is not None:
        if payload.source_language != AUTO_LANGUAGE and payload.source_language not in LANGUAGE_BY_CODE:
            raise HTTPException(status_code=422, detail="Unsupported source language")
        note.source_language = payload.source_language
        note.detected_language = None
        note.detected_language_name = None
        note.is_code_switched = None
        note.transcript = None
        note.summary = None
    if payload.summary_language is not None:
        if payload.summary_language != SAME_LANGUAGE and payload.summary_language not in LANGUAGE_BY_CODE:
            raise HTTPException(status_code=422, detail="Unsupported summary language")
        note.summary_language = payload.summary_language
        note.summary = None
    note.status = NoteStatus.QUEUED.value
    note.error_code = None
    note.error_message = None
    note.completed_at = None
    db.commit()
    try:
        enqueue_audio_note(str(note.id))
    except Exception as exc:
        note.status = NoteStatus.FAILED.value
        note.error_code = "queue_unavailable"
        note.error_message = "Processing could not be queued. Please retry shortly."
        db.commit()
        raise HTTPException(status_code=503, detail=note.error_message) from exc
    db.refresh(note)
    return note
