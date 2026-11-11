# ApplyVise AI — AI HR Outreach & Direct Application Automation
## Technical Architecture, API Documentation, Security Assessment & Production Readiness Report

---

## 1. Architecture Overview

The **AI HR Outreach & Direct Application Automation** module integrates directly into ApplyVise AI across both supported backend runtimes:

- **Express + SQLite Runtime:** [`server/hrOutreachStore.ts`](../server/hrOutreachStore.ts), [`server/hrDiscoveryEngine.ts`](../server/hrDiscoveryEngine.ts), [`server/hrOutreachRoutes.ts`](../server/hrOutreachRoutes.ts) mounted in [`server.ts`](../server.ts)
- **Cloudflare Worker + D1 Runtime:** [`worker/hrOutreachStore.ts`](../worker/hrOutreachStore.ts), [`worker/hrOutreachRoutes.ts`](../worker/hrOutreachRoutes.ts) mounted in [`worker/index.ts`](../worker/index.ts)
- **Shared Cross-Runtime Domain Engines (`src/utils/`):**
  - [`hrContactDiscovery.ts`](../src/utils/hrContactDiscovery.ts) — Legally compliant public contact parser, 10-category classifier, and source registry
  - [`hrEmailVerification.ts`](../src/utils/hrEmailVerification.ts) — 8-step verification pipeline (syntax, domain, MX, disposable, role-based, public-source provenance, deduplication, 30-day freshness)
  - [`hrContactMatcher.ts`](../src/utils/hrContactMatcher.ts) — 5-signal transparent contact relevance scorer (strictly separated from candidate-job match scores)
  - [`hrEmailGenerator.ts`](../src/utils/hrEmailGenerator.ts) — Gemini + grounded fallback generator across 11 templates & 5 tones with claim auditing
  - [`resumeAttachmentHelper.ts`](../src/utils/resumeAttachmentHelper.ts) — MIME/extension/5MB attachment validator & pure-TS PDF builder (`generateMinimalPdfFromText`)
  - [`tokenCrypto.ts`](../src/utils/tokenCrypto.ts) — WebCrypto AES-256-GCM token encryption & HMAC-SHA256 CSRF OAuth state signing
  - [`emailProviders.ts`](../src/utils/emailProviders.ts) — Least-privilege Gmail OAuth 2.0 + Microsoft Graph Outlook OAuth 2.0 + test-only mock registry
- **Database Migration:** [`migrations/0015_hr_outreach_and_direct_apply.sql`](../migrations/0015_hr_outreach_and_direct_apply.sql)
- **Frontend UI Module (`/dashboard/hr-outreach`):**
  - [`src/components/HrOutreachPage.tsx`](../src/components/HrOutreachPage.tsx)
  - [`src/components/hr-outreach/HrOutreachStudio.tsx`](../src/components/hr-outreach/HrOutreachStudio.tsx)
  - [`src/components/hr-outreach/HrOutreachModals.tsx`](../src/components/hr-outreach/HrOutreachModals.tsx)

---

## 2. Database Schema & Migrations

Migration [`migrations/0015_hr_outreach_and_direct_apply.sql`](../migrations/0015_hr_outreach_and_direct_apply.sql) adds 11 additive tables:

1. `resume_file_blobs` — Authenticated binary storage for uploaded resumes (`.pdf`, `.docx`, <= 5 MB)
2. `hr_contacts` — Deduplicated public recruitment contacts with designation, classification, verification status, confidence, and evidence
3. `hr_contact_sources` — Multi-source provenance records linking every email to discovered URLs and snippets
4. `email_accounts` — Connected Gmail / Outlook accounts storing AES-256-GCM encrypted OAuth access & refresh tokens
5. `oauth_states` — Short-lived HMAC-signed CSRF state nonces bound to `(user_id, provider)`
6. `outreach_campaigns` — Candidate-organized campaign containers with bounded daily caps
7. `outreach_campaign_contacts` — Campaign-to-contact membership & status tracking
8. `outreach_messages` — Drafts, approved sends, provider message/thread IDs, idempotency keys, reply summaries, and follow-up suggestions
9. `outreach_events` — Immutable audit log per outreach message lifecycle event
10. `do_not_contact` — Per-candidate email/domain suppression registry
11. `contact_discovery_runs` — Persistent background discovery job history with checkpointing & dead-letter status

> **Note on Remote D1:** Per execution rules, remote D1 migrations were NOT applied to production. Apply `0015_hr_outreach_and_direct_apply.sql` locally/in staging via `wrangler d1 execute` prior to production rollout.

---

## 3. REST API Documentation (`/api/hr-outreach/*`)

All endpoints require candidate authentication (`Authorization: Bearer <token>` or session cookie). State-mutating routes enforce CSRF `Origin` validation.

| Method & Route | Description | Key Guards / Behavior |
| :--- | :--- | :--- |
| `GET /api/hr-outreach/overview` | Returns real DB metrics, OAuth readiness (`gmail`, `outlook`), user plan entitlement limits, and recent discovery runs | Zero fabricated counters |
| `GET /api/hr-outreach/sources` | Lists transparent discovery source registry with access boundaries | Publicly documents restrictions |
| `GET /api/hr-outreach/contacts` | Filtered, paginated, sorted HR contacts with independent `relevance` score & DNC flag | Filters: `search`, `country`, `designation`, `verificationStatus`, `sourceType`, `jobId` |
| `GET /api/hr-outreach/contacts/:id` | Full contact detail + multi-source provenance + breakdown | Includes relevance disclaimer |
| `POST /api/hr-outreach/contacts/discover` | Scans GCDE job cache + official employer career URLs | SSRF validation, 5-min per-domain cooldown, bounded concurrency |
| `POST /api/hr-outreach/contacts/:id/verify` | Executes 8-step verification pipeline (Syntax, Domain, MX, Disposable, Role, Provenance, Dedupe, Freshness) | Never promotes MX-only checks to `Verified` |
| `POST /api/hr-outreach/contacts/:id/status` | Updates contact status (`active` / `archived` / `suppressed`) or marks contacted | Audit trail |
| `POST /api/hr-outreach/contacts/:id/generate-email` | Generates resume-grounded editable email using Gemini + factual fallback | Pro / BLACK entitlement required |
| `GET /api/hr-outreach/resumes` | Lists candidate's uploaded resumes & tailored application resumes | Strictly tenant-scoped (`user_id = ?`) |
| `GET /api/hr-outreach/resumes/:resumeId/preview` | Streams binary PDF/DOCX inline (`X-Frame-Options: SAMEORIGIN`) | Rejects cross-user requests (404) |
| `GET /api/hr-outreach/email-accounts` | Lists candidate's connected mailboxes | Access/refresh tokens **never** serialized |
| `POST /api/hr-outreach/email-accounts/google/connect` | Starts Google OAuth 2.0 flow with signed CSRF `state` | Fails closed (`503`) if credentials unset |
| `POST /api/hr-outreach/email-accounts/microsoft/connect` | Starts Microsoft Graph OAuth 2.0 flow with signed CSRF `state` | Fails closed (`503`) if credentials unset |
| `GET /api/hr-outreach/email-accounts/:provider/callback` | Verifies CSRF `state`, exchanges code, encrypts & persists tokens | Redirects cleanly to `/dashboard/hr-outreach` |
| `DELETE /api/hr-outreach/email-accounts/:id` | Revokes token (best-effort) & purges encrypted secrets locally | Tenant-scoped |
| `POST /api/hr-outreach/messages/preview` | Validates recipient, DNC, attachment, claim audit; saves draft | Ready-to-send check |
| `POST /api/hr-outreach/messages/send` | Sends email via connected OAuth provider | Requires `explicitApproval: true`, `resumeConfirmed: true` (if attached), `idempotencyKey`, DNC check, rate caps |
| `GET /api/hr-outreach/messages` | Lists candidate's outreach drafts & sent messages | Status filter supported |
| `GET /api/hr-outreach/messages/:id` | Returns message detail + `outreach_events` audit timeline | Tenant-scoped |
| `GET /api/hr-outreach/replies` | Lists replies & follow-ups due; `?sync=true` polls authorized threads | AI summaries & read-only suggested drafts |
| `GET / POST /api/hr-outreach/campaigns` | Lists or creates organizational outreach campaigns | Bounded daily caps (max 25–50) |
| `GET /api/hr-outreach/campaigns/:id` | Returns campaign summary + enrolled contacts | Tenant-scoped |
| `POST /api/hr-outreach/campaigns/:id/contacts` | Enrolls HR contacts into campaign | Deduplicated per campaign |
| `GET / POST / DELETE /api/hr-outreach/do-not-contact` | Manages candidate's opt-out / suppression list | Enforced prior to sending |

---

## 4. HR Discovery Source Registry & Compliance Boundaries

- **Permitted Public Inspection:** Official Company Career Pages (HTTPS + SSRF-checked), Greenhouse Public Boards, Lever Public Postings, Ashby Job Board API, Workable Widget, SmartRecruiters, Recruitee, and GCDE Public Feeds (Remotive, Arbeitnow, Jobicy).
- **Linking-Only / Access-Controlled Platforms:** Workday, LinkedIn, Indeed, Glassdoor, Naukri, Foundit, Wellfound, Instahyre, JobStreet, SEEK, Reed, Bayt, GulfTalent. ApplyVise strictly avoids bypassing login walls, CAPTCHAs, paywalls, or anti-bot restrictions. Where an employer exposes only a portal web form without a public email, discovery explicitly records that direct email contact is unavailable rather than inventing guesses.

---

## 5. Email Provider Integration & OAuth Configuration Checklist

### Required Environment Variables / Worker Secrets

| Variable | Provider | Purpose |
| :--- | :--- | :--- |
| `EMAIL_ENCRYPTION_KEY` | Both | 32+ char master secret for AES-256-GCM OAuth token encryption (falls back to `SESSION_SECRET`) |
| `GOOGLE_OAUTH_CLIENT_ID` | Gmail | Google Cloud Console OAuth 2.0 Web Client ID |
| `GOOGLE_OAUTH_CLIENT_SECRET` | Gmail | Google Cloud Console OAuth 2.0 Client Secret |
| `MICROSOFT_CLIENT_ID` | Outlook | Microsoft Entra App Registration Application (client) ID |
| `MICROSOFT_CLIENT_SECRET` | Outlook | Microsoft Entra Client Secret |
| `MICROSOFT_TENANT_ID` | Outlook | Optional (`common` default for personal + organizational M365 accounts) |

### OAuth Callback Redirect URIs to Register
- Google: `<APP_URL>/api/hr-outreach/email-accounts/gmail/callback`
- Microsoft: `<APP_URL>/api/hr-outreach/email-accounts/outlook/callback`

### Least-Privilege OAuth Scopes
- **Gmail:** `https://www.googleapis.com/auth/gmail.send`, `https://www.googleapis.com/auth/gmail.readonly`, `https://www.googleapis.com/auth/userinfo.email`
- **Microsoft Outlook:** `offline_access`, `User.Read`, `Mail.Send`, `Mail.Read`

### Provider Approval Checklist (Before General Public Release)
1. Configure OAuth consent screens in Google Cloud Console & Microsoft Entra.
2. Complete Google Restricted Scope verification & CASA assessment if publishing `gmail.send` / `gmail.readonly` beyond 100 test users.
3. Verify SPF / DKIM / DMARC alignment advisory for candidate sender domains and monitor bounce handling.

---

## 6. Security Assessment

- **Tenant Isolation:** Every candidate-owned table (`email_accounts`, `outreach_messages`, `outreach_events`, `outreach_campaigns`, `do_not_contact`, `resume_file_blobs`, `oauth_states`) filters strictly by authenticated `user_id`. Cross-tenant access attempts return HTTP `404`.
- **OAuth Credential Protection:** Tokens are encrypted at rest via AES-256-GCM (`v1:<iv>:<ciphertext>`) and never stored in browser `localStorage`, `IndexedDB`, or serialized to API JSON (`sanitizeEmailAccountRow`).
- **SSRF & Attachment Security:** Discovery URLs pass public IP/DNS rebinding validation (`validateSafePublicUrl` in Node / `isSafePublicUrl` in Worker). Resume attachments enforce `.pdf`/`.docx` extension-MIME parity and <= 5 MB ceiling, with filenames sanitized against header/path injection.
- **Abuse & Spam Prevention:** Explicit `explicitApproval === true` gate, idempotency keys preventing duplicate transmissions, per-account 25/day hard safety ceiling + monthly subscription quotas, and Do-Not-Contact suppression enforcement.

---

## 7. Integration Status Matrix

### Genuinely Operational Right Now (Code + DB + Tests Verified)
- GCDE-connected HR contact discovery & context extraction from official career pages and job descriptions
- 8-step email verification pipeline (Node `dns.resolveMx` + Worker Cloudflare DoH MX validation + honest `Domain Valid` / `Role-Based` / `Invalid` / `Stale` status separation)
- 5-signal transparent Contact Relevance matching engine
- Resume-grounded AI email generation (Gemini 2.5 Flash + deterministic factual fallback + claim integrity audit)
- Resume attachment selection, validation, pure-TS PDF generation, and private authenticated inline preview
- Campaign management, Do-Not-Contact suppression, message event auditing, and inbox reply UI
- Complete OAuth 2.0 authorization, CSRF state verification, AES-256-GCM encryption, token refresh, MIME attachment assembly, and send/reply logic validated end-to-end against `MockEmailProviderAdapter`

### Requiring External Credentials / Configuration Before Live Mailbox Transmission
- Live **Gmail OAuth 2.0** mailbox connection & transmission (`GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, Google verification for production scope)
- Live **Microsoft Outlook OAuth 2.0** mailbox connection & transmission (`MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`)
- Optional third-party B2B contact/deliverability API enrichment (`HUNTER_API_KEY` / similar licensed contact provider if desired later)
- Remote Cloudflare D1 execution of `migrations/0015_hr_outreach_and_direct_apply.sql` when authorized to deploy

---

## 8. Production Readiness Verdict

- **Automated Backend, Security & Integration Tests:** Passing (see `tests/hr_outreach_and_direct_apply.test.ts` + full regression suite via `npm test`)
- **TypeScript Strict Compilation:** Passing (`tsc --noEmit` exits 0)
- **Production Bundle:** Built cleanly (`npm run build`)
- **Production Release Readiness:** Feature-complete on branch `feat/ai-hr-outreach-direct-apply`. Safe to deploy once D1 migration `0015` and Google/Microsoft OAuth secrets are provisioned in Cloudflare Worker secrets / environment configuration.
