from datetime import UTC, datetime, timedelta

# Un aviso que sale en todas las fichas deja de ser un aviso. Con 24 horas, y sin nadie
# reconfirmando en terreno, el mapa entero aparecía "posiblemente desactualizado" y la
# advertencia se volvía ruido.
#
# El umbral responde a qué tan rápido cambia el hecho. Que un albergue EXISTA cambia en
# días; que tenga cupo cambia en horas. Aquí se marca lo primero, y para lo segundo la
# interfaz muestra siempre el tiempo transcurrido —"actualizado hace 2 días"— para que
# cada quien juzgue. La advertencia fuerte queda para lo que casi seguro ya no es cierto.
STALE_AFTER = timedelta(hours=72)


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
