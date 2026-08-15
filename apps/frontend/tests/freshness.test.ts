import { expect, it } from 'vitest';
import { formatFreshness } from '@timeliber/kit';

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

it('traduce la vigencia elegida a una fecha concreta', async () => {
  const { VALIDITY_OPTIONS, expiresAt } = await import('@timeliber/kit');

  expect(VALIDITY_OPTIONS[0].label).toBe('Un día');
  expect(expiresAt('24', now)).toBe(new Date(now + 24 * 3_600_000).toISOString());
  expect(expiresAt('168', now)).toBe(new Date(now + 168 * 3_600_000).toISOString());
});

it('ante un valor inservible deja la publicación vigente un día, no para siempre', async () => {
  const { expiresAt } = await import('@timeliber/kit');

  expect(expiresAt('', now)).toBe(new Date(now + 24 * 3_600_000).toISOString());
  expect(expiresAt('-5', now)).toBe(new Date(now + 24 * 3_600_000).toISOString());
});
