import { lazy, Suspense, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Clock3,
  MapPin,
  Navigation,
  PackageCheck,
  Search,
  Share2,
  ShieldCheck,
  TriangleAlert,
  X,
} from 'lucide-react';
import { DEMO_REGIONS, type MapCategory } from '../../entities/incident';
import { MapFilters } from '../../features/map-filter';
import { NationalOverview } from '../../features/national-overview/NationalOverview';
import { AppHeader } from '../../widgets/app-header';
import { HomePrimaryActions, type HelpJourney } from '../../widgets/home-primary-actions';
import { loadPublicCenterPoints } from '../../shared/api/public-centers';
import { loadPublicReportPoints } from '../../shared/api/public-reports';
import {
  formatAreaLabel,
  hasLocalBoundaries as regionHasLocalBoundaries,
  loadNeighborhoods,
} from '../../shared/api/neighborhoods';
import { loadPublicRegions } from '../../shared/api/territories';
import { loadSubmissionStatus, submitPublicInformation } from '../../shared/api/submissions';
import {
  clearPendingSubmission,
  loadPendingSubmission,
  savePendingSubmission,
} from '../../shared/offline/secure-submission-outbox';
const EmergencyMap = lazy(() =>
  import('../../widgets/emergency-map').then((module) => ({ default: module.EmergencyMap })),
);

const INITIAL_LAYERS = new Set<MapCategory>(['aid-center']);
const PRIVACY_POLICY_VERSION = '2026-08-13';
const CATEGORY_LABELS: Record<MapCategory, string> = {
  need: 'Necesidad',
  offer: 'Ayuda ofrecida',
  'aid-center': 'Centro o albergue',
  damage: 'Daño o acceso',
};
const formatObservedAt = (value: string) =>
  new Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit' }).format(new Date(value));

const STATUS_LABELS = {
  reported: 'Sin confirmar',
  verified: 'Revisado',
  official: 'Confirmado',
  stale: 'Desactualizado',
  closed: 'Cerrado',
} as const;

export function HomePage() {
  const [regionId, setRegionId] = useState(
    () => new URLSearchParams(window.location.search).get('region') ?? 'co-ris-pereira',
  );
  const [layers, setLayers] = useState<Set<MapCategory>>(INITIAL_LAYERS);
  const [query, setQuery] = useState(
    () => new URLSearchParams(window.location.search).get('barrio') ?? '',
  );
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const [selectedArea, setSelectedArea] = useState<string | null>(() =>
    new URLSearchParams(window.location.search).get('comuna'),
  );
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string | null>(() =>
    new URLSearchParams(window.location.search).get('barrio'),
  );
  const [linkCopied, setLinkCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [showCommunityReports, setShowCommunityReports] = useState(false);
  const [activeJourney, setActiveJourney] = useState<HelpJourney | null>(null);
  const [reportKind, setReportKind] = useState<'need' | 'offer' | 'place' | 'damage' | null>(null);
  const [reportDraft, setReportDraft] = useState<Record<string, string> | null>(null);
  const [reviewingReport, setReviewingReport] = useState(false);
  const [reportStatus, setReportStatus] = useState<
    'idle' | 'sending' | 'queued' | 'sent' | 'error'
  >('idle');
  const [locationNotice, setLocationNotice] = useState<string | null>(null);
  const [useLocation, setUseLocation] = useState(false);
  const [reportCode, setReportCode] = useState<string | null>(null);
  const [lookupStatus, setLookupStatus] = useState<string | null>(null);
  const [outboxNotice, setOutboxNotice] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapVisible, setMapVisible] = useState(true);
  const mapStageRef = useRef<HTMLDivElement>(null);
  const journeyPanelRef = useRef<HTMLElement>(null);
  const journeyTriggerRef = useRef<HTMLElement | null>(null);
  const submissionKeyRef = useRef<string | null>(null);
  const [showNationalOverview, setShowNationalOverview] = useState(false);
  const regionsQuery = useQuery({ queryKey: ['public-regions'], queryFn: loadPublicRegions });
  const regions = useMemo(() => {
    const remoteById = new Map((regionsQuery.data ?? []).map((item) => [item.id, item]));
    return remoteById.size > 0 ? [...remoteById.values()] : [...DEMO_REGIONS];
  }, [regionsQuery.data]);
  const serviceRegions = useMemo(
    () =>
      regions.map((item) => ({
        ...item,
        name:
          item.id === 'co-ris-pereira'
            ? 'Pereira'
            : item.id === 'co-ris-dosquebradas'
              ? 'Dosquebradas'
              : item.name,
        department: item.department || 'Colombia',
      })),
    [regions],
  );
  const region =
    serviceRegions.find((item) => item.id === regionId) ??
    serviceRegions.find((item) => item.id === 'co-ris-pereira') ??
    DEMO_REGIONS.find((item) => item.id === 'co-ris-pereira') ??
    DEMO_REGIONS[0];
  const hasLocalBoundaries = regionHasLocalBoundaries(region.id);
  const neighborhoodsQuery = useQuery({
    queryKey: ['neighborhoods', region.id],
    queryFn: () => loadNeighborhoods(region.id),
    enabled: mapVisible && hasLocalBoundaries,
  });
  const neighborhoods = neighborhoodsQuery.data ?? [];
  const centersQuery = useQuery({
    queryKey: ['public-centers', region.id, showCommunityReports],
    queryFn: () => loadPublicCenterPoints(region.id, showCommunityReports),
    enabled:
      mapVisible ||
      activeJourney === 'help' ||
      activeJourney === 'donate' ||
      activeJourney === 'centers',
  });
  const reportsQuery = useQuery({
    queryKey: ['public-reports', region.id],
    queryFn: () => loadPublicReportPoints(region.id),
    enabled:
      mapVisible ||
      activeJourney === 'help' ||
      activeJourney === 'donate' ||
      activeJourney === 'centers',
  });
  const submissionMutation = useMutation({ mutationFn: submitPublicInformation });
  useEffect(() => {
    const retryPending = async () => {
      const pending = await loadPendingSubmission();
      if (!pending) return;
      setOutboxNotice('Enviando la información guardada…');
      try {
        const receipt = await submissionMutation.mutateAsync(pending);
        clearPendingSubmission();
        setReportCode(receipt.tracking_code);
        setReportStatus('sent');
        setOutboxNotice(`Información enviada. Guarda el código ${receipt.tracking_code}.`);
      } catch {
        setOutboxNotice(
          'La información sigue guardada de forma cifrada. Reintentaremos al volver la conexión.',
        );
      }
    };
    void retryPending();
    window.addEventListener('online', retryPending);
    return () => window.removeEventListener('online', retryPending);
  }, []);
  const publicCenterPoints = centersQuery.data ?? [];
  const publicReportPoints = reportsQuery.data ?? [];
  const publicDataLoaded = centersQuery.isSuccess && reportsQuery.isSuccess;
  useEffect(() => {
    const restore = () => {
      const params = new URLSearchParams(window.location.search);
      const area = params.get('comuna');
      const neighborhood = params.get('barrio');
      setRegionId(params.get('region') ?? 'co-ris-pereira');
      setSelectedArea(area);
      setSelectedNeighborhood(neighborhood);
      setQuery(neighborhood ?? '');
    };
    window.addEventListener('popstate', restore);
    return () => window.removeEventListener('popstate', restore);
  }, []);
  const areas = useMemo(
    () =>
      [...new Set(neighborhoods.map((item) => item.comuna))].sort((a, b) =>
        a.localeCompare(b, 'es', { numeric: true }),
      ),
    [neighborhoods],
  );
  const regionPoints = useMemo(
    () => [...publicCenterPoints, ...publicReportPoints],
    [publicCenterPoints, publicReportPoints],
  );
  const trustedPoints = useMemo(
    () =>
      regionPoints.filter(
        (point) =>
          point.verificationStatus === 'official' || point.verificationStatus === 'verified',
      ),
    [regionPoints],
  );
  const areaNeighborhoods = useMemo(
    () =>
      selectedArea
        ? neighborhoods
            .filter(
              (item) =>
                item.comuna.toLocaleLowerCase('es') === selectedArea.toLocaleLowerCase('es'),
            )
            .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
        : [],
    [neighborhoods, selectedArea],
  );
  const normalizedQuery = query.trim().toLocaleLowerCase('es');
  const visiblePoints = useMemo(
    () =>
      regionPoints.filter(
        (point) =>
          (showCommunityReports || point.verificationStatus !== 'reported') &&
          layers.has(point.category) &&
          (!normalizedQuery ||
            [point.title, point.neighborhood, point.description, point.address ?? ''].some(
              (value) => value.toLocaleLowerCase('es').includes(normalizedQuery),
            )),
      ),
    [regionPoints, showCommunityReports, layers, normalizedQuery],
  );
  const selectedPoint = visiblePoints.find((point) => point.id === selectedPointId);
  const counts = useMemo(
    () =>
      trustedPoints.reduce(
        (total, point) => {
          total[point.category] += 1;
          return total;
        },
        { need: 0, offer: 0, 'aid-center': 0, damage: 0 },
      ),
    [trustedPoints],
  );
  const toggleLayer = (category: MapCategory) =>
    setLayers((current) => {
      const next = new Set(current);
      next.has(category) ? next.delete(category) : next.add(category);
      return next;
    });
  const updateTerritoryUrl = (
    nextRegion: string,
    area: string | null,
    neighborhood: string | null,
  ) => {
    const params = new URLSearchParams(window.location.search);
    params.set('region', nextRegion);
    area ? params.set('comuna', area) : params.delete('comuna');
    neighborhood ? params.set('barrio', neighborhood) : params.delete('barrio');
    window.history.pushState({}, '', window.location.pathname + '?' + params.toString());
  };
  const changeRegion = (nextRegion: string) => {
    const canonicalRegion = serviceRegions.some((item) => item.id === nextRegion)
      ? nextRegion
      : 'co-ris-pereira';
    setRegionId(canonicalRegion);
    setSelectedArea(null);
    setSelectedNeighborhood(null);
    setSelectedPointId(null);
    setQuery('');
    updateTerritoryUrl(canonicalRegion, null, null);
  };
  const closeJourney = () => {
    setActiveJourney(null);
    setReportKind(null);
    setReportDraft(null);
    setReviewingReport(false);
    setReportStatus('idle');
    setLocationNotice(null);
    window.setTimeout(() => journeyTriggerRef.current?.focus(), 0);
  };
  const openJourney = (journey: HelpJourney) => {
    journeyTriggerRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setActiveJourney(journey);
    if (journey === 'help' || journey === 'centers')
      setLayers(new Set<MapCategory>(['aid-center']));
    if (journey === 'donate') setLayers(new Set<MapCategory>(['need', 'offer']));
  };
  const showOnMap = (nextLayers: MapCategory[], nextQuery = '') => {
    setMapVisible(true);
    setMapReady(true);
    setLayers(new Set(nextLayers));
    setQuery(nextQuery);
    setActiveJourney(null);
    window.setTimeout(() => {
      const target = document.getElementById('map-title');
      if (target && typeof target.scrollIntoView === 'function')
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  };
  useEffect(() => {
    if (!mapVisible) return;
    const target = mapStageRef.current;
    if (!target) return;
    if (!('IntersectionObserver' in window)) {
      setMapReady(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setMapReady(true);
          observer.disconnect();
        }
      },
      { rootMargin: '250px' },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [mapVisible]);
  useEffect(() => {
    if (!activeJourney) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const panel = journeyPanelRef.current;
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
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [activeJourney]);
  const prepareReport = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submissionKeyRef.current = crypto.randomUUID();
    const values: Record<string, string> = {};
    new FormData(event.currentTarget).forEach((value, key) => {
      values[key] = String(value);
    });
    setReportDraft(values);
    setReviewingReport(true);
  };
  const submitPublicReport = async () => {
    if (!reportDraft) return;
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
      const urgency = reportDraft.severity;
      const privacy = { privacy_authorized: true, privacy_policy_version: PRIVACY_POLICY_VERSION };
      const payload = isPrivateNeed
        ? {
            territory_id: region.id,
            category: reportDraft.needCategory,
            people_count: Number(reportDraft.peopleCount),
            neighborhood: reportDraft.neighborhood,
            latitude: position?.coords.latitude ?? null,
            longitude: position?.coords.longitude ?? null,
            urgency:
              urgency === 'critical' ? 'immediate_danger' : urgency === 'low' ? 'soon' : 'today',
            contact: reportDraft.contact,
            description: reportDraft.description,
            ...privacy,
          }
        : {
            territory_id: region.id,
            category: reportDraft.category,
            title: reportDraft.title,
            description: reportDraft.description,
            neighborhood_code: reportDraft.neighborhood || null,
            severity: reportDraft.severity,
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
        setReportStatus('sent');
        setUseLocation(false);
      } catch {
        await savePendingSubmission(submission);
        setReportStatus('queued');
        setOutboxNotice(
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
  const directionsUrl = selectedPoint
    ? 'https://www.google.com/maps/dir/?api=1&destination=' +
      selectedPoint.coordinates[1] +
      ',' +
      selectedPoint.coordinates[0]
    : '';

  return (
    <main id="main-content">
      <AppHeader
        onOpenOverview={() => setShowNationalOverview(true)}
        onSelectRegion={changeRegion}
        region={region}
        regions={serviceRegions}
      />
      {outboxNotice && (
        <div className="outbox-notice" role="status">
          <span>{outboxNotice}</span>
          <button aria-label="Cerrar aviso" onClick={() => setOutboxNotice(null)} type="button">
            <X size={16} />
          </button>
        </div>
      )}
      {showNationalOverview && (
        <NationalOverview
          onChoose={(id) => {
            changeRegion(id);
            setShowNationalOverview(false);
          }}
          onClose={() => setShowNationalOverview(false)}
          regions={serviceRegions}
        />
      )}
      <HomePrimaryActions
        counts={counts}
        department={region.department}
        mapVisible={mapVisible}
        onOpenJourney={openJourney}
        onShowMap={showOnMap}
        publicDataLoaded={publicDataLoaded}
        regionName={region.name}
      />
      {activeJourney && (
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
            ref={journeyPanelRef}
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
                  <button onClick={() => showOnMap(['aid-center'], 'alimentos')} type="button">
                    Agua o comida
                  </button>
                  <button onClick={() => showOnMap(['aid-center'], 'salud')} type="button">
                    Atención en salud
                  </button>
                  <button onClick={() => showOnMap(['aid-center'], 'alojamiento')} type="button">
                    Dónde dormir
                  </button>
                  <button
                    onClick={() => {
                      setReportKind('need');
                      setActiveJourney('report');
                    }}
                    type="button"
                  >
                    <strong>Pedir ayuda</strong>
                    <small>Solo lo ve el equipo que coordina</small>
                  </button>
                  <button onClick={() => showOnMap(['damage'])} type="button">
                    Vías y accesos
                  </button>
                </div>
                <p className="emergency-hint">
                  ¿Hay peligro ahora? <a href="tel:123">Llama al 123</a>.
                </p>
                {publicDataLoaded && counts['aid-center'] === 0 && (
                  <p className="journey-notice">
                    Todavía no hay centros confirmados aquí. Puedes pedir ayuda.
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
                  <button onClick={() => showOnMap(['aid-center'])} type="button">
                    <strong>Llevar algo ahora</strong>
                    <small>Mira dónde recibirlo. No pedimos ningún dato.</small>
                  </button>
                  <button onClick={() => showOnMap(['need'])} type="button">
                    Ver qué falta
                  </button>
                  <button onClick={() => showOnMap(['offer'])} type="button">
                    Ver ayudas ofrecidas
                  </button>
                  <button
                    onClick={() => {
                      setReportKind('offer');
                      setActiveJourney('report');
                    }}
                    type="button"
                  >
                    <strong>Ofrecer ayuda</strong>
                    <small>Publica lo que puedes aportar</small>
                  </button>
                </div>
                {publicDataLoaded && counts.need === 0 && (
                  <p className="journey-notice">
                    Todavía no hay necesidades confirmadas. Puedes ofrecer tu ayuda y la revisamos.
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
                  onClick={() => showOnMap(['aid-center'])}
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
                  <button className="form-back" onClick={() => setReportKind(null)} type="button">
                    Cambiar tipo
                  </button>
                  <p className="eyebrow">
                    {reportKind === 'need'
                      ? 'Solicitud privada'
                      : reportKind === 'offer'
                        ? 'Ofrezco ayuda'
                        : reportKind === 'place'
                          ? 'Informar un lugar'
                          : 'Reportar una situación'}
                  </p>
                  <h2 id="journey-title">
                    {reportKind === 'need' ? 'Dinos 3 cosas' : 'Dinos lo necesario'}
                  </h2>
                  <p>
                    {reportKind === 'need'
                      ? 'Tu teléfono y tu ubicación exacta no aparecerán en el mapa.'
                      : 'Nadie más lo ve hasta que lo revisemos. No escribas datos de personas.'}
                  </p>
                  {reportKind === 'need' && (
                    <>
                      <label>
                        ¿Qué necesitas?
                        <select
                          defaultValue={reportDraft?.needCategory}
                          name="needCategory"
                          required
                        >
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
                      <input name="category" type="hidden" value={reportKind} />
                    )
                  )}
                  {reportKind !== 'need' && (
                    <label>
                      {reportKind === 'place' ? 'Nombre del lugar' : 'Resumen'}
                      <input
                        defaultValue={reportDraft?.title}
                        maxLength={100}
                        minLength={3}
                        name="title"
                        placeholder={
                          reportKind === 'offer'
                            ? 'Ej. Ofrezco transporte'
                            : reportKind === 'place'
                              ? 'Ej. Albergue La Esperanza'
                              : 'Ej. Vía bloqueada cerca del parque'
                        }
                        required
                      />
                    </label>
                  )}
                  <label>
                    ¿En qué barrio o vereda?{' '}
                    <span>{reportKind === 'need' ? 'Barrio, vereda o sector' : 'Opcional'}</span>
                    <input
                      defaultValue={reportDraft?.neighborhood}
                      maxLength={reportKind === 'need' ? 120 : 80}
                      minLength={reportKind === 'need' ? 2 : undefined}
                      name="neighborhood"
                      placeholder="Ej. vereda El Manzano"
                      required={reportKind === 'need'}
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
                    {reportKind === 'need'
                      ? '¿Qué está pasando?'
                      : reportKind === 'offer'
                        ? '¿Qué ofreces y hasta cuándo?'
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
                  {reportKind === 'need' && (
                    <label>
                      Tu teléfono <span>Para poder llamarte. No aparece en el mapa.</span>
                      <input
                        autoComplete="tel"
                        defaultValue={reportDraft?.contact}
                        maxLength={160}
                        minLength={5}
                        name="contact"
                        placeholder="Ej. 300 123 4567"
                        required
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
                      Acepto que TIMELIBER S.A.S. use estos datos solo para ayudarme.{' '}
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
                    {reportDraft.description && (
                      <div>
                        <dt>Lo que contaste</dt>
                        <dd>{reportDraft.description}</dd>
                      </div>
                    )}
                    {reportKind === 'need' && (
                      <div>
                        <dt>Tu teléfono</dt>
                        <dd>{reportDraft.contact}</dd>
                      </div>
                    )}
                  </dl>
                  <p className="privacy-reminder">
                    {reportKind === 'need'
                      ? 'Tu teléfono y tu ubicación quedan privados.'
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
                      onClick={submitPublicReport}
                      type="button"
                    >
                      {reportStatus === 'sending' ? 'Enviando…' : 'Enviar'}
                    </button>
                  </div>
                </section>
              )}
            {activeJourney === 'report' && reportStatus !== 'sent' && (
              <details className="status-lookup">
                <summary>Ya tengo un código</summary>
                <form onSubmit={lookupReport}>
                  <label>
                    ¿Qué enviaste?
                    <select name="statusType">
                      <option value="need">Pedí ayuda</option>
                      <option value="report">Reporté algo</option>
                    </select>
                  </label>
                  <label>
                    Código
                    <input
                      autoCapitalize="characters"
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
                        'Mi código en Ayuda Colombia es ' +
                          reportCode +
                          '. ' +
                          window.location.origin,
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
      )}
      {mapVisible && (
        <section className="map-workspace" aria-labelledby="map-title">
          <aside className="map-sidebar">
            <header>
              <p className="eyebrow">
                {region.name}, {region.department}
              </p>
              <h2 id="map-title">¿Qué hay cerca?</h2>
              <p>
                {!publicDataLoaded
                  ? 'Consultando información…'
                  : visiblePoints.length === 0
                    ? 'Sin información publicada'
                    : visiblePoints.length + ' lugares y reportes'}
              </p>
            </header>
            {hasLocalBoundaries && (
              <label className="area-picker">
                <span>Zona</span>
                <select
                  aria-label="Seleccionar zona"
                  onChange={(event) => {
                    const area = event.target.value || null;
                    setSelectedArea(area);
                    setSelectedNeighborhood(null);
                    setQuery('');
                    updateTerritoryUrl(region.id, area, null);
                  }}
                  value={selectedArea ?? ''}
                >
                  <option value="">Todas las zonas</option>
                  {areas.map((area) => (
                    <option key={area} value={area}>
                      {formatAreaLabel(area)}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="map-search">
              <Search aria-hidden="true" size={18} />
              <span className="sr-only">Buscar lugar o reporte</span>
              <input
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar lugar o reporte"
                type="search"
                value={query}
              />
            </label>
            <details className="trust-controls">
              <summary>De dónde viene la información</summary>
              <div className="trust-guide">
                <p>
                  <strong className="trust-badge trust-badge--official">
                    <ShieldCheck size={14} /> Confirmado
                  </strong>
                  <span>Lo publicó una entidad responsable.</span>
                </p>
                <p>
                  <strong className="trust-badge trust-badge--verified">
                    <ShieldCheck size={14} /> Revisado
                  </strong>
                  <span>Alguien del equipo lo comprobó.</span>
                </p>
                <p>
                  <strong className="trust-badge trust-badge--reported">
                    <TriangleAlert size={14} /> Sin confirmar
                  </strong>
                  <span>Lo contó la comunidad. Mira la hora antes de ir.</span>
                </p>
              </div>
              <label className="community-layer-toggle">
                <input
                  checked={showCommunityReports}
                  onChange={(event) => {
                    setShowCommunityReports(event.target.checked);
                    setSelectedPointId(null);
                  }}
                  type="checkbox"
                />
                <span>
                  <strong>Mostrar avisos de la comunidad</strong>
                  <small>Sin confirmar. Verifica antes de ir.</small>
                </span>
              </label>
              {showCommunityReports && (
                <p className="community-warning" role="status">
                  <TriangleAlert size={16} /> Estás viendo información comunitaria sin confirmar.
                </p>
              )}
            </details>
            {selectedArea && (
              <section aria-live="polite" className="area-detail">
                <button
                  className="area-close"
                  aria-label="Cerrar zona"
                  onClick={() => {
                    setSelectedArea(null);
                    setSelectedNeighborhood(null);
                    setQuery('');
                    updateTerritoryUrl(region.id, null, null);
                  }}
                  type="button"
                >
                  <X size={16} />
                </button>
                <p className="eyebrow">
                  {region.name} / {formatAreaLabel(selectedArea)}
                </p>
                <h3>
                  {selectedNeighborhood
                    ? (selectedArea.startsWith('rural:') ? 'Sector ' : 'Barrio ') +
                      selectedNeighborhood
                    : formatAreaLabel(selectedArea)}
                </h3>
                {selectedNeighborhood && (
                  <button
                    className="area-back"
                    onClick={() => {
                      setSelectedNeighborhood(null);
                      setQuery('');
                      updateTerritoryUrl(region.id, selectedArea, null);
                    }}
                    type="button"
                  >
                    Volver a la zona
                  </button>
                )}
                <p>Los colores resumen la urgencia de los reportes visibles.</p>
                <details className="neighborhood-list">
                  <summary>
                    Ver {areaNeighborhoods.length}{' '}
                    {selectedArea.startsWith('rural:') ? 'sectores' : 'barrios'}
                  </summary>
                  <div>
                    {areaNeighborhoods.map((item) => (
                      <button
                        key={item.comuna + '-' + item.codigo_del_barrio + '-' + item.nombre}
                        aria-pressed={selectedNeighborhood === item.nombre}
                        onClick={() => {
                          setSelectedNeighborhood(item.nombre);
                          setQuery(item.nombre);
                          updateTerritoryUrl(region.id, selectedArea, item.nombre);
                        }}
                        type="button"
                      >
                        {item.nombre}
                      </button>
                    ))}
                  </div>
                </details>
                <button
                  className="share-area"
                  onClick={() => {
                    navigator.clipboard?.writeText(window.location.href).then(() => {
                      setLinkCopied(true);
                      window.setTimeout(() => setLinkCopied(false), 1800);
                    });
                  }}
                  type="button"
                >
                  <Share2 size={16} /> {linkCopied ? 'Enlace copiado' : 'Copiar enlace'}
                </button>
                <small>
                  Catálogo oficial de Datos Abiertos Colombia. Toca un barrio o sector para filtrar
                  el mapa.
                </small>
              </section>
            )}
            <details className="layer-panel">
              <summary>
                Qué mostrar <span>{layers.size === 1 ? '1 tipo' : layers.size + ' tipos'}</span>
              </summary>
              <MapFilters value={layers} onToggle={toggleLayer} counts={counts} />
            </details>
            {selectedPoint && (
              <section
                aria-live="polite"
                className={'place-detail place-detail--' + selectedPoint.category}
              >
                <button
                  aria-label="Cerrar detalles"
                  className="detail-close"
                  onClick={() => setSelectedPointId(null)}
                  type="button"
                >
                  <X size={18} />
                </button>
                <p className="eyebrow">{CATEGORY_LABELS[selectedPoint.category]}</p>
                <h3>{selectedPoint.title}</h3>
                <span className={'trust-badge trust-badge--' + selectedPoint.verificationStatus}>
                  <ShieldCheck size={14} /> {STATUS_LABELS[selectedPoint.verificationStatus]}
                </span>
                <dl>
                  <div>
                    <dt>
                      <MapPin size={16} /> Ubicación
                    </dt>
                    <dd>{selectedPoint.address ?? selectedPoint.neighborhood}</dd>
                  </div>
                  {selectedPoint.schedule && (
                    <div>
                      <dt>
                        <Clock3 size={16} /> Horario
                      </dt>
                      <dd>{selectedPoint.schedule}</dd>
                    </div>
                  )}
                  {selectedPoint.acceptedItems && (
                    <div>
                      <dt>
                        <PackageCheck size={16} /> Recibe ahora
                      </dt>
                      <dd className="item-chips">
                        {selectedPoint.acceptedItems.map((item) => (
                          <span key={item}>{item}</span>
                        ))}
                      </dd>
                    </div>
                  )}
                </dl>
                <a
                  className="directions-button"
                  href={directionsUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  <Navigation size={18} /> Cómo llegar
                </a>
                <small>
                  {selectedPoint.sourceLabel ?? 'Fuente ciudadana'} · actualizado{' '}
                  {formatObservedAt(selectedPoint.observedAt)}
                </small>
              </section>
            )}
            <div className="result-list" aria-label="Elementos visibles">
              {visiblePoints.map((point) => (
                <button
                  aria-pressed={selectedPointId === point.id}
                  className={'result-card result-card--' + point.category}
                  key={point.id}
                  onClick={() => setSelectedPointId(point.id)}
                  type="button"
                >
                  <div>
                    <span>{CATEGORY_LABELS[point.category]}</span>
                    <span className={'trust-badge trust-badge--' + point.verificationStatus}>
                      <ShieldCheck size={13} /> {STATUS_LABELS[point.verificationStatus]}
                    </span>
                  </div>
                  <h3>{point.title}</h3>
                  <p>{point.neighborhood}</p>
                  <small>{point.description}</small>
                  <time dateTime={point.observedAt}>
                    Actualizado {formatObservedAt(point.observedAt)}
                  </time>
                </button>
              ))}
              {visiblePoints.length === 0 && (
                <div className="empty-state">
                  <p>
                    {query
                      ? 'No encontramos nada con esa búsqueda.'
                      : 'Todavía no hay nada confirmado aquí.'}
                  </p>
                  {!query && (
                    <p className="emergency-hint">
                      ¿Hay peligro ahora? <a href="tel:123">Llama al 123</a>.
                    </p>
                  )}
                  {query ? (
                    <button
                      onClick={() => {
                        setQuery('');
                        setSelectedNeighborhood(null);
                      }}
                      type="button"
                    >
                      Limpiar búsqueda
                    </button>
                  ) : (
                    !showCommunityReports && (
                      <button onClick={() => setShowCommunityReports(true)} type="button">
                        Ver avisos de la comunidad
                      </button>
                    )
                  )}
                </div>
              )}
            </div>
          </aside>
          <div className="map-stage" ref={mapStageRef}>
            <div className="map-guide" role="status">
              <strong>Explora {region.name}</strong>
              <span>
                {hasLocalBoundaries
                  ? region.id === 'co-ris-dosquebradas'
                    ? 'Elige una comuna o toca un barrio en el mapa.'
                    : 'Toca una comuna. Acerca el mapa para ver sus barrios.'
                  : 'Consulta los puntos publicados o busca un lugar dentro del municipio.'}
              </span>
            </div>
            {mapReady ? (
              <Suspense
                fallback={
                  <div className="map-canvas map-loading" role="status">
                    Cargando mapa...
                  </div>
                }
              >
                <EmergencyMap
                  key={region.id}
                  onSelectArea={(name) => {
                    setSelectedArea(name);
                    setSelectedNeighborhood(null);
                    if (name !== selectedArea) updateTerritoryUrl(region.id, name, null);
                  }}
                  onSelectNeighborhood={(name) => {
                    setSelectedNeighborhood(name);
                    if (name) {
                      setQuery(name);
                      updateTerritoryUrl(region.id, selectedArea, name);
                    }
                  }}
                  onSelectPoint={setSelectedPointId}
                  selectedArea={selectedArea}
                  selectedNeighborhood={selectedNeighborhood}
                  points={visiblePoints}
                  region={region}
                  selectedPointId={selectedPointId}
                />
              </Suspense>
            ) : (
              <button
                className="map-canvas map-loading"
                onClick={() => setMapReady(true)}
                type="button"
              >
                Ver el mapa
              </button>
            )}
            <div className="map-legend" aria-label="Leyenda del mapa">
              {hasLocalBoundaries && (
                <span>
                  <i className="urgency-scale" /> Color del área: urgencia
                </span>
              )}
              <span>
                <i className="legend-dot legend-dot--need" /> Punto: reporte
              </span>
            </div>
            <p className="map-freshness">
              <ShieldCheck size={15} /> Fuentes y hora visibles en cada ficha
            </p>
          </div>
        </section>
      )}
      {mapVisible && (
        <p className="data-notice">
          <strong>Información pública:</strong> cada publicación muestra de dónde viene y a qué hora
          se actualizó.{' '}
          {hasLocalBoundaries
            ? 'Las comunas y barrios sirven como referencia territorial.'
            : 'Los reportes se ubican a nivel municipal, por GPS o descripción del lugar.'}
        </p>
      )}
    </main>
  );
}
