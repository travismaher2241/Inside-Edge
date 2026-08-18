// Opaque bearer tokens for delegated station links. The token contains no
// session or resource identifiers; only its SHA-256 hash is persisted.

function stringToUint8Array(value: string): Uint8Array<ArrayBuffer> {
  return new Uint8Array(new TextEncoder().encode(value));
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), byte => byte.toString(16).padStart(2, '0')).join('');
}

/** Creates an unguessable, URL-safe 256-bit station invitation token. */
export function generateStationToken(): string {
  if (typeof crypto === 'undefined' || !crypto.getRandomValues) {
    throw new Error('Secure station links require the Web Crypto API.');
  }
  return bytesToBase64Url(crypto.getRandomValues(new Uint8Array(32)));
}

/** Computes the lookup key stored by the app. The public token is never stored. */
export async function computeStationTokenHash(stationToken: string): Promise<string> {
  if (!stationToken || typeof crypto === 'undefined' || !crypto.subtle) {
    throw new Error('Secure station links require the Web Crypto API.');
  }
  return bufferToHex(await crypto.subtle.digest('SHA-256', stringToUint8Array(stationToken)));
}
