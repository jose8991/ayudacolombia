from datetime import datetime
from decimal import Decimal
from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class CenterStatus(StrEnum):
    OPEN = "open"
    ALMOST_FULL = "almost_full"
    DO_NOT_SEND = "do_not_send"
    CLOSED = "closed"


class CenterVerificationStatus(StrEnum):
    REPORTED = "reported"
    VERIFIED = "verified"
    OFFICIAL = "official"
    STALE = "stale"
    CLOSED = "closed"


class PublicationPriority(StrEnum):
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


class CenterCreate(BaseModel):
    organization_id: UUID
    territory_id: str = Field(min_length=3, max_length=80)
    name: str = Field(min_length=3, max_length=160)
    address: str = Field(min_length=3, max_length=255)
    latitude: Decimal = Field(ge=-90, le=90)
    longitude: Decimal = Field(ge=-180, le=180)
    status: CenterStatus = CenterStatus.CLOSED
    schedule: str | None = Field(default=None, max_length=255)
    accepted_items: list[str] = Field(default_factory=list, max_length=50)


class CenterRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    organization_id: UUID
    territory_id: str
    name: str
    address: str
    latitude: Decimal
    longitude: Decimal
    status: CenterStatus
    schedule: str | None
    accepted_items: list[str]
    verification_status: CenterVerificationStatus
    last_verified_at: datetime | None
    updated_at: datetime


class CenterPublicationCreate(BaseModel):
    title: str = Field(min_length=3, max_length=120)
    message: str = Field(min_length=3, max_length=800)
    needed_items: list[str] = Field(default_factory=list, max_length=30)
    priority: PublicationPriority = PublicationPriority.NORMAL
    expires_at: datetime | None = None


class CenterPublicationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    center_id: UUID
    title: str
    message: str
    needed_items: list[str]
    priority: PublicationPriority
    expires_at: datetime | None
    status: str
    published_at: datetime
