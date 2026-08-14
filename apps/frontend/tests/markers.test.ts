import { expect, it } from 'vitest';
import type { HumanitarianMapPoint } from '../src/entities/incident';
import {
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
  expect(trustLevelOf(base)).toBe('official');
  expect(trustLevelOf({ ...base, verificationStatus: 'verified' })).toBe('verified');
  expect(trustLevelOf({ ...base, verificationStatus: 'reported' })).toBe('reported');
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

  expect(abierto).toBe('sos-aid-center-official-new-free');
  expect(lleno).toBe('sos-aid-center-official-old-blocked');
  expect(abierto).not.toBe(lleno);
});

it('un rumor y un dato oficial de la misma categoría usan marcadores distintos', () => {
  expect(markerIconName({ ...base, verificationStatus: 'reported' })).not.toBe(
    markerIconName(base),
  );
});
