import base64
import hashlib

from cryptography.fernet import Fernet

from app.core.config import get_settings


def _cipher() -> Fernet:
    digest = hashlib.sha256(get_settings().data_encryption_key.encode()).digest()
    return Fernet(base64.urlsafe_b64encode(digest))


def encrypt_sensitive(value: str) -> bytes:
    return _cipher().encrypt(value.encode())


def decrypt_sensitive(value: bytes) -> str:
    return _cipher().decrypt(value).decode()
