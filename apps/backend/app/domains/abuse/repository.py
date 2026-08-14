from datetime import datetime

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


class RateLimitRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def increment(self, scope: str, subject_hash: str, window_start: datetime) -> int:
        count: int | None = await self.session.scalar(
            text(
                """
                INSERT INTO abuse_rate_limits
                    (scope, subject_hash, window_started_at, request_count)
                VALUES (:scope, :subject_hash, :window_start, 1)
                ON CONFLICT (scope, subject_hash, window_started_at)
                DO UPDATE SET request_count = abuse_rate_limits.request_count + 1
                RETURNING request_count
                """
            ),
            {"scope": scope, "subject_hash": subject_hash, "window_start": window_start},
        )
        await self.session.commit()
        return count or 1
