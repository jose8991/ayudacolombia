import { linesForTerritory } from '../../shared/data/emergency-lines';
import type { HumanitarianRegion, MapCategory } from '../../entities/incident';
import type { HelpJourney } from '../home-primary-actions';
import type { ReportKind } from './report-kind';
import { StatusLookup } from './StatusLookup';
import type { SavedTrackingCode } from '../../shared/offline/last-tracking-code';

interface JourneyMenusProps {
  activeJourney: HelpJourney;
  region: HumanitarianRegion;
  counts: Record<MapCategory, number>;
  publicDataLoaded: boolean;
  onShowMap: (layers: MapCategory[], query?: string) => void;
  onChangeJourney: (journey: HelpJourney) => void;
  onPickKind: (kind: ReportKind) => void;
  /** Cuando ya se eligió qué publicar, el menú deja paso al formulario. */
  pickedKind: ReportKind | null;
  savedCode: SavedTrackingCode | null;
}

/** Las listas de opciones de cada recorrido. Sin estado propio: solo decisiones. */
export function JourneyMenus({
  activeJourney,
  region,
  counts,
  publicDataLoaded,
  onShowMap,
  onChangeJourney,
  onPickKind,
  pickedKind,
  savedCode,
}: JourneyMenusProps) {
  return (
    <>
      {activeJourney === 'help' && (
        <>
          <p className="eyebrow">Necesito ayuda</p>
          <h2 id="journey-title">¿Qué buscas?</h2>
          <p>Busca un lugar cerca o pide ayuda.</p>
          <div className="journey-options">
            <button onClick={() => onShowMap(['aid-center'], 'comida')} type="button">
              Agua o comida
            </button>
            <button onClick={() => onShowMap(['aid-center'], 'salud')} type="button">
              Atención en salud
            </button>
            <button onClick={() => onShowMap(['aid-center'], 'dormir')} type="button">
              Dónde dormir
            </button>
            <button
              onClick={() => {
                onPickKind('need');
                onChangeJourney('report');
              }}
              type="button"
            >
              <strong>Pedir ayuda</strong>
              <small>Solo lo ve el equipo que coordina</small>
            </button>
            <button onClick={() => onShowMap(['damage'])} type="button">
              Vías y accesos
            </button>
          </div>
          <p className="emergency-hint">
            ¿Hay peligro ahora? <a href="tel:123">Llama al 123</a>.
          </p>
          <details className="emergency-lines">
            <summary>Líneas oficiales para llamar</summary>
            <ul>
              {linesForTerritory(region.id).map((line) => (
                <li key={line.number}>
                  <a href={'tel:' + line.number}>
                    <strong>{line.label}</strong>
                    <span>{line.display}</span>
                  </a>
                  <small>{line.purpose}</small>
                </li>
              ))}
            </ul>
          </details>
          {publicDataLoaded && counts['aid-center'] === 0 && (
            <p className="journey-notice">
              Todavía no hay centros publicados aquí. Puedes pedir ayuda.
            </p>
          )}
        </>
      )}
      {activeJourney === 'donate' && (
        <>
          <p className="eyebrow">Quiero ayudar</p>
          <h2 id="journey-title">¿Cómo quieres ayudar?</h2>
          <p>Mira qué falta, qué ya se ofrece o publica tu ayuda.</p>
          <div className="journey-options">
            <button
              onClick={() => {
                onPickKind('offer');
                onChangeJourney('report');
              }}
              type="button"
            >
              <strong>Ofrecer ayuda</strong>
              <small>Publica lo que puedes dar. Son dos toques.</small>
            </button>
            <button onClick={() => onShowMap(['aid-center'])} type="button">
              <strong>Llevar algo ahora</strong>
              <small>Mira dónde recibirlo. No pedimos ningún dato.</small>
            </button>
            <button onClick={() => onShowMap(['need'])} type="button">
              Ver qué falta
            </button>
            <button onClick={() => onShowMap(['offer'])} type="button">
              Ver ayudas ofrecidas
            </button>
          </div>
          {publicDataLoaded && counts.need === 0 && (
            <p className="journey-notice">
              Todavía no hay necesidades publicadas. Puedes ofrecer tu ayuda.
            </p>
          )}
        </>
      )}
      {activeJourney === 'centers' && (
        <>
          <p className="eyebrow">Centros y albergues</p>
          <h2 id="journey-title">Centros en {region.name}</h2>
          <p>Mira horario, dirección y qué recibe cada uno.</p>
          <button
            className="journey-map-link"
            onClick={() => onShowMap(['aid-center'])}
            type="button"
          >
            Ver centros en el mapa
          </button>
          {publicDataLoaded && counts['aid-center'] === 0 && (
            <p className="journey-notice">Aún no hay centros verificados publicados.</p>
          )}
        </>
      )}
      {activeJourney === 'report' && !pickedKind && (
        <>
          <p className="eyebrow">Reportar</p>
          <h2 id="journey-title">¿Qué quieres reportar?</h2>
          <p>Toca una opción. No necesitas cuenta.</p>
          <div className="journey-options report-kind-options">
            <button onClick={() => onPickKind('place')} type="button">
              <strong>Un lugar de ayuda</strong>
              <small>Albergue, centro de acopio o punto de atención</small>
            </button>
            <button onClick={() => onPickKind('community-need')} type="button">
              <strong>Aquí necesitan ayuda</strong>
              <small>Un barrio, una vereda o una familia que necesita algo</small>
            </button>
            <button onClick={() => onPickKind('damage')} type="button">
              <strong>Un daño o una vía cerrada</strong>
              <small>Casa en riesgo, derrumbe o paso bloqueado</small>
            </button>
          </div>
          <StatusLookup savedCode={savedCode} />
        </>
      )}
    </>
  );
}
