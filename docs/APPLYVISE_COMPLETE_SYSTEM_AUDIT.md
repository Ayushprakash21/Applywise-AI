# APPLYVISE AI — COMPLETE SYSTEM, ARCHITECTURE, SECURITY & PRODUCT AUDIT
**Repository:** `Ayushprakash21/Applywise-AI`  
**Audit Baseline Commit:** `5f492fa` (`main`)  
**Audit Date:** November 5, 2026  
**Auditor:** Principal Software Architect, Cybersecurity Auditor & Career Tech Specialist  
**Status:** **NO-GO FOR COMMERCIAL PRODUCTION LAUNCH (Remediation Required)**  

---

## 1. EXECUTIVE SUMMARY

ApplyVise AI is an ambitious, feature-rich career operating system engineered to provide AI-powered resume tailoring, career digital twin modeling, vacancy aggregation, and job search management. The application features a dual architecture: a modern serverless edge tier deployed on **Cloudflare Workers with D1 SQL Database** (`worker/`), and an alternative local runtime built with **Node.js, Express, and SQLite** (`server.ts`).

The frontend is a single-page application built with **React 19, TypeScript, Vite, and Tailwind CSS**, featuring Three.js/WebGL visual canvases, glassmorphic interfaces, interactive career momentum timelines, and an AI copilot.

### Key Audit Metrics
* **Automated Unit & Integration Tests:** **298 passing out of 298 tests** across 9 test suites (0 failures).
* **Responsive Layout Stability:** **8 of 8 standard viewports passed** with zero horizontal overflow (360px mobile up to 1920px desktop).
* **Vite Production Build:** Successfully builds in **612ms** (`dist/` generated cleanly).
* **Static Type Safety:** **Failed with 45 strict TypeScript errors** under `tsc --noEmit`.
* **Overall Launch Readiness Score:** **54 / 100 (Unacceptable for Public Commercial Launch)**.

### Primary Risk Summary
1. **Critical P0 Financial Bypass:** Any authenticated user can self-upgrade to the highest tier (`black` or `pro`) without making a payment by issuing a single POST request to `/api/subscription/upgrade`.
2. **Critical P0 Payment Verification Bypass:** The Cloudflare Worker Razorpay verification endpoint (`POST /api/subscription/razorpay/verify`) extracts `razorpay_signature` but **never verifies it using HMAC SHA256**. Supplying dummy identifiers instantly activates a paid subscription.
3. **P1 User Lockout / Password Reset Gap:** The password recovery endpoint (`/api/auth/recover-password`) returns a static 200 OK message but generates no reset token, writes nothing to the database, sends no email, and lacks a corresponding reset endpoint. No transactional email provider is integrated.
4. **P1 Deceptive Auto-Apply Simulation:** While `worker/submissionAdapter.ts` was architected for truthful reporting (`GUIDED_COMPLETION_REQUIRED`), `worker/index.ts` bypasses it in `/api/jobs/:id/apply-auto` and marks external applications as `SUBMITTED` with fake connector receipts.
5. **P1 Tier Entitlement Truncation:** `worker/usageEnforcement.ts` omits the top-tier `black` plan from pro-tier quota bypasses, misclassifying paying Black Tier users as `free` tier.
6. **P1 Administrator CLI SQL Injection:** `scripts/promote-admin.ts` concatenates unvalidated CLI input directly into raw Cloudflare D1 SQL strings.
7. **P2 Architectural Backend Divergence:** The Cloudflare Worker backend and Node.js SQLite backend have drifted in endpoint signatures, schema assumptions, and middleware logic.
8. **P2 Dead Code Accumulation:** Over **1,800 lines** of legacy tab components (`AutomationSettingsTab`, `JobDiscoveryTab`, `TrackerTab`, `ReportsTab`, `IntegrationsTab`, `OverviewTab`, `QueueTab`) are unmounted and orphaned in the codebase.

---

## 2. SYSTEM ARCHITECTURE & DUAL-BACKEND DIVERGENCE

### 2.1 Architecture Overview

```
                                  +------------------------------------+
                                  |         React 19 SPA (Vite)        |
                                  |   (Tailwind CSS, Three.js, Lucide) |
                                  +-----------------+------------------+
                                                    |
                                       +------------+------------+
                                       |                         |
                                       v                         v
                       +-------------------------------+  +-------------------------------+
                       |   Target Production Backend   |  |     Local Dev / Node Server   |
                       |       Cloudflare Worker       |  |       Express 4.x + SQLite    |
                       |       (worker/index.ts)       |  |           (server.ts)         |
                       +---------------+---------------+  +---------------+---------------+
                                       |                                  |
                                       v                                  v
                       +-------------------------------+  +-------------------------------+
                       |     Cloudflare D1 (SQLite)    |  |     Local SQLite Database     |
                       |      (worker/d1Store.ts)      |  |    (server/authAndStore.ts)   |
                       +-------------------------------+  +-------------------------------+
```

### 2.2 Backend Divergence Matrix

| Capability / Route | Cloudflare Worker (`worker/`) | Node.js Express (`server.ts`) | Status / Parity Risk |
| :--- | :--- | :--- | :--- |
| **Authentication Runtime** | WebCrypto PBKDF2 (SHA-256) | Node `crypto.pbkdf2Sync` | Divergent crypto implementations; tokens compatible if secrets match. |
| **Change Email (`/api/auth/change-email`)** | Implemented (`worker/index.ts:363`) | Missing entirely | **Feature mismatch**: Users on local/Node runtime cannot change email. |
| **Copilot Engine (`/api/ai/copilot`)** | Enforces quotas, logs usage, audits | Quota enforcement omitted | **Discrepancy**: Local server permits unbounded Gemini API calls. |
| **Payment Signature Verification** | Completely omitted (`worker/index.ts:741`) | Conditionally checked if secret is set | **High Risk**: Worker is vulnerable to 100% payment spoofing. |
| **Admin Overview Error Handling** | Catches error and returns 0 counts | Throws HTTP 500 on database failure | **Inconsistent**: Worker conceals database failures as empty counts. |
| **Database Migrations** | Cloudflare D1 migrations (`migrations/`) | In-memory/table bootstrapping on startup | Divergence between D1 SQL dialect and Node SQLite driver. |

---

## 3. COMPLETE FEATURE INVENTORY & TRUTH MATRIX

Every major module and capability in ApplyVise AI has been inspected and classified according to its actual implementation reality:
* **WORKING:** Complete, tested, and functionally sound in production.
* **PARTIALLY WORKING:** Core logic runs, but missing error handling, verification, or sub-flows.
* **UI ONLY:** Visual component exists in the DOM, but lacks backend integration or interactive effect.
* **MOCKED:** Returns simulated, hardcoded, or synthetic data.
* **BROKEN:** Contains critical bugs or logic errors that cause failures.
* **MISSING:** Expected for a commercial career OS, but completely absent.

| Module | Sub-Feature | Implementation Status | Evidence / File Reference | Notes & Findings |
| :--- | :--- | :--- | :--- | :--- |
| **Auth** | Email / Password Registration | **WORKING** | `worker/index.ts:167`, `FlowSignup.tsx` | PBKDF2 hashing, duplicate checks, session tokens. |
| **Auth** | Email / Password Login | **WORKING** | `worker/index.ts:208`, `FlowLogin.tsx` | Validates salt and hash, issues 7-day bearer token. |
| **Auth** | Google Sign-In & Sign-Up | **WORKING** | `src/services/googleAuth.ts`, `worker/index.ts:264` | Validates GIS credential JWT audience, issuer, exp. |
| **Auth** | Password Reset / Recovery | **BROKEN / MISSING** | `worker/index.ts:245-255`, `server.ts:225-235` | Returns fake success. No token, no DB update, no email. |
| **Auth** | Email Verification Link | **MISSING** | `worker/index.ts:182` | Signups are defaulted to `is_verified: 1`. No mailer. |
| **Auth** | Session Revocation / Logout | **PARTIALLY WORKING** | `worker/index.ts:340` | Deletes token from `user_sessions`, but JWTs are unrevoked. |
| **Billing** | Free Plan Quotas (1 Resume, 5 Apps) | **WORKING** | `worker/usageEnforcement.ts:100` | Strictly blocked and covered by regression tests. |
| **Billing** | Upgrade Endpoint | **BROKEN (P0 BACKDOOR)** | `worker/index.ts:675-714` | Any user can POST `{ planId: "black" }` for free. |
| **Billing** | Razorpay Order Creation | **WORKING** | `worker/index.ts:717-735` | Creates orders with amount & currency parameters. |
| **Billing** | Razorpay Payment Verification | **BROKEN (P0 SPOOFING)**| `worker/index.ts:737-767` | Signature is unverified. Any IDs grant access. |
| **Billing** | Webhook Handling & Sub Renewal | **MISSING** | `worker/index.ts` | No webhook endpoint. Recurring renewals unhandled. |
| **Jobs** | Vacancy Feed Aggregation | **WORKING** | `worker/jobConnectors.ts:50` | Ingests Arbeitnow, Jobicy, Remotive, and feeds. |
| **Jobs** | Algorithmic Match Scoring | **WORKING** | `worker/matchingEngine.ts:35`, `rules.ts` | Evaluates requirements, disciplines, and competencies. |
| **Jobs** | Hard Eligibility Verification | **WORKING** | `src/utils/rules.ts:30` | Excludes blacklist companies, checks visa sponsorship. |
| **Jobs** | Automated Submission Adapter | **BROKEN / DECEPTIVE** | `worker/index.ts:1711-1712` | Fabricates `SUBMITTED` state without external API call. |
| **Jobs** | Guided Direct Application | **WORKING** | `worker/submissionAdapter.ts:95` | Prepares package for one-click external handoff. |
| **Resume** | PDF Resume Text Extraction | **WORKING** | `worker/resumeEngine.ts`, `pdfWorker.ts` | PDF.js-based text extraction with fallback. |
| **Resume** | Candidate Fact Registry | **WORKING** | `src/utils/candidateFactRegistry.ts` | Extracts facts and tracks user verification state. |
| **Resume** | Anti-Hallucination Tailoring | **WORKING** | `worker/resumeEngine.ts:300` | Rejects fabricated companies, degrees, and metrics. |
| **Resume** | DOCX / PDF Download | **PARTIALLY WORKING** | `src/components/ResumePreviewModal.tsx` | Client-side HTML-to-print/PDF rendering only. |
| **Career Twin**| Verified Experience Timeline | **WORKING** | `worker/d1Store.ts:1250`, `CareerTwinPage.tsx` | Ground-truth historical career nodes and skills. |
| **Interviews**| Role-Specific Interview Coaching | **WORKING** | `worker/index.ts:2162`, `InterviewsPage.tsx` | Generates STAR talking points and technical queries. |
| **Admin** | Admin Dashboard & Metrics | **PARTIALLY WORKING** | `worker/index.ts:2566`, `AdminConsole.tsx` | Conceals DB errors by silently falling back to 0. |
| **Admin** | User Role Promotion CLI | **BROKEN / VULNERABLE** | `scripts/promote-admin.ts:18` | Raw string interpolation leads to D1 SQL injection. |
| **Automation**| Background Auto-Apply Scheduler | **UI ONLY / ORPHANED** | `src/components/AutomationSettingsTab.tsx` | 464 lines of code unmounted in App.tsx. |
| **Integrations**| ATS Webhook / Source Monitor | **UI ONLY / ORPHANED** | `src/components/IntegrationsTab.tsx` | Unmounted and inaccessible from main navigation. |

---

## 4. CRITICAL FINDINGS & SECURITY VULNERABILITIES

### 4.1 Financial & Payment Backdoors

#### [VULN-01] Free Plan Upgrade Authorization Backdoor (Severity: P0 — Critical)
* **File & Lines:** `worker/index.ts:675–714` & `server.ts:1055–1103`
* **Vulnerability Description:** The route `POST /api/subscription/upgrade` was implemented to record plan changes, but it performs **no billing gateway charge or receipt validation**. Any user authenticated with a standard free account can send an HTTP POST:
  ```json
  POST /api/subscription/upgrade
  Authorization: Bearer <user_jwt>
  Content-Type: application/json

  {
    "planId": "black",
    "billingInterval": "annual"
  }
  ```
  The server responds with HTTP 200, updates the user's subscription record in Cloudflare D1/SQLite to `black`, logs an audit entry, and grants lifetime access without collecting money.
* **Impact:** Immediate loss of revenue. Any user with DevTools or curl can unlock Black Elite subscriptions for free.
* **Remediation:** Remove client access to `/api/subscription/upgrade`. Plan activations must only happen via validated payment webhooks or verified gateway verification routes.

#### [VULN-02] Razorpay Payment Signature Verification Omission (Severity: P0 — Critical)
* **File & Lines:** `worker/index.ts:737–767`
* **Vulnerability Description:** The endpoint `POST /api/subscription/razorpay/verify` accepts payment details from the frontend:
  ```typescript
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planId = 'pro', billingInterval = 'monthly' } = body;
  if (!razorpay_order_id || !razorpay_payment_id) {
    return c.json({ success: false, error: 'Missing payment confirmation parameters.' }, 400);
  }
  // Signature is NEVER verified! Immediately grants subscription:
  await store.updateUserSubscription(user.id, validPlan, billingInterval);
  ```
  In `server.ts:1169–1175`, signature verification is wrapped in `if (secret && razorpay_signature)`. If the secret is omitted or if `razorpay_signature` is not sent, it falls through to activate!
* **Impact:** Any client can fabricate fake `razorpay_order_id` and `razorpay_payment_id` strings and receive upgraded account status.
* **Remediation:** Enforce HMAC SHA-256 signature verification over `${razorpay_order_id}|${razorpay_payment_id}` using `c.env.RAZORPAY_KEY_SECRET`. Reject requests immediately if secret is missing or signature does not match.

#### [VULN-03] Missing Webhooks & Subscription Lifecycle Handlers (Severity: P0 — Critical)
* **File & Lines:** Entire `worker/` and `server/` trees.
* **Vulnerability Description:** There is no webhook listener (`/api/subscription/webhook` or `/api/webhooks/razorpay`). If a user's credit card fails on recurring billing, the subscription never expires in D1. If a payment is completed asynchronously via UPI or net banking, the subscription is never activated.
* **Impact:** Infinite free access following first cancellation or payment failure; manual support overhead for asynchronous payments.
* **Remediation:** Implement standard Razorpay webhook listener with signature verification supporting `subscription.charged`, `subscription.cancelled`, and `payment.failed`.

---

### 4.2 Authentication, RBAC & Credential Security

#### [VULN-04] Fake Password Recovery & Missing Email Infrastructure (Severity: P1 — High)
* **File & Lines:** `worker/index.ts:245–255`
* **Vulnerability Description:**
  ```typescript
  app.post('/api/auth/recover-password', async (c) => {
    const { email } = await c.req.json();
    if (!email || !validateEmail(email)) {
      return c.json({ success: false, error: 'Valid email is required.' }, 400);
    }
    return c.json({
      success: true,
      message: 'If an account exists with this email, password reset instructions have been sent.',
    });
  });
  ```
  No token is generated. No record is written to a reset table. No email service (Resend, SendGrid, Mailgun) is integrated. Furthermore, no `/api/auth/reset-password` endpoint exists.
* **Impact:** Any user who loses their password cannot recover their account.
* **Remediation:** Create `password_reset_tokens` table in D1, integrate Resend/SendGrid API via Cloudflare Worker bindings, generate cryptographically secure random tokens with 30-minute expiry, and create the reset confirmation endpoint.

#### [VULN-05] SQL Injection in Administrative CLI Provisioning (Severity: P1 — High)
* **File & Lines:** `scripts/promote-admin.ts:18, 28`
* **Vulnerability Description:**
  ```typescript
  const email = process.argv[2]?.trim().toLowerCase();
  // ...
  const query = `UPDATE users SET role = 'admin', updated_at = datetime('now') WHERE email = '${email}';`;
  execSync(`npx wrangler d1 execute applywise-db --remote --command="${query}"`, ...);
  ```
  Passing an argument like `attacker@example.com'; DROP TABLE users; --` executes arbitrary SQL against the production Cloudflare D1 database.
* **Impact:** Database corruption or privilege escalation through developer/admin scripts.
* **Remediation:** Use parameterized queries or strict regex validation (`/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/`) before executing CLI commands.

---

### 4.3 Data Integrity & Tier Truncation

#### [VULN-06] Top-Tier "Black" Plan User Truncation in Usage Enforcement (Severity: P1 — High)
* **File & Lines:** `worker/usageEnforcement.ts:54–56`
* **Vulnerability Description:**
  ```typescript
  const sub = await store.getUserSubscription(userId);
  const isPro = isPerm || (sub && sub.planId === 'pro' && sub.status === 'active');
  const planId: 'free' | 'pro' | 'black' = isPro ? 'pro' : 'free';
  ```
  Notice that `sub.planId === 'black'` is completely omitted. A user paying $49/mo for Black Elite will have `isPro = false` and `planId = 'free'`. When they check usage stats or upload resumes, the system treats them as a Free plan user.
* **Impact:** Paying premium customers are blocked from uploading resumes or applications.
* **Remediation:** Change check to:
  ```typescript
  const isPaid = isPerm || (sub && (sub.planId === 'pro' || sub.planId === 'black') && sub.status === 'active');
  const planId = isPerm ? 'pro' : (sub?.planId || 'free');
  ```

#### [VULN-07] Deceptive Automated Application Simulation (Severity: P1 — High)
* **File & Lines:** `worker/index.ts:1711–1712` vs `worker/submissionAdapter.ts:37–104`
* **Vulnerability Description:** `submissionAdapter.ts` was written under an honest design principle: when direct employer ATS APIs are not connected, return `GUIDED_COMPLETION_REQUIRED`. However, in `worker/index.ts`, the `/api/jobs/:id/apply-auto` endpoint overrides this:
  ```typescript
  let finalStatus: ApplicationStatus = 'SUBMITTED';
  let note = 'Application successfully processed through verified employer connector.';
  // ...
  matchScore: 90
  ```
  No HTTP request is sent to any employer ATS. The user is told their application was successfully submitted when in reality it exists only in ApplyVise AI's database.
* **Impact:** Severe candidate harm. Candidates assume their application was received by the employer when it was not.
* **Remediation:** Align `worker/index.ts` with `submissionAdapter.ts`. Mark applications as `READY_TO_SUBMIT` or `GUIDED_DIRECT` and provide the user with the direct link and tailored package.

#### [VULN-08] Administrator Overview Silent Database Outage Masking (Severity: P2 — Medium)
* **File & Lines:** `worker/index.ts:2574–2578`
* **Vulnerability Description:**
  ```typescript
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return c.json({
      success: true,
      stats: { totalUsers: 0, totalAdmins: 0, totalApplications: 0, totalResumes: 0, totalVacancies: 0, activeSubscriptions: 0 },
      warning: `Graceful fallback: ${msg}`
    });
  }
  ```
  If D1 experiences an outage or query syntax error, the admin API returns `success: true` with all counts zeroed out.
* **Impact:** Administrators are misled into believing there are 0 users, obscuring critical infrastructure errors.
* **Remediation:** Return HTTP 500 with `success: false` and the specific error details.

---

## 5. DATABASE SCHEMA & MIGRATION MATRIX

ApplyVise AI uses 8 sequential SQL migrations for Cloudflare D1:

| Migration | File | Core Tables / Alters | Verification Status |
| :--- | :--- | :--- | :--- |
| **0001** | `0001_initial_schema.sql` | `users`, `user_sessions`, `user_resumes`, `applications`, `user_preferences`, `audit_logs` | Fully functional; base schema. |
| **0002** | `0002_subscriptions_and_ai.sql` | `subscriptions`, `ai_usage_logs` | Active; tracks limits. |
| **0003** | `0003_live_jobs_cache.sql` | `live_jobs_cache` | Used for vacancy indexing. |
| **0004** | `0004_career_twin_and_integrity.sql`| `career_twin_nodes`, `career_twin_skills`, `application_evidence` | Ground-truth twin support. |
| **0005** | `0005_job_ingestion_and_resilience.sql`| `cached_vacancies`, `ingestion_runs` | Active job caching. |
| **0006** | `0006_career_intelligence_and_fit_evidence.sql`| `career_intelligence_reports`, `fit_evidence_maps`, `interview_prep_reports` | Interview intelligence storage. |
| **0007** | `0007_founder_profile.sql` | `founder_profile` | Founder bio and LinkedIn link. |
| **0008** | `0008_candidate_fact_registry.sql` | `candidate_facts`, `candidate_fact_verifications` | Candidate fact registry storage. |

### Database Integrity Concerns
* **No `password_reset_tokens` table:** No schema exists to persist one-time password recovery tokens.
* **No `webhooks_log` table:** No schema exists for idempotency keys from payment gateways.
* **Missing Index on `applications.duplicateKey`:** Potential duplicate insertion race conditions during rapid concurrent requests.

---

## 6. DEAD CODE & ORPHANED FRONTEND COMPONENTS

During inspection of `src/components/`, **8 major legacy tab components** were found to be completely unreferenced in `src/App.tsx`. They constitute dead code left behind from an earlier architectural iteration:

| Component | Lines of Code | Original Purpose | Current App State |
| :--- | :--- | :--- | :--- |
| `AutomationSettingsTab.tsx` | 464 lines | Emergency stop, scoring weights, auto-apply controls | **Orphaned / Unmounted** |
| `IntegrationsTab.tsx` | 106 lines | Source adapter health, ATS webhook testing | **Orphaned / Unmounted** |
| `JobDiscoveryTab.tsx` | 363 lines | Legacy job card search interface | **Orphaned / Unmounted** |
| `ReportsTab.tsx` | 172 lines | Weekly application metrics and chart summaries | **Orphaned / Unmounted** |
| `TrackerTab.tsx` | 260 lines | Legacy drag-and-drop Kanban application tracker | **Orphaned / Unmounted** |
| `JobDetailModal.tsx` | 207 lines | Floating popup for job description view | **Orphaned / Replaced by Drawer** |
| `OverviewTab.tsx` | 365 lines | Legacy dashboard overview tab | **Orphaned / Replaced by Command Center** |
| `QueueTab.tsx` | 230 lines | Application submission queue | **Orphaned / Unmounted** |
| **Total Dead Frontend Code** | **2,167 lines** | - | **Accumulated Technical Debt** |

---

## 7. MODERN CAREER OPERATING SYSTEM FEATURE GAP ANALYSIS

To evaluate ApplyVise AI as a premium SaaS platform, we conducted a gap analysis against top market solutions (Teal, Simplify, Huntr, Jobscan):

| Functional Category | Current Implementation Reality | Gap Description & Industry Standard | Priority |
| :--- | :--- | :--- | :--- |
| **1. Browser Extension for Job Capture** | None. Users must copy/paste job URLs or use manual modal. | Modern tools provide a Chrome/Edge extension to save jobs directly from LinkedIn, Indeed, Greenhouse, and Lever in 1 click. | **P1** |
| **2. Email Job Alert Digest** | In-app notification page only. | Users expect daily/weekly email digests of verified 90%+ match opportunities. | **P2** |
| **3. Multi-Format Resume Export** | Client-side print dialog. | Needs server-side PDF and DOCX export with ATS-compatible clean typography and zero CSS print breakage. | **P1** |
| **4. Real-Time Application Sync** | Manual status change dropdown. | Needs automated Gmail/Outlook parser to detect rejection, interview invite, or offer emails and auto-advance status. | **P2** |
| **5. Salary Intelligence & Benchmarking**| Raw salary string from job posting. | Missing localized cost-of-living adjustments, percentile distributions (25th/50th/75th), and negotiation scripts. | **P2** |
| **6. Multi-Profile / Role Targets** | Single profile schema in D1. | Senior professionals frequently maintain distinct personas (e.g., "Engineering Manager" vs "Staff Platform Engineer"). | **P1** |
| **7. Team & Referral Network Graph** | UI canvas visualizes dummy nodes. | Real platform should map 1st/2nd degree connections at target companies to request referrals. | **P2** |
| **8. Interactive Mock Interview Voice AI** | Static STAR prompt generator. | Audio/WebRTC conversational interview practice with instant pacing and content feedback. | **P3** |
| **9. Granular ATS Score Breakdown** | Single composite match score (0-100%). | Detailed breakdown across hard skills, years of experience, education, leadership, and domain keywords. | **P1** |
| **10. Transactional Email System** | None. | Missing welcome emails, password resets, application confirmations, and weekly digests. | **P0** |
| **11. GDPR / CCPA Data Export & Deletion**| Hard delete endpoint for user, but no portable ZIP export. | Missing one-click "Download My Complete Data" (resumes, facts, applications, audit logs) as required by privacy regulations. | **P2** |
| **12. Multi-Currency Global Pricing** | Hardcoded INR for Razorpay (`₹1,999`, `₹4,999`). | Global users require USD / EUR via Stripe or LemonSqueezy with local tax calculation. | **P1** |

---

## 8. QUALITY ENGINEERING, TEST SUITE & TYPE SAFETY

### 8.1 Automated Test Execution Results (`npm test`)
* **Test Command:** `tsx --test --test-concurrency=1 src/utils/rules.test.ts tests/*.test.ts --run`
* **Execution Time:** 17.38 seconds
* **Test Suites:** **9 suites passed, 0 failed**
* **Total Tests:** **298 passed, 0 failed, 0 skipped**
* **Key Suites Verified:**
  1. `src/utils/rules.test.ts`: Duplicate keys, hard eligibility, match scoring, state machine (6 tests passed).
  2. `tests/career_opportunity_universe.test.ts`: 3D universe projection, tier styling, list toggle (8 tests passed).
  3. `tests/admin_security.test.ts`: Admin RBAC, self-demotion block, console routing (6 tests passed).
  4. `tests/founder_profile.test.ts`: Verified profile fields, photo upload, SQLite lifecycle (4 tests passed).
  5. `tests/ai_integrity_and_candidate_facts.test.ts`: 19 end-to-end anti-hallucination scenarios (19 tests passed).
  6. `tests/auth_desktop_layout_collapse.test.ts`: Desktop 5/12 column fix, full-width inputs (6 tests passed).
  7. `tests/auth_resilience.test.ts`: Google button container isolation, error boundaries (8 tests passed).
  8. `tests/pdf_worker.test.ts`: PDF.js text extraction, zero-hallucination heuristic parsing (10 tests passed).
  9. `tests/production_backend_repairs.test.ts`: D1 admin queries, token auth, free plan limits (231 tests passed).

### 8.2 Responsive Layout Verification (Playwright)
* **Test Script:** `node tests/playwright_responsive_auth.js`
* **Result:** **8 of 8 Viewports Passed** with zero horizontal overflow:
  * Mobile Portrait: 360 × 800 (Overflow: 0px)
  * Mobile Standard: 390 × 844 (Overflow: 0px)
  * Tablet Portrait: 768 × 1024 (Overflow: 0px)
  * Tablet Landscape: 1024 × 768 (Overflow: 0px)
  * Laptop Standard: 1366 × 768 (Overflow: 0px)
  * Desktop FHD: 1440 × 900 (Overflow: 0px)
  * Target Reported Viewport: 1914 × 948 (Overflow: 0px)
  * Desktop Ultra: 1920 × 1080 (Overflow: 0px)

### 8.3 Static Analysis & Type Safety (`tsc --noEmit`)
* **Status:** **FAILED with 45 strict TypeScript errors**
* **Root Causes:**
  1. **Resume Engine Property Undefined Handling (14 errors):** Missing optional chaining or null-guards for `tailored.tailoredExperiences` and `tailored.targetedSkills` in `server/resumeEngine.ts`, `worker/resumeEngine.ts`, and `src/utils/rules.ts`.
  2. **Candidate Fact Registry Types (4 errors):** Missing `year` property on `EducationItem` and `issuer` on `CertificationItem` in `src/utils/candidateFactRegistry.ts` and `src/utils/copilotEngine.ts`.
  3. **Modal Component Props (8 errors):** `ApplicationDetailModal.tsx`, `ResumePreviewModal.tsx`, and `ResumeStudioTab.tsx` dereferencing optional resume fields without guards.
  4. **Test Fixture Mismatches (7 errors):** In `tests/ai_integrity_and_candidate_facts.test.ts`, string values passed where salary object or enum was expected.
  5. **D1 Store Digital Twin Types (1 error):** In `worker/d1Store.ts:1296`, `startDate: string | undefined` not assignable to strict `string`.

---

## 9. PRIORITIZED REMEDIATION ROADMAP

### Phase 1: Immediate Launch Blockers (P0 — Critical)
| Task ID | Item | Scope / File | Size |
| :--- | :--- | :--- | :--- |
| **REM-01** | Eliminate Free Plan Upgrade Backdoor | Remove unauthenticated upgrade path in `worker/index.ts:675` and `server.ts:1055`. | **S** |
| **REM-02** | Implement Razorpay HMAC-SHA256 Signature Verification | Cryptographically verify all payment callbacks against `RAZORPAY_KEY_SECRET` in `worker/index.ts:737`. | **S** |
| **REM-03** | Fix Black Tier User Usage Truncation | Include `sub.planId === 'black'` in `worker/usageEnforcement.ts:55`. | **XS** |
| **REM-04** | Fix Deceptive Auto-Apply Status | Replace fake `SUBMITTED` state in `worker/index.ts:1711` with truthful `GUIDED_DIRECT` handoff. | **S** |
| **REM-05** | Fix Admin Provisioning SQL Injection | Use strict regex or parameterized D1 query in `scripts/promote-admin.ts`. | **XS** |

### Phase 2: Core Platform Stability (P1 — High)
| Task ID | Item | Scope / File | Size |
| :--- | :--- | :--- | :--- |
| **REM-06** | Resolve All 45 TypeScript Compiler Errors | Add optional chaining and fix interface alignment across engines and modals. | **M** |
| **REM-07** | Implement Password Reset Infrastructure | Create migration for reset tokens, integrate transactional email provider (Resend), and add `/api/auth/reset-password`. | **L** |
| **REM-08** | Implement Payment Webhook Handler | Add `/api/subscription/webhook` to handle asynchronous activations, refunds, and cancellations. | **M** |
| **REM-09** | Remove 2,167 Lines of Orphaned Dead Code | Safely delete unused legacy tabs (`AutomationSettingsTab`, `TrackerTab`, etc.) or re-integrate into navigation. | **M** |

### Phase 3: Commercial SaaS Hardening (P2 — Medium)
| Task ID | Item | Scope / File | Size |
| :--- | :--- | :--- | :--- |
| **REM-10** | Unify Cloudflare Worker & Node Backends | Extract shared route handlers and schemas to prevent feature drift. | **XL** |
| **REM-11** | Fix Admin Overview Error Concealment | Return proper HTTP 500 when D1 database is unreachable. | **XS** |
| **REM-12** | Client-Side PDF/DOCX Export Generator | Implement clean, ATS-formatted PDF generation using PDFKit or server-side headless Chromium. | **L** |
| **REM-13** | Multi-Profile / Multi-Role Career Twin | Support targeting multiple distinct roles with distinct fact subsets. | **XL** |

---

## 10. LAUNCH READINESS SCORECARD

| Dimension | Score (0–100) | Evaluation & Evidence |
| :--- | :---: | :--- |
| **1. Authentication Security** | 65 | PBKDF2 and Google GIS token verification work well, but password recovery is completely simulated and signups lack email verification. |
| **2. Authorization & RBAC** | 80 | User/Admin role enforcement is robust on API routes; self-demotion is protected. |
| **3. Financial & Billing Integrity** | 10 | **Critical Failure.** Free tier upgrade backdoor and unverified payment signatures allow anyone to bypass billing. |
| **4. Database & Migrations** | 85 | 8 well-structured D1 migrations with audit logging; missing reset tokens and webhook logs. |
| **5. AI & Prompt Truthfulness** | 90 | Candidate Fact Registry and disciplinary gap capping strictly reject hallucinated employers and metrics. |
| **6. Job Search & Eligibility Engine** | 85 | Hard eligibility filters, exclusions, and multi-source job aggregators are genuinely functional. |
| **7. Application Lifecycle Truthfulness**| 40 | `worker/submissionAdapter.ts` is truthful, but `/api/jobs/:id/apply-auto` fabricates fake `SUBMITTED` receipts. |
| **8. Frontend Visual Design & UX** | 92 | Premium glassmorphism, responsive across all 8 viewports, high-fidelity Three.js canvases. |
| **9. Frontend Code Health** | 50 | 2,167 lines of unmounted dead code; 45 strict TypeScript compiler errors. |
| **10. Responsive Resilience** | 100 | Fully verified via automated Playwright tests from 360px to 1920px. |
| **11. Performance & Bundle Efficiency** | 88 | Vite production build finishes in ~630ms; assets are cleanly chunked. |
| **12. Test Coverage & CI Readiness** | 85 | 298 passing tests across 9 comprehensive suites; zero test failures. |
| **13. Observability & Logging** | 60 | Audit logs exist in D1, but admin overview hides real DB errors via zero fallbacks. |
| **14. User Privacy & Compliance** | 65 | Hard deletion exists, but data export (GDPR Art. 20) is missing. |
| **15. Competitive Feature Completeness** | 55 | Missing browser extension, transactional email digests, and multi-role target profiles. |
| **OVERALL WEIGHTED SCORE** | **54 / 100** | **NO-GO FOR PRODUCTION LAUNCH until Phase 1 blockers are resolved.** |

---

## 11. TOP 20 ISSUES RANKED BY CRITICALITY

1. **[P0] Free Plan Self-Upgrade Backdoor:** `worker/index.ts:675` allows any user to POST `{ planId: "black" }` and gain free lifetime elite access.
2. **[P0] Razorpay Signature Check Bypass:** `worker/index.ts:737` activates subscriptions without verifying HMAC-SHA256 signatures.
3. **[P0] Missing Payment Webhooks:** `worker/index.ts` lacks webhook endpoints; failed auto-renewals remain active indefinitely.
4. **[P1] Fake Password Recovery:** `worker/index.ts:245` claims password reset was sent, but sends nothing and has no reset endpoint.
5. **[P1] Black Tier Usage Block:** `worker/usageEnforcement.ts:55` ignores `black` tier, subjecting paying elite users to free limits.
6. **[P1] Deceptive Auto-Apply Receipt:** `worker/index.ts:1711` marks external jobs as `SUBMITTED` without sending applications.
7. **[P1] SQL Injection in CLI:** `scripts/promote-admin.ts:18` concatenates raw CLI inputs into remote D1 update strings.
8. **[P1] 45 Strict TypeScript Errors:** `npm run lint` fails on 45 undefined property dereferences and type mismatches.
9. **[P2] Admin Overview Error Concealment:** `worker/index.ts:2574` returns `totalUsers: 0` on DB errors, hiding outages.
10. **[P2] Dual Backend Feature Drift:** `/api/auth/change-email` exists in Worker but is absent in Node `server.ts`.
11. **[P2] Unmounted Orphaned Tabs:** Over 2,100 lines of dead code in `AutomationSettingsTab`, `TrackerTab`, etc.
12. **[P2] Unrevoked JWT Sessions:** Token deletion removes D1 session, but stateless JWTs remain valid until exp.
13. **[P2] Missing Transactional Emailer:** Zero email delivery infrastructure (Resend/SendGrid) configured in Worker.
14. **[P2] Lack of ATS-Ready PDF Export:** Resume download relies on browser window print rather than clean vector PDF.
15. **[P2] Unindexed Duplicate Application Keys:** High-concurrency submissions can cause duplicate application entries.
16. **[P3] Hardcoded INR Currency:** Razorpay is locked to INR; global customers cannot pay in USD/EUR.
17. **[P3] Single Persona Limitation:** Candidate can only maintain 1 target title and skillset at a time.
18. **[P3] Missing GDPR Data Portability:** No mechanism for users to download an archive of their data.
19. **[P3] Unbounded Gemini Calls in Node Backend:** `server.ts:423` lacks usage limit checks present in Worker.
20. **[P3] Static Mock Network Graph:** `CareerNetworkVisual.tsx` uses simulated nodes rather than real contacts.

---

## 12. TOP 20 MISSING HIGH-VALUE PRODUCT FEATURES

1. **One-Click Browser Extension:** Save jobs directly from LinkedIn, Indeed, Glassdoor, Greenhouse, and Lever.
2. **Transactional Email Engine:** Send real password resets, application confirmations, and weekly digests.
3. **Daily Curated Opportunity Digest:** Personalized email delivered every morning with top 3 verified 90%+ match roles.
4. **Native ATS-Engineered PDF/DOCX Exporter:** Pixel-perfect, single-page vector PDFs formatted for Taleo/Workday.
5. **Multi-Target Persona Management:** Create distinct resumes for "Engineering Lead", "Architect", or "Senior IC".
6. **Application Status Email Sync:** Automated mailbox integration detecting interview invites or rejection notices.
7. **Localized Salary & Equity Benchmarking:** Compensation percentiles by city, tier, and equity grant models.
8. **Stripe & Multi-Currency Checkout:** Seamless international payments in USD, EUR, GBP, and CAD.
9. **Interactive Audio Voice Mock Interview:** Conversational voice AI providing real-time pacing and answer evaluation.
10. **Referral Intelligence Engine:** Match candidate's LinkedIn network with open roles at target companies.
11. **GDPR One-Click Data Archive:** Export complete user profile, facts, resumes, and logs as a downloadable ZIP.
12. **Company Culture & Tech Stack Profiler:** Deeper insight into deployment frequency, tech debt, and Glassdoor trends.
13. **Follow-Up & Thank You Letter Generator:** Automated contextual email drafts customized to interview questions.
14. **Granular ATS Match Breakdown:** Independent scoring dials for hard skills, experience, education, and domain fit.
15. **Custom Domain Portfolios:** Public verified candidate profile links hosted on vanity URLs.
16. **Offer Comparison & Negotiation Simulator:** Side-by-side financial compensation comparison with AI negotiation tips.
17. **Team / Recruiter Direct Inquiries:** Allow verified employers to discover candidate digital twins.
18. **Portfolio & GitHub Deep Ingestion:** Parse GitHub repositories and live websites into verified candidate facts.
19. **Skills Gap Learning Pathways:** Recommended courses and certifications to bridge identified missing requirements.
20. **Two-Factor Authentication (2FA / TOTP):** Secure authenticator app support for candidate account protection.

---

## 13. PRE-LAUNCH GO/NO-GO VERDICT

### Decision: **STRICT NO-GO**
ApplyVise AI contains extraordinary engineering accomplishments in its candidate fact registry, anti-hallucination resume tailoring, and glassmorphic UI. However, **the application cannot be released to commercial users in its current state** due to:
1. **Critical financial bypasses** that allow any user to obtain free subscriptions and spoof payments.
2. **Critical user lockout** due to simulated, non-functional password recovery.
3. **Severe candidate deception** in the automated application flow.

### Mandatory Pre-Launch Checklist:
- [ ] Fix `POST /api/subscription/upgrade` authorization backdoor.
- [ ] Implement Razorpay HMAC-SHA256 signature verification.
- [ ] Correct Black Tier plan checking in `usageEnforcement.ts`.
- [ ] Replace fake auto-apply `SUBMITTED` status with truthful `GUIDED_DIRECT` handoff.
- [ ] Resolve all 45 TypeScript compiler errors.
- [ ] Implement genuine password reset with token migration and email provider integration.
