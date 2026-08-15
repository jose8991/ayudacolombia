import { createSecureOutbox } from '@timeliber/kit';

export interface PendingSubmission {
  kind: 'need' | 'report';
  payload: unknown;
  idempotencyKey: string;
}

const outbox = createSecureOutbox<PendingSubmission>('ayuda-colombia:outbox');

export const savePendingSubmission = outbox.save;
export const loadPendingSubmission = outbox.load;
export const clearPendingSubmission = outbox.clear;
