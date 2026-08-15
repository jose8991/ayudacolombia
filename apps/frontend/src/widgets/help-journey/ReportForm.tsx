import { useRef, useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';
import type { HumanitarianRegion } from '../../entities/incident';
import { RELIEF_ITEMS } from '../../shared/data/relief-items';
import { loadSubmissionStatus, submitPublicInformation } from '../../shared/api/submissions';
import {
  clearPendingSubmission,
  savePendingSubmission,
} from '../../shared/offline/secure-submission-outbox';
import { saveTrackingCode, type SavedTrackingCode } from '../../shared/offline/last-tracking-code';
import type { ReportKind } from './report-kind';
import { KIND_CONFIG } from './report-kind-config';
import { buildSubmission } from './build-submission';
import { ReportReview } from './ReportReview';
import { ReportSent } from './ReportSent';
import { StatusLookup } from './StatusLookup';

const OFFER_KINDS = [
  'Transporte',
  'Comida',
  'Agua',
  'Alojamiento',
  'Tiempo y manos',
  'Otra cosa',
] as const;

interface ReportFormProps {
  kind: ReportKind;
  region: HumanitarianRegion;
  savedCode: SavedTrackingCode | null;
  onChangeKind: (kind: ReportKind | null) => void;
  onTracked: (code: SavedTrackingCode) => void;
  onOutboxNotice: (message: string) => void;
  onClose: () => void;
}

/**
 * Publicar algo: el formulario, la revisión, el acuse con el código y la consulta de
 * estado. Su borrador y su envío no le importan a nadie fuera de aquí.
 */
export function ReportForm({
  kind,
  region,
  savedCode,
  onChangeKind,
  onTracked,
  onOutboxNotice,
  onClose,
}: ReportFormProps) {
  const [reportDraft, setReportDraft] = useState<Record<string, string> | null>(null);
  const [reviewingReport, setReviewingReport] = useState(false);
  const [reportStatus, setReportStatus] = useState<
    'idle' | 'sending' | 'queued' | 'sent' | 'error'
  >('idle');
  const [locationNotice, setLocationNotice] = useState<string | null>(null);
  const [useLocation, setUseLocation] = useState(false);
  const [reportCode, setReportCode] = useState<string | null>(null);
  const submissionKeyRef = useRef<string | null>(null);
  const submissionMutation = useMutation({ mutationFn: submitPublicInformation });
  const config = KIND_CONFIG[kind];

  const prepareReport = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submissionKeyRef.current = crypto.randomUUID();
    const values: Record<string, string> = {};
    new FormData(event.currentTarget).forEach((value, key) => {
      values[key] = String(value);
    });
    setReportDraft(values);
    // Ofrecer ayuda no pasa por revisión: no lleva datos de terceros y lo que se publica
    // es exactamente lo que la persona acaba de ver en pantalla. Un paso menos en el
    // recorrido que más queremos que la gente complete.
    if (kind === 'offer') {
      void submitPublicReport(values);
      return;
    }
    setReviewingReport(true);
  };
  const submitPublicReport = async (draft: Record<string, string> | null = reportDraft) => {
    if (!draft) return;
    setReportStatus('sending');
    setLocationNotice(null);
    try {
      const position = useLocation
        ? await new Promise<GeolocationPosition | null>((resolve) => {
            if (!navigator.geolocation) return resolve(null);
            navigator.geolocation.getCurrentPosition(resolve, () => resolve(null), {
              enableHighAccuracy: true,
              timeout: 12000,
            });
          })
        : null;
      if (useLocation && !position)
        setLocationNotice('No pudimos obtener tu ubicación. Guardaremos el lugar que escribiste.');
      submissionKeyRef.current = submissionKeyRef.current ?? crypto.randomUUID();
      const submission = buildSubmission(
        kind,
        draft,
        region.id,
        position
          ? { latitude: position.coords.latitude, longitude: position.coords.longitude }
          : null,
        submissionKeyRef.current,
      );
      try {
        const receipt = await submissionMutation.mutateAsync(submission);
        clearPendingSubmission();
        setReportCode(receipt.tracking_code);
        saveTrackingCode(receipt.tracking_code, submission.kind);
        onTracked({ code: receipt.tracking_code, kind: submission.kind });
        setReportStatus('sent');
        setUseLocation(false);
      } catch {
        await savePendingSubmission(submission);
        setReportStatus('queued');
        onOutboxNotice(
          'Información guardada de forma cifrada. La enviaremos cuando vuelva la conexión.',
        );
      }
    } catch {
      setReportStatus('error');
    }
  };

  return (
    <>
      {reportStatus !== 'sent' && !reviewingReport && (
        <form className="public-report-form" onSubmit={prepareReport}>
          {config.canChangeKind && (
            <button className="form-back" onClick={() => onChangeKind(null)} type="button">
              Cambiar tipo
            </button>
          )}
          <p className="eyebrow">{config.eyebrow}</p>
          <h2 id="journey-title">{config.title}</h2>
          <p>{config.intro}</p>
          {kind === 'need' && (
            <>
              <label>
                ¿Qué necesitas?
                <select defaultValue={reportDraft?.needCategory} name="needCategory" required>
                  <option value="food">Alimentos</option>
                  <option value="water">Agua</option>
                  <option value="medicine">Medicamentos o salud</option>
                  <option value="shelter">Alojamiento</option>
                  <option value="transport">Transporte</option>
                  <option value="other">Otra ayuda</option>
                </select>
              </label>
              <label>
                ¿Cuántas personas?
                <input
                  defaultValue={reportDraft?.peopleCount ?? '1'}
                  inputMode="numeric"
                  max="500"
                  min="1"
                  name="peopleCount"
                  required
                  type="number"
                />
              </label>
            </>
          )}
          {kind === 'place' ? (
            <label>
              Tipo de lugar
              <select defaultValue={reportDraft?.category} name="category" required>
                <option value="shelter">Albergue comunitario</option>
                <option value="aid-center">Centro de acopio o punto de ayuda</option>
              </select>
            </label>
          ) : (
            kind !== 'need' && (
              <input
                name="category"
                type="hidden"
                value={kind === 'community-need' ? 'need' : kind}
              />
            )
          )}
          {config.chips && (
            <fieldset className="offer-kinds">
              <legend>{config.chips.legend}</legend>
              {config.chips.options.map((option) => {
                const value = config.chips!.prefix + option.toLocaleLowerCase('es');
                return (
                  <label key={option}>
                    <input
                      defaultChecked={reportDraft?.title === value}
                      name="title"
                      required
                      type="radio"
                      value={value}
                    />
                    <span>{option}</span>
                  </label>
                );
              })}
            </fieldset>
          )}
          {config.freeTitle && (
            <label>
              {config.freeTitle.label}
              <input
                defaultValue={reportDraft?.title}
                maxLength={100}
                minLength={3}
                name="title"
                placeholder={config.freeTitle.placeholder}
                required
              />
            </label>
          )}
          <label>
            ¿En qué barrio o vereda?{' '}
            <span>{config.neighborhoodRequired ? 'Barrio, vereda o sector' : 'Opcional'}</span>
            <input
              defaultValue={reportDraft?.neighborhood}
              maxLength={120}
              minLength={config.neighborhoodRequired ? 2 : undefined}
              name="neighborhood"
              placeholder="Ej. vereda El Manzano"
              required={config.neighborhoodRequired}
            />
          </label>
          <label className="location-choice">
            <input
              checked={useLocation}
              onChange={(event) => setUseLocation(event.target.checked)}
              type="checkbox"
            />
            <span>
              <strong>Usar mi ubicación</strong>
              <small>Te pediremos permiso al enviar.</small>
            </span>
          </label>
          <label>
            {config.description.label} {!config.description.required && <span>Opcional</span>}
            <textarea
              defaultValue={reportDraft?.description}
              maxLength={600}
              minLength={config.description.required ? 5 : undefined}
              name="description"
              placeholder={config.description.placeholder}
              required={config.description.required}
              rows={3}
            />
          </label>
          {config.phone !== 'none' && (
            <label>
              Tu teléfono <span>{config.phoneHint}</span>
              <input
                autoComplete="tel"
                defaultValue={reportDraft?.contact}
                maxLength={160}
                minLength={5}
                name="contact"
                placeholder="Ej. 300 123 4567"
                required={config.phone === 'required'}
                type="tel"
              />
            </label>
          )}
          {config.askUrgency ? (
            <label>
              ¿Para cuándo?
              <select defaultValue={reportDraft?.severity} name="severity" required>
                <option value="medium">Es urgente hoy</option>
                <option value="critical">Hay peligro ahora</option>
                <option value="low">Puede esperar</option>
              </select>
            </label>
          ) : (
            <input name="severity" type="hidden" value="medium" />
          )}
          <label className="privacy-consent">
            <input name="privacyConsent" required type="checkbox" />
            <span>
              {config.consent}{' '}
              <a href="/tratamiento-de-datos" rel="noreferrer" target="_blank">
                Cómo cuidamos tus datos
              </a>
              .
            </span>
          </label>
          <button className="primary-submit" type="submit">
            Ver y enviar
          </button>
          {locationNotice && (
            <p className="form-notice" role="status">
              {locationNotice}
            </p>
          )}
          {reportStatus === 'error' && (
            <p className="form-error" role="alert">
              No pudimos guardar la información. Conservamos lo que escribiste; revisa tu conexión e
              inténtalo nuevamente.
            </p>
          )}
        </form>
      )}
      {reportStatus !== 'sent' && reviewingReport && reportDraft && (
        <ReportReview
          draft={reportDraft}
          failed={reportStatus === 'error'}
          kind={kind}
          onEdit={() => setReviewingReport(false)}
          onSend={() => void submitPublicReport()}
          region={region}
          sending={reportStatus === 'sending'}
        />
      )}
      {reportStatus === 'sent' && <ReportSent code={reportCode} kind={kind} onClose={onClose} />}
      {reportStatus !== 'sent' && <StatusLookup savedCode={savedCode} />}
    </>
  );
}
