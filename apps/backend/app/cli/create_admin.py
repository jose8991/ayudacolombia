import asyncio
import os
import uuid

from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.core.security import hash_password
from app.domains.identity.models import (
    Membership,
    MembershipTerritory,
    Organization,
    Territory,
    User,
)
from app.domains.identity.schemas import Role


async def main() -> None:
    email = os.environ["BOOTSTRAP_ADMIN_EMAIL"].lower()
    password = os.environ["BOOTSTRAP_ADMIN_PASSWORD"]
    if len(password) < 12:
        raise RuntimeError("BOOTSTRAP_ADMIN_PASSWORD must contain at least 12 characters")
    async with AsyncSessionLocal() as session:
        if await session.scalar(select(User).where(User.email == email)):
            print("Bootstrap user already exists")
            return
        organization = await session.scalar(
            select(Organization).where(Organization.slug == "coordinacion-sos")
        )
        if organization is None:
            organization = Organization(
                name="Coordinación SOS", slug="coordinacion-sos", status="verified"
            )
            session.add(organization)
        territory = await session.get(Territory, "co-ris-pereira")
        if territory is None:
            territory = Territory(id="co-ris-pereira", name="Pereira", kind="municipality")
            session.add(territory)
        user = User(
            id=uuid.uuid4(),
            email=email,
            display_name="Administración SOS",
            password_hash=hash_password(password),
        )
        session.add(user)
        await session.flush()
        membership = Membership(
            user_id=user.id, organization_id=organization.id, role=Role.ADMINISTRATOR.value
        )
        session.add(membership)
        await session.flush()
        session.add(MembershipTerritory(membership_id=membership.id, territory_id=territory.id))
        await session.commit()
        print(f"Created bootstrap administrator: {email}")


if __name__ == "__main__":
    asyncio.run(main())
