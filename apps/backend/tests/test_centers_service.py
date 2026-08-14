from uuid import UUID

import pytest

from app.domains.centers.exceptions import CenterAccessDeniedError
from app.domains.centers.schemas import CenterCreate
from app.domains.centers.service import CenterService
from app.domains.identity.schemas import Actor, Role

ACTOR_ID = UUID("10000000-0000-0000-0000-000000000001")
ORG_ID = UUID("20000000-0000-0000-0000-000000000001")


class FakeCenterRepository:
    def __init__(self) -> None:
        self.last_public_query: tuple[str, bool] | None = None

    async def list_for_territory(self, territory_id: str, include_community: bool = False):
        self.last_public_query = (territory_id, include_community)
        return []

    async def list_for_actor(self, actor):
        return []

    async def add(self, center):
        return center

    async def get(self, center_id):
        return None

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
