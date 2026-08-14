import { Clock3, MapPinned, ShieldCheck, X } from 'lucide-react';
import type { HumanitarianRegion } from '../../entities/incident';

interface Props {
  regions: readonly HumanitarianRegion[];
  onChoose: (regionId: string) => void;
  onClose?: () => void;
}

export function ServiceAreaChooser({ regions, onChoose, onClose }: Props) {
  return (
    <div className="city-gate">
      <section
        aria-labelledby="city-gate-title"
        aria-modal="true"
        className="city-gate-card"
        role="dialog"
      >
        {onClose && (
          <button
            aria-label="Cerrar selección de ciudad"
            className="city-gate-close"
            onClick={onClose}
            type="button"
          >
            <X />
          </button>
        )}
        <span aria-hidden="true" className="city-gate-mark">
          <MapPinned />
        </span>
        <p className="eyebrow">Ayuda Colombia · Risaralda</p>
        <h1 id="city-gate-title">¿Dónde necesitas información?</h1>
        <p>Consulta la información disponible por comunas y barrios.</p>
        <div className="city-gate-options">
          {regions.map((region) => {
            const available = region.id === 'co-ris-pereira';
            return (
              <button
                disabled={!available}
                key={region.id}
                onClick={() => available && onChoose(region.id)}
                type="button"
              >
                <span>
                  <strong>{region.name}</strong>
                  <small>Risaralda</small>
                </span>
                <span
                  className={available ? 'coverage-badge coverage-badge--ready' : 'coverage-badge'}
                >
                  {available ? <ShieldCheck size={16} /> : <Clock3 size={16} />}{' '}
                  {available ? 'Ver mapa' : 'Próximamente'}
                </span>
              </button>
            );
          })}
        </div>
        <small className="city-gate-note">Disponible ahora en Pereira.</small>
      </section>
    </div>
  );
}
