import hashlib
import secrets
from datetime import UTC, datetime, timedelta
from typing import Protocol
from uuid import UUID

from app.core.security import create_access_token, verify_password
from app.domains.centers.models import AidCenter

from .auth_schemas import (
    CenterOperatorInvitationCreate,
    InvitationAccept,
    InvitationResponse,
    LoginRequest,
    TokenResponse,
)
from .exceptions import (
    IdentityAccessDeniedError,
    IdentityConflictError,
    InvalidCredentialsError,
    InvalidInvitationError,
    InvitationCenterNotFoundError,
)
from .models import AccessInvitation, Membership, User
from .policy import evaluate_access
from .schemas import Actor, Permission, ResourceContext, Role


class IdentityRepositoryPort(Protocol):
    async def get_user_by_email(self, email: str) -> User | None: ...
    async def actor_context(
        self, user: User
    ) -> tuple[list[Membership], set[str], set[UUID]]: ...
    async def get_center(self, center_id: UUID) -> AidCenter | None: ...
    async def add_invitation(self, invitation: AccessInvitation) -> AccessInvitation: ...
    async def get_valid_invitation(self, token_hash: str) -> AccessInvitation | None: ...
    async def create_center_operator(
        self, invitation: AccessInvitation, password: str, privacy_policy_version: str
    ) -> User: ...


class IdentityService:
    def __init__(self, repository: IdentityRepositoryPort) -> None:
        self.repository = repository

    async def login(self, payload: LoginRequest) -> TokenResponse:
        user = await self.repository.get_user_by_email(str(payload.email))
        if (
            user is None
            or not user.is_active
            or not verify_password(payload.password, user.password_hash)
        ):
            raise InvalidCredentialsError
        return await self._token_for(user)

    async def invite_center_operator(
        self, payload: CenterOperatorInvitationCreate, actor: Actor
    ) -> InvitationResponse:
        if not evaluate_access(actor, Permission.USER_MANAGE, ResourceContext()).allowed:
            raise IdentityAccessDeniedError
        center = await self.repository.get_center(payload.center_id)
        if center is None:
            raise InvitationCenterNotFoundError
        if await self.repository.get_user_by_email(str(payload.email)):
            raise IdentityConflictError
        token = secrets.token_urlsafe(32)
        await self.repository.add_invitation(
            AccessInvitation(
                token_hash=hashlib.sha256(token.encode()).hexdigest(),
                email=str(payload.email).lower(),
                display_name=payload.display_name,
                organization_id=center.organization_id,
                center_id=center.id,
                territory_id=center.territory_id,
                expires_at=datetime.now(UTC) + timedelta(hours=24),
            )
        )
        return InvitationResponse(token=token)

    async def accept_invitation(self, payload: InvitationAccept) -> TokenResponse:
        invitation = await self.repository.get_valid_invitation(
            hashlib.sha256(payload.token.encode()).hexdigest()
        )
        if invitation is None:
            raise InvalidInvitationError
        if await self.repository.get_user_by_email(invitation.email):
            raise IdentityConflictError
        user = await self.repository.create_center_operator(
            invitation, payload.password, payload.privacy_policy_version
        )
        return await self._token_for(user, {Role.CENTER_OPERATOR})

    async def _token_for(self, user: User, roles: set[Role] | None = None) -> TokenResponse:
        memberships, territories, centers = await self.repository.actor_context(user)
        actor = Actor(
            id=user.id,
            display_name=user.display_name,
            organization_id=memberships[0].organization_id if memberships else None,
            roles=roles or {Role(membership.role) for membership in memberships},
            territory_ids=territories,
            center_ids=centers,
        )
        return TokenResponse(
            access_token=create_access_token(str(user.id)), expires_in=20 * 60, actor=actor
        )
