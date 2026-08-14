from uuid import UUID

from app.domains.identity.policy import evaluate_access
from app.domains.identity.schemas import Actor, Permission, ResourceContext, Role

CENTER_A = UUID("30000000-0000-0000-0000-000000000001")
CENTER_B = UUID("30000000-0000-0000-0000-000000000002")
ORG_A = UUID("20000000-0000-0000-0000-000000000001")
ORG_B = UUID("20000000-0000-0000-0000-000000000002")


def actor(role: Role) -> Actor:
    return Actor(
        id=UUID("10000000-0000-0000-0000-000000000001"),
        display_name="Test",
        organization_id=ORG_A,
        roles={role},
        territory_ids={"co-ris-pereira"},
        center_ids={CENTER_A},
    )


def test_center_operator_is_limited_to_assigned_center() -> None:
    allowed = evaluate_access(
        actor(Role.CENTER_OPERATOR),
        Permission.INVENTORY_UPDATE,
        ResourceContext(center_id=CENTER_A),
    )
    denied = evaluate_access(
        actor(Role.CENTER_OPERATOR),
        Permission.INVENTORY_UPDATE,
        ResourceContext(center_id=CENTER_B),
    )
    assert allowed.allowed is True
    assert denied.model_dump() == {"allowed": False, "reason": "center_out_of_scope"}


def test_coordinator_cannot_manage_another_territory() -> None:
    decision = evaluate_access(
        actor(Role.TERRITORIAL_COORDINATOR),
        Permission.AID_ASSIGN,
        ResourceContext(territory_id="co-qui-armenia"),
    )
    assert decision.model_dump() == {"allowed": False, "reason": "territory_out_of_scope"}


def test_organization_member_cannot_assign_for_another_organization() -> None:
    decision = evaluate_access(
        actor(Role.ORGANIZATION_MEMBER),
        Permission.AID_ASSIGN,
        ResourceContext(organization_id=ORG_B),
    )
    assert decision.model_dump() == {"allowed": False, "reason": "organization_out_of_scope"}


def test_auditor_cannot_modify_centers() -> None:
    decision = evaluate_access(
        actor(Role.AUDITOR), Permission.CENTER_UPDATE, ResourceContext(center_id=CENTER_A)
    )
    assert decision.model_dump() == {"allowed": False, "reason": "permission_not_granted"}
