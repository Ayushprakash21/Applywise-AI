# APPLYVISE AI — RESUME VALIDATION SPECIFICATION
**Document Reference:** RVS-2026-v1  
**Module:** `src/utils/resumeValidationEngine.ts`  
**Standard:** 10-Category Pre-Export Zero-Hallucination Audit  

---

## 1. 10 Validation Categories

Every tailored resume undergoes rigorous automated audit across 10 distinct categories prior to preview or download:

| # | Category | Severity If Failed | Check Description |
| :-: | :--- | :--- | :--- |
| 1 | **Employment** | BLOCKER | All tailored companies must exist in the candidate's verified profile or fact registry. No hallucinated employers permitted. |
| 2 | **Dates** | BLOCKER / WARNING | Validates date formatting, prevents trailing hyphens, flags ungrounded start/end dates. |
| 3 | **Chronology** | REVIEW_REQUIRED | Detects inverted tenures (`startDate > endDate`) and excessive chronological gaps. |
| 4 | **Skills** | WARNING | Flags skills claimed in resume that have no grounding in verified candidate skills. |
| 5 | **Education** | WARNING | Ensures verified degrees and institutions are correctly preserved. |
| 6 | **Certifications**| WARNING | Validates that claimed certifications match candidate registry credentials. |
| 7 | **Achievements** | WARNING | Detects ungrounded percentage metrics (`300% increase`) not present in profile facts. |
| 8 | **Formatting** | BLOCKER / WARNING | Enforces zero empty bullets (`• `) and prohibits literal `"undefined"` or `"null"` strings. |
| 9 | **Completeness** | BLOCKER | Candidate full name, email/phone contact information, and headline must be present. |
| 10 | **Export** | BLOCKER / WARNING | Enforces that genuine historical roles were not accidentally dropped during tailoring. |

---

## 2. Status Output and Action Contract

```typescript
export type ResumeValidationStatus = 
  | 'VALID'                 // Score >= 95, 0 blockers, 0 warnings
  | 'VALID_WITH_WARNINGS'    // Score >= 80, 0 blockers
  | 'NEEDS_CANDIDATE_REVIEW' // Date ambiguity or unverified roles detected
  | 'BLOCKED';               // Score < 60 or >= 1 critical blocker
```

If `status === 'BLOCKED'`, `isDownloadable` is `false`. Backend endpoints in `server.ts` and `worker/index.ts` reject export requests with HTTP 422 Unprocessable Entity.
