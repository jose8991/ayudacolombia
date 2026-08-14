"""Add an explicit trust status to public aid centers."""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0007_center_verification_status"
down_revision: str | None = "0006_citizen_reports"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "aid_centers",
        sa.Column("verification_status", sa.String(24), nullable=False, server_default="verified"),
    )
    op.create_index(
        "ix_aid_centers_verification_status",
        "aid_centers",
        ["verification_status"],
    )


def downgrade() -> None:
    op.drop_index("ix_aid_centers_verification_status", table_name="aid_centers")
    op.drop_column("aid_centers", "verification_status")
