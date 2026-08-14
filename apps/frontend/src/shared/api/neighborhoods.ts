export interface NeighborhoodRecord {
  codigo_de_la_comuna: string;
  comuna: string;
  codigo_del_barrio: string;
  nombre: string;
  nombre_popular?: string;
}

interface DosquebradasNeighborhoodRecord {
  nombre_comuna: string;
  id_barrio: string;
  nombre_barrio: string;
}

const REGIONS_WITH_LOCAL_BOUNDARIES = new Set(['co-ris-pereira', 'co-ris-dosquebradas']);

const PEREIRA_RURAL_LOCALITIES: NeighborhoodRecord[] = [
  ['Belmonte Bajo', '1'],
  ['Cerritos', '2'],
  ['Esperanza Galicia', '3'],
  ['Estación Villegas', '4'],
  ['Galicia Alta', '5'],
  ['Quimbayita', '6'],
].map(([nombre, codigo]) => ({
  codigo_de_la_comuna: 'rural-cerritos',
  comuna: 'rural:Cerritos',
  codigo_del_barrio: codigo,
  nombre,
}));

export function hasLocalBoundaries(regionId: string): boolean {
  return REGIONS_WITH_LOCAL_BOUNDARIES.has(regionId);
}

export function formatAreaLabel(area: string): string {
  return area.startsWith('rural:') ? `Corregimiento ${area.slice(6)}` : `Comuna ${area}`;
}

export async function loadNeighborhoods(regionId: string): Promise<NeighborhoodRecord[]> {
  if (!hasLocalBoundaries(regionId)) return [];
  const path =
    regionId === 'co-ris-dosquebradas'
      ? '/data/dosquebradas-barrios-catalog.json'
      : '/data/pereira-barrios-catalog.json';
  const response = await fetch(path);
  if (!response.ok) throw new Error('No fue posible cargar los barrios');
  const data = (await response.json()) as NeighborhoodRecord[] | DosquebradasNeighborhoodRecord[];
  if (regionId === 'co-ris-dosquebradas') {
    return (data as DosquebradasNeighborhoodRecord[]).map((item) => ({
      codigo_de_la_comuna: item.nombre_comuna.replace(/\D/g, ''),
      comuna: item.nombre_comuna.replace(/^COMUNA\s*/i, ''),
      codigo_del_barrio: item.id_barrio,
      nombre: item.nombre_barrio,
      nombre_popular: item.nombre_barrio,
    }));
  }
  return [...(data as NeighborhoodRecord[]), ...PEREIRA_RURAL_LOCALITIES];
}
