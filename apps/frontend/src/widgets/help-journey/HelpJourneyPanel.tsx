import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import type { HumanitarianRegion, MapCategory } from '../../entities/incident';
import { linesForTerritory } from '../../shared/data/emergency-lines';
import { RELIEF_ITEMS } from '../../shared/data/relief-items';
import { loadSubmissionStatus, submitPublicInformation } from '../../shared/api/submissions';
import {
  clearPendingSubmission,
  savePendingSubmission,
} from '../../shared/offline/secure-submission-outbox';
import { saveTrackingCode, type SavedTrackingCode } from '../../shared/offline/last-tracking-code';
import { useBodyScrollLock } from '../../shared/hooks/use-body-scroll-lock';
import type { HelpJourney } from '../home-primary-actions';

const PRIVACY_POLICY_VERSION = '2026-08-13';
const OFFER_KINDS = [
  'Transporte',
  'Comida',
  'Agua',
  'Alojamiento',
  'Tiempo y manos',
  'Otra cosa',
] as const;

interface HelpJourneyPanelProps {
  activeJourney: HelpJourney;
  onChangeJourney: (journey: HelpJourney) => void;
  onClose: () => void;
  onShowMap: (layers: MapCategory[], query?: string) => void;
  onTracked: (code: SavedTrackingCode) => void;
  onOutboxNotice: (message: string) => void;
  region: HumanitarianRegion;
  counts: Record<MapCategory, number>;
  publicDataLoaded: boolean;
  savedCode: SavedTrackingCode | null;
}

/**
 * Todo lo que ocurre dentro del panel: los tres recorridos, los formularios de publicación,
 * la revisión y la consulta por código. Vive aparte de la portada porque su estado
 * —borrador, envío, código— no le interesa a nadie más.
 */
export function HelpJourneyPanel({
  activeJourney,
  onChangeJourney,
  onClose,
  onShowMap,
  onTracked,
  onOutboxNotice,
  region,
  counts,
  publicDataLoaded,
  savedCode,
}: HelpJourneyPanelProps) {
  const [reportKind, setReportKind] = useState<
    'need' | 'community-need' | 'offer' | 'place' | 'damage' | null
  >(null);
  const [reportDraft, setReportDraft] = useState<Record<string, string> | null>(null);
  const [reviewingReport, setReviewingReport] = useState(false);
  const [reportStatus, setReportStatus] = useState<
    'idle' | 'sending' | 'queued' | 'sent' | 'error'
  >('idle');
  const [locationNotice, setLocationNotice] = useState<string | null>(null);
  const [useLocation, setUseLocation] = useState(false);
  const [reportCode, setReportCode] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const [lookupStatus, setLookupStatus] = useState<string | null>(null);
  const panelRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLElement | null>(
    document.activeElement instanceof HTMLElement ? document.activeElement : null,
  );
  const submissionKeyRef = useRef<string | null>(null);
  const submissionMutation = useMutation({ mutationFn: submitPublicInformation });

  const closeJourney = () => {
    setReportKind(null);
    setReportDraft(null);
    setReviewingReport(false);
    setReportStatus('idle');
    setLocationNotice(null);
    onClose();
    window.setTimeout(() => triggerRef.current?.focus(), 0);
  };

  useBodyScrollLock(true);
  useEffect(() => {
    const panel = panelRef.current;
    const selector =
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, a[href]';
    (panel?.querySelector(selector) as HTMLElement | null)?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeJourney();
        return;
      }
      if (event.key !== 'Tab' || !panel) return;
      const items = [...panel.querySelectorAll<HTMLElement>(selector)].filter(
        (item) => item.offsetParent !== null || item === document.activeElement,
      );
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeJourney]);

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
    if (reportKind === 'offer') {
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
      const isPrivateNeed = reportKind === 'need';
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
  const lookupReport = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const code = String(data.get('trackingCode')).trim().toUpperCase();
    const kind = data.get('statusType') === 'need' ? 'need' : 'report';
    setLookupStatus('Consultando...');
    try {
      const result = await loadSubmissionStatus(kind, code);
      const statusValue = result.verification_status ?? result.status ?? '';
      const labels: Record<string, string> = {
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
      setLookupStatus(labels[statusValue] ?? statusValue);
    } catch (error) {
      setLookupStatus(
        error instanceof Error && error.message === 'not_found'
          ? 'No encontramos ese código. Revísalo e inténtalo de nuevo.'
          : 'Sin conexión. Inténtalo nuevamente.',
      );
    }
  };

  return (
    <div
      className="journey-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeJourney();
      }}
    >
      <section
        aria-labelledby="journey-title"
        aria-modal="true"
        className="journey-panel"
        id="journey-panel"
        ref={panelRef}
        role="dialog"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="journey-close" onClick={closeJourney} type="button">
          <ArrowLeft size={19} /> Volver
        </button>
        {activeJourney !== 'report' && !publicDataLoaded && (
          <p className="journey-notice" role="status">
            Consultando información…
          </p>
        )}
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
                  setReportKind('need');
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
                  setReportKind('offer');
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
        {activeJourney === 'report' && reportStatus !== 'sent' && !reportKind && (
          <>
            <p className="eyebrow">Reportar</p>
            <h2 id="journey-title">¿Qué quieres reportar?</h2>
            <p>Toca una opción. No necesitas cuenta.</p>
            <div className="journey-options report-kind-options">
              <button onClick={() => setReportKind('place')} type="button">
                <strong>Un lugar de ayuda</strong>
                <small>Albergue, centro de acopio o punto de atención</small>
              </button>
              <button onClick={() => setReportKind('community-need')} type="button">
                <strong>Aquí necesitan ayuda</strong>
                <small>Un barrio, una vereda o una familia que necesita algo</small>
              </button>
              <button onClick={() => setReportKind('damage')} type="button">
                <strong>Un daño o una vía cerrada</strong>
                <small>Casa en riesgo, derrumbe o paso bloqueado</small>
              </button>
            </div>
          </>
        )}
        {activeJourney === 'report' &&
          reportStatus !== 'sent' &&
          reportKind &&
          !reviewingReport && (
            <form className="public-report-form" onSubmit={prepareReport}>
              {reportKind !== 'need' && reportKind !== 'offer' && (
                <button className="form-back" onClick={() => setReportKind(null)} type="button">
                  Cambiar tipo
                </button>
              )}
              <p className="eyebrow">
                {reportKind === 'need'
                  ? 'Solicitud privada'
                  : reportKind === 'community-need'
                    ? 'Aquí necesitan ayuda'
                    : reportKind === 'offer'
                      ? 'Ofrezco ayuda'
                      : reportKind === 'place'
                        ? 'Informar un lugar'
                        : 'Reportar una situación'}
              </p>
              <h2 id="journey-title">
                {reportKind === 'need'
                  ? 'Dinos 3 cosas'
                  : reportKind === 'offer'
                    ? 'Publica lo que puedes dar'
                    : reportKind === 'community-need'
                      ? 'Cuéntanos qué hace falta'
                      : reportKind === 'place'
                        ? 'Informa el lugar'
                        : 'Cuéntanos qué pasó'}
              </h2>
              <p>
                {reportKind === 'need'
                  ? 'Tu teléfono y tu ubicación exacta no aparecerán en el mapa.'
                  : 'Se publica de una vez, marcado como "Sin confirmar". No escribas datos de personas.'}
              </p>
              {reportKind === 'need' && (
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
              {reportKind === 'place' ? (
                <label>
                  Tipo de lugar
                  <select defaultValue={reportDraft?.category} name="category" required>
                    <option value="shelter">Albergue comunitario</option>
                    <option value="aid-center">Centro de acopio o punto de ayuda</option>
                  </select>
                </label>
              ) : (
                reportKind !== 'need' && (
                  <input
                    name="category"
                    type="hidden"
                    value={reportKind === 'community-need' ? 'need' : reportKind}
                  />
                )
              )}
              {reportKind === 'community-need' && (
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
              {reportKind === 'offer' && (
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
              {(reportKind === 'place' || reportKind === 'damage') && (
                <label>
                  {reportKind === 'place' ? 'Nombre del lugar' : 'Resumen'}
                  <input
                    defaultValue={reportDraft?.title}
                    maxLength={100}
                    minLength={3}
                    name="title"
                    placeholder={
                      reportKind === 'place'
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
                  {reportKind === 'need' || reportKind === 'community-need'
                    ? 'Barrio, vereda o sector'
                    : 'Opcional'}
                </span>
                <input
                  defaultValue={reportDraft?.neighborhood}
                  maxLength={reportKind === 'need' ? 120 : 80}
                  minLength={reportKind === 'need' ? 2 : undefined}
                  name="neighborhood"
                  placeholder="Ej. vereda El Manzano"
                  required={reportKind === 'need' || reportKind === 'community-need'}
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
                {reportKind === 'need' || reportKind === 'community-need'
                  ? '¿Qué está pasando?'
                  : reportKind === 'offer'
                    ? '¿Cuánto y hasta cuándo?'
                    : reportKind === 'place'
                      ? '¿Qué recibe o entrega este lugar?'
                      : '¿Qué pasó y cuándo lo viste?'}{' '}
                {reportKind === 'need' && <span>Opcional</span>}
                <textarea
                  defaultValue={reportDraft?.description}
                  maxLength={600}
                  minLength={reportKind === 'need' ? undefined : 5}
                  name="description"
                  placeholder={
                    reportKind === 'need'
                      ? 'Ej. somos 4 y no tenemos agua'
                      : reportKind === 'offer'
                        ? 'Ej. 20 mercados, hoy hasta las 6 p. m.'
                        : reportKind === 'place'
                          ? 'Ej. recibe agua y cobijas, 8 a. m. a 5 p. m.'
                          : 'Ej. derrumbe cerró la vía esta mañana'
                  }
                  required={reportKind !== 'need'}
                  rows={3}
                />
              </label>
              {reportKind !== 'place' && reportKind !== 'damage' && (
                <label>
                  Tu teléfono{' '}
                  <span>
                    {reportKind === 'need'
                      ? 'Para poder llamarte. No aparece en el mapa.'
                      : reportKind === 'community-need'
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
                    required={reportKind === 'need' || reportKind === 'offer'}
                    type="tel"
                  />
                </label>
              )}
              {reportKind === 'offer' || reportKind === 'place' ? (
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
                  {reportKind === 'need'
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
                  No pudimos guardar la información. Conservamos lo que escribiste; revisa tu
                  conexión e inténtalo nuevamente.
                </p>
              )}
            </form>
          )}
        {activeJourney === 'report' &&
          reportStatus !== 'sent' &&
          reportKind &&
          reviewingReport &&
          reportDraft && (
            <section className="report-review" aria-labelledby="journey-title">
              <p className="eyebrow">Último paso</p>
              <h2 id="journey-title">Revisa y envía</h2>
              <dl>
                <div>
                  <dt>Municipio</dt>
                  <dd>{region.name}</dd>
                </div>
                {reportKind === 'need' && (
                  <div>
                    <dt>Personas</dt>
                    <dd>{reportDraft.peopleCount}</dd>
                  </div>
                )}
                <div>
                  <dt>Barrio</dt>
                  <dd>{reportDraft.neighborhood || 'No indicado'}</dd>
                </div>
                {reportKind === 'offer' && reportDraft.title && (
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
                {reportKind === 'need'
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
        {activeJourney === 'report' && reportStatus !== 'sent' && (
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
        )}
        {activeJourney === 'report' && reportStatus === 'sent' && (
          <div className="report-sent">
            <ShieldCheck size={36} />
            <h2 id="journey-title">
              {reportKind === 'need' ? 'Ya la recibimos' : 'Ya lo recibimos'}
            </h2>
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
              {reportKind === 'need'
                ? 'Te llamamos al número que dejaste. Si hay peligro ahora, llama al 123.'
                : 'Lo revisamos y, si se confirma, aparecerá en el mapa.'}
            </p>
            <button className="journey-map-link" onClick={closeJourney} type="button">
              Terminar
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
