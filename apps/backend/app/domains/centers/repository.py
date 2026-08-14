from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.identity.schemas import Actor, Role

from .models import AidCenter, CenterPublication


class CenterRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_for_territory(
        self, territory_id: str, include_community: bool = False
    ) -> list[AidCenter]:
        visible_statuses = (
            ["official", "verified", "reported"] if include_community else ["official", "verified"]
        )
        result = await self.session.scalars(
            select(AidCenter)
            .where(
                AidCenter.territory_id == territory_id,
                AidCenter.verification_status.in_(visible_statuses),
            )
            .order_by(AidCenter.name)
        )
        return list(result.all())

    async def list_for_actor(self, actor: Actor) -> list[AidCenter]:
        statement = select(AidCenter).order_by(AidCenter.name)
        if Role.ADMINISTRATOR in actor.roles:
            pass
        elif actor.center_ids:
            statement = statement.where(AidCenter.id.in_(actor.center_ids))
        elif actor.territory_ids and actor.roles & {Role.OFFICIAL, Role.TERRITORIAL_COORDINATOR}:
            statement = statement.where(AidCenter.territory_id.in_(actor.territory_ids))
        else:
            return []
        return list((await self.session.scalars(statement)).all())

    async def add(self, center: AidCenter) -> AidCenter:
        self.session.add(center)
        await self.session.commit()
        await self.session.refresh(center)
        return center

    async def get(self, center_id: object) -> AidCenter | None:
        return await self.session.get(AidCenter, center_id)

    async def list_publications(self, center_id: object) -> list[CenterPublication]:
        result = await self.session.scalars(
            select(CenterPublication)
            .where(CenterPublication.center_id == center_id, CenterPublication.status == "active")
            .order_by(CenterPublication.published_at.desc())
            .limit(20)
        )
        return list(result.all())

    async def add_publication(self, publication: CenterPublication) -> CenterPublication:
        self.session.add(publication)
        await self.session.commit()
        await self.session.refresh(publication)
        return publication
