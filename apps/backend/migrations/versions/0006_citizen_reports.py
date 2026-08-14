"""Persist privacy-conscious citizen reports."""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0006_citizen_reports"
down_revision: str | None = "0005_territory_hierarchy"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "citizen_reports",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tracking_code", sa.String(16), nullable=False, unique=True),
        sa.Column("territory_id", sa.String(80), nullable=False),
        sa.Column("category", sa.String(32), nullable=False),
        sa.Column("title", sa.String(100), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("neighborhood_code", sa.String(50)),
        sa.Column("severity", sa.String(24), nullable=False),
        sa.Column("longitude", sa.Numeric(9, 6)),
        sa.Column("latitude", sa.Numeric(9, 6)),
        sa.Column("observed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("verification_status", sa.String(24), nullable=False, server_default="reported"),
        sa.Column("moderation_note", sa.String(300)),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index(
        "ix_citizen_reports_tracking_code",
        "citizen_reports",
        ["tracking_code"],
        unique=True,
    )
    op.create_index("ix_citizen_reports_territory_id", "citizen_reports", ["territory_id"])
    op.create_index(
        "ix_citizen_reports_verification_status",
        "citizen_reports",
        ["verification_status"],
    )


def downgrade() -> None:
    op.drop_table("citizen_reports")
