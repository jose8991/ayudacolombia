"""Add durable idempotency evidence to public submissions.

Revision ID: 0011_idempotency
Revises: 0010_privacy_evidence
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0011_idempotency"
down_revision: str | None = "0010_privacy_evidence"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "abuse_rate_limits",
        sa.Column("scope", sa.String(48), nullable=False),
        sa.Column("subject_hash", sa.String(64), nullable=False),
        sa.Column("window_started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("request_count", sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint("scope", "subject_hash", "window_started_at"),
    )
    for table in ("assistance_needs", "citizen_reports"):
        op.add_column(table, sa.Column("idempotency_key_hash", sa.String(64), nullable=True))
        op.add_column(table, sa.Column("request_fingerprint", sa.String(64), nullable=True))
        op.create_unique_constraint(
            f"uq_{table}_idempotency_key_hash", table, ["idempotency_key_hash"]
        )


def downgrade() -> None:
    for table in ("citizen_reports", "assistance_needs"):
        op.drop_constraint(f"uq_{table}_idempotency_key_hash", table, type_="unique")
        op.drop_column(table, "request_fingerprint")
        op.drop_column(table, "idempotency_key_hash")
    op.drop_table("abuse_rate_limits")
