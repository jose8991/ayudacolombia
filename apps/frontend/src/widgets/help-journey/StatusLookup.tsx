import { useState, type FormEvent } from 'react';
import { loadSubmissionStatus } from '../../shared/api/submissions';
import type { SavedTrackingCode } from '../../shared/offline/last-tracking-code';

const STATUS_LABELS: Record<string, string> = {
  received: 'Recibida. Falta revisarla.',
  assigned: 'Ya la tiene el equipo que coordina.',
  in_progress: 'La ayuda está en camino.',
  resolved: 'Atendida.',
  closed: 'Cerrada.',
  reported: 'Recibido. Falta revisarlo.',
  verified: 'Revisado.',
  official: 'Confirmado.',
  rejected: 'No se publicó.',
};

/** Consultar en qué va lo que se envió, con el código guardado en el dispositivo. */
export function StatusLookup({ savedCode }: { savedCode: SavedTrackingCode | null }) {
  const [lookupStatus, setLookupStatus] = useState<string | null>(null);

  const lookupReport = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const code = String(data.get('trackingCode')).trim().toUpperCase();
    const kind = data.get('statusType') === 'need' ? 'need' : 'report';
    setLookupStatus('Consultando...');
    try {
      const result = await loadSubmissionStatus(kind, code);
      const statusValue = result.verification_status ?? result.status ?? '';
      setLookupStatus(STATUS_LABELS[statusValue] ?? statusValue);
    } catch (error) {
      setLookupStatus(
        error instanceof Error && error.message === 'not_found'
          ? 'No encontramos ese código. Revísalo e inténtalo de nuevo.'
          : 'Sin conexión. Inténtalo nuevamente.',
      );
    }
  };

  return (
    <details className="status-lookup">
      <summary>{savedCode ? 'Ver cómo va lo que enviaste' : 'Ya tengo un código'}</summary>
      {savedCode && (
        <p className="saved-code">
          Tu último código: <strong>{savedCode.code}</strong>
        </p>
      )}
      <form onSubmit={lookupReport}>
        <label>
          ¿Qué enviaste?
          <select defaultValue={savedCode?.kind ?? 'need'} name="statusType">
            <option value="need">Pedí ayuda</option>
            <option value="report">Reporté algo</option>
          </select>
        </label>
        <label>
          Código
          <input
            autoCapitalize="characters"
            defaultValue={savedCode?.code}
            name="trackingCode"
            placeholder="SOS-XXXXXXXXXX"
            required
          />
        </label>
        <button type="submit">Ver estado</button>
      </form>
      {lookupStatus && <p role="status">{lookupStatus}</p>}
    </details>
  );
}
