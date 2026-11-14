# APPLYVISE AI — RESUME REGRESSION TEST REPORT
**Document Reference:** RRTR-2026-v1  
**Execution Date:** November 14, 2026  
**Test Runner:** `tsx --test --test-concurrency=1`  
**Total Tests:** 469 passed, 0 failed, 40 suites  
**Duration:** ~51s  

---

## 1. Targeted Integrity Test Suite (`tests/ats_employment_history_integrity.test.ts`)

| Scenario | Test Description | Duration | Status |
| :--- | :--- | :--- | :--- |
| **Scenario 1** | Full Candidate Chronology Extraction & Grounding (All 7 authentic roles) | 49.1ms | **PASS** |
| **Scenario 2** | Date Corruption Immunity — Distinct employment dates for different companies | 15.1ms | **PASS** |
| **Scenario 3** | Zero Bullet Fragments As Jobs — Sentence continuations rejected | 3.5ms | **PASS** |
| **Scenario 4** | Role and Domain Disambiguation (`Supply Chain Operations` attached to role) | 3.5ms | **PASS** |
| **Scenario 5** | Post-AI Hallucination Stripping & Grounding (2022-Present stripped from past roles) | 4.1ms | **PASS** |
| **Scenario 6** | `formatExperiencePeriod` Helper Reliability across edge cases | 0.2ms | **PASS** |
| **Scenario 7** | Zero Empty Bullets in Tailoring Engine & DOCX generation | 80.2ms | **PASS** |
| **Scenario 8** | Candidate Fact Registry Duration Integrity | 0.8ms | **PASS** |
| **Scenario 9** | Truthfulness Audit Rejection of Fabricated Dates or Employers | 1.4ms | **PASS** |

---

## 2. Comprehensive Test Suite Summary

- **Total Test Suites Executed**: 40
- **Total Assertions & Scenarios**: 469
- **Passing**: 469 (100%)
- **Failing**: 0 (0%)
- **TypeScript Static Verification (`tsc --noEmit`)**: 0 errors
- **Production Bundle Build (`vite build`)**: 0 errors, 1.16s build time
