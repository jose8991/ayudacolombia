import {
  Clock3,
  MapPin,
  Navigation,
  PackageCheck,
  ShieldCheck,
  TriangleAlert,
  X,
} from 'lucide-react';
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

interface PlaceDetailProps {
  point: HumanitarianMapPoint;
  directionsUrl: string;
  onClose: () => void;
}

/** La ficha de un lugar: qué es, cuánto se puede confiar, qué tan viejo y cómo llegar. */
export function PlaceDetail({ point, directionsUrl, onClose }: PlaceDetailProps) {
  return (
    <section aria-live="polite" className={'place-detail place-detail--' + point.category}>
      <button
        aria-label="Cerrar detalles"
        className="detail-close"
        onClick={() => onClose()}
        type="button"
      >
        <X size={18} />
      </button>
      <p className="eyebrow">{CATEGORY_LABELS[point.category]}</p>
      <h3>{point.title}</h3>
      <span className={'trust-badge trust-badge--' + point.verificationStatus}>
        <ShieldCheck size={14} /> {STATUS_LABELS[point.verificationStatus]}
      </span>
      <dl>
        <div>
          <dt>
            <MapPin size={16} /> Ubicación
          </dt>
          <dd>{point.address ?? point.neighborhood}</dd>
        </div>
        {point.schedule && (
          <div>
            <dt>
              <Clock3 size={16} /> Horario
            </dt>
            <dd>{point.schedule}</dd>
          </div>
        )}
        {point.acceptedItems && point.acceptedItems.length > 0 && (
          <div>
            <dt>
              <PackageCheck size={16} /> Les hace falta
            </dt>
            <dd className="item-chips">
              {point.acceptedItems.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </dd>
          </div>
        )}
        {point.sufficientItems && point.sufficientItems.length > 0 && (
          <div>
            <dt>
              <PackageCheck size={16} /> Ya tienen suficiente
            </dt>
            <dd className="item-chips item-chips--enough">
              {point.sufficientItems.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </dd>
          </div>
        )}
      </dl>
      {directionsUrl ? (
        <a className="directions-button" href={directionsUrl} rel="noreferrer" target="_blank">
          <Navigation size={18} /> Cómo llegar
        </a>
      ) : (
        <p className="no-exact-location">
          Quien lo reportó no compartió la ubicación exacta. Guíate por el barrio.
        </p>
      )}
      {point.isStale && (
        <p className="stale-warning" role="status">
          <TriangleAlert size={16} /> Puede estar desactualizado. Confirma antes de ir.
        </p>
      )}
      <small>
        {point.sourceLabel ?? 'Fuente ciudadana'} · actualizado {formatFreshness(point.observedAt)}
      </small>
    </section>
  );
}
