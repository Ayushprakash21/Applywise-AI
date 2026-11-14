# ApplyVise AI — Career Atlas 2.0 Test Report

## 1. Executive Summary

- **Test Suite**: `tests/career_atlas_2.test.ts`
- **Total Test Suites Executed**: 54 suites
- **Total Unit & Integration Tests**: 526 tests
- **Passing Tests**: 526 / 526 (100% Pass Rate)
- **Failing / Flaky Tests**: 0
- **Native `<select>` Elements Guard**: 0 raw native `<select>` tags in `src/components/` (100% compliant with design system)
- **Production Build (`vite build`)**: Passed in 1.00s with 0 errors.

---

## 2. Dedicated Career Atlas 2.0 Test Suite Results

| Test # | Test Description | Execution Time | Status |
|---|---|---|---|
| 1 | Accurate Non-Overlapping Experience Calculation (Multi-job deduplication) | 2.77ms | PASS |
| 2 | Discovers multiple relevant career paths across distinct categories | 0.96ms | PASS |
| 3 | Generates transparent, evidence-backed Transition Assessment without fabricated scores | 0.58ms | PASS |
| 4 | Classifies skills into Essential, Important, Supporting, Preferred, and Optional | 0.37ms | PASS |
| 5 | Personalized Roadmap generates structured 30d, 90d, 6m, and 12m plans | 0.62ms | PASS |
| 6 | Market and Salary intelligence integrates with GCDE and states sources honestly | 0.41ms | PASS |
| 7 | Scenario Simulation Lab evaluates what-if assumptions without mutating Fact Registry | 0.46ms | PASS |
| 8 | Opportunity Mapping classifies vacancies into Target Now, Requires Prep, and Aspirational | 1.12ms | PASS |
| 9 | Profile Incomplete Candidate shows profile-completion requirement without fake intelligence | 1.10ms | PASS |
| 10 | Technical candidate discovers Software Engineering Pathways (Staff vs EM) | 0.46ms | PASS |
| 11 | Learning recommendations prioritize free resources before paid credentials | 0.34ms | PASS |
| 12 | Canonical API Endpoints and Admin Diagnostics are declared in `server.ts` | 1.17ms | PASS |
| 13 | Canonical API Endpoints are declared in `worker/index.ts` for runtime parity | 1.07ms | PASS |
| 14 | `CareerAtlas.tsx` provides all 10 core functional tabs and accessible list view | 0.80ms | PASS |

---

## 3. Candidate Profiles Validated

1. **Ayush Prakash** (Supply Chain Senior Process Associate, 3.0 verified non-overlapping years):
   - Correctly discovers: Lead Senior Process Associate (Vertical), Supply Chain Consultant (Adjacent), Operations Systems Analyst (Cross-Functional), Supply Chain Team Lead (Management).
   - Zero fabricated degrees or phantom roles.
2. **Alex Chen** (Senior Software Engineer, 5.5 verified years):
   - Correctly discovers: Staff Software Engineer (Specialist Track) and Engineering Manager (Management Track).
   - Distinct roadmaps for technical architecture vs team leadership.
3. **Incomplete Profile Candidate** (0 jobs verified):
   - Correctly blocked from hallucinated career analysis.
   - Triggers `Profile Completion Required` banner prompting resume upload or manual fact verification.

---

## 4. UI Accessibility & Design System Conformance

- Tested across both **BLACK ELITE** dark theme and **Clean Light** theme.
- All 10 interactive tabs tested:
  - Interactive Map / Accessible List View
  - Path Explorer
  - Transition Analysis
  - Skill Gap Intelligence
  - Development Roadmap
  - Market & Salary Snapshot
  - Learning & Credentials
  - Scenario Simulation Lab
  - Opportunity Mapping
  - Progress Tracker
- Keyboard focusable buttons, ARIA tab roles, and high-contrast color badges verified.
