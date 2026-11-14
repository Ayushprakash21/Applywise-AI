# APPLYVISE AI — DATABASE AND API AUDIT
**Document Reference:** DAA-2026-v2  
**Runtimes:** SQLite (Node.js) & Cloudflare D1 (V8 Edge Isolates)  
**Auditor:** Database Reliability Engineer & Principal Backend Architect  
**Date:** November 14, 2026  

---

## 1. Schema & Table Architecture

The platform data architecture is organized into 30+ relational tables across 17 migration files (`0001_initial_schema.sql` through `0017_ai_autopilot_agent.sql`):

### Core Entities:
- `users`: User identity, password hashes, roles, subscription tier.
- `user_sessions`: Active bearer token sessions and expiration timestamps.
- `user_profiles`: Canonical candidate profile (JSON experiences, education, skills, contact).
- `candidate_facts`: Atomic facts extracted from verified profiles and master resumes.
- `career_preferences`: Target roles, desired locations, remote preferences, min salary.
- `automation_settings`: Autopilot operating modes, daily application caps, one-time consent.
- `applications`: Candidate job applications, tailored resume JSON, lifecycle status, timeline events.
- `cached_vacancies`: Ingested job postings, requirements, arrangement, source provenance.
- `job_sources`: Monitored employer career sites, ATS connector types, sync health.
- `user_subscriptions` & `membership_grants`: Billing periods, entitlements, admin grants, lifetime flags.
- `notifications`: User notifications, read status, action links.
- `audit_logs`: Immutable, tamper-evident operational logs for security and compliance.

---

## 2. API Contract & Runtime Parity

Both `server.ts` (Express) and `worker/index.ts` (Hono / Cloudflare Workers) implement identical API routes and response envelopes:

```typescript
// Standard API Envelope
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
```

### Verified Endpoint Paths:
- **Auth**: `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/session`, `POST /api/auth/logout`, `POST /api/auth/google`
- **Dashboard**: `GET /api/dashboard/summary`, `GET /api/dashboard/priority-actions`
- **Jobs & Radar**: `GET /api/jobs`, `GET /api/jobs/signals`, `POST /api/jobs/refresh-live`, `POST /api/jobs/import`
- **Applications**: `GET /api/applications`, `POST /api/applications/create-from-vacancy`, `POST /api/applications/:id/transition`, `POST /api/applications/:id/submit`
- **Resumes**: `GET /api/resumes`, `POST /api/resumes/upload`, `POST /api/resumes/tailor`, `GET /api/resumes/:appId/export/docx`
- **Six Pillars**: `/api/opportunity-signals/live`, `/api/interview/sessions`, `/api/interview/evaluate`, `/api/recruiter-review/audit`, `/api/career-atlas/trajectories`
- **Autopilot**: `GET /api/autopilot/summary`, `GET /api/autopilot/jobs`, `POST /api/autopilot/consent`
- **HR Outreach**: `GET /api/hr-outreach/contacts`, `POST /api/hr-outreach/preview`, `POST /api/hr-outreach/send`
- **Billing**: `GET /api/subscription/status`, `POST /api/subscription/razorpay/create-order`
- **Admin**: `GET /api/admin/users`, `GET /api/admin/system/health`, `POST /api/admin/users/:userId/provision`

---

## 3. Query Optimization & Indexing
- Primary keys and indexed foreign keys (`user_id`, `application_id`, `vacancy_id`, `created_at`) are applied on high-traffic tables.
- Pagination is enforced on large listing queries (vacancies, audit logs, resumes) with default page sizes of 25–50 records.
