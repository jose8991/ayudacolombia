"""Carga o actualiza centros y albergues desde un archivo revisable.

Uso:
    python -m app.cli.load_official_centers data/official-centers-2026-08-14.json

El archivo es la fuente de verdad y queda en el repositorio: cada punto lleva su
origen y la fecha en que se verificó, de modo que la carga es auditable y repetible.
La operación es idempotente: identifica un centro por territorio y nombre, así que
volver a ejecutarla actualiza los datos en lugar de duplicarlos.
"""

import asyncio
import json
import sys
from datetime import datetime
from decimal import Decimal
from pathlib import Path
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal
from app.domains.centers.models import AidCenter
from app.domains.identity.models import Organization


async def _organization(session: AsyncSession, entry: dict[str, Any]) -> Organization:
    existing: Organization | None = await session.scalar(
        select(Organization).where(Organization.slug == entry["slug"])
    )
    if existing is not None:
        return existing
    organization = Organization(
        name=entry["name"], slug=entry["slug"], status=entry.get("status", "verified")
    )
    session.add(organization)
    await session.flush()
    return organization


async def load(payload: dict[str, Any]) -> tuple[int, int]:
    created = 0
    updated = 0
    async with AsyncSessionLocal() as session:
        organizations = {
            entry["slug"]: await _organization(session, entry)
            for entry in payload.get("organizations", [])
        }
        for item in payload["centers"]:
            organization = organizations[item["organization_slug"]]
            center: AidCenter | None = await session.scalar(
                select(AidCenter).where(
                    AidCenter.territory_id == item["territory_id"],
                    AidCenter.name == item["name"],
                )
            )
            if center is None:
                center = AidCenter(territory_id=item["territory_id"], name=item["name"])
                session.add(center)
                created += 1
            else:
                updated += 1
            center.organization_id = organization.id
            center.address = item["address"]
            center.latitude = Decimal(str(item["latitude"]))
            center.longitude = Decimal(str(item["longitude"]))
            center.status = item.get("status", "open")
            # Nunca "official": la fuente es prensa que cita a la entidad, no la entidad
            # publicando aquí. Quien confirme en terreno puede ascenderlo desde /coordina.
            center.verification_status = "verified"
            center.schedule = item.get("schedule")
            center.accepted_items = item.get("accepted_items", [])
            center.last_verified_at = datetime.fromisoformat(item["last_verified_at"])
        await session.commit()
    return created, updated


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Indica la ruta del archivo de centros")
    document: dict[str, Any] = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    counters = asyncio.run(load(document))
    print(f"Centros creados: {counters[0]}. Actualizados: {counters[1]}.")
