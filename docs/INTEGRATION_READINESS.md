# APPLYVISE AI — INTEGRATION READINESS
**Document Reference:** IR-2026-v2  
**Date:** November 14, 2026  
**Auditor:** DevOps & Systems Integration Lead  

---

## 1. External Integration Status

| Integration | Provider | Role in Product | Auth Method | Sandbox/Dev Status | Production Prerequisite |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **Generative AI** | Google Gemini API | Resume extraction, tailoring, Copilot, email generation | API Key (`GEMINI_API_KEY`) | **VERIFIED** | Valid Google Cloud Project API key configured in Cloudflare environment secrets. |
| **Payment Gateway** | Razorpay | Subscription orders, card/UPI checkout, webhooks | Key ID & Secret (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`) | **VERIFIED (Sandbox)** | Production Razorpay webhook secret configured in Cloudflare secrets. |
| **Single Sign-On** | Google Identity Services | One-click login and registration | Client ID (`GOOGLE_CLIENT_ID`) | **VERIFIED** | Authorized JavaScript origins set to `https://applyvise-ai.ayushprakash0021.workers.dev`. |
| **Job Feed APIs** | Remotive, Jobicy, Arbeitnow | Public live remote tech jobs | Public REST endpoints | **VERIFIED** | Public Internet egress enabled (standard Workers fetch). |
| **ATS Job Boards** | Greenhouse, Lever, SmartRecruiters, Workable | Employer vacancy detail extraction | Public ATS endpoints | **VERIFIED** | Validated via `tests/hr_discovery_repair.test.ts`. |
| **Candidate Mailbox** | Google Workspace / Outlook | Direct HR Outreach email sending | OAuth 2.0 Bearer Token | **EXTERNALLY READY** | Requires user one-time OAuth consent in Outreach settings. |

---

## 2. Fallback & Failure Resilience
- If the Gemini API is unreachable, rule-based deterministic parsers and evaluation algorithms execute seamlessly without throwing unhandled exceptions.
- If an employer ATS changes its HTML structure, the GCDE records the sync failure in `job_sources` and alerts administrators without disrupting the candidate job search feed.
- If Razorpay order creation fails or returns 404, the application routes the user to the branded ApplyVise 404 page while preserving original GIF animations.
