from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


class TerritoryRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def public_tree(self) -> list[dict[str, object]]:
        result = await self.session.execute(
            text("""
            WITH RECURSIVE descendants AS (
                SELECT id AS root_id, id FROM territories
                UNION ALL
                SELECT descendants.root_id, child.id
                FROM descendants JOIN territories child ON child.parent_id = descendants.id
            ), center_counts AS (
                SELECT territory_id, count(*) AS total
                FROM aid_centers WHERE status IN ('open', 'almost_full') GROUP BY territory_id
            ), need_counts AS (
                SELECT territory_id, count(*) AS total
                FROM assistance_needs WHERE status NOT IN ('closed', 'resolved')
                GROUP BY territory_id
            )
            SELECT territory.id, territory.name, territory.kind, territory.parent_id,
                   territory.external_code,
                   territory.center_latitude, territory.center_longitude, territory.default_zoom,
                   coalesce(sum(center_counts.total), 0)::int AS open_centers,
                   coalesce(sum(need_counts.total), 0)::int AS active_needs
            FROM territories territory
            JOIN descendants ON descendants.root_id = territory.id
            LEFT JOIN center_counts ON center_counts.territory_id = descendants.id
            LEFT JOIN need_counts ON need_counts.territory_id = descendants.id
            GROUP BY territory.id
            ORDER BY territory.kind, territory.name
        """)
        )
        return [
            dict(row, has_activity=bool(row.open_centers or row.active_needs))
            for row in result.mappings()
        ]
