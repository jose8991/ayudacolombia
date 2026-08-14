import { CircleAlert, HandHeart, TriangleAlert } from 'lucide-react';
import type { MapCategory } from '../../entities/incident';
const OPTIONS: readonly { value: MapCategory; label: string; icon: typeof CircleAlert }[] = [
  { value: 'need', label: 'Necesidades', icon: CircleAlert },
  { value: 'offer', label: 'Ayudas ofrecidas', icon: HandHeart },
  { value: 'aid-center', label: 'Centros de ayuda', icon: HandHeart },
  { value: 'damage', label: 'Daños y accesos', icon: TriangleAlert },
];
interface MapFiltersProps {
  value: ReadonlySet<MapCategory>;
  onToggle: (value: MapCategory) => void;
  counts: Record<MapCategory, number>;
}
export function MapFilters({ value, onToggle, counts }: MapFiltersProps) {
  return (
    <fieldset className="map-filters">
      <legend>Qué mostrar en el mapa</legend>
      {OPTIONS.map(({ value: optionValue, label, icon: Icon }) => (
        <button
          aria-pressed={value.has(optionValue)}
          className={'filter-pill filter-pill--' + optionValue}
          key={optionValue}
          onClick={() => onToggle(optionValue)}
          type="button"
        >
          <Icon aria-hidden="true" size={17} strokeWidth={2.3} />
          <span>{label}</span>
          <strong
            aria-label={
              counts[optionValue] > 0 ? String(counts[optionValue]) : 'Sin información publicada'
            }
          >
            {counts[optionValue] > 0 ? counts[optionValue] : '—'}
          </strong>
        </button>
      ))}
    </fieldset>
  );
}
