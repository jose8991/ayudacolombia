"""Permite que un centro publique de qué ya tiene suficiente."""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "0013_sufficient_items"
down_revision: str | None = "0012_report_contact"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "center_publications",
        sa.Column("sufficient_items", JSONB(), nullable=False, server_default="[]"),
    )


def downgrade() -> None:
    op.drop_column("center_publications", "sufficient_items")
