from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db

from .repository import TerritoryRepository
from .schemas import PublicTerritory

router = APIRouter(prefix="/territories", tags=["territories"])


@router.get("/tree", response_model=list[PublicTerritory])
async def public_territory_tree(
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[dict[str, object]]:
    return await TerritoryRepository(db).public_tree()
