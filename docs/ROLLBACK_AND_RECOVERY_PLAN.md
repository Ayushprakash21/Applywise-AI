# APPLYVISE AI — ROLLBACK & INCIDENT RECOVERY PLAN

This document establishes standard operating procedures for rollback and incident recovery in the event of an anomalous production deployment.

---

## 1. INSTANT CLOUDFLARE WORKER VERSION ROLLBACK

Cloudflare Workers maintains immutable versioned deployments with zero-second rollback capabilities.

### 1.1 List Deployment Versions
```bash
npx wrangler deployments list
```

### 1.2 Instant Rollback to Known Good Version
```bash
# Rollback to the previous stable Version ID (e.g. 750391ba-f799-4b22-8497-034063434c5d)
npx wrangler rollback [PREVIOUS_VERSION_ID]
```
This takes effect instantly worldwide across Cloudflare's edge network without requiring a git checkout or build.

---

## 2. GIT-LEVEL ROLLBACK PROCEDURE

If a code change needs to be reverted on the repository:

1. Identify the last verified stable commit reference (`7d7b965`).
2. Create a hotfix/rollback branch:
   ```bash
   git checkout -b hotfix/revert-release 7d7b965
   ```
3. Re-run quality gates:
   ```bash
   npm run lint
   npm test
   npm run build
   ```
4. Deploy the verified stable build:
   ```bash
   npm run cf:deploy
   ```

---

## 3. DATABASE INCIDENT MITIGATION & RECOVERY

1. **D1 Point-in-Time Protection:** Cloudflare D1 databases feature automatic point-in-time recovery and snapshot replication.
2. **Schema Rollback:** Because all migrations (`0001` - `0016`) use additive DDL (`ADD COLUMN`, `CREATE TABLE IF NOT EXISTS`), code rollbacks can run safely against the existing database schema without requiring destructive table drops.
3. **Audit Log Inspection:** All administrative provisioning, tier changes, and sync events are recorded in `audit_logs` and `admin_audit_logs` for forensic review.
