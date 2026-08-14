const OUTBOX_KEY = 'ayuda-colombia:pending-submission';
const SESSION_KEY = 'ayuda-colombia:outbox-key';

export interface PendingSubmission {
  kind: 'need' | 'report';
  payload: unknown;
  idempotencyKey: string;
}

interface EncryptedRecord {
  ciphertext: string;
  iv: string;
  savedAt: string;
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

function asArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return Uint8Array.from(bytes).buffer;
}

async function sessionKey(): Promise<CryptoKey> {
  const stored = sessionStorage.getItem(SESSION_KEY);
  if (stored) {
    return crypto.subtle.importKey('raw', asArrayBuffer(fromBase64(stored)), 'AES-GCM', false, [
      'encrypt',
      'decrypt',
    ]);
  }
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
    'encrypt',
    'decrypt',
  ]);
  const raw = new Uint8Array(await crypto.subtle.exportKey('raw', key));
  sessionStorage.setItem(SESSION_KEY, toBase64(raw));
  return key;
}

export async function savePendingSubmission(submission: PendingSubmission): Promise<void> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(submission));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    await sessionKey(),
    plaintext,
  );
  const record: EncryptedRecord = {
    ciphertext: toBase64(new Uint8Array(ciphertext)),
    iv: toBase64(iv),
    savedAt: new Date().toISOString(),
  };
  localStorage.setItem(OUTBOX_KEY, JSON.stringify(record));
}

export async function loadPendingSubmission(): Promise<PendingSubmission | null> {
  const serialized = localStorage.getItem(OUTBOX_KEY);
  if (!serialized) return null;
  try {
    const record = JSON.parse(serialized) as EncryptedRecord;
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: asArrayBuffer(fromBase64(record.iv)) },
      await sessionKey(),
      asArrayBuffer(fromBase64(record.ciphertext)),
    );
    return JSON.parse(new TextDecoder().decode(plaintext)) as PendingSubmission;
  } catch {
    clearPendingSubmission();
    return null;
  }
}

export function clearPendingSubmission(): void {
  localStorage.removeItem(OUTBOX_KEY);
}
