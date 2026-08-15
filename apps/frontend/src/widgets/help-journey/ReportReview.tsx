import type { HumanitarianRegion } from '../../entities/incident';
import type { ReportKind } from './report-kind';

interface ReportReviewProps {
  kind: ReportKind;
  draft: Record<string, string>;
  region: HumanitarianRegion;
  sending: boolean;
  failed: boolean;
  onEdit: () => void;
  onSend: () => void;
}

/** Último vistazo antes de publicar algo que habla de otras personas. */
export function ReportReview({
  kind,
  draft,
  region,
  sending,
  failed,
  onEdit,
  onSend,
}: ReportReviewProps) {
  return (
    <section className="report-review" aria-labelledby="journey-title">
      <p className="eyebrow">Último paso</p>
      <h2 id="journey-title">Revisa y envía</h2>
      <dl>
        <div>
          <dt>Municipio</dt>
          <dd>{region.name}</dd>
        </div>
        {kind === 'need' && (
          <div>
            <dt>Personas</dt>
            <dd>{draft.peopleCount}</dd>
          </div>
        )}
        <div>
          <dt>Barrio</dt>
          <dd>{draft.neighborhood || 'No indicado'}</dd>
        </div>
        {kind === 'offer' && draft.title && (
          <div>
            <dt>Ofreces</dt>
            <dd>{draft.title}</dd>
          </div>
        )}
        {draft.description && (
          <div>
            <dt>Lo que contaste</dt>
            <dd>{draft.description}</dd>
          </div>
        )}
        {draft.contact && (
          <div>
            <dt>Tu teléfono</dt>
            <dd>{draft.contact}</dd>
          </div>
        )}
      </dl>
      <p className="privacy-reminder">
        {kind === 'need'
          ? 'Tu teléfono y tu ubicación quedan privados.'
          : draft.contact
            ? 'Tu teléfono queda privado. Lo revisamos antes de publicarlo.'
            : 'Lo revisamos antes de publicarlo.'}
      </p>
      {failed && (
        <p className="form-error" role="alert">
          No pudimos enviarlo. Tus respuestas siguen aquí.
        </p>
      )}
      <div className="review-actions">
        <button className="form-back" disabled={sending} onClick={() => onEdit()} type="button">
          Editar
        </button>
        <button className="primary-submit" disabled={sending} onClick={onSend} type="button">
          {sending ? 'Enviando…' : 'Enviar'}
        </button>
      </div>
    </section>
  );
}
