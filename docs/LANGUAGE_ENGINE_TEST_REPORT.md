# ApplyVise AI — Universal Language Engine Test Report

**Test Suite:** [`tests/universal_language_engine.test.ts`](file:///d:/ANtigravity/applywise%20AI/tests/universal_language_engine.test.ts)  
**Execution Date:** November 2026  
**Total Tests:** 12 passing tests (100% success rate)

---

## 1. Verified Test Scenarios

1. **30-Language Catalogue Integrity:**
   - Validated that all 30 planned languages exist with valid BCP-47 codes, native names, script families, and completeness indicators.
2. **Text Direction & RTL Detection:**
   - Verified Arabic (`ar-SA`) and Urdu (`ur-PK`) report `direction: 'rtl'`. All other 28 languages report `direction: 'ltr'`.
3. **Locale-Aware Formatting:**
   - Date, time, percentage, and number formatting verified across English, Hindi, Arabic, and Japanese locales.
   - Verified that currency codes and numerical values are not modified.
4. **Deterministic UI Dictionary Resolution:**
   - Verified translation key resolution across `en-US`, `hi-IN`, `es-ES`, `ar-SA`, `fr-FR`, `de-DE`, `ja-JP`.
   - Verified parameter interpolation (`{{param}}`).
   - Verified fallback to English master for missing keys.
5. **Dynamic Translation Gateway & Caching:**
   - Verified SHA-256 caching logic produces deterministic hashes.
   - Verified graceful degradation and circuit breaker behavior when service is offline.
6. **Mobile Contract & i18next Resource Export:**
   - Verified mobile SDK initialization, storage adapter contract, and listener notifications.
7. **Security & Fact Grounding:**
   - Verified candidate facts and employer names are preserved without corruption.
