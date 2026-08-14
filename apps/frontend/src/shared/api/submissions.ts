export interface SubmissionReceipt {
  tracking_code: string;
}

export interface SubmissionStatus {
  status?: string;
  verification_status?: string;
}

interface SubmitArgs {
  kind: 'need' | 'report';
  payload: unknown;
  idempotencyKey: string;
}

export async function submitPublicInformation({
  kind,
  payload,
  idempotencyKey,
}: SubmitArgs): Promise<SubmissionReceipt> {
  const response = await fetch(kind === 'need' ? '/api/v1/needs' : '/api/v1/reports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error('submission_failed');
  return response.json() as Promise<SubmissionReceipt>;
}

export async function loadSubmissionStatus(
  kind: 'need' | 'report',
  code: string,
): Promise<SubmissionStatus> {
  const path =
    kind === 'need'
      ? `/api/v1/needs/${encodeURIComponent(code)}`
      : `/api/v1/reports/${encodeURIComponent(code)}/status`;
  const response = await fetch(path);
  if (response.status === 404) throw new Error('not_found');
  if (!response.ok) throw new Error('status_failed');
  return response.json() as Promise<SubmissionStatus>;
}
