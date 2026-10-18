from app.services.gemini import (
    ActionItemResult,
    KeyDecisionResult,
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
