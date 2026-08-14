import type { HumanitarianRegion } from '../../entities/incident';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1';

interface PublicTerritory {
  id: string;
  name: string;
  kind: string;
  parent_id: string | null;
  center_latitude: number | null;
  center_longitude: number | null;
  default_zoom: number | null;
  open_centers: number;
  active_needs: number;
  has_activity: boolean;
}

export interface PublicRegion extends HumanitarianRegion {
  openCenters: number;
  activeNeeds: number;
  hasActivity: boolean;
}

export async function loadPublicRegions(): Promise<PublicRegion[]> {
  const response = await fetch(`${API_URL}/territories/tree`);
  if (!response.ok) throw new Error('No fue posible cargar las regiones');
  const territories = (await response.json()) as PublicTerritory[];
  const byId = new Map(territories.map((territory) => [territory.id, territory]));
  return territories
    .filter(
      (territory) =>
        territory.kind === 'municipality' &&
        territory.center_latitude !== null &&
        territory.center_longitude !== null,
    )
    .map((territory) => ({
      id: territory.id,
      name: territory.name,
      department: territory.parent_id
        ? (byId.get(territory.parent_id)?.name ?? 'Colombia')
        : 'Colombia',
      center: [territory.center_longitude!, territory.center_latitude!] as const,
      zoom: territory.default_zoom ?? 12,
      openCenters: territory.open_centers,
      activeNeeds: territory.active_needs,
      hasActivity: territory.has_activity,
    }))
    .sort(
      (first, second) =>
        Number(second.hasActivity) - Number(first.hasActivity) ||
        first.name.localeCompare(second.name, 'es'),
    );
}
