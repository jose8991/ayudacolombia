from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_actor
from app.domains.identity.schemas import Actor

from .repository import CenterRepository
from .schemas import (
    CenterCreate,
    CenterPublicationCreate,
    CenterPublicationRead,
    CenterRead,
    CenterUpdate,
)
from .service import CenterService

router = APIRouter(prefix="/centers", tags=["centers"])


def get_center_repository(
    db: Annotated[AsyncSession, Depends(get_db)],
) -> CenterRepository:
    return CenterRepository(db)


def get_center_service(
    repository: Annotated[CenterRepository, Depends(get_center_repository)],
) -> CenterService:
    return CenterService(repository)


@router.get("", response_model=list[CenterRead])
async def list_centers(
    territory_id: Annotated[str, Query(min_length=3, max_length=80)],
    service: Annotated[CenterService, Depends(get_center_service)],
    include_community: Annotated[bool, Query()] = False,
) -> list[CenterRead]:
    return await service.list_public(territory_id, include_community)


@router.post("", response_model=CenterRead, status_code=status.HTTP_201_CREATED)
async def create_center(
    payload: CenterCreate,
    actor: Annotated[Actor, Depends(get_current_actor)],
    service: Annotated[CenterService, Depends(get_center_service)],
) -> CenterRead:
    return await service.create(payload, actor)


@router.patch("/{center_id}", response_model=CenterRead)
async def update_center(
    center_id: UUID,
    payload: CenterUpdate,
    actor: Annotated[Actor, Depends(get_current_actor)],
    service: Annotated[CenterService, Depends(get_center_service)],
) -> CenterRead:
    """Corregir un centro, y sobre todo decir que se llenó o que cerró."""
    return await service.update(center_id, payload, actor)


@router.get("/mine", response_model=list[CenterRead])
async def list_my_centers(
    actor: Annotated[Actor, Depends(get_current_actor)],
    service: Annotated[CenterService, Depends(get_center_service)],
) -> list[CenterRead]:
    return await service.list_for_actor(actor)


@router.get("/{center_id}/publications", response_model=list[CenterPublicationRead])
async def list_center_publications(
    center_id: UUID,
    service: Annotated[CenterService, Depends(get_center_service)],
) -> list[CenterPublicationRead]:
    return await service.list_publications(center_id)


@router.post(
    "/{center_id}/publications",
    response_model=CenterPublicationRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_center_publication(
    center_id: UUID,
    payload: CenterPublicationCreate,
    actor: Annotated[Actor, Depends(get_current_actor)],
    service: Annotated[CenterService, Depends(get_center_service)],
) -> CenterPublicationRead:
    return await service.publish(center_id, payload, actor)
