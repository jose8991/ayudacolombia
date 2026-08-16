from datetime import UTC, datetime
from typing import Protocol
from uuid import UUID

from app.domains.identity.policy import evaluate_access
from app.domains.identity.schemas import Actor, Permission, ResourceContext

from .exceptions import (
    CenterAccessDeniedError,
    CenterNotFoundError,
    EmptyCenterUpdateError,
)
from .models import AidCenter, CenterPublication
from .schemas import (
    CenterCreate,
    CenterPublicationCreate,
    CenterPublicationRead,
    CenterRead,
    CenterUpdate,
)


class CenterRepositoryPort(Protocol):
    async def list_for_territory(
        self, territory_id: str, include_community: bool = False
    ) -> list[AidCenter]: ...
    async def list_for_actor(self, actor: Actor) -> list[AidCenter]: ...
    async def add(self, center: AidCenter) -> AidCenter: ...
    async def get(self, center_id: UUID) -> AidCenter | None: ...
    async def list_publications(self, center_id: UUID) -> list[CenterPublication]: ...
    async def add_publication(self, publication: CenterPublication) -> CenterPublication: ...
    async def update(
        self, center: AidCenter, changes: dict[str, object], moment: datetime
    ) -> AidCenter: ...


class CenterService:
    def __init__(self, repository: CenterRepositoryPort) -> None:
        self.repository = repository

    async def list_public(
        self, territory_id: str, include_community: bool = False
    ) -> list[CenterRead]:
        centers = await self.repository.list_for_territory(territory_id, include_community)
        return [CenterRead.model_validate(center) for center in centers]

    async def create(self, payload: CenterCreate, actor: Actor) -> CenterRead:
        decision = evaluate_access(
            actor,
            Permission.CENTER_UPDATE,
            ResourceContext(
                territory_id=payload.territory_id,
                organization_id=payload.organization_id,
            ),
        )
        if not decision.allowed:
            raise CenterAccessDeniedError
        center = await self.repository.add(AidCenter(**payload.model_dump()))
        return CenterRead.model_validate(center)

    async def update(self, center_id: UUID, payload: CenterUpdate, actor: Actor) -> CenterRead:
        """Cambiar el estado de un centro es la operación más frecuente de la emergencia.

        Un albergue que se llena y sigue diciendo "abierto para recibir ayudas" manda gente
        y donaciones a un sitio que ya no puede recibirlas. Por eso esto existe.
        """
        center = await self.repository.get(center_id)
        if center is None:
            raise CenterNotFoundError
        decision = evaluate_access(
            actor,
            Permission.CENTER_UPDATE,
            ResourceContext(
                center_id=center.id,
                territory_id=center.territory_id,
                organization_id=center.organization_id,
            ),
        )
        if not decision.allowed:
            raise CenterAccessDeniedError
        changes = payload.model_dump(exclude_unset=True)
        if not changes:
            raise EmptyCenterUpdateError
        # Tocarlo cuenta como confirmarlo: quien lo actualiza está diciendo que sigue vivo.
        return CenterRead.model_validate(
            await self.repository.update(center, changes, datetime.now(UTC))
        )

    async def list_for_actor(self, actor: Actor) -> list[CenterRead]:
        centers = await self.repository.list_for_actor(actor)
        return [CenterRead.model_validate(center) for center in centers]

    async def list_publications(self, center_id: UUID) -> list[CenterPublicationRead]:
        if await self.repository.get(center_id) is None:
            raise CenterNotFoundError
        publications = await self.repository.list_publications(center_id)
        return [CenterPublicationRead.model_validate(item) for item in publications]

    async def publish(
        self,
        center_id: UUID,
        payload: CenterPublicationCreate,
        actor: Actor,
    ) -> CenterPublicationRead:
        center = await self.repository.get(center_id)
        if center is None:
            raise CenterNotFoundError
        decision = evaluate_access(
            actor,
            Permission.CENTER_UPDATE,
            ResourceContext(
                center_id=center.id,
                territory_id=center.territory_id,
                organization_id=center.organization_id,
            ),
        )
        if not decision.allowed:
            raise CenterAccessDeniedError
        publication = CenterPublication(
            center_id=center.id,
            author_id=actor.id,
            **payload.model_dump(),
        )
        created = await self.repository.add_publication(publication)
        return CenterPublicationRead.model_validate(created)
