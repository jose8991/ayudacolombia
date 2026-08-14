from datetime import UTC, datetime, timedelta

from app.core.freshness import STALE_AFTER, is_stale
from app.domains.centers.schemas import CenterRead


def test_recent_publications_are_fresh() -> None:
    now = datetime.now(UTC)

    assert is_stale(now, now) is False
    assert is_stale(now - STALE_AFTER + timedelta(minutes=1), now) is False


def test_publications_older_than_the_window_are_stale() -> None:
    now = datetime.now(UTC)

    assert is_stale(now - STALE_AFTER - timedelta(minutes=1), now) is True
    assert is_stale(now - timedelta(days=4), now) is True


def test_missing_confirmation_counts_as_stale() -> None:
    assert is_stale(None) is True


def test_naive_timestamps_are_read_as_utc() -> None:
    now = datetime.now(UTC)

    assert is_stale(now.replace(tzinfo=None), now) is False


def _center(last_verified_at: datetime | None, updated_at: datetime) -> CenterRead:
    return CenterRead(
        id="3f1c7a9e-0000-4000-8000-000000000001",  # type: ignore[arg-type]
        organization_id="3f1c7a9e-0000-4000-8000-000000000002",  # type: ignore[arg-type]
        territory_id="co-ris-pereira",
        name="Albergue de prueba",
        address="Calle 1 #2-3",
        latitude=4.81,  # type: ignore[arg-type]
        longitude=-75.69,  # type: ignore[arg-type]
        status="open",  # type: ignore[arg-type]
        schedule=None,
        accepted_items=[],
        verification_status="official",  # type: ignore[arg-type]
        last_verified_at=last_verified_at,
        updated_at=updated_at,
    )


def test_center_reports_its_own_freshness() -> None:
    now = datetime.now(UTC)

    assert _center(now, now - timedelta(days=5)).is_stale is False
    assert _center(None, now).is_stale is False
    assert _center(now - timedelta(days=2), now).is_stale is True
