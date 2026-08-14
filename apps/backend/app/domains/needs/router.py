from typing import Annotated

from fastapi import APIRouter, Depends, Header, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.domains.abuse.deps import enforce_public_submission_limit

from .models import AssistanceNeed
from .repository import NeedRepository
from .schemas import NeedCreate, NeedReceipt, NeedStatus
from .service import NeedService

router = APIRouter(prefix="/needs", tags=["needs"])


@router.post("", response_model=NeedReceipt, status_code=status.HTTP_201_CREATED)
async def create_need(
    payload: NeedCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    idempotency_key: Annotated[str, Header(alias="Idempotency-Key", min_length=16, max_length=128)],
    _: Annotated[None, Depends(enforce_public_submission_limit)],
) -> NeedReceipt:
    return await NeedService(NeedRepository(db)).create(payload, idempotency_key)


@router.get("/{code}", response_model=NeedStatus)
async def need_status(code: str, db: Annotated[AsyncSession, Depends(get_db)]) -> AssistanceNeed:
    return await NeedService(NeedRepository(db)).get_status(code)
