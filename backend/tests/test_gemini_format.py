from app.services.gemini import (
    ActionItemResult,
    KeyDecisionResult,
    SpeakerTurnResult,
    StructuredNoteResult,
    format_structured_markdown,
)


def test_structured_note_markdown_formatting():
    data = StructuredNoteResult(
        title="Engineering Sync",
        overview="Team discussed latency improvements and caching layer.",
        key_points=[
            "Redis cache reduced DB reads by 60%",
            "Next.js frontend migrated to App Router",
        ],
        action_items=[
            ActionItemResult(task="Deploy Redis cluster", owner="Alex", priority="high"),
            ActionItemResult(task="Update documentation", owner=None, priority="low"),
        ],
        decisions=[
            KeyDecisionResult(
                decision="Adopt pgvector for RAG embeddings",
                rationale="Postgres extension avoids running separate Pinecone cluster",
            )
        ],
        topics=["Engineering", "Infrastructure", "RAG"],
    )

    markdown = format_structured_markdown(data)

    assert "## Engineering Sync" in markdown
    assert "### Overview" in markdown
    assert "Redis cache reduced DB reads by 60%" in markdown
    assert "- [ ] **[HIGH]** Deploy Redis cluster (@Alex)" in markdown
    assert "- [ ] **[LOW]** Update documentation" in markdown
    assert "**Decision:** Adopt pgvector for RAG embeddings" in markdown
    assert "— *Rationale:* Postgres extension avoids running separate Pinecone cluster" in markdown


def test_structured_note_speakers_and_turns():
    data = StructuredNoteResult(
        title="Product Review",
        overview="Reviewing MVP launch date.",
        speakers=["Nikshay", "Alex"],
        speaker_turns=[
            SpeakerTurnResult(speaker="Nikshay", text="We are ready with the Next.js frontend."),
            SpeakerTurnResult(speaker="Alex", text="FastAPI backend tests are 100% green."),
        ],
    )
    assert len(data.speakers) == 2
    assert data.speakers[0] == "Nikshay"
    assert len(data.speaker_turns) == 2
    assert data.speaker_turns[1].speaker == "Alex"
