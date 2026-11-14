# APPLYVISE AI — CLOUD DEPLOYMENT & EDGE SECURITY AUDIT

**Environment:** Cloudflare Workers, Cloudflare D1, Cloudflare Pages, Node.js Backend  
**Security Standards:** Cloudflare Zero Trust Guidelines, Mozilla Web Security Guidelines

---

## 1. CORS CONFIGURATION & EXPLOIT MITIGATION (SEC-001)

### Vulnerability Identified
`worker/index.ts` previously used a permissive wildcard reflector:
```typescript
cors({ origin: (origin) => origin || '*', credentials: true })
```
This allowed any external website to make authenticated cross-origin requests on behalf of a logged-in user, exposing candidate facts, resumes, and API endpoints.

### Remediation Implemented
A strict regex-based origin allowlist was deployed:
```typescript
const ALLOWED_ORIGIN_PATTERNS = [
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
  /^https:\/\/([a-zA-Z0-9-]+\.)*applyvise\.ai$/,
  /^https:\/\/([a-zA-Z0-9-]+\.)*applyvise-ai\.pages\.dev$/
];

app.use('*', cors({
  origin: (origin) => {
    if (!origin) return 'https://applyvise.ai';
    const isAllowed = ALLOWED_ORIGIN_PATTERNS.some(pattern => pattern.test(origin));
    return isAllowed ? origin : 'https://applyvise.ai';
  },
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposeHeaders: ['Content-Length', 'X-Request-Id'],
  maxAge: 86400,
}));
```
Untrusted external domains no longer receive credentialed CORS reflection.

---

## 2. DEFENSE-IN-DEPTH HTTP SECURITY HEADERS (SEC-007)

Both Node.js (`server.ts`) and Cloudflare Workers (`worker/index.ts`) now inject enterprise security headers on every response:

1. `X-Content-Type-Options: nosniff` — Prevents MIME-type confusion attacks.
2. `X-Frame-Options: DENY` — Prevents clickjacking in iframes.
3. `X-XSS-Protection: 1; mode=block` — Legacy XSS filter activation.
4. `Referrer-Policy: strict-origin-when-cross-origin` — Protects token leakage in URLs.
5. `Permissions-Policy: camera=(), microphone=(), geolocation=()` — Restricts unnecessary hardware APIs.
6. `Content-Security-Policy: default-src 'self' ... frame-ancestors 'none';` — Blocks unauthorized scripts and framing.
7. `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` — Enforces HTTPS in production.

---

## 3. EDGE DATABASE (CLOUDFLARE D1) HARDENING

1. All SQL operations use parameterized queries (`prepare(...).bind(...)`).
2. Schema isolation prevents candidate queries from executing raw administrative commands.
3. Direct database export endpoints are restricted to authorized administrators via `requireAdmin`.
