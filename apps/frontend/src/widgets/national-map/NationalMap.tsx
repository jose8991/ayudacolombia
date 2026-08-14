import { useEffect, useRef } from 'react';
import maplibregl, { type Map } from 'maplibre-gl';
import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson';
import type { HumanitarianRegion } from '../../entities/incident';

type Departments = FeatureCollection<Polygon | MultiPolygon>;
const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleUpperCase('es');

export function NationalMap({
  regions,
  onChooseDepartment,
}: {
  regions: readonly HumanitarianRegion[];
  onChooseDepartment: (department: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      center: [-73.3, 4.4],
      zoom: 4.4,
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
      const response = await fetch('/data/colombia-departamentos-mgn2025.geojson');
      const data = (await response.json()) as Departments;
      const enriched: Departments = {
        ...data,
        features: data.features.map((feature) => {
          const name = String(feature.properties?.DPTO_CNMBRE ?? '');
          const matches = regions.filter(
            (region) => normalize(region.department) === normalize(name),
          );
          return {
            ...feature,
            properties: {
              ...feature.properties,
              activeNeeds: matches.reduce((sum, region) => sum + (region.activeNeeds ?? 0), 0),
              openCenters: matches.reduce((sum, region) => sum + (region.openCenters ?? 0), 0),
              hasActivity: matches.some((region) => region.hasActivity),
              targetDepartment: matches.length ? matches[0].department : '',
            },
          };
        }),
      };
      map.addSource('departments', { type: 'geojson', data: enriched });
      map.addLayer({
        id: 'department-fill',
        type: 'fill',
        source: 'departments',
        paint: {
          'fill-color': [
            'case',
            ['get', 'hasActivity'],
            [
              'step',
              ['+', ['get', 'activeNeeds'], ['get', 'openCenters']],
              '#f2c94c',
              2,
              '#e98532',
              5,
              '#cf3f36',
            ],
            '#dfe8e3',
          ],
          'fill-opacity': 0.72,
        },
      });
      map.addLayer({
        id: 'department-line',
        type: 'line',
        source: 'departments',
        paint: {
          'line-color': '#315b50',
          'line-width': ['case', ['get', 'hasActivity'], 1.8, 0.7],
          'line-opacity': 0.8,
        },
      });
      map.addLayer({
        id: 'department-label',
        type: 'symbol',
        source: 'departments',
        minzoom: 4.5,
        layout: { 'text-field': ['get', 'DPTO_CNMBRE'], 'text-size': 9 },
        paint: { 'text-color': '#17332a', 'text-halo-color': '#fff', 'text-halo-width': 1.2 },
      });
      map.on('click', 'department-fill', (event) => {
        const target = String(event.features?.[0]?.properties?.targetDepartment ?? '');
        if (target) onChooseDepartment(target);
      });
      map.on('mouseenter', 'department-fill', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'department-fill', () => {
        map.getCanvas().style.cursor = '';
      });
    });
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [onChooseDepartment, regions]);
  return (
    <div
      aria-label="Mapa nacional de actividad humanitaria en Colombia"
      className="national-map"
      ref={containerRef}
      role="region"
    />
  );
}
