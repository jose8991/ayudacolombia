"""Marcar que un grupo llegó al sitio y entregó.

El caso que originó esto: un grupo de todoterreno que reparte desde su acopio y sube a
veredas donde no entra un camión. Sin esto, tres grupos suben al mismo sitio el mismo día y
a otro no llega nadie. Es distinto de haber llamado por teléfono, que ya se registraba
aparte.
"""

from datetime import UTC, datetime
from uuid import UUID, uuid4

import pytest

from app.domains.identity.policy import evaluate_access
from app.domains.identity.schemas import Actor, Permission, ResourceContext, Role
from app.domains.reports.exceptions import ReportAccessDeniedError, ReportNotFoundError
from app.domains.reports.schemas import ReportAttendance
from app.domains.reports.service import ReportService

REPORT_ID = UUID("40000000-0000-0000-0000-000000000001")
ORG_ID = UUID("20000000-0000-0000-0000-000000000001")
TERRITORY = "co-ris-pereira"


class FakeReport:
    def __init__(self, territory_id: str = TERRITORY) -> None:
        self.id = REPORT_ID
        self.tracking_code = "SOS-ABCDEF0123"
        self.territory_id = territory_id
        self.category = "need"
        self.title = "Vereda sin agua"
        self.description = "No ha subido nadie desde el martes."
        self.neighborhood_code = None
        self.severity = "high"
        self.longitude = None
        self.latitude = None
        self.observed_at = datetime(2026, 8, 15, tzinfo=UTC)
        self.verification_status = "reported"
        self.created_at = datetime(2026, 8, 15, tzinfo=UTC)
        self.updated_at = datetime(2026, 8, 15, tzinfo=UTC)
        self.contacted_at = None
        self.contact_ciphertext = None
        self.privacy_policy_version = "2026-08-14"
        self.attended_at: datetime | None = None
        self.attended_by_organization_id: UUID | None = None
        self.attended_note: str | None = None


class FakeRepository:
    def __init__(self, report: FakeReport | None) -> None:
        self.report = report

    async def get(self, report_id):
        return self.report

    async def mark_attended(self, report, organization_id, note, moment):
        report.attended_at = moment
        report.attended_by_organization_id = organization_id if moment else None
        report.attended_note = note if moment else None
        return report


def grupo(territory_ids: set[str] | None = None) -> Actor:
    """Quien atiende un acopio: el grupo de todoterreno que reparte desde La Cantera."""
    return Actor(
        id=uuid4(),
        display_name="Grupo 4x4",
        organization_id=ORG_ID,
        roles={Role.CENTER_OPERATOR},
        territory_ids=territory_ids if territory_ids is not None else {TERRITORY},
        center_ids={uuid4()},
    )


async def test_el_grupo_deja_constancia_de_que_llego() -> None:
    report = FakeReport()
    leido = await ReportService(FakeRepository(report)).mark_attended(
        REPORT_ID, ReportAttendance(note="Subimos con dos camionetas"), grupo()
    )
    assert leido.attended_at is not None
    assert leido.attended_note == "Subimos con dos camionetas"
    assert report.attended_by_organization_id == ORG_ID


async def test_se_puede_deshacer_si_se_marco_el_punto_equivocado() -> None:
    """Con señal intermitente y guantes puestos, marcar el punto de al lado es cuestión de
    tiempo. Si no se pudiera corregir, el sitio quedaría invisible para los demás grupos."""
    report = FakeReport()
    service = ReportService(FakeRepository(report))
    await service.mark_attended(REPORT_ID, ReportAttendance(note="Entregado"), grupo())
    leido = await service.mark_attended(REPORT_ID, ReportAttendance(attended=False), grupo())
    assert leido.attended_at is None
    assert report.attended_by_organization_id is None
    assert report.attended_note is None


async def test_no_se_marca_en_un_municipio_ajeno() -> None:
    report = FakeReport(territory_id="co-ant-medellin")
    with pytest.raises(ReportAccessDeniedError):
        await ReportService(FakeRepository(report)).mark_attended(
            REPORT_ID, ReportAttendance(), grupo({TERRITORY})
        )


async def test_quien_no_tiene_permiso_no_marca() -> None:
    auditor = Actor(id=uuid4(), display_name="Auditor", roles={Role.AUDITOR})
    with pytest.raises(ReportAccessDeniedError):
        await ReportService(FakeRepository(FakeReport())).mark_attended(
            REPORT_ID, ReportAttendance(), auditor
        )


async def test_un_reporte_inexistente_no_es_un_403() -> None:
    with pytest.raises(ReportNotFoundError):
        await ReportService(FakeRepository(None)).mark_attended(
            REPORT_ID, ReportAttendance(), grupo()
        )


async def test_marcar_entregas_no_da_acceso_a_los_datos_de_contacto() -> None:
    """El permiso de entrega es deliberadamente estrecho: un grupo que reparte no necesita
    ver el teléfono de quien pidió ayuda."""
    actor = grupo()
    assert evaluate_access(actor, Permission.REPORT_ATTEND, ResourceContext()).allowed
    assert not evaluate_access(
        actor, Permission.REPORT_READ_SENSITIVE, ResourceContext()
    ).allowed


async def test_lo_publico_dice_que_ya_llegaron_pero_no_quien() -> None:
    """Que alguien llegó es información útil para todos; qué grupo fue, no hace falta."""
    report = FakeReport()
    await ReportService(FakeRepository(report)).mark_attended(
        REPORT_ID, ReportAttendance(note="Interno"), grupo()
    )
    publico = ReportService.to_public_report_read(report)
    assert publico.attended_at is not None
    assert not hasattr(publico, "attended_note")
    assert not hasattr(publico, "attended_by_organization_id")
