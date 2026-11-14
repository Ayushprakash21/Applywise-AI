# APPLYVISE AI — CANDIDATE FACT REGISTRY
**Document Reference:** CFR-2026-v2  
**Component:** `src/utils/candidateFactRegistry.ts`  
**Role:** Canonical Single Source of Truth for Candidate Evidence  

---

## 1. Registry Architecture

The Candidate Fact Registry converts raw user profile information into immutable, verifiable atomic facts:
- **EMPLOYMENT**: `company`, `role`, `duration`, `location`
- **SKILL**: Specific technical, operational, and domain competencies
- **ACHIEVEMENT**: Verified metrics, accomplishments, and deliverables
- **EDUCATION**: Degrees, majors, and graduating institutions
- **CERTIFICATION**: Formal licenses, accreditation, and credentials

```typescript
export interface CandidateFact {
  id: string;
  category: 'EMPLOYMENT' | 'SKILL' | 'ACHIEVEMENT' | 'EDUCATION' | 'CERTIFICATION';
  field: string;
  value: string;
  source: 'RESUME' | 'USER_CONFIRMED' | 'USER_CORRECTED';
  confidence: number;
}
```

---

## 2. Temporal Fact Generation

When deriving duration facts from profile experiences, `buildFactsFromProfile` invokes `formatExperiencePeriod`. This guarantees that:
1. Active roles produce `Sep 2024 – Present`.
2. Past roles produce `Sep 2023 – Aug 2024`.
3. Unanchored past roles produce `2021` (never `2021 – Present`).

---

## 3. Post-Generation Truthfulness Audit

Every tailored resume and cover letter produced by the AI is audited against the Fact Registry via `auditTailoredResume(tailored, facts)`:
- Scans `professionalSummary`, `headline`, and `tailoredExperiences` for unverified company claims.
- Rejects documents that reference employers not present in the candidate's verified history.
- Verifies that quantifiable percentage claims and metrics are grounded in verified candidate achievements.
