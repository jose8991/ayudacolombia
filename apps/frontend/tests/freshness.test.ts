import { expect, it } from 'vitest';
import { formatFreshness } from '../src/shared/format/freshness';

const now = new Date('2026-08-14T12:00:00-05:00').getTime();
const ago = (milliseconds: number) => new Date(now - milliseconds).toISOString();

it('dice el tiempo transcurrido en lenguaje corriente', () => {
  expect(formatFreshness(ago(30_000), now)).toBe('hace un momento');
  expect(formatFreshness(ago(25 * 60_000), now)).toBe('hace 25 min');
  expect(formatFreshness(ago(60 * 60_000), now)).toBe('hace 1 hora');
  expect(formatFreshness(ago(5 * 60 * 60_000), now)).toBe('hace 5 horas');
  expect(formatFreshness(ago(26 * 60 * 60_000), now)).toBe('hace 1 día');
  expect(formatFreshness(ago(4 * 24 * 60 * 60_000), now)).toBe('hace 4 días');
});

it('no muestra tiempos negativos si el reloj del dispositivo va atrasado', () => {
  expect(formatFreshness(ago(-60 * 60_000), now)).toBe('hace un momento');
});
