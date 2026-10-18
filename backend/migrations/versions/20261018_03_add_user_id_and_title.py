"""add user_id, title, and duration_seconds to audio_notes"""
from alembic import op
import sqlalchemy as sa

revision = "20261018_03"
down_revision = "20261003_02"


def upgrade() -> None:
    op.add_column(
        "audio_notes",
        sa.Column("user_id", sa.String(length=128), server_default="anonymous", nullable=False),
    )
    op.add_column(
        "audio_notes",
        sa.Column("title", sa.String(length=255), nullable=True),
    )
    op.add_column(
        "audio_notes",
        sa.Column("duration_seconds", sa.Float(), nullable=True),
    )
    op.create_index("ix_audio_notes_user_id", "audio_notes", ["user_id"])
    op.create_index("ix_audio_notes_user_created", "audio_notes", ["user_id", "created_at"])


def downgrade() -> None:
    op.drop_index("ix_audio_notes_user_created", table_name="audio_notes")
    op.drop_index("ix_audio_notes_user_id", table_name="audio_notes")
    op.drop_column("audio_notes", "duration_seconds")
    op.drop_column("audio_notes", "title")
    op.drop_column("audio_notes", "user_id")
