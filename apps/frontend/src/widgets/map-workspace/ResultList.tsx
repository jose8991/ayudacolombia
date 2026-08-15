import { ShieldCheck } from 'lucide-react';
import type { HumanitarianMapPoint, MapCategory } from '../../entities/incident';
import { formatFreshness } from '@timeliber/kit';

const CATEGORY_LABELS: Record<MapCategory, string> = {
  need: 'Necesidad',
  offer: 'Ayuda ofrecida',
  'aid-center': 'Centro o albergue',
  damage: 'Daño o acceso',
};

const STATUS_LABELS: Record<string, string> = {
  reported: 'Sin confirmar',
  verified: 'Revisado',
  official: 'Confirmado',
  stale: 'Desactualizado',
  closed: 'Cerrado',
};

interface ResultListProps {
  visiblePoints: readonly HumanitarianMapPoint[];
  selectedPointId: string | null;
  onSelectPoint: (id: string) => void;
  distanceTo: (point: HumanitarianMapPoint) => string | null;
  query: string;
  onClearQuery: () => void;
  onlyConfirmed: boolean;
  onShowUnconfirmed: () => void;
}

/** Lo que hay cerca, en lista: lo más cercano primero cuando se comparte la ubicación. */
export function ResultList({
  visiblePoints,
  selectedPointId,
  onSelectPoint,
  distanceTo,
  query,
  onClearQuery,
  onlyConfirmed,
  onShowUnconfirmed,
}: ResultListProps) {
  return (
    <div className="result-list" aria-label="Elementos visibles">
      {visiblePoints.map((point) => (
        <button
          aria-pressed={selectedPointId === point.id}
          className={'result-card result-card--' + point.category}
          key={point.id}
          onClick={() => onSelectPoint(point.id)}
          type="button"
        >
          <div>
            <span>{CATEGORY_LABELS[point.category]}</span>
            <span className={'trust-badge trust-badge--' + point.verificationStatus}>
              <ShieldCheck size={13} /> {STATUS_LABELS[point.verificationStatus]}
            </span>
          </div>
          <h3>{point.title}</h3>
          <p>
            {point.neighborhood}
            {distanceTo(point) && <strong className="card-distance"> · {distanceTo(point)}</strong>}
          </p>
          {!point.coordinates && (
            <small className="no-exact-location">Sin punto exacto en el mapa</small>
          )}
          <small>{point.description}</small>
          <time dateTime={point.observedAt}>
            Actualizado {formatFreshness(point.observedAt)}
            {point.isStale && ' · puede estar desactualizado'}
          </time>
        </button>
      ))}
      {visiblePoints.length === 0 && (
        <div className="empty-state">
          <p>
            {query
              ? 'No encontramos nada con esa búsqueda.'
              : 'Todavía no hay nada publicado aquí.'}
          </p>
          {!query && (
            <p className="emergency-hint">
              ¿Hay peligro ahora? <a href="tel:123">Llama al 123</a>.
            </p>
          )}
          {query ? (
            <button onClick={onClearQuery} type="button">
              Limpiar búsqueda
            </button>
          ) : (
            onlyConfirmed && (
              <button onClick={() => onShowUnconfirmed()} type="button">
                Ver también lo que falta por confirmar
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}
