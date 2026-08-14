from app.core.encryption import decrypt_sensitive, encrypt_sensitive
from app.domains.needs.schemas import NeedStatus


def test_sensitive_contact_is_encrypted_at_rest() -> None:
    contact = "+57 300 123 4567"

    ciphertext = encrypt_sensitive(contact)

    assert contact.encode() not in ciphertext
    assert decrypt_sensitive(ciphertext) == contact


def test_public_need_status_does_not_expose_contact() -> None:
    assert "contact" not in NeedStatus.model_fields
    assert "description" not in NeedStatus.model_fields
