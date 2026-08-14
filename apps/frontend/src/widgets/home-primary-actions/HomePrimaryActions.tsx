import { HandHeart, MapPin, TriangleAlert } from 'lucide-react';
import { ActionButton } from '../../design-system/atoms/ActionButton';
import type { MapCategory } from '../../entities/incident';

export type HelpJourney = 'help' | 'donate' | 'report' | 'centers';

interface PublicCounts {
  need: number;
  offer: number;
  'aid-center': number;
  damage: number;
}

interface HomePrimaryActionsProps {
  counts: PublicCounts;
  department: string;
  mapVisible: boolean;
  onOpenJourney: (journey: HelpJourney) => void;
  onShowMap: (layers: MapCategory[]) => void;
  publicDataLoaded: boolean;
  regionName: string;
}

export function HomePrimaryActions({
  counts,
  department,
  mapVisible,
  onOpenJourney,
  onShowMap,
  publicDataLoaded,
  regionName,
}: HomePrimaryActionsProps) {
  const publishedCount = counts.need + counts['aid-center'] + counts.damage;

  return (
    <section
      className={`situation-bar${mapVisible ? '' : ' situation-bar--gateway'}`}
      aria-label="Acciones de ayuda"
    >
      <div className="task-heading">
        <p className="eyebrow">
          {regionName}, {department}
        </p>
        <h1>¿Qué necesitas?</h1>
        <p>Toca una opción. No necesitas cuenta.</p>
      </div>
      {mapVisible && !publicDataLoaded && (
        <p className="data-summary" role="status">
          Consultando información…
        </p>
      )}
      {mapVisible && publicDataLoaded && publishedCount > 0 && (
        <div className="situation-metrics">
          {counts.need > 0 && (
            <span>
              <strong>{counts.need}</strong> necesidades
            </span>
          )}
          {counts['aid-center'] > 0 && (
            <span>
              <strong>{counts['aid-center']}</strong> centros
            </span>
          )}
          {counts.damage > 0 && (
            <span>
              <strong>{counts.damage}</strong> afectaciones
            </span>
          )}
        </div>
      )}
      <nav className="quick-actions" aria-label="Acciones principales">
        <ActionButton
          icon={<TriangleAlert size={20} />}
          label="Necesito ayuda"
          description="Agua, comida, salud o dónde dormir"
          onClick={() => onOpenJourney('help')}
          tone="danger"
        />
        <ActionButton
          icon={<HandHeart size={20} />}
          label="Quiero ayudar"
          description="Ver qué falta y dónde llevarlo"
          onClick={() => onOpenJourney('donate')}
          tone="support"
        />
        <ActionButton
          icon={<MapPin size={20} />}
          label="Reportar"
          description="Un daño, una vía cerrada o un albergue"
          onClick={() => onOpenJourney('report')}
          tone="neutral"
        />
      </nav>
      {!mapVisible && (
        <button
          className="explore-map-action"
          onClick={() => onShowMap(['aid-center', 'need', 'offer', 'damage'])}
          type="button"
        >
          <MapPin size={18} /> Explorar el mapa de {regionName}
        </button>
      )}
    </section>
  );
}
