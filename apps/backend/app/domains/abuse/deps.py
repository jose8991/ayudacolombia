from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db

from .repository import RateLimitRepository
from .service import RateLimitService


def requester_subject(request: Request) -> str:
    host = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")[:160]
    return f"{host}|{user_agent}"


async def enforce_login_rate_limit(
    request: Request, db: Annotated[AsyncSession, Depends(get_db)]
) -> None:
    service = RateLimitService(RateLimitRepository(db), get_settings().jwt_secret)
    await service.check("login", requester_subject(request), 5)


async def enforce_public_submission_limit(
    request: Request, db: Annotated[AsyncSession, Depends(get_db)]
) -> None:
    service = RateLimitService(RateLimitRepository(db), get_settings().jwt_secret)
    await service.check("public-submission", requester_subject(request), 12)
