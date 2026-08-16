"""Registra que un grupo va en camino a un sitio, para que dos no salgan al mismo.

Caduca solo: ver `EN_ROUTE_WINDOW` en `app/core/freshness.py`. Un aviso permanente dejaría
el sitio marcado como cubierto mientras no llega nadie.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0016_report_en_route"
down_revision: str | None = "0015_report_attended"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "citizen_reports",
        sa.Column("en_route_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "citizen_reports",
        sa.Column("en_route_by_organization_id", sa.dialects.postgresql.UUID(as_uuid=True)),
    )


def downgrade() -> None:
    op.drop_column("citizen_reports", "en_route_by_organization_id")
    op.drop_column("citizen_reports", "en_route_at")
