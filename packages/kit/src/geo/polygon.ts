/**
 * Geometría de polígonos, sin dependencias de mapa.
 *
 * Saber si un punto cae dentro de un límite administrativo es lo que permite verificar
 * una coordenada antes de publicarla —si el geocodificador devolvió algo fuera del
 * municipio, ese dato no entra— y también agrupar puntos por zona sin pedirle nada al
 * servidor.
 */

/** Longitud y latitud, en ese orden, como en GeoJSON. */
export type Position = readonly [number, number];

/** Un anillo es una lista cerrada de posiciones; el primero es el contorno y el resto, huecos. */
export type Ring = number[][];

export interface PolygonGeometry {
  type: 'Polygon';
  coordinates: Ring[];
}

export interface MultiPolygonGeometry {
  type: 'MultiPolygon';
  coordinates: Ring[][];
}

export type AreaGeometry = PolygonGeometry | MultiPolygonGeometry;

export interface BoundingBox {
  west: number;
  south: number;
  east: number;
  north: number;
}

/** Algoritmo de cruce de rayos: cuenta cuántas veces una semirrecta corta el anillo. */
export function isPointInRing(point: Position, ring: Ring): boolean {
  let inside = false;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
    const [x, y] = ring[index];
    const [previousX, previousY] = ring[previous];
    if (
      y > point[1] !== previousY > point[1] &&
      point[0] < ((previousX - x) * (point[1] - y)) / (previousY - y) + x
    ) {
      inside = !inside;
    }
  }
  return inside;
}

/** Dentro del contorno y fuera de sus huecos. Acepta polígonos sueltos y múltiples. */
export function isPointInArea(point: Position, geometry: AreaGeometry): boolean {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  return polygons.some(
    (polygon) =>
      isPointInRing(point, polygon[0]) &&
      !polygon.slice(1).some((hole) => isPointInRing(point, hole)),
  );
}

/** Caja que encierra la geometría, para encuadrar el mapa sobre una zona. */
export function boundingBox(geometry: AreaGeometry): BoundingBox {
  let west = Number.POSITIVE_INFINITY;
  let south = Number.POSITIVE_INFINITY;
  let east = Number.NEGATIVE_INFINITY;
  let north = Number.NEGATIVE_INFINITY;

  const visit = (coordinates: unknown): void => {
    if (!Array.isArray(coordinates)) return;
    if (
      coordinates.length >= 2 &&
      typeof coordinates[0] === 'number' &&
      typeof coordinates[1] === 'number'
    ) {
      west = Math.min(west, coordinates[0]);
      east = Math.max(east, coordinates[0]);
      south = Math.min(south, coordinates[1]);
      north = Math.max(north, coordinates[1]);
      return;
    }
    coordinates.forEach(visit);
  };

  visit(geometry.coordinates);
  return { west, south, east, north };
}
