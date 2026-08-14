import hashlib
import secrets
from datetime import UTC, datetime
from typing import Protocol

from app.core.encryption import encrypt_sensitive

from .exceptions import NeedIdempotencyConflictError, NeedNotFoundError
from .models import AssistanceNeed
from .schemas import NeedCreate, NeedReceipt


class NeedRepositoryPort(Protocol):
    async def add(self, need: AssistanceNeed) -> AssistanceNeed: ...

    async def get_by_tracking_code(self, code: str) -> AssistanceNeed | None: ...
    async def get_by_idempotency_key(self, key_hash: str) -> AssistanceNeed | None: ...


class NeedService:
    def __init__(self, repository: NeedRepositoryPort) -> None:
        self.repository = repository

    async def create(self, payload: NeedCreate, idempotency_key: str) -> NeedReceipt:
        key_hash = hashlib.sha256(idempotency_key.encode()).hexdigest()
        fingerprint = hashlib.sha256(payload.model_dump_json().encode()).hexdigest()
        existing = await self.repository.get_by_idempotency_key(key_hash)
        if existing is not None:
            if existing.request_fingerprint != fingerprint:
                raise NeedIdempotencyConflictError
            return self._receipt(existing)
        need = AssistanceNeed(
            **payload.model_dump(exclude={"contact", "privacy_authorized"}),
            contact_ciphertext=encrypt_sensitive(payload.contact),
            privacy_accepted_at=datetime.now(UTC),
            tracking_code=self._tracking_code(),
            idempotency_key_hash=key_hash,
            request_fingerprint=fingerprint,
        )
        return self._receipt(await self.repository.add(need))

    @staticmethod
    def _receipt(created: AssistanceNeed) -> NeedReceipt:
        return NeedReceipt(
            tracking_code=created.tracking_code,
            status=created.status,
            message="Solicitud recibida. Guarda este código para consultar el estado.",
        )

    async def get_status(self, code: str) -> AssistanceNeed:
        need = await self.repository.get_by_tracking_code(code)
        if need is None:
            raise NeedNotFoundError
        return need

    @staticmethod
    def _tracking_code() -> str:
        return "SOS-" + secrets.token_hex(4).upper()
