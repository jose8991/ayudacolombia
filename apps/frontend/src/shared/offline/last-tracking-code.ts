const STORAGE_KEY = 'sos.last-tracking-code';

export interface SavedTrackingCode {
  code: string;
  kind: 'need' | 'report';
}

/**
 * El código de seguimiento es el único comprobante de quien envía algo sin cuenta.
 * Se guarda en el dispositivo para que cerrar la pestaña no signifique perderlo.
 */
export function saveTrackingCode(code: string, kind: 'need' | 'report'): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ code, kind }));
  } catch {
    // Almacenamiento no disponible: el código sigue visible en pantalla.
  }
}

export function loadTrackingCode(): SavedTrackingCode | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as Partial<SavedTrackingCode>;
    if (typeof parsed.code !== 'string') return null;
    return { code: parsed.code, kind: parsed.kind === 'need' ? 'need' : 'report' };
  } catch {
    return null;
  }
}
