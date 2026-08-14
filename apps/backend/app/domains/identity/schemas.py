from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, Field


class Role(StrEnum):
    CENTER_OPERATOR = "center_operator"
    VERIFIER = "verifier"
    TERRITORIAL_COORDINATOR = "territorial_coordinator"
    ORGANIZATION_MEMBER = "organization_member"
    OFFICIAL = "official"
    ADMINISTRATOR = "administrator"
    AUDITOR = "auditor"


class Permission(StrEnum):
    REPORT_READ_SENSITIVE = "report.read_sensitive"
    REPORT_VERIFY = "report.verify"
    CENTER_UPDATE = "center.update"
    INVENTORY_UPDATE = "inventory.update"
    AID_ASSIGN = "aid.assign"
    USER_MANAGE = "user.manage"
    AUDIT_READ = "audit.read"


class Actor(BaseModel):
    id: UUID
    display_name: str
    organization_id: UUID | None = None
    roles: set[Role] = Field(default_factory=set)
    territory_ids: set[str] = Field(default_factory=set)
    center_ids: set[UUID] = Field(default_factory=set)


class ResourceContext(BaseModel):
    territory_id: str | None = None
    center_id: UUID | None = None
    organization_id: UUID | None = None


class AccessEvaluation(BaseModel):
    actor: Actor
    permission: Permission
    resource: ResourceContext = Field(default_factory=ResourceContext)


class AccessDecision(BaseModel):
    allowed: bool
    reason: str
