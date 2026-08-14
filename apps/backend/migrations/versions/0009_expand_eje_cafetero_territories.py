"""Expand selectable municipalities using the official DANE municipal map."""

# ruff: noqa: E501

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0009_expand_territories"
down_revision: str | None = "0008_repair_pereira_territory"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

NEW_TERRITORY_IDS = (
    "co-qui-buenavista", "co-qui-calarca", "co-qui-circasia", "co-qui-cordoba",
    "co-qui-filandia", "co-qui-genova", "co-qui-la-tebaida", "co-qui-montenegro",
    "co-qui-pijao", "co-qui-quimbaya", "co-qui-salento", "co-ris-apia",
    "co-ris-balboa", "co-ris-belen-de-umbria", "co-ris-guatica", "co-ris-la-celia",
    "co-ris-la-virginia", "co-ris-marsella", "co-ris-mistrato", "co-ris-pueblo-rico",
    "co-ris-quinchia", "co-ris-santa-rosa-de-cabal", "co-ris-santuario",
)


def upgrade() -> None:
    op.add_column("territories", sa.Column("external_code", sa.String(16)))
    op.create_unique_constraint("uq_territories_external_code", "territories", ["external_code"])
    op.execute(sa.text("""
        UPDATE territories SET external_code = CASE id
          WHEN 'co-ris-pereira' THEN '66001'
          WHEN 'co-ris-dosquebradas' THEN '66170'
          WHEN 'co-qui-armenia' THEN '63001'
        END WHERE id IN ('co-ris-pereira', 'co-ris-dosquebradas', 'co-qui-armenia')
    """))
    op.execute(sa.text("""
        INSERT INTO territories
          (id, name, kind, parent_id, center_latitude, center_longitude, default_zoom, external_code)
        VALUES
          ('co-qui-buenavista', 'Buenavista', 'municipality', 'co-qui', 4.36680, -75.74651, 12.0, '63111'),
          ('co-qui-calarca', 'Calarcá', 'municipality', 'co-qui', 4.45666, -75.67728, 11.5, '63130'),
          ('co-qui-circasia', 'Circasia', 'municipality', 'co-qui', 4.59233, -75.68577, 11.5, '63190'),
          ('co-qui-cordoba', 'Córdoba', 'municipality', 'co-qui', 4.40042, -75.64437, 12.0, '63212'),
          ('co-qui-filandia', 'Filandia', 'municipality', 'co-qui', 4.66974, -75.65939, 11.5, '63272'),
          ('co-qui-genova', 'Génova', 'municipality', 'co-qui', 4.19752, -75.74506, 11.0, '63302'),
          ('co-qui-la-tebaida', 'La Tebaida', 'municipality', 'co-qui', 4.43612, -75.82470, 11.5, '63401'),
          ('co-qui-montenegro', 'Montenegro', 'municipality', 'co-qui', 4.53050, -75.80925, 11.5, '63470'),
          ('co-qui-pijao', 'Pijao', 'municipality', 'co-qui', 4.30235, -75.68617, 11.0, '63548'),
          ('co-qui-quimbaya', 'Quimbaya', 'municipality', 'co-qui', 4.60140, -75.78847, 11.5, '63594'),
          ('co-qui-salento', 'Salento', 'municipality', 'co-qui', 4.61397, -75.51523, 10.5, '63690'),
          ('co-ris-apia', 'Apía', 'municipality', 'co-ris', 5.12234, -75.94825, 11.0, '66045'),
          ('co-ris-balboa', 'Balboa', 'municipality', 'co-ris', 4.91761, -75.93410, 11.0, '66075'),
          ('co-ris-belen-de-umbria', 'Belén de Umbría', 'municipality', 'co-ris', 5.20367, -75.85901, 11.0, '66088'),
          ('co-ris-guatica', 'Guática', 'municipality', 'co-ris', 5.32388, -75.80055, 11.0, '66318'),
          ('co-ris-la-celia', 'La Celia', 'municipality', 'co-ris', 4.98670, -76.00937, 11.0, '66383'),
          ('co-ris-la-virginia', 'La Virginia', 'municipality', 'co-ris', 4.91214, -75.86053, 12.0, '66400'),
          ('co-ris-marsella', 'Marsella', 'municipality', 'co-ris', 4.95456, -75.75148, 10.5, '66440'),
          ('co-ris-mistrato', 'Mistrató', 'municipality', 'co-ris', 5.40664, -75.94021, 10.0, '66456'),
          ('co-ris-pueblo-rico', 'Pueblo Rico', 'municipality', 'co-ris', 5.29219, -76.08673, 10.0, '66572'),
          ('co-ris-quinchia', 'Quinchía', 'municipality', 'co-ris', 5.33138, -75.71019, 11.0, '66594'),
          ('co-ris-santa-rosa-de-cabal', 'Santa Rosa de Cabal', 'municipality', 'co-ris', 4.85378, -75.56913, 10.5, '66682'),
          ('co-ris-santuario', 'Santuario', 'municipality', 'co-ris', 5.02305, -75.95551, 11.0, '66687')
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name, parent_id = EXCLUDED.parent_id,
          center_latitude = EXCLUDED.center_latitude,
          center_longitude = EXCLUDED.center_longitude,
          default_zoom = EXCLUDED.default_zoom,
          external_code = EXCLUDED.external_code;
    """))


def downgrade() -> None:
    quoted_ids = ", ".join(f"'{territory_id}'" for territory_id in NEW_TERRITORY_IDS)
    op.execute(sa.text(f"DELETE FROM territories WHERE id IN ({quoted_ids})"))  # noqa: S608
    op.drop_constraint("uq_territories_external_code", "territories", type_="unique")
    op.drop_column("territories", "external_code")
