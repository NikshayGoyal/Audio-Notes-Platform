"""add language preferences and detection metadata"""
from alembic import op
import sqlalchemy as sa

revision = "20261003_02"
down_revision = "20260930_01"


def upgrade() -> None:
    op.add_column(
        "audio_notes",
        sa.Column("source_language", sa.String(length=16), server_default="auto", nullable=False),
    )
    op.add_column(
        "audio_notes",
        sa.Column("summary_language", sa.String(length=16), server_default="same", nullable=False),
    )
    op.add_column("audio_notes", sa.Column("detected_language", sa.String(length=16), nullable=True))
    op.add_column("audio_notes", sa.Column("detected_language_name", sa.String(length=80), nullable=True))
    op.add_column("audio_notes", sa.Column("is_code_switched", sa.Boolean(), nullable=True))


def downgrade() -> None:
    op.drop_column("audio_notes", "is_code_switched")
    op.drop_column("audio_notes", "detected_language_name")
    op.drop_column("audio_notes", "detected_language")
    op.drop_column("audio_notes", "summary_language")
    op.drop_column("audio_notes", "source_language")
