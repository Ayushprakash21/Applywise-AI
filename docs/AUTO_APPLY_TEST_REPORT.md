# AUTO-APPLY TEST REPORT & QUALITY GATE VERIFICATION

**Test Date:** November 14, 2026  
**Test Suite:** `tests/ai_autopilot_agent.test.ts` & Application Regression Suite  

---

## 1. QUALITY GATES SUMMARY

| Gate | Command | Result | Pass / Total |
|---|---|---|---|
| **TypeScript Type Check** | `npm run lint` (`tsc --noEmit`) | **PASS** | 0 errors |
| **Vite Production Build** | `npm run build` | **PASS** | 2,169 modules transformed, clean bundle |
| **Autopilot Unit Tests** | `npx tsx --test tests/ai_autopilot_agent.test.ts` | **PASS** | 5 / 5 tests passed |
| **Master Regression Suite** | `npm test` | **PASS** | **453 / 453 tests passed (39 suites)** |

---

## 2. AUTOPILOT SPECIFIC TEST VERIFICATION

1. **Quota Tier Limits:** FREE (2), PRO (10), BLACK ELITE (20), FOUNDER (Unlimited) strictly verified.
2. **Founder Exclusivity:** Verified that standard candidate emails cannot claim Founder unlimited status, while allowlisted accounts receive unlimited auto-apply submissions.
3. **Reservation Locks:** Verified that reservation count decrements remaining quota before execution and releases on failure.
4. **Job Eligibility Scoring:** Verified that skills and titles evaluate accurately, and excluded employers receive a 0 score with `NOT_ELIGIBLE` status.
5. **Supported ATS Execution:** Verified Greenhouse and Lever detection and automated reference generation.
