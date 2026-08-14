import { PhoneCall, Radio } from 'lucide-react';
import type { HumanitarianRegion } from '../../entities/incident';
import { TerritoryExplorer } from '../../features/territory-explorer';

interface AppHeaderProps {
  onOpenOverview: () => void;
  onSelectRegion: (regionId: string) => void;
  region: HumanitarianRegion;
  regions: HumanitarianRegion[];
}

export function AppHeader({ onOpenOverview, onSelectRegion, region, regions }: AppHeaderProps) {
  return (
    <header className="app-header">
      <span className="brand-mark" aria-hidden="true">
        <Radio size={20} />
      </span>
      <span>
        <strong>Ayuda Colombia</strong>
        <small>Ayuda cerca de ti</small>
      </span>
      <div className="region-picker">
        <TerritoryExplorer
          onOverview={onOpenOverview}
          onSelect={onSelectRegion}
          regions={regions}
          selected={region}
        />
      </div>
      <a aria-label="Llamar a emergencias, 123" className="emergency-call" href="tel:123">
        <PhoneCall aria-hidden="true" size={18} />
        <span aria-hidden="true" className="emergency-label-wide">
          Emergencias 123
        </span>
        <span aria-hidden="true" className="emergency-label-short">
          123
        </span>
      </a>
      <a aria-label="Administrar centro" className="coordina-link" href="/coordina">
        <span className="coordina-label-wide">Administrar centro</span>
        <span aria-hidden="true" className="coordina-label-short">
          Coordinar
        </span>
      </a>
      <span className="live-status">
        <i aria-hidden="true" /> Información pública
      </span>
    </header>
  );
}
