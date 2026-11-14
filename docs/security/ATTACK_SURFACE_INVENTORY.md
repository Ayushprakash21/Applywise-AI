# APPLYVISE AI — ATTACK SURFACE INVENTORY & ROUTE-TO-PERMISSION MATRIX

**Environment:** Node.js Express (`server.ts`) & Cloudflare Workers Edge (`worker/index.ts`)  
**Scope:** Full API Surface Inventory, Authentication Middleware, and Access Controls

---

## 1. ROUTE-TO-PERMISSION MATRIX

| Method | Endpoint Path | Runtime | Auth Level | Role Required | Rate Limit | Primary Security Check |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/signup` | Node & Edge | Public | None | 10 / min | Email format check, password complexity, duplicate collision check |
| `POST` | `/api/auth/login` | Node & Edge | Public | None | 15 / min | Constant-time password verification, IP rate limit |
| `POST` | `/api/auth/logout` | Node & Edge | Authenticated | User / Admin | None | Session token invalidation in DB / KV |
| `GET` | `/api/auth/me` | Node & Edge | Authenticated | User / Admin | None | Session token verification, returns user identity |
| `POST` | `/api/auth/recover-password` | Node & Edge | Public | None | 5 / min | Anti-enumeration response, email format check |
| `GET` | `/api/profile` | Node & Edge | Authenticated | User / Admin | None | Read profile bound strictly to `req.user.id` |
| `POST` | `/api/profile` | Node & Edge | Authenticated | User / Admin | None | Input validation, update profile bound to `req.user.id` |
| `POST` | `/api/profile/upload-resume` | Node & Edge | Authenticated | User / Admin | 20 / min | Magic-byte MIME validation, 10MB file limit, zip bomb protection |
| `GET` | `/api/jobs` | Node & Edge | Authenticated | User / Admin | None | Public search engine across verified vacancies |
| `POST` | `/api/jobs/import` | Node & Edge | Authenticated | User / Admin | 15 / min | SSRF URL validation (`validateSafePublicUrl`), schema normalization |
| `GET` | `/api/applications` | Node & Edge | Authenticated | User / Admin | None | Filtered strictly to `WHERE user_id = req.user.id` |
| `POST` | `/api/applications` | Node & Edge | Authenticated | User / Admin | None | Creates application record bound to `req.user.id` |
| `GET` | `/api/applications/:id` | Node & Edge | Authenticated | User / Admin | None | IDOR check (`WHERE id = ? AND user_id = ?`) |
| `PATCH` | `/api/applications/:id` | Node & Edge | Authenticated | User / Admin | None | IDOR check and 12-stage state transition validation |
| `GET` | `/api/applications/:id/timeline` | Node & Edge | Authenticated | User / Admin | None | IDOR check (`getApplicationById(req.user.id, id)`) |
| `POST` | `/api/applications/:id/timeline` | Node & Edge | Authenticated | User / Admin | None | IDOR check (`getApplicationById(req.user.id, id)`) |
| `POST` | `/api/autopilot/jobs/:id/submit` | Node & Edge | Authenticated | User / Admin | Quota-governed | Zero-fabrication check: candidate evidence or portal redirection |
| `GET` | `/api/candidate-facts` | Node & Edge | Authenticated | User / Admin | None | Query facts strictly for `req.user.id` |
| `POST` | `/api/candidate-facts/confirm` | Node & Edge | Authenticated | User / Admin | None | Update fact state bound to `req.user.id` |
| `POST` | `/api/copilot/chat` | Node & Edge | Authenticated | User / Admin | 30 / min | Grounded in candidate facts, `<candidate_user_question>` tagging |
| `POST` | `/api/translation/translate` | Node & Edge | Public / Auth | None | 60 / min | 5,000 character length limit, rate limiter |
| `POST` | `/api/translation/detect` | Node & Edge | Public / Auth | None | 60 / min | 5,000 character length limit, rate limiter |
| `POST` | `/api/payments/razorpay/create-order` | Node & Edge | Authenticated | User / Admin | 10 / min | Price and tier calculated server-side |
| `POST` | `/api/payments/razorpay/verify` | Node & Edge | Authenticated | User / Admin | 10 / min | Constant-time HMAC-SHA256 signature verification |
| `GET` | `/api/admin/*` | Node & Edge | Authenticated | Admin Only | None | `requireAdmin` middleware checks `req.user.role === 'admin'` |
| `POST` | `/api/admin/founder-profile/photo`| Node & Edge | Authenticated | Admin Only | None | Binary magic-byte header validation (JPEG, PNG, WebP) |
| `DELETE` | `/api/translation/cache` | Node & Edge | Authenticated | Admin Only | None | `requireAdmin` authorization check |

---

## 2. AUTHENTICATION & ACCESS CONTROL ARCHITECTURE

- **Session Tokens:** 64-character high-entropy hex string generated via `crypto.getRandomValues`.
- **Password Storage:**
  - Node runtime: `bcryptjs` with 10 salt rounds.
  - Worker runtime: PBKDF2 with 100,000 iterations of SHA-256 and unique 16-byte random salt.
- **Admin RBAC:** Evaluated via cryptographic session lookup against `users` table where `role = 'admin'`. Unauthenticated or candidate role callers receive strict 403 Forbidden.
