import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, LargeBinary, Numeric, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class AssistanceNeed(Base):
    __tablename__ = "assistance_needs"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tracking_code: Mapped[str] = mapped_column(String(16), unique=True, nullable=False, index=True)
    idempotency_key_hash: Mapped[str | None] = mapped_column(String(64), unique=True, nullable=True)
    request_fingerprint: Mapped[str | None] = mapped_column(String(64), nullable=True)
    territory_id: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(40), nullable=False)
    people_count: Mapped[int] = mapped_column(nullable=False)
    neighborhood: Mapped[str] = mapped_column(String(120), nullable=False)
    latitude: Mapped[Decimal | None] = mapped_column(Numeric(9, 6))
    longitude: Mapped[Decimal | None] = mapped_column(Numeric(9, 6))
    urgency: Mapped[str] = mapped_column(String(24), nullable=False)
    contact_ciphertext: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    privacy_policy_version: Mapped[str] = mapped_column(String(32), nullable=False)
    privacy_accepted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    description: Mapped[str | None] = mapped_column(String(600))
    status: Mapped[str] = mapped_column(String(32), nullable=False, server_default="received")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )
