# APPLYVISE AI — DATA ARCHITECTURE & SCHEMA REFERENCE
**Version:** 2.0 (Six-Pillar Career Operating System)  
**Database Engines:** Cloudflare D1 (Target Production SQLite) & Node.js SQLite (`applywise.db`)  
**Migrations Baseline:** `0001_initial_schema.sql` through `0009_six_pillars_workspace.sql`  

---

## 1. SHARED DATA FOUNDATIONS & USER OWNERSHIP

Every entity in ApplyVise AI belongs to an authenticated user and enforces strict user-level ownership checks at the API and store layers (`WHERE user_id = ?`).

```
                              +--------------------+
                              |       users        |
                              +---------+----------+
                                        | 1:N
        +-------------------------------+-------------------------------+
        |                               |                               |
        v                               v                               v
+------------------+          +------------------+            +------------------+
|  user_profiles   |          |  subscriptions   |            |  candidate_facts |
+--------+---------+          +------------------+            +------------------+
         | 1:N
         +-----------------------+----------------------+
         |                       |                      |
         v                       v                      v
+------------------+   +--------------------+   +-------------------+
|   applications   |   | interview_mock_    |   | career_           |
| (12-stage status)|   |     sessions       |   |   trajectories    |
+--------+---------+   +--------------------+   +-------------------+
         | 1:1
         v
+--------------------+
| recruiter_review_  |
|      audits        |
+--------------------+
```

---

## 2. SCHEMA DEFINITION MATRIX

### 2.1 Core Platform & Authentication (`0001_initial_schema.sql`)
* `users`: Primary account record (id, email, password_hash, salt, role, is_verified, full_name, created_at).
* `user_sessions`: Active bearer token sessions (token, user_id, expires_at, created_at).
* `user_profiles`: Master candidate profile (id, user_id, full_name, email, phone, location, current_title, summary, skills_json, experiences_json, education_json, certifications_json).
* `applications`: Application records with 12 canonical stages (id, user_id, vacancy_id, company, role, match_score, status, tailored_resume_json, cover_letter, timeline_json, submission_mode).
* `user_preferences`: Career search preferences (user_id, target_roles_json, target_locations_json, min_salary, work_arrangements_json, visa_sponsorship_required).

### 2.2 Subscriptions & Entitlements (`0002_subscriptions_and_ai.sql`)
* `subscriptions`: Subscription tier state (id, user_id, plan_id: `free` | `pro` | `black`, billing_interval: `monthly` | `annual`, status: `active` | `cancelled`, current_period_end).
* `ai_usage_logs`: Quota tracking per billing cycle (id, user_id, action_type, cost_tokens, created_at).

### 2.3 Verified Candidate Fact Registry (`0008_candidate_fact_registry.sql`)
* `candidate_facts`: Atomic verifiable candidate facts (id, user_id, category: `EMPLOYMENT` | `SKILL` | `EDUCATION` | `CERTIFICATION` | `IDENTITY`, key, value, verification_status: `USER_CONFIRMED` | `USER_CORRECTED` | `EXTRACTED` | `INFERRED_PENDING`, original_source, verified_at).
* `candidate_fact_verifications`: Audit trail of candidate approvals and corrections.

### 2.4 Six-Pillar Career Workspace Entities (`0009_six_pillars_workspace.sql`)
* `opportunity_signals`: Verifiable market hiring signals (company, signal_type, headline, source_name, source_url, published_date, location, relevance_explanation, has_verified_vacancy).
* `interview_mock_sessions`: Interactive interview prep and evaluations (id, user_id, job_id, role_title, company_name, interview_type, questions_json, answers_json, feedback_json, improvement_areas_json, overall_score).
* `recruiter_review_audits`: 12-category application screening review with 3-tier evidence classification (id, user_id, application_id, role_alignment_score, review_categories_json, evidence_classification_json, strongest_points_json, potential_concerns_json, missing_mandatory_json, resume_improvements_json).
* `career_trajectories`: Multi-target career pathway exploration (id, user_id, trajectory_title, target_role, current_alignment_score, transferable_skills_json, missing_skills_json, required_experience_years, recommended_certifications_json, learning_path_json).

---

## 3. APPLICATION LIFECYCLE STATE MACHINE (12 CANONICAL STAGES)

1. `OPPORTUNITY_SELECTED`: Candidate has identified a target vacancy.
2. `SUITABILITY_REVIEWED`: Alignment and eligibility reviewed against candidate facts.
3. `RESUME_PREPARED`: ATS resume tailored using strictly verified facts.
4. `RECRUITER_REVIEW_COMPLETED`: 12-category screening analysis performed.
5. `APPLICATION_READY`: Complete application package compiled.
6. `AWAITING_USER_APPROVAL`: Mandatory gate for candidate review of sensitive declarations.
7. `SUBMISSION_IN_PROGRESS`: Package export or guided submission active.
8. `SUBMITTED_CONFIRMED`: Verified external employer confirmation.
9. `INTERVIEW`: Active interview round scheduled.
10. `OFFER`: Formal job offer extended.
11. `REJECTED`: Formal rejection recorded.
12. `WITHDRAWN`: Application withdrawn by candidate.
