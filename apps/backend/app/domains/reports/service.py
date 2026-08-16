import hashlib
import secrets
from datetime import UTC, datetime
from typing import Protocol
from uuid import UUID

from app.core.encryption import decrypt_sensitive, encrypt_sensitive
from app.core.freshness import is_stale
from app.domains.identity.policy import evaluate_access
from app.domains.identity.schemas import Actor, Permission, ResourceContext, Role

from .exceptions import (
    InvalidModerationStatusError,
    ReportAccessDeniedError,
    ReportIdempotencyConflictError,
    ReportNotFoundError,
)
from .models import CitizenReport
from .schemas import (
    Coordinates,
    PublicReportRead,
    ReportCreate,
    ReportModerationUpdate,
    ReportRead,
    ReportStatusRead,
)


class ReportRepositoryPort(Protocol):
    async def add(self, report: CitizenReport) -> CitizenReport: ...
    async def get_by_tracking_code(self, code: str) -> CitizenReport | None: ...
    async def get_by_idempotency_key(self, key_hash: str) -> CitizenReport | None: ...
    async def get(self, report_id: UUID) -> CitizenReport | None: ...
    async def list_pending(self, territory_ids: set[str] | None) -> list[CitizenReport]: ...
    async def list_public(
        self, territory_id: str, only_confirmed: bool = False
    ) -> list[CitizenReport]: ...
    async def moderate(
        self, report: CitizenReport, verification_status: str, note: str | None
    ) -> CitizenReport: ...
    async def mark_contacted(self, report: CitizenReport) -> CitizenReport: ...


class ReportService:
    def __init__(self, repository: ReportRepositoryPort) -> None:
        self.repository = repository

    async def create(self, payload: ReportCreate, idempotency_key: str) -> ReportRead:
        key_hash = hashlib.sha256(idempotency_key.encode()).hexdigest()
        fingerprint = hashlib.sha256(payload.model_dump_json().encode()).hexdigest()
        existing = await self.repository.get_by_idempotency_key(key_hash)
        if existing is not None:
            if existing.request_fingerprint != fingerprint:
                raise ReportIdempotencyConflictError
            return self.to_report_read(existing)
        report = CitizenReport(
            tracking_code="SOS-" + secrets.token_hex(5).upper(),
            idempotency_key_hash=key_hash,
            request_fingerprint=fingerprint,
            territory_id=payload.territory_id,
            category=payload.category.value,
            title=payload.title,
            description=payload.description,
            neighborhood_code=payload.neighborhood_code,
            severity=payload.severity.value,
            longitude=payload.coordinates.longitude if payload.coordinates else None,
            latitude=payload.coordinates.latitude if payload.coordinates else None,
            observed_at=payload.observed_at,
            verification_status="reported",
            privacy_policy_version=payload.privacy_policy_version,
            privacy_accepted_at=datetime.now(UTC),
            contact_ciphertext=encrypt_sensitive(payload.contact) if payload.contact else None,
        )
        return self.to_report_read(await self.repository.add(report))

    async def list_public(
        self, territory_id: str, only_confirmed: bool = False
    ) -> list[PublicReportRead]:
        reports = await self.repository.list_public(territory_id, only_confirmed)
        return [self.to_public_report_read(item) for item in reports]

    async def list_pending(self, actor: Actor) -> list[ReportRead]:
        if not evaluate_access(actor, Permission.REPORT_READ_SENSITIVE, ResourceContext()).allowed:
            raise ReportAccessDeniedError
        territories = None if Role.ADMINISTRATOR in actor.roles else actor.territory_ids
        reports = await self.repository.list_pending(territories)
        return [self.to_report_read(item) for item in reports]

    async def moderate(
        self, report_id: UUID, payload: ReportModerationUpdate, actor: Actor
    ) -> ReportStatusRead:
        report = await self.repository.get(report_id)
        if report is None:
            raise ReportNotFoundError
        if not evaluate_access(
            actor, Permission.REPORT_VERIFY, ResourceContext(territory_id=report.territory_id)
        ).allowed:
            raise ReportAccessDeniedError
        if payload.verification_status.value not in {"verified", "official", "closed", "rejected"}:
            raise InvalidModerationStatusError
        return self.to_status_read(
            await self.repository.moderate(
                report, payload.verification_status.value, payload.moderation_note
            )
        )

    async def take_for_promotion(self, report_id: UUID, actor: Actor) -> CitizenReport:
        """Entrega un reporte que alguien con permiso quiere convertir en centro."""
        report = await self.repository.get(report_id)
        if report is None:
            raise ReportNotFoundError
        if not evaluate_access(
            actor, Permission.REPORT_VERIFY, ResourceContext(territory_id=report.territory_id)
        ).allowed:
            raise ReportAccessDeniedError
        return report

    async def close_as_promoted(self, report: CitizenReport) -> None:
        """El reporte deja de vivir suelto: a partir de ahora el centro lo reemplaza."""
        await self.repository.moderate(report, "closed", "Convertido en centro")

    async def mark_contacted(self, report_id: UUID, actor: Actor) -> ReportRead:
        report = await self.repository.get(report_id)
        if report is None:
            raise ReportNotFoundError
        if not evaluate_access(
            actor, Permission.REPORT_VERIFY, ResourceContext(territory_id=report.territory_id)
        ).allowed:
            raise ReportAccessDeniedError
        return self.to_report_read(await self.repository.mark_contacted(report))

    async def get_status(self, code: str) -> ReportStatusRead:
        report = await self.repository.get_by_tracking_code(code)
        if report is None:
            raise ReportNotFoundError
        return self.to_status_read(report)

    @staticmethod
    def to_report_read(report: CitizenReport) -> ReportRead:
        coordinates = None
        if report.longitude is not None and report.latitude is not None:
            coordinates = Coordinates(
                longitude=float(report.longitude), latitude=float(report.latitude)
            )
        return ReportRead(
            id=report.id,
            tracking_code=report.tracking_code,
            territory_id=report.territory_id,
            category=report.category,
            title=report.title,
            description=report.description,
            neighborhood_code=report.neighborhood_code,
            severity=report.severity,
            coordinates=coordinates,
            observed_at=report.observed_at,
            verification_status=report.verification_status,
            created_at=report.created_at,
            contacted_at=report.contacted_at,
            contact=(
                decrypt_sensitive(report.contact_ciphertext)
                if report.contact_ciphertext
                else None
            ),
            privacy_authorized=True,
            privacy_policy_version=report.privacy_policy_version,
        )

    @staticmethod
    def to_public_report_read(report: CitizenReport) -> PublicReportRead:
        coordinates = None
        if report.longitude is not None and report.latitude is not None:
            coordinates = Coordinates(
                longitude=round(float(report.longitude), 3),
                latitude=round(float(report.latitude), 3),
            )
        return PublicReportRead(
            id=report.id,
            territory_id=report.territory_id,
            category=report.category,
            title=report.title,
            description=report.description,
            neighborhood=report.neighborhood_code,
            severity=report.severity,
            coordinates=coordinates,
            observed_at=report.observed_at,
            verification_status=report.verification_status,
            updated_at=report.updated_at,
            is_stale=is_stale(report.updated_at),
        )

    @staticmethod
    def to_status_read(report: CitizenReport) -> ReportStatusRead:
        return ReportStatusRead(
            tracking_code=report.tracking_code,
            verification_status=report.verification_status,
            created_at=report.created_at,
            updated_at=report.updated_at,
        )
