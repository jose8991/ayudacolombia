"""Add privacy-preserving citizen assistance needs."""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0002_assistance_needs"
down_revision: str | None = "0001_coordination_core"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "assistance_needs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tracking_code", sa.String(16), nullable=False, unique=True),
        sa.Column("territory_id", sa.String(80), nullable=False),
        sa.Column("category", sa.String(40), nullable=False),
        sa.Column("people_count", sa.Integer(), nullable=False),
        sa.Column("neighborhood", sa.String(120), nullable=False),
        sa.Column("latitude", sa.Numeric(9, 6)),
        sa.Column("longitude", sa.Numeric(9, 6)),
        sa.Column("urgency", sa.String(24), nullable=False),
        sa.Column("contact_ciphertext", sa.LargeBinary(), nullable=False),
        sa.Column("description", sa.String(600)),
        sa.Column("status", sa.String(32), nullable=False, server_default="received"),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
    )
    op.create_index(
        "ix_assistance_needs_tracking_code", "assistance_needs", ["tracking_code"], unique=True
    )
    op.create_index("ix_assistance_needs_territory_id", "assistance_needs", ["territory_id"])


def downgrade() -> None:
    op.drop_table("assistance_needs")
