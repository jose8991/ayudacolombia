import { useEffect, useRef } from 'react';
import maplibregl, { type GeoJSONSource, type Map as MapLibreMap } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson';
import { boundingBox, isPointInArea, type AreaGeometry } from '@timeliber/kit';
import type { HumanitarianMapPoint, HumanitarianRegion } from '../../entities/incident';
import {
  MARKER_PIXEL_RATIO,
  buildMarkerImages,
  describeCluster,
  isAged,
  isBlocked,
  markerIconName,
} from './markers';

const SOURCE_ID = 'humanitarian-points';
const BOUNDARY_SOURCE_ID = 'territorial-boundaries';
const NEIGHBORHOOD_SOURCE_ID = 'neighborhood-boundaries';
const RURAL_SOURCE_ID = 'rural-boundaries';

type BoundaryCollection = FeatureCollection<Polygon | MultiPolygon>;

const deferredFetch = (input: RequestInfo | URL) =>
  new Promise<Response>((resolve, reject) => {
    window.setTimeout(() => fetch(input).then(resolve, reject), 350);
  });

const normalizeBoundaryName = (value: unknown) =>
  String(value ?? '')
    .replace(/^BARRIO\s+(URBANIZACIÓN\s+)?/i, '')
    .trim();

/** Puente entre la caja que calcula el paquete y el tipo que espera MapLibre. */
function boundsForGeometry(geometry: Polygon | MultiPolygon) {
  const box = boundingBox(geometry as AreaGeometry);
  return new maplibregl.LngLatBounds([box.west, box.south], [box.east, box.north]);
}

function enrichBoundaries(
  collection: BoundaryCollection,
  points: readonly HumanitarianMapPoint[],
): BoundaryCollection {
  const severityWeight = { low: 1, medium: 2, high: 3, critical: 4 } as const;
  return {
    ...collection,
    features: collection.features.map((feature) => {
      const contained = points.filter(
        (point) =>
          point.coordinates && isPointInArea(point.coordinates, feature.geometry as AreaGeometry),
      );
      const needs = contained.filter((point) => point.category === 'need');
      const damage = contained.filter((point) => point.category === 'damage');
      const aidCenters = contained.filter((point) => point.category === 'aid-center');
      const urgencyScore = [...needs, ...damage].reduce(
        (score, point) => score + severityWeight[point.severity],
        0,
      );
      return {
        ...feature,
        properties: {
          ...feature.properties,
          needs: needs.length,
          damage: damage.length,
          aidCenters: aidCenters.length,
          urgencyScore,
        },
      };
    }),
  };
}

function createPopupContent(properties: Record<string, string>) {
  const container = document.createElement('div');
  const title = document.createElement('strong');
  const neighborhood = document.createElement('p');
  const description = document.createElement('small');
  title.textContent = properties.title;
  neighborhood.textContent = properties.neighborhood;
  description.textContent = properties.description;
  container.append(title, neighborhood, description);
  return container;
}

function toGeoJSON(points: readonly HumanitarianMapPoint[]): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: points
      .filter((point) => point.coordinates !== null)
      .map((point) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [...point.coordinates!] },
        properties: {
          id: point.id,
          title: point.title,
          category: point.category,
          neighborhood: point.neighborhood,
          description: point.description,
          severity: point.severity,
          verificationStatus: point.verificationStatus,
          icon: markerIconName(point),
          aged: isAged(point),
          blocked: isBlocked(point),
        },
      })),
  };
}

interface EmergencyMapProps {
  region: HumanitarianRegion;
  points: readonly HumanitarianMapPoint[];
  selectedPointId: string | null;
  onSelectPoint: (id: string) => void;
  selectedArea: string | null;
  onSelectArea: (name: string | null) => void;
  selectedNeighborhood: string | null;
  onSelectNeighborhood: (name: string | null) => void;
}

export function EmergencyMap({
  region,
  points,
  selectedPointId,
  onSelectPoint,
  selectedArea,
  onSelectArea,
  selectedNeighborhood,
  onSelectNeighborhood,
}: EmergencyMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const boundaryDataRef = useRef<BoundaryCollection | null>(null);
  const neighborhoodDataRef = useRef<BoundaryCollection | null>(null);
  const ruralDataRef = useRef<BoundaryCollection | null>(null);
  const clusterMarkersRef = useRef(new Map<number, maplibregl.Marker>());
  const visiblePoints = points;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      center: [...region.center],
      zoom: region.zoom,
      minZoom: 5,
      maxZoom: 18,
      maxBounds: [
        [-79.2, -4.5],
        [-66.7, 13.7],
      ],
      renderWorldCopies: false,
      attributionControl: false,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors',
          },
        },
        layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
      },
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
    map.on('load', () => {
      if (['co-ris-pereira', 'co-ris-dosquebradas'].includes(region.id)) {
        const isDosquebradas = region.id === 'co-ris-dosquebradas';
        map.addSource(BOUNDARY_SOURCE_ID, {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });
        fetch('/data/pereira-comunas-reference.geojson')
          .then((response) => response.json())
          .then((data: BoundaryCollection) => {
            boundaryDataRef.current = data;
            const source = map.getSource(BOUNDARY_SOURCE_ID) as GeoJSONSource | undefined;
            source?.setData(enrichBoundaries(data, visiblePoints));
          })
          .catch(() => undefined);
        map.addLayer({
          id: 'territory-fill',
          type: 'fill',
          source: BOUNDARY_SOURCE_ID,
          layout: { visibility: isDosquebradas ? 'none' : 'visible' },
          paint: {
            'fill-color': [
              'step',
              ['coalesce', ['get', 'urgencyScore'], 0],
              '#d9e3df',
              1,
              '#f2c94c',
              3,
              '#e98532',
              6,
              '#cf3f36',
            ],
            'fill-opacity': 0.38,
          },
        });
        map.addLayer({
          id: 'territory-line',
          type: 'line',
          source: BOUNDARY_SOURCE_ID,
          layout: { visibility: isDosquebradas ? 'none' : 'visible' },
          paint: {
            'line-color': '#315b50',
            'line-width': ['interpolate', ['linear'], ['zoom'], 10, 0.7, 14, 1.8],
            'line-opacity': 0.72,
          },
        });
        map.addLayer({
          id: 'territory-label',
          type: 'symbol',
          source: BOUNDARY_SOURCE_ID,
          minzoom: 11.5,
          layout: {
            visibility: isDosquebradas ? 'none' : 'visible',
            'text-field': ['get', 'NOMBRE'],
            'text-size': 11,
            'text-transform': 'uppercase',
            'text-letter-spacing': 0.05,
          },
          paint: { 'text-color': '#17332a', 'text-halo-color': '#ffffff', 'text-halo-width': 1.5 },
        });
        map.on('click', 'territory-fill', (event) => {
          const feature = event.features?.[0];
          if (!feature) return;
          const properties = feature.properties as Record<string, string>;
          const content = document.createElement('div');
          const title = document.createElement('strong');
          const metrics = document.createElement('p');
          const note = document.createElement('small');
          title.textContent = 'Comuna ' + (properties.NOMBRE ?? 'sin nombre');
          onSelectArea(properties.NOMBRE ?? null);
          map.easeTo({ center: event.lngLat, zoom: Math.max(map.getZoom(), 13), duration: 600 });
          const published =
            Number(properties.needs ?? 0) +
            Number(properties.damage ?? 0) +
            Number(properties.aidCenters ?? 0);
          metrics.textContent =
            published > 0
              ? published + ' publicaciones registradas en esta comuna'
              : 'Sin información publicada para esta comuna';
          note.textContent =
            'Resultado demostrativo. Límite de referencia 2021, pendiente de armonización con el Acuerdo 03 de 2026.';
          content.append(title, metrics, note);
          new maplibregl.Popup({ maxWidth: '300px' })
            .setLngLat(event.lngLat)
            .setDOMContent(content)
            .addTo(map);
        });
        map.addSource(NEIGHBORHOOD_SOURCE_ID, {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });
        let neighborhoodsLoading = false;
        const loadNeighborhoodBoundaries = () => {
          if (neighborhoodDataRef.current || neighborhoodsLoading) return;
          neighborhoodsLoading = true;
          deferredFetch(
            isDosquebradas
              ? '/data/dosquebradas-barrios-reference.geojson'
              : '/data/pereira-barrios-reference.geojson',
          )
            .then((response) => response.json())
            .then((data: BoundaryCollection) => {
              if (isDosquebradas)
                data = {
                  ...data,
                  features: data.features.map((feature) => ({
                    ...feature,
                    properties: {
                      ...feature.properties,
                      NOMBRE: normalizeBoundaryName(feature.properties?.BARRIO),
                    },
                  })),
                };
              neighborhoodDataRef.current = data;
              (map.getSource(NEIGHBORHOOD_SOURCE_ID) as GeoJSONSource | undefined)?.setData(data);
              const selected = data.features.find(
                (item) =>
                  item.properties?.NOMBRE === selectedNeighborhood &&
                  (!selectedArea || isDosquebradas || item.properties?.COMUNA === selectedArea),
              );
              if (selected)
                map.fitBounds(boundsForGeometry(selected.geometry), {
                  padding: 70,
                  maxZoom: 15.5,
                  duration: 650,
                });
            })
            .catch(() => {
              neighborhoodsLoading = false;
            });
        };
        map.on('zoomend', () => {
          if (map.getZoom() >= (isDosquebradas ? 11.25 : 12.5)) loadNeighborhoodBoundaries();
        });
        if (selectedNeighborhood || map.getZoom() >= (isDosquebradas ? 11.25 : 12.5))
          loadNeighborhoodBoundaries();
        map.addLayer({
          id: 'neighborhood-fill',
          type: 'fill',
          source: NEIGHBORHOOD_SOURCE_ID,
          minzoom: isDosquebradas ? 11.5 : 13,
          paint: {
            'fill-color': [
              'case',
              ['==', ['get', 'NOMBRE'], selectedNeighborhood ?? ''],
              '#0b5fff',
              '#ffffff',
            ],
            'fill-opacity': [
              'case',
              ['==', ['get', 'NOMBRE'], selectedNeighborhood ?? ''],
              0.32,
              0.06,
            ],
          },
        });
        map.addLayer({
          id: 'neighborhood-line',
          type: 'line',
          source: NEIGHBORHOOD_SOURCE_ID,
          minzoom: isDosquebradas ? 11.5 : 13,
          paint: {
            'line-color': [
              'case',
              ['==', ['get', 'NOMBRE'], selectedNeighborhood ?? ''],
              '#0b5fff',
              '#52756c',
            ],
            'line-width': ['case', ['==', ['get', 'NOMBRE'], selectedNeighborhood ?? ''], 4, 1],
          },
        });
        map.addLayer({
          id: 'neighborhood-label',
          type: 'symbol',
          source: NEIGHBORHOOD_SOURCE_ID,
          minzoom: isDosquebradas ? 13 : 14,
          layout: { 'text-field': ['get', 'NOMBRE'], 'text-size': 11 },
          paint: { 'text-color': '#17332a', 'text-halo-color': '#ffffff', 'text-halo-width': 1.5 },
        });
        map.on('click', 'neighborhood-fill', (event) => {
          const properties = event.features?.[0]?.properties as Record<string, string> | undefined;
          if (!properties) return;
          if (properties.COMUNA) onSelectArea(properties.COMUNA);
          onSelectNeighborhood(properties.NOMBRE ?? null);
          map.easeTo({ center: event.lngLat, zoom: Math.max(map.getZoom(), 14.5), duration: 600 });
        });
        if (!isDosquebradas) {
          map.addSource(RURAL_SOURCE_ID, {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] },
          });
          map.addLayer({
            id: 'rural-fill',
            type: 'fill',
            source: RURAL_SOURCE_ID,
            paint: {
              'fill-color': [
                'case',
                ['==', ['get', 'NOMBRE'], selectedArea ?? ''],
                '#0b5fff',
                '#8bb7a4',
              ],
              'fill-opacity': ['case', ['==', ['get', 'NOMBRE'], selectedArea ?? ''], 0.25, 0.07],
            },
          });
          map.addLayer({
            id: 'rural-line',
            type: 'line',
            source: RURAL_SOURCE_ID,
            paint: {
              'line-color': [
                'case',
                ['==', ['get', 'NOMBRE'], selectedArea ?? ''],
                '#0b5fff',
                '#477466',
              ],
              'line-width': ['case', ['==', ['get', 'NOMBRE'], selectedArea ?? ''], 4, 1.2],
              'line-dasharray': [3, 2],
            },
          });
          map.addLayer({
            id: 'rural-label',
            type: 'symbol',
            source: RURAL_SOURCE_ID,
            minzoom: 10,
            layout: { 'text-field': ['get', 'nombre'], 'text-size': 11 },
            paint: {
              'text-color': '#17332a',
              'text-halo-color': '#ffffff',
              'text-halo-width': 1.5,
            },
          });
          map.on('click', 'rural-fill', (event) => {
            const properties = event.features?.[0]?.properties as
              Record<string, string> | undefined;
            if (!properties) return;
            onSelectArea(properties.NOMBRE);
            map.easeTo({
              center: event.lngLat,
              zoom: Math.max(map.getZoom(), 11.5),
              duration: 600,
            });
          });
          map.on('mouseenter', 'rural-fill', () => {
            map.getCanvas().style.cursor = 'pointer';
          });
          map.on('mouseleave', 'rural-fill', () => {
            map.getCanvas().style.cursor = '';
          });
        }
        map.on('mouseenter', 'neighborhood-fill', () => {
          map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', 'neighborhood-fill', () => {
          map.getCanvas().style.cursor = '';
        });
      }
      map.addSource(SOURCE_ID, {
        type: 'geojson',
        data: toGeoJSON(visiblePoints),
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 48,
        clusterProperties: {
          centers: ['+', ['case', ['==', ['get', 'category'], 'aid-center'], 1, 0]],
          needs: ['+', ['case', ['==', ['get', 'category'], 'need'], 1, 0]],
          offers: ['+', ['case', ['==', ['get', 'category'], 'offer'], 1, 0]],
          damages: ['+', ['case', ['==', ['get', 'category'], 'damage'], 1, 0]],
        },
      });
      map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: SOURCE_ID,
        filter: ['has', 'point_count'],
        paint: {
          'circle-radius': ['step', ['get', 'point_count'], 22, 10, 26, 50, 30],
          'circle-opacity': 0,
        },
      });
      for (const image of buildMarkerImages()) {
        if (!map.hasImage(image.name))
          map.addImage(image.name, image.data, { pixelRatio: MARKER_PIXEL_RATIO });
      }
      map.addLayer({
        id: 'points',
        type: 'symbol',
        source: SOURCE_ID,
        filter: ['!', ['has', 'point_count']],
        layout: {
          'icon-image': ['get', 'icon'],
          'icon-size': 1,
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
        },
      });
      map.on('click', 'points', (event) => {
        const feature = event.features?.[0];
        if (!feature || feature.geometry.type !== 'Point') return;
        const coordinates = feature.geometry.coordinates as [number, number];
        const properties = feature.properties as Record<string, string>;
        onSelectPoint(properties.id);
        new maplibregl.Popup({ closeButton: true, maxWidth: '280px' })
          .setLngLat(coordinates)
          .setDOMContent(createPopupContent(properties))
          .addTo(map);
      });
      map.on('click', 'clusters', async (event) => {
        const feature = event.features?.[0];
        if (!feature || feature.geometry.type !== 'Point') return;
        const source = map.getSource(SOURCE_ID) as GeoJSONSource;
        const zoom = await source.getClusterExpansionZoom(Number(feature.properties?.cluster_id));
        map.easeTo({ center: feature.geometry.coordinates as [number, number], zoom });
      });
      map.on('mouseenter', 'clusters', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'clusters', () => {
        map.getCanvas().style.cursor = '';
      });
      map.on('mouseenter', 'points', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'points', () => {
        map.getCanvas().style.cursor = '';
      });
    });
    // Los grupos se dibujan como elementos reales: MapLibre solo pinta texto si el estilo
    // declara un juego de glifos, y este no lo hace. Así además se puede decir de qué es
    // cada grupo y el objetivo táctil no depende del zoom.
    // Se copia la referencia: en la limpieza podría apuntar ya a otro mapa.
    const markers = clusterMarkersRef.current;
    const syncClusters = () => {
      if (!map.getLayer('clusters')) return;
      const seen = new Set<number>();
      for (const feature of map.queryRenderedFeatures({ layers: ['clusters'] })) {
        if (feature.geometry.type !== 'Point') continue;
        const properties = (feature.properties ?? {}) as Record<string, unknown>;
        const clusterId = Number(properties.cluster_id);
        if (!Number.isFinite(clusterId)) continue;
        seen.add(clusterId);
        const summary = describeCluster(properties);
        const position = feature.geometry.coordinates as [number, number];
        const existing = markers.get(clusterId);
        if (existing) {
          existing.setLngLat(position);
          continue;
        }
        const element = document.createElement('button');
        element.type = 'button';
        element.className = 'cluster-marker';
        element.style.setProperty('--cluster-ring', summary.gradient);
        element.setAttribute('aria-label', summary.label);
        element.title = summary.label;
        element.textContent = String(summary.count);
        element.addEventListener('click', async (event) => {
          event.stopPropagation();
          const source = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
          if (!source) return;
          const zoom = await source.getClusterExpansionZoom(clusterId);
          map.easeTo({ center: position, zoom });
        });
        markers.set(clusterId, new maplibregl.Marker({ element }).setLngLat(position).addTo(map));
      }
      for (const [clusterId, marker] of markers) {
        if (seen.has(clusterId)) continue;
        marker.remove();
        markers.delete(clusterId);
      }
    };
    map.on('idle', syncClusters);
    map.on('moveend', syncClusters);

    mapRef.current = map;
    return () => {
      for (const marker of markers.values()) marker.remove();
      markers.clear();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const selectedPoint = points.find((point) => point.id === selectedPointId);
    if (map?.getLayer('points')) {
      map.setLayoutProperty('points', 'icon-size', [
        'case',
        ['==', ['get', 'id'], selectedPointId ?? ''],
        1.3,
        1,
      ]);
      if (selectedPoint?.coordinates)
        map.easeTo({
          center: [...selectedPoint.coordinates],
          zoom: Math.max(map.getZoom(), 14),
          duration: 650,
        });
    }
  }, [selectedPointId, points]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.getLayer('territory-line')) return;
    if (
      selectedArea?.startsWith('rural:') &&
      map.getSource(RURAL_SOURCE_ID) &&
      !ruralDataRef.current
    ) {
      fetch('/data/pereira-corregimientos-reference.geojson')
        .then((response) => response.json())
        .then((data: BoundaryCollection) => {
          const normalized = {
            ...data,
            features: data.features.map((feature) => ({
              ...feature,
              properties: { ...feature.properties, NOMBRE: 'rural:' + feature.properties?.nombre },
            })),
          };
          ruralDataRef.current = normalized;
          (map.getSource(RURAL_SOURCE_ID) as GeoJSONSource | undefined)?.setData(normalized);
          const ruralFeature = normalized.features.find(
            (item) => item.properties?.NOMBRE === selectedArea,
          );
          if (ruralFeature)
            map.fitBounds(boundsForGeometry(ruralFeature.geometry), {
              padding: 55,
              maxZoom: 12.5,
              duration: 650,
            });
        })
        .catch(() => undefined);
    }
    map.setPaintProperty('territory-line', 'line-color', [
      'case',
      ['==', ['get', 'NOMBRE'], selectedArea ?? ''],
      '#0b5fff',
      '#315b50',
    ]);
    map.setPaintProperty('territory-line', 'line-width', [
      'case',
      ['==', ['get', 'NOMBRE'], selectedArea ?? ''],
      4,
      1.4,
    ]);
    if (map.getLayer('rural-line')) {
      map.setPaintProperty('rural-fill', 'fill-color', [
        'case',
        ['==', ['get', 'NOMBRE'], selectedArea ?? ''],
        '#0b5fff',
        '#8bb7a4',
      ]);
      map.setPaintProperty('rural-line', 'line-color', [
        'case',
        ['==', ['get', 'NOMBRE'], selectedArea ?? ''],
        '#0b5fff',
        '#477466',
      ]);
      map.setPaintProperty('rural-line', 'line-width', [
        'case',
        ['==', ['get', 'NOMBRE'], selectedArea ?? ''],
        4,
        1.2,
      ]);
      const ruralFeature = ruralDataRef.current?.features.find(
        (item) => item.properties?.NOMBRE === selectedArea,
      );
      if (ruralFeature)
        map.fitBounds(boundsForGeometry(ruralFeature.geometry), {
          padding: 55,
          maxZoom: 12.5,
          duration: 650,
        });
    }
    if (selectedArea && !selectedArea.startsWith('rural:')) {
      const areaFeature = boundaryDataRef.current?.features.find(
        (item) => item.properties?.NOMBRE === selectedArea,
      );
      if (areaFeature)
        map.fitBounds(boundsForGeometry(areaFeature.geometry), {
          padding: 60,
          maxZoom: 14,
          duration: 650,
        });
    }
    const areaFilter =
      selectedArea && region.id !== 'co-ris-dosquebradas'
        ? (['==', ['get', 'COMUNA'], selectedArea] as maplibregl.FilterSpecification)
        : null;
    ['neighborhood-fill', 'neighborhood-line', 'neighborhood-label'].forEach((layer) => {
      if (map.getLayer(layer)) map.setFilter(layer, areaFilter);
    });
  }, [selectedArea, region.id]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.getLayer('neighborhood-line')) return;
    const selected = selectedNeighborhood ?? '';
    map.setPaintProperty('neighborhood-fill', 'fill-color', [
      'case',
      ['==', ['get', 'NOMBRE'], selected],
      '#0b5fff',
      '#ffffff',
    ]);
    map.setPaintProperty('neighborhood-fill', 'fill-opacity', [
      'case',
      ['==', ['get', 'NOMBRE'], selected],
      0.32,
      0.06,
    ]);
    map.setPaintProperty('neighborhood-line', 'line-color', [
      'case',
      ['==', ['get', 'NOMBRE'], selected],
      '#0b5fff',
      '#52756c',
    ]);
    map.setPaintProperty('neighborhood-line', 'line-width', [
      'case',
      ['==', ['get', 'NOMBRE'], selected],
      4,
      1,
    ]);
    if (selectedNeighborhood && neighborhoodDataRef.current) {
      const feature = neighborhoodDataRef.current.features.find(
        (item) =>
          item.properties?.NOMBRE === selectedNeighborhood &&
          (!selectedArea ||
            region.id === 'co-ris-dosquebradas' ||
            item.properties?.COMUNA === selectedArea),
      );
      if (feature)
        map.fitBounds(boundsForGeometry(feature.geometry), {
          padding: 70,
          maxZoom: 15.5,
          duration: 650,
        });
    }
  }, [selectedNeighborhood, selectedArea, region.id]);

  useEffect(() => {
    const source = mapRef.current?.getSource(SOURCE_ID) as GeoJSONSource | undefined;
    source?.setData(toGeoJSON(visiblePoints));
    const boundarySource = mapRef.current?.getSource(BOUNDARY_SOURCE_ID) as
      GeoJSONSource | undefined;
    if (boundarySource && boundaryDataRef.current)
      boundarySource.setData(enrichBoundaries(boundaryDataRef.current, visiblePoints));
  }, [points]);

  return (
    <div
      aria-label={'Mapa humanitario interactivo de ' + region.name}
      className="map-canvas"
      ref={containerRef}
      role="region"
    />
  );
}
