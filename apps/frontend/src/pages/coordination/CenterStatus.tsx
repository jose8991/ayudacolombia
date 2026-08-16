import { useState } from 'react';
import { updateCenter, type ManagedCenter, type Session } from '../../shared/api/coordination';

/** Los cuatro estados, con el texto que verá quien busca ayuda en el mapa. */
const STATES = [
  { value: 'open', label: 'Abierto', effect: 'Aparece como abierto para recibir ayudas.' },
  { value: 'almost_full', label: 'Casi lleno', effect: 'Avisa que revisen antes de ir.' },
  { value: 'do_not_send', label: 'No enviar más', effect: 'Pide que no lleven más por ahora.' },
  { value: 'closed', label: 'Cerrado', effect: 'Deja de aparecer como disponible.' },
] as const;

interface CenterStatusProps {
  session: Session;
  center: ManagedCenter;
  onChanged: (center: ManagedCenter) => void;
}

/**
 * Cambiar el estado del lugar, en un toque.
 *
 * Es lo que más se hace durante una emergencia y lo que peor sale si no se puede hacer: un
 * albergue lleno que sigue diciendo "abierto" manda gente y donaciones a un sitio que ya no
 * puede recibirlas. Por eso está arriba y no dentro del formulario de publicar.
 */
export function CenterStatus({ session, center, onChanged }: CenterStatusProps) {
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  async function cambiar(status: (typeof STATES)[number]['value']) {
    if (status === center.status || busy) return;
    setBusy(status);
    setError('');
    setSaved(false);
    try {
      onChanged(await updateCenter(session.access_token, center.id, { status }));
      setSaved(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No fue posible cambiar el estado');
    } finally {
      setBusy('');
    }
  }

  const actual = STATES.find((state) => state.value === center.status);

  return (
    <section className="coordination-card">
      <div className="coordination-intro">
        <p className="eyebrow">{center.name}</p>
        <h2>¿Cómo está ahora?</h2>
        <p>{actual ? actual.effect : 'Elige el estado que se verá en el mapa.'}</p>
      </div>
      <div className="status-switch">
        {STATES.map((state) => (
          <button
            aria-pressed={state.value === center.status}
            className={state.value === center.status ? 'status-option is-current' : 'status-option'}
            disabled={busy !== ''}
            key={state.value}
            onClick={() => cambiar(state.value)}
            type="button"
          >
            <strong>{busy === state.value ? 'Guardando…' : state.label}</strong>
            <span>{state.effect}</span>
          </button>
        ))}
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {saved && !error && (
        <p className="status-saved" role="status">
          Listo, ya se ve así en el mapa.
        </p>
      )}
    </section>
  );
}
