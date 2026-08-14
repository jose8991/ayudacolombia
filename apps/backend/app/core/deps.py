from typing import Annotated
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import decode_access_token
from app.domains.identity.repository import IdentityRepository
from app.domains.identity.schemas import Actor, Role

bearer = HTTPBearer(auto_error=False)


async def get_current_actor(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Actor:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED, detail="Sesión inválida o vencida"
    )
    if credentials is None:
        raise unauthorized
    subject = decode_access_token(credentials.credentials)
    if subject is None:
        raise unauthorized
    try:
        user_id = UUID(subject)
    except ValueError as exc:
        raise unauthorized from exc
    repository = IdentityRepository(db)
    user = await repository.get_user_by_id(user_id)
    if user is None or not user.is_active:
        raise unauthorized
    memberships, territories, centers = await repository.actor_context(user)
    return Actor(
        id=user.id,
        display_name=user.display_name,
        organization_id=memberships[0].organization_id if memberships else None,
        roles={Role(membership.role) for membership in memberships},
        territory_ids=territories,
        center_ids=centers,
    )
