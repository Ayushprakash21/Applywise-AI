# APPLYVISE AI — END-TO-END TEST REPORT
**Document Reference:** E2E-2026-v2  
**Test Suite:** Complete Automated Regression & Lifecycle Verification  
**Total Tests:** 469 passed / 0 failed / 40 suites  
**Execution Date:** November 14, 2026  

---

## 1. 20 Mandatory Candidate User Journeys Verified

| # | User Journey Flow | Verification Criteria | Status |
| :-: | :--- | :--- | :---: |
| 1 | **Register & Authenticate** | PBKDF2 hashing, bearer token issuance, session persistence | **PASS** |
| 2 | **Complete Career Profile** | Profile form updates, avatar cropping, full name / contact storage | **PASS** |
| 3 | **Upload Master Resume** | Multi-part file upload, 5MB cap, DOCX/PDF signature validation | **PASS** |
| 4 | **Parse Resume** | Structural parser extracts clean roles, companies, and responsibilities | **PASS** |
| 5 | **Review Extracted Facts** | Atomic fact generation into `CandidateFactRegistry` | **PASS** |
| 6 | **Correct Inaccurate Fact** | Candidate inline editing of role, company, dates, current toggle | **PASS** |
| 7 | **Search Opportunities** | Live GCDE feed queries, keyword search, location filtering | **PASS** |
| 8 | **View Job Details** | Requirement parsing, remote/hybrid badge normalization | **PASS** |
| 9 | **Evaluate Job Match (COME)** | 6-dimension explainable scoring, mandatory qualification penalties | **PASS** |
| 10 | **Tailor ATS Resume** | Grounded bullet points mapped to immutable profile experiences | **PASS** |
| 11 | **Preview Document** | Side-by-side ATS paper layout, zero empty bullets, truthfulness badge | **PASS** |
| 12 | **Download DOCX** | OpenXML generation, 10-category pre-download validation pass | **PASS** |
| 13 | **Create Application Record** | Vacancy-to-application link, initial status `OPPORTUNITY_SELECTED` | **PASS** |
| 14 | **Track Application** | 12-stage lifecycle transitions, candidate consent, timeline logs | **PASS** |
| 15 | **Prepare for Interview** | 100-point STAR interview questions grounded in verified achievements | **PASS** |
| 16 | **Draft Recruiter Outreach** | Verified HR contact discovery, grounded email studio generation | **PASS** |
| 17 | **Manage Notifications** | Real-time event notifications, category filters, mark-all-read | **PASS** |
| 18 | **Change Account Preferences** | Timezone selection, target roles, daily application limit | **PASS** |
| 19 | **View Membership & Quotas** | Free vs Pro vs Black Elite vs Founder tier entitlements | **PASS** |
| 20 | **Complete Sandbox Checkout** | Razorpay order creation, payment signature verification | **PASS** |

---

## 2. Administrator & Recruiter Workflows Verified
- **Admin Authentication**: Non-admin users are blocked with HTTP 403.
- **Admin Provisioning**: Administrative plan assignment, suspension, and lifetime grants.
- **GCDE Synchronization**: Verified employer career site synchronization and ATS detection.
- **Tamper-Evident Audits**: System event logging for security and compliance audits.
- **Recruiter Review Lens**: Multi-dimension candidate audit without private recruiter leak.
