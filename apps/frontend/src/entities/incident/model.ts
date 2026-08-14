export type Severity = 'low' | 'medium' | 'high' | 'critical';
export type VerificationStatus = 'reported' | 'verified' | 'official' | 'stale' | 'closed';
export type MapCategory = 'need' | 'offer' | 'aid-center' | 'damage';

export interface HumanitarianRegion {
  id: string;
  name: string;
  department: string;
  center: readonly [number, number];
  zoom: number;
  openCenters?: number;
  activeNeeds?: number;
  hasActivity?: boolean;
}

export interface HumanitarianMapPoint {
  id: string;
  regionId: string;
  category: MapCategory;
  title: string;
  neighborhood: string;
  description: string;
  severity: Severity;
  verificationStatus: VerificationStatus;
  observedAt: string;
  /** Nulo cuando quien reportó no compartió GPS: se ubica por barrio y no se dibuja en el mapa. */
  coordinates: readonly [number, number] | null;
  address?: string;
  schedule?: string;
  acceptedItems?: readonly string[];
  /** De qué ya tienen suficiente: evita donaciones que estorban. */
  sufficientItems?: readonly string[];
  /** El servidor marca como envejecido lo que lleva más de un día sin reconfirmarse. */
  isStale?: boolean;
  /** Solo para centros: si ya no reciben gente, el mapa lo marca. */
  status?: 'open' | 'almost_full' | 'do_not_send' | 'closed';
  sourceLabel?: string;
  sourceUrl?: string;
}
