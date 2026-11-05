# ApplyVise AI — Admin User Provisioning & Membership Validity Management

## Executive Summary

ApplyVise AI now provides a production-grade **User Provisioning & Membership Validity Management** system integrated directly into the Administrator Console. Administrators can create or invite candidates, assign membership tiers (`Free`, `Pro`, `BLACK ELITE`), specify validity durations (`6 Months`, `12 Months`, `24 Months`, `Lifetime`), and manage membership lifecycles with strict server-side UTC calendar calculations, immutable audit logging, and billing protection.

---

## 1. Architecture & Design Principles

1. **Server-Side Ground Truth**: All activation dates, expiration timestamps, and entitlement calculations are performed strictly on the backend in UTC. Frontend countdowns or client clocks are never trusted for authorization or feature gates.
2. **Entitlement Engine Integration**: Administrative grants carry `membership_source = 'ADMIN_GRANT'` and are evaluated deterministically by `getEffectivePlan()` and `getUserSubscription()`.
3. **Billing Protection**: Administrative grants are strictly isolated from payment-backed subscriptions (`PAYMENT`). No fake Razorpay orders or payment receipts are fabricated. If an account has an active paid subscription, explicit confirmation is mandatory before applying an administrative grant.
4. **Zero-Plaintext Security Boundary**: New users created via administrative provisioning receive cryptographically strong random password entropy with bcrypt/PBKDF2 hashes and secure invitation tokens (`/auth/invitation?token=...`). Plaintext passwords are never displayed to administrators or logged.
5. **No Role Escalation**: Provisioning or upgrading a membership tier strictly affects plan entitlements and never escalates a user to administrator (`role = 'user'`). Admin role assignment remains guarded by the dedicated CLI script (`npm run admin:promote`).
6. **Graceful Expiration & Data Preservation**: When temporary grants reach their UTC expiration timestamp, the user automatically reverts to `Free` privileges. Candidate facts, profile information, resumes, and job applications are never deleted or corrupted.

---

## 2. Database Schema Architecture

The database layer maintains strict parity across local SQLite (`data/applywise.sqlite`) and Cloudflare Workers D1 (`migrations/0012_user_provisioning_and_membership.sql`).

### `membership_grants`
```sql
CREATE TABLE IF NOT EXISTS membership_grants (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL,                     -- 'free' | 'pro' | 'black'
  validity_type TEXT NOT NULL,            -- '6_months' | '12_months' | '24_months' | 'lifetime'
  membership_source TEXT NOT NULL DEFAULT 'ADMIN_GRANT', -- 'ADMIN_GRANT' | 'PAYMENT' | 'PROMOTIONAL' | 'SYSTEM'
  starts_at TEXT NOT NULL,                -- ISO 8601 UTC timestamp
  expires_at TEXT,                        -- ISO 8601 UTC timestamp (NULL for lifetime)
  status TEXT NOT NULL DEFAULT 'active',  -- 'active' | 'suspended' | 'revoked' | 'expired'
  granted_by TEXT NOT NULL,               -- Administrator user ID
  reason TEXT,                            -- Administrative notes / justification
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_mgrants_user_id ON membership_grants(user_id);
CREATE INDEX IF NOT EXISTS idx_mgrants_status ON membership_grants(status);
CREATE INDEX IF NOT EXISTS idx_mgrants_expires_at ON membership_grants(expires_at);
CREATE INDEX IF NOT EXISTS idx_mgrants_plan ON membership_grants(plan);
CREATE INDEX IF NOT EXISTS idx_mgrants_granted_by ON membership_grants(granted_by);
```

### `user_invitations`
```sql
CREATE TABLE IF NOT EXISTS user_invitations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'accepted' | 'expired'
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_invitations_email ON user_invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON user_invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_user_id ON user_invitations(user_id);
```

---

## 3. Plan Mapping & Feature Entitlements

| Tier | Plan ID | AI Quota / Month | Max Daily Apps | Feature Permissions | Visual Identity |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Free** | `free` | 10 | 5 | Core discovery, factual extraction, basic tracking | Neutral Graphite / Slate |
| **Pro** | `pro` | 300 | 25 | Advanced AI tailoring, deep job fit analysis, STAR interview prep | Refined Sapphire / Violet |
| **BLACK ELITE** | `black` | 600 | 50 | Unrestricted career strategy, executive twin, priority processing | Obsidian & Champagne Gold (`#C6A66A`) |

---

## 4. Validity Calculation & Expiration Engine

### Date Arithmetic Rules (`src/utils/membershipDates.ts`)
- **Calendar-Month Arithmetic**: Month calculations do not use fixed 30-day blocks. They use real UTC calendar math (`addCalendarMonthsUTC`).
- **Month-End Clamping**: Handles months with variable day counts safely:
  - `2026-08-31` + 6 months $\rightarrow$ `2027-02-28` (prevents rollover into March).
  - `2023-08-31` + 6 months $\rightarrow$ `2024-02-29` (correctly handles leap year 2024).
- **Leap-Year Preservation**:
  - `2024-02-29` + 12 months $\rightarrow$ `2025-02-28`.
  - `2024-02-29` + 24 months $\rightarrow$ `2026-02-28`.
  - `2024-02-29` + 48 months $\rightarrow$ `2028-02-29`.
- **Lifetime Membership**:
  - `expires_at = null`, `billingInterval = 'permanent'`.
  - Never auto-expired by scheduled jobs or requests.

### Expiry Enforcement Lifecycle
1. On every protected request, `getUserSubscription(userId)` checks active grants:
   - If `expires_at` is set and $\le$ `Date.now()`, the grant is transitioned to `status = 'expired'`.
   - A `MEMBERSHIP_EXPIRED` immutable audit log event is recorded.
   - An in-app expiration warning notification is dispatched to the candidate.
   - The user reverts cleanly to `Free` tier entitlements.
2. In user-facing views (`/pricing` / Membership & Billing), candidates see:
   - "Administratively Granted Membership" label with tier, validity, remaining days, and status.
   - Clear explanations of downgraded capabilities and immediate upgrade paths when expired.

---

## 5. Billing & Subscription Protection

- Administrative grants are marked with `membership_source = 'ADMIN_GRANT'`.
- Payment-backed subscriptions are marked with `membership_source = 'PAYMENT'`.
- Permanent allowlist accounts are marked with `membership_source = 'SYSTEM'`.
- **Active Paid Subscription Guard**:
  When an administrator assigns a membership grant to an account with an active Razorpay subscription, the system rejects the operation unless `confirmOverridePaid: true` is explicitly supplied. When confirmed, the administrative grant takes precedence for effective tier access while preserving the underlying payment and transaction history.

---

## 6. Immutable Audit Trail

All administrative provisioning and lifecycle mutations are persisted to `audit_logs`:
- `USER_INVITED`: Account invitation created with secure setup token.
- `USER_CREATED`: User record initialized with blank verified profile.
- `MEMBERSHIP_GRANTED`: Initial membership plan and validity assigned.
- `MEMBERSHIP_CHANGED`: Upgrade or downgrade applied.
- `MEMBERSHIP_EXTENDED`: Additional validity added to an existing grant.
- `MEMBERSHIP_SUSPENDED`: Access paused without deleting user data.
- `MEMBERSHIP_REACTIVATED`: Access restored with original expiration date.
- `MEMBERSHIP_REVOKED`: Administrative grant terminated; reverted to Free tier.
- `MEMBERSHIP_EXPIRED`: Automatic expiration timestamp reached.

Audit details record: `targetUserId`, `targetEmail`, `adminId`, `adminEmail`, `previousPlan`, `newPlan`, `previousExpiry`, `newExpiry`, `validityType`, `reason`, `source`, and `correlationId`.

---

## 7. Admin Console UI & Operations

### Navigation
The Admin Console features a dedicated tab: **User Provisioning** (`'provisioning'`) positioned directly beside **Users & Roles** and **Resume Operations**.

### Features Included
1. **8 Real Database KPI Cards**: Total Registered, Free Users, Pro Members, BLACK ELITE Members, Active Grants, Lifetime Members, Expiring in 30 Days, Expired Memberships.
2. **Search & Multi-Filter Bar**: Real-time filtering by candidate name, email, plan, status, validity type, 30-day expiration window, and lifetime status.
3. **`+ Add New User` Modal**:
   - Full name and email inputs.
   - Tier selector (Free, Pro, BLACK ELITE).
   - Validity selector (6 Months, 12 Months, 24 Months, Lifetime).
   - Live pre-confirmation summary showing exact backend-calculated UTC activation and expiry dates.
   - Post-creation invitation modal with 1-click "Copy Setup Link" when email delivery service is unconfigured.
4. **Interactive Action Menu**:
   - Modify Plan (with before/after diff and active subscription warning).
   - Extend Validity (adds 6, 12, 24 months or converts to Lifetime).
   - Suspend / Reactivate Membership.
   - View Membership Audit Trail (slide-over drawer with historical grants and security events).

---

## 8. Verification & Test Coverage

All tests pass deterministically across both Express/SQLite and Cloudflare Workers/D1:

```
> tsx --test tests/admin_user_provisioning_and_membership.test.ts

▶ ApplyVise AI — Admin User Provisioning & Membership Validity Suite
  ✔ 1. addCalendarMonthsUTC handles leap years, month-ends, and prevents Date rollover bugs (1.11ms)
  ✔ 2. createOrInviteUserWithMembership provisions new user, hashes password, creates grant, and logs audit (266.56ms)
  ✔ 3. Re-provisioning an existing email updates membership without creating duplicate user (445.80ms)
  ✔ 4. Assigning Free, Pro, and BLACK ELITE tiers enforces correct permissions and limits (552.88ms)
  ✔ 5. Lifetime memberships have null expiry timestamp and billingInterval permanent (444.61ms)
  ✔ 6. Expired membership automatically downgrades entitlement and preserves candidate data (556.98ms)
  ✔ 7. extendUserMembership extends active expiry and rejects extending lifetime (443.03ms)
  ✔ 8. Suspending temporarily drops privileges to Free and reactivating restores them (422.50ms)
  ✔ 9. Revoking administrative grant reverts plan to Free and records MEMBERSHIP_REVOKED audit (433.73ms)
  ✔ 10. assignUserMembership requires explicit confirmOverridePaid if active paid subscription exists (375.57ms)
  ✔ 11. Membership inventory filters and summary metrics return accurate database figures (253.49ms)
  ✔ 12. Actions on Candidate A never modify Candidate B entitlements or records (657.93ms)
✔ ApplyVise AI — Admin User Provisioning & Membership Validity Suite (5286.98ms)
ℹ tests 12
ℹ suites 1
ℹ pass 12
ℹ fail 0
```

### Full Repository Regression Status
- **Total Test Suites**: 18
- **Total Tests**: 349
- **Passing**: 349 (100%)
- **Failing**: 0
- **TypeScript Check**: 0 errors (`npx tsc --noEmit`)
- **Production Build**: Successful in 9.02s (`vite v8.3.5`)

---

## 9. Outstanding Limitations & Operational Guidelines

1. **Remote Cloudflare D1 Migrations**: In accordance with operational safety guidelines, remote D1 migrations (`--remote`) were not executed. Apply `migrations/0012_user_provisioning_and_membership.sql` when deploying to production Cloudflare D1.
2. **Email Delivery Provider**: When a production transactional email provider (e.g., Cloudflare Workers Email Routing, Resend, or AWS SES) is configured, set the `MAIL_PROVIDER_API_KEY` environment secret to enable automated delivery of candidate onboarding invitations. Until then, administrators can copy the secure setup URL directly from the provisioning confirmation modal.
