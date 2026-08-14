from uuid import UUID

from fastapi import APIRouter

from .policy import evaluate_access
from .schemas import AccessDecision, AccessEvaluation, Actor, Role

router = APIRouter(prefix="/access", tags=["access"])


@router.get("/demo-session", response_model=Actor)
async def demo_session() -> Actor:
    return Actor(
        id=UUID("10000000-0000-0000-0000-000000000001"),
        display_name="Coordinación Pereira (demo)",
        organization_id=UUID("20000000-0000-0000-0000-000000000001"),
        roles={Role.TERRITORIAL_COORDINATOR},
        territory_ids={"co-ris-pereira"},
    )


@router.post("/evaluate", response_model=AccessDecision)
async def evaluate(payload: AccessEvaluation) -> AccessDecision:
    return evaluate_access(payload.actor, payload.permission, payload.resource)
