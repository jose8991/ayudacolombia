"""Registra que alguien llegó físicamente al lugar y entregó.

Distinto de `contacted_at`, que sólo dice que se habló por teléfono. Un grupo que sube en
camionetas a una vereda necesita saber qué sitios ya recibieron ayuda para no repetir el
viaje, y sobre todo cuáles no ha visitado nadie.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0015_report_attended"
down_revision: str | None = "0014_report_contacted"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "citizen_reports",
        sa.Column("attended_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "citizen_reports",
        sa.Column("attended_by_organization_id", sa.dialects.postgresql.UUID(as_uuid=True)),
    )
    op.add_column("citizen_reports", sa.Column("attended_note", sa.String(300), nullable=True))


def downgrade() -> None:
    op.drop_column("citizen_reports", "attended_note")
    op.drop_column("citizen_reports", "attended_by_organization_id")
    op.drop_column("citizen_reports", "attended_at")
