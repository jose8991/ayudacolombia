"""Store an optional encrypted contact for citizen reports and help offers."""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0012_report_contact"
down_revision: str | None = "0011_idempotency"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("citizen_reports", sa.Column("contact_ciphertext", sa.LargeBinary()))


def downgrade() -> None:
    op.drop_column("citizen_reports", "contact_ciphertext")
