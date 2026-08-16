import type { HumanitarianMapPoint, MapCategory } from '../../entities/incident';

interface PublicReport {
  id: string;
  territory_id: string;
  category: 'need' | 'offer' | 'shelter' | 'aid-center' | 'damage';
  title: string;
  description: string;
  neighborhood: string | null;
  severity: HumanitarianMapPoint['severity'];
  coordinates: { longitude: number; latitude: number } | null;
  observed_at: string;
  verification_status: 'reported' | 'verified' | 'official';
  is_stale?: boolean;
  attended_at?: string | null;
  en_route_since?: string | null;
}

const mapCategory = (category: PublicReport['category']): MapCategory =>
  category === 'shelter' ? 'aid-center' : category;

export async function loadPublicReportPoints(
  territoryId: string,
  onlyConfirmed = false,
): Promise<HumanitarianMapPoint[]> {
  const params = new URLSearchParams({ territory_id: territoryId });
  if (onlyConfirmed) params.set('only_confirmed', 'true');
  const response = await fetch('/api/v1/reports/public?' + params.toString());
  if (!response.ok) throw new Error('No fue posible cargar la información verificada');
  const reports = (await response.json()) as PublicReport[];
  return reports.map((report) => ({
    id: 'report-' + report.id,
    regionId: report.territory_id,
    category: mapCategory(report.category),
    title: report.title,
    neighborhood: report.neighborhood || 'Ubicación aproximada',
    description: report.description,
    severity: report.severity,
    verificationStatus: report.verification_status,
    isStale: report.is_stale ?? false,
    observedAt: report.observed_at,
    coordinates: report.coordinates
      ? ([report.coordinates.longitude, report.coordinates.latitude] as const)
      : null,
  }));
}

export interface DeliveryStop {
  id: string;
  title: string;
  description: string;
  neighborhood: string | null;
  severity: HumanitarianMapPoint['severity'];
  coordinates: { longitude: number; latitude: number } | null;
  attendedAt: string | null;
  /** Sólo viene si el aviso sigue vigente; el backend descarta los vencidos. */
  enRouteSince: string | null;
}

/**
 * Los sitios que pidieron ayuda en un municipio, para armar un recorrido de entrega.
 *
 * Primero los que no ha visitado nadie: es exactamente el dato que falta cuando tres
 * grupos suben a la misma vereda el mismo día y a otra no llega ninguno.
 */
/** Pendiente primero, luego lo que ya tiene un grupo en camino, y al final lo entregado. */
const orden = (stop: DeliveryStop): number => (stop.attendedAt ? 2 : stop.enRouteSince ? 1 : 0);

export async function loadDeliveryStops(territoryId: string): Promise<DeliveryStop[]> {
  const response = await fetch(
    '/api/v1/reports/public?' + new URLSearchParams({ territory_id: territoryId }).toString(),
  );
  if (!response.ok) throw new Error('No fue posible cargar los sitios');
  const reports = (await response.json()) as PublicReport[];
  return reports
    .filter((report) => report.category === 'need')
    .map((report) => ({
      id: report.id,
      title: report.title,
      description: report.description,
      neighborhood: report.neighborhood,
      severity: report.severity,
      coordinates: report.coordinates,
      attendedAt: report.attended_at ?? null,
      enRouteSince: report.en_route_since ?? null,
    }))
    .sort((a, b) => orden(a) - orden(b));
}
