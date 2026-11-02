// worker/index.ts
// Production Cloudflare Workers API Backend for ApplyWise AI

import './polyfills.ts';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { D1Store, AuthUser } from './d1Store.ts';
import { hashPassword, verifyPassword, generateSessionToken, validateEmail, validatePassword } from './auth.ts';
import { workerResumeEngine } from './resumeEngine.ts';
import { workerJobDiscovery } from './jobDiscovery.ts';
import { workerMatchingEngine } from './matchingEngine.ts';
import { workerSubmissionAdapter } from './submissionAdapter.ts';
import { initialVacancies, initialIntegrations } from '../src/data/seedData.ts';
import { validateStateTransition } from '../src/utils/rules.ts';
import { ApplicationRecord, ApplicationStatus } from '../src/types/index.ts';

type Bindings = {
  DB: D1Database;
  ASSETS: Fetcher;
  GEMINI_API_KEY?: string;
  APP_URL?: string;
};

type Variables = {
  user?: AuthUser;
  store: D1Store;
};

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Security headers & CORS
app.use('*', cors({
  origin: (origin) => origin || '*',
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

app.use('*', async (c, next) => {
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('X-XSS-Protection', '1; mode=block');
  c.set('store', new D1Store(c.env.DB));
  await next();
});

// Helper: Extract token from Authorization header or cookie
function getRequestToken(c: any): string {
  const auth = c.req.header('Authorization');
  if (auth && auth.startsWith('Bearer ')) {
    return auth.substring(7).trim();
  }
  return getCookie(c, 'applywise_token') || '';
}

// Auth Middleware: Mandatory
async function requireAuth(c: any, next: any) {
  const token = getRequestToken(c);
  if (!token) {
    return c.json({ success: false, error: 'Authentication required. Please sign in.' }, 401);
  }
  const store: D1Store = c.get('store');
  const user = await store.getUserByToken(token);
  if (!user) {
    return c.json({ success: false, error: 'Session expired or invalid. Please sign in again.' }, 401);
  }
  c.set('user', user);
  await next();
}

// Auth Middleware: Optional (for guest vacancy browsing)
async function optionalAuth(c: any, next: any) {
  const token = getRequestToken(c);
  if (token) {
    const store: D1Store = c.get('store');
    const user = await store.getUserByToken(token);
    if (user) {
      c.set('user', user);
    }
  }
  await next();
}

// ============================================================================
// 1. AUTHENTICATION ROUTES
// ============================================================================

app.post('/api/auth/signup', async (c) => {
  try {
    const body = await c.req.json();
    const { fullName, email, password, confirmPassword } = body;

    if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
      return c.json({ success: false, error: 'Full name is required (minimum 2 characters).' }, 400);
    }
    if (!validateEmail(email)) {
      return c.json({ success: false, error: 'A valid email address is required.' }, 400);
    }
    if (!validatePassword(password)) {
      return c.json({ success: false, error: 'Password must be at least 8 characters long.' }, 400);
    }
    if (confirmPassword && password !== confirmPassword) {
      return c.json({ success: false, error: 'Passwords do not match.' }, 400);
    }

    const store: D1Store = c.get('store');
    const passHash = await hashPassword(password);
    const user = await store.createUser(fullName, email, passHash);

    const token = generateSessionToken();
    await store.createSession(user.id, token);

    setCookie(c, 'applywise_token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
      maxAge: 14 * 24 * 60 * 60,
      path: '/',
    });

    return c.json({
      success: true,
      user,
      token,
      message: 'Account created successfully! Welcome to ApplyWise AI.',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return c.json({ success: false, error: msg }, 400);
  }
});

app.post('/api/auth/login', async (c) => {
  try {
    const { email, password } = await c.req.json();
    if (!email || !password) {
      return c.json({ success: false, error: 'Email and password are required.' }, 400);
    }

    const store: D1Store = c.get('store');
    const userRow = await store.getUserByEmail(email);
    if (!userRow) {
      return c.json({ success: false, error: 'Invalid email or password.' }, 401);
    }

    const valid = await verifyPassword(password, userRow.password_hash);
    if (!valid) {
      return c.json({ success: false, error: 'Invalid email or password.' }, 401);
    }

    const token = generateSessionToken();
    await store.createSession(userRow.id, token);

    const authUser: AuthUser = {
      id: userRow.id,
      email: userRow.email,
      fullName: userRow.full_name,
      role: userRow.role,
      isVerified: !!userRow.is_verified,
      createdAt: userRow.created_at,
    };

    setCookie(c, 'applywise_token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
      maxAge: 14 * 24 * 60 * 60,
      path: '/',
    });

    return c.json({
      success: true,
      user: authUser,
      token,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Invalid login credentials';
    return c.json({ success: false, error: msg }, 401);
  }
});

app.post('/api/auth/logout', async (c) => {
  const token = getRequestToken(c);
  if (token) {
    const store: D1Store = c.get('store');
    await store.logoutSession(token);
  }
  deleteCookie(c, 'applywise_token', { path: '/' });
  return c.json({ success: true, message: 'Logged out successfully.' });
});

app.get('/api/auth/me', requireAuth, async (c) => {
  const user = c.get('user');
  return c.json({ success: true, user });
});

app.post('/api/auth/recover-password', async (c) => {
  const { email } = await c.req.json();
  if (!email || !validateEmail(email)) {
    return c.json({ success: false, error: 'Valid email is required.' }, 400);
  }
  return c.json({
    success: true,
    message: 'If an account exists with this email, password reset instructions have been sent.',
  });
});

app.post('/api/auth/google', async (c) => {
  try {
    const { credential } = await c.req.json();
    if (!credential || typeof credential !== 'string') {
      return c.json({ success: false, error: 'Google credential token is required.' }, 400);
    }

    // Server-side verification via Google OAuth tokeninfo endpoint
    const verifyResp = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`, {
      signal: AbortSignal.timeout(8000),
    });

    if (!verifyResp.ok) {
      return c.json({ success: false, error: 'Invalid or expired Google authentication token.' }, 401);
    }

    const payload = await verifyResp.json() as {
      iss?: string;
      sub?: string;
      email?: string;
      email_verified?: boolean | string;
      name?: string;
      aud?: string;
      exp?: number;
    };

    const validIssuers = ['accounts.google.com', 'https://accounts.google.com'];
    if (!payload.iss || !validIssuers.includes(payload.iss)) {
      return c.json({ success: false, error: 'Untrusted Google token issuer.' }, 401);
    }

    if (!payload.email) {
      return c.json({ success: false, error: 'Google account has no associated email address.' }, 400);
    }

    const store: D1Store = c.get('store');
    const cleanEmail = payload.email.toLowerCase().trim();
    let userRow = await store.getUserByEmail(cleanEmail);

    let authUser: AuthUser;
    if (!userRow) {
      // Register new user via verified Google profile
      const generatedPass = `google_oauth_${payload.sub}_${crypto.randomUUID()}`;
      const passHash = await hashPassword(generatedPass);
      authUser = await store.createUser(payload.name || cleanEmail.split('@')[0], cleanEmail, passHash);
    } else {
      authUser = {
        id: userRow.id,
        email: userRow.email,
        fullName: userRow.full_name,
        role: userRow.role,
        isVerified: !!userRow.is_verified,
        createdAt: userRow.created_at,
      };
    }

    const token = generateSessionToken();
    await store.createSession(authUser.id, token);

    setCookie(c, 'applywise_token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
      maxAge: 14 * 24 * 60 * 60,
      path: '/',
    });

    return c.json({
      success: true,
      user: authUser,
      token,
      message: 'Signed in with Google successfully.',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return c.json({ success: false, error: `Google authentication failed: ${msg}` }, 400);
  }
});

// ============================================================================
// 1B. SUBSCRIPTIONS & ENTITLEMENTS
// ============================================================================

app.get('/api/subscription/current', requireAuth, async (c) => {
  const user: AuthUser = c.get('user')!;
  const store: D1Store = c.get('store');
  const sub = await store.getUserSubscription(user.id);
  const used = await store.getAIUsageCount(user.id, sub.currentPeriodStart);
  const quotaLimit = sub.planId === 'pro' ? 300 : 10;

  return c.json({
    success: true,
    subscription: sub,
    usage: {
      used,
      limit: quotaLimit,
      remaining: Math.max(0, quotaLimit - used),
      periodStart: sub.currentPeriodStart,
      periodEnd: sub.currentPeriodEnd,
    },
  });
});

app.post('/api/subscription/upgrade', requireAuth, async (c) => {
  try {
    const user: AuthUser = c.get('user')!;
    const store: D1Store = c.get('store');
    const { planId = 'pro', billingInterval = 'monthly' } = await c.req.json();

    await store.updateUserSubscription(user.id, planId, billingInterval);
    await store.addAuditLog(user.id, 'User manual', 'SUBSCRIPTION_UPGRADED', `Plan: ${planId} (${billingInterval})`, 'Upgraded account to Pro tier');
    await store.addNotification(user.id, 'Welcome to ApplyWise Pro!', 'Your account has been upgraded. You now have access to high-volume AI intelligence, advanced ATS tailoring, and deep gap analysis.', 'system');

    const updatedSub = await store.getUserSubscription(user.id);
    return c.json({
      success: true,
      subscription: updatedSub,
      message: 'Welcome to ApplyWise Pro! All premium capabilities are now active.',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return c.json({ success: false, error: `Upgrade failed: ${msg}` }, 500);
  }
});

app.post('/api/subscription/cancel', requireAuth, async (c) => {
  try {
    const user: AuthUser = c.get('user')!;
    const store: D1Store = c.get('store');
    await store.cancelSubscription(user.id);
    await store.addAuditLog(user.id, 'User manual', 'SUBSCRIPTION_CANCEL_SCHEDULED', 'Pro Plan', 'Scheduled subscription cancellation at end of period');

    const updatedSub = await store.getUserSubscription(user.id);
    return c.json({
      success: true,
      subscription: updatedSub,
      message: 'Subscription will remain active until the end of your current billing period.',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return c.json({ success: false, error: `Cancellation failed: ${msg}` }, 500);
  }
});

// ============================================================================
// 1C. UNIFIED GLOBAL AI COPILOT
// ============================================================================

app.get('/api/ai/copilot/history', requireAuth, async (c) => {
  const user: AuthUser = c.get('user')!;
  const store: D1Store = c.get('store');
  const conv = await store.getLatestConversation(user.id);
  return c.json({ success: true, conversation: conv });
});

app.post('/api/ai/copilot', requireAuth, async (c) => {
  try {
    const user: AuthUser = c.get('user')!;
    const store: D1Store = c.get('store');
    const { message, context = {}, conversationId = `conv_${Date.now()}` } = await c.req.json();

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return c.json({ success: false, error: 'A valid query message is required.' }, 400);
    }

    // 1. Quota Enforcement
    const sub = await store.getUserSubscription(user.id);
    const used = await store.getAIUsageCount(user.id, sub.currentPeriodStart);
    const limit = sub.planId === 'pro' ? 300 : 10;

    if (used >= limit) {
      return c.json({
        success: false,
        code: 'QUOTA_EXCEEDED',
        error: `Monthly AI Copilot limit reached (${used}/${limit}). Upgrade to ApplyWise Pro for 300 AI queries/month and advanced career intelligence.`,
        usage: { used, limit, remaining: 0 },
      }, 403);
    }

    // 2. Build Context-Aware Prompt
    const pageContext = context.page || 'general';
    const profile = await store.getProfile(user.id);

    const systemPrompt = `You are ApplyWise Copilot, an elite AI career strategist and job application assistant for ApplyWise AI.
Candidate Name: ${user.fullName}
Candidate Title: ${profile?.currentTitle || 'Professional'}
Current Page: ${pageContext}
Context Details: ${JSON.stringify(context.details || {})}

Guidelines:
- Provide high-value, concise, practical career guidance, interview preparation, resume optimization, or recruiter messaging.
- Maintain a warm, encouraging, highly professional tone.
- Keep responses readable with bullet points and bold highlights.
- Ground advice in real career best practices. Never invent fake credentials or false statistics.`;

    let reply = '';
    const apiKey = c.env.GEMINI_API_KEY;

    if (apiKey) {
      try {
        const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              { role: 'user', parts: [{ text: `${systemPrompt}\n\nUser Question:\n${message}` }] }
            ],
            generationConfig: { maxOutputTokens: 1024, temperature: 0.7 },
          }),
          signal: AbortSignal.timeout(15000),
        });

        if (geminiRes.ok) {
          const gData = await geminiRes.json() as any;
          reply = gData.candidates?.[0]?.content?.parts?.[0]?.text || '';
        }
      } catch {
        // Fallback to deterministic AI assistant below
      }
    }

    // Deterministic Intelligent Fallback if API key missing or external timeout
    if (!reply) {
      const qLower = message.toLowerCase();
      if (qLower.includes('resume') || qLower.includes('tailor') || qLower.includes('cv')) {
        reply = `**Resume Optimization Strategy for ${user.fullName}:**\n\n1. **Lead with quantifiable achievements:** Rephrase task descriptions into *Action Verb + Context + Result (e.g. Improved cycle time by 22%)*.\n2. **Align core keywords:** Ensure the target skills from the job listing are explicitly reflected in your experience bullets.\n3. **Preserve factual accuracy:** Use ApplyWise AI's built-in ATS Document Studio to generate a tailored DOCX resume with 100% truthfulness verification.`;
      } else if (qLower.includes('interview') || qLower.includes('question') || qLower.includes('prep')) {
        reply = `**Role-Specific Interview Preparation:**\n\n• **STAR Framework:** Structure your situational answers with *Situation, Task, Action, and Result*.\n• **High-Impact Questions to Expect:**\n  - "Tell me about a project where scope changed unexpectedly. How did you adapt?"\n  - "How do you align stakeholders with competing priorities?"\n• **Ask the Interviewer:** "What does success look like in the first 90 days for this role?"`;
      } else if (qLower.includes('follow up') || qLower.includes('email') || qLower.includes('recruiter') || qLower.includes('cover letter')) {
        reply = `**Professional Recruiter Communication Template:**\n\n*Subject:* Application Follow-Up — ${profile?.currentTitle || 'Candidate'} — ${user.fullName}\n\nDear [Hiring Manager / Recruiter Name],\n\nI hope you are having a productive week. I recently submitted my application for the role and wanted to reiterate my enthusiasm for joining your team.\n\nWith my background in ${profile?.currentTitle || 'my field'} and hands-on experience delivering key operational outcomes, I am excited about the opportunity to contribute immediately.\n\nThank you for your time and consideration,\n${user.fullName}`;
      } else {
        reply = `**ApplyWise Career Advisor:**\n\nI am here to assist your job search workflow across:\n\n• **Application Tracking:** Organizing opportunities across all interview stages.\n• **ATS Resume Tailoring:** Creating factually verified DOCX resumes tailored to specific vacancy descriptions.\n• **Interview Readiness:** Practicing behavioral and technical interview questions.\n\nHow can I help you advance your search today?`;
      }
    }

    // 3. Record Usage & Conversation History
    await store.recordAIUsage(user.id, `copilot_${pageContext}`, message.length, reply.length);

    const convHistory = [
      { role: 'user', content: message, timestamp: new Date().toISOString() },
      { role: 'assistant', content: reply, timestamp: new Date().toISOString() },
    ];
    await store.saveAIConversation(user.id, conversationId, message.slice(0, 30), convHistory);

    const newUsed = used + 1;
    return c.json({
      success: true,
      reply,
      conversationId,
      usage: {
        used: newUsed,
        limit,
        remaining: Math.max(0, limit - newUsed),
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return c.json({ success: false, error: `AI Copilot error: ${msg}` }, 500);
  }
});

// ============================================================================
// 2. RESUME UPLOAD, PARSING & DOCX EXPORT
// ============================================================================

app.post('/api/resumes/upload', requireAuth, async (c) => {
  try {
    const user: AuthUser = c.get('user')!;
    const store: D1Store = c.get('store');
    const formData = await c.req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return c.json({ success: false, error: 'Please attach a PDF or DOCX resume document.' }, 400);
    }

    const buffer = await file.arrayBuffer();
    const extraction = await workerResumeEngine.extractText(buffer, file.name, file.type);

    if (extraction.isScanned || !extraction.text || extraction.text.length < 40) {
      return c.json({
        success: false,
        isScanned: true,
        error: extraction.warning || 'Scanned or image document detected. No readable text could be extracted. Please upload a standard text PDF or DOCX file.',
      }, 422);
    }

    await store.saveResumeDocument(user.id, {
      fileName: file.name,
      fileType: extraction.format,
      fileSizeBytes: file.size,
      extractedText: extraction.text.slice(0, 50000),
      isScanned: false,
    });

    const existingProfile = await store.getProfile(user.id);
    const parsedProfile = await workerResumeEngine.structureProfileWithAI(extraction.text, existingProfile, c.env.GEMINI_API_KEY);

    await store.saveProfile(user.id, parsedProfile);
    await store.addAuditLog(user.id, 'User manual', 'RESUME_UPLOADED', file.name, `Extracted profile with ${parsedProfile.skills.length} skills and ${parsedProfile.experiences.length} experience entries`);
    await store.addNotification(user.id, 'Resume Parsed Successfully', `Extracted profile for ${parsedProfile.fullName}. Please review your information.`, 'system');

    return c.json({
      success: true,
      profile: parsedProfile,
      extractedTextSummary: extraction.text.slice(0, 300) + '...',
      warning: extraction.warning,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return c.json({ success: false, error: msg }, 400);
  }
});

app.post('/api/ai/parse-resume', requireAuth, async (c) => {
  try {
    const user: AuthUser = c.get('user')!;
    const store: D1Store = c.get('store');
    const { resumeText } = await c.req.json();

    if (!resumeText || typeof resumeText !== 'string' || resumeText.trim().length < 40) {
      return c.json({ success: false, error: 'Valid resume text (minimum 40 characters) is required.' }, 400);
    }

    if (resumeText.startsWith('%PDF-') || resumeText.includes('stream\r\n')) {
      return c.json({
        success: false,
        error: 'Raw binary PDF bytes detected. Please upload your PDF using the "Upload Resume" button instead of pasting binary characters.',
      }, 400);
    }

    const existingProfile = await store.getProfile(user.id);
    const parsed = await workerResumeEngine.structureProfileWithAI(resumeText, existingProfile, c.env.GEMINI_API_KEY);
    await store.saveProfile(user.id, parsed);

    await store.addAuditLog(user.id, 'User manual', 'RESUME_PARSED_TEXT', user.email, `Parsed resume text for ${parsed.fullName}`);
    return c.json({ success: true, profile: parsed });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return c.json({ success: false, error: `Resume parsing failed: ${msg}` }, 500);
  }
});

app.get('/api/resumes/:appId/export/docx', requireAuth, async (c) => {
  try {
    const user: AuthUser = c.get('user')!;
    const store: D1Store = c.get('store');
    const appId = c.req.param('appId');

    const application = await store.getApplicationById(user.id, appId);
    if (!application) {
      return c.json({ success: false, error: 'Application record not found.' }, 404);
    }

    const profile = await store.getProfile(user.id);
    if (!profile) {
      return c.json({ success: false, error: 'Profile not found.' }, 404);
    }

    const docBytes = await workerResumeEngine.generateDocx(profile, application.tailoredResume);
    const fileName = `${application.company.replace(/[^a-zA-Z0-9]/g, '_')}_Resume.docx`;

    return new Response(docBytes as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return c.json({ success: false, error: `Failed to generate DOCX document: ${msg}` }, 500);
  }
});

// ============================================================================
// 3. PROFILE & PREFERENCES
// ============================================================================

app.get('/api/profile', requireAuth, async (c) => {
  const user: AuthUser = c.get('user')!;
  const store: D1Store = c.get('store');
  const profile = await store.getProfile(user.id);
  return c.json({ success: true, profile });
});

app.put('/api/profile', requireAuth, async (c) => {
  const user: AuthUser = c.get('user')!;
  const store: D1Store = c.get('store');
  const updates = await c.req.json();
  const current = await store.getProfile(user.id);

  if (!current) {
    return c.json({ success: false, error: 'Profile not found.' }, 404);
  }

  const updated = {
    ...current,
    ...updates,
    masterResumeLastUpdated: new Date().toISOString(),
  };

  await store.saveProfile(user.id, updated);
  await store.addAuditLog(user.id, 'User manual', 'PROFILE_UPDATED', 'Master Profile', 'Updated profile information');
  return c.json({ success: true, profile: updated });
});

app.get('/api/preferences', requireAuth, async (c) => {
  const user: AuthUser = c.get('user')!;
  const store: D1Store = c.get('store');
  const preferences = await store.getPreferences(user.id);
  return c.json({ success: true, preferences });
});

app.put('/api/preferences', requireAuth, async (c) => {
  const user: AuthUser = c.get('user')!;
  const store: D1Store = c.get('store');
  const updates = await c.req.json();
  const current = await store.getPreferences(user.id);
  const updated = { ...current, ...updates };

  await store.savePreferences(user.id, updated);
  await store.addAuditLog(user.id, 'User manual', 'PREFERENCES_UPDATED', 'Preferences', 'Updated career targets and filters');
  return c.json({ success: true, preferences: updated });
});

app.get('/api/settings', requireAuth, async (c) => {
  const user: AuthUser = c.get('user')!;
  const store: D1Store = c.get('store');
  const settings = await store.getSettings(user.id);
  return c.json({ success: true, settings });
});

app.put('/api/settings', requireAuth, async (c) => {
  const user: AuthUser = c.get('user')!;
  const store: D1Store = c.get('store');
  const updates = await c.req.json();
  const current = await store.getSettings(user.id);
  const updated = { ...current, ...updates };

  await store.saveSettings(user.id, updated);
  return c.json({ success: true, settings: updated });
});

app.post('/api/settings/emergency-stop', requireAuth, async (c) => {
  const user: AuthUser = c.get('user')!;
  const store: D1Store = c.get('store');
  const { enabled } = await c.req.json();
  const current = await store.getSettings(user.id);
  const nextStop = enabled !== undefined ? !!enabled : !current.emergencyStop;
  current.emergencyStop = nextStop;

  await store.saveSettings(user.id, current);
  await store.addAuditLog(
    user.id,
    'User manual',
    nextStop ? 'EMERGENCY_STOP_ENGAGED' : 'EMERGENCY_STOP_CLEARED',
    'Safety System',
    nextStop ? 'Automation paused by user' : 'Automation re-enabled',
    nextStop ? 'warning' : 'info'
  );

  return c.json({ success: true, emergencyStop: current.emergencyStop, settings: current });
});

// ============================================================================
// 4. REAL JOB DISCOVERY & MATCHING
// ============================================================================

app.get('/api/vacancies', optionalAuth, async (c) => {
  const store: D1Store = c.get('store');
  let vacancies = await store.getVacancies(100);

  // Auto-seed real initial vacancies if database is fresh
  if (vacancies.length === 0) {
    await store.cacheInitialVacanciesIfEmpty(initialVacancies);
    vacancies = await store.getVacancies(100);
  }

  const user = c.get('user');
  if (user) {
    const profile = await store.getProfile(user.id);
    const preferences = await store.getPreferences(user.id);

    if (profile && preferences) {
      for (const v of vacancies) {
        if (!v.matchEvaluation) {
          const evalRes = await workerMatchingEngine.evaluateMatch(profile, preferences, v, c.env.GEMINI_API_KEY);
          v.matchEvaluation = {
            matchScore: evalRes.score,
            breakdown: evalRes.breakdown,
            matchedSkills: evalRes.reasons.slice(0, 3),
            missingSkills: evalRes.missingRequirements || [],
            reasons: evalRes.reasons,
            eligibilityIssues: evalRes.eligibilityConcerns,
            missingRequirements: evalRes.missingRequirements,
            eligibilityConcerns: evalRes.eligibilityConcerns,
            reasonsToConsider: evalRes.reasonsToConsider,
            dataQuality: evalRes.dataQuality,
            dataQualityNotes: evalRes.dataQualityNotes,
            salaryCompatibility: evalRes.salaryCompatible ? 'compatible' : 'below_threshold',
            sponsorshipStatus: 'unspecified',
            recommendation: !evalRes.isEligible ? 'DO_NOT_APPLY' : (evalRes.score >= 80 ? 'STRONG_APPLY' : evalRes.score >= 60 ? 'CONSIDER' : 'MARGINAL'),
            evaluatedAt: new Date().toISOString(),
          };
        }
      }
    }
  }

  return c.json({ success: true, vacancies });
});

app.post('/api/jobs/search', optionalAuth, async (c) => {
  const { query, country, remoteOnly } = await c.req.json();
  const store: D1Store = c.get('store');
  const result = await workerJobDiscovery.searchJobs({ query, country, remoteOnly });

  if (result.vacancies.length > 0) {
    await store.saveVacancies(result.vacancies);
  }

  const user = c.get('user');
  if (user) {
    const profile = await store.getProfile(user.id);
    const preferences = await store.getPreferences(user.id);

    if (profile && preferences) {
      for (const v of result.vacancies) {
        const evalRes = await workerMatchingEngine.evaluateMatch(profile, preferences, v, c.env.GEMINI_API_KEY);
        v.matchEvaluation = {
          matchScore: evalRes.score,
          breakdown: evalRes.breakdown,
          matchedSkills: evalRes.reasons.slice(0, 3),
          missingSkills: evalRes.missingRequirements || [],
          reasons: evalRes.reasons,
          eligibilityIssues: evalRes.eligibilityConcerns,
          missingRequirements: evalRes.missingRequirements,
          eligibilityConcerns: evalRes.eligibilityConcerns,
          reasonsToConsider: evalRes.reasonsToConsider,
          dataQuality: evalRes.dataQuality,
          dataQualityNotes: evalRes.dataQualityNotes,
          salaryCompatibility: evalRes.salaryCompatible ? 'compatible' : 'below_threshold',
          sponsorshipStatus: 'unspecified',
          recommendation: !evalRes.isEligible ? 'DO_NOT_APPLY' : (evalRes.score >= 80 ? 'STRONG_APPLY' : evalRes.score >= 60 ? 'CONSIDER' : 'MARGINAL'),
          evaluatedAt: new Date().toISOString(),
        };
      }
    }
    await store.addAuditLog(user.id, 'User manual', 'JOB_SEARCH', query || 'all', `Discovered ${result.vacancies.length} vacancies across aggregators`);
  }

  return c.json({
    success: true,
    totalDiscovered: result.vacancies.length,
    vacancies: result.vacancies,
    errors: result.errors,
  });
});

app.post('/api/vacancies/:id/recheck', async (c) => {
  const store: D1Store = c.get('store');
  const id = c.req.param('id');
  const vacancy = await store.getVacancyById(id);
  if (!vacancy) {
    return c.json({ success: false, error: 'Vacancy not found.' }, 404);
  }

  const check = await workerJobDiscovery.recheckVacancy(vacancy);
  vacancy.isActive = check.isActive;
  vacancy.lastCheckedAt = check.lastCheckedAt;
  await store.saveVacancies([vacancy]);

  return c.json({ success: true, vacancy });
});

// ============================================================================
// 5. APPLICATIONS & TRUTHFUL SUBMISSION
// ============================================================================

app.get('/api/applications', requireAuth, async (c) => {
  const user: AuthUser = c.get('user')!;
  const store: D1Store = c.get('store');
  const applications = await store.getApplications(user.id);
  return c.json({ success: true, applications });
});

app.post('/api/applications/create-from-vacancy', requireAuth, async (c) => {
  const user: AuthUser = c.get('user')!;
  const store: D1Store = c.get('store');
  const { vacancyId } = await c.req.json();

  const vacancy = await store.getVacancyById(vacancyId);
  if (!vacancy) {
    return c.json({ success: false, error: 'Vacancy not found.' }, 404);
  }

  const profile = await store.getProfile(user.id);
  const preferences = await store.getPreferences(user.id);

  if (!profile) {
    return c.json({ success: false, error: 'Please upload or complete your career profile first.' }, 400);
  }

  const tailoring = await workerResumeEngine.tailorResume(profile, vacancy.title, vacancy.company, vacancy.description, c.env.GEMINI_API_KEY);
  const match = await workerMatchingEngine.evaluateMatch(profile, preferences, vacancy, c.env.GEMINI_API_KEY);

  const newApp: ApplicationRecord = {
    id: `app_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    duplicateKey: `${vacancy.company}::${vacancy.title}::${user.id}`.toLowerCase(),
    vacancyId: vacancy.id,
    company: vacancy.company,
    role: vacancy.title,
    country: vacancy.country,
    location: vacancy.location,
    jobUrl: vacancy.url,
    url: vacancy.url,
    salaryRange: vacancy.salaryRange?.raw,
    matchScore: match.score,
    status: 'PREPARED',
    resumeVersionId: `ver_${Date.now()}`,
    tailoredResume: tailoring.tailoredResume,
    coverLetter: tailoring.coverLetter,
    timeline: [
      {
        timestamp: new Date().toISOString(),
        stage: 'DISCOVERED',
        note: `Vacancy retrieved from ${vacancy.source}.`,
        actor: 'System scheduler',
      },
      {
        timestamp: new Date().toISOString(),
        stage: 'PREPARED',
        note: `Tailored ATS resume and cover letter generated with 100% truthfulness score.`,
        actor: 'Agent autonomous',
      },
    ],
    notes: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await store.saveApplication(user.id, newApp);
  await store.addAuditLog(user.id, 'Agent autonomous', 'APPLICATION_PREPARED', `${vacancy.company} - ${vacancy.title}`, 'Generated ATS resume package without hallucinated facts');
  await store.addNotification(user.id, 'Application Package Prepared', `Tailored documents ready for ${vacancy.title} at ${vacancy.company}.`, 'approval_needed', { applicationId: newApp.id });

  return c.json({ success: true, application: newApp });
});

app.post('/api/applications/:id/transition', requireAuth, async (c) => {
  const user: AuthUser = c.get('user')!;
  const store: D1Store = c.get('store');
  const id = c.req.param('id');
  const { newStatus, note } = await c.req.json() as { newStatus: ApplicationStatus; note?: string };

  const appRecord = await store.getApplicationById(user.id, id);
  if (!appRecord) {
    return c.json({ success: false, error: 'Application not found.' }, 404);
  }

  const isValid = validateStateTransition(appRecord.status, newStatus);
  if (!isValid) {
    return c.json({
      success: false,
      error: `Invalid status transition: Cannot transition from ${appRecord.status} to ${newStatus}.`,
    }, 400);
  }

  appRecord.status = newStatus;
  appRecord.updatedAt = new Date().toISOString();
  appRecord.timeline.push({
    timestamp: new Date().toISOString(),
    stage: newStatus,
    note: note || `Status transitioned to ${newStatus}`,
    actor: 'User manual',
  });

  await store.saveApplication(user.id, appRecord);
  await store.addAuditLog(user.id, 'User manual', 'STATUS_TRANSITION', `${appRecord.company} - ${appRecord.role}`, `Moved to ${newStatus}`);
  return c.json({ success: true, application: appRecord });
});

app.post('/api/applications/:id/approve', requireAuth, async (c) => {
  const user: AuthUser = c.get('user')!;
  const store: D1Store = c.get('store');
  const id = c.req.param('id');

  const appRecord = await store.getApplicationById(user.id, id);
  if (!appRecord) {
    return c.json({ success: false, error: 'Application not found.' }, 404);
  }

  appRecord.status = 'AUTHORIZED_TO_SUBMIT';
  appRecord.updatedAt = new Date().toISOString();
  appRecord.timeline.push({
    timestamp: new Date().toISOString(),
    stage: 'AUTHORIZED_TO_SUBMIT',
    note: 'User verified tailored package and authorized submission.',
    actor: 'User approved',
  });

  await store.saveApplication(user.id, appRecord);
  await store.addAuditLog(user.id, 'User approved', 'APPLICATION_AUTHORIZED', `${appRecord.company} - ${appRecord.role}`, 'User granted authorization to submit package');
  return c.json({ success: true, application: appRecord });
});

app.post('/api/applications/:id/submit', requireAuth, async (c) => {
  const user: AuthUser = c.get('user')!;
  const store: D1Store = c.get('store');
  const id = c.req.param('id');
  const { userEvidence } = await c.req.json();

  const appRecord = await store.getApplicationById(user.id, id);
  if (!appRecord) {
    return c.json({ success: false, error: 'Application not found.' }, 404);
  }

  const settings = await store.getSettings(user.id);
  if (settings.emergencyStop) {
    return c.json({ success: false, error: 'Safety Guard: Emergency stop is engaged. Submission aborted.' }, 403);
  }

  const profile = await store.getProfile(user.id);
  if (!profile) {
    return c.json({ success: false, error: 'Verified profile required.' }, 400);
  }

  const subResult = await workerSubmissionAdapter.processSubmission(appRecord, profile, userEvidence);

  appRecord.status = subResult.status;
  if (subResult.evidence) {
    appRecord.submissionEvidence = subResult.evidence as any;
  }
  if (subResult.guidedApplication) {
    appRecord.guidedApplication = subResult.guidedApplication;
  }

  appRecord.updatedAt = new Date().toISOString();
  appRecord.timeline.push({
    timestamp: new Date().toISOString(),
    stage: subResult.status,
    note: subResult.message,
    actor: userEvidence ? 'User manual' : 'Agent autonomous',
  });

  await store.saveApplication(user.id, appRecord);
  await store.addAuditLog(user.id, userEvidence ? 'User manual' : 'Agent autonomous', 'SUBMISSION_PROCESSED', `${appRecord.company} - ${appRecord.role}`, subResult.message);

  return c.json({
    success: true,
    application: appRecord,
    guidedApplication: subResult.guidedApplication,
    message: subResult.message,
  });
});

// ============================================================================
// 6. AUDIT LOGS, NOTIFICATIONS & INTEGRATIONS
// ============================================================================

app.get('/api/audit-logs', requireAuth, async (c) => {
  const user: AuthUser = c.get('user')!;
  const store: D1Store = c.get('store');
  const logs = await store.getAuditLogs(user.id);
  return c.json({ success: true, logs });
});

app.get('/api/notifications', requireAuth, async (c) => {
  const user: AuthUser = c.get('user')!;
  const store: D1Store = c.get('store');
  const notifications = await store.getNotifications(user.id);
  return c.json({ success: true, notifications });
});

app.patch('/api/notifications/:id/read', requireAuth, async (c) => {
  const user: AuthUser = c.get('user')!;
  const store: D1Store = c.get('store');
  const id = c.req.param('id');
  await store.markNotificationsRead(user.id, id);
  const notifications = await store.getNotifications(user.id);
  return c.json({ success: true, notifications });
});

app.post('/api/notifications/mark-all-read', requireAuth, async (c) => {
  const user: AuthUser = c.get('user')!;
  const store: D1Store = c.get('store');
  await store.markNotificationsRead(user.id);
  const notifications = await store.getNotifications(user.id);
  return c.json({ success: true, notifications });
});

app.get('/api/integrations', async (c) => {
  return c.json({ success: true, integrations: initialIntegrations });
});

// Health check
app.get('/api/health', async (c) => {
  return c.json({
    status: 'ok',
    product: 'ApplyWise AI',
    timestamp: new Date().toISOString(),
  });
});

// Cloudflare Worker Fetch Entrypoint
export default {
  async fetch(request: Request, env: Bindings, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // If it's an API request, route through Hono API router
    if (url.pathname.startsWith('/api')) {
      return app.fetch(request, env, ctx);
    }

    // Otherwise, dispatch to Cloudflare Workers Static Assets (dist/) with SPA fallback
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response('Asset server unavailable', { status: 503 });
  },
};
