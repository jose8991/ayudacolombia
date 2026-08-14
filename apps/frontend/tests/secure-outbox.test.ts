import { afterEach, beforeEach, expect, it } from 'vitest';
import {
  clearPendingSubmission,
  loadPendingSubmission,
  savePendingSubmission,
} from '../src/shared/offline/secure-submission-outbox';

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

afterEach(() => {
  clearPendingSubmission();
  sessionStorage.clear();
});

it('cifra una solicitud pendiente y puede recuperarla en la misma sesión', async () => {
  const submission = {
    kind: 'need' as const,
    idempotencyKey: 'offline-submission-key-0001',
    payload: { contact: '3001234567', description: 'Necesitamos agua' },
  };

  await savePendingSubmission(submission);

  const stored = localStorage.getItem(localStorage.key(0) ?? '') ?? '';
  expect(stored).not.toContain('3001234567');
  expect(stored).not.toContain('Necesitamos agua');
  expect(await loadPendingSubmission()).toEqual(submission);
});

it('elimina una cola que no puede descifrarse', async () => {
  await savePendingSubmission({
    kind: 'report',
    idempotencyKey: 'offline-submission-key-0002',
    payload: { description: 'Vía cerrada' },
  });
  sessionStorage.clear();

  expect(await loadPendingSubmission()).toBeNull();
  expect(localStorage.length).toBe(0);
});
