interface MapLegendProps {
  /** El color del área solo aparece donde hay comunas y barrios cargados. */
  showAreaScale: boolean;
  defaultOpen: boolean;
}

// Los dos primeros van en color fuerte; los otros dos, apagados, son contexto.
const MAIN = [
  { key: 'aid-center', label: 'Aquí hay ayuda', glyph: 'casa' },
  { key: 'need', label: 'Aquí la necesitan', glyph: 'gota' },
] as const;

const CONTEXT = [
  { key: 'offer', label: 'Ayuda ofrecida', glyph: 'corazon' },
  { key: 'damage', label: 'Daño o vía cerrada', glyph: 'alerta' },
] as const;

type GlyphName = (typeof MAIN)[number]['glyph'] | (typeof CONTEXT)[number]['glyph'];

function Glyph({ glyph }: { glyph: GlyphName }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
      {glyph === 'casa' && <path d="M12 5 22 14h-4v6H6v-6H2z" />}
      {glyph === 'gota' && <path d="M12 3c5 6 7 8.5 7 11a7 7 0 0 1-14 0c0-2.5 2-5 7-11z" />}
      {glyph === 'corazon' && (
        <path d="M12 20S3 14.5 3 9.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 9 2.5C21 14.5 12 20 12 20z" />
      )}
      {glyph === 'alerta' && <path d="M12 3 23 20H1z" />}
    </svg>
  );
}

export function MapLegend({ showAreaScale, defaultOpen }: MapLegendProps) {
  return (
    <details className="map-legend-panel" open={defaultOpen}>
      <summary>Qué significa cada símbolo</summary>
      <div className="legend-groups">
        <section>
          <h4>Lo que más importa</h4>
          <ul>
            {MAIN.map((item) => (
              <li key={item.key}>
                <span className={'legend-mark legend-mark--' + item.key}>
                  <Glyph glyph={item.glyph} />
                </span>
                {item.label}
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h4>Contexto</h4>
          <ul>
            {CONTEXT.map((item) => (
              <li key={item.key}>
                <span className={'legend-mark legend-mark--' + item.key}>
                  <Glyph glyph={item.glyph} />
                </span>
                {item.label}
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h4>Cuánto se puede confiar</h4>
          <ul>
            <li>
              <span className="legend-mark legend-mark--official" /> Confirmado por una entidad
            </li>
            <li>
              <span className="legend-mark legend-mark--verified" /> Revisado por el equipo
            </li>
            <li>
              <span className="legend-mark legend-mark--reported" /> Sin confirmar
            </li>
          </ul>
        </section>
        <section>
          <h4>Avisos</h4>
          <ul>
            <li>
              <span className="legend-mark legend-mark--aged" /> Puede estar desactualizado
            </li>
            <li>
              <span className="legend-mark legend-mark--blocked" /> Ya no recibe gente
            </li>
            {showAreaScale && (
              <li>
                <i className="urgency-scale" /> Color del área: urgencia
              </li>
            )}
          </ul>
        </section>
      </div>
    </details>
  );
}
