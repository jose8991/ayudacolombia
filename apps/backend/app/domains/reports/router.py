from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Header, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_actor
from app.domains.abuse.deps import enforce_public_submission_limit
from app.domains.identity.schemas import Actor

from .repository import ReportRepository
from .schemas import (
    PublicReportRead,
    ReportCreate,
    ReportModerationUpdate,
    ReportRead,
    ReportStatusRead,
)
from .service import ReportService

router = APIRouter(prefix="/reports", tags=["reports"])


def get_report_repository(db: Annotated[AsyncSession, Depends(get_db)]) -> ReportRepository:
    return ReportRepository(db)


def get_report_service(
    repository: Annotated[ReportRepository, Depends(get_report_repository)],
) -> ReportService:
    return ReportService(repository)


@router.post("", response_model=ReportRead, status_code=status.HTTP_201_CREATED)
async def create_report(
    payload: ReportCreate,
    service: Annotated[ReportService, Depends(get_report_service)],
    idempotency_key: Annotated[str, Header(alias="Idempotency-Key", min_length=16, max_length=128)],
    _: Annotated[None, Depends(enforce_public_submission_limit)],
) -> ReportRead:
    return await service.create(payload, idempotency_key)


@router.get("/public", response_model=list[PublicReportRead])
async def public_reports(
    territory_id: Annotated[str, Query(min_length=3, max_length=80)],
    service: Annotated[ReportService, Depends(get_report_service)],
    only_confirmed: bool = False,
) -> list[PublicReportRead]:
    return await service.list_public(territory_id, only_confirmed)


@router.get("/moderation/pending", response_model=list[ReportRead])
async def pending_reports(
    actor: Annotated[Actor, Depends(get_current_actor)],
    service: Annotated[ReportService, Depends(get_report_service)],
) -> list[ReportRead]:
    return await service.list_pending(actor)


@router.patch("/moderation/{report_id}", response_model=ReportStatusRead)
async def moderate_report(
    report_id: UUID,
    payload: ReportModerationUpdate,
    actor: Annotated[Actor, Depends(get_current_actor)],
    service: Annotated[ReportService, Depends(get_report_service)],
) -> ReportStatusRead:
    return await service.moderate(report_id, payload, actor)


@router.get("/{code}/status", response_model=ReportStatusRead)
async def report_status(
    code: str, service: Annotated[ReportService, Depends(get_report_service)]
) -> ReportStatusRead:
    return await service.get_status(code)
