from datetime import datetime

import pytest

from app.domains.abuse.exceptions import RateLimitExceededError
from app.domains.abuse.service import RateLimitService


class FakeRateLimitRepository:
    def __init__(self) -> None:
        self.counts: dict[tuple[str, str, datetime], int] = {}

    async def increment(self, scope: str, subject_hash: str, window_start: datetime) -> int:
        key = (scope, subject_hash, window_start)
        self.counts[key] = self.counts.get(key, 0) + 1
        return self.counts[key]


async def test_rate_limit_rejects_requests_over_the_limit() -> None:
    service = RateLimitService(FakeRateLimitRepository(), "test-secret")

    await service.check("login", "client-a", 2)
    await service.check("login", "client-a", 2)

    with pytest.raises(RateLimitExceededError):
        await service.check("login", "client-a", 2)


async def test_rate_limit_does_not_store_the_raw_subject() -> None:
    repository = FakeRateLimitRepository()
    service = RateLimitService(repository, "test-secret")

    await service.check("login", "sensitive-client-address", 2)

    stored_subject = next(iter(repository.counts))[1]
    assert stored_subject != "sensitive-client-address"
    assert len(stored_subject) == 64
