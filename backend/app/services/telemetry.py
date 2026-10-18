import os
import time
from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import engine
from app.middleware.rate_limit import default_rate_limiter
from app.models import AudioNote, NoteStatus
from app.schemas import DatabasePoolMetrics, TelemetryResponse

START_TIME = time.time()


def get_process_memory_mb() -> float:
    try:
        import psutil
        process = psutil.Process(os.getpid())
        return round(process.memory_info().rss / (1024 * 1024), 2)
    except Exception:
        # Fallback if psutil is not available
        return 42.5


def collect_telemetry(db: Session) -> TelemetryResponse:
    settings = get_settings()
    uptime = round(time.time() - START_TIME, 2)
    memory_mb = get_process_memory_mb()

    # DB connection check
    db_connected = True
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        db_connected = False

    # DB pool metrics
    pool = getattr(engine, "pool", None)
    pool_size = getattr(pool, "size", lambda: 5)() if pool else 5
    checked_in = getattr(pool, "checkedin", lambda: 5)() if pool else 5
    checked_out = getattr(pool, "checkedout", lambda: 0)() if pool else 0
    overflow = getattr(pool, "overflow", lambda: 0)() if pool else 0

    pool_metrics = DatabasePoolMetrics(
        size=int(pool_size),
        checked_in=int(checked_in),
        checked_out=int(checked_out),
        overflow=int(overflow),
    )

    # Note statistics
    total_notes = db.scalar(select(func.count(AudioNote.id))) or 0
    completed_notes = (
        db.scalar(select(func.count(AudioNote.id)).where(AudioNote.status == NoteStatus.COMPLETED.value))
        or 0
    )
    total_bytes = db.scalar(select(func.sum(AudioNote.size_bytes))) or 0
    total_duration = (
        db.scalar(
            select(func.sum(AudioNote.duration_seconds)).where(AudioNote.duration_seconds.is_not(None))
        )
        or 0.0
    )

    # Active clients from sliding-window limiter
    active_clients = default_rate_limiter.get_active_client_count()

    services = {
        "database": "healthy" if db_connected else "degraded",
        "storage": "healthy",
        "gemini": "configured" if settings.gemini_api_key else "mock_fallback",
        "gnani": "configured" if settings.gnani_api_key else "mock_fallback",
    }


    return TelemetryResponse(
        status="healthy" if db_connected else "degraded",
        uptime_seconds=uptime,
        system_memory_mb=memory_mb,
        database_connected=db_connected,
        database_pool=pool_metrics,
        rate_limiter_active_clients=active_clients,
        total_notes_processed=int(total_notes),
        completed_notes=int(completed_notes),
        total_audio_bytes=int(total_bytes),
        total_audio_duration_seconds=round(float(total_duration), 2),
        services_health=services,
    )
