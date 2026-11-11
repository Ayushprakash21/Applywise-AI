import { describe, it, after } from 'node:test';
import assert from 'node:assert';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express, { Request, Response, NextFunction } from 'express';
import http from 'node:http';
import { authAndStore, sqlite } from '../server/authAndStore.ts';
import { hrOutreachStore } from '../server/hrOutreachStore.ts';
import { createHrOutreachRouter } from '../server/hrOutreachRoutes.ts';
import { discoverAndPersistHrContacts } from '../server/hrDiscoveryEngine.ts';
import {
  extractPublicHrContactsFromText,
  HR_DISCOVERY_SOURCES,
} from '../src/utils/hrContactDiscovery.ts';
import {
  isStaleVerification,
  runEmailVerificationPipeline,
} from '../src/utils/hrEmailVerification.ts';
import { evaluateContactRelevance } from '../src/utils/hrContactMatcher.ts';
import {
  auditGeneratedEmailClaims,
  generateDeterministicGroundedEmail,
  OUTREACH_TEMPLATES,
  OUTREACH_TONES,
} from '../src/utils/hrEmailGenerator.ts';
import {
  generateMinimalPdfFromText,
  validateResumeAttachment,
} from '../src/utils/resumeAttachmentHelper.ts';
import {
  decryptSecretToken,
  encryptSecretToken,
  sanitizeEmailAccountRow,
  signOAuthState,
  verifyOAuthStateSignature,
} from '../src/utils/tokenCrypto.ts';
import {
  EmailProviderAdapter,
  setTestMockEmailProvider,
} from '../src/utils/emailProviders.ts';
import { HrContact, JobVacancy, UserProfile } from '../src/types/index.ts';

function startTestServer() {
  const app = express();
  app.use(express.json());
  const testRequireAuth = (req: any, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (!token) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const user = authAndStore.getUserByToken(token);
    if (!user) return res.status(401).json({ success: false, error: 'Invalid session' });
    req.user = user;
    next();
  };
  app.use('/api/hr-outreach', createHrOutreachRouter(testRequireAuth));
  return new Promise<{ server: http.Server; baseUrl: string }>((resolve) => {
    const server = app.listen(0, '127.0.0.1', () => {
      const addr = server.address() as any;
      resolve({ server, baseUrl: `http://127.0.0.1:${addr.port}` });
    });
  });
}

describe('ApplyVise AI — AI HR Outreach & Direct Application Automation Suite', () => {
  // --------------------------------------------------------------------------
  // 1. CONTACT DISCOVERY & EMAIL VERIFICATION
  // --------------------------------------------------------------------------
  describe('1. Contact Discovery & 8-Step Verification Pipeline', () => {
    it('extracts valid public recruitment emails with context and rejects placeholder/noise addresses', () => {
      const html = `
        <section>
          <p>Interested in our Munich Supply Chain Analyst opening? Contact our Talent Acquisition Specialist Hannah Weber at hannah.weber@nordiclogistics-demo.de or apply via our portal.</p>
          <p>General queries: careers@nordiclogistics-demo.de</p>
          <p>Ignore automated errors: noreply@nordiclogistics-demo.de or test@example.com or tracking@sentry.io</p>
        </section>
      `;

      const extracted = extractPublicHrContactsFromText({
        text: html,
        companyName: 'Nordic Logistics',
        companyWebsite: 'https://nordiclogistics-demo.de/careers',
        companyDomain: 'nordiclogistics-demo.de',
        country: 'Germany',
        city: 'Munich',
        sourceType: 'official_company_careers',
        sourceName: 'Nordic Logistics Official Careers Page',
        sourceUrl: 'https://nordiclogistics-demo.de/careers',
        jobId: 'job_sc_1',
      });

      assert.strictEqual(extracted.length, 2);
      const named = extracted.find((c) => c.email === 'hannah.weber@nordiclogistics-demo.de');
      const role = extracted.find((c) => c.email === 'careers@nordiclogistics-demo.de');
      assert.ok(named);
      assert.strictEqual(named.roleCategory, 'Talent Acquisition Specialist');
      assert.strictEqual(named.isRoleBased, false);
      assert.ok(named.evidence.includes('Nordic Logistics Official Careers Page'));

      assert.ok(role);
      assert.strictEqual(role.isRoleBased, true);
      assert.strictEqual(role.roleCategory, 'Careers Department');
    });

    it('rejects invalid syntax, disposable domains, and MX-less domains cleanly', async () => {
      const invalidSyntax = await runEmailVerificationPipeline({ email: 'not-an-email' });
      assert.strictEqual(invalidSyntax.status, 'Invalid');

      const disposable = await runEmailVerificationPipeline({ email: 'hr@mailinator.com' });
      assert.strictEqual(disposable.isDisposable, true);
      assert.strictEqual(disposable.status, 'Invalid');

      const nxdomain = await runEmailVerificationPipeline(
        { email: 'recruiter@nonexistent-test-domain.com' },
        async () => ({ ok: false, hosts: [], error: 'NXDOMAIN' })
      );
      assert.strictEqual(nxdomain.status, 'Invalid');
    });

    it('strictly distinguishes Source Confirmed / MX Valid from Mailbox Verified mailboxes', async () => {
      const sourceConfirmed = await runEmailVerificationPipeline(
        {
          email: 'talent.partner@siemens-example-corp.de',
          sourceUrl: 'https://siemens-example-corp.de/careers',
          evidence: 'Listed on official career page',
        },
        async () => ({ ok: true, hosts: ['mx1.siemens-example-corp.de'] })
      );
      assert.strictEqual(sourceConfirmed.mxValid, true);
      assert.strictEqual(sourceConfirmed.status, 'Source Confirmed');
      assert.strictEqual(sourceConfirmed.levels.level4SourceEvidenceConfirmed, true);
      assert.strictEqual(sourceConfirmed.levels.level5MailboxVerified, false);
      assert.notStrictEqual(sourceConfirmed.status, 'Verified');
      assert.notStrictEqual(sourceConfirmed.status, 'Mailbox Verified');

      const mxOnly = await runEmailVerificationPipeline(
        {
          email: 'careers@siemens-example-corp.de',
        },
        async () => ({ ok: true, hosts: ['mx1.siemens-example-corp.de'] })
      );
      assert.strictEqual(mxOnly.isRoleBased, true);
      assert.strictEqual(mxOnly.status, 'MX Valid');
      assert.strictEqual(mxOnly.levels.level4SourceEvidenceConfirmed, false);
      assert.strictEqual(mxOnly.levels.level5MailboxVerified, false);
    });

    it('flags stale verifications older than 30 days and tracks unsupported scraping sources honestly', () => {
      const oldDate = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString();
      assert.strictEqual(isStaleVerification(oldDate, 30), true);
      assert.strictEqual(isStaleVerification(new Date().toISOString(), 30), false);

      const linkedin = HR_DISCOVERY_SOURCES.find((s) => s.id === 'linkedin_portals');
      assert.ok(linkedin);
      assert.strictEqual(linkedin.permissionMode, 'linking_only');
      assert.strictEqual(linkedin.exposesPublicEmails, false);
    });

    it('prevents duplicate contacts across different discovery sources and merges provenance', () => {
      const uniq = crypto.randomUUID().slice(0, 8);
      const email = `recruiting.${uniq}@acme-global-demo.com`;

      const first = hrOutreachStore.upsertHrContact({
        companyName: 'Acme Global',
        designation: 'Talent Acquisition Specialist',
        roleCategory: 'Talent Acquisition Specialist',
        email,
        country: 'Germany',
        sourceType: 'official_company_careers',
        sourceName: 'Acme Careers',
        sourceUrl: 'https://acme-global-demo.com/careers',
        associatedJobIds: ['job_a'],
        emailVerificationStatus: 'Domain Valid',
        contactConfidence: 0.7,
        evidence: 'Careers page listing',
        isRoleBased: false,
      });
      assert.strictEqual(first.created, true);

      const second = hrOutreachStore.upsertHrContact({
        companyName: 'Acme Global',
        designation: 'Talent Acquisition Specialist',
        roleCategory: 'Talent Acquisition Specialist',
        email: email.toUpperCase(),
        country: 'Germany',
        sourceType: 'ats_greenhouse',
        sourceName: 'Greenhouse Board',
        sourceUrl: 'https://boards.greenhouse.io/acme/jobs/2',
        associatedJobIds: ['job_b'],
        emailVerificationStatus: 'Domain Valid',
        contactConfidence: 0.85,
        evidence: 'Greenhouse posting footer',
        isRoleBased: false,
      });

      assert.strictEqual(second.created, false);
      assert.strictEqual(second.contact.id, first.contact.id);
      assert.deepStrictEqual(second.contact.associatedJobIds.sort(), ['job_a', 'job_b']);

      const detail = hrOutreachStore.getHrContactById(first.contact.id);
      assert.ok(detail && detail.sources.length === 2);
    });

    it('prioritizes contacts with higher company, department, and country relevance transparently', () => {
      const job: JobVacancy = {
        id: 'job_germany_sc',
        source: 'direct_feed',
        title: 'Supply Chain Analyst',
        company: 'EuroSupply GmbH',
        location: 'Berlin, Germany',
        country: 'Germany',
        remote: false,
        arrangement: 'hybrid',
        employmentType: 'full-time',
        url: 'https://eurosupply.de/jobs/sc-100',
        description: 'Supply chain operations and logistics analytics in Berlin.',
        requirements: ['SAP', 'Supply Chain'],
        tags: ['supply-chain'],
        publishedAt: new Date().toISOString(),
        retrievedAt: new Date().toISOString(),
        isActive: true,
        lastCheckedAt: new Date().toISOString(),
      };

      const germanyMatch: HrContact = {
        id: 'c1',
        companyName: 'EuroSupply GmbH',
        contactName: 'Lukas Meyer',
        designation: 'Talent Acquisition Specialist - Supply Chain & Operations',
        roleCategory: 'Talent Acquisition Specialist',
        email: 'lukas.meyer@eurosupply.de',
        country: 'Germany',
        city: 'Berlin',
        department: 'Supply Chain Talent',
        sourceType: 'official_company_careers',
        sourceUrl: 'https://eurosupply.de/careers',
        associatedJobIds: ['job_germany_sc'],
        emailVerificationStatus: 'Domain Valid',
        contactConfidence: 0.9,
        evidence: 'Supply chain recruiter',
        discoveredAt: new Date().toISOString(),
        contactStatus: 'active',
        isRoleBased: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const unrelatedContact: HrContact = {
        ...germanyMatch,
        id: 'c2',
        companyName: 'OtherCorp Inc',
        designation: 'Careers Department',
        roleCategory: 'Careers Department',
        country: 'United States',
        city: 'New York',
        associatedJobIds: [],
        emailVerificationStatus: 'Unverified',
      };

      const score1 = evaluateContactRelevance({ contact: germanyMatch, job });
      const score2 = evaluateContactRelevance({ contact: unrelatedContact, job });
      assert.ok(score1.overallScore > score2.overallScore);
      assert.ok(score1.overallScore >= 80);
      assert.ok(score1.advisoryNote.includes('does not guarantee direct hiring'));
    });

    it('SSRF protection blocks localhost and cloud metadata endpoints during contact discovery', async () => {
      const localAttempt = await discoverAndPersistHrContacts({
        triggeredBy: 'test_ssrf',
        companyName: 'LocalTest',
        companyWebsite: 'http://127.0.0.1:8080/careers',
        forceRefresh: true,
      });
      assert.strictEqual(localAttempt.discoveredContacts.length, 0);
      assert.ok(localAttempt.sourcesChecked.some((s) => s.status === 'blocked_ssrf'));

      const metaAttempt = await discoverAndPersistHrContacts({
        triggeredBy: 'test_ssrf_meta',
        companyName: 'MetaTest',
        companyWebsite: 'http://169.254.169.254/latest/meta-data/',
        forceRefresh: true,
      });
      assert.strictEqual(metaAttempt.discoveredContacts.length, 0);
      assert.ok(metaAttempt.sourcesChecked.some((s) => s.status === 'blocked_ssrf'));
    });
  });

  // --------------------------------------------------------------------------
  // 2. AI EMAIL GENERATION & GROUNDING AUDIT
  // --------------------------------------------------------------------------
  describe('2. Grounded AI Email Studio & Attachment Validation', () => {
    it('supports all 11 templates & 5 tones using strictly verified profile data without fabrication', () => {
      assert.strictEqual(OUTREACH_TEMPLATES.length, 11);
      assert.strictEqual(OUTREACH_TONES.length, 5);

      const profile: UserProfile = {
        id: 'prof_1',
        fullName: 'Aarav Sharma',
        email: 'aarav@example.org',
        phone: '+49 170 000000',
        location: 'Munich, Germany',
        workAuthorizationCountry: 'EU Blue Card Eligible',
        currentTitle: 'Supply Chain Operations Lead',
        currentEmployer: 'Bavaria Freight AG',
        totalExperienceYears: 4,
        professionalSummary: 'Supply chain planner focused on inventory optimization.',
        skills: [{ name: 'SAP IBP' }, { name: 'Demand Planning' }, { name: 'Logistics' }],
        experiences: [
          {
            company: 'Bavaria Freight AG',
            role: 'Supply Chain Operations Lead',
            startDate: '2022-01',
            endDate: 'Present',
            achievements: ['Reduced warehouse lead times by 14% across 3 regional hubs.'],
          },
        ],
        education: [{ degree: 'M.Sc. Supply Chain Management', institution: 'TU Munich', graduationYear: '2021' }],
        certifications: [{ name: 'APICS CSCP', issuingOrg: 'ASCM', issueYear: '2023' }],
      };

      const contact: HrContact = {
        id: 'hr_g',
        companyName: 'AutoParts Europe',
        contactName: 'Klara Hoffmann',
        designation: 'Talent Acquisition Specialist',
        roleCategory: 'Talent Acquisition Specialist',
        email: 'klara.hoffmann@autoparts.de',
        country: 'Germany',
        sourceType: 'official_company_careers',
        sourceUrl: 'https://autoparts.de/careers',
        associatedJobIds: [],
        emailVerificationStatus: 'Domain Valid',
        contactConfidence: 0.9,
        evidence: 'Careers contact',
        discoveredAt: new Date().toISOString(),
        contactStatus: 'active',
        isRoleBased: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const generated = generateDeterministicGroundedEmail({
        profile,
        contact,
        templateType: 'Supply Chain Role Application',
        tone: 'International',
      });

      assert.ok(generated.subject.includes('Aarav Sharma'));
      assert.ok(generated.bodyText.includes('Bavaria Freight AG'));
      assert.ok(generated.bodyText.includes('APICS CSCP'));
      assert.strictEqual(generated.integrityAudit.passed, true);

      // Verify post-generation auditor catches ungrounded brand injection
      const auditBad = auditGeneratedEmailClaims('I previously worked at Google for 12 years.', profile);
      assert.strictEqual(auditBad.passed, false);
      assert.ok(auditBad.warnings.length > 0);
    });

    it('handles missing profile fields honestly without inventing history', () => {
      const contact: HrContact = {
        id: 'hr_empty',
        companyName: 'TestCo',
        designation: 'HR Recruiter',
        roleCategory: 'HR Recruiter',
        email: 'hr@testco.com',
        country: 'United States',
        sourceType: 'official_company_careers',
        sourceUrl: 'https://testco.com/careers',
        associatedJobIds: [],
        emailVerificationStatus: 'Domain Valid',
        contactConfidence: 0.7,
        evidence: 'Careers contact',
        discoveredAt: new Date().toISOString(),
        contactStatus: 'active',
        isRoleBased: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const res = generateDeterministicGroundedEmail({
        profile: null,
        contact,
        templateType: 'Direct Job Application',
        tone: 'Professional',
      });
      assert.ok(res.missingDataNotices.length > 0);
      assert.ok(res.bodyText.includes('Please find my attached resume'));
    });

    it('enforces attachment MIME types, extensions, size limits, and builds valid PDF previews', () => {
      assert.strictEqual(
        validateResumeAttachment({ fileName: 'cv.pdf', mimeType: 'application/pdf', fileSizeBytes: 120_000 }).valid,
        true
      );
      assert.strictEqual(
        validateResumeAttachment({
          fileName: 'cv.docx',
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          fileSizeBytes: 90_000,
        }).valid,
        true
      );
      assert.strictEqual(
        validateResumeAttachment({ fileName: 'malware.exe', mimeType: 'application/octet-stream', fileSizeBytes: 1000 }).valid,
        false
      );
      assert.strictEqual(
        validateResumeAttachment({ fileName: 'huge.pdf', mimeType: 'application/pdf', fileSizeBytes: 6 * 1024 * 1024 }).valid,
        false
      );

      const pdfBytes = generateMinimalPdfFromText('Test Resume', 'Experience at Acme Corp');
      const header = new TextDecoder().decode(pdfBytes.slice(0, 8));
      assert.ok(header.startsWith('%PDF-1.4'));
    });
  });

  // --------------------------------------------------------------------------
  // 3. OAUTH TOKEN ENCRYPTION & MOCKED END-TO-END HTTP + SECURITY SUITE
  // --------------------------------------------------------------------------
  describe('3. OAuth Token Encryption, Approval Gate, Mock Provider Sending & Isolation', () => {
    it('encrypts OAuth tokens using AES-256-GCM and strips secrets in client serialization', async () => {
      const secret = 'unit-test-encryption-secret-32chars!';
      const encrypted = await encryptSecretToken('ya29.super-secret-oauth-token', secret);
      assert.ok(encrypted.startsWith('v1:'));
      assert.ok(!encrypted.includes('super-secret'));

      const decrypted = await decryptSecretToken(encrypted, secret);
      assert.strictEqual(decrypted, 'ya29.super-secret-oauth-token');

      const sig = await signOAuthState('raw123', secret);
      assert.strictEqual(await verifyOAuthStateSignature('raw123', sig, secret), true);
      assert.strictEqual(await verifyOAuthStateSignature('tampered', sig, secret), false);

      const safe = sanitizeEmailAccountRow({
        id: 'acc_1',
        user_id: 'u1',
        provider: 'gmail',
        email: 'user@gmail.com',
        encrypted_access_token: encrypted,
        encrypted_refresh_token: encrypted,
        scopes: '["gmail.send"]',
        status: 'connected',
      }) as any;
      assert.strictEqual(safe.encryptedAccessToken, undefined);
      assert.strictEqual(safe.encrypted_access_token, undefined);
      assert.strictEqual(safe.accessToken, undefined);
    });

    it('enforces OAuth callback, approval gate, idempotency, token refresh, failure handling, DNC & tenant isolation', async () => {
      const suffix = crypto.randomUUID().slice(0, 8);
      const emailA = `cand_a_${suffix}@applyvise-test.org`;
      const emailB = `cand_b_${suffix}@applyvise-test.org`;
      const userA = authAndStore.createUser('Candidate Alpha', emailA, 'Password123!');
      const userB = authAndStore.createUser('Candidate Beta', emailB, 'Password123!');

      // Grant Pro subscription to Candidate A; leave Candidate B on Free tier
      authAndStore.updateUserSubscription(userA.id, 'pro', 'monthly');

      const loginA = authAndStore.verifyLogin(emailA, 'Password123!');
      const loginB = authAndStore.verifyLogin(emailB, 'Password123!');

      // Save an authentic PDF resume blob for Candidate A
      const pdfBytes = generateMinimalPdfFromText('Candidate Alpha Resume', 'Supply Chain Analyst at Example Logistics.');
      const resumeId = `res_${crypto.randomUUID()}`;
      authAndStore.saveResumeDocument(userA.id, {
        id: resumeId,
        fileName: 'Alpha_CV.pdf',
        fileType: 'pdf',
        fileSizeBytes: pdfBytes.length,
        extractedText: 'Supply Chain Analyst at Example Logistics.',
        isScanned: false,
        mimeType: 'application/pdf',
      });
      hrOutreachStore.saveResumeFileBlob({
        resumeId,
        userId: userA.id,
        fileName: 'Alpha_CV.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: pdfBytes.length,
        dataBase64: Buffer.from(pdfBytes).toString('base64'),
      });

      // Persist a valid HR contact
      const { contact } = hrOutreachStore.upsertHrContact({
        companyName: 'MockPartner GmbH',
        contactName: 'Elena Richter',
        designation: 'Technical Recruiter',
        roleCategory: 'Technical Recruiter',
        email: `elena.${suffix}@mockpartner-hr.de`,
        country: 'Germany',
        sourceType: 'official_company_careers',
        sourceName: 'MockPartner Careers',
        sourceUrl: 'https://mockpartner-hr.de/careers',
        emailVerificationStatus: 'Domain Valid',
        contactConfidence: 0.9,
        evidence: 'Public careers contact',
        isRoleBased: false,
      });

      const { contact: dncContact } = hrOutreachStore.upsertHrContact({
        companyName: 'OptOut Corp',
        designation: 'HR Recruiter',
        roleCategory: 'HR Recruiter',
        email: `optout.${suffix}@optout-hr.de`,
        country: 'United Kingdom',
        sourceType: 'official_company_careers',
        sourceName: 'OptOut Careers',
        sourceUrl: 'https://optout-hr.de/careers',
        emailVerificationStatus: 'Domain Valid',
        contactConfidence: 0.85,
        evidence: 'Public careers contact',
        isRoleBased: false,
      });

      const sentPayloads: any[] = [];
      let shouldFailSend = false;
      let refreshedCount = 0;

      const mockAdapter: EmailProviderAdapter = {
        provider: 'gmail',
        isConfigured: () => true,
        getAuthorizationUrl: ({ state, redirectUri }) =>
          `https://mock-oauth.local/auth?state=${encodeURIComponent(state)}&redirect_uri=${encodeURIComponent(redirectUri)}`,
        exchangeCode: async ({ code }) => ({
          accessToken: `mock-access-${code}`,
          refreshToken: `mock-refresh-${code}`,
          expiresInSeconds: 3600,
          email: emailA,
          displayName: 'Candidate Alpha',
          scopes: ['https://www.googleapis.com/auth/gmail.send'],
        }),
        refreshAccessToken: async ({ refreshToken }) => {
          refreshedCount++;
          return {
            accessToken: `mock-refreshed-${refreshToken}`,
            refreshToken,
            expiresInSeconds: 3600,
          };
        },
        revokeToken: async () => true,
        sendEmail: async (_accessToken, payload) => {
          if (shouldFailSend) {
            return {
              ok: false,
              provider: 'gmail',
              error: 'Simulated upstream 429 rate limit',
              errorCode: '429',
            };
          }
          sentPayloads.push(payload);
          return {
            ok: true,
            provider: 'gmail',
            providerMessageId: `msg_mock_${sentPayloads.length}`,
            providerThreadId: `thr_mock_${sentPayloads.length}`,
            acceptedAt: new Date().toISOString(),
          };
        },
        fetchRepliesForThreads: async () => [],
      };

      setTestMockEmailProvider(mockAdapter);
      const { server, baseUrl } = await startTestServer();

      try {
        // Unauthenticated API rejection
        const unauth = await fetch(`${baseUrl}/api/hr-outreach/overview`);
        assert.strictEqual(unauth.status, 401);

        // CSRF cross-origin rejection on POST
        const csrfFail = await fetch(`${baseUrl}/api/hr-outreach/campaigns`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${loginA.token}`,
            Origin: 'https://evil-attacker.example.com',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: 'Bad Campaign' }),
        });
        assert.strictEqual(csrfFail.status, 403);

        // Free tier Candidate B blocked from AI generation & sending
        const freeGen = await fetch(`${baseUrl}/api/hr-outreach/contacts/${contact.id}/generate-email`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${loginB.token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ templateType: 'Direct Job Application', tone: 'Professional' }),
        });
        assert.strictEqual(freeGen.status, 403);

        // Connect Gmail via OAuth flow
        const connectResp = await fetch(`${baseUrl}/api/hr-outreach/email-accounts/google/connect`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${loginA.token}` },
        });
        const connectJson = (await connectResp.json()) as any;
        assert.strictEqual(connectResp.status, 200);
        assert.ok(connectJson.state);

        // Callback exchanges code & stores encrypted tokens
        const cbResp = await fetch(
          `${baseUrl}/api/hr-outreach/email-accounts/gmail/callback?code=authcode123&state=${encodeURIComponent(connectJson.state)}`,
          {
            headers: {
              Authorization: `Bearer ${loginA.token}`,
              Accept: 'application/json',
            },
          }
        );
        const cbJson = (await cbResp.json()) as any;
        assert.strictEqual(cbResp.status, 200);
        assert.strictEqual(cbJson.account.email, emailA);
        const accountId = cbJson.account.id;

        // Verify GET /email-accounts never leaks tokens
        const accListResp = await fetch(`${baseUrl}/api/hr-outreach/email-accounts`, {
          headers: { Authorization: `Bearer ${loginA.token}` },
        });
        const accListJson = (await accListResp.json()) as any;
        assert.strictEqual(JSON.stringify(accListJson).includes('mock-access'), false);
        assert.strictEqual(JSON.stringify(accListJson).includes('encryptedAccessToken'), false);

        // Force token near-expiry so send verifies automatic token refresh
        hrOutreachStore.updateEmailAccountTokens({
          userId: userA.id,
          accountId,
          encryptedAccessToken: await encryptSecretToken('expired-token'),
          tokenExpiresAt: new Date(Date.now() - 60_000).toISOString(),
        });

        // Reject sending when explicitApproval !== true
        const unapprovedResp = await fetch(`${baseUrl}/api/hr-outreach/messages/send`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${loginA.token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contactId: contact.id,
            emailAccountId: accountId,
            subject: 'Application for Technical Role',
            bodyText: 'Please review my attached resume.',
            resumeDocumentId: resumeId,
            resumeConfirmed: true,
            explicitApproval: false,
          }),
        });
        assert.strictEqual(unapprovedResp.status, 400);
        assert.strictEqual(sentPayloads.length, 0);

        // Reject when attachment isn't confirmed
        const unconfirmedAttach = await fetch(`${baseUrl}/api/hr-outreach/messages/send`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${loginA.token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contactId: contact.id,
            emailAccountId: accountId,
            subject: 'Application for Technical Role',
            bodyText: 'Please review my attached resume.',
            resumeDocumentId: resumeId,
            resumeConfirmed: false,
            explicitApproval: true,
          }),
        });
        assert.strictEqual(unconfirmedAttach.status, 400);

        // Approved send succeeds, refreshes expired token, persists provider messageId
        const idempKey = `idem_${suffix}_1`;
        const sendOkResp = await fetch(`${baseUrl}/api/hr-outreach/messages/send`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${loginA.token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contactId: contact.id,
            emailAccountId: accountId,
            subject: 'Application for Technical Role',
            bodyText: 'Grounded introduction with verified resume attached.',
            resumeDocumentId: resumeId,
            resumeConfirmed: true,
            explicitApproval: true,
            idempotencyKey: idempKey,
          }),
        });
        const sendOkJson = (await sendOkResp.json()) as any;
        assert.strictEqual(sendOkResp.status, 200);
        assert.strictEqual(sendOkJson.message.status, 'provider_accepted');
        assert.strictEqual(sendOkJson.message.providerMessageId, 'msg_mock_1');
        assert.strictEqual(refreshedCount, 1);
        assert.strictEqual(sentPayloads.length, 1);
        assert.strictEqual(sentPayloads[0].attachment.fileName, 'Alpha_CV.pdf');

        // Duplicate send with same idempotencyKey blocked (HTTP 409)
        const dupResp = await fetch(`${baseUrl}/api/hr-outreach/messages/send`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${loginA.token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contactId: contact.id,
            emailAccountId: accountId,
            subject: 'Application for Technical Role',
            bodyText: 'Grounded introduction with verified resume attached.',
            resumeDocumentId: resumeId,
            resumeConfirmed: true,
            explicitApproval: true,
            idempotencyKey: idempKey,
          }),
        });
        assert.strictEqual(dupResp.status, 409);
        assert.strictEqual(sentPayloads.length, 1);

        // Tenant Isolation: Candidate B cannot read Candidate A's message or preview Candidate A's resume
        const stealMsg = await fetch(`${baseUrl}/api/hr-outreach/messages/${sendOkJson.message.id}`, {
          headers: { Authorization: `Bearer ${loginB.token}` },
        });
        assert.strictEqual(stealMsg.status, 404);

        const stealResume = await fetch(`${baseUrl}/api/hr-outreach/resumes/${resumeId}/preview`, {
          headers: { Authorization: `Bearer ${loginB.token}` },
        });
        assert.strictEqual(stealResume.status, 404);

        // Do-Not-Contact enforcement
        await fetch(`${baseUrl}/api/hr-outreach/do-not-contact`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${loginA.token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: dncContact.email, reason: 'Candidate opt-out' }),
        });

        const dncBlocked = await fetch(`${baseUrl}/api/hr-outreach/messages/send`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${loginA.token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contactId: dncContact.id,
            emailAccountId: accountId,
            subject: 'Test opt out',
            bodyText: 'Should be blocked.',
            explicitApproval: true,
          }),
        });
        assert.strictEqual(dncBlocked.status, 403);

        // Provider failure handling records failed status cleanly
        shouldFailSend = true;
        const failSendResp = await fetch(`${baseUrl}/api/hr-outreach/messages/send`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${loginA.token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contactId: contact.id,
            emailAccountId: accountId,
            subject: 'Second attempt trigger error',
            bodyText: 'Should mark status failed.',
            explicitApproval: true,
          }),
        });
        const failJson = (await failSendResp.json()) as any;
        assert.strictEqual(failSendResp.status, 502);
        assert.strictEqual(failJson.message.status, 'failed');

        // Account disconnection purges secrets and blocks further sends
        const delResp = await fetch(`${baseUrl}/api/hr-outreach/email-accounts/${accountId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${loginA.token}` },
        });
        assert.strictEqual(delResp.status, 200);
        const afterDel = hrOutreachStore.getEmailAccountWithSecrets(userA.id, accountId);
        assert.strictEqual(afterDel?.summary.status, 'disconnected');
        assert.strictEqual(afterDel?.encryptedAccessToken, '');

        // Campaign creation & contact enrollment
        const campResp = await fetch(`${baseUrl}/api/hr-outreach/campaigns`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${loginA.token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Germany Supply Chain Applications',
            targetCountry: 'Germany',
            targetRoles: ['Supply Chain Analyst'],
            dailyLimit: 5,
          }),
        });
        const campJson = (await campResp.json()) as any;
        assert.strictEqual(campResp.status, 200);
        const campAddResp = await fetch(`${baseUrl}/api/hr-outreach/campaigns/${campJson.campaign.id}/contacts`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${loginA.token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ contactIds: [contact.id] }),
        });
        const campAddJson = (await campAddResp.json()) as any;
        assert.strictEqual(campAddJson.added, 1);

        // Microsoft Outlook OAuth connect + callback + inbound reply sync
        const outlookMock: EmailProviderAdapter = {
          ...mockAdapter,
          provider: 'outlook',
          fetchRepliesForThreads: async () => [
            {
              providerMessageId: 'reply_outlook_1',
              providerThreadId: 'thr_mock_1',
              fromEmail: contact.email,
              subject: 'Re: Application for Technical Role',
              snippet: 'Thanks for reaching out, let us schedule an intro call next Tuesday.',
              receivedAt: new Date().toISOString(),
            },
          ],
        };
        setTestMockEmailProvider(outlookMock);

        const msConnect = await fetch(`${baseUrl}/api/hr-outreach/email-accounts/microsoft/connect`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${loginA.token}` },
        });
        const msConnectJson = (await msConnect.json()) as any;
        assert.strictEqual(msConnect.status, 200);

        const msCb = await fetch(
          `${baseUrl}/api/hr-outreach/email-accounts/outlook/callback?code=ms_code_99&state=${encodeURIComponent(msConnectJson.state)}`,
          {
            headers: { Authorization: `Bearer ${loginA.token}`, Accept: 'application/json' },
          }
        );
        const msCbJson = (await msCb.json()) as any;
        assert.strictEqual(msCb.status, 200);
        assert.strictEqual(msCbJson.account.provider, 'outlook');

        // Without mock & without server OAuth credentials, connecting Gmail/Outlook fails closed with 503
        setTestMockEmailProvider(null);
        const unconfiguredConnect = await fetch(`${baseUrl}/api/hr-outreach/email-accounts/google/connect`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${loginA.token}` },
        });
        assert.strictEqual(unconfiguredConnect.status, 503);
      } finally {
        setTestMockEmailProvider(null);
        server.closeAllConnections?.();
        server.close();
      }
    });
  });

  // --------------------------------------------------------------------------
  // 4. UI NAVIGATION, ROUTE INTEGRATION & RESPONSIVENESS CONTRACTS
  // --------------------------------------------------------------------------
  describe('4. Navigation & UI Architectural Verification', () => {
    it('integrates AI HR Outreach in DashboardShell, App routing, and all 9 required sub-tabs', () => {
      const shell = fs.readFileSync(path.join(process.cwd(), 'src/components/DashboardShell.tsx'), 'utf-8');
      const appTsx = fs.readFileSync(path.join(process.cwd(), 'src/App.tsx'), 'utf-8');
      const hrPage = fs.readFileSync(path.join(process.cwd(), 'src/components/HrOutreachPage.tsx'), 'utf-8');

      assert.ok(shell.includes("'hr_outreach'"));
      assert.ok(shell.includes('AI HR Outreach'));
      assert.ok(appTsx.includes('/dashboard/hr-outreach'));
      assert.ok(appTsx.includes('HrOutreachPage'));

      for (const tabLabel of [
        'Overview',
        'HR Contacts',
        'Companies',
        'Jobs with Contacts',
        'AI Email Studio',
        'Outreach Campaigns',
        'Sent Emails',
        'Replies & Follow-ups',
        'Email Accounts',
        'Settings',
      ]) {
        assert.ok(hrPage.includes(tabLabel), `Missing UI sub-tab: ${tabLabel}`);
      }
    });
  });

  after(() => {
    try {
      sqlite
        .prepare("DELETE FROM hr_contacts WHERE email LIKE '%@mockpartner-hr.de' OR email LIKE '%@optout-hr.de' OR email LIKE '%@acme-global-demo.com'")
        .run();
      sqlite
        .prepare("DELETE FROM contact_discovery_runs WHERE triggered_by IN ('test_ssrf', 'test_ssrf_meta')")
        .run();
      sqlite
        .prepare("DELETE FROM users WHERE email LIKE '%@applyvise-test.org'")
        .run();
    } catch {
      // ignore cleanup error
    }
  });
});
