import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import type {
  HumanitarianMapPoint,
  HumanitarianRegion,
  MapCategory,
} from '../../entities/incident';
import { MapFilters } from '../../features/map-filter';
import { matchesQuery } from '../../features/map-filter/search';
import { MapLegend } from '../../features/map-legend';
import { PlaceDetail } from './PlaceDetail';
import { ResultList } from './ResultList';
import { formatAreaLabel, loadNeighborhoods } from '../../shared/api/neighborhoods';
import { formatFreshness } from '../../shared/format/freshness';
import { distanceInMeters, formatDistance } from '../../shared/format/distance';

const EmergencyMap = lazy(() =>
  import('../emergency-map').then((module) => ({ default: module.EmergencyMap })),
);

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

interface MapWorkspaceProps {
  region: HumanitarianRegion;
  hasLocalBoundaries: boolean;
  regionPoints: readonly HumanitarianMapPoint[];
  publicDataLoaded: boolean;
  counts: Record<MapCategory, number>;
  layers: ReadonlySet<MapCategory>;
  onToggleLayer: (category: MapCategory) => void;
  query: string;
  onQueryChange: (value: string) => void;
  onlyConfirmed: boolean;
  onOnlyConfirmedChange: (value: boolean) => void;
  selectedArea: string | null;
  onSelectArea: (area: string | null) => void;
  selectedNeighborhood: string | null;
  onSelectNeighborhood: (neighborhood: string | null) => void;
  onUpdateTerritoryUrl: (region: string, area: string | null, neighborhood: string | null) => void;
}

/**
 * El mapa y su barra lateral: qué hay cerca, con qué filtros y en qué orden. Todo su
 * estado —el punto abierto, la ubicación de quien consulta, si el mapa ya cargó— nace y
 * muere aquí. La página solo conserva lo que va en la dirección del navegador.
 */
export function MapWorkspace({
  region,
  hasLocalBoundaries,
  regionPoints,
  publicDataLoaded,
  counts,
  layers,
  onToggleLayer,
  query,
  onQueryChange,
  onlyConfirmed,
  onOnlyConfirmedChange,
  selectedArea,
  onSelectArea,
  selectedNeighborhood,
  onSelectNeighborhood,
  onUpdateTerritoryUrl,
}: MapWorkspaceProps) {
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [userPosition, setUserPosition] = useState<readonly [number, number] | null>(null);
  const [locatingNearby, setLocatingNearby] = useState(false);
  const [nearbyNotice, setNearbyNotice] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(() => !('IntersectionObserver' in window));
  const mapStageRef = useRef<HTMLDivElement>(null);
  const neighborhoodsQuery = useQuery({
    queryKey: ['neighborhoods', region.id],
    queryFn: () => loadNeighborhoods(region.id),
    enabled: hasLocalBoundaries,
  });
  const neighborhoods = neighborhoodsQuery.data ?? [];

  const areas = useMemo(
    () =>
      [...new Set(neighborhoods.map((item) => item.comuna))].sort((a, b) =>
        a.localeCompare(b, 'es', { numeric: true }),
      ),
    [neighborhoods],
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

  const directionsUrl = selectedPoint?.coordinates
    ? 'https://www.google.com/maps/dir/?api=1&destination=' +
      selectedPoint.coordinates[1] +
      ',' +
      selectedPoint.coordinates[0]
    : '';

  useEffect(() => {
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
  }, []);

  return (
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
        {selectedPoint && (
          <PlaceDetail
            directionsUrl={directionsUrl}
            onClose={() => setSelectedPointId(null)}
            point={selectedPoint}
          />
        )}
        {selectedArea && (
          <section aria-live="polite" className="area-detail">
            <button
              className="area-close"
              aria-label="Cerrar zona"
              onClick={() => {
                onSelectArea(null);
                onSelectNeighborhood(null);
                onQueryChange('');
                onUpdateTerritoryUrl(region.id, null, null);
              }}
              type="button"
            >
              <X size={16} />
            </button>
            <p className="eyebrow">
              {selectedNeighborhood ? formatAreaLabel(selectedArea) : 'Zona de ' + region.name}
            </p>
            <h3>
              {selectedNeighborhood
                ? (selectedArea.startsWith('rural:') ? 'Sector ' : 'Barrio ') + selectedNeighborhood
                : formatAreaLabel(selectedArea)}
            </h3>
            {selectedNeighborhood && (
              <button
                className="area-back"
                onClick={() => {
                  onSelectNeighborhood(null);
                  onQueryChange('');
                  onUpdateTerritoryUrl(region.id, selectedArea, null);
                }}
                type="button"
              >
                Volver a la zona
              </button>
            )}
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
                      onSelectNeighborhood(item.nombre);
                      onQueryChange(item.nombre);
                      onUpdateTerritoryUrl(region.id, selectedArea, item.nombre);
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
              Toca un barrio para ver solo lo de ahí. Los límites vienen del catálogo oficial de
              Datos Abiertos.
            </small>
          </section>
        )}
        {hasLocalBoundaries && (
          <label className="area-picker">
            <span>Zona</span>
            <select
              aria-label="Seleccionar zona"
              onChange={(event) => {
                const area = event.target.value || null;
                onSelectArea(area);
                onSelectNeighborhood(null);
                onQueryChange('');
                onUpdateTerritoryUrl(region.id, area, null);
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
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Buscar lugar o reporte"
            type="search"
            value={query}
          />
        </label>
        <label className="confirmed-only">
          <input
            checked={onlyConfirmed}
            onChange={(event) => {
              onOnlyConfirmedChange(event.target.checked);
              setSelectedPointId(null);
            }}
            type="checkbox"
          />
          <span>Ver solo información confirmada</span>
        </label>
        <details className="layer-panel">
          <summary>
            Qué mostrar <span>{layers.size === 1 ? '1 tipo' : layers.size + ' tipos'}</span>
          </summary>
          <MapFilters value={layers} onToggle={onToggleLayer} counts={counts} />
        </details>
        <ResultList
          distanceTo={distanceTo}
          onClearQuery={() => {
            onQueryChange('');
            onSelectNeighborhood(null);
          }}
          onSelectPoint={setSelectedPointId}
          onShowUnconfirmed={() => onOnlyConfirmedChange(false)}
          onlyConfirmed={onlyConfirmed}
          query={query}
          selectedPointId={selectedPointId}
          visiblePoints={visiblePoints}
        />
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
                onSelectArea(name);
                onSelectNeighborhood(null);
                if (name !== selectedArea) onUpdateTerritoryUrl(region.id, name, null);
              }}
              onSelectNeighborhood={(name) => {
                onSelectNeighborhood(name);
                if (name) {
                  onQueryChange(name);
                  onUpdateTerritoryUrl(region.id, selectedArea, name);
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
  );
}
