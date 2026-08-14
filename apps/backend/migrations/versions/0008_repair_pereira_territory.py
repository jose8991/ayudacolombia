"""Repair the canonical Pereira territory used by the public map."""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0008_repair_pereira_territory"
down_revision: str | None = "0007_center_verification_status"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        sa.text("""
        UPDATE territories
        SET name = 'Pereira',
            kind = 'municipality',
            parent_id = 'co-ris',
            center_latitude = 4.8133,
            center_longitude = -75.6946,
            default_zoom = 12.3
        WHERE id = 'co-ris-pereira'
        """)
    )


def downgrade() -> None:
    pass
