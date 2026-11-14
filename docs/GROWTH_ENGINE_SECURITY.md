# APPLYVISE GROWTH ENGINE — SECURITY & GOVERNANCE ARCHITECTURE

This document outlines the security boundaries, authorization controls, and safety governance protecting the ApplyVise Growth Engine.

---

## 1. ACCESS CONTROL & ROLE ENFORCEMENT

- **Strict Admin Gating:** All `/api/admin/growth/*` endpoints are protected by `requireAdmin` middleware checking `req.user?.role === 'admin'`. Candidate, recruiter, or unauthenticated users receive HTTP 403 Forbidden or HTTP 401 Unauthorized.
- **Client Route Interception:** Navigation to `/admin/growth-engine` by non-administrators is intercepted immediately in `App.tsx`, triggering an access denied toast and redirecting to `/`.
- **Public Sandbox Isolation:** Public endpoints (`/api/resources` and `/api/resources/:slug`) operate completely read-only, serving only records where `is_published = 1 AND status = 'PUBLISHED'`.

---

## 2. EMERGENCY STOP & OPERATIONAL SAFETY

- **Emergency Stop Button:** Located prominently in the Command Center header. When engaged, `emergency_stopped = 1` transactionally halts all agent execution loops and blocks any publishing task.
- **Pause State Machine:** Allows administrators to pause automated runs during platform maintenance without resetting configuration parameters.
- **Budget Ceiling Guard:** The `budget_ceiling_monthly` parameter defaults to `$0.00` (pure organic growth). Autonomous agents cannot commit paid advertising expenditures beyond this hard limit.
- **Content Approval Gate:** In Supervised Autopilot mode (Mode 2), no editorial article or social media post is published without explicit operator sign-off.

---

## 3. AUDIT LOGGING & TRACEABILITY

Every state change in the Growth Engine is logged to the centralized `audit_logs` table:
- `SETTINGS_UPDATED`: Autonomy mode, publishing rules, or budget changes.
- `AGENTS_PAUSED` / `AGENTS_RESUMED`: Operational state shifts.
- `EMERGENCY_STOP_TRIGGERED` / `EMERGENCY_STOP_CLEARED`: Safety triggers.
- `ARTICLE_CREATED`, `ARTICLE_UPDATED`, `ARTICLE_PUBLISHED`: Content pipeline actions.
- `TASK_APPROVED`, `TASK_REJECTED`: Operator sign-off actions.
