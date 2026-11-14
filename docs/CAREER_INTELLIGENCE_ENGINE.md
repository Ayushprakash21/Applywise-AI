# ApplyVise AI — Career Intelligence Engine Specification

## 1. Mathematical Grounding & Verification Logic

The Career Intelligence Engine (`src/services/careerAtlasEngine.ts`) is the deterministic computational core powering Career Atlas 2.0. It executes without LLM hallucinations or speculative assertions.

---

## 2. Deterministic Non-Overlapping Experience Calculation

Standard ATS and career tools often introduce significant errors by summing duration intervals naively. If a candidate held two concurrent positions or overlapping projects (e.g., 2021-2023 at Company A and 2022-2024 at Company B), naive calculation computes 2 + 2 = 4 years, when the actual calendar duration is 3 years.

### The Algorithm: Month-Interval Union
1. Parse all employment history records from the candidate's verified profile.
2. Normalize date strings (`YYYY-MM`, `MM/YYYY`, `Month YYYY`, `YYYY`, `Present`).
3. For each valid job interval, map to start and end integer months from a fixed epoch (`monthIndex = year * 12 + month`).
4. Sort intervals by start month.
5. Merge intersecting and contiguous intervals into disjoint, non-overlapping intervals:
   ```typescript
   let totalMonths = 0;
   let currentStart = intervals[0].start;
   let currentEnd = intervals[0].end;

   for (let i = 1; i < intervals.length; i++) {
     if (intervals[i].start <= currentEnd) {
       currentEnd = Math.max(currentEnd, intervals[i].end);
     } else {
       totalMonths += (currentEnd - currentStart + 1);
       currentStart = intervals[i].start;
       currentEnd = intervals[i].end;
     }
   }
   totalMonths += (currentEnd - currentStart + 1);
   const verifiedYears = Math.round((totalMonths / 12) * 10) / 10;
   ```
6. **Result**: Zero double-counting, verified to within 0.1 years of physical reality.

---

## 3. Seven Canonical Path Categories

The engine maps verified candidate positioning into seven distinct career directions:

| Category | Definition | Typical Readiness | Example Transition |
|---|---|---|---|
| **Vertical Promotion** | Step-up in seniority within existing functional hierarchy | High (70-90%) | Senior Process Associate → Operations Lead |
| **Adjacent Functional** | Sideways lateral shift into closely related functions | Moderate (60-80%) | Supply Chain Operations → Procurement Specialist |
| **Cross-Functional Pivot** | Movement into neighboring business units leveraging core competencies | Moderate-Low (45-65%) | Process Associate → Business Systems Analyst |
| **Management Track** | Transition from individual contributor to team/people leadership | Moderate (50-70%) | Senior Engineer → Engineering Manager |
| **Technical Specialist** | Deepening of core technical craft to staff/principal depth | Variable (55-80%) | Senior Software Engineer → Staff Software Architect |
| **Industry Transition** | Taking existing functional expertise into a high-growth sector | Moderate (60-75%) | Banking Operations → Fintech Product Operations |
| **Executive Leadership** | Multi-discipline organizational and strategic leadership | Aspirational (35-55%) | Operations Manager → Director of Global Supply Chain |

---

## 4. Competency Evidence Evaluation & Tiering

The engine maps verified candidate skills against target requirements across 4 definitive tiers:

1. **STRONG_EVIDENCE**:
   - Explicitly listed in candidate verified skills AND present in verified employment duties or accredited certifications.
   - Contributes 100% to dimension match.
2. **PARTIAL_EVIDENCE**:
   - Adjacent skill detected (e.g., candidate has `SAP` and target requires `ERP Systems`), or single mention in unverified notes.
   - Contributes 50% to dimension match.
3. **MISSING_EVIDENCE**:
   - Capability absent from candidate record.
   - Contributes 0% and automatically triggers structured learning recommendations.
4. **CONFIRMATION_REQUIRED**:
   - Role title suggests capability but candidate hasn't verified concrete work items.
   - Prompts candidate for verification before factoring into readiness score.

---

## 5. Learning & Credential Prioritization Engine

To protect candidates from predatory courses and pay-to-play credentials, the engine strictly prioritizes educational pathways:

1. **Tier 1: Free & Open Source**:
   - Official vendor documentation, open university courseware (MIT OCW, Stanford Online), free community projects.
2. **Tier 2: Low-Cost Practical**:
   - Hands-on project labs, Coursera audit tracks, platform sandbox certifications (free/sub-$50).
3. **Tier 3: Recognized Professional Credentials**:
   - Industry gold-standard certifications (e.g., ASCM CSCP for supply chain, AWS Solutions Architect for cloud, PMP for program managers).
4. **Tier 4: Advanced Degrees & Executive Programs**:
   - Reserved strictly for executive/director tracks where formal institutional pedigree has demonstrable hiring ROI.
