# APPLYVISE AI — PRODUCT FEATURE INVENTORY
**Classification:** CTO Master Technical Audit  
**Version:** 2.4.0-PROD  
**Date:** November 14, 2026  
**Auditor:** Autonomous CTO & Principal Software Architect  

---

## 1. Candidate Workspace Modules

| Feature Name | Purpose | Frontend Implementation | Backend Implementation | Database Dependencies | API Endpoints | Tests | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Career Desk** | Executive command centre answering "What should I do next?" with real pipeline metrics and priority actions. | `src/components/CareerDesk.tsx`, `CareerCommandCenter.tsx` | `server.ts` & `worker/index.ts` | `applications`, `user_profiles`, `cached_vacancies` | `GET /api/dashboard/summary`, `GET /api/dashboard/priority-actions` | `career_command_center.test.ts`, `part3_premium_experience_and_design_system.test.ts` | **IMPLEMENTED AND VERIFIED** |
| **Opportunity Radar** | 3D visual opportunity universe & real-time live vacancy feed with country/location filters and vacancy inspection. | `OpportunityRadar.tsx`, `OpportunityRadar3D.tsx`, `VacancyFeed.tsx` | `server/jobDiscovery.ts`, `worker/jobDiscovery.ts` | `cached_vacancies`, `live_jobs_cache`, `opportunity_signals` | `GET /api/jobs`, `GET /api/jobs/signals`, `POST /api/jobs/refresh-live` | `3d_career_opportunity_universe.test.ts`, `global_career_discovery_engine.test.ts` | **IMPLEMENTED AND VERIFIED** |
| **Application Control** | 12-stage candidate lifecycle governance, candidate consent, legal disclosures, and timeline audit. | `ApplicationControl.tsx`, `ApplicationsPage.tsx` | `server.ts`, `worker/index.ts` | `applications`, `audit_logs` | `GET /api/applications`, `POST /api/applications/:id/transition`, `POST /api/applications/:id/submit` | `career_intelligence_and_fit_evidence.test.ts`, `submissionAdapter.test.ts` | **IMPLEMENTED AND VERIFIED** |
| **Interview Studio** | 100-point STAR interview preparation grounded strictly in verified candidate achievements. | `InterviewStudio.tsx` | `interviewEvaluator.ts`, `server.ts`, `worker/index.ts` | `interview_mock_sessions`, `candidate_facts` | `GET /api/interview/sessions`, `POST /api/interview/evaluate`, `POST /api/interview/sessions` | `runtime_parity_and_interview_eval.test.ts` | **IMPLEMENTED AND VERIFIED** |
| **Recruiter Review** | Multi-dimension recruiter lens evaluating seniority, qualification alignment, and ATS pass probability. | `RecruiterReview.tsx`, `RecruiterReviewPage.tsx` | `server.ts`, `worker/index.ts` | `recruiter_review_audits`, `candidate_facts` | `GET /api/applications/:id/recruiter-review`, `POST /api/applications/:id/recruiter-review` | `runtime_parity_and_interview_eval.test.ts` | **IMPLEMENTED AND VERIFIED** |
| **Career Atlas** | Visual multi-track trajectory mapper with ground-truth skill bridges and learning paths. | `CareerAtlas.tsx` | `server.ts`, `worker/index.ts` | `career_trajectories`, `candidate_facts` | `GET /api/career-atlas/trajectories`, `POST /api/career-atlas/trajectories` | `runtime_parity_and_interview_eval.test.ts` | **IMPLEMENTED AND VERIFIED** |
| **AI HR Outreach** | Direct HR contact discovery, 8-step email verification, and grounded Gemini email studio. | `HrOutreachPage.tsx`, `HrOutreachStudio.tsx` | `server.ts`, `worker/index.ts` | `company_directory`, `user_imported_jobs` | `GET /api/hr-outreach/contacts`, `POST /api/hr-outreach/preview`, `POST /api/hr-outreach/send` | `hr_outreach_and_direct_apply.test.ts`, `hr_discovery_repair.test.ts` | **IMPLEMENTED AND VERIFIED** |
| **Career Profile & Facts** | Authoritative candidate profile and atomic fact registry with inline experience editing. | `ProfileTab.tsx`, `ProfileIdentityComponent.tsx` | `server.ts`, `worker/index.ts` | `user_profiles`, `candidate_facts` | `GET /api/profile`, `PUT /api/profile`, `GET /api/facts`, `POST /api/facts/verify` | `ai_integrity_and_candidate_facts.test.ts`, `profile_photo_crop_editor.test.ts` | **IMPLEMENTED AND VERIFIED** |
| **Resume Studio & ATS Document Studio** | Side-by-side ATS preview, dual-runtime DOCX export, and 10-category pre-download validation. | `ResumeStudioTab.tsx`, `ResumePreviewModal.tsx` | `server/resumeEngine.ts`, `worker/resumeEngine.ts` | `resume_documents`, `resume_versions` | `GET /api/resumes`, `POST /api/resumes/tailor`, `GET /api/resumes/:appId/export/docx` | `ats_employment_history_integrity.test.ts`, `universal_resume_intelligence.test.ts` | **IMPLEMENTED AND VERIFIED** |
| **Skills & Gap Report** | Factual synthesis comparing candidate verified skills against active vacancy requirements. | `CareerIntelligenceReport.tsx` | `server.ts`, `worker/index.ts` | `candidate_facts`, `cached_vacancies` | `GET /api/facts`, `GET /api/vacancies` | `career_intelligence_and_fit_evidence.test.ts` | **IMPLEMENTED AND VERIFIED** |
| **AI Autopilot Studio** | Autonomous supervised job application agent with daily (3/day) and monthly subscription caps. | `AiAutopilotStudio.tsx` | `server.ts`, `worker/index.ts` | `automation_settings`, `applications` | `GET /api/autopilot/summary`, `GET /api/autopilot/jobs`, `POST /api/autopilot/consent` | `ai_autopilot_agent.test.ts` | **IMPLEMENTED AND VERIFIED** |
| **Notifications** | Real-time event notifications, category filters, and read/unread state management. | `NotificationsPage.tsx` | `server.ts`, `worker/index.ts` | `notifications` | `GET /api/notifications`, `POST /api/notifications/:id/read`, `POST /api/notifications/mark-all-read` | `notifications_page.test.ts` | **IMPLEMENTED AND VERIFIED** |
| **Membership & Billing** | Free, Pro, and BLACK ELITE tier entitlements, Razorpay integration, and branded 404 handler. | `PricingPage.tsx`, `MembershipBillingModal.tsx` | `server.ts`, `worker/index.ts` | `user_subscriptions`, `membership_grants` | `GET /api/subscription/status`, `POST /api/subscription/razorpay/create-order` | `black_membership.test.ts`, `branded_404_page.test.ts` | **IMPLEMENTED AND VERIFIED** |
| **Account Settings** | Timezone configuration, daily limits, target preferences, and profile photo crop editor. | `AccountSettingsModal.tsx`, `ProfilePhotoCropModal.tsx` | `server.ts`, `worker/index.ts` | `career_preferences`, `automation_settings` | `GET /api/settings`, `PUT /api/settings`, `POST /api/profile/photo` | `profile_photo_crop_editor.test.ts` | **IMPLEMENTED AND VERIFIED** |

---

## 2. Platform Intelligence Engines

| Subsystem | Purpose | Core Files | Database Backing | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Global Career Discovery Engine (GCDE)** | Synchronizes verified employers, ATS job endpoints (Greenhouse, Lever, SmartRecruiters, Workable), and public APIs. | `server/jobDiscovery.ts`, `worker/jobDiscovery.ts` | `job_sources`, `company_directory`, `live_jobs_cache` | **IMPLEMENTED AND VERIFIED** |
| **Explainable Matcher (COME)** | 6-dimension candidate evaluation (Skills, Experience, Location, Title, Seniority, Eligibility) with penalty caps. | `explainableMatcher.ts`, `rules.ts` | In-memory & persisted in `applications` | **IMPLEMENTED AND VERIFIED** |
| **Candidate Fact Registry** | Extracts atomic immutable facts from candidate master resumes and profile records. | `candidateFactRegistry.ts` | `candidate_facts` | **IMPLEMENTED AND VERIFIED** |
| **Resume Extraction Pipeline** | Multi-format parser (DOCX XML & PDF) with sentence stitching and fragment blacklist rejection. | `structuralEmploymentParser.ts`, `docxExtractor.ts` | `resume_documents`, `resume_versions` | **IMPLEMENTED AND VERIFIED** |
| **AI Resume Tailoring Engine** | Tailors bullets to vacancies while deterministically binding employers, roles, and dates to master profile. | `server/resumeEngine.ts`, `worker/resumeEngine.ts` | `applications.tailored_resume` | **IMPLEMENTED AND VERIFIED** |
| **AI Copilot Engine** | Grounded career advisor accessing 10 specific profile tools; strictly refuses to fabricate missing credentials. | `copilotEngine.ts` | `candidate_facts`, `user_profiles` | **IMPLEMENTED AND VERIFIED** |

---

## 3. Administrative Modules

| Feature Name | Purpose | Implementation | Access Control | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Admin Overview & System Health** | Platform KPIs, active users, error rates, and database table stats. | `AdminConsole.tsx` | Role === 'admin' | **IMPLEMENTED AND VERIFIED** |
| **Admin User Provisioning** | Grants, lifetime plans, suspensions, invitations, and membership overrides. | `AdminUserProvisioning.tsx` | Role === 'admin' | **IMPLEMENTED AND VERIFIED** |
| **Admin Resume Management** | Resume extraction inventory, reprocessing triggers, and diff comparisons. | `AdminResumeManagement.tsx` | Role === 'admin' | **IMPLEMENTED AND VERIFIED** |
| **GCDE Source Intelligence** | Real-time monitoring of employer ATS connectors, latency, and sync logs. | `GlobalSourceIntelligence.tsx` | Role === 'admin' | **IMPLEMENTED AND VERIFIED** |
| **HR Discovery Diagnostics** | ATS diagnostic verification and recruiter contact health. | `AdminHrDiscoveryDiagnostics.tsx` | Role === 'admin' | **IMPLEMENTED AND VERIFIED** |
| **Audit Log Explorer** | Comprehensive tamper-evident system audit log query surface. | `AdminConsole.tsx` | Role === 'admin' | **IMPLEMENTED AND VERIFIED** |
| **Founder Profile Management** | Live founder bio and image assets administration with revert safeguards. | `AdminFounderProfile.tsx` | Role === 'admin' | **IMPLEMENTED AND VERIFIED** |
