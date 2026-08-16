const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1';

export interface SessionActor {
  display_name: string;
  roles: string[];
  organization_id: string | null;
  territory_ids: string[];
}
export interface Session {
  access_token: string;
  actor: SessionActor;
}
export interface ManagedCenter {
  id: string;
  name: string;
  address: string;
  status: string;
}
export interface CenterInput {
  organization_id: string;
  territory_id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  status: 'open' | 'almost_full' | 'do_not_send' | 'closed';
  schedule: string | null;
  accepted_items: string[];
}
export interface PublicationInput {
  title: string;
  message: string;
  needed_items: string[];
  sufficient_items: string[];
  priority: 'normal' | 'high' | 'urgent';
  expires_at: string;
}
export interface PendingReport {
  id: string;
  tracking_code: string;
  territory_id: string;
  category: string;
  title: string;
  description: string;
  neighborhood_code: string | null;
  severity: string;
  observed_at: string;
  /** Privado: solo llega a quien tiene permiso de lectura sensible. */
  contact: string | null;
  contacted_at: string | null;
  coordinates: { latitude: number; longitude: number } | null;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, init);
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(body?.detail ?? 'No fue posible completar la solicitud');
  }
  return response.json() as Promise<T>;
}

export function login(email: string, password: string): Promise<Session> {
  return request('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
}

export function createCenter(token: string, input: CenterInput): Promise<ManagedCenter> {
  return request('/centers', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export function updateCenter(
  token: string,
  centerId: string,
  changes: Partial<
    Pick<CenterInput, 'name' | 'address' | 'status' | 'schedule' | 'accepted_items'>
  >,
): Promise<ManagedCenter> {
  return request(`/centers/${centerId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(changes),
  });
}

export function loadManagedCenters(token: string): Promise<ManagedCenter[]> {
  return request('/centers/mine', { headers: { Authorization: `Bearer ${token}` } });
}

export function publishCenterUpdate(
  token: string,
  centerId: string,
  input: PublicationInput,
): Promise<{ id: string }> {
  return request(`/centers/${centerId}/publications`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export function markReportContacted(token: string, reportId: string): Promise<PendingReport> {
  return request(`/reports/moderation/${reportId}/contacted`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function promoteReportToCenter(token: string, reportId: string): Promise<ManagedCenter> {
  return request(`/reports/moderation/${reportId}/promote`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function loadPendingReports(token: string): Promise<PendingReport[]> {
  return request('/reports/moderation/pending', { headers: { Authorization: 'Bearer ' + token } });
}

export function moderateReport(
  token: string,
  reportId: string,
  verificationStatus: 'verified' | 'rejected',
  note?: string,
): Promise<{ verification_status: string }> {
  return request('/reports/moderation/' + reportId, {
    method: 'PATCH',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      verification_status: verificationStatus,
      moderation_note: note || null,
    }),
  });
}

export function inviteCenterOperator(
  token: string,
  input: { email: string; display_name: string; center_id: string },
): Promise<{ token: string; expires_in: number }> {
  return request('/auth/invitations/center-operator', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export function acceptInvitation(token: string, password: string): Promise<Session> {
  return request('/auth/invitations/accept', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token,
      password,
      privacy_authorized: true,
      privacy_policy_version: '2026-08-13',
    }),
  });
}
