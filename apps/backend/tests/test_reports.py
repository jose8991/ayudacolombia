from datetime import UTC, datetime
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient

from app.domains.abuse.deps import enforce_public_submission_limit
from app.domains.reports.router import get_report_repository
from app.main import app


class FakeReportRepository:
    def __init__(self) -> None:
        self.reports = {}

    async def add(self, report):
        now = datetime.now(UTC)
        report.id = uuid4()
        report.created_at = now
        report.updated_at = now
        self.reports[report.tracking_code] = report
        return report

    async def get_by_tracking_code(self, code):
        return self.reports.get(code.upper())

    async def get_by_idempotency_key(self, key_hash):
        return next(
            (report for report in self.reports.values() if report.idempotency_key_hash == key_hash),
            None,
        )

    async def list_public(self, territory_id):
        return [
            report
            for report in self.reports.values()
            if report.territory_id == territory_id
            and report.verification_status in {"verified", "official"}
        ]


@pytest.fixture(autouse=True)
def fake_report_repository():
    repository = FakeReportRepository()
    app.dependency_overrides[get_report_repository] = lambda: repository
    app.dependency_overrides[enforce_public_submission_limit] = lambda: None
    yield repository
    app.dependency_overrides.clear()


async def test_citizen_report_starts_unverified() -> None:
    payload = {
        "category": "need",
        "title": "Se necesitan colchonetas",
        "description": "Hay cinco familias esperando alojamiento temporal.",
        "neighborhood_code": "centro",
        "severity": "high",
        "coordinates": {"longitude": -75.6946, "latitude": 4.8143},
        "observed_at": "2026-08-13T05:40:00-05:00",
        "privacy_authorized": True,
        "privacy_policy_version": "2026-08-13",
    }
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/api/v1/reports", json=payload, headers={"Idempotency-Key": "report-test-key-0001"}
        )

    assert response.status_code == 201
    assert response.json()["verification_status"] == "reported"


async def test_rejects_coordinates_outside_the_globe() -> None:
    payload = {
        "category": "damage",
        "title": "Daño estructural",
        "description": "Reporte con coordenadas inválidas.",
        "severity": "critical",
        "coordinates": {"longitude": -200, "latitude": 4.8},
        "observed_at": "2026-08-13T05:40:00-05:00",
        "privacy_authorized": True,
        "privacy_policy_version": "2026-08-13",
    }
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/api/v1/reports", json=payload, headers={"Idempotency-Key": "report-test-key-0002"}
        )
    assert response.status_code == 422


async def test_accepts_community_offer_and_shelter_categories() -> None:
    base = {
        "title": "Apoyo comunitario",
        "description": "Información pendiente de verificación.",
        "severity": "medium",
        "coordinates": {"longitude": -75.67, "latitude": 4.83},
        "observed_at": "2026-08-13T05:40:00-05:00",
        "privacy_authorized": True,
        "privacy_policy_version": "2026-08-13",
    }
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        for category in ("offer", "shelter"):
            response = await client.post(
                "/api/v1/reports",
                json={**base, "category": category},
                headers={"Idempotency-Key": f"report-category-{category}-0001"},
            )
            assert response.status_code == 201
            assert response.json()["verification_status"] == "reported"


async def test_accepts_report_without_gps_coordinates() -> None:
    payload = {
        "category": "offer",
        "title": "Ofrezco transporte",
        "description": "Disponible en el sector indicado.",
        "neighborhood_code": "Galicia Alta",
        "severity": "low",
        "coordinates": None,
        "observed_at": "2026-08-13T05:40:00-05:00",
        "privacy_authorized": True,
        "privacy_policy_version": "2026-08-13",
    }
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/api/v1/reports", json=payload, headers={"Idempotency-Key": "report-test-key-0003"}
        )
    assert response.status_code == 201
    assert response.json()["coordinates"] is None


async def test_report_returns_a_tracking_code_and_status_can_be_consulted() -> None:
    payload = {
        "territory_id": "co-ris-dosquebradas",
        "category": "damage",
        "title": "Paso restringido",
        "description": "La vía tiene paso únicamente para motocicletas.",
        "neighborhood_code": "La Pradera",
        "severity": "high",
        "coordinates": None,
        "observed_at": "2026-08-13T05:40:00-05:00",
        "privacy_authorized": True,
        "privacy_policy_version": "2026-08-13",
    }
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        created = await client.post(
            "/api/v1/reports", json=payload, headers={"Idempotency-Key": "report-test-key-0004"}
        )
        code = created.json()["tracking_code"]
        status_response = await client.get(f"/api/v1/reports/{code}/status")

    assert created.status_code == 201
    assert code.startswith("SOS-")
    assert status_response.status_code == 200
    assert status_response.json()["verification_status"] == "reported"


async def test_repeated_submission_returns_the_same_report() -> None:
    payload = {
        "territory_id": "co-ris-pereira",
        "category": "offer",
        "title": "Ofrezco agua",
        "description": "Cien botellas disponibles para coordinación.",
        "severity": "low",
        "coordinates": None,
        "observed_at": "2026-08-13T05:40:00-05:00",
        "privacy_authorized": True,
        "privacy_policy_version": "2026-08-13",
    }
    headers = {"Idempotency-Key": "repeated-mobile-submission-0001"}
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        first = await client.post("/api/v1/reports", json=payload, headers=headers)
        repeated = await client.post("/api/v1/reports", json=payload, headers=headers)

    assert first.status_code == 201
    assert repeated.status_code == 201
    assert repeated.json()["tracking_code"] == first.json()["tracking_code"]


async def test_pending_reports_require_an_authorized_session() -> None:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/v1/reports/moderation/pending")
    assert response.status_code == 401


async def test_public_feed_excludes_pending_and_generalizes_coordinates(
    fake_report_repository,
) -> None:
    payload = {
        "territory_id": "co-ris-pereira",
        "category": "damage",
        "title": "Paso restringido",
        "description": "La vía tiene paso parcial.",
        "neighborhood_code": "Centro",
        "severity": "high",
        "coordinates": {"longitude": -75.694612, "latitude": 4.814321},
        "observed_at": "2026-08-13T05:40:00-05:00",
        "privacy_authorized": True,
        "privacy_policy_version": "2026-08-13",
    }
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        created = await client.post(
            "/api/v1/reports", json=payload, headers={"Idempotency-Key": "report-test-key-0005"}
        )
        hidden = await client.get("/api/v1/reports/public?territory_id=co-ris-pereira")
        report = fake_report_repository.reports[created.json()["tracking_code"]]
        report.verification_status = "verified"
        visible = await client.get("/api/v1/reports/public?territory_id=co-ris-pereira")

    assert hidden.json() == []
    assert visible.json()[0]["coordinates"] == {"longitude": -75.695, "latitude": 4.814}
    assert "tracking_code" not in visible.json()[0]
