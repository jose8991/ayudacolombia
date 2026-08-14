"""Seed a scalable territorial hierarchy."""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0005_territory_hierarchy"
down_revision: str | None = "0004_center_assignments"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("territories", sa.Column("center_latitude", sa.Float()))
    op.add_column("territories", sa.Column("center_longitude", sa.Float()))
    op.add_column("territories", sa.Column("default_zoom", sa.Float()))
    op.execute(
        sa.text("""
        INSERT INTO territories (
          id, name, kind, parent_id, center_latitude, center_longitude, default_zoom
        ) VALUES
          ('co', 'Colombia', 'country', NULL, 4.5709, -74.2973, 4.7),
          ('co-ris', 'Risaralda', 'department', 'co', 5.3158, -75.9928, 8.0),
          ('co-qui', 'Quindío', 'department', 'co', 4.4610, -75.6674, 9.0),
          ('co-ris-dosquebradas', 'Dosquebradas', 'municipality', 'co-ris', 4.8344, -75.6759, 12.4),
          ('co-qui-armenia', 'Armenia', 'municipality', 'co-qui', 4.5339, -75.6811, 12.2)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name, kind = EXCLUDED.kind, parent_id = EXCLUDED.parent_id,
          center_latitude = EXCLUDED.center_latitude, center_longitude = EXCLUDED.center_longitude,
          default_zoom = EXCLUDED.default_zoom
    """)
    )
    op.execute(
        sa.text("""
        UPDATE territories SET parent_id = 'co-ris', center_latitude = 4.8133,
          center_longitude = -75.6946, default_zoom = 12.3
        WHERE id = 'co-ris-pereira'
    """)
    )


def downgrade() -> None:
    op.execute(sa.text("UPDATE territories SET parent_id = NULL WHERE id = 'co-ris-pereira'"))
    op.execute(
        sa.text(
            "DELETE FROM territories WHERE id IN ('co-ris-dosquebradas', 'co-qui-armenia', 'co-ris', 'co-qui', 'co')"  # noqa: E501
        )
    )
    op.drop_column("territories", "default_zoom")
    op.drop_column("territories", "center_longitude")
    op.drop_column("territories", "center_latitude")
