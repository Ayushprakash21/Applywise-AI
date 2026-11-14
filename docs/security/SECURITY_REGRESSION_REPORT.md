# APPLYVISE AI — SECURITY REGRESSION TEST REPORT

**Execution Date:** November 2026  
**Test Suite:** `tests/security_red_team_audit.test.ts`  
**Test Runner:** Node.js native test runner (`tsx --test`)  
**Overall Regression Outcome:** **ALL TESTS PASS (9/9 Security Tests, 569/569 Total Platform Tests)**

---

## 1. AUTOMATED SECURITY TEST EXECUTION MATRIX

```text
✔ Security Audit: Constant-time comparison verifies legitimate HMAC and rejects tampered signatures (2.1639ms)
✔ Security Audit: Worker PBKDF2 timing-safe password verification (77.5169ms)
✔ Security Audit: Workers CORS regex allows verified origins and strictly denies untrusted origins (1.3972ms)
✔ Security Audit: Autopilot engine rejects synthetic reference codes and routes to portal completion without evidence (1.1666ms)
✔ Security Audit: Binary magic-byte inspection verifies genuine JPEG, PNG, WebP and rejects spoofed files (0.8913ms)
✔ Security Audit: validateSafePublicUrl blocks cloud metadata, RFC 1918 IPs, loopbacks, and non-HTTP ports (19.1237ms)
✔ Security Audit: sanitizePromptInput strips boundary tags and injection control strings (1.0991ms)
✔ Security Audit: Translation endpoint rejects payloads exceeding 5000 characters (0.8613ms)
✔ Security Audit: Application isolation prevents cross-account IDOR access (1.856ms)

ℹ tests 9
ℹ suites 0
ℹ pass 9
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 835.4023ms
```

---

## 2. FULL REPOSITORY TEST SUITE PARITY

```text
> applyvise-ai@0.0.0 test
> tsx --test --test-concurrency=1 src/utils/rules.test.ts tests/*.test.ts

ℹ tests 569
ℹ suites 57
ℹ pass 569
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 94972.3056ms
```

---

## 3. PRODUCTION BUNDLE VERIFICATION

```text
> applyvise-ai@0.0.0 build
> vite build

✓ 2189 modules transformed.
rendering chunks...
computing gzip size...
✓ built in 9.05s
```

Zero bundle errors, zero broken modules, zero type regressions.
