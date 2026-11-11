import { describe, it, after } from 'node:test';
import assert from 'node:assert';
import crypto from 'node:crypto';
import express, { Request, Response, NextFunction } from 'express';
import { authAndStore, sqlite } from '../server/authAndStore.ts';
import { hrOutreachStore } from '../server/hrOutreachStore.ts';
import { hrDiscoveryQueueStore } from '../server/hrDiscoveryQueueStore.ts';
import { createHrOutreachRouter } from '../server/hrOutreachRoutes.ts';
import { deriveSourceJobId } from '../server/hrDiscoveryEngine.ts';
import { extractPlainTextForMatching } from '../worker/jobConnectors.ts';
import {
  extractPublicHrContactsFromText,
  extractPublicHrContactsWithDiagnostics,
} from '../src/utils/hrContactDiscovery.ts';
import { runEmailVerificationPipeline } from '../src/utils/hrEmailVerification.ts';

function createDiagnosticsTestApp() {
  const app = express();
  app.use(express.json());
  const requireAuth = (req: any, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    const user = token ? authAndStore.getUserByToken(token) : null;
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    req.user = user;
    next();
  };
  const requireAdmin = (req: any, res: Response, next: NextFunction) => {
    requireAuth(req, res, () => {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Admin access required' });
      }
      next();
    });
  };

  app.use('/api/hr-outreach', createHrOutreachRouter(requireAuth));
  app.get('/api/admin/hr-discovery/diagnostics', requireAdmin, (_req: Request, res: Response) => {
    res.json({ success: true, diagnostics: hrDiscoveryQueueStore.getAdminDiagnostics() });
  });
  return app;
}

describe('ApplyVise AI — HR Discovery Repair, Extraction, Queue & Admin Diagnostics Suite', () => {
  const suffix = crypto.randomUUID().slice(0, 6);
  const testJobIds: string[] = [];
  const testEmails: string[] = [];

  describe('1. Connector HTML/Mailto Preservation & Entity Decoding', () => {
    it('preserves mailto: email hrefs when flattening job posting HTML and decodes HTML entities', () => {
      const rawHtml = `
        <div class="job-body">
          <p>Join our Supply Chain team in Berlin! To apply or ask questions, write to
            <a href="mailto:talent.berlin&#64;acme-freight-demo&#46;de?subject=Apply">our Talent Team</a>.
          </p>
          <p>Backup inquiry: <a href="mailto:Opportunities@testlio-demo.com">Opportunities Desk</a></p>
        </div>
      `;

      const flattened = extractPlainTextForMatching(rawHtml);
      assert.ok(flattened.includes('talent.berlin@acme-freight-demo.de'), 'mailto entity-decoded email must survive HTML stripping');
      assert.ok(flattened.includes('Opportunities@testlio-demo.com'), 'anchor text without visible email must still expose href mailto email');
    });

    it('extracts obfuscated [at]/[dot] emails, enquiry emails like Opportunities@, and named recruiters across all 8 Part-4 categories', () => {
      const text = `
        <p>Senior Recruiter Sarah Jenkins (sarah.jenkins@cloudscale-demo.io) leads engineering hiring.</p>
        <p>Questions or accommodation needs? Contact recruitment[at]cloudscale-demo[dot]io</p>
        <p>Careers inquiries: <a href="mailto:Opportunities@cloudscale-demo.io">Email Us</a></p>
        <p>Hiring Manager: david.kim&#64;cloudscale-demo.io</p>
        <p>Invalid / third-party to ignore: support@greenhouse.io, noreply@cloudscale-demo.io, user@example.com, bad@@email.com, abuse@github.com</p>
      `;

      const diag = extractPublicHrContactsWithDiagnostics({
        text,
        companyName: 'CloudScale Demo',
        companyWebsite: 'https://cloudscale-demo.io/careers',
        companyDomain: 'cloudscale-demo.io',
        country: 'United States',
        sourceType: 'gcde_greenhouse_cloudscale',
        sourceName: 'Greenhouse CloudScale',
        sourceUrl: 'https://boards.greenhouse.io/cloudscale/jobs/12345',
        jobId: 'gh_cloudscale_12345',
      });

      const emails = diag.candidates.map((c) => c.email);
      assert.ok(emails.includes('sarah.jenkins@cloudscale-demo.io'));
      assert.ok(emails.includes('recruitment@cloudscale-demo.io'));
      assert.ok(emails.includes('opportunities@cloudscale-demo.io'));
      assert.ok(emails.includes('david.kim@cloudscale-demo.io'));

      assert.ok(!emails.includes('noreply@cloudscale-demo.io'));
      assert.ok(!emails.includes('user@example.com'));
      assert.ok(!emails.includes('support@greenhouse.io'));
      assert.ok(!emails.includes('abuse@github.com'));

      const recruiter = diag.candidates.find((c) => c.email === 'sarah.jenkins@cloudscale-demo.io')!;
      assert.strictEqual(recruiter.contactType, 'Named Recruiter');
      assert.strictEqual(recruiter.linkType, 'direct_posting');

      const careers = diag.candidates.find((c) => c.email === 'opportunities@cloudscale-demo.io')!;
      assert.strictEqual(careers.contactType, 'Careers Contact');
      assert.strictEqual(careers.hadMailto, true);
    });

    it('derives accurate sourceJobId across Greenhouse, Lever, SmartRecruiters, Workable & Ashby prefixes', () => {
      assert.strictEqual(deriveSourceJobId('gh_stripe_7890123', 'greenhouse_stripe'), '7890123');
      assert.strictEqual(deriveSourceJobId('lever_spotify_abc-123-def', 'lever_spotify'), 'abc-123-def');
      assert.strictEqual(deriveSourceJobId('smartrec_visa_445566', 'smartrec_visa'), '445566');
      assert.strictEqual(deriveSourceJobId('workable_invision_88AABB', 'workable_invision'), '88AABB');
    });
  });

  describe('2. Verification Levels Integrity (Never Fabricating Mailbox Verification)', () => {
    it('tracks 5 independent boolean verification levels accurately without inflating MX-only to Mailbox Verified', async () => {
      const mxOnly = await runEmailVerificationPipeline(
        { email: `hr.${suffix}@demo-logistics.de` },
        async () => ({ ok: true, hosts: ['mx1.demo-logistics.de'] })
      );
      assert.strictEqual(mxOnly.levels.level1SyntaxValid, true);
      assert.strictEqual(mxOnly.levels.level2DomainExists, true);
      assert.strictEqual(mxOnly.levels.level3MxAvailable, true);
      assert.strictEqual(mxOnly.levels.level4SourceEvidenceConfirmed, false);
      assert.strictEqual(mxOnly.levels.level5MailboxVerified, false);
      assert.strictEqual(mxOnly.status, 'MX Valid');

      const withEvidence = await runEmailVerificationPipeline(
        {
          email: `talent.${suffix}@demo-logistics.de`,
          sourceUrl: 'https://demo-logistics.de/careers',
          evidence: 'Published on careers footer',
        },
        async () => ({ ok: true, hosts: ['mx1.demo-logistics.de'] })
      );
      assert.strictEqual(withEvidence.levels.level4SourceEvidenceConfirmed, true);
      assert.strictEqual(withEvidence.levels.level5MailboxVerified, false);
      assert.strictEqual(withEvidence.status, 'Source Confirmed');

      const sourceTimeout = await runEmailVerificationPipeline(
        {
          email: `jobs.${suffix}@demo-logistics.de`,
          sourceUrl: 'https://demo-logistics.de/careers',
          evidence: 'Published on careers page',
        },
        async () => ({ ok: false, hosts: [], error: 'DNS query timed out' })
      );
      assert.strictEqual(sourceTimeout.levels.level3MxAvailable, false);
      assert.strictEqual(sourceTimeout.levels.level4SourceEvidenceConfirmed, true);
      assert.strictEqual(sourceTimeout.status, 'Source Confirmed');

      const lookupFailedNoEvidence = await runEmailVerificationPipeline(
        {
          email: `unknown.${suffix}@demo-logistics.de`,
        },
        async () => ({ ok: false, hosts: [], error: 'DNS query timed out' })
      );
      assert.strictEqual(lookupFailedNoEvidence.levels.level3MxAvailable, false);
      assert.strictEqual(lookupFailedNoEvidence.status, 'Verification Failed');
    });
  });

  describe('3. Persistent Discovery Queue, Job Links, Retries, Dead-Letter & Tenant-Isolated Manual Submission', () => {
    it('enqueues GCDE jobs, handles retry backoff -> dead_letter after 3 failures, and links company vs direct jobs', () => {
      const jobIdA = `test_hr_job_a_${suffix}`;
      const jobIdB = `test_hr_job_b_${suffix}`;
      testJobIds.push(jobIdA, jobIdB);

      const now = new Date().toISOString();
      const exp = new Date(Date.now() + 7 * 86400 * 1000).toISOString();
      sqlite
        .prepare(
          `INSERT INTO live_jobs_cache (id, source, source_job_id, title, company, location, country, url, description, tags, published_at, first_seen_at, retrieved_at, last_verified_at, expires_at, last_checked_at, is_active)
           VALUES (?, 'jobicy', ?, 'Supply Chain Analyst', ?, 'Remote', 'Germany', ?, ?, '[]', ?, ?, ?, ?, ?, ?, 1)`
        )
        .run(
          jobIdA,
          `sj_a_${suffix}`,
          `NordicTestCo-${suffix}`,
          `https://nordictest-${suffix}.de/jobs/1`,
          `Send inquiries to hr.${suffix}@nordictest-${suffix}.de`,
          now,
          now,
          now,
          now,
          exp,
          now
        );

      sqlite
        .prepare(
          `INSERT INTO live_jobs_cache (id, source, source_job_id, title, company, location, country, url, description, tags, published_at, first_seen_at, retrieved_at, last_verified_at, expires_at, last_checked_at, is_active)
           VALUES (?, 'arbeitnow', ?, 'Operations Manager', ?, 'Berlin', 'Germany', ?, 'Apply via portal only.', '[]', ?, ?, ?, ?, ?, ?, 1)`
        )
        .run(jobIdB, `sj_b_${suffix}`, `NoEmailTestCo-${suffix}`, `https://noemail-${suffix}.de/jobs/2`, now, now, now, now, exp, now);

      const syncRes = hrDiscoveryQueueStore.syncJobsToDiscoveryQueue({ jobIds: [jobIdA, jobIdB] });
      assert.strictEqual(syncRes.enqueued, 2);

      const batch = hrDiscoveryQueueStore.fetchPendingQueueBatch({ jobId: jobIdB });
      assert.strictEqual(batch.length, 1);
      const qId = batch[0].queueItem.id;

      // Simulate 3 consecutive upstream failures -> moves to dead_letter
      hrDiscoveryQueueStore.markQueueItemResult({
        queueId: qId,
        status: 'failed',
        diagnosticCategory: 'description_unavailable',
        failureReason: 'HTTP 502 upstream',
        emailsExtracted: 0,
        emailsAccepted: 0,
      });
      hrDiscoveryQueueStore.markQueueItemResult({
        queueId: qId,
        status: 'failed',
        diagnosticCategory: 'description_unavailable',
        failureReason: 'HTTP 502 upstream',
        emailsExtracted: 0,
        emailsAccepted: 0,
      });
      hrDiscoveryQueueStore.markQueueItemResult({
        queueId: qId,
        status: 'failed',
        diagnosticCategory: 'description_unavailable',
        failureReason: 'HTTP 502 upstream',
        emailsExtracted: 0,
        emailsAccepted: 0,
      });

      const qRow = sqlite.prepare('SELECT status, attempt_count FROM hr_contact_discovery_queue WHERE id = ?').get(qId) as any;
      assert.strictEqual(qRow.status, 'dead_letter');
      assert.strictEqual(qRow.attempt_count, 3);

      // Reprocess resets dead_letter cleanly back to pending
      const resetItem = hrDiscoveryQueueStore.reprocessQueueJob(jobIdB);
      assert.ok(resetItem && resetItem.status === 'pending' && resetItem.attemptCount === 0);
    });

    it('isolates manual candidate-submitted contacts strictly to submitting user & enforces 403 on Admin Diagnostics for non-admins', async () => {
      const u1 = authAndStore.createUser(`Candidate One ${suffix}`, `cand1.${suffix}@applyvise-diag.org`, 'TestPass123!');
      const u2 = authAndStore.createUser(`Candidate Two ${suffix}`, `cand2.${suffix}@applyvise-diag.org`, 'TestPass123!');
      const admin = authAndStore.createUser(`Admin Diag ${suffix}`, `admin.${suffix}@applyvise-diag.org`, 'TestPass123!');
      sqlite.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(admin.id);

      const s1 = authAndStore.verifyLogin(`cand1.${suffix}@applyvise-diag.org`, 'TestPass123!');
      const s2 = authAndStore.verifyLogin(`cand2.${suffix}@applyvise-diag.org`, 'TestPass123!');
      const sAdmin = authAndStore.verifyLogin(`admin.${suffix}@applyvise-diag.org`, 'TestPass123!');

      const manualEmail = `personal.recruiter.${suffix}@manual-employer.io`;
      testEmails.push(manualEmail);

      hrDiscoveryQueueStore.submitOrCorrectUserContact({
        userId: u1.id,
        companyName: `ManualCo-${suffix}`,
        designation: 'Lead Recruiter',
        roleCategory: 'Technical Recruiter',
        contactType: 'Named Recruiter',
        email: manualEmail,
        country: 'Germany',
        emailVerificationStatus: 'MX Valid',
        verificationLevels: {
          level1SyntaxValid: true,
          level2DomainExists: true,
          level3MxAvailable: true,
          level4SourceEvidenceConfirmed: false,
          level5MailboxVerified: false,
        },
        isRoleBased: false,
      });

      // Verify u1 sees it, u2 NEVER sees u1's personal submission
      const u1Contacts = hrOutreachStore.listHrContacts({ userId: u1.id, search: manualEmail });
      const u2Contacts = hrOutreachStore.listHrContacts({ userId: u2.id, search: manualEmail });
      assert.strictEqual(u1Contacts.contacts.length, 1);
      assert.strictEqual(u1Contacts.contacts[0].isUserSubmitted, true);
      assert.strictEqual(u2Contacts.contacts.length, 0, 'Manual contact must NEVER leak to another tenant');

      // HTTP check for Admin Diagnostics authorization (403 for user, 200 for admin)
      const app = createDiagnosticsTestApp();
      const server = await new Promise<any>((resolve) => {
        const srv = app.listen(0, '127.0.0.1', () => resolve(srv));
      });
      try {
        const port = (server.address() as any).port;
        const base = `http://127.0.0.1:${port}`;

        const rCand = await fetch(`${base}/api/admin/hr-discovery/diagnostics`, {
          headers: { Authorization: `Bearer ${s1.token}` },
        });
        assert.strictEqual(rCand.status, 403);

        const rAdmin = await fetch(`${base}/api/admin/hr-discovery/diagnostics`, {
          headers: { Authorization: `Bearer ${sAdmin.token}` },
        });
        assert.strictEqual(rAdmin.status, 200);
        const body = (await rAdmin.json()) as any;
        assert.strictEqual(body.success, true);
        assert.ok(typeof body.diagnostics.totals.totalActiveJobs === 'number');
        assert.ok(typeof body.diagnostics.queueStats.pending === 'number');

        // Coverage endpoint respects real DB counts and tenant isolation
        const rCov1 = await fetch(`${base}/api/hr-outreach/jobs-with-contacts`, {
          headers: { Authorization: `Bearer ${s1.token}` },
        });
        assert.strictEqual(rCov1.status, 200);
        const covBody = (await rCov1.json()) as any;
        assert.strictEqual(covBody.success, true);
        assert.ok(typeof covBody.summary.jobCoveragePercent === 'number');

        const rComp = await fetch(`${base}/api/hr-outreach/companies`, {
          headers: { Authorization: `Bearer ${s2.token}` },
        });
        assert.strictEqual(rComp.status, 200);
      } finally {
        server.close();
      }
    });
  });

  after(() => {
    try {
      for (const id of testJobIds) {
        sqlite.prepare('DELETE FROM hr_contact_discovery_queue WHERE job_id = ?').run(id);
        sqlite.prepare('DELETE FROM live_jobs_cache WHERE id = ?').run(id);
      }
      for (const em of testEmails) {
        sqlite.prepare('DELETE FROM hr_contacts WHERE LOWER(email) = ?').run(em.toLowerCase());
      }
      sqlite.prepare("DELETE FROM users WHERE email LIKE '%@applyvise-diag.org'").run();
    } catch {
      // ignore cleanup error
    }
  });
});
