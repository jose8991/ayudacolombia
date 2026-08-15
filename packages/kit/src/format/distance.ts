const EARTH_RADIUS_METERS = 6_371_000;

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

/** Distancia sobre la superficie terrestre, en metros. */
export function distanceInMeters(
  from: readonly [number, number],
  to: readonly [number, number],
): number {
  const [fromLon, fromLat] = from;
  const [toLon, toLat] = to;
  const deltaLat = toRadians(toLat - fromLat);
  const deltaLon = toRadians(toLon - fromLon);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(fromLat)) * Math.cos(toRadians(toLat)) * Math.sin(deltaLon / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Se lee de un vistazo y sin decimales innecesarios: "a 350 m", "a 1,2 km". */
export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters)) return '';
  if (meters < 1000) return `a ${Math.round(meters / 10) * 10} m`;
  const kilometers = meters / 1000;
  if (kilometers < 10) return `a ${kilometers.toFixed(1).replace('.', ',')} km`;
  return `a ${Math.round(kilometers)} km`;
}
