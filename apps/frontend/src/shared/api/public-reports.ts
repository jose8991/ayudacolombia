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
  return reports
    .filter((report) => report.coordinates !== null)
    .map((report) => ({
      id: 'report-' + report.id,
      regionId: report.territory_id,
      category: mapCategory(report.category),
      title: report.title,
      neighborhood: report.neighborhood || 'Ubicación aproximada',
      description: report.description,
      severity: report.severity,
      verificationStatus: report.verification_status,
      observedAt: report.observed_at,
      coordinates: [report.coordinates!.longitude, report.coordinates!.latitude],
    }));
}
