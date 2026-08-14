from datetime import UTC, datetime, timedelta

# En una emergencia la información envejece rápido: un albergue puede llenarse o cerrar
# en horas. Pasado este plazo sin reconfirmar, la publicación se marca como envejecida
# para que nadie se desplace confiando en un dato viejo.
STALE_AFTER = timedelta(hours=24)


def is_stale(last_confirmed_at: datetime | None, now: datetime | None = None) -> bool:
    """Indica si una publicación lleva demasiado tiempo sin reconfirmarse."""
    if last_confirmed_at is None:
        return True
    reference = now or datetime.now(UTC)
    moment = (
        last_confirmed_at
        if last_confirmed_at.tzinfo is not None
        else last_confirmed_at.replace(tzinfo=UTC)
    )
    return reference - moment > STALE_AFTER
