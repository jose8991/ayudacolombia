import type { HumanitarianMapPoint } from '../../entities/incident';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1';

interface PublicCenter {
  id: string;
  name: string;
  address: string;
  latitude: string;
  longitude: string;
  status: 'open' | 'almost_full' | 'do_not_send' | 'closed';
  schedule?: string;
  accepted_items: string[];
  verification_status: 'reported' | 'verified' | 'official' | 'stale' | 'closed';
  updated_at: string;
}

interface CenterPublication {
  title: string;
  message: string;
  needed_items: string[];
  priority: 'normal' | 'high' | 'urgent';
  published_at: string;
}

export async function loadPublicCenterPoints(
  regionId: string,
  includeCommunity = false,
): Promise<HumanitarianMapPoint[]> {
  const params = new URLSearchParams({ territory_id: regionId });
  if (includeCommunity) params.set('include_community', 'true');
  const response = await fetch(`${API_URL}/centers?${params.toString()}`);
  if (!response.ok) throw new Error('No fue posible consultar los centros');
  const centers = (await response.json()) as PublicCenter[];
  return Promise.all(
    centers.map(async (center) => {
      const publicationsResponse = await fetch(`${API_URL}/centers/${center.id}/publications`);
      const publications = publicationsResponse.ok
        ? ((await publicationsResponse.json()) as CenterPublication[])
        : [];
      const latest = publications[0];
      const statusText =
        center.status === 'open'
          ? 'Abierto para recibir ayudas.'
          : center.status === 'almost_full'
            ? 'Capacidad casi completa; revise antes de ir.'
            : center.status === 'do_not_send'
              ? 'No enviar más donaciones por ahora.'
              : 'Centro cerrado por ahora.';
      return {
        id: `center-${center.id}`,
        regionId,
        category: 'aid-center' as const,
        title: center.name,
        neighborhood: center.name,
        description: latest ? latest.message : statusText,
        severity:
          latest?.priority === 'urgent'
            ? ('critical' as const)
            : latest?.priority === 'high'
              ? ('high' as const)
              : ('low' as const),
        verificationStatus: center.verification_status,
        observedAt: latest?.published_at ?? center.updated_at,
        coordinates: [Number(center.longitude), Number(center.latitude)] as const,
        address: center.address,
        schedule: center.schedule,
        acceptedItems: latest?.needed_items.length ? latest.needed_items : center.accepted_items,
        sourceLabel: `Centro registrado: ${center.name}`,
      };
    }),
  );
}
