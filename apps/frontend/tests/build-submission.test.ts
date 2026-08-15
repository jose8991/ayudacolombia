import { expect, it } from 'vitest';
import {
  PRIVACY_POLICY_VERSION,
  buildSubmission,
} from '../src/widgets/help-journey/build-submission';

const coords = { latitude: 4.8143, longitude: -75.6946 };

it('una solicitud privada va al canal privado y lleva contacto y ubicación exacta', () => {
  const submission = buildSubmission(
    'need',
    {
      needCategory: 'water',
      peopleCount: '4',
      neighborhood: 'Cuba',
      severity: 'critical',
      contact: '300 123 4567',
      description: 'Somos 4 y no tenemos agua',
    },
    'co-ris-pereira',
    coords,
    'clave-1',
  );

  expect(submission.kind).toBe('need');
  expect(submission.payload).toMatchObject({
    category: 'water',
    people_count: 4,
    neighborhood: 'Cuba',
    latitude: coords.latitude,
    longitude: coords.longitude,
    urgency: 'immediate_danger',
    contact: '300 123 4567',
    privacy_authorized: true,
    privacy_policy_version: PRIVACY_POLICY_VERSION,
  });
});

it('traduce la urgencia al vocabulario de la API, con "hoy" por defecto', () => {
  const urgencyOf = (severity: string) =>
    buildSubmission('need', { severity, peopleCount: '1' }, 'co-ris-pereira', null, 'k').payload
      .urgency;

  expect(urgencyOf('critical')).toBe('immediate_danger');
  expect(urgencyOf('low')).toBe('soon');
  expect(urgencyOf('medium')).toBe('today');
  expect(urgencyOf('')).toBe('today');
});

it('un aviso de necesidad ajena viaja como reporte público, no como solicitud privada', () => {
  const submission = buildSubmission(
    'community-need',
    {
      category: 'need',
      title: 'Necesitan agua',
      description: 'Son 20 familias sin agua',
      neighborhood: 'Vereda El Manzano',
      severity: 'medium',
      contact: '',
    },
    'co-ris-pereira',
    null,
    'clave-2',
  );

  expect(submission.kind).toBe('report');
  expect(submission.payload.category).toBe('need');
  expect(submission.payload.neighborhood_code).toBe('Vereda El Manzano');
  expect(submission.payload.contact).toBeNull();
  expect(submission.payload.coordinates).toBeNull();
});

it('sin ubicación compartida no inventa coordenadas', () => {
  const need = buildSubmission('need', { peopleCount: '1', severity: 'medium' }, 't', null, 'k');
  const report = buildSubmission('offer', { severity: 'medium' }, 't', null, 'k');

  expect(need.payload.latitude).toBeNull();
  expect(need.payload.longitude).toBeNull();
  expect(report.payload.coordinates).toBeNull();
});

it('conserva la clave de idempotencia que se le entrega', () => {
  expect(buildSubmission('offer', {}, 't', null, 'la-misma').idempotencyKey).toBe('la-misma');
});

it('nunca envía sin autorización de tratamiento de datos', () => {
  for (const kind of ['need', 'community-need', 'offer', 'place', 'damage'] as const) {
    const { payload } = buildSubmission(kind, { peopleCount: '1' }, 't', null, 'k');
    expect(payload.privacy_authorized, kind).toBe(true);
    expect(payload.privacy_policy_version, kind).toBe(PRIVACY_POLICY_VERSION);
  }
});
