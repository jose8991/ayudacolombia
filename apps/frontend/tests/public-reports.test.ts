import { afterEach, expect, it, vi } from 'vitest';
import { loadPublicReportPoints } from '../src/shared/api/public-reports';

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubReports(reports: unknown[]) {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => reports });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const baseReport = {
  id: '5f0b2f1e-0000-4000-8000-000000000001',
  territory_id: 'co-ris-pereira',
  category: 'need' as const,
  title: 'Se necesita agua',
  description: 'Tres familias sin agua desde ayer.',
  neighborhood: 'Cuba',
  severity: 'high' as const,
  observed_at: '2026-08-14T09:00:00-05:00',
  verification_status: 'reported' as const,
};

it('conserva los reportes que no traen coordenadas', async () => {
  stubReports([
    { ...baseReport, coordinates: null },
    {
      ...baseReport,
      id: '5f0b2f1e-0000-4000-8000-000000000002',
      title: 'Vía cerrada',
      coordinates: { longitude: -75.69, latitude: 4.81 },
    },
  ]);

  const points = await loadPublicReportPoints('co-ris-pereira');

  expect(points).toHaveLength(2);
  expect(points[0].coordinates).toBeNull();
  expect(points[0].title).toBe('Se necesita agua');
  expect(points[1].coordinates).toEqual([-75.69, 4.81]);
});

it('pide solo lo confirmado cuando se solicita', async () => {
  const fetchMock = stubReports([]);

  await loadPublicReportPoints('co-ris-pereira', true);

  expect(String(fetchMock.mock.calls[0][0])).toContain('only_confirmed=true');
});
