/** Opciones de vigencia de una publicación, en el orden en que se ofrecen. */
export const VALIDITY_OPTIONS = [
  { value: '24', label: 'Un día' },
  { value: '72', label: 'Tres días' },
  { value: '168', label: 'Una semana' },
] as const;

/**
 * Una publicación sin fecha de vencimiento se vuelve mentira con el tiempo. Aquí se
 * traduce la elección de quien publica a una fecha concreta.
 */
export function expiresAt(hours: string, now: number = Date.now()): string {
  const parsed = Number(hours);
  const safeHours = Number.isFinite(parsed) && parsed > 0 ? parsed : 24;
  return new Date(now + safeHours * 3_600_000).toISOString();
}
