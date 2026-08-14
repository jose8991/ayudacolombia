from .schemas import AccessDecision, Actor, Permission, ResourceContext, Role

ROLE_PERMISSIONS: dict[Role, set[Permission]] = {
    Role.CENTER_OPERATOR: {Permission.CENTER_UPDATE, Permission.INVENTORY_UPDATE},
    Role.VERIFIER: {Permission.REPORT_READ_SENSITIVE, Permission.REPORT_VERIFY},
    Role.TERRITORIAL_COORDINATOR: {
        Permission.REPORT_READ_SENSITIVE,
        Permission.REPORT_VERIFY,
        Permission.AID_ASSIGN,
    },
    Role.ORGANIZATION_MEMBER: {Permission.AID_ASSIGN},
    Role.OFFICIAL: {
        Permission.REPORT_READ_SENSITIVE,
        Permission.REPORT_VERIFY,
        Permission.CENTER_UPDATE,
        Permission.AID_ASSIGN,
    },
    Role.ADMINISTRATOR: set(Permission),
    Role.AUDITOR: {Permission.AUDIT_READ},
}


def evaluate_access(
    actor: Actor, permission: Permission, resource: ResourceContext
) -> AccessDecision:
    if Role.ADMINISTRATOR in actor.roles:
        return AccessDecision(allowed=True, reason="administrator")
    granted = (
        set().union(*(ROLE_PERMISSIONS[role] for role in actor.roles)) if actor.roles else set()
    )
    if permission not in granted:
        return AccessDecision(allowed=False, reason="permission_not_granted")
    if (
        permission in {Permission.CENTER_UPDATE, Permission.INVENTORY_UPDATE}
        and Role.CENTER_OPERATOR in actor.roles
    ):
        if resource.center_id is None or resource.center_id not in actor.center_ids:
            return AccessDecision(allowed=False, reason="center_out_of_scope")
    territorial_roles = {Role.VERIFIER, Role.TERRITORIAL_COORDINATOR, Role.OFFICIAL}
    if (
        actor.roles & territorial_roles
        and resource.territory_id
        and resource.territory_id not in actor.territory_ids
    ):
        return AccessDecision(allowed=False, reason="territory_out_of_scope")
    if (
        Role.ORGANIZATION_MEMBER in actor.roles
        and resource.organization_id
        and resource.organization_id != actor.organization_id
    ):
        return AccessDecision(allowed=False, reason="organization_out_of_scope")
    return AccessDecision(allowed=True, reason="within_scope")
