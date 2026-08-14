from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .models import AssistanceNeed


class NeedRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def add(self, need: AssistanceNeed) -> AssistanceNeed:
        self.session.add(need)
        await self.session.commit()
        await self.session.refresh(need)
        return need

    async def get_by_tracking_code(self, code: str) -> AssistanceNeed | None:
        need: AssistanceNeed | None = await self.session.scalar(
            select(AssistanceNeed).where(AssistanceNeed.tracking_code == code.upper())
        )
        return need

    async def get_by_idempotency_key(self, key_hash: str) -> AssistanceNeed | None:
        need: AssistanceNeed | None = await self.session.scalar(
            select(AssistanceNeed).where(AssistanceNeed.idempotency_key_hash == key_hash)
        )
        return need
