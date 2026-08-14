import hashlib
import hmac
from datetime import UTC, datetime
from typing import Protocol

from .exceptions import RateLimitExceededError


class RateLimitRepositoryPort(Protocol):
    async def increment(self, scope: str, subject_hash: str, window_start: datetime) -> int: ...


class RateLimitService:
    def __init__(self, repository: RateLimitRepositoryPort, secret: str) -> None:
        self.repository = repository
        self.secret = secret.encode()

    async def check(self, scope: str, subject: str, limit: int) -> None:
        subject_hash = hmac.new(self.secret, subject.encode(), hashlib.sha256).hexdigest()
        now = datetime.now(UTC)
        window_start = now.replace(second=0, microsecond=0)
        if await self.repository.increment(scope, subject_hash, window_start) > limit:
            raise RateLimitExceededError(60 - now.second)
