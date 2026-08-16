import { useCallback, useEffect, useState } from 'react';
import { Navigation, Route } from 'lucide-react';
import { markReportAttended, type Session } from '../../shared/api/coordination';
import { loadDeliveryStops, type DeliveryStop } from '../../shared/api/public-reports';
import { formatFreshness } from '@timeliber/kit';

interface DeliveryRunProps {
  session: Session;
  territoryId: string;
}

/**
 * El recorrido de entrega: a dónde falta subir y a dónde ya llegó alguien.
 *
 * Nació de un caso concreto: un grupo de todoterreno que reparte desde su acopio y sube a
 * veredas donde no entra un camión. Sin esto, tres grupos suben al mismo sitio el mismo día
 * y a otro no llega nadie, que es la forma más común de desperdiciar ayuda.
 *
 * Los pendientes van primero, siempre. Lo ya entregado se queda visible pero apagado: es la
 * prueba de que no hay que volver.
 */
export function DeliveryRun({ session, territoryId }: DeliveryRunProps) {
  const [stops, setStops] = useState<DeliveryStop[]>([]);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const refresh = useCallback(() => {
    loadDeliveryStops(territoryId)
      .then(setStops)
      .catch(() => setError('No fue posible cargar los sitios'));
  }, [territoryId]);

  useEffect(refresh, [refresh]);

  async function alternar(stop: DeliveryStop) {
    setBusy(stop.id);
    setError('');
    try {
      await markReportAttended(session.access_token, stop.id, !stop.attendedAt);
      refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No fue posible guardar');
    } finally {
      setBusy('');
    }
  }

  const pendientes = stops.filter((stop) => !stop.attendedAt).length;

  return (
    <section className="coordination-card">
      <div className="coordination-intro">
        <span className="coordination-icon">
          <Route />
        </span>
        <p className="eyebrow">Recorrido de entrega</p>
        <h2>¿A dónde falta llegar?</h2>
        <p>
          {stops.length === 0
            ? 'Todavía nadie ha pedido ayuda en este municipio.'
            : pendientes === 0
              ? 'Ya se visitaron todos los sitios publicados.'
              : `Faltan ${pendientes} de ${stops.length}. Marca cada uno al salir del sitio.`}
        </p>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <ul className="delivery-stops">
        {stops.map((stop) => (
          <li className={stop.attendedAt ? 'is-done' : undefined} key={stop.id}>
            <div className="delivery-stop-body">
              <strong>{stop.title}</strong>
              <span>{stop.neighborhood || 'Sin barrio indicado'}</span>
              <p>{stop.description}</p>
              {stop.attendedAt && (
                <span className="delivery-done-mark">
                  Entregado {formatFreshness(stop.attendedAt)}
                </span>
              )}
            </div>
            <div className="delivery-stop-actions">
              {stop.coordinates && (
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${stop.coordinates.latitude},${stop.coordinates.longitude}`}
                  rel="noreferrer"
                  target="_blank"
                >
                  <Navigation size={16} aria-hidden="true" /> Cómo llegar
                </a>
              )}
              <button disabled={busy === stop.id} onClick={() => alternar(stop)} type="button">
                {busy === stop.id
                  ? 'Guardando…'
                  : stop.attendedAt
                    ? 'No, todavía no'
                    : 'Ya llegamos'}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
