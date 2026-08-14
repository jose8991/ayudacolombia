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
  coordinates: readonly [number, number];
  address?: string;
  schedule?: string;
  acceptedItems?: readonly string[];
  sourceLabel?: string;
  sourceUrl?: string;
}
