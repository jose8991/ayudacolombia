/**
 * Cola de un solo envío, cifrada en el dispositivo.
 *
 * Nace de una necesidad concreta: en zona de desastre la red va y viene, y perder lo que
 * alguien acaba de escribir es inaceptable. Guardarlo en claro tampoco sirve cuando lleva
 * un teléfono o una dirección.
 *
 * La clave se genera por sesión y vive en `sessionStorage`; el dato cifrado vive en
 * `localStorage`. Al cerrar el navegador la clave desaparece y lo pendiente deja de ser
 * legible —se descarta solo—, que es justo lo que se quiere de un dato sensible que ya
 * nadie va a enviar.
 */

interface EncryptedRecord {
  ciphertext: string;
  iv: string;
  savedAt: string;
}

export interface SecureOutbox<T> {
  save(value: T): Promise<void>;
  load(): Promise<T | null>;
  clear(): void;
}

const toBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
};

const fromBase64 = (value: string): Uint8Array =>
  Uint8Array.from(atob(value), (character) => character.charCodeAt(0));

const asArrayBuffer = (bytes: Uint8Array): ArrayBuffer => Uint8Array.from(bytes).buffer;

/**
 * @param namespace prefijo de las claves de almacenamiento; usa uno por aplicación para
 * que dos productos en el mismo dominio no se pisen.
 */
export function createSecureOutbox<T>(namespace: string): SecureOutbox<T> {
  const outboxKey = `${namespace}:pending`;
  const sessionKeyName = `${namespace}:key`;

  async function sessionKey(): Promise<CryptoKey> {
    const stored = sessionStorage.getItem(sessionKeyName);
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
    sessionStorage.setItem(sessionKeyName, toBase64(raw));
    return key;
  }

  function clear(): void {
    localStorage.removeItem(outboxKey);
  }

  return {
    clear,
    async save(value) {
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const plaintext = new TextEncoder().encode(JSON.stringify(value));
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
      localStorage.setItem(outboxKey, JSON.stringify(record));
    },
    async load() {
      const serialized = localStorage.getItem(outboxKey);
      if (!serialized) return null;
      try {
        const record = JSON.parse(serialized) as EncryptedRecord;
        const plaintext = await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv: asArrayBuffer(fromBase64(record.iv)) },
          await sessionKey(),
          asArrayBuffer(fromBase64(record.ciphertext)),
        );
        return JSON.parse(new TextDecoder().decode(plaintext)) as T;
      } catch {
        // Sin la clave de la sesión anterior el dato ya no sirve: se descarta.
        clear();
        return null;
      }
    },
  };
}
