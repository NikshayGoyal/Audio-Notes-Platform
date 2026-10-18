"""add structured_data to audio_notes"""
from alembic import op
import sqlalchemy as sa

revision = "20261018_04"
down_revision = "20261018_03"


def upgrade() -> None:
    op.add_column(
        "audio_notes",
        sa.Column("structured_data", sa.JSON(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("audio_notes", "structured_data")
