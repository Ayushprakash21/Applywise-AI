// server/hrOutreachRoutes.ts
// Complete Express API Router for AI HR Outreach & Direct Application Automation
// Enforces auth, tenant isolation, OAuth token encryption, CSRF states, SSRF checks, attachment security, and explicit user approval.

import crypto from 'node:crypto';
import express, { Request, Response, NextFunction } from 'express';
import { GoogleGenAI } from '@google/genai';
import { authAndStore, AuthUser, sqlite } from './authAndStore.ts';
import { hrOutreachStore } from './hrOutreachStore.ts';
import { hrDiscoveryQueueStore } from './hrDiscoveryQueueStore.ts';
import {
  discoverAndPersistHrContacts,
  getHrDiscoverySourceRegistry,
  nodeMxResolver,
} from './hrDiscoveryEngine.ts';
import { resumeEngine } from './resumeEngine.ts';
import { getEffectivePlan, checkFeatureEntitlement } from '../src/config/freeAccess.ts';
import { classifyHrDesignation } from '../src/utils/hrContactDiscovery.ts';
import { evaluateContactRelevance } from '../src/utils/hrContactMatcher.ts';
import { runEmailVerificationPipeline } from '../src/utils/hrEmailVerification.ts';
import {
  auditGeneratedEmailClaims,
  buildOutreachEmailPrompt,
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
  signOAuthState,
  verifyOAuthStateSignature,
} from '../src/utils/tokenCrypto.ts';
import {
  getEmailProviderAdapter,
  ProviderOAuthConfig,
} from '../src/utils/emailProviders.ts';
import {
  EmailAccountProvider,
  OutreachEmailTone,
  OutreachTemplateType,
} from '../src/types/index.ts';

export interface HrOutreachRequest extends Request {
  user?: AuthUser;
}

function getOAuthConfig(): ProviderOAuthConfig {
  return {
    googleClientId: process.env.GOOGLE_OAUTH_CLIENT_ID || process.env.GOOGLE_CLIENT_ID,
    googleClientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET,
    microsoftClientId: process.env.MICROSOFT_CLIENT_ID || process.env.AZURE_CLIENT_ID,
    microsoftClientSecret: process.env.MICROSOFT_CLIENT_SECRET || process.env.AZURE_CLIENT_SECRET,
    microsoftTenantId: process.env.MICROSOFT_TENANT_ID || 'common',
  };
}

function getEntitlementForUser(user: AuthUser) {
  const sub = authAndStore.getUserSubscription(user.id);
  const eff = getEffectivePlan(user, sub);
  const canUseOutreach = checkFeatureEntitlement(user, 'hr_outreach', sub);
  const monthlyEmailLimit = eff.planId === 'black' ? 200 : eff.planId === 'pro' ? 100 : 0;
  const emailsSentThisMonth = hrOutreachStore.countSentMessagesInWindow(user.id, 30);
  return {
    effective: eff,
    planId: eff.planId,
    canSendOutreach: canUseOutreach && eff.planId !== 'free',
    canGenerateAiEmail: canUseOutreach && eff.planId !== 'free',
    monthlyEmailLimit,
    emailsSentThisMonth,
  };
}

function isGeminiAvailable(): boolean {
  const key = process.env.GEMINI_API_KEY?.trim() || '';
  return Boolean(key && key.length >= 25 && !key.startsWith('MY_GEMINI'));
}

function resolveAttachmentBinary(userId: string, resumeDocumentId: string): {
  fileName: string;
  mimeType: string;
  buffer: Buffer;
} | null {
  if (resumeDocumentId.startsWith('tailored_')) {
    const appId = resumeDocumentId.replace(/^tailored_/, '');
    const app = authAndStore.getApplicationById(userId, appId);
    const profile = authAndStore.getProfile(userId);
    if (!app || !profile) return null;
    const tr = app.tailoredResume;
    const textLines = [
      profile.fullName || '',
      [profile.email, profile.phone, profile.location].filter(Boolean).join(' | '),
      '',
      tr?.headline || app.role || '',
      tr?.professionalSummary || tr?.summary || profile.summary || '',
      '',
      'TARGETED SKILLS',
      (tr?.targetedSkills || profile.skills || []).join(', '),
      '',
      'EXPERIENCE',
      ...((tr?.tailoredExperiences || []).flatMap((ex) => [
        `${ex.role} — ${ex.company} (${ex.period})`,
        ...(ex.bulletPoints || []).map((b) => `- ${b}`),
        '',
      ])),
    ].join('\n');

    const pdfBytes = generateMinimalPdfFromText(`${profile.fullName || 'Candidate'} — ${app.company} Resume`, textLines);
    const cleanCo = (app.company || 'Employer').replace(/[^a-zA-Z0-9_-]/g, '_');
    return {
      fileName: `${cleanCo}_Tailored_Resume.pdf`,
      mimeType: 'application/pdf',
      buffer: Buffer.from(pdfBytes),
    };
  }

  // First try uploaded binary blob or disk storage
  const blob = hrOutreachStore.getResumeFileBlobForUser(userId, resumeDocumentId);
  if (blob) {
    return {
      fileName: blob.fileName,
      mimeType: blob.mimeType,
      buffer: blob.buffer,
    };
  }

  // Fallback: render extracted_text as clean PDF if document record belongs to this user
  const docRow = sqlite
    .prepare('SELECT id, user_id, file_name, extracted_text FROM resume_documents WHERE id = ? AND user_id = ?')
    .get(resumeDocumentId, userId) as any;
  if (docRow && docRow.extracted_text) {
    const pdfBytes = generateMinimalPdfFromText(docRow.file_name, docRow.extracted_text);
    const baseName = String(docRow.file_name).replace(/\.[^.]+$/, '');
    return {
      fileName: `${baseName}.pdf`,
      mimeType: 'application/pdf',
      buffer: Buffer.from(pdfBytes),
    };
  }

  return null;
}

export function createHrOutreachRouter(
  requireAuthMiddleware: (req: HrOutreachRequest, res: Response, next: NextFunction) => any
) {
  const router = express.Router();

  // CSRF / Origin check for state-mutating endpoints
  router.use((req: HrOutreachRequest, res: Response, next: NextFunction) => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      const origin = req.headers.origin;
      const host = req.headers.host;
      if (origin && host) {
        try {
          const originHost = new URL(origin).host;
          if (originHost !== host) {
            return res.status(403).json({ success: false, error: 'Cross-origin mutation rejected (CSRF protection).' });
          }
        } catch {
          return res.status(403).json({ success: false, error: 'Invalid Origin header.' });
        }
      }
    }
    next();
  });

  // OAuth Callbacks (require active signed-in session + verified signed CSRF state)
  router.get('/email-accounts/:provider/callback', requireAuthMiddleware, async (req: HrOutreachRequest, res: Response) => {
    try {
      const provider = req.params.provider as EmailAccountProvider;
      if (provider !== 'gmail' && provider !== 'outlook') {
        return res.status(400).json({ success: false, error: 'Unsupported email provider.' });
      }
      const code = String(req.query.code || '');
      const stateToken = String(req.query.state || '');
      const errParam = String(req.query.error || '');

      if (errParam) {
        return res.redirect(`/dashboard/hr-outreach?oauth_error=${encodeURIComponent(errParam)}`);
      }
      if (!code || !stateToken) {
        return res.status(400).json({ success: false, error: 'Missing OAuth code or state parameter.' });
      }

      const [rawState, sig] = stateToken.split('.');
      if (!rawState || !sig || !(await verifyOAuthStateSignature(rawState, sig))) {
        return res.status(403).json({ success: false, error: 'Invalid or tampered OAuth CSRF state signature.' });
      }

      const consumed = hrOutreachStore.consumeOAuthState(stateToken, req.user!.id, provider);
      if (!consumed) {
        return res.status(403).json({ success: false, error: 'OAuth state expired or does not belong to current user.' });
      }

      const adapter = getEmailProviderAdapter(provider);
      const cfg = getOAuthConfig();
      const exchanged = await adapter.exchangeCode({
        code,
        redirectUri: consumed.redirectUri,
        cfg,
      });

      const encryptedAccess = await encryptSecretToken(exchanged.accessToken);
      const encryptedRefresh = exchanged.refreshToken
        ? await encryptSecretToken(exchanged.refreshToken)
        : undefined;
      const expiresAt = new Date(Date.now() + exchanged.expiresInSeconds * 1000).toISOString();

      const account = hrOutreachStore.upsertEmailAccount({
        userId: req.user!.id,
        provider,
        email: exchanged.email,
        displayName: exchanged.displayName,
        encryptedAccessToken: encryptedAccess,
        encryptedRefreshToken: encryptedRefresh,
        tokenExpiresAt: expiresAt,
        scopes: exchanged.scopes,
      });

      authAndStore.addAuditLog(
        req.user!.id,
        'User manual',
        'EMAIL_ACCOUNT_CONNECTED',
        account.email,
        `Connected ${provider} OAuth account with least-privilege scopes.`
      );

      if (req.headers.accept?.includes('application/json')) {
        return res.json({ success: true, account });
      }
      return res.redirect(`/dashboard/hr-outreach?oauth_connected=${encodeURIComponent(provider)}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (req.headers.accept?.includes('application/json')) {
        return res.status(400).json({ success: false, error: msg });
      }
      return res.redirect(`/dashboard/hr-outreach?oauth_error=${encodeURIComponent(msg)}`);
    }
  });

  // All remaining routes require authentication
  router.use(requireAuthMiddleware);

  // 1. OVERVIEW & ENTITLEMENTS
  router.get('/overview', (req: HrOutreachRequest, res: Response) => {
    const counts = hrOutreachStore.getOverviewCounts(req.user!.id);
    const ent = getEntitlementForUser(req.user!);
    const cfg = getOAuthConfig();
    const gmailConfigured = getEmailProviderAdapter('gmail').isConfigured(cfg);
    const outlookConfigured = getEmailProviderAdapter('outlook').isConfigured(cfg);
    const recentRuns = hrOutreachStore.listDiscoveryRuns(10);

    res.json({
      success: true,
      overview: {
        ...counts,
        oauthConfigured: {
          gmail: gmailConfigured,
          outlook: outlookConfigured,
        },
        entitlement: {
          planId: ent.planId,
          canSendOutreach: ent.canSendOutreach,
          canGenerateAiEmail: ent.canGenerateAiEmail,
          monthlyEmailLimit: ent.monthlyEmailLimit,
          emailsSentThisMonth: ent.emailsSentThisMonth,
        },
      },
      recentRuns,
      templates: OUTREACH_TEMPLATES,
      tones: OUTREACH_TONES,
    });
  });

  // 2. SOURCE REGISTRY
  router.get('/sources', (_req: HrOutreachRequest, res: Response) => {
    res.json({
      success: true,
      sources: getHrDiscoverySourceRegistry(),
    });
  });

  // 3. CONTACTS INVENTORY & RELEVANCE SCORING
  router.get('/contacts', (req: HrOutreachRequest, res: Response) => {
    const {
      search,
      country,
      company,
      designation,
      contactType,
      verificationStatus,
      sourceType,
      jobId,
      includeArchived,
      limit,
      offset,
      sortBy,
    } = req.query as Record<string, string | undefined>;

    const result = hrOutreachStore.listHrContacts({
      userId: req.user!.id,
      search,
      country,
      company,
      designation,
      contactType,
      verificationStatus,
      sourceType,
      jobId,
      includeArchived: includeArchived === 'true',
      limit: limit ? Number(limit) : 50,
      offset: offset ? Number(offset) : 0,
    });

    const profile = authAndStore.getProfile(req.user!.id);
    const preferences = authAndStore.getPreferences(req.user!.id);

    let targetJob = null as any;
    if (jobId) {
      targetJob = authAndStore.getVacancyById(jobId);
    }

    const dncList = hrOutreachStore.listDoNotContact(req.user!.id);
    const dncSet = new Set(dncList.map((d) => d.email.toLowerCase()));

    const enriched = result.contacts.map((c) => {
      const matchedJob = targetJob || (c.associatedJobIds[0] ? authAndStore.getVacancyById(c.associatedJobIds[0]) : null);
      const relevance = evaluateContactRelevance({
        contact: c,
        job: matchedJob,
        profile,
        preferences,
      });
      return {
        ...c,
        relevance,
        relatedJobTitle: matchedJob?.title,
        isDoNotContact: dncSet.has(c.email.toLowerCase()),
      };
    });

    if (sortBy === 'relevance') {
      enriched.sort((a, b) => (b.relevance?.overallScore || 0) - (a.relevance?.overallScore || 0));
    }

    res.json({
      success: true,
      contacts: enriched,
      total: result.total,
    });
  });

  // 3b. COMPANIES & JOBS COVERAGE ENDPOINTS
  router.get('/companies', (req: HrOutreachRequest, res: Response) => {
    const { search, onlyWithContacts, limit, offset } = req.query as Record<string, string | undefined>;
    const result = hrDiscoveryQueueStore.listCompaniesWithContactSummary({
      userId: req.user!.id,
      search,
      onlyWithContacts: onlyWithContacts === 'true',
      limit: limit ? Number(limit) : 40,
      offset: offset ? Number(offset) : 0,
    });
    res.json({ success: true, ...result });
  });

  router.get('/jobs-with-contacts', (req: HrOutreachRequest, res: Response) => {
    const { search, onlyWithContacts, limit, offset } = req.query as Record<string, string | undefined>;
    const result = hrDiscoveryQueueStore.getJobsWithContactsCoverage({
      userId: req.user!.id,
      search,
      onlyWithContacts: onlyWithContacts === 'true',
      limit: limit ? Number(limit) : 40,
      offset: offset ? Number(offset) : 0,
    });
    res.json({ success: true, ...result });
  });

  // 3c. MANUAL CONTACT SUBMISSION / CORRECTION (TENANT-ISOLATED)
  router.post('/contacts/manual', async (req: HrOutreachRequest, res: Response) => {
    try {
      const { companyName, companyWebsite, contactName, designation, email, country, jobId, sourceUrl, evidence } =
        req.body || {};

      if (!companyName || !String(companyName).trim() || !email || !String(email).trim()) {
        return res.status(400).json({ success: false, error: 'Company name and email are required.' });
      }

      const cleanEmail = String(email).trim().toLowerCase();
      const verification = await runEmailVerificationPipeline(
        {
          email: cleanEmail,
          sourceUrl: typeof sourceUrl === 'string' && sourceUrl.trim() ? sourceUrl.trim() : undefined,
          evidence: typeof evidence === 'string' && evidence.trim() ? evidence.trim() : undefined,
        },
        nodeMxResolver
      );

      if (!verification.syntaxValid) {
        return res.status(400).json({
          success: false,
          error: verification.reasons[0] || 'Invalid email syntax or disposable domain.',
        });
      }

      const cleanName = typeof contactName === 'string' && contactName.trim() ? contactName.trim() : undefined;
      const classified = classifyHrDesignation(
        `${designation || ''} ${evidence || ''}`,
        cleanEmail,
        cleanName
      );

      const { contact, created } = hrDiscoveryQueueStore.submitOrCorrectUserContact({
        userId: req.user!.id,
        companyName: String(companyName).trim(),
        companyWebsite: typeof companyWebsite === 'string' ? companyWebsite.trim() : undefined,
        contactName: cleanName,
        designation: typeof designation === 'string' && designation.trim() ? designation.trim() : classified.designation,
        roleCategory: classified.roleCategory,
        contactType: classified.contactType,
        email: cleanEmail,
        country: typeof country === 'string' && country.trim() ? country.trim() : 'Global',
        jobId: typeof jobId === 'string' && jobId.trim() ? jobId.trim() : undefined,
        sourceUrl: typeof sourceUrl === 'string' ? sourceUrl.trim() : undefined,
        evidence: typeof evidence === 'string' ? evidence.trim() : undefined,
        emailVerificationStatus: verification.status === 'Invalid' ? 'Verification Failed' : verification.status,
        verificationLevels: verification.levels,
        mxHosts: verification.mxHosts,
        isRoleBased: verification.isRoleBased,
      });

      authAndStore.addAuditLog(
        req.user!.id,
        'User manual',
        'HR_CONTACT_MANUAL_SUBMIT',
        cleanEmail,
        `Submitted personal HR contact for ${companyName} (status: ${contact.emailVerificationStatus}).`
      );

      res.json({ success: true, contact, created, verification });
    } catch (err: unknown) {
      res.status(400).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
  });

  router.get('/contacts/:id', (req: HrOutreachRequest, res: Response) => {
    const data = hrOutreachStore.getHrContactById(req.params.id);
    if (!data) {
      return res.status(404).json({ success: false, error: 'HR Contact not found.' });
    }
    if (data.contact.isUserSubmitted && data.contact.submittedByUserId !== req.user!.id) {
      return res.status(404).json({ success: false, error: 'HR Contact not found.' });
    }
    const profile = authAndStore.getProfile(req.user!.id);
    const preferences = authAndStore.getPreferences(req.user!.id);
    const jobId = typeof req.query.jobId === 'string' ? req.query.jobId : data.contact.associatedJobIds[0];
    const job = jobId ? authAndStore.getVacancyById(jobId) : null;
    const relevance = evaluateContactRelevance({
      contact: data.contact,
      job,
      profile,
      preferences,
    });
    res.json({
      success: true,
      contact: {
        ...data.contact,
        sources: data.sources,
        relevance,
        relatedJobTitle: job?.title,
        isDoNotContact: hrOutreachStore.isDoNotContact(req.user!.id, data.contact.email),
      },
    });
  });

  // 4. DISCOVER HR CONTACTS FROM GCDE & OFFICIAL CAREER PAGES
  router.post('/contacts/discover', async (req: HrOutreachRequest, res: Response) => {
    try {
      const { companyName, companyWebsite, jobId, forceRefresh } = req.body || {};
      const result = await discoverAndPersistHrContacts({
        triggeredBy: req.user!.id,
        userId: req.user!.id,
        companyName: typeof companyName === 'string' ? companyName.trim() : undefined,
        companyWebsite: typeof companyWebsite === 'string' ? companyWebsite.trim() : undefined,
        jobId: typeof jobId === 'string' ? jobId.trim() : undefined,
        forceRefresh: Boolean(forceRefresh),
      });
      res.json({
        success: true,
        ...result,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(400).json({ success: false, error: msg });
    }
  });

  // 5. RE-VERIFY CONTACT EMAIL
  router.post('/contacts/:id/verify', async (req: HrOutreachRequest, res: Response) => {
    const data = hrOutreachStore.getHrContactById(req.params.id);
    if (!data) {
      return res.status(404).json({ success: false, error: 'HR Contact not found.' });
    }

    const verification = await runEmailVerificationPipeline(
      {
        email: data.contact.email,
        sourceUrl: data.contact.sourceUrl,
        evidence: data.contact.evidence,
        lastVerifiedAt: data.contact.lastVerifiedAt,
      },
      nodeMxResolver
    );

    const updated = hrOutreachStore.updateHrContactVerification(
      data.contact.id,
      verification.status,
      verification.isRoleBased,
      verification.checkedAt,
      {
        verificationLevels: verification.levels,
        mxHosts: verification.mxHosts,
        evidence: data.contact.sourceEvidence || data.contact.evidence,
      }
    );

    res.json({
      success: true,
      contact: updated,
      verification,
    });
  });

  // 6. MARK CONTACTED / ARCHIVE / RESTORE
  router.post('/contacts/:id/status', (req: HrOutreachRequest, res: Response) => {
    const { status, markContacted } = req.body || {};
    const validStatuses = ['active', 'archived', 'suppressed'];
    const targetStatus = validStatuses.includes(status) ? status : 'active';
    const updated = hrOutreachStore.updateHrContactStatus(
      req.params.id,
      targetStatus,
      markContacted ? new Date().toISOString() : undefined
    );
    if (!updated) {
      return res.status(404).json({ success: false, error: 'HR Contact not found.' });
    }
    res.json({ success: true, contact: updated });
  });

  // 7. AI EMAIL GENERATION STUDIO
  router.post('/contacts/:id/generate-email', async (req: HrOutreachRequest, res: Response) => {
    try {
      const ent = getEntitlementForUser(req.user!);
      if (!ent.canGenerateAiEmail) {
        return res.status(403).json({
          success: false,
          code: 'UPGRADE_REQUIRED',
          error: 'AI HR Email Studio requires an active Pro or BLACK ELITE membership.',
        });
      }

      const data = hrOutreachStore.getHrContactById(req.params.id);
      if (!data) {
        return res.status(404).json({ success: false, error: 'HR Contact not found.' });
      }

      const {
        jobId,
        templateType = 'Direct Job Application',
        tone = 'Professional',
        customNotes,
      } = req.body || {};

      const validTemplate: OutreachTemplateType = OUTREACH_TEMPLATES.includes(templateType)
        ? templateType
        : 'Direct Job Application';
      const validTone: OutreachEmailTone = OUTREACH_TONES.includes(tone) ? tone : 'Professional';

      const profile = authAndStore.getProfile(req.user!.id);
      const preferences = authAndStore.getPreferences(req.user!.id);
      const job = jobId ? authAndStore.getVacancyById(jobId) : null;

      // Always compute deterministic fallback baseline first
      const fallback = generateDeterministicGroundedEmail({
        profile,
        preferences,
        contact: data.contact,
        job,
        templateType: validTemplate,
        tone: validTone,
        customNotes,
      });

      if (!isGeminiAvailable() || process.env.NODE_ENV === 'test') {
        return res.json({
          success: true,
          generated: fallback,
        });
      }

      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
        const prompt = buildOutreachEmailPrompt({
          profile,
          preferences,
          contact: data.contact,
          job,
          templateType: validTemplate,
          tone: validTone,
          customNotes,
        });

        const aiResp = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: { responseMimeType: 'application/json' },
        });

        const parsed = JSON.parse(aiResp.text || '{}');
        if (parsed.subject && parsed.bodyText) {
          const audit = auditGeneratedEmailClaims(String(parsed.bodyText), profile);
          return res.json({
            success: true,
            generated: {
              subject: String(parsed.subject).trim(),
              bodyText: String(parsed.bodyText).trim(),
              usedGemini: true,
              groundedQualifications: fallback.groundedQualifications,
              missingDataNotices: fallback.missingDataNotices,
              integrityAudit: audit,
            },
          });
        }
      } catch (aiErr) {
        console.warn('[AI HR Email Studio] Gemini call fell back to deterministic grounded draft:', aiErr);
      }

      return res.json({
        success: true,
        generated: fallback,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return res.status(500).json({ success: false, error: msg });
    }
  });

  // 8. RESUME ATTACHMENT LISTING & SECURE INLINE PREVIEW
  router.get('/resumes', (req: HrOutreachRequest, res: Response) => {
    const resumes = hrOutreachStore.listCandidateResumeAttachments(req.user!.id);
    res.json({ success: true, resumes });
  });

  router.get('/resumes/:resumeId/preview', (req: HrOutreachRequest, res: Response) => {
    const resolved = resolveAttachmentBinary(req.user!.id, req.params.resumeId);
    if (!resolved) {
      return res.status(404).json({ success: false, error: 'Resume attachment not found or unauthorized.' });
    }
    const validation = validateResumeAttachment({
      fileName: resolved.fileName,
      mimeType: resolved.mimeType,
      fileSizeBytes: resolved.buffer.length,
    });
    if (!validation.valid) {
      return res.status(400).json({ success: false, error: validation.error });
    }

    res.setHeader('Content-Type', resolved.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${validation.sanitizedFileName}"`);
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Cache-Control', 'private, no-store');
    res.send(resolved.buffer);
  });

  // 9. EMAIL ACCOUNTS & OAUTH CONNECTION MANAGEMENT
  router.get('/email-accounts', (req: HrOutreachRequest, res: Response) => {
    const accounts = hrOutreachStore.listUserEmailAccounts(req.user!.id);
    const cfg = getOAuthConfig();
    res.json({
      success: true,
      accounts,
      oauthConfigured: {
        gmail: getEmailProviderAdapter('gmail').isConfigured(cfg),
        outlook: getEmailProviderAdapter('outlook').isConfigured(cfg),
      },
    });
  });

  router.post('/email-accounts/google/connect', async (req: HrOutreachRequest, res: Response) => {
    try {
      const cfg = getOAuthConfig();
      const adapter = getEmailProviderAdapter('gmail');
      if (!adapter.isConfigured(cfg)) {
        return res.status(503).json({
          success: false,
          code: 'OAUTH_NOT_CONFIGURED',
          error: 'Google OAuth client credentials (GOOGLE_OAUTH_CLIENT_ID & GOOGLE_OAUTH_CLIENT_SECRET) are not configured on the server.',
        });
      }

      const rawState = crypto.randomBytes(24).toString('hex');
      const sig = await signOAuthState(rawState);
      const signedState = `${rawState}.${sig}`;
      const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
      const redirectUri = `${baseUrl.replace(/\/$/, '')}/api/hr-outreach/email-accounts/gmail/callback`;

      hrOutreachStore.createOAuthState(req.user!.id, 'gmail', redirectUri, signedState);
      const authorizationUrl = adapter.getAuthorizationUrl({
        state: signedState,
        redirectUri,
        cfg,
      });

      res.json({ success: true, authorizationUrl, state: signedState, redirectUri });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(400).json({ success: false, error: msg });
    }
  });

  router.post('/email-accounts/microsoft/connect', async (req: HrOutreachRequest, res: Response) => {
    try {
      const cfg = getOAuthConfig();
      const adapter = getEmailProviderAdapter('outlook');
      if (!adapter.isConfigured(cfg)) {
        return res.status(503).json({
          success: false,
          code: 'OAUTH_NOT_CONFIGURED',
          error: 'Microsoft OAuth client credentials (MICROSOFT_CLIENT_ID & MICROSOFT_CLIENT_SECRET) are not configured on the server.',
        });
      }

      const rawState = crypto.randomBytes(24).toString('hex');
      const sig = await signOAuthState(rawState);
      const signedState = `${rawState}.${sig}`;
      const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
      const redirectUri = `${baseUrl.replace(/\/$/, '')}/api/hr-outreach/email-accounts/outlook/callback`;

      hrOutreachStore.createOAuthState(req.user!.id, 'outlook', redirectUri, signedState);
      const authorizationUrl = adapter.getAuthorizationUrl({
        state: signedState,
        redirectUri,
        cfg,
      });

      res.json({ success: true, authorizationUrl, state: signedState, redirectUri });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(400).json({ success: false, error: msg });
    }
  });

  router.delete('/email-accounts/:id', async (req: HrOutreachRequest, res: Response) => {
    const existing = hrOutreachStore.getEmailAccountWithSecrets(req.user!.id, req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Email account not found.' });
    }

    // Best-effort provider token revocation
    try {
      if (existing.encryptedAccessToken) {
        const token = await decryptSecretToken(existing.encryptedAccessToken);
        await getEmailProviderAdapter(existing.summary.provider).revokeToken(token);
      }
    } catch {
      // Proceed to disconnect and purge stored secrets locally
    }

    hrOutreachStore.disconnectEmailAccount(req.user!.id, req.params.id);
    authAndStore.addAuditLog(
      req.user!.id,
      'User manual',
      'EMAIL_ACCOUNT_DISCONNECTED',
      existing.summary.email,
      `Disconnected ${existing.summary.provider} account and purged encrypted OAuth tokens.`
    );

    res.json({ success: true, message: 'Email account disconnected and tokens purged.' });
  });

  // 10. MESSAGE PREVIEW / SAVE DRAFT & APPROVED SEND
  router.post('/messages/preview', (req: HrOutreachRequest, res: Response) => {
    try {
      const {
        contactId,
        campaignId,
        emailAccountId,
        jobId,
        templateType = 'Direct Job Application',
        tone = 'Professional',
        subject,
        bodyText,
        resumeDocumentId,
        saveDraft = true,
        draftId,
      } = req.body || {};

      if (!contactId || !subject || !bodyText) {
        return res.status(400).json({ success: false, error: 'contactId, subject, and bodyText are required.' });
      }

      const contactData = hrOutreachStore.getHrContactById(contactId);
      if (!contactData) {
        return res.status(404).json({ success: false, error: 'Recipient HR contact not found.' });
      }
      const contact = contactData.contact;

      const blockedDnc = hrOutreachStore.isDoNotContact(req.user!.id, contact.email);
      const profile = authAndStore.getProfile(req.user!.id);
      const audit = auditGeneratedEmailClaims(String(bodyText), profile);

      let attachmentMeta: { fileName: string; mimeType: string; sizeBytes: number } | undefined;
      let attachmentError: string | undefined;
      if (resumeDocumentId) {
        const bin = resolveAttachmentBinary(req.user!.id, resumeDocumentId);
        if (!bin) {
          attachmentError = 'Selected resume attachment could not be found.';
        } else {
          const v = validateResumeAttachment({
            fileName: bin.fileName,
            mimeType: bin.mimeType,
            fileSizeBytes: bin.buffer.length,
          });
          if (!v.valid) {
            attachmentError = v.error;
          } else {
            attachmentMeta = {
              fileName: v.sanitizedFileName,
              mimeType: bin.mimeType,
              sizeBytes: bin.buffer.length,
            };
          }
        }
      }

      const job = jobId ? authAndStore.getVacancyById(jobId) : null;
      let savedMessage = null;
      if (saveDraft && !attachmentError) {
        if (draftId) {
          savedMessage = hrOutreachStore.updateOutreachMessage(req.user!.id, draftId, {
            emailAccountId,
            subject: String(subject).trim(),
            bodyText: String(bodyText).trim(),
            resumeDocumentId,
            resumeFileName: attachmentMeta?.fileName,
            resumeFileSize: attachmentMeta?.sizeBytes,
            status: 'draft',
          });
        } else {
          savedMessage = hrOutreachStore.createOutreachMessage({
            userId: req.user!.id,
            contactId: contact.id,
            campaignId,
            emailAccountId,
            jobId,
            companyName: contact.companyName,
            jobTitle: job?.title,
            recipientEmail: contact.email,
            recipientName: contact.contactName,
            templateType,
            tone,
            subject: String(subject).trim(),
            bodyText: String(bodyText).trim(),
            resumeDocumentId,
            resumeFileName: attachmentMeta?.fileName,
            resumeFileSize: attachmentMeta?.sizeBytes,
            status: 'draft',
          });
        }
      }

      res.json({
        success: !attachmentError,
        readyToSend: !blockedDnc && !attachmentError && contact.emailVerificationStatus !== 'Invalid',
        warnings: [
          ...(blockedDnc ? ['Recipient is on your Do-Not-Contact suppression list.'] : []),
          ...(contact.emailVerificationStatus === 'Invalid' ? ['Recipient email failed validation.'] : []),
          ...(attachmentError ? [attachmentError] : []),
          ...audit.warnings,
        ],
        attachment: attachmentMeta,
        message: savedMessage,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(400).json({ success: false, error: msg });
    }
  });

  router.post('/messages/send', async (req: HrOutreachRequest, res: Response) => {
    try {
      const ent = getEntitlementForUser(req.user!);
      if (!ent.canSendOutreach) {
        return res.status(403).json({
          success: false,
          code: 'UPGRADE_REQUIRED',
          error: 'Sending HR outreach emails requires an active Pro or BLACK ELITE subscription.',
        });
      }

      const {
        contactId,
        campaignId,
        emailAccountId,
        jobId,
        templateType = 'Direct Job Application',
        tone = 'Professional',
        subject,
        bodyText,
        resumeDocumentId,
        resumeConfirmed,
        explicitApproval,
        idempotencyKey,
        draftId,
      } = req.body || {};

      // 1. Explicit candidate approval guard
      if (explicitApproval !== true) {
        return res.status(400).json({
          success: false,
          code: 'APPROVAL_REQUIRED',
          error: 'Explicit candidate approval is required before any outreach email can be sent.',
        });
      }

      if (!contactId || !emailAccountId || !subject || !bodyText) {
        return res.status(400).json({
          success: false,
          error: 'Recipient contact, connected sending email account, subject, and body are required.',
        });
      }

      // 2. Duplicate-send prevention via idempotencyKey
      const effectiveKey =
        idempotencyKey ||
        crypto
          .createHash('sha256')
          .update(`${req.user!.id}:${contactId}:${subject.trim()}:${resumeDocumentId || 'none'}`)
          .digest('hex');

      const existingSent = hrOutreachStore.findOutreachMessageByIdempotencyKey(req.user!.id, effectiveKey);
      if (
        existingSent &&
        ['sent', 'provider_accepted', 'delivered', 'replied'].includes(existingSent.status)
      ) {
        return res.status(409).json({
          success: false,
          code: 'DUPLICATE_SEND_PREVENTED',
          error: 'Duplicate email prevented: this exact outreach message was already accepted by the email provider.',
          message: existingSent,
        });
      }

      // 3. Recipient verification & Do-Not-Contact enforcement
      const contactData = hrOutreachStore.getHrContactById(contactId);
      if (!contactData) {
        return res.status(404).json({ success: false, error: 'HR contact not found.' });
      }
      const contact = contactData.contact;

      if (hrOutreachStore.isDoNotContact(req.user!.id, contact.email)) {
        return res.status(403).json({
          success: false,
          code: 'DO_NOT_CONTACT_BLOCKED',
          error: `Outreach blocked: ${contact.email} is on your Do-Not-Contact list.`,
        });
      }

      if (contact.emailVerificationStatus === 'Invalid') {
        return res.status(400).json({
          success: false,
          error: 'Cannot send to an Invalid email address.',
        });
      }

      // 4. Monthly & daily bounded outreach limits
      if (ent.emailsSentThisMonth >= ent.monthlyEmailLimit) {
        return res.status(429).json({
          success: false,
          error: `Monthly outreach limit reached (${ent.monthlyEmailLimit} messages).`,
        });
      }
      const sentToday = hrOutreachStore.countSentMessagesInWindow(req.user!.id, 1);
      if (sentToday >= 25) {
        return res.status(429).json({
          success: false,
          error: 'Daily safety outreach limit reached (25 direct emails per 24 hours).',
        });
      }

      // 5. Email account ownership & credential check
      const acc = hrOutreachStore.getEmailAccountWithSecrets(req.user!.id, emailAccountId);
      if (!acc || acc.summary.status !== 'connected' || !acc.encryptedAccessToken) {
        return res.status(400).json({
          success: false,
          code: 'EMAIL_ACCOUNT_DISCONNECTED',
          error: 'Selected sending email account is disconnected or unavailable.',
        });
      }

      const adapter = getEmailProviderAdapter(acc.summary.provider);
      const cfg = getOAuthConfig();

      // Strict safeguard: Real sending disabled unless OAuth credentials are configured (tests inject MockAdapter)
      if (!adapter.isConfigured(cfg)) {
        return res.status(503).json({
          success: false,
          code: 'OAUTH_CREDENTIALS_REQUIRED',
          error: `Sending via ${acc.summary.provider} is disabled until OAuth client credentials are configured on the server.`,
        });
      }

      // 6. Resume attachment validation & confirmation check
      let attachmentPayload:
        | { fileName: string; mimeType: string; contentBase64: string; sizeBytes: number }
        | undefined;

      if (resumeDocumentId) {
        if (resumeConfirmed !== true) {
          return res.status(400).json({
            success: false,
            code: 'ATTACHMENT_CONFIRMATION_REQUIRED',
            error: 'Please confirm your selected resume attachment before sending.',
          });
        }
        const bin = resolveAttachmentBinary(req.user!.id, resumeDocumentId);
        if (!bin) {
          return res.status(404).json({ success: false, error: 'Selected resume attachment not found.' });
        }
        const v = validateResumeAttachment({
          fileName: bin.fileName,
          mimeType: bin.mimeType,
          fileSizeBytes: bin.buffer.length,
        });
        if (!v.valid) {
          return res.status(400).json({ success: false, error: v.error });
        }
        attachmentPayload = {
          fileName: v.sanitizedFileName,
          mimeType: bin.mimeType,
          contentBase64: bin.buffer.toString('base64'),
          sizeBytes: bin.buffer.length,
        };
      }

      // 7. Create/update message record in approved state first
      const job = jobId ? authAndStore.getVacancyById(jobId) : null;
      const msgRecord =
        draftId && hrOutreachStore.getOutreachMessageById(req.user!.id, draftId)
          ? hrOutreachStore.updateOutreachMessage(req.user!.id, draftId, {
              emailAccountId: acc.summary.id,
              subject: String(subject).trim(),
              bodyText: String(bodyText).trim(),
              resumeDocumentId: resumeDocumentId || undefined,
              resumeFileName: attachmentPayload?.fileName,
              resumeFileSize: attachmentPayload?.sizeBytes,
              status: 'approved',
              explicitUserApproval: true,
              approvedAt: new Date().toISOString(),
            })!
          : hrOutreachStore.createOutreachMessage({
              userId: req.user!.id,
              contactId: contact.id,
              campaignId,
              emailAccountId: acc.summary.id,
              jobId,
              companyName: contact.companyName,
              jobTitle: job?.title,
              recipientEmail: contact.email,
              recipientName: contact.contactName,
              templateType,
              tone,
              subject: String(subject).trim(),
              bodyText: String(bodyText).trim(),
              resumeDocumentId: resumeDocumentId || undefined,
              resumeFileName: attachmentPayload?.fileName,
              resumeFileSize: attachmentPayload?.sizeBytes,
              status: 'approved',
              explicitUserApproval: true,
              idempotencyKey: effectiveKey,
            });

      hrOutreachStore.recordOutreachEvent(req.user!.id, msgRecord.id, 'approved', {
        emailAccountId: acc.summary.id,
        resumeFileName: attachmentPayload?.fileName,
      });

      // 8. Decrypt access token & refresh if expired
      let accessToken = await decryptSecretToken(acc.encryptedAccessToken);
      const expiresMs = acc.summary.tokenExpiresAt ? Date.parse(acc.summary.tokenExpiresAt) : 0;
      if (expiresMs && expiresMs < Date.now() + 60_000 && acc.encryptedRefreshToken) {
        try {
          const refreshPlain = await decryptSecretToken(acc.encryptedRefreshToken);
          const refreshed = await adapter.refreshAccessToken({ refreshToken: refreshPlain, cfg });
          accessToken = refreshed.accessToken;
          hrOutreachStore.updateEmailAccountTokens({
            userId: req.user!.id,
            accountId: acc.summary.id,
            encryptedAccessToken: await encryptSecretToken(refreshed.accessToken),
            encryptedRefreshToken: refreshed.refreshToken
              ? await encryptSecretToken(refreshed.refreshToken)
              : undefined,
            tokenExpiresAt: new Date(Date.now() + refreshed.expiresInSeconds * 1000).toISOString(),
          });
        } catch (refreshErr: unknown) {
          const rMsg = refreshErr instanceof Error ? refreshErr.message : String(refreshErr);
          hrOutreachStore.updateEmailAccountTokens({
            userId: req.user!.id,
            accountId: acc.summary.id,
            encryptedAccessToken: acc.encryptedAccessToken,
            status: 'revoked',
            lastError: rMsg,
          });
          hrOutreachStore.updateOutreachMessage(req.user!.id, msgRecord.id, {
            status: 'failed',
            errorMessage: `OAuth token refresh failed: ${rMsg}`,
          });
          return res.status(401).json({
            success: false,
            error: `Email account authorization expired or was revoked (${rMsg}). Please reconnect your account.`,
          });
        }
      }

      // 9. Submit via authorized provider
      const sendRes = await adapter.sendEmail(accessToken, {
        fromEmail: acc.summary.email,
        fromName: acc.summary.displayName || req.user!.fullName,
        toEmail: contact.email,
        toName: contact.contactName,
        subject: String(subject).trim(),
        bodyText: String(bodyText).trim(),
        attachment: attachmentPayload
          ? {
              fileName: attachmentPayload.fileName,
              mimeType: attachmentPayload.mimeType,
              contentBase64: attachmentPayload.contentBase64,
            }
          : undefined,
      });

      if (!sendRes.ok || !sendRes.providerMessageId) {
        const failedMsg = hrOutreachStore.updateOutreachMessage(req.user!.id, msgRecord.id, {
          status: 'failed',
          provider: sendRes.provider,
          errorMessage: sendRes.error || 'Provider rejected email submission.',
        });
        hrOutreachStore.recordOutreachEvent(req.user!.id, msgRecord.id, 'failed', {
          error: sendRes.error,
          errorCode: sendRes.errorCode,
        });
        return res.status(502).json({
          success: false,
          error: sendRes.error || 'Email provider failed to accept message.',
          message: failedMsg,
        });
      }

      const followUpAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
      const acceptedMsg = hrOutreachStore.updateOutreachMessage(req.user!.id, msgRecord.id, {
        status: 'provider_accepted',
        provider: sendRes.provider,
        providerMessageId: sendRes.providerMessageId,
        providerThreadId: sendRes.providerThreadId || sendRes.providerMessageId,
        sentAt: sendRes.acceptedAt || new Date().toISOString(),
        followUpDueAt: followUpAt,
      });

      hrOutreachStore.recordOutreachEvent(
        req.user!.id,
        msgRecord.id,
        'provider_accepted',
        {
          provider: sendRes.provider,
          providerMessageId: sendRes.providerMessageId,
          providerThreadId: sendRes.providerThreadId,
        },
        sendRes.providerMessageId
      );

      hrOutreachStore.updateHrContactStatus(contact.id, 'active', new Date().toISOString());
      authAndStore.addAuditLog(
        req.user!.id,
        'User approved',
        'HR_OUTREACH_EMAIL_SENT',
        contact.email,
        `Submitted direct outreach email (${sendRes.provider}:${sendRes.providerMessageId}) for ${contact.companyName}.`
      );

      return res.json({
        success: true,
        message: acceptedMsg,
        notice: 'Email accepted by your mail provider. Delivery to the remote inbox depends on external mail servers.',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return res.status(500).json({ success: false, error: msg });
    }
  });

  router.get('/messages', (req: HrOutreachRequest, res: Response) => {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const messages = hrOutreachStore.listOutreachMessages(req.user!.id, { status });
    res.json({ success: true, messages });
  });

  router.get('/messages/:id', (req: HrOutreachRequest, res: Response) => {
    const message = hrOutreachStore.getOutreachMessageById(req.user!.id, req.params.id);
    if (!message) {
      return res.status(404).json({ success: false, error: 'Outreach message not found.' });
    }
    const events = hrOutreachStore.listOutreachEvents(req.user!.id, message.id);
    res.json({ success: true, message, events });
  });

  // 11. REPLIES & FOLLOW-UP TRACKING
  router.get('/replies', async (req: HrOutreachRequest, res: Response) => {
    const shouldSync = req.query.sync === 'true';
    const allMessages = hrOutreachStore.listOutreachMessages(req.user!.id, { limit: 100 });

    if (shouldSync) {
      const cfg = getOAuthConfig();
      const accounts = hrOutreachStore.listUserEmailAccounts(req.user!.id).filter((a) => a.status === 'connected');
      for (const accSummary of accounts) {
        const acc = hrOutreachStore.getEmailAccountWithSecrets(req.user!.id, accSummary.id);
        if (!acc || !acc.encryptedAccessToken) continue;
        const adapter = getEmailProviderAdapter(accSummary.provider);
        if (!adapter.isConfigured(cfg)) continue;

        const matchingThreads = allMessages
          .filter((m) => m.emailAccountId === accSummary.id && m.providerThreadId)
          .map((m) => m.providerThreadId!);

        if (matchingThreads.length === 0) continue;
        try {
          const accessToken = await decryptSecretToken(acc.encryptedAccessToken);
          const replies = await adapter.fetchRepliesForThreads(accessToken, matchingThreads, accSummary.email);
          for (const reply of replies) {
            const orig = allMessages.find((m) => m.providerThreadId === reply.providerThreadId);
            if (!orig) continue;
            const summary = `Reply from ${reply.fromEmail}: "${reply.snippet.slice(0, 180)}"`;
            const suggestedReply = `Hi ${orig.recipientName || 'there'},\n\nThank you for getting back to me regarding the ${orig.jobTitle || orig.companyName} opportunity. I would be happy to share any additional details or schedule a brief conversation at your convenience.\n\nBest regards,\n${req.user!.fullName}`;
            hrOutreachStore.updateOutreachMessage(req.user!.id, orig.id, {
              status: 'replied',
              repliedAt: reply.receivedAt,
              replySummary: summary,
              suggestedReply,
            });
            hrOutreachStore.recordOutreachEvent(
              req.user!.id,
              orig.id,
              'reply_received',
              { fromEmail: reply.fromEmail, snippet: reply.snippet },
              reply.providerMessageId
            );
          }
        } catch {
          // Non-fatal sync failure
        }
      }
    }

    const updatedMessages = hrOutreachStore.listOutreachMessages(req.user!.id, { limit: 100 });
    const nowMs = Date.now();
    const repliesAndFollowups = updatedMessages.filter(
      (m) =>
        m.status === 'replied' ||
        m.status === 'follow_up_due' ||
        m.status === 'bounced' ||
        Boolean(m.repliedAt) ||
        (m.status === 'provider_accepted' && m.followUpDueAt && Date.parse(m.followUpDueAt) <= nowMs)
    );

    res.json({ success: true, items: repliesAndFollowups });
  });

  // 12. CAMPAIGNS
  router.get('/campaigns', (req: HrOutreachRequest, res: Response) => {
    const campaigns = hrOutreachStore.listOutreachCampaigns(req.user!.id);
    res.json({ success: true, campaigns });
  });

  router.post('/campaigns', (req: HrOutreachRequest, res: Response) => {
    const { name, targetCountry, targetRoles, dailyLimit, notes } = req.body || {};
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ success: false, error: 'Campaign name is required.' });
    }
    const campaign = hrOutreachStore.createOutreachCampaign({
      userId: req.user!.id,
      name,
      targetCountry,
      targetRoles: Array.isArray(targetRoles) ? targetRoles : [],
      dailyLimit,
      notes,
    });
    res.json({ success: true, campaign });
  });

  router.get('/campaigns/:id', (req: HrOutreachRequest, res: Response) => {
    const campaign = hrOutreachStore.getOutreachCampaignById(req.user!.id, req.params.id);
    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found.' });
    }
    const contacts = hrOutreachStore.getCampaignContacts(req.user!.id, req.params.id);
    res.json({ success: true, campaign, contacts });
  });

  router.post('/campaigns/:id/contacts', (req: HrOutreachRequest, res: Response) => {
    try {
      const { contactIds, jobId } = req.body || {};
      if (!Array.isArray(contactIds) || contactIds.length === 0) {
        return res.status(400).json({ success: false, error: 'contactIds array is required.' });
      }
      const added = hrOutreachStore.addContactsToCampaign(req.user!.id, req.params.id, contactIds, jobId);
      const campaign = hrOutreachStore.getOutreachCampaignById(req.user!.id, req.params.id);
      res.json({ success: true, added, campaign });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(404).json({ success: false, error: msg });
    }
  });

  // 13. DO NOT CONTACT / SUPPRESSION & OPT-OUT CONTROLS
  router.get('/do-not-contact', (req: HrOutreachRequest, res: Response) => {
    const entries = hrOutreachStore.listDoNotContact(req.user!.id);
    res.json({ success: true, entries });
  });

  router.post('/do-not-contact', (req: HrOutreachRequest, res: Response) => {
    const { email, reason } = req.body || {};
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ success: false, error: 'Valid email address is required.' });
    }
    const entry = hrOutreachStore.addDoNotContact(
      req.user!.id,
      email,
      typeof reason === 'string' && reason.trim() ? reason.trim() : 'Candidate opt-out / suppression'
    );
    authAndStore.addAuditLog(
      req.user!.id,
      'User manual',
      'DO_NOT_CONTACT_ADDED',
      entry.email,
      entry.reason
    );
    res.json({ success: true, entry });
  });

  router.delete('/do-not-contact/:id', (req: HrOutreachRequest, res: Response) => {
    const removed = hrOutreachStore.removeDoNotContact(req.user!.id, req.params.id);
    if (!removed) {
      return res.status(404).json({ success: false, error: 'Suppression entry not found.' });
    }
    res.json({ success: true });
  });

  return router;
}
