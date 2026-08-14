from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .models import CitizenReport


class ReportRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def add(self, report: CitizenReport) -> CitizenReport:
        self.session.add(report)
        await self.session.commit()
        await self.session.refresh(report)
        return report

    async def get_by_tracking_code(self, code: str) -> CitizenReport | None:
        report: CitizenReport | None = await self.session.scalar(
            select(CitizenReport).where(CitizenReport.tracking_code == code.upper())
        )
        return report

    async def get_by_idempotency_key(self, key_hash: str) -> CitizenReport | None:
        report: CitizenReport | None = await self.session.scalar(
            select(CitizenReport).where(CitizenReport.idempotency_key_hash == key_hash)
        )
        return report

    async def get(self, report_id: UUID) -> CitizenReport | None:
        return await self.session.get(CitizenReport, report_id)

    async def list_pending(self, territory_ids: set[str] | None) -> list[CitizenReport]:
        statement = select(CitizenReport).where(CitizenReport.verification_status == "reported")
        if territory_ids is not None:
            if not territory_ids:
                return []
            statement = statement.where(CitizenReport.territory_id.in_(territory_ids))
        result = await self.session.scalars(
            statement.order_by(CitizenReport.created_at.asc()).limit(100)
        )
        return list(result.all())

    async def list_public(self, territory_id: str) -> list[CitizenReport]:
        result = await self.session.scalars(
            select(CitizenReport)
            .where(
                CitizenReport.territory_id == territory_id,
                CitizenReport.verification_status.in_(["verified", "official"]),
            )
            .order_by(CitizenReport.updated_at.desc())
            .limit(500)
        )
        return list(result.all())

    async def moderate(
        self, report: CitizenReport, verification_status: str, note: str | None
    ) -> CitizenReport:
        report.verification_status = verification_status
        report.moderation_note = note
        await self.session.commit()
        await self.session.refresh(report)
        return report
