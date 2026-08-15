import type { ReportKind } from './report-kind';

export const PRIVACY_POLICY_VERSION = '2026-08-13';

export interface Submission {
  kind: 'need' | 'report';
  payload: Record<string, unknown>;
  idempotencyKey: string;
}

/** Coordenadas del dispositivo, si la persona las compartió y el navegador las dio. */
export interface Coords {
  latitude: number;
  longitude: number;
}

const URGENCY: Record<string, string> = {
  critical: 'immediate_danger',
  low: 'soon',
};

/**
 * Traduce lo que se escribió en el formulario al contrato de la API.
 *
 * Una solicitud privada y un reporte público van a endpoints distintos y con formas
 * distintas: la primera guarda contacto y ubicación exacta fuera del mapa, el segundo
 * publica con nivel de verificación. Aquí está esa decisión, aislada y sin interfaz
 * alrededor, que es lo que permite probarla.
 */
export function buildSubmission(
  kind: ReportKind,
  draft: Record<string, string>,
  territoryId: string,
  coords: Coords | null,
  idempotencyKey: string,
): Submission {
  const privacy = {
    privacy_authorized: true,
    privacy_policy_version: PRIVACY_POLICY_VERSION,
  };

  if (kind === 'need') {
    return {
      kind: 'need',
      idempotencyKey,
      payload: {
        territory_id: territoryId,
        category: draft.needCategory,
        people_count: Number(draft.peopleCount),
        neighborhood: draft.neighborhood,
        latitude: coords?.latitude ?? null,
        longitude: coords?.longitude ?? null,
        urgency: URGENCY[draft.severity] ?? 'today',
        contact: draft.contact,
        description: draft.description,
        ...privacy,
      },
    };
  }

  return {
    kind: 'report',
    idempotencyKey,
    payload: {
      territory_id: territoryId,
      category: draft.category,
      title: draft.title,
      description: draft.description,
      neighborhood_code: draft.neighborhood || null,
      severity: draft.severity,
      contact: draft.contact || null,
      coordinates: coords ? { longitude: coords.longitude, latitude: coords.latitude } : null,
      observed_at: new Date().toISOString(),
      ...privacy,
    },
  };
}
