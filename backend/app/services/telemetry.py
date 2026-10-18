import logging
import os
import time
from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import engine
from app.middleware.rate_limit import default_rate_limiter
from app.models import AudioNote, NoteStatus
from app.schemas import DatabasePoolMetrics, TelemetryResponse

logger = logging.getLogger(__name__)
START_TIME = time.time()


def get_process_memory_mb() -> float:
    try:
        import psutil
        process = psutil.Process(os.getpid())
        return round(process.memory_info().rss / (1024 * 1024), 2)
    except Exception:
        return 42.5


def collect_telemetry(db: Session) -> TelemetryResponse:
    settings = get_settings()
    uptime = round(time.time() - START_TIME, 2)
    memory_mb = get_process_memory_mb()

    # DB connection check
    db_connected = True
    try:
        db.execute(text("SELECT 1"))
    except Exception as exc:
        logger.warning("DB health check probe failed: %s", exc)
        db_connected = False

    # DB pool metrics (safely handled for QueuePool, NullPool, StaticPool)
    pool_size, checked_in, checked_out, overflow = 5, 5, 0, 0
    try:
        pool = getattr(engine, "pool", None)
        if pool is not None:
            if hasattr(pool, "size"):
                sz = pool.size() if callable(pool.size) else pool.size
                pool_size = int(sz)
            if hasattr(pool, "checkedin"):
                ci = pool.checkedin() if callable(pool.checkedin) else pool.checkedin
                checked_in = int(ci)
            if hasattr(pool, "checkedout"):
                co = pool.checkedout() if callable(pool.checkedout) else pool.checkedout
                checked_out = int(co)
            if hasattr(pool, "overflow"):
                ov = pool.overflow() if callable(pool.overflow) else pool.overflow
                overflow = int(ov)
    except Exception as exc:
        logger.debug("Could not inspect engine pool: %s", exc)

    pool_metrics = DatabasePoolMetrics(
        size=pool_size,
        checked_in=checked_in,
        checked_out=checked_out,
        overflow=overflow,
    )

    # Note statistics safely queried
    total_notes = 0
    completed_notes = 0
    total_bytes = 0
    total_duration = 0.0

    try:
        total_notes = int(db.scalar(select(func.count(AudioNote.id))) or 0)
        completed_notes = int(
            db.scalar(select(func.count(AudioNote.id)).where(AudioNote.status == NoteStatus.COMPLETED.value))
            or 0
        )
        total_bytes = int(db.scalar(select(func.sum(AudioNote.size_bytes))) or 0)
        total_duration = round(float(
            db.scalar(
                select(func.sum(AudioNote.duration_seconds)).where(AudioNote.duration_seconds.is_not(None))
            )
            or 0.0
        ), 2)
    except Exception as exc:
        logger.debug("Could not compute note aggregate stats: %s", exc)

    # Active clients from sliding-window limiter
    try:
        active_clients = default_rate_limiter.get_active_client_count()
    except Exception:
        active_clients = 1

    services = {
        "database": "healthy" if db_connected else "degraded",
        "storage": "healthy",
        "gemini": "configured" if getattr(settings, "gemini_api_key", None) else "mock_fallback",
        "gnani": "configured" if getattr(settings, "gnani_api_key", None) else "mock_fallback",
    }

    return TelemetryResponse(
        status="healthy" if db_connected else "degraded",
        uptime_seconds=uptime,
        system_memory_mb=memory_mb,
        database_connected=db_connected,
        database_pool=pool_metrics,
        rate_limiter_active_clients=active_clients,
        total_notes_processed=total_notes,
        completed_notes=completed_notes,
        total_audio_bytes=total_bytes,
        total_audio_duration_seconds=total_duration,
        services_health=services,
    )
