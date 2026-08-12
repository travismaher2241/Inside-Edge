// HMAC Token Derivation & Hashing Module for Inside Edge
// Public tokens are derived via HMAC-SHA256 and base64url encoded.
// Database stores tokenHash = SHA256(publicToken).

const DEFAULT_HMAC_SECRET = 'inside-edge-rsvp-hmac-secret-v1-key-2026';

function stringToUint8Array(str: string): Uint8Array<ArrayBuffer> {
  return new Uint8Array(new TextEncoder().encode(str));
}

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Deterministically derives a 128-bit+ URL-safe public RSVP token using HMAC-SHA256.
 */
export async function derivePublicToken(
  sessionId: string,
  playerId: string,
  tokenVersion: number = 1,
  secret: string = DEFAULT_HMAC_SECRET
): Promise<string> {
  const payloadStr = `${sessionId}:${playerId}:${tokenVersion}`;
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const key = await crypto.subtle.importKey(
      'raw',
      stringToUint8Array(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', key, stringToUint8Array(payloadStr));
    return bufferToBase64Url(signature);
  }
  // Fallback simple hash string if Web Crypto API is unavailable
  let hash = 0;
  for (let i = 0; i < payloadStr.length; i++) {
    hash = (hash << 5) - hash + payloadStr.charCodeAt(i);
    hash |= 0;
  }
  return `rsvp-${Math.abs(hash).toString(36)}-v${tokenVersion}`;
}

/**
 * Computes SHA-256 hash of a public token for database lookup.
 */
export async function computeTokenHash(publicToken: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const buffer = await crypto.subtle.digest('SHA-256', stringToUint8Array(publicToken));
    return bufferToHex(buffer);
  }
  // Fallback sync hash string
  let h = 0;
  for (let i = 0; i < publicToken.length; i++) {
    h = (h << 5) - h + publicToken.charCodeAt(i);
    h |= 0;
  }
  return `hash-${Math.abs(h).toString(36)}`;
}
