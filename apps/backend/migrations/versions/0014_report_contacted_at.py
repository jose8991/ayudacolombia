"""Registra cuándo se contactó a quien publicó un reporte u ofreció ayuda."""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0014_report_contacted"
down_revision: str | None = "0013_sufficient_items"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "citizen_reports",
        sa.Column("contacted_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("citizen_reports", "contacted_at")
