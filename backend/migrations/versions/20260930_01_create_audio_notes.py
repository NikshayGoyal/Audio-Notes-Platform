"""create audio_notes table"""
from alembic import op
import sqlalchemy as sa

revision = "20260930_01"
down_revision = None


def upgrade() -> None:
    op.create_table(
        "audio_notes",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("original_filename", sa.String(length=255), nullable=False),
        sa.Column("media_type", sa.String(length=100), nullable=False),
        sa.Column("size_bytes", sa.BigInteger(), nullable=False),
        sa.Column("storage_key", sa.String(length=500), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("transcript", sa.Text(), nullable=True),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("error_code", sa.String(length=64), nullable=True),
        sa.Column("error_message", sa.String(length=500), nullable=True),
        sa.Column("attempt_count", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("storage_key"),
    )
    op.create_index("ix_audio_notes_created_at", "audio_notes", ["created_at"])
    op.create_index("ix_audio_notes_status", "audio_notes", ["status"])


def downgrade() -> None:
    op.drop_index("ix_audio_notes_status", table_name="audio_notes")
    op.drop_index("ix_audio_notes_created_at", table_name="audio_notes")
    op.drop_table("audio_notes")
