import { Phone } from 'lucide-react';
import type { PendingReport } from '../../shared/api/coordination';
import { formatFreshness } from '@timeliber/kit';

interface ModerationListProps {
  reports: PendingReport[];
  busy: boolean;
  onModerate: (reportId: string, verificationStatus: 'verified' | 'rejected') => void;
  onContacted: (reportId: string) => void;
}

/**
 * La bandeja de revisión: lo que la ciudadanía envió y espera que alguien confirme.
 * Aquí es donde los tres niveles dejan de ser una idea y pasan a existir.
 */
export function ModerationList({ reports, busy, onModerate, onContacted }: ModerationListProps) {
  return (
    <section className="coordination-card moderation-card">
      <div className="coordination-intro">
        <p className="eyebrow">Revisión territorial</p>
        <h2>Reportes pendientes</h2>
        <p>Verifica la fuente antes de publicar. Las coordenadas son información sensible.</p>
      </div>
      <div className="moderation-list">
        {reports.length === 0 ? (
          <p className="form-empty">No hay reportes pendientes en tus territorios.</p>
        ) : (
          reports.map((report) => (
            <article className="moderation-item" key={report.id}>
              <header>
                <span>
                  {report.territory_id === 'co-ris-pereira'
                    ? 'Pereira'
                    : report.territory_id === 'co-ris-dosquebradas'
                      ? 'Dosquebradas'
                      : report.territory_id}
                </span>
                <strong>{report.category}</strong>
              </header>
              <h3>{report.title}</h3>
              <p>{report.description}</p>
              <small>
                {report.neighborhood_code || 'Sin barrio indicado'} · {report.severity} ·{' '}
                {report.tracking_code}
              </small>
              {report.contacted_at && (
                <p className="already-contacted" role="status">
                  Ya lo contactaron {formatFreshness(report.contacted_at)}
                </p>
              )}
              {report.contact && (
                <p className="moderation-contact">
                  <a href={'tel:' + report.contact.replace(/[^+\d]/g, '')}>
                    <Phone size={16} /> Llamar a {report.contact}
                  </a>
                  <a
                    href={
                      'https://wa.me/' +
                      report.contact.replace(/[^\d]/g, '') +
                      '?text=' +
                      encodeURIComponent('Hola, escribimos de Ayuda Colombia por tu publicación.')
                    }
                    rel="noreferrer"
                    target="_blank"
                  >
                    WhatsApp
                  </a>
                  {!report.contacted_at && (
                    <button disabled={busy} onClick={() => onContacted(report.id)} type="button">
                      Ya lo contacté
                    </button>
                  )}
                </p>
              )}
              <div>
                <button
                  disabled={busy}
                  onClick={() => onModerate(report.id, 'rejected')}
                  type="button"
                >
                  Descartar
                </button>
                <button
                  className="verify-action"
                  disabled={busy}
                  onClick={() => onModerate(report.id, 'verified')}
                  type="button"
                >
                  Marcar verificado
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
