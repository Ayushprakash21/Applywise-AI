# APPLYVISE AI — EMPLOYMENT DATE INTEGRITY & CHRONOLOGY
**Document Reference:** EDI-2026-v1  
**Classification:** Core Algorithm & Verification Specification  

---

## 1. Principles of Date Integrity

1. **Zero Global Bleed**: A date extracted from one portion of a resume must never be attributed to an employment record elsewhere in the document.
2. **Deterministic Record Isolation**: The date assigned to an employment record must exist within that record's discrete `source_text` or `source_evidence`.
3. **No Unwarranted "Present" Stamping**: A past job without a documented end date must never default to "Present". "Present" is reserved strictly for roles containing unambiguous current employment indicators (`Present`, `Current`, `Till Date`) or when explicitly declared current by the candidate.
4. **No Single-Year Hallucinations**: A single year (e.g. `2021`) must remain `2021` or `2021`, not hallucinated into `2021 – Present` or `2021 – 2022`.

---

## 2. Universal Formatter: `formatExperiencePeriod`

All surfaces (Document Studio, Preview Modal, DOCX Exporters, Candidate Profile) consume a single standardized formatter:

```typescript
export function formatExperiencePeriod(
  startDate?: string | null,
  endDate?: string | null,
  current?: boolean
): string
```

### Formatter Truth Table

| Start Date | End Date | Current | Output | Notes |
| :--- | :--- | :--- | :--- | :--- |
| `2024-09` | `null` | `true` | `Sep 2024 – Present` | Current role, standardized en-dash |
| `2023-09` | `2024-08` | `false` | `Sep 2023 – Aug 2024` | Historical role with bounded range |
| `2021` | `null` | `false` | `2021` | Historical role, single anchor year |
| `null` | `null` | `true` | `Present` | Current role without known start |
| `null` | `null` | `false` | `""` | No phantom dates rendered |

---

## 3. Reverse Chronology Validation

`resumeValidationEngine.ts` enforces chronological plausibility:
- Detects inverted start and end dates (`startDate > endDate`).
- Detects excessive future dates (`startDate > now + 6 months`).
- Alerts when overlapping tenures suggest conflicting full-time roles without explicit concurrent indicators.
