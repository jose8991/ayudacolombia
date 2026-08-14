import { useEffect, useRef } from 'react';
import maplibregl, { type Map } from 'maplibre-gl';
import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson';
import type { HumanitarianRegion } from '../../entities/incident';

type Municipalities = FeatureCollection<Polygon | MultiPolygon>;
const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleUpperCase('es');

export function DepartmentMap({
  department,
  regions,
  onChoose,
}: {
  department: string;
  regions: readonly HumanitarianRegion[];
  onChoose: (id: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const scoped = regions.filter(
      (region) => normalize(region.department) === normalize(department),
    );
    const center: [number, number] = scoped.length
      ? [
          scoped.reduce((sum, item) => sum + item.center[0], 0) / scoped.length,
          scoped.reduce((sum, item) => sum + item.center[1], 0) / scoped.length,
        ]
      : [-75.7, 4.7];
    const map = new maplibregl.Map({
      container: containerRef.current,
      center,
      zoom: 8.5,
      attributionControl: false,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors',
          },
        },
        layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
      },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
    map.on('load', async () => {
      const response = await fetch('/data/municipios-risaralda-quindio-mgn2025.geojson');
      const source = (await response.json()) as Municipalities;
      const filtered: Municipalities = {
        ...source,
        features: source.features
          .filter(
            (feature) =>
              normalize(String(feature.properties?.DPTO_CNMBRE ?? '')) === normalize(department),
          )
          .map((feature) => {
            const name = String(feature.properties?.MPIO_CNMBRE ?? '');
            const region = scoped.find((item) => normalize(item.name) === normalize(name));
            return {
              ...feature,
              properties: {
                ...feature.properties,
                configured: Boolean(region),
                hasActivity: Boolean(region?.hasActivity),
                activeNeeds: region?.activeNeeds ?? 0,
                openCenters: region?.openCenters ?? 0,
                targetRegion: region?.id ?? '',
              },
            };
          }),
      };
      map.addSource('municipalities', { type: 'geojson', data: filtered });
      map.addLayer({
        id: 'municipality-fill',
        type: 'fill',
        source: 'municipalities',
        paint: {
          'fill-color': [
            'case',
            ['get', 'hasActivity'],
            '#e98532',
            ['get', 'configured'],
            '#b9dccc',
            '#e6ebe8',
          ],
          'fill-opacity': 0.72,
        },
      });
      map.addLayer({
        id: 'municipality-line',
        type: 'line',
        source: 'municipalities',
        paint: { 'line-color': '#315b50', 'line-width': ['case', ['get', 'configured'], 2, 0.8] },
      });
      map.addLayer({
        id: 'municipality-label',
        type: 'symbol',
        source: 'municipalities',
        layout: { 'text-field': ['get', 'MPIO_CNMBRE'], 'text-size': 10 },
        paint: { 'text-color': '#17332a', 'text-halo-color': '#fff', 'text-halo-width': 1.3 },
      });
      map.on('click', 'municipality-fill', (event) => {
        const target = String(event.features?.[0]?.properties?.targetRegion ?? '');
        if (target) onChoose(target);
      });
      map.on('mousemove', 'municipality-fill', (event) => {
        map.getCanvas().style.cursor = event.features?.[0]?.properties?.targetRegion
          ? 'pointer'
          : '';
      });
      map.on('mouseleave', 'municipality-fill', () => {
        map.getCanvas().style.cursor = '';
      });
    });
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [department, onChoose, regions]);
  return (
    <div
      aria-label={`Mapa municipal de ${department}`}
      className="national-map"
      ref={containerRef}
      role="region"
    />
  );
}
