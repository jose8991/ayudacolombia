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
import { StatusLookup } from './StatusLookup';

const PRIVACY_POLICY_VERSION = '2026-08-13';
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
  const [codeCopied, setCodeCopied] = useState(false);
  const submissionKeyRef = useRef<string | null>(null);
  const submissionMutation = useMutation({ mutationFn: submitPublicInformation });

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
      const isPrivateNeed = kind === 'need';
      const urgency = draft.severity;
      const privacy = { privacy_authorized: true, privacy_policy_version: PRIVACY_POLICY_VERSION };
      const payload = isPrivateNeed
        ? {
            territory_id: region.id,
            category: draft.needCategory,
            people_count: Number(draft.peopleCount),
            neighborhood: draft.neighborhood,
            latitude: position?.coords.latitude ?? null,
            longitude: position?.coords.longitude ?? null,
            urgency:
              urgency === 'critical' ? 'immediate_danger' : urgency === 'low' ? 'soon' : 'today',
            contact: draft.contact,
            description: draft.description,
            ...privacy,
          }
        : {
            territory_id: region.id,
            category: draft.category,
            title: draft.title,
            description: draft.description,
            neighborhood_code: draft.neighborhood || null,
            severity: draft.severity,
            contact: draft.contact || null,
            coordinates: position
              ? { longitude: position.coords.longitude, latitude: position.coords.latitude }
              : null,
            observed_at: new Date().toISOString(),
            ...privacy,
          };
      const submission = {
        kind: isPrivateNeed ? ('need' as const) : ('report' as const),
        payload,
        idempotencyKey: submissionKeyRef.current ?? crypto.randomUUID(),
      };
      submissionKeyRef.current = submission.idempotencyKey;
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
          {kind !== 'need' && kind !== 'offer' && (
            <button className="form-back" onClick={() => onChangeKind(null)} type="button">
              Cambiar tipo
            </button>
          )}
          <p className="eyebrow">
            {kind === 'need'
              ? 'Solicitud privada'
              : kind === 'community-need'
                ? 'Aquí necesitan ayuda'
                : kind === 'offer'
                  ? 'Ofrezco ayuda'
                  : kind === 'place'
                    ? 'Informar un lugar'
                    : 'Reportar una situación'}
          </p>
          <h2 id="journey-title">
            {kind === 'need'
              ? 'Dinos 3 cosas'
              : kind === 'offer'
                ? 'Publica lo que puedes dar'
                : kind === 'community-need'
                  ? 'Cuéntanos qué hace falta'
                  : kind === 'place'
                    ? 'Informa el lugar'
                    : 'Cuéntanos qué pasó'}
          </h2>
          <p>
            {kind === 'need'
              ? 'Tu teléfono y tu ubicación exacta no aparecerán en el mapa.'
              : 'Se publica de una vez, marcado como "Sin confirmar". No escribas datos de personas.'}
          </p>
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
          {kind === 'community-need' && (
            <fieldset className="offer-kinds">
              <legend>¿Qué hace falta?</legend>
              {RELIEF_ITEMS.map((item) => (
                <label key={item}>
                  <input
                    defaultChecked={
                      reportDraft?.title === 'Necesitan ' + item.toLocaleLowerCase('es')
                    }
                    name="title"
                    required
                    type="radio"
                    value={'Necesitan ' + item.toLocaleLowerCase('es')}
                  />
                  <span>{item}</span>
                </label>
              ))}
            </fieldset>
          )}
          {kind === 'offer' && (
            <fieldset className="offer-kinds">
              <legend>¿Qué puedes dar?</legend>
              {OFFER_KINDS.map((kind) => (
                <label key={kind}>
                  <input
                    defaultChecked={
                      reportDraft?.title === 'Ofrezco ' + kind.toLocaleLowerCase('es')
                    }
                    name="title"
                    required
                    type="radio"
                    value={'Ofrezco ' + kind.toLocaleLowerCase('es')}
                  />
                  <span>{kind}</span>
                </label>
              ))}
            </fieldset>
          )}
          {(kind === 'place' || kind === 'damage') && (
            <label>
              {kind === 'place' ? 'Nombre del lugar' : 'Resumen'}
              <input
                defaultValue={reportDraft?.title}
                maxLength={100}
                minLength={3}
                name="title"
                placeholder={
                  kind === 'place'
                    ? 'Ej. Albergue La Esperanza'
                    : 'Ej. Vía bloqueada cerca del parque'
                }
                required
              />
            </label>
          )}
          <label>
            ¿En qué barrio o vereda?{' '}
            <span>
              {kind === 'need' || kind === 'community-need'
                ? 'Barrio, vereda o sector'
                : 'Opcional'}
            </span>
            <input
              defaultValue={reportDraft?.neighborhood}
              maxLength={kind === 'need' ? 120 : 80}
              minLength={kind === 'need' ? 2 : undefined}
              name="neighborhood"
              placeholder="Ej. vereda El Manzano"
              required={kind === 'need' || kind === 'community-need'}
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
            {kind === 'need' || kind === 'community-need'
              ? '¿Qué está pasando?'
              : kind === 'offer'
                ? '¿Cuánto y hasta cuándo?'
                : kind === 'place'
                  ? '¿Qué recibe o entrega este lugar?'
                  : '¿Qué pasó y cuándo lo viste?'}{' '}
            {kind === 'need' && <span>Opcional</span>}
            <textarea
              defaultValue={reportDraft?.description}
              maxLength={600}
              minLength={kind === 'need' ? undefined : 5}
              name="description"
              placeholder={
                kind === 'need'
                  ? 'Ej. somos 4 y no tenemos agua'
                  : kind === 'offer'
                    ? 'Ej. 20 mercados, hoy hasta las 6 p. m.'
                    : kind === 'place'
                      ? 'Ej. recibe agua y cobijas, 8 a. m. a 5 p. m.'
                      : 'Ej. derrumbe cerró la vía esta mañana'
              }
              required={kind !== 'need'}
              rows={3}
            />
          </label>
          {kind !== 'place' && kind !== 'damage' && (
            <label>
              Tu teléfono{' '}
              <span>
                {kind === 'need'
                  ? 'Para poder llamarte. No aparece en el mapa.'
                  : kind === 'community-need'
                    ? 'Opcional. Para confirmar el aviso. No aparece en el mapa.'
                    : 'Para que te puedan llamar. No aparece en el mapa.'}
              </span>
              <input
                autoComplete="tel"
                defaultValue={reportDraft?.contact}
                maxLength={160}
                minLength={5}
                name="contact"
                placeholder="Ej. 300 123 4567"
                required={kind === 'need' || kind === 'offer'}
                type="tel"
              />
            </label>
          )}
          {kind === 'offer' || kind === 'place' ? (
            <input name="severity" type="hidden" value="medium" />
          ) : (
            <label>
              ¿Para cuándo?
              <select defaultValue={reportDraft?.severity} name="severity" required>
                <option value="medium">Es urgente hoy</option>
                <option value="critical">Hay peligro ahora</option>
                <option value="low">Puede esperar</option>
              </select>
            </label>
          )}
          <label className="privacy-consent">
            <input name="privacyConsent" required type="checkbox" />
            <span>
              {kind === 'need'
                ? 'Acepto que TIMELIBER S.A.S. use estos datos solo para ayudarme.'
                : 'Acepto que TIMELIBER S.A.S. use estos datos solo para coordinar esta ayuda.'}{' '}
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
                <dd>{reportDraft.peopleCount}</dd>
              </div>
            )}
            <div>
              <dt>Barrio</dt>
              <dd>{reportDraft.neighborhood || 'No indicado'}</dd>
            </div>
            {kind === 'offer' && reportDraft.title && (
              <div>
                <dt>Ofreces</dt>
                <dd>{reportDraft.title}</dd>
              </div>
            )}
            {reportDraft.description && (
              <div>
                <dt>Lo que contaste</dt>
                <dd>{reportDraft.description}</dd>
              </div>
            )}
            {reportDraft.contact && (
              <div>
                <dt>Tu teléfono</dt>
                <dd>{reportDraft.contact}</dd>
              </div>
            )}
          </dl>
          <p className="privacy-reminder">
            {kind === 'need'
              ? 'Tu teléfono y tu ubicación quedan privados.'
              : reportDraft.contact
                ? 'Tu teléfono queda privado. Lo revisamos antes de publicarlo.'
                : 'Lo revisamos antes de publicarlo.'}
          </p>
          {reportStatus === 'error' && (
            <p className="form-error" role="alert">
              No pudimos enviarlo. Tus respuestas siguen aquí.
            </p>
          )}
          <div className="review-actions">
            <button
              className="form-back"
              disabled={reportStatus === 'sending'}
              onClick={() => setReviewingReport(false)}
              type="button"
            >
              Editar
            </button>
            <button
              className="primary-submit"
              disabled={reportStatus === 'sending'}
              onClick={() => void submitPublicReport()}
              type="button"
            >
              {reportStatus === 'sending' ? 'Enviando…' : 'Enviar'}
            </button>
          </div>
        </section>
      )}
      {reportStatus === 'sent' && (
        <div className="report-sent">
          <ShieldCheck size={36} />
          <h2 id="journey-title">{kind === 'need' ? 'Ya la recibimos' : 'Ya lo recibimos'}</h2>
          <p>Guarda este código para saber cómo va:</p>
          <strong className="tracking-code">{reportCode}</strong>
          <div className="code-actions">
            <button
              onClick={() => {
                navigator.clipboard?.writeText(reportCode ?? '').then(() => {
                  setCodeCopied(true);
                  window.setTimeout(() => setCodeCopied(false), 1800);
                });
              }}
              type="button"
            >
              {codeCopied ? 'Código copiado' : 'Copiar código'}
            </button>
            <a
              href={
                'https://wa.me/?text=' +
                encodeURIComponent(
                  'Mi código en Ayuda Colombia es ' + reportCode + '. ' + window.location.origin,
                )
              }
              rel="noreferrer"
              target="_blank"
            >
              Enviar por WhatsApp
            </a>
          </div>
          <p>
            {kind === 'need'
              ? 'Te llamamos al número que dejaste. Si hay peligro ahora, llama al 123.'
              : 'Lo revisamos y, si se confirma, aparecerá en el mapa.'}
          </p>
          <button className="journey-map-link" onClick={onClose} type="button">
            Terminar
          </button>
        </div>
      )}
      {reportStatus !== 'sent' && <StatusLookup savedCode={savedCode} />}
    </>
  );
}
