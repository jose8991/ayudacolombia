const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Mostrar solo la hora ("5:40") hace que un dato de hace tres días parezca reciente.
 * En emergencia el tiempo transcurrido es la información, no la hora del reloj.
 */
export function formatFreshness(isoDate: string, now: number = Date.now()): string {
  const elapsed = now - new Date(isoDate).getTime();
  if (!Number.isFinite(elapsed) || elapsed < 0) return 'hace un momento';
  if (elapsed < 2 * MINUTE) return 'hace un momento';
  if (elapsed < HOUR) return `hace ${Math.round(elapsed / MINUTE)} min`;
  if (elapsed < DAY) {
    const hours = Math.round(elapsed / HOUR);
    return `hace ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
  }
  const days = Math.round(elapsed / DAY);
  return `hace ${days} ${days === 1 ? 'día' : 'días'}`;
}
