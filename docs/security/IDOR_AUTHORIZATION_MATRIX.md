# APPLYVISE AI — IDOR & HORIZONTAL PRIVILEGE ESCALATION AUDIT

**Audit Date:** November 2026  
**Target:** Object-Level Access Control & Multi-Tenant Data Isolation  
**Finding:** All candidate records, applications, profiles, resumes, and timelines are strictly isolated by `user_id`.

---

## 1. OBJECT OWNERSHIP MAPPING

| Entity | Primary Key | Owner Column | Query Constraint Applied | IDOR Risk Level | Audit Result |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **User Profile** | `user_id` | `user_id` | `WHERE user_id = ?` | High | **PASS** — Enforced by session identity |
| **Application Records** | `id` | `user_id` | `WHERE id = ? AND user_id = ?` | High | **PASS** — Direct IDOR check on read/write |
| **Application Timeline** | `id` (parent `app_id`)| `user_id` | `authAndStore.getApplicationById(user.id, appId)` | High | **PASS** — Remediated in SEC-005 |
| **Candidate Facts** | `id` | `user_id` | `WHERE user_id = ?` | High | **PASS** — Candidate fact registry scoped to user |
| **Resumes / Files** | `id` | `user_id` | `WHERE user_id = ?` | High | **PASS** — Scoped to authenticated user session |
| **HR Outreach Drafts** | `id` | `user_id` | `WHERE user_id = ?` | Medium | **PASS** — Scoped to candidate context |
| **Membership Entitlements**| `user_id`| `user_id` | `WHERE user_id = ?` | High | **PASS** — Server-side entitlement validation |

---

## 2. CODE EVIDENCE & REMEDIATION

### Application Timeline IDOR Remediation (`server.ts`)
Previously, `/api/applications/:id/timeline` fetched timeline events by `:id` without confirming that the application belonged to `req.user.id`.

**Defensive Patch Implemented:**
```typescript
app.get('/api/applications/:id/timeline', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const appRecord = authAndStore.getApplicationById(req.user!.id, req.params.id);
  if (!appRecord) {
    return res.status(404).json({ success: false, error: 'Application not found or unauthorized.' });
  }
  res.json({ success: true, timeline: appRecord.timeline || [] });
});

app.post('/api/applications/:id/timeline', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const appRecord = authAndStore.getApplicationById(req.user!.id, req.params.id);
  if (!appRecord) {
    return res.status(404).json({ success: false, error: 'Application not found or unauthorized.' });
  }
  // Safe append...
});
```

### Database Isolation Layer (`server/authAndStore.ts`)
```typescript
getApplicationById(userId: string, id: string): ApplicationRecord | null {
  const stmt = sqlite.prepare('SELECT data FROM applications WHERE id = ? AND user_id = ?');
  const row = stmt.get(id, userId) as { data: string } | undefined;
  if (!row) return null;
  return JSON.parse(row.data) as ApplicationRecord;
}
```
Cross-tenant access attempts return `null` and map to HTTP 404 (Not Found / Unauthorized), preventing data leakage and resource enumeration.
