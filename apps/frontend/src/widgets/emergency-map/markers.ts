import {
  buildMarkerImages as buildImages,
  markerIconName as iconName,
  type MarkerImage,
  type MarkerPalette,
  type TrustLevel,
} from '@timeliber/kit';
import type { HumanitarianMapPoint, MapCategory } from '../../entities/incident';

export { MARKER_PIXEL_RATIO, MARKER_SIZE } from '@timeliber/kit';
export type { MarkerImage };

/**
 * La saturación marca la jerarquía: dos colores fuertes para las dos preguntas que la
 * gente trae —dónde HAY ayuda y dónde la NECESITAN— y dos apagados para el contexto.
 *
 * Si cambian aquí, hay que cambiarlos también en `:root` de styles.css.
 */
const INK = '#17332a';

export const CATEGORY_COLORS: Record<MapCategory, string> = {
  'aid-center': '#168267',
  need: '#c4392d',
  offer: '#5d7f96',
  damage: '#8a7250',
};

const PALETTE: MarkerPalette = {
  'aid-center': { color: CATEGORY_COLORS['aid-center'], glyph: 'casa' },
  need: { color: CATEGORY_COLORS.need, glyph: 'persona' },
  offer: { color: CATEGORY_COLORS.offer, glyph: 'corazon' },
  damage: { color: CATEGORY_COLORS.damage, glyph: 'alerta' },
};

export function trustLevelOf(point: HumanitarianMapPoint): TrustLevel {
  if (point.verificationStatus === 'official') return 'high';
  if (point.verificationStatus === 'verified') return 'medium';
  return 'low';
}

export function isAged(point: HumanitarianMapPoint): boolean {
  return point.isStale === true || point.verificationStatus === 'stale';
}

/** Un lugar que ya no recibe gente: lleno, cerrado o pidiendo que no envíen más. */
export function isBlocked(point: HumanitarianMapPoint): boolean {
  return (
    point.status === 'almost_full' || point.status === 'do_not_send' || point.status === 'closed'
  );
}

export function markerIconName(point: HumanitarianMapPoint): string {
  return iconName({
    category: point.category,
    trust: trustLevelOf(point),
    aged: isAged(point),
    blocked: isBlocked(point),
  });
}

export function buildMarkerImages(): MarkerImage[] {
  return buildImages(PALETTE);
}

export interface ClusterSummary {
  count: number;
  /** Nombre accesible: dice cuántos son y de qué tipo. */
  label: string;
  /** Anillo proporcional por categoría, para saber de qué es el grupo sin abrirlo. */
  gradient: string;
}

const CLUSTER_PARTS: readonly { property: string; singular: string; plural: string }[] = [
  { property: 'centers', singular: 'albergue', plural: 'albergues' },
  { property: 'needs', singular: 'necesidad', plural: 'necesidades' },
  { property: 'offers', singular: 'ayuda ofrecida', plural: 'ayudas ofrecidas' },
  { property: 'damages', singular: 'daño', plural: 'daños' },
];

const CLUSTER_COLORS: Record<string, string> = {
  centers: CATEGORY_COLORS['aid-center'],
  needs: CATEGORY_COLORS.need,
  offers: CATEGORY_COLORS.offer,
  damages: CATEGORY_COLORS.damage,
};

/**
 * Un círculo con "12" no dice si son doce albergues o doce derrumbes. El anillo reparte
 * el borde por categoría y el nombre accesible lo dice con palabras.
 */
export function describeCluster(properties: Record<string, unknown>): ClusterSummary {
  const amounts = CLUSTER_PARTS.map((part) => ({
    ...part,
    amount: Number(properties[part.property] ?? 0),
  }));
  const total = amounts.reduce((sum, item) => sum + item.amount, 0);
  const count = Number(properties.point_count ?? total);

  const described = amounts
    .filter((item) => item.amount > 0)
    .map((item) => `${item.amount} ${item.amount === 1 ? item.singular : item.plural}`);
  const label = described.length
    ? `Grupo de ${count} puntos: ${described.join(', ')}`
    : `Grupo de ${count} puntos`;

  if (total === 0) return { count, label, gradient: `conic-gradient(${INK} 0turn 1turn)` };

  let cursor = 0;
  const stops = amounts
    .filter((item) => item.amount > 0)
    .map((item) => {
      const start = cursor;
      cursor += item.amount / total;
      return `${CLUSTER_COLORS[item.property]} ${start}turn ${cursor}turn`;
    });
  return { count, label, gradient: `conic-gradient(${stops.join(', ')})` };
}
