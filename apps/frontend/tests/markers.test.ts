import { expect, it } from 'vitest';
import type { HumanitarianMapPoint } from '../src/entities/incident';
import {
  CATEGORY_COLORS,
  describeCluster,
  isAged,
  isBlocked,
  markerIconName,
  trustLevelOf,
} from '../src/widgets/emergency-map/markers';

const base: HumanitarianMapPoint = {
  id: 'center-1',
  regionId: 'co-ris-pereira',
  category: 'aid-center',
  title: 'Albergue Parque Olaya Herrera',
  neighborhood: 'Centro',
  description: 'Alojamiento temporal',
  severity: 'low',
  verificationStatus: 'official',
  observedAt: '2026-08-14T09:00:00-05:00',
  coordinates: [-75.696283, 4.809428],
};

it('distingue los tres niveles de confianza', () => {
  expect(trustLevelOf(base)).toBe('high');
  expect(trustLevelOf({ ...base, verificationStatus: 'verified' })).toBe('medium');
  expect(trustLevelOf({ ...base, verificationStatus: 'reported' })).toBe('low');
});

it('marca como envejecido lo que el servidor reporta viejo', () => {
  expect(isAged(base)).toBe(false);
  expect(isAged({ ...base, isStale: true })).toBe(true);
  expect(isAged({ ...base, verificationStatus: 'stale' })).toBe(true);
});

it('marca los lugares que ya no reciben gente', () => {
  expect(isBlocked({ ...base, status: 'open' })).toBe(false);
  expect(isBlocked({ ...base, status: 'almost_full' })).toBe(true);
  expect(isBlocked({ ...base, status: 'do_not_send' })).toBe(true);
  expect(isBlocked({ ...base, status: 'closed' })).toBe(true);
});

it('el Coliseo Mayor lleno no se dibuja igual que un albergue abierto', () => {
  const abierto = markerIconName({ ...base, status: 'open' });
  const lleno = markerIconName({ ...base, status: 'almost_full', isStale: true });

  expect(abierto).toBe('marker-aid-center-high-new-free');
  expect(lleno).toBe('marker-aid-center-high-old-blocked');
  expect(abierto).not.toBe(lleno);
});

it('un rumor y un dato oficial de la misma categoría usan marcadores distintos', () => {
  expect(markerIconName({ ...base, verificationStatus: 'reported' })).not.toBe(
    markerIconName(base),
  );
});

it('un grupo dice cuántos son y de qué tipo', () => {
  const resumen = describeCluster({ point_count: 12, centers: 5, needs: 4, offers: 0, damages: 3 });

  expect(resumen.count).toBe(12);
  expect(resumen.label).toBe('Grupo de 12 puntos: 5 albergues, 4 necesidades, 3 daños');
  expect(resumen.gradient).toContain('conic-gradient');
  expect(resumen.gradient).not.toContain(CATEGORY_COLORS.offer);
  expect(resumen.gradient).toContain(CATEGORY_COLORS['aid-center']);
});

it('usa el singular cuando hay uno solo', () => {
  const resumen = describeCluster({ point_count: 2, centers: 1, needs: 1, offers: 0, damages: 0 });

  expect(resumen.label).toBe('Grupo de 2 puntos: 1 albergue, 1 necesidad');
});

it('no se rompe si el grupo llega sin desglose', () => {
  const resumen = describeCluster({ point_count: 4 });

  expect(resumen.label).toBe('Grupo de 4 puntos');
  expect(resumen.gradient).toContain('conic-gradient');
});
