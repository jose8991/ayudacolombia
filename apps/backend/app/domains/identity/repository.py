from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.domains.centers.models import AidCenter

from .models import AccessInvitation, Membership, MembershipCenter, MembershipTerritory, User
from .schemas import Role


class IdentityRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_user_by_email(self, email: str) -> User | None:
        user: User | None = await self.session.scalar(
            select(User).where(User.email == email.lower())
        )
        return user

    async def get_user_by_id(self, user_id: UUID) -> User | None:
        return await self.session.get(User, user_id)

    async def get_center(self, center_id: UUID) -> AidCenter | None:
        return await self.session.get(AidCenter, center_id)

    async def actor_context(
        self, user: User
    ) -> tuple[list[Membership], set[str], set[UUID]]:
        memberships: list[Membership] = list(
            (
                await self.session.scalars(select(Membership).where(Membership.user_id == user.id))
            ).all()
        )
        membership_ids = [membership.id for membership in memberships]
        territories: set[str] = set()
        if membership_ids:
            territories = set(
                (
                    await self.session.scalars(
                        select(MembershipTerritory.territory_id).where(
                            MembershipTerritory.membership_id.in_(membership_ids)
                        )
                    )
                ).all()
            )
        centers: set[UUID] = set()
        if membership_ids:
            centers = set(
                (
                    await self.session.scalars(
                        select(MembershipCenter.center_id).where(
                            MembershipCenter.membership_id.in_(membership_ids)
                        )
                    )
                ).all()
            )
        return memberships, territories, centers

    async def create_center_operator(
        self,
        invitation: AccessInvitation,
        password: str,
        privacy_policy_version: str,
    ) -> User:
        user = User(
            email=invitation.email,
            display_name=invitation.display_name,
            password_hash=hash_password(password),
            privacy_policy_version=privacy_policy_version,
            privacy_accepted_at=datetime.now(UTC),
        )
        self.session.add(user)
        await self.session.flush()
        membership = Membership(
            user_id=user.id,
            organization_id=invitation.organization_id,
            role=Role.CENTER_OPERATOR.value,
        )
        self.session.add(membership)
        await self.session.flush()
        self.session.add_all(
            [
                MembershipCenter(membership_id=membership.id, center_id=invitation.center_id),
                MembershipTerritory(
                    membership_id=membership.id, territory_id=invitation.territory_id
                ),
            ]
        )
        invitation.accepted_at = datetime.now(UTC)
        await self.session.commit()
        await self.session.refresh(user)
        return user

    async def add_invitation(self, invitation: AccessInvitation) -> AccessInvitation:
        self.session.add(invitation)
        await self.session.commit()
        await self.session.refresh(invitation)
        return invitation

    async def get_valid_invitation(self, token_hash: str) -> AccessInvitation | None:
        invitation: AccessInvitation | None = await self.session.scalar(
            select(AccessInvitation).where(
                AccessInvitation.token_hash == token_hash,
                AccessInvitation.accepted_at.is_(None),
                AccessInvitation.expires_at > datetime.now(UTC),
            )
        )
        return invitation
