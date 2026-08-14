from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_actor
from app.domains.abuse.deps import enforce_login_rate_limit

from .auth_schemas import (
    CenterOperatorInvitationCreate,
    InvitationAccept,
    InvitationResponse,
    LoginRequest,
    TokenResponse,
)
from .repository import IdentityRepository
from .schemas import Actor
from .service import IdentityService

router = APIRouter(prefix="/auth", tags=["auth"])


def get_identity_service(db: Annotated[AsyncSession, Depends(get_db)]) -> IdentityService:
    return IdentityService(IdentityRepository(db))


@router.post("/login", response_model=TokenResponse)
async def login(
    payload: LoginRequest,
    service: Annotated[IdentityService, Depends(get_identity_service)],
    _: Annotated[None, Depends(enforce_login_rate_limit)],
) -> TokenResponse:
    return await service.login(payload)


@router.get("/me", response_model=Actor)
async def me(actor: Annotated[Actor, Depends(get_current_actor)]) -> Actor:
    return actor


@router.post("/invitations/center-operator", response_model=InvitationResponse)
async def invite_center_operator(
    payload: CenterOperatorInvitationCreate,
    actor: Annotated[Actor, Depends(get_current_actor)],
    service: Annotated[IdentityService, Depends(get_identity_service)],
) -> InvitationResponse:
    return await service.invite_center_operator(payload, actor)


@router.post("/invitations/accept", response_model=TokenResponse)
async def accept_invitation(
    payload: InvitationAccept,
    service: Annotated[IdentityService, Depends(get_identity_service)],
) -> TokenResponse:
    return await service.accept_invitation(payload)
