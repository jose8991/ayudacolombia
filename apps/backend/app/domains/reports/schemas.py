from datetime import datetime
from enum import StrEnum
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, Field


class ReportCategory(StrEnum):
    NEED = "need"
    OFFER = "offer"
    SHELTER = "shelter"
    AID_CENTER = "aid-center"
    DAMAGE = "damage"


class Severity(StrEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class VerificationStatus(StrEnum):
    REPORTED = "reported"
    VERIFIED = "verified"
    OFFICIAL = "official"
    STALE = "stale"
    CLOSED = "closed"
    REJECTED = "rejected"


Longitude = Annotated[float, Field(ge=-180, le=180)]
Latitude = Annotated[float, Field(ge=-90, le=90)]


class Coordinates(BaseModel):
    longitude: Longitude
    latitude: Latitude


class ReportCreate(BaseModel):
    territory_id: Annotated[str, Field(min_length=3, max_length=80)] = "co-ris-pereira"
    category: ReportCategory
    title: Annotated[str, Field(min_length=3, max_length=100)]
    description: Annotated[str, Field(min_length=5, max_length=600)]
    neighborhood_code: Annotated[str | None, Field(max_length=50)] = None
    severity: Severity
    coordinates: Coordinates | None = None
    observed_at: datetime
    contact: Annotated[str | None, Field(min_length=5, max_length=160)] = None
    privacy_authorized: Literal[True]
    privacy_policy_version: Annotated[str, Field(min_length=1, max_length=32)]


class ReportRead(ReportCreate):
    id: UUID
    tracking_code: str
    verification_status: VerificationStatus
    created_at: datetime
    contacted_at: datetime | None = None
    attended_at: datetime | None = None
    attended_note: str | None = None
    en_route_at: datetime | None = None


class PublicReportRead(BaseModel):
    """Privacy-preserving projection for the public map."""

    id: UUID
    territory_id: str
    category: ReportCategory
    title: str
    description: str
    neighborhood: str | None
    severity: Severity
    coordinates: Coordinates | None
    observed_at: datetime
    verification_status: VerificationStatus
    updated_at: datetime
    is_stale: bool = False
    # Que alguien ya llegó es información pública: evita que tres grupos suban al mismo
    # sitio mientras a otro no llega nadie. Quién llegó no se publica.
    attended_at: datetime | None = None
    # Sólo se publica si el aviso sigue vigente; uno vencido volvería el sitio invisible.
    en_route_since: datetime | None = None


class ReportStatusRead(BaseModel):
    tracking_code: str
    verification_status: VerificationStatus
    created_at: datetime
    updated_at: datetime


class ReportEnRoute(BaseModel):
    """Anunciar que un grupo va para allá, o cancelarlo si al final no fue."""

    en_route: bool = True


class ReportAttendance(BaseModel):
    """Dejar constancia de que un grupo llegó al sitio, o deshacerlo si fue un error."""

    attended: bool = True
    note: str | None = Field(default=None, max_length=300)


class ReportModerationUpdate(BaseModel):
    verification_status: VerificationStatus
    moderation_note: Annotated[str | None, Field(max_length=300)] = None
