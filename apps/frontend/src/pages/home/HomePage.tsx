import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
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
import { matchesQuery } from '../../features/map-filter/search';
import { MapLegend } from '../../features/map-legend';
import { NationalOverview } from '../../features/national-overview/NationalOverview';
import { AppHeader } from '../../widgets/app-header';
import { HomePrimaryActions, type HelpJourney } from '../../widgets/home-primary-actions';
import { HelpJourneyPanel } from '../../widgets/help-journey';
import { loadPublicCenterPoints } from '../../shared/api/public-centers';
import { loadPublicReportPoints } from '../../shared/api/public-reports';
import {
  formatAreaLabel,
  hasLocalBoundaries as regionHasLocalBoundaries,
  loadNeighborhoods,
} from '../../shared/api/neighborhoods';
import { loadPublicRegions } from '../../shared/api/territories';
import { submitPublicInformation } from '../../shared/api/submissions';
import {
  clearPendingSubmission,
  loadPendingSubmission,
} from '../../shared/offline/secure-submission-outbox';
import { loadTrackingCode, saveTrackingCode } from '../../shared/offline/last-tracking-code';
import { formatFreshness } from '../../shared/format/freshness';
import { distanceInMeters, formatDistance } from '../../shared/format/distance';
const EmergencyMap = lazy(() =>
  import('../../widgets/emergency-map').then((module) => ({ default: module.EmergencyMap })),
);

const INITIAL_LAYERS = new Set<MapCategory>(['aid-center', 'need', 'offer', 'damage']);
const CATEGORY_LABELS: Record<MapCategory, string> = {
  need: 'Necesidad',
  offer: 'Ayuda ofrecida',
  'aid-center': 'Centro o albergue',
  damage: 'Daño o acceso',
};

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
  const [userPosition, setUserPosition] = useState<readonly [number, number] | null>(null);
  const [locatingNearby, setLocatingNearby] = useState(false);
  const [nearbyNotice, setNearbyNotice] = useState<string | null>(null);
  const [onlyConfirmed, setOnlyConfirmed] = useState(false);
  const [activeJourney, setActiveJourney] = useState<HelpJourney | null>(null);
  const [savedCode, setSavedCode] = useState(() => loadTrackingCode());
  const [outboxNotice, setOutboxNotice] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(() => !('IntersectionObserver' in window));
  const [mapVisible, setMapVisible] = useState(true);
  const mapStageRef = useRef<HTMLDivElement>(null);
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
    queryKey: ['public-centers', region.id, onlyConfirmed],
    queryFn: () => loadPublicCenterPoints(region.id, onlyConfirmed),
    enabled:
      mapVisible ||
      activeJourney === 'help' ||
      activeJourney === 'donate' ||
      activeJourney === 'centers',
  });
  const reportsQuery = useQuery({
    queryKey: ['public-reports', region.id, onlyConfirmed],
    queryFn: () => loadPublicReportPoints(region.id, onlyConfirmed),
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
        saveTrackingCode(receipt.tracking_code, pending.kind);
        setSavedCode({ code: receipt.tracking_code, kind: pending.kind });
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
  const visiblePoints = useMemo(() => {
    const matching = regionPoints.filter(
      (point) =>
        layers.has(point.category) && (!normalizedQuery || matchesQuery(point, normalizedQuery)),
    );
    if (!userPosition) return matching;
    // Lo más cerca primero. Lo que no tiene ubicación exacta va al final, no se descarta.
    return [...matching].sort((first, second) => {
      const firstDistance = first.coordinates
        ? distanceInMeters(userPosition, first.coordinates)
        : Number.POSITIVE_INFINITY;
      const secondDistance = second.coordinates
        ? distanceInMeters(userPosition, second.coordinates)
        : Number.POSITIVE_INFINITY;
      return firstDistance - secondDistance;
    });
  }, [regionPoints, layers, normalizedQuery, userPosition]);
  const distanceTo = (point: (typeof regionPoints)[number]) =>
    userPosition && point.coordinates
      ? formatDistance(distanceInMeters(userPosition, point.coordinates))
      : null;
  const showNearby = () => {
    if (!navigator.geolocation) {
      setNearbyNotice('Este dispositivo no puede darnos tu ubicación.');
      return;
    }
    setLocatingNearby(true);
    setNearbyNotice(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserPosition([position.coords.longitude, position.coords.latitude]);
        setLocatingNearby(false);
      },
      () => {
        setLocatingNearby(false);
        setNearbyNotice('No pudimos ubicarte. Puedes buscar por barrio.');
      },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  };
  const selectedPoint = visiblePoints.find((point) => point.id === selectedPointId);
  const counts = useMemo(
    () =>
      regionPoints.reduce(
        (total, point) => {
          total[point.category] += 1;
          return total;
        },
        { need: 0, offer: 0, 'aid-center': 0, damage: 0 },
      ),
    [regionPoints],
  );
  const toggleLayer = (category: MapCategory) =>
    setLayers((current) => {
      const next = new Set(current);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  const updateTerritoryUrl = (
    nextRegion: string,
    area: string | null,
    neighborhood: string | null,
  ) => {
    const params = new URLSearchParams(window.location.search);
    params.set('region', nextRegion);
    if (area) params.set('comuna', area);
    else params.delete('comuna');
    if (neighborhood) params.set('barrio', neighborhood);
    else params.delete('barrio');
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
  const openJourney = (journey: HelpJourney) => {
    setActiveJourney(journey);
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
    // Sin IntersectionObserver el mapa ya arrancó listo desde el estado inicial.
    if (!('IntersectionObserver' in window)) return;
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
  const directionsUrl = selectedPoint?.coordinates
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
        <HelpJourneyPanel
          activeJourney={activeJourney}
          counts={counts}
          onChangeJourney={setActiveJourney}
          onClose={() => setActiveJourney(null)}
          onOutboxNotice={setOutboxNotice}
          onShowMap={showOnMap}
          onTracked={setSavedCode}
          publicDataLoaded={publicDataLoaded}
          region={region}
          savedCode={savedCode}
        />
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
              {userPosition ? (
                <p className="nearby-active" role="status">
                  Ordenado por cercanía.{' '}
                  <button onClick={() => setUserPosition(null)} type="button">
                    Quitar
                  </button>
                </p>
              ) : (
                <button
                  className="nearby-action"
                  disabled={locatingNearby}
                  onClick={showNearby}
                  type="button"
                >
                  <Navigation size={18} />{' '}
                  {locatingNearby ? 'Buscando tu ubicación…' : 'Ver lo más cerca de mí'}
                </button>
              )}
              {nearbyNotice && (
                <p className="form-notice" role="status">
                  {nearbyNotice}
                </p>
              )}
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
            <label className="confirmed-only">
              <input
                checked={onlyConfirmed}
                onChange={(event) => {
                  setOnlyConfirmed(event.target.checked);
                  setSelectedPointId(null);
                }}
                type="checkbox"
              />
              <span>Ver solo información confirmada</span>
            </label>
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
                  {selectedPoint.acceptedItems && selectedPoint.acceptedItems.length > 0 && (
                    <div>
                      <dt>
                        <PackageCheck size={16} /> Les hace falta
                      </dt>
                      <dd className="item-chips">
                        {selectedPoint.acceptedItems.map((item) => (
                          <span key={item}>{item}</span>
                        ))}
                      </dd>
                    </div>
                  )}
                  {selectedPoint.sufficientItems && selectedPoint.sufficientItems.length > 0 && (
                    <div>
                      <dt>
                        <PackageCheck size={16} /> Ya tienen suficiente
                      </dt>
                      <dd className="item-chips item-chips--enough">
                        {selectedPoint.sufficientItems.map((item) => (
                          <span key={item}>{item}</span>
                        ))}
                      </dd>
                    </div>
                  )}
                </dl>
                {directionsUrl ? (
                  <a
                    className="directions-button"
                    href={directionsUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <Navigation size={18} /> Cómo llegar
                  </a>
                ) : (
                  <p className="no-exact-location">
                    Quien lo reportó no compartió la ubicación exacta. Guíate por el barrio.
                  </p>
                )}
                {selectedPoint.isStale && (
                  <p className="stale-warning" role="status">
                    <TriangleAlert size={16} /> Puede estar desactualizado. Confirma antes de ir.
                  </p>
                )}
                <small>
                  {selectedPoint.sourceLabel ?? 'Fuente ciudadana'} · actualizado{' '}
                  {formatFreshness(selectedPoint.observedAt)}
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
                  <p>
                    {point.neighborhood}
                    {distanceTo(point) && (
                      <strong className="card-distance"> · {distanceTo(point)}</strong>
                    )}
                  </p>
                  {!point.coordinates && (
                    <small className="no-exact-location">Sin punto exacto en el mapa</small>
                  )}
                  <small>{point.description}</small>
                  <time dateTime={point.observedAt}>
                    Actualizado {formatFreshness(point.observedAt)}
                    {point.isStale && ' · puede estar desactualizado'}
                  </time>
                </button>
              ))}
              {visiblePoints.length === 0 && (
                <div className="empty-state">
                  <p>
                    {query
                      ? 'No encontramos nada con esa búsqueda.'
                      : 'Todavía no hay nada publicado aquí.'}
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
                    onlyConfirmed && (
                      <button onClick={() => setOnlyConfirmed(false)} type="button">
                        Ver también lo que falta por confirmar
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
            <MapLegend showAreaScale={hasLocalBoundaries} />
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
