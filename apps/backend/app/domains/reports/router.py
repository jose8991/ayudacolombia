from decimal import Decimal
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_actor
from app.domains.abuse.deps import enforce_public_submission_limit
from app.domains.centers.router import get_center_service
from app.domains.centers.schemas import CenterCreate, CenterRead, CenterStatus
from app.domains.centers.service import CenterService
from app.domains.identity.schemas import Actor

from .repository import ReportRepository
from .schemas import (
    PublicReportRead,
    ReportAttendance,
    ReportCreate,
    ReportEnRoute,
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


@router.post("/moderation/{report_id}/promote", status_code=status.HTTP_201_CREATED)
async def promote_report_to_center(
    report_id: UUID,
    actor: Annotated[Actor, Depends(get_current_actor)],
    service: Annotated[ReportService, Depends(get_report_service)],
    centers: Annotated[CenterService, Depends(get_center_service)],
) -> CenterRead:
    """Convierte un lugar reportado por la ciudadanía en un centro que puede operar.

    Un reporte solo dice "aquí hay un acopio". Un centro además publica su horario, qué
    recibe y de qué ya tiene suficiente. Sin esta conversión había que volver a teclear
    todo a mano, y el reporte quedaba como punto de segunda para siempre.
    """
    report = await service.take_for_promotion(report_id, actor)
    if report.latitude is None or report.longitude is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Ese reporte no trae ubicación exacta: regístralo estando en el lugar.",
        )
    if report.category not in {"shelter", "aid-center"}:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Solo un albergue o un punto de acopio puede convertirse en centro.",
        )
    if actor.organization_id is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Tu cuenta no pertenece a ninguna organización.",
        )
    center = await centers.create(
        CenterCreate(
            organization_id=actor.organization_id,
            territory_id=report.territory_id,
            name=report.title,
            address=report.neighborhood_code or report.title,
            latitude=Decimal(str(report.latitude)),
            longitude=Decimal(str(report.longitude)),
            status=CenterStatus.OPEN,
            schedule=report.description[:255],
            accepted_items=[],
        ),
        actor,
    )
    await service.close_as_promoted(report)
    return center


@router.post("/moderation/{report_id}/contacted", response_model=ReportRead)
async def mark_report_contacted(
    report_id: UUID,
    actor: Annotated[Actor, Depends(get_current_actor)],
    service: Annotated[ReportService, Depends(get_report_service)],
) -> ReportRead:
    return await service.mark_contacted(report_id, actor)


@router.post("/{report_id}/en-route", response_model=ReportRead)
async def mark_report_en_route(
    report_id: UUID,
    payload: ReportEnRoute,
    actor: Annotated[Actor, Depends(get_current_actor)],
    service: Annotated[ReportService, Depends(get_report_service)],
) -> ReportRead:
    """Un grupo va para allá. Caduca solo a las seis horas."""
    return await service.mark_en_route(report_id, payload, actor)


@router.post("/{report_id}/attended", response_model=ReportRead)
async def mark_report_attended(
    report_id: UUID,
    payload: ReportAttendance,
    actor: Annotated[Actor, Depends(get_current_actor)],
    service: Annotated[ReportService, Depends(get_report_service)],
) -> ReportRead:
    """Un grupo llegó al sitio y entregó. Se puede deshacer si se marcó el punto errado."""
    return await service.mark_attended(report_id, payload, actor)


@router.get("/{code}/status", response_model=ReportStatusRead)
async def report_status(
    code: str, service: Annotated[ReportService, Depends(get_report_service)]
) -> ReportStatusRead:
    return await service.get_status(code)
