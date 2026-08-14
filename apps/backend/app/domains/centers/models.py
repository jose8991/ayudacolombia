import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class AidCenter(Base):
    __tablename__ = "aid_centers"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="RESTRICT"), index=True
    )
    territory_id: Mapped[str] = mapped_column(
        ForeignKey("territories.id", ondelete="RESTRICT"), index=True
    )
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    address: Mapped[str] = mapped_column(String(255), nullable=False)
    latitude: Mapped[Decimal] = mapped_column(Numeric(9, 6), nullable=False)
    longitude: Mapped[Decimal] = mapped_column(Numeric(9, 6), nullable=False)
    status: Mapped[str] = mapped_column(String(24), nullable=False, server_default="closed")
    verification_status: Mapped[str] = mapped_column(
        String(24), nullable=False, server_default="verified", index=True
    )
    schedule: Mapped[str | None] = mapped_column(String(255))
    accepted_items: Mapped[list[str]] = mapped_column(JSONB, nullable=False, server_default="[]")
    last_verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class CenterPublication(Base):
    __tablename__ = "center_publications"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    center_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("aid_centers.id", ondelete="CASCADE"), nullable=False, index=True
    )
    author_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(120), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    needed_items: Mapped[list[str]] = mapped_column(JSONB, nullable=False, server_default="[]")
    sufficient_items: Mapped[list[str]] = mapped_column(JSONB, nullable=False, server_default="[]")
    priority: Mapped[str] = mapped_column(String(16), nullable=False, server_default="normal")
    status: Mapped[str] = mapped_column(String(16), nullable=False, server_default="active")
    published_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
