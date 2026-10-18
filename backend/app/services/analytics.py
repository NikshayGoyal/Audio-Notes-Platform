from collections import Counter
import uuid
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import AudioNote, NoteStatus
from app.schemas import (
    ActionItemsAnalytics,
    AnalyticsResponse,
    LanguageDistribution,
    RecentDecision,
    SpeakerFrequency,
    TopicFrequency,
)


def get_analytics(db: Session, user_id: str) -> AnalyticsResponse:
    statement = select(AudioNote)
    if user_id == "anonymous":
        statement = statement.where((AudioNote.user_id == "anonymous") | (AudioNote.user_id.is_(None)))
    else:
        statement = statement.where(AudioNote.user_id == user_id)
    statement = statement.order_by(AudioNote.created_at.desc())

    notes = list(db.scalars(statement))

    total_notes = len(notes)
    completed_notes = 0
    failed_notes = 0
    active_notes = 0
    total_duration_seconds = 0.0
    total_words = 0
    code_switched_notes = 0

    action_total = 0
    action_completed = 0
    action_pending = 0
    high_priority = 0
    medium_priority = 0
    low_priority = 0
    by_owner: dict[str, int] = {}

    decisions_count = 0
    recent_decisions: list[RecentDecision] = []

    topic_counter: Counter[str] = Counter()
    speaker_counter: Counter[str] = Counter()
    lang_counter: Counter[str] = Counter()

    for note in notes:
        st = note.status
        if st == NoteStatus.COMPLETED.value:
            completed_notes += 1
        elif st == NoteStatus.FAILED.value:
            failed_notes += 1
        else:
            active_notes += 1

        if note.duration_seconds:
            total_duration_seconds += float(note.duration_seconds)

        if note.is_code_switched:
            code_switched_notes += 1

        if note.detected_language_name:
            lang_counter[note.detected_language_name] += 1

        if note.transcript:
            words = len(note.transcript.strip().split())
            total_words += words

        structured = note.structured_data or {}

        # Action items
        raw_items = structured.get("action_items") or []
        for item in raw_items:
            action_total += 1
            if item.get("completed"):
                action_completed += 1
            else:
                action_pending += 1

            prio = (item.get("priority") or "medium").lower()
            if prio == "high":
                high_priority += 1
            elif prio == "low":
                low_priority += 1
            else:
                medium_priority += 1

            owner = item.get("owner")
            if owner and isinstance(owner, str) and owner.strip():
                clean_owner = owner.strip()
                by_owner[clean_owner] = by_owner.get(clean_owner, 0) + 1

        # Decisions
        raw_decisions = structured.get("decisions") or []
        for dec in raw_decisions:
            decisions_count += 1
            if len(recent_decisions) < 6:
                decision_text = dec.get("decision") or ""
                if decision_text:
                    recent_decisions.append(
                        RecentDecision(
                            note_id=note.id,
                            note_title=note.title or note.original_filename,
                            decision=decision_text,
                            rationale=dec.get("rationale"),
                        )
                    )

        # Topics
        raw_topics = structured.get("topics") or []
        for top in raw_topics:
            if isinstance(top, str) and top.strip():
                topic_counter[top.strip()] += 1

        # Speakers
        raw_speakers = structured.get("speakers") or []
        for spk in raw_speakers:
            if isinstance(spk, str) and spk.strip():
                speaker_counter[spk.strip()] += 1

    completion_rate = (
        round((action_completed / action_total) * 100) if action_total > 0 else 0
    )

    avg_wpm = (
        round(total_words / (total_duration_seconds / 60))
        if total_duration_seconds > 5
        else 0
    )

    top_topics = [
        TopicFrequency(topic=t, count=c) for t, c in topic_counter.most_common(12)
    ]
    top_speakers = [
        SpeakerFrequency(speaker=s, count=c) for s, c in speaker_counter.most_common(8)
    ]
    languages = [
        LanguageDistribution(language=l, count=c) for l, c in lang_counter.most_common(6)
    ]

    action_analytics = ActionItemsAnalytics(
        total=action_total,
        completed=action_completed,
        pending=action_pending,
        completion_rate_pct=completion_rate,
        high_priority=high_priority,
        medium_priority=medium_priority,
        low_priority=low_priority,
        by_owner=by_owner,
    )

    return AnalyticsResponse(
        total_notes=total_notes,
        completed_notes=completed_notes,
        failed_notes=failed_notes,
        active_notes=active_notes,
        total_duration_seconds=round(total_duration_seconds, 1),
        total_words=total_words,
        avg_words_per_minute=avg_wpm,
        action_items=action_analytics,
        total_decisions=decisions_count,
        recent_decisions=recent_decisions,
        top_topics=top_topics,
        top_speakers=top_speakers,
        languages=languages,
        code_switched_notes=code_switched_notes,
    )
