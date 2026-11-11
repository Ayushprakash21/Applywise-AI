// src/utils/tokenCrypto.ts
// Cross-runtime AES-256-GCM Token Encryption & HMAC CSRF State Utilities
// Works identically in Node.js (20+) and Cloudflare Workers using global WebCrypto API.

function getSubtle(): SubtleCrypto {
  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.subtle) {
    return globalThis.crypto.subtle;
  }
  throw new Error('WebCrypto API is unavailable in this runtime.');
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function getEffectiveSecret(explicitSecret?: string): string {
  const envSecret =
    explicitSecret ||
    (typeof process !== 'undefined' ? process.env?.EMAIL_ENCRYPTION_KEY || process.env?.SESSION_SECRET : undefined);
  if (envSecret && envSecret.trim().length >= 16) {
    return envSecret.trim();
  }
  // Safe deterministic fallback ONLY in non-production dev/test mode
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production') {
    throw new Error('EMAIL_ENCRYPTION_KEY or SESSION_SECRET must be configured in production for OAuth token protection.');
  }
  return 'applyvise-dev-oauth-token-key-do-not-use-in-prod-2026';
}

async function deriveAesKey(secret: string): Promise<CryptoKey> {
  const subtle = getSubtle();
  const encoded = new TextEncoder().encode(secret);
  const digest = await subtle.digest('SHA-256', encoded);
  return subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

async function deriveHmacKey(secret: string): Promise<CryptoKey> {
  const subtle = getSubtle();
  const encoded = new TextEncoder().encode(`hmac:${secret}`);
  const digest = await subtle.digest('SHA-256', encoded);
  return subtle.importKey('raw', digest, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

/**
 * Encrypts sensitive OAuth access/refresh tokens using AES-256-GCM with a unique 12-byte IV.
 */
export async function encryptSecretToken(plaintext: string, secret?: string): Promise<string> {
  if (!plaintext) return '';
  const subtle = getSubtle();
  const key = await deriveAesKey(getEffectiveSecret(secret));
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const cipherBuffer = await subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  const cipherBytes = new Uint8Array(cipherBuffer);
  return `v1:${bytesToBase64(iv)}:${bytesToBase64(cipherBytes)}`;
}

/**
 * Decrypts AES-256-GCM encrypted OAuth tokens.
 */
export async function decryptSecretToken(encryptedPayload: string, secret?: string): Promise<string> {
  if (!encryptedPayload) return '';
  const parts = encryptedPayload.split(':');
  if (parts.length !== 3 || parts[0] !== 'v1') {
    throw new Error('Invalid encrypted token format.');
  }
  const subtle = getSubtle();
  const key = await deriveAesKey(getEffectiveSecret(secret));
  const iv = base64ToBytes(parts[1]) as unknown as BufferSource;
  const cipherBytes = base64ToBytes(parts[2]) as unknown as BufferSource;
  const decrypted = await subtle.decrypt({ name: 'AES-GCM', iv }, key, cipherBytes);
  return new TextDecoder().decode(decrypted);
}

/**
 * Generates an HMAC-SHA256 signature for OAuth CSRF state validation.
 */
export async function signOAuthState(payload: string, secret?: string): Promise<string> {
  const subtle = getSubtle();
  const key = await deriveHmacKey(getEffectiveSecret(secret));
  const sig = await subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return bytesToBase64(new Uint8Array(sig)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function verifyOAuthStateSignature(payload: string, signature: string, secret?: string): Promise<boolean> {
  if (!payload || !signature) return false;
  const expected = await signOAuthState(payload, secret);
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Redacts all sensitive credential fields from an email_accounts DB row before returning to API clients.
 */
export function sanitizeEmailAccountRow(row: any) {
  let scopes: string[] = [];
  try {
    scopes = typeof row.scopes === 'string' ? JSON.parse(row.scopes) : Array.isArray(row.scopes) ? row.scopes : [];
  } catch {
    scopes = [];
  }
  return {
    id: String(row.id),
    userId: String(row.user_id || row.userId || ''),
    provider: row.provider as 'gmail' | 'outlook',
    email: String(row.email || ''),
    displayName: row.display_name || row.displayName || undefined,
    scopes,
    status: row.status || 'connected',
    tokenExpiresAt: row.token_expires_at || row.tokenExpiresAt || undefined,
    lastError: row.last_error || row.lastError || undefined,
    lastSyncedAt: row.last_synced_at || row.lastSyncedAt || undefined,
    createdAt: String(row.created_at || row.createdAt || ''),
    updatedAt: String(row.updated_at || row.updatedAt || ''),
  };
}
