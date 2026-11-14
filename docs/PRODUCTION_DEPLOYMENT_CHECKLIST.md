# APPLYVISE AI — PRODUCTION DEPLOYMENT CHECKLIST
**Document Reference:** PDC-2026-v2  
**Target Environment:** Cloudflare Workers + Cloudflare D1  
**Release Tag:** `v2.4.0-prod`  
**Auditor:** Production Release Manager & CTO  

---

## 1. Pre-Deployment Verification Checklist

- [x] **Working Tree Cleanliness**: All feature commits isolated on `feat/cto-product-completion`.
- [x] **Static Type Verification**: `npm run lint` (`tsc --noEmit`) passes with 0 errors.
- [x] **Automated Regression Suite**: `npm test` passes 469/469 tests across all 40 suites.
- [x] **Production Bundle Build**: `npm run build` succeeds in <1.2s without chunking errors.
- [x] **Security Boundary Verification**: Zero plain text secrets in client bundles or public repositories.
- [x] **D1 Migrations Verified**: All 17 migration files validated locally for SQLite/D1 syntax.
- [x] **Zero Hallucination Grounding**: Fact registry and tailoring engine enforce strict date and employer preservation.

---

## 2. Production Deployment Steps (When Authorized)

> [!CAUTION]
> In accordance with strict autonomous execution boundaries, remote production commands are NOT executed without explicit operator authorization.

1. **Merge Feature Branch**:
   ```bash
   git checkout main
   git merge feat/cto-product-completion --no-ff -m "chore(release): merge v2.4.0 product completion"
   git tag -a v2.4.0 -m "Release ApplyVise AI v2.4.0"
   ```

2. **Apply Cloudflare D1 Remote Migrations**:
   ```bash
   npx wrangler d1 migrations apply applyvise-db --remote
   ```

3. **Deploy Worker & Client Assets**:
   ```bash
   npx wrangler deploy
   ```

4. **Post-Deployment Health Smoke Check**:
   - Query `GET https://applyvise-ai.ayushprakash0021.workers.dev/api/admin/system/health`
   - Test login with verified test credentials
   - Verify ATS resume preview rendering and DOCX export
