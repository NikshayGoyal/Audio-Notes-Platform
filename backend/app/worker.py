import logging
import uuid
from concurrent.futures import ThreadPoolExecutor

from celery import Celery

from app.config import get_settings
from app.database import SessionLocal
from app.models import AudioNote, NoteStatus
from app.services.notes import process_note
from app.services.errors import ProcessingError

settings = get_settings()
celery_app = Celery("audio_notes", broker=settings.redis_url)
celery_app.conf.update(task_acks_late=True, task_ignore_result=True, worker_prefetch_multiplier=1)
logger = logging.getLogger(__name__)
local_executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="audio-notes-local")


@celery_app.task(
    bind=True,
    max_retries=settings.task_max_retries,
)
def process_audio_note(self, note_id: str) -> None:
    with SessionLocal() as db:
        note = db.get(AudioNote, uuid.UUID(note_id))
        if note is None:
            logger.warning("Note %s no longer exists", note_id)
            return
        if note.status == NoteStatus.COMPLETED.value:
            return
        try:
            process_note(db, note)
        except Exception as exc:
            logger.exception("Processing failed for note %s", note_id)
            db.rollback()
            retryable = not isinstance(exc, ProcessingError) or exc.retryable
            has_retry = retryable and self.request.retries < settings.task_max_retries
            note.status = NoteStatus.QUEUED.value if has_retry else NoteStatus.FAILED.value
            note.error_code = (
                "processing_retry"
                if has_retry
                else exc.code if isinstance(exc, ProcessingError) else "processing_failed"
            )
            note.error_message = (
                "A temporary processing error occurred. Retrying automatically."
                if has_retry
                else exc.user_message
                if isinstance(exc, ProcessingError)
                else "We could not process this audio. You can retry it."
            )
            db.commit()
            if has_retry:
                raise self.retry(exc=exc, countdown=2 ** (self.request.retries + 1))
            raise


def enqueue_audio_note(note_id: str) -> None:
    if settings.local_development_mode:
        local_executor.submit(process_audio_note.apply, args=[note_id])
        return
    process_audio_note.delay(note_id)
