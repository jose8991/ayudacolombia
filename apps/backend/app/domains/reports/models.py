import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, LargeBinary, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class CitizenReport(Base):
    __tablename__ = "citizen_reports"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tracking_code: Mapped[str] = mapped_column(String(16), unique=True, nullable=False, index=True)
    idempotency_key_hash: Mapped[str | None] = mapped_column(
        String(64), unique=True, nullable=True
    )
    request_fingerprint: Mapped[str | None] = mapped_column(String(64), nullable=True)
    territory_id: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(32), nullable=False)
    title: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    neighborhood_code: Mapped[str | None] = mapped_column(String(50))
    severity: Mapped[str] = mapped_column(String(24), nullable=False)
    longitude: Mapped[Decimal | None] = mapped_column(Numeric(9, 6))
    latitude: Mapped[Decimal | None] = mapped_column(Numeric(9, 6))
    observed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    verification_status: Mapped[str] = mapped_column(
        String(24), nullable=False, server_default="reported", index=True
    )
    moderation_note: Mapped[str | None] = mapped_column(String(300))
    contact_ciphertext: Mapped[bytes | None] = mapped_column(LargeBinary)
    # Evita que dos personas del equipo llamen a la misma persona por separado.
    contacted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    # Alguien llegó al sitio y entregó. Distinto de contacted_at, que es sólo una llamada.
    attended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    attended_by_organization_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    attended_note: Mapped[str | None] = mapped_column(String(300))
    privacy_policy_version: Mapped[str] = mapped_column(String(32), nullable=False)
    privacy_accepted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )
