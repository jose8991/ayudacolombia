from datetime import UTC, datetime
from decimal import Decimal
from uuid import UUID, uuid4

import pytest

from app.domains.centers.exceptions import (
    CenterAccessDeniedError,
    CenterNotFoundError,
    EmptyCenterUpdateError,
)
from app.domains.centers.schemas import CenterCreate, CenterStatus, CenterUpdate
from app.domains.centers.service import CenterService
from app.domains.identity.schemas import Actor, Role

ACTOR_ID = UUID("10000000-0000-0000-0000-000000000001")
ORG_ID = UUID("20000000-0000-0000-0000-000000000001")


class FakeCenterRepository:
    def __init__(self, center: object | None = None) -> None:
        self.last_public_query: tuple[str, bool] | None = None
        self.center = center

    async def list_for_territory(self, territory_id: str, include_community: bool = False):
        self.last_public_query = (territory_id, include_community)
        return []

    async def list_for_actor(self, actor):
        return []

    async def add(self, center):
        return center

    async def get(self, center_id):
        return self.center

    async def update(self, center, changes, moment):
        for field, value in changes.items():
            setattr(center, field, value)
        center.last_verified_at = moment
        return center

    async def list_publications(self, center_id):
        return []

    async def add_publication(self, publication):
        return publication


def center_payload() -> CenterCreate:
    return CenterCreate(
        organization_id=ORG_ID,
        territory_id="co-ris-pereira",
        name="Centro comunitario",
        address="Pereira",
        latitude=4.8133,
        longitude=-75.6946,
    )


async def test_public_centers_exclude_community_by_default() -> None:
    repository = FakeCenterRepository()
    await CenterService(repository).list_public("co-ris-pereira")
    assert repository.last_public_query == ("co-ris-pereira", False)


async def test_community_centers_require_explicit_opt_in() -> None:
    repository = FakeCenterRepository()
    await CenterService(repository).list_public("co-ris-pereira", include_community=True)
    assert repository.last_public_query == ("co-ris-pereira", True)


async def test_actor_without_center_permission_cannot_create_center() -> None:
    actor = Actor(id=ACTOR_ID, display_name="Auditor", roles={Role.AUDITOR})
    with pytest.raises(CenterAccessDeniedError):
        await CenterService(FakeCenterRepository()).create(center_payload(), actor)


CENTER_ID = UUID("30000000-0000-0000-0000-000000000001")


class FakeCenter:
    """Lo mínimo que el servicio toca de un centro guardado."""

    def __init__(self) -> None:
        self.id = CENTER_ID
        self.organization_id = ORG_ID
        self.territory_id = "co-ris-pereira"
        self.name = "Albergue Coliseo Mayor"
        self.address = "Carrera 8, Pereira"
        self.latitude = Decimal("4.8133")
        self.longitude = Decimal("-75.6946")
        self.status = "open"
        self.schedule = None
        self.accepted_items: list[str] = []
        self.verification_status = "verified"
        self.last_verified_at = None
        self.updated_at = datetime(2026, 8, 14, tzinfo=UTC)


def operador(center_ids: set[UUID]) -> Actor:
    return Actor(
        id=uuid4(),
        display_name="Responsable del albergue",
        organization_id=ORG_ID,
        roles={Role.CENTER_OPERATOR},
        territory_ids={"co-ris-pereira"},
        center_ids=center_ids,
    )


async def test_el_albergue_que_se_llena_puede_decirlo() -> None:
    """La razón de existir de esta ruta: uno abierto que ya no recibe manda gente en vano."""
    repository = FakeCenterRepository(FakeCenter())
    leido = await CenterService(repository).update(
        CENTER_ID, CenterUpdate(status=CenterStatus.DO_NOT_SEND), operador({CENTER_ID})
    )
    assert leido.status == CenterStatus.DO_NOT_SEND


async def test_actualizar_cuenta_como_confirmar_que_sigue_vivo() -> None:
    repository = FakeCenterRepository(FakeCenter())
    antes = datetime.now(UTC)
    leido = await CenterService(repository).update(
        CENTER_ID, CenterUpdate(schedule="8 a. m. a 6 p. m."), operador({CENTER_ID})
    )
    assert leido.last_verified_at is not None
    assert leido.last_verified_at >= antes


async def test_solo_se_cambia_lo_que_se_envia() -> None:
    """Un PATCH con un campo no puede borrar los demás."""
    repository = FakeCenterRepository(FakeCenter())
    leido = await CenterService(repository).update(
        CENTER_ID, CenterUpdate(status=CenterStatus.ALMOST_FULL), operador({CENTER_ID})
    )
    assert leido.name == "Albergue Coliseo Mayor"
    assert leido.address == "Carrera 8, Pereira"


async def test_no_se_puede_actualizar_el_albergue_de_otro() -> None:
    repository = FakeCenterRepository(FakeCenter())
    ajeno = UUID("30000000-0000-0000-0000-000000000009")
    with pytest.raises(CenterAccessDeniedError):
        await CenterService(repository).update(
            CENTER_ID, CenterUpdate(status=CenterStatus.CLOSED), operador({ajeno})
        )


async def test_actualizar_un_centro_inexistente_no_es_un_403() -> None:
    with pytest.raises(CenterNotFoundError):
        await CenterService(FakeCenterRepository()).update(
            CENTER_ID, CenterUpdate(status=CenterStatus.CLOSED), operador({CENTER_ID})
        )


async def test_una_actualizacion_vacia_no_pasa_por_buena() -> None:
    repository = FakeCenterRepository(FakeCenter())
    with pytest.raises(EmptyCenterUpdateError):
        await CenterService(repository).update(CENTER_ID, CenterUpdate(), operador({CENTER_ID}))
