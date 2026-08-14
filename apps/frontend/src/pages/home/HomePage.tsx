import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { DEMO_REGIONS, type MapCategory } from '../../entities/incident';
import { NationalOverview } from '../../features/national-overview/NationalOverview';
import { AppHeader } from '../../widgets/app-header';
import { HomePrimaryActions, type HelpJourney } from '../../widgets/home-primary-actions';
import { HelpJourneyPanel } from '../../widgets/help-journey';
import { MapWorkspace } from '../../widgets/map-workspace';
import { loadPublicCenterPoints } from '../../shared/api/public-centers';
import { loadPublicReportPoints } from '../../shared/api/public-reports';
import { hasLocalBoundaries as regionHasLocalBoundaries } from '../../shared/api/neighborhoods';
import { loadPublicRegions } from '../../shared/api/territories';
import { submitPublicInformation } from '../../shared/api/submissions';
import {
  clearPendingSubmission,
  loadPendingSubmission,
} from '../../shared/offline/secure-submission-outbox';
import { loadTrackingCode, saveTrackingCode } from '../../shared/offline/last-tracking-code';

const INITIAL_LAYERS = new Set<MapCategory>(['aid-center', 'need', 'offer', 'damage']);

export function HomePage() {
  const [regionId, setRegionId] = useState(
    () => new URLSearchParams(window.location.search).get('region') ?? 'co-ris-pereira',
  );
  const [layers, setLayers] = useState<Set<MapCategory>>(INITIAL_LAYERS);
  const [query, setQuery] = useState(
    () => new URLSearchParams(window.location.search).get('barrio') ?? '',
  );
  const [selectedArea, setSelectedArea] = useState<string | null>(() =>
    new URLSearchParams(window.location.search).get('comuna'),
  );
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string | null>(() =>
    new URLSearchParams(window.location.search).get('barrio'),
  );
  const [onlyConfirmed, setOnlyConfirmed] = useState(false);
  const [activeJourney, setActiveJourney] = useState<HelpJourney | null>(null);
  const [savedCode, setSavedCode] = useState(() => loadTrackingCode());
  const [outboxNotice, setOutboxNotice] = useState<string | null>(null);
  const [mapVisible, setMapVisible] = useState(true);
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
  const regionPoints = useMemo(
    () => [...publicCenterPoints, ...publicReportPoints],
    [publicCenterPoints, publicReportPoints],
  );
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
    setQuery('');
    updateTerritoryUrl(canonicalRegion, null, null);
  };
  const openJourney = (journey: HelpJourney) => {
    setActiveJourney(journey);
  };
  const showOnMap = (nextLayers: MapCategory[], nextQuery = '') => {
    setMapVisible(true);
    setLayers(new Set(nextLayers));
    setQuery(nextQuery);
    setActiveJourney(null);
    window.setTimeout(() => {
      const target = document.getElementById('map-title');
      if (target && typeof target.scrollIntoView === 'function')
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  };

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
        <MapWorkspace
          key={region.id}
          counts={counts}
          hasLocalBoundaries={hasLocalBoundaries}
          layers={layers}
          onlyConfirmed={onlyConfirmed}
          onOnlyConfirmedChange={setOnlyConfirmed}
          onQueryChange={setQuery}
          onSelectArea={setSelectedArea}
          onSelectNeighborhood={setSelectedNeighborhood}
          onToggleLayer={toggleLayer}
          onUpdateTerritoryUrl={updateTerritoryUrl}
          publicDataLoaded={publicDataLoaded}
          query={query}
          region={region}
          regionPoints={regionPoints}
          selectedArea={selectedArea}
          selectedNeighborhood={selectedNeighborhood}
        />
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
