// worker/hrOutreachRoutes.ts
// Production Cloudflare Worker Hono Routes for AI HR Outreach & Direct Application Automation
// Full functional & security parity with server/hrOutreachRoutes.ts

import { Hono } from 'hono';
import { GoogleGenAI } from '@google/genai';
import { D1Store, AuthUser } from './d1Store.ts';
import { WorkerHrOutreachStore } from './hrOutreachStore.ts';
import { WorkerHrDiscoveryQueueStore } from './hrDiscoveryQueueStore.ts';
import { discoverWorkerHrContacts } from './hrDiscoveryEngine.ts';
import { isSafePublicUrl } from './jobConnectors.ts';
import { checkFeatureEntitlement, getEffectivePlan } from '../src/config/freeAccess.ts';
import {
  classifyHrDesignation,
  HR_DISCOVERY_SOURCES,
} from '../src/utils/hrContactDiscovery.ts';
import { evaluateContactRelevance } from '../src/utils/hrContactMatcher.ts';
import { dohMxResolver, runEmailVerificationPipeline } from '../src/utils/hrEmailVerification.ts';
import {
  auditGeneratedEmailClaims,
  buildOutreachEmailPrompt,
  generateDeterministicGroundedEmail,
  OUTREACH_TEMPLATES,
  OUTREACH_TONES,
} from '../src/utils/hrEmailGenerator.ts';
import { generateMinimalPdfFromText, validateResumeAttachment } from '../src/utils/resumeAttachmentHelper.ts';
import {
  decryptSecretToken,
  encryptSecretToken,
  signOAuthState,
  verifyOAuthStateSignature,
} from '../src/utils/tokenCrypto.ts';
import { getEmailProviderAdapter, ProviderOAuthConfig } from '../src/utils/emailProviders.ts';
import { EmailAccountProvider, OutreachEmailTone, OutreachTemplateType } from '../src/types/index.ts';

function getWorkerOAuthConfig(env: any): ProviderOAuthConfig {
  return {
    googleClientId: env.GOOGLE_OAUTH_CLIENT_ID || env.GOOGLE_CLIENT_ID,
    googleClientSecret: env.GOOGLE_OAUTH_CLIENT_SECRET || env.GOOGLE_CLIENT_SECRET,
    microsoftClientId: env.MICROSOFT_CLIENT_ID || env.AZURE_CLIENT_ID,
    microsoftClientSecret: env.MICROSOFT_CLIENT_SECRET || env.AZURE_CLIENT_SECRET,
    microsoftTenantId: env.MICROSOFT_TENANT_ID || 'common',
  };
}

function getCryptoSecret(env: any): string | undefined {
  return env.EMAIL_ENCRYPTION_KEY || env.SESSION_SECRET;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function createWorkerHrOutreachApp(requireAuth: (c: any, next: any) => Promise<any>) {
  const hr = new Hono<{ Bindings: any; Variables: { user?: AuthUser; store: D1Store } }>();

  // CSRF Origin validation on mutating requests
  hr.use('*', async (c, next) => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(c.req.method)) {
      const origin = c.req.header('Origin');
      const host = c.req.header('Host');
      if (origin && host) {
        try {
          if (new URL(origin).host !== host) {
            return c.json({ success: false, error: 'Cross-origin mutation rejected (CSRF protection).' }, 403);
          }
        } catch {
          return c.json({ success: false, error: 'Invalid Origin header.' }, 403);
        }
      }
    }
    await next();
  });

  hr.use('*', requireAuth);

  // OAuth Callback
  hr.get('/email-accounts/:provider/callback', async (c) => {
    const provider = c.req.param('provider') as EmailAccountProvider;
    if (provider !== 'gmail' && provider !== 'outlook') {
      return c.json({ success: false, error: 'Unsupported provider.' }, 400);
    }

    const user = c.get('user')!;
    const outStore = new WorkerHrOutreachStore(c.env.DB);
    const code = c.req.query('code') || '';
    const stateToken = c.req.query('state') || '';
    const errParam = c.req.query('error') || '';

    if (errParam) {
      return c.redirect(`/dashboard/hr-outreach?oauth_error=${encodeURIComponent(errParam)}`);
    }
    if (!code || !stateToken) {
      return c.json({ success: false, error: 'Missing OAuth code or state parameter.' }, 400);
    }

    const [rawState, sig] = stateToken.split('.');
    const secret = getCryptoSecret(c.env);
    if (!rawState || !sig || !(await verifyOAuthStateSignature(rawState, sig, secret))) {
      return c.json({ success: false, error: 'Invalid OAuth CSRF state signature.' }, 403);
    }

    const consumed = await outStore.consumeOAuthState(stateToken, user.id, provider);
    if (!consumed) {
      return c.json({ success: false, error: 'OAuth state expired or invalid for current user.' }, 403);
    }

    try {
      const adapter = getEmailProviderAdapter(provider);
      const exchanged = await adapter.exchangeCode({
        code,
        redirectUri: consumed.redirectUri,
        cfg: getWorkerOAuthConfig(c.env),
      });

      const encryptedAccess = await encryptSecretToken(exchanged.accessToken, secret);
      const encryptedRefresh = exchanged.refreshToken
        ? await encryptSecretToken(exchanged.refreshToken, secret)
        : undefined;
      const expiresAt = new Date(Date.now() + exchanged.expiresInSeconds * 1000).toISOString();

      const account = await outStore.upsertEmailAccount({
        userId: user.id,
        provider,
        email: exchanged.email,
        displayName: exchanged.displayName,
        encryptedAccessToken: encryptedAccess,
        encryptedRefreshToken: encryptedRefresh,
        tokenExpiresAt: expiresAt,
        scopes: exchanged.scopes,
      });

      const store = c.get('store');
      await store.addAuditLog(user.id, 'User manual', 'EMAIL_ACCOUNT_CONNECTED', account.email, `Connected ${provider} OAuth account.`);

      if (c.req.header('Accept')?.includes('application/json')) {
        return c.json({ success: true, account });
      }
      return c.redirect(`/dashboard/hr-outreach?oauth_connected=${encodeURIComponent(provider)}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return c.redirect(`/dashboard/hr-outreach?oauth_error=${encodeURIComponent(msg)}`);
    }
  });

  hr.get('/overview', async (c) => {
    const user = c.get('user')!;
    const store = c.get('store');
    const outStore = new WorkerHrOutreachStore(c.env.DB);
    const [counts, sub, recentRuns, sentThisMonth] = await Promise.all([
      outStore.getOverviewCounts(user.id),
      store.getUserSubscription(user.id),
      outStore.listDiscoveryRuns(10),
      outStore.countSentMessagesInWindow(user.id, 30),
    ]);

    const eff = getEffectivePlan(user, sub);
    const canUseOutreach = checkFeatureEntitlement(user, 'hr_outreach', sub);
    const monthlyEmailLimit = eff.planId === 'black' ? 200 : eff.planId === 'pro' ? 100 : 0;
    const cfg = getWorkerOAuthConfig(c.env);

    return c.json({
      success: true,
      overview: {
        ...counts,
        oauthConfigured: {
          gmail: getEmailProviderAdapter('gmail').isConfigured(cfg),
          outlook: getEmailProviderAdapter('outlook').isConfigured(cfg),
        },
        entitlement: {
          planId: eff.planId,
          canSendOutreach: canUseOutreach && eff.planId !== 'free',
          canGenerateAiEmail: canUseOutreach && eff.planId !== 'free',
          monthlyEmailLimit,
          emailsSentThisMonth: sentThisMonth,
        },
      },
      recentRuns,
      templates: OUTREACH_TEMPLATES,
      tones: OUTREACH_TONES,
    });
  });

  hr.get('/sources', (c) => {
    return c.json({ success: true, sources: HR_DISCOVERY_SOURCES });
  });

  hr.get('/contacts', async (c) => {
    const user = c.get('user')!;
    const store = c.get('store');
    const outStore = new WorkerHrOutreachStore(c.env.DB);
    const q = c.req.query();

    const [res, profile, preferences, dncList] = await Promise.all([
      outStore.listHrContacts({
        userId: user.id,
        search: q.search,
        country: q.country,
        company: q.company,
        designation: q.designation,
        contactType: q.contactType,
        verificationStatus: q.verificationStatus,
        sourceType: q.sourceType,
        jobId: q.jobId,
        includeArchived: q.includeArchived === 'true',
        limit: q.limit ? Number(q.limit) : 50,
        offset: q.offset ? Number(q.offset) : 0,
      }),
      store.getProfile(user.id),
      store.getPreferences(user.id),
      outStore.listDoNotContact(user.id),
    ]);

    const dncSet = new Set(dncList.map((d) => d.email.toLowerCase()));
    const targetJob = q.jobId ? await store.getVacancyById(q.jobId) : null;

    const enriched = await Promise.all(
      res.contacts.map(async (contact) => {
        const matchedJob = targetJob || (contact.associatedJobIds[0] ? await store.getVacancyById(contact.associatedJobIds[0]) : null);
        const relevance = evaluateContactRelevance({ contact, job: matchedJob, profile, preferences });
        return {
          ...contact,
          relevance,
          relatedJobTitle: matchedJob?.title,
          isDoNotContact: dncSet.has(contact.email.toLowerCase()),
        };
      })
    );

    if (q.sortBy === 'relevance') {
      enriched.sort((a, b) => (b.relevance?.overallScore || 0) - (a.relevance?.overallScore || 0));
    }

    return c.json({ success: true, contacts: enriched, total: res.total });
  });

  hr.get('/companies', async (c) => {
    const user = c.get('user')!;
    const qStore = new WorkerHrDiscoveryQueueStore(c.env.DB);
    const q = c.req.query();
    const result = await qStore.listCompaniesWithContactSummary({
      userId: user.id,
      search: q.search,
      onlyWithContacts: q.onlyWithContacts === 'true',
      limit: q.limit ? Number(q.limit) : 40,
      offset: q.offset ? Number(q.offset) : 0,
    });
    return c.json({ success: true, ...result });
  });

  hr.get('/jobs-with-contacts', async (c) => {
    const user = c.get('user')!;
    const qStore = new WorkerHrDiscoveryQueueStore(c.env.DB);
    const q = c.req.query();
    const result = await qStore.getJobsWithContactsCoverage({
      userId: user.id,
      search: q.search,
      onlyWithContacts: q.onlyWithContacts === 'true',
      limit: q.limit ? Number(q.limit) : 40,
      offset: q.offset ? Number(q.offset) : 0,
    });
    return c.json({ success: true, ...result });
  });

  hr.post('/contacts/manual', async (c) => {
    const user = c.get('user')!;
    const store = c.get('store');
    const qStore = new WorkerHrDiscoveryQueueStore(c.env.DB);
    const body = await c.req.json().catch(() => ({}));
    const { companyName, companyWebsite, contactName, designation, email, country, jobId, sourceUrl, evidence } = body;

    if (!companyName || !String(companyName).trim() || !email || !String(email).trim()) {
      return c.json({ success: false, error: 'Company name and email are required.' }, 400);
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const verification = await runEmailVerificationPipeline(
      {
        email: cleanEmail,
        sourceUrl: typeof sourceUrl === 'string' && sourceUrl.trim() ? sourceUrl.trim() : undefined,
        evidence: typeof evidence === 'string' && evidence.trim() ? evidence.trim() : undefined,
      },
      dohMxResolver
    );

    if (!verification.syntaxValid) {
      return c.json({ success: false, error: verification.reasons[0] || 'Invalid email syntax.' }, 400);
    }

    const cleanName = typeof contactName === 'string' && contactName.trim() ? contactName.trim() : undefined;
    const classified = classifyHrDesignation(`${designation || ''} ${evidence || ''}`, cleanEmail, cleanName);

    const { contact, created } = await qStore.submitOrCorrectUserContact({
      userId: user.id,
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

    await store.addAuditLog(user.id, 'User manual', 'HR_CONTACT_MANUAL_SUBMIT', cleanEmail, `Submitted personal HR contact for ${companyName}.`);
    return c.json({ success: true, contact, created, verification });
  });

  hr.get('/contacts/:id', async (c) => {
    const user = c.get('user')!;
    const store = c.get('store');
    const outStore = new WorkerHrOutreachStore(c.env.DB);
    const data = await outStore.getHrContactById(c.req.param('id'));
    if (!data) return c.json({ success: false, error: 'HR Contact not found.' }, 404);
    if (data.contact.isUserSubmitted && data.contact.submittedByUserId !== user.id) {
      return c.json({ success: false, error: 'HR Contact not found.' }, 404);
    }

    const [profile, preferences, isDnc] = await Promise.all([
      store.getProfile(user.id),
      store.getPreferences(user.id),
      outStore.isDoNotContact(user.id, data.contact.email),
    ]);
    const jobId = c.req.query('jobId') || data.contact.associatedJobIds[0];
    const job = jobId ? await store.getVacancyById(jobId) : null;
    const relevance = evaluateContactRelevance({ contact: data.contact, job, profile, preferences });

    return c.json({
      success: true,
      contact: {
        ...data.contact,
        sources: data.sources,
        relevance,
        relatedJobTitle: job?.title,
        isDoNotContact: isDnc,
      },
    });
  });

  hr.post('/contacts/discover', async (c) => {
    const user = c.get('user')!;
    const store = c.get('store');
    const body = await c.req.json().catch(() => ({}));
    const companyName = typeof body.companyName === 'string' ? body.companyName.trim() : undefined;
    const companyWebsite = typeof body.companyWebsite === 'string' ? body.companyWebsite.trim() : undefined;
    const jobId = typeof body.jobId === 'string' ? body.jobId.trim() : undefined;

    const result = await discoverWorkerHrContacts(c.env.DB, {
      triggeredBy: user.id,
      companyName,
      companyWebsite,
      jobId,
    });

    await store.addAuditLog(
      user.id,
      'User manual',
      'HR_CONTACT_DISCOVERY_RUN',
      companyName || jobId || 'GCDE',
      `Scanned ${result.run.sourcesScanned} sources, found ${result.discoveredContacts.length} contacts.`
    );

    return c.json({
      success: true,
      ...result,
    });
  });

  hr.post('/contacts/:id/verify', async (c) => {
    const outStore = new WorkerHrOutreachStore(c.env.DB);
    const data = await outStore.getHrContactById(c.req.param('id'));
    if (!data) return c.json({ success: false, error: 'HR Contact not found.' }, 404);

    const verification = await runEmailVerificationPipeline(
      {
        email: data.contact.email,
        sourceUrl: data.contact.sourceUrl,
        evidence: data.contact.evidence,
        lastVerifiedAt: data.contact.lastVerifiedAt,
      },
      dohMxResolver
    );
    const updated = await outStore.updateHrContactVerification(
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
    return c.json({ success: true, contact: updated, verification });
  });

  hr.post('/contacts/:id/status', async (c) => {
    const outStore = new WorkerHrOutreachStore(c.env.DB);
    const body = await c.req.json().catch(() => ({}));
    const targetStatus = ['active', 'archived', 'suppressed'].includes(body.status) ? body.status : 'active';
    const updated = await outStore.updateHrContactStatus(
      c.req.param('id'),
      targetStatus,
      body.markContacted ? new Date().toISOString() : undefined
    );
    if (!updated) return c.json({ success: false, error: 'HR Contact not found.' }, 404);
    return c.json({ success: true, contact: updated });
  });

  hr.post('/contacts/:id/generate-email', async (c) => {
    const user = c.get('user')!;
    const store = c.get('store');
    const outStore = new WorkerHrOutreachStore(c.env.DB);
    const sub = await store.getUserSubscription(user.id);
    const eff = getEffectivePlan(user, sub);
    if (!checkFeatureEntitlement(user, 'hr_outreach', sub) || eff.planId === 'free') {
      return c.json({ success: false, code: 'UPGRADE_REQUIRED', error: 'AI HR Email Studio requires Pro or BLACK ELITE.' }, 403);
    }

    const data = await outStore.getHrContactById(c.req.param('id'));
    if (!data) return c.json({ success: false, error: 'HR Contact not found.' }, 404);

    const body = await c.req.json().catch(() => ({}));
    const templateType: OutreachTemplateType = OUTREACH_TEMPLATES.includes(body.templateType)
      ? body.templateType
      : 'Direct Job Application';
    const tone: OutreachEmailTone = OUTREACH_TONES.includes(body.tone) ? body.tone : 'Professional';

    const [profile, preferences] = await Promise.all([store.getProfile(user.id), store.getPreferences(user.id)]);
    const job = body.jobId ? await store.getVacancyById(body.jobId) : null;

    const fallback = generateDeterministicGroundedEmail({
      profile,
      preferences,
      contact: data.contact,
      job,
      templateType,
      tone,
      customNotes: body.customNotes,
    });

    const apiKey = (c.env.GEMINI_API_KEY || '').trim();
    if (apiKey && apiKey.length >= 25 && !apiKey.startsWith('MY_GEMINI')) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const prompt = buildOutreachEmailPrompt({
          profile,
          preferences,
          contact: data.contact,
          job,
          templateType,
          tone,
          customNotes: body.customNotes,
        });
        const aiResp = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: { responseMimeType: 'application/json' },
        });
        const parsed = JSON.parse(aiResp.text || '{}');
        if (parsed.subject && parsed.bodyText) {
          return c.json({
            success: true,
            generated: {
              subject: String(parsed.subject).trim(),
              bodyText: String(parsed.bodyText).trim(),
              usedGemini: true,
              groundedQualifications: fallback.groundedQualifications,
              missingDataNotices: fallback.missingDataNotices,
              integrityAudit: auditGeneratedEmailClaims(String(parsed.bodyText), profile),
            },
          });
        }
      } catch {
        // fallback cleanly
      }
    }

    return c.json({ success: true, generated: fallback });
  });

  hr.get('/resumes', async (c) => {
    const user = c.get('user')!;
    const outStore = new WorkerHrOutreachStore(c.env.DB);
    const resumes = await outStore.listCandidateResumeAttachments(user.id);
    return c.json({ success: true, resumes });
  });

  hr.get('/resumes/:resumeId/preview', async (c) => {
    const user = c.get('user')!;
    const store = c.get('store');
    const outStore = new WorkerHrOutreachStore(c.env.DB);
    const resumeId = c.req.param('resumeId');

    if (resumeId.startsWith('tailored_')) {
      const appId = resumeId.replace(/^tailored_/, '');
      const [app, profile] = await Promise.all([store.getApplicationById(user.id, appId), store.getProfile(user.id)]);
      if (!app || !profile) return c.json({ success: false, error: 'Resume not found.' }, 404);
      const tr = app.tailoredResume;
      const text = [
        profile.fullName || '',
        [profile.email, profile.phone, profile.location].filter(Boolean).join(' | '),
        '',
        tr?.headline || app.role || '',
        tr?.professionalSummary || tr?.summary || profile.summary || '',
        '',
        'SKILLS: ' + (tr?.targetedSkills || profile.skills || []).join(', '),
      ].join('\n');
      const bytes = generateMinimalPdfFromText(`${profile.fullName || 'Candidate'} — ${app.company} Resume`, text);
      return new Response(bytes as unknown as BodyInit, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="${app.company.replace(/[^a-zA-Z0-9]/g, '_')}_Tailored_Resume.pdf"`,
          'X-Frame-Options': 'SAMEORIGIN',
          'Cache-Control': 'private, no-store',
        },
      });
    }

    const blob = await outStore.getResumeFileBlobForUser(user.id, resumeId);
    if (blob) {
      return new Response(blob.bytes as unknown as BodyInit, {
        headers: {
          'Content-Type': blob.mimeType,
          'Content-Disposition': `inline; filename="${blob.fileName}"`,
          'X-Frame-Options': 'SAMEORIGIN',
          'Cache-Control': 'private, no-store',
        },
      });
    }

    const doc: any = await c.env.DB.prepare('SELECT id, file_name, extracted_text FROM resume_documents WHERE id = ? AND user_id = ?')
      .bind(resumeId, user.id)
      .first();
    if (!doc || !doc.extracted_text) return c.json({ success: false, error: 'Resume not found.' }, 404);

    const bytes = generateMinimalPdfFromText(doc.file_name, doc.extracted_text);
    const baseName = String(doc.file_name).replace(/\.[^.]+$/, '');
    return new Response(bytes as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${baseName}.pdf"`,
        'X-Frame-Options': 'SAMEORIGIN',
        'Cache-Control': 'private, no-store',
      },
    });
  });

  hr.get('/email-accounts', async (c) => {
    const user = c.get('user')!;
    const outStore = new WorkerHrOutreachStore(c.env.DB);
    const accounts = await outStore.listUserEmailAccounts(user.id);
    const cfg = getWorkerOAuthConfig(c.env);
    return c.json({
      success: true,
      accounts,
      oauthConfigured: {
        gmail: getEmailProviderAdapter('gmail').isConfigured(cfg),
        outlook: getEmailProviderAdapter('outlook').isConfigured(cfg),
      },
    });
  });

  hr.post('/email-accounts/:provider/connect', async (c) => {
    const providerParam = c.req.param('provider');
    const provider: EmailAccountProvider = providerParam === 'google' || providerParam === 'gmail' ? 'gmail' : 'outlook';
    if (providerParam !== 'google' && providerParam !== 'gmail' && providerParam !== 'microsoft' && providerParam !== 'outlook') {
      return c.json({ success: false, error: 'Unsupported provider.' }, 400);
    }

    const cfg = getWorkerOAuthConfig(c.env);
    const adapter = getEmailProviderAdapter(provider);
    if (!adapter.isConfigured(cfg)) {
      return c.json(
        {
          success: false,
          code: 'OAUTH_NOT_CONFIGURED',
          error: `OAuth client credentials for ${provider} are not configured in Cloudflare Worker secrets.`,
        },
        503
      );
    }

    const user = c.get('user')!;
    const outStore = new WorkerHrOutreachStore(c.env.DB);
    const rand = new Uint8Array(24);
    crypto.getRandomValues(rand);
    const rawState = Array.from(rand).map((b) => b.toString(16).padStart(2, '0')).join('');
    const sig = await signOAuthState(rawState, getCryptoSecret(c.env));
    const signedState = `${rawState}.${sig}`;
    const originUrl = c.env.APP_URL || new URL(c.req.url).origin;
    const redirectUri = `${originUrl.replace(/\/$/, '')}/api/hr-outreach/email-accounts/${provider}/callback`;

    await outStore.createOAuthState(user.id, provider, redirectUri, signedState);
    const authorizationUrl = adapter.getAuthorizationUrl({ state: signedState, redirectUri, cfg });
    return c.json({ success: true, authorizationUrl, state: signedState, redirectUri });
  });

  hr.delete('/email-accounts/:id', async (c) => {
    const user = c.get('user')!;
    const store = c.get('store');
    const outStore = new WorkerHrOutreachStore(c.env.DB);
    const existing = await outStore.getEmailAccountWithSecrets(user.id, c.req.param('id'));
    if (!existing) return c.json({ success: false, error: 'Email account not found.' }, 404);

    try {
      if (existing.encryptedAccessToken) {
        const token = await decryptSecretToken(existing.encryptedAccessToken, getCryptoSecret(c.env));
        await getEmailProviderAdapter(existing.summary.provider).revokeToken(token);
      }
    } catch {
      // ignore remote revoke failure
    }

    await outStore.disconnectEmailAccount(user.id, c.req.param('id'));
    await store.addAuditLog(user.id, 'User manual', 'EMAIL_ACCOUNT_DISCONNECTED', existing.summary.email, `Disconnected ${existing.summary.provider}.`);
    return c.json({ success: true, message: 'Email account disconnected.' });
  });

  hr.post('/messages/preview', async (c) => {
    const user = c.get('user')!;
    const store = c.get('store');
    const outStore = new WorkerHrOutreachStore(c.env.DB);
    const body = await c.req.json().catch(() => ({}));

    if (!body.contactId || !body.subject || !body.bodyText) {
      return c.json({ success: false, error: 'contactId, subject, and bodyText are required.' }, 400);
    }
    const contactData = await outStore.getHrContactById(body.contactId);
    if (!contactData) return c.json({ success: false, error: 'Recipient contact not found.' }, 404);

    const [blockedDnc, profile, job] = await Promise.all([
      outStore.isDoNotContact(user.id, contactData.contact.email),
      store.getProfile(user.id),
      body.jobId ? store.getVacancyById(body.jobId) : Promise.resolve(null),
    ]);
    const audit = auditGeneratedEmailClaims(String(body.bodyText), profile);

    let savedMessage = null;
    if (body.saveDraft !== false) {
      savedMessage = await outStore.createOutreachMessage({
        userId: user.id,
        contactId: contactData.contact.id,
        campaignId: body.campaignId,
        emailAccountId: body.emailAccountId,
        jobId: body.jobId,
        companyName: contactData.contact.companyName,
        jobTitle: job?.title,
        recipientEmail: contactData.contact.email,
        recipientName: contactData.contact.contactName,
        templateType: body.templateType || 'Direct Job Application',
        tone: body.tone || 'Professional',
        subject: String(body.subject).trim(),
        bodyText: String(body.bodyText).trim(),
        resumeDocumentId: body.resumeDocumentId,
        status: 'draft',
      });
    }

    return c.json({
      success: true,
      readyToSend: !blockedDnc && contactData.contact.emailVerificationStatus !== 'Invalid',
      warnings: [
        ...(blockedDnc ? ['Recipient is on Do-Not-Contact suppression list.'] : []),
        ...audit.warnings,
      ],
      message: savedMessage,
    });
  });

  hr.post('/messages/send', async (c) => {
    const user = c.get('user')!;
    const store = c.get('store');
    const outStore = new WorkerHrOutreachStore(c.env.DB);
    const sub = await store.getUserSubscription(user.id);
    const eff = getEffectivePlan(user, sub);

    if (!checkFeatureEntitlement(user, 'hr_outreach', sub) || eff.planId === 'free') {
      return c.json({ success: false, code: 'UPGRADE_REQUIRED', error: 'Sending HR outreach requires Pro or BLACK ELITE.' }, 403);
    }

    const body = await c.req.json().catch(() => ({}));
    if (body.explicitApproval !== true) {
      return c.json({ success: false, code: 'APPROVAL_REQUIRED', error: 'Explicit candidate approval is required before sending.' }, 400);
    }
    if (!body.contactId || !body.emailAccountId || !body.subject || !body.bodyText) {
      return c.json({ success: false, error: 'contactId, emailAccountId, subject, and bodyText are required.' }, 400);
    }

    const contactData = await outStore.getHrContactById(body.contactId);
    if (!contactData) return c.json({ success: false, error: 'HR contact not found.' }, 404);
    const contact = contactData.contact;

    if (await outStore.isDoNotContact(user.id, contact.email)) {
      return c.json({ success: false, code: 'DO_NOT_CONTACT_BLOCKED', error: 'Recipient is on your Do-Not-Contact list.' }, 403);
    }
    if (contact.emailVerificationStatus === 'Invalid') {
      return c.json({ success: false, error: 'Cannot send to an Invalid email address.' }, 400);
    }

    const acc = await outStore.getEmailAccountWithSecrets(user.id, body.emailAccountId);
    if (!acc || acc.summary.status !== 'connected' || !acc.encryptedAccessToken) {
      return c.json({ success: false, code: 'EMAIL_ACCOUNT_DISCONNECTED', error: 'Selected sending account is disconnected.' }, 400);
    }

    const cfg = getWorkerOAuthConfig(c.env);
    const adapter = getEmailProviderAdapter(acc.summary.provider);
    if (!adapter.isConfigured(cfg)) {
      return c.json({
        success: false,
        code: 'OAUTH_CREDENTIALS_REQUIRED',
        error: `Sending via ${acc.summary.provider} is disabled until OAuth client credentials are configured.`,
      }, 503);
    }

    let attachmentPayload: { fileName: string; mimeType: string; contentBase64: string; sizeBytes: number } | undefined;
    if (body.resumeDocumentId) {
      if (body.resumeConfirmed !== true) {
        return c.json({ success: false, code: 'ATTACHMENT_CONFIRMATION_REQUIRED', error: 'Confirm your resume attachment before sending.' }, 400);
      }
      const blob = await outStore.getResumeFileBlobForUser(user.id, body.resumeDocumentId);
      let fileName = blob?.fileName || 'Resume.pdf';
      let mimeType = blob?.mimeType || 'application/pdf';
      let rawBytes = blob?.bytes;
      if (!rawBytes) {
        const doc: any = await c.env.DB.prepare('SELECT id, file_name, extracted_text FROM resume_documents WHERE id = ? AND user_id = ?')
          .bind(body.resumeDocumentId, user.id)
          .first();
        if (!doc) return c.json({ success: false, error: 'Selected resume not found.' }, 404);
        rawBytes = generateMinimalPdfFromText(doc.file_name, doc.extracted_text || '');
        fileName = `${String(doc.file_name).replace(/\.[^.]+$/, '')}.pdf`;
        mimeType = 'application/pdf';
      }
      const v = validateResumeAttachment({ fileName, mimeType, fileSizeBytes: rawBytes.length });
      if (!v.valid) return c.json({ success: false, error: v.error }, 400);
      attachmentPayload = {
        fileName: v.sanitizedFileName,
        mimeType,
        contentBase64: bytesToBase64(rawBytes),
        sizeBytes: rawBytes.length,
      };
    }

    const secret = getCryptoSecret(c.env);
    let accessToken = await decryptSecretToken(acc.encryptedAccessToken, secret);
    const expiresMs = acc.summary.tokenExpiresAt ? Date.parse(acc.summary.tokenExpiresAt) : 0;
    if (expiresMs && expiresMs < Date.now() + 60_000 && acc.encryptedRefreshToken) {
      const refreshPlain = await decryptSecretToken(acc.encryptedRefreshToken, secret);
      const refreshed = await adapter.refreshAccessToken({ refreshToken: refreshPlain, cfg });
      accessToken = refreshed.accessToken;
      await outStore.updateEmailAccountTokens({
        userId: user.id,
        accountId: acc.summary.id,
        encryptedAccessToken: await encryptSecretToken(refreshed.accessToken, secret),
        encryptedRefreshToken: refreshed.refreshToken ? await encryptSecretToken(refreshed.refreshToken, secret) : undefined,
        tokenExpiresAt: new Date(Date.now() + refreshed.expiresInSeconds * 1000).toISOString(),
      });
    }

    const msgRecord = await outStore.createOutreachMessage({
      userId: user.id,
      contactId: contact.id,
      campaignId: body.campaignId,
      emailAccountId: acc.summary.id,
      jobId: body.jobId,
      companyName: contact.companyName,
      recipientEmail: contact.email,
      recipientName: contact.contactName,
      templateType: body.templateType || 'Direct Job Application',
      tone: body.tone || 'Professional',
      subject: String(body.subject).trim(),
      bodyText: String(body.bodyText).trim(),
      resumeDocumentId: body.resumeDocumentId,
      resumeFileName: attachmentPayload?.fileName,
      resumeFileSize: attachmentPayload?.sizeBytes,
      status: 'approved',
      explicitUserApproval: true,
      idempotencyKey: body.idempotencyKey,
    });

    const sendRes = await adapter.sendEmail(accessToken, {
      fromEmail: acc.summary.email,
      fromName: acc.summary.displayName || user.fullName,
      toEmail: contact.email,
      toName: contact.contactName,
      subject: String(body.subject).trim(),
      bodyText: String(body.bodyText).trim(),
      attachment: attachmentPayload
        ? { fileName: attachmentPayload.fileName, mimeType: attachmentPayload.mimeType, contentBase64: attachmentPayload.contentBase64 }
        : undefined,
    });

    if (!sendRes.ok || !sendRes.providerMessageId) {
      const failed = await outStore.updateOutreachMessage(user.id, msgRecord.id, {
        status: 'failed',
        provider: sendRes.provider,
        errorMessage: sendRes.error || 'Provider submission failed.',
      });
      return c.json({ success: false, error: sendRes.error, message: failed }, 502);
    }

    const accepted = await outStore.updateOutreachMessage(user.id, msgRecord.id, {
      status: 'provider_accepted',
      provider: sendRes.provider,
      providerMessageId: sendRes.providerMessageId,
      providerThreadId: sendRes.providerThreadId || sendRes.providerMessageId,
      sentAt: sendRes.acceptedAt || new Date().toISOString(),
      followUpDueAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    });
    await outStore.updateHrContactStatus(contact.id, 'active', new Date().toISOString());

    return c.json({ success: true, message: accepted });
  });

  hr.get('/messages', async (c) => {
    const user = c.get('user')!;
    const outStore = new WorkerHrOutreachStore(c.env.DB);
    const messages = await outStore.listOutreachMessages(user.id, { status: c.req.query('status') });
    return c.json({ success: true, messages });
  });

  hr.get('/messages/:id', async (c) => {
    const user = c.get('user')!;
    const outStore = new WorkerHrOutreachStore(c.env.DB);
    const message = await outStore.getOutreachMessageById(user.id, c.req.param('id'));
    if (!message) return c.json({ success: false, error: 'Message not found.' }, 404);
    const events = await outStore.listOutreachEvents(user.id, message.id);
    return c.json({ success: true, message, events });
  });

  hr.get('/replies', async (c) => {
    const user = c.get('user')!;
    const outStore = new WorkerHrOutreachStore(c.env.DB);
    const allMessages = await outStore.listOutreachMessages(user.id, { limit: 100 });
    const nowMs = Date.now();
    const items = allMessages.filter(
      (m) =>
        m.status === 'replied' ||
        m.status === 'follow_up_due' ||
        m.status === 'bounced' ||
        Boolean(m.repliedAt) ||
        (m.status === 'provider_accepted' && m.followUpDueAt && Date.parse(m.followUpDueAt) <= nowMs)
    );
    return c.json({ success: true, items });
  });

  hr.get('/campaigns', async (c) => {
    const user = c.get('user')!;
    const outStore = new WorkerHrOutreachStore(c.env.DB);
    const campaigns = await outStore.listOutreachCampaigns(user.id);
    return c.json({ success: true, campaigns });
  });

  hr.post('/campaigns', async (c) => {
    const user = c.get('user')!;
    const outStore = new WorkerHrOutreachStore(c.env.DB);
    const body = await c.req.json().catch(() => ({}));
    if (!body.name || typeof body.name !== 'string' || body.name.trim().length < 2) {
      return c.json({ success: false, error: 'Campaign name is required.' }, 400);
    }
    const campaign = await outStore.createOutreachCampaign({
      userId: user.id,
      name: body.name,
      targetCountry: body.targetCountry,
      targetRoles: Array.isArray(body.targetRoles) ? body.targetRoles : [],
      dailyLimit: body.dailyLimit,
      notes: body.notes,
    });
    return c.json({ success: true, campaign });
  });

  hr.get('/campaigns/:id', async (c) => {
    const user = c.get('user')!;
    const outStore = new WorkerHrOutreachStore(c.env.DB);
    const campaign = await outStore.getOutreachCampaignById(user.id, c.req.param('id'));
    if (!campaign) return c.json({ success: false, error: 'Campaign not found.' }, 404);
    const contacts = await outStore.getCampaignContacts(user.id, c.req.param('id'));
    return c.json({ success: true, campaign, contacts });
  });

  hr.post('/campaigns/:id/contacts', async (c) => {
    const user = c.get('user')!;
    const outStore = new WorkerHrOutreachStore(c.env.DB);
    const body = await c.req.json().catch(() => ({}));
    if (!Array.isArray(body.contactIds) || body.contactIds.length === 0) {
      return c.json({ success: false, error: 'contactIds array is required.' }, 400);
    }
    const added = await outStore.addContactsToCampaign(user.id, c.req.param('id'), body.contactIds, body.jobId);
    const campaign = await outStore.getOutreachCampaignById(user.id, c.req.param('id'));
    return c.json({ success: true, added, campaign });
  });

  hr.get('/do-not-contact', async (c) => {
    const user = c.get('user')!;
    const outStore = new WorkerHrOutreachStore(c.env.DB);
    const entries = await outStore.listDoNotContact(user.id);
    return c.json({ success: true, entries });
  });

  hr.post('/do-not-contact', async (c) => {
    const user = c.get('user')!;
    const outStore = new WorkerHrOutreachStore(c.env.DB);
    const body = await c.req.json().catch(() => ({}));
    if (!body.email || typeof body.email !== 'string' || !body.email.includes('@')) {
      return c.json({ success: false, error: 'Valid email address is required.' }, 400);
    }
    const entry = await outStore.addDoNotContact(user.id, body.email, body.reason || 'Candidate opt-out / suppression');
    return c.json({ success: true, entry });
  });

  hr.delete('/do-not-contact/:id', async (c) => {
    const user = c.get('user')!;
    const outStore = new WorkerHrOutreachStore(c.env.DB);
    const removed = await outStore.removeDoNotContact(user.id, c.req.param('id'));
    if (!removed) return c.json({ success: false, error: 'Entry not found.' }, 404);
    return c.json({ success: true });
  });

  return hr;
}
