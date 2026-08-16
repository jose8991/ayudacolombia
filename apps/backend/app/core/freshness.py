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


# Un "vamos en camino" que nadie limpia es peor que no tenerlo: deja el sitio marcado como
# cubierto mientras no llega nadie, y los demás grupos lo saltan. Por eso caduca solo.
#
# Seis horas es lo que puede tomar una subida a una vereda con vía en mal estado, contando
# el regreso. Pasado eso, el sitio vuelve a aparecer como pendiente: si el grupo sí llegó,
# lo marca como entregado y se acabó; si no llegó, alguien más debe poder ir.
EN_ROUTE_WINDOW = timedelta(hours=6)


def is_en_route(en_route_at: datetime | None, now: datetime | None = None) -> bool:
    """Indica si el aviso de que un grupo iba en camino sigue siendo creíble."""
    if en_route_at is None:
        return False
    reference = now or datetime.now(UTC)
    moment = en_route_at if en_route_at.tzinfo is not None else en_route_at.replace(tzinfo=UTC)
    return reference - moment <= EN_ROUTE_WINDOW


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
