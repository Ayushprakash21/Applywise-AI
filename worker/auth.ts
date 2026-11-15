// worker/auth.ts
// Secure cryptographic authentication helpers for ApplyVise AI on Cloudflare Workers

import bcrypt from 'bcryptjs';

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );

  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  const hashHex = Array.from(new Uint8Array(derivedBits)).map(b => b.toString(16).padStart(2, '0')).join('');
  return `pbkdf2:${saltHex}:${hashHex}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (storedHash.startsWith('pbkdf2:')) {
    const parts = storedHash.split(':');
    if (parts.length !== 3) return false;
    const [, saltHex, expectedHashHex] = parts;

    const salt = new Uint8Array(saltHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );

    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      256
    );

    const calculatedHashHex = Array.from(new Uint8Array(derivedBits)).map(b => b.toString(16).padStart(2, '0')).join('');
    const expBytes = enc.encode(expectedHashHex);
    const calcBytes = enc.encode(calculatedHashHex);
    if (expBytes.byteLength !== calcBytes.byteLength) return false;
    let mismatch = 0;
    for (let i = 0; i < expBytes.byteLength; i++) {
      mismatch |= expBytes[i] ^ calcBytes[i];
    }
    return mismatch === 0;
  }

  // Fallback to bcrypt for hashes created by bcryptjs
  try {
    return bcrypt.compareSync(password, storedHash);
  } catch {
    return false;
  }
}

export function generateSessionToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim());
}

export function validatePassword(password: string): boolean {
  return typeof password === 'string' && password.length >= 8;
}

export function isAdminRole(role?: string): boolean {
  return role === 'admin' || role === 'super_admin';
}

export function isSuperAdmin(role?: string): boolean {
  return role === 'super_admin';
}

export function decodeJwtClaims(token: string): Record<string, any> | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.trim().split('.');
  if (parts.length !== 3) return null;
  try {
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const jsonStr = typeof atob === 'function'
      ? decodeURIComponent(atob(padded).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''))
      : Buffer.from(padded, 'base64').toString('utf8');
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

export function verifyFirebaseIdTokenClaims(token: string): {
  isValid: boolean;
  uid?: string;
  email?: string;
  admin?: boolean;
  role?: string;
  isSuperAdmin?: boolean;
} {
  const claims = decodeJwtClaims(token);
  if (!claims) return { isValid: false };

  // Validate expiration
  if (typeof claims.exp === 'number' && claims.exp * 1000 < Date.now()) {
    return { isValid: false };
  }

  // Validate token issuer matches Firebase or Google Identity
  const iss = claims.iss || '';
  const isFirebaseOrGoogle = iss.startsWith('https://securetoken.google.com/') ||
    iss === 'accounts.google.com' ||
    iss === 'https://accounts.google.com';

  if (!isFirebaseOrGoogle) {
    return { isValid: false };
  }

  const role = claims.role || (claims.admin === true ? 'super_admin' : 'user');
  const admin = claims.admin === true || isAdminRole(role);
  const isSuper = role === 'super_admin';

  return {
    isValid: true,
    uid: claims.sub || claims.user_id,
    email: claims.email ? claims.email.toLowerCase().trim() : undefined,
    admin,
    role,
    isSuperAdmin: isSuper,
  };
}
