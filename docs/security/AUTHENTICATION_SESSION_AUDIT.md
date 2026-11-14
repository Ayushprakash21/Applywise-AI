# APPLYVISE AI — AUTHENTICATION & SESSION SECURITY AUDIT

**Scope:** User authentication, password storage, session lifecycle, token generation, and OAuth validation  
**Standards:** NIST SP 800-63B, OWASP ASVS v4.0

---

## 1. PASSWORD CRYPTOGRAPHY & TIMING ATTACK MITIGATION

### Node.js Monolith (`bcryptjs`)
- Password hashing uses standard bcrypt with `SALT_ROUNDS = 10`.
- Passwords must meet minimum complexity (8+ characters, letter, number/symbol).
- Timing safety is inherent to bcrypt algorithm structure.

### Cloudflare Workers Runtime (`worker/auth.ts`)
- Cloudflare Workers Edge uses WebCrypto `PBKDF2` with `100,000` iterations of `SHA-256` and 16 bytes of cryptographically secure random salt.
- Stored format: `pbkdf2:<saltHex>:<hashHex>`.
- **Timing Attack Defense (SEC-004 Remediation):**
  Previously compared hex strings directly via `===`. This was remediated with a constant-time byte-by-byte XOR comparison:
  ```typescript
  const expBytes = enc.encode(expectedHashHex);
  const calcBytes = enc.encode(calculatedHashHex);
  if (expBytes.byteLength !== calcBytes.byteLength) return false;
  let mismatch = 0;
  for (let i = 0; i < expBytes.byteLength; i++) {
    mismatch |= expBytes[i] ^ calcBytes[i];
  }
  return mismatch === 0;
  ```

---

## 2. SESSION LIFECYCLE & TOKEN MANAGEMENT

1. **Entropy:** Session tokens are 64-character hexadecimal strings generated using `crypto.getRandomValues(new Uint8Array(32))`, providing 256 bits of cryptographic entropy.
2. **Storage:**
   - Node: Persisted in SQLite `sessions` table.
   - Cloudflare: Persisted in D1 `sessions` table.
3. **Invalidation:** `/api/auth/logout` explicitly deletes the token from the session store.
4. **Brute-Force & Enumeration Protections:**
   - `/api/auth/login`: Rate-limited to 15 attempts / minute per IP.
   - `/api/auth/signup`: Rate-limited to 10 attempts / minute per IP.
   - `/api/auth/recover-password`: Rate-limited to 5 attempts / minute per IP; returns uniform generic success message to prevent user enumeration.
