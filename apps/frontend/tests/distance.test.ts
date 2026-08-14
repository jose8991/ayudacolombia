import { expect, it } from 'vitest';
import { distanceInMeters, formatDistance } from '../src/shared/format/distance';

const PARQUE_OLAYA_HERRERA = [-75.696283, 4.809428] as const;
const ESTADIO_MORA_MORA = [-75.67088, 4.806989] as const;

it('mide la distancia real entre dos albergues de Pereira', () => {
  const meters = distanceInMeters(PARQUE_OLAYA_HERRERA, ESTADIO_MORA_MORA);

  // Poco menos de 3 km en línea recta entre el centro y el barrio Kennedy.
  expect(meters).toBeGreaterThan(2500);
  expect(meters).toBeLessThan(3000);
});

it('da cero para el mismo punto', () => {
  expect(distanceInMeters(PARQUE_OLAYA_HERRERA, PARQUE_OLAYA_HERRERA)).toBeCloseTo(0);
});

it('escribe la distancia como la diría una persona', () => {
  expect(formatDistance(120)).toBe('a 120 m');
  expect(formatDistance(347)).toBe('a 350 m');
  expect(formatDistance(1240)).toBe('a 1,2 km');
  expect(formatDistance(24800)).toBe('a 25 km');
});
