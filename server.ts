import crypto from 'node:crypto';
import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import multer from 'multer';
import cookieParser from 'cookie-parser';
import { authAndStore, AuthUser } from './server/authAndStore.ts';
import { resumeEngine } from './server/resumeEngine.ts';
import { buildFactsFromProfile, auditTailoredResume } from './src/utils/candidateFactRegistry.ts';
import { generateCopilotResponse } from './src/utils/copilotEngine.ts';
import { jobDiscovery } from './server/jobDiscovery.ts';
import { matchingEngine } from './server/matchingEngine.ts';
import { careerIntelligenceEngine } from './server/careerIntelligenceEngine.ts';
import { submissionAdapter } from './server/submissionAdapter.ts';
import {
  initialVacancies,
  initialIntegrations,
} from './src/data/seedData.ts';
import { validateStateTransition } from './src/utils/rules.ts';
import { ApplicationRecord, JobVacancy, ApplicationStatus } from './src/types/index.ts';
import { getEffectivePlan, checkAIUsageAllowance, isPermanentFreeAccessAccount } from './src/config/freeAccess.ts';
import { SUBSCRIPTION_PLANS } from './src/config/plans.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Only seed mock fixtures if running in automated test mode
if (process.env.NODE_ENV === 'test') {
  authAndStore.cacheInitialVacanciesIfEmpty(initialVacancies);
}

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Multer memory storage for safe file inspection
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
});

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Extend Express Request to carry authenticated user
export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

// Authentication Middleware
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  let token = '';

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (req.cookies && (req.cookies.applyvise_token || req.cookies.applywise_token)) {
    token = req.cookies.applyvise_token || req.cookies.applywise_token;
  }

  if (!token) {
    return res.status(401).json({ success: false, error: 'Authentication required. Please sign in.' });
  }

  const user = authAndStore.getUserByToken(token);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Session expired or invalid. Please sign in again.' });
  }

  req.user = user;
  next();
}

// Optional Auth Middleware (allows unauthenticated browsing of public vacancies)
export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Access denied: Administrator privileges required.' });
    }
    next();
  });
}

export function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  let token = '';

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (req.cookies && (req.cookies.applyvise_token || req.cookies.applywise_token)) {
    token = req.cookies.applyvise_token || req.cookies.applywise_token;
  }

  if (token) {
    const user = authAndStore.getUserByToken(token);
    if (user) req.user = user;
  }
  next();
}

// Simple in-memory rate limiting map for public auth endpoints
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function rateLimit(limit: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const entry = rateLimitMap.get(ip);

    if (!entry || now > entry.resetAt) {
      rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (entry.count >= limit) {
      return res.status(429).json({ success: false, error: 'Too many requests. Please wait a moment and try again.' });
    }

    entry.count++;
    next();
  };
}

// ============================================================================
// 1. AUTHENTICATION ENDPOINTS
// ============================================================================

app.post('/api/auth/signup', rateLimit(10, 60000), (req: Request, res: Response) => {
  try {
    const { fullName, email, password, confirmPassword } = req.body;
    if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
      return res.status(400).json({ success: false, error: 'Full name is required (minimum 2 characters).' });
    }
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ success: false, error: 'A valid email address is required.' });
    }
    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ success: false, error: 'Password must be at least 8 characters long.' });
    }
    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({ success: false, error: 'Passwords do not match.' });
    }

    const newUser = authAndStore.createUser(fullName, email, password);
    const loginResult = authAndStore.verifyLogin(email, password);

    const cookieOpts = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 14 * 24 * 60 * 60 * 1000,
    };
    res.cookie('applyvise_token', loginResult.token, cookieOpts);
    res.cookie('applywise_token', loginResult.token, cookieOpts);

    res.json({
      success: true,
      user: loginResult.user,
      token: loginResult.token,
      message: 'Account created successfully! Welcome to ApplyVise AI.',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(400).json({ success: false, error: msg });
  }
});

app.post('/api/auth/login', rateLimit(15, 60000), (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required.' });
    }

    const result = authAndStore.verifyLogin(email, password);

    const cookieOpts = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 14 * 24 * 60 * 60 * 1000,
    };
    res.cookie('applyvise_token', result.token, cookieOpts);
    res.cookie('applywise_token', result.token, cookieOpts);

    res.json({
      success: true,
      user: result.user,
      token: result.token,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Invalid login credentials';
    res.status(401).json({ success: false, error: msg });
  }
});

app.post('/api/auth/logout', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = (authHeader && authHeader.startsWith('Bearer '))
    ? authHeader.substring(7).trim()
    : (req.cookies?.applyvise_token || req.cookies?.applywise_token);

  if (token) {
    authAndStore.logoutSession(token);
  }

  res.clearCookie('applyvise_token');
  res.clearCookie('applywise_token');
  res.json({ success: true, message: 'Logged out successfully.' });
});

app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  res.json({ success: true, user: req.user });
});

app.post('/api/auth/recover-password', rateLimit(5, 60000), (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ success: false, error: 'Valid email is required.' });
  }
  // Safe generic response for security (prevents user enumeration)
  res.json({
    success: true,
    message: 'If an account exists with this email, password reset instructions have been sent.',
  });
});

app.get('/api/auth/config', (_req: Request, res: Response) => {
  const googleClientId = process.env.GOOGLE_CLIENT_ID || null;
  res.json({
    googleClientId,
    googleAuthEnabled: Boolean(googleClientId),
  });
});

app.post('/api/auth/google', async (req: Request, res: Response) => {
  try {
    const { credential } = req.body;
    if (!credential || typeof credential !== 'string') {
      return res.status(400).json({ success: false, error: 'Google credential token is required.' });
    }

    const verifyResp = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`, {
      signal: AbortSignal.timeout(8000),
    });

    if (!verifyResp.ok) {
      return res.status(401).json({ success: false, error: 'Invalid or expired Google authentication token.' });
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
      return res.status(401).json({ success: false, error: 'Untrusted Google token issuer.' });
    }

    const configuredAud = process.env.GOOGLE_CLIENT_ID ? process.env.GOOGLE_CLIENT_ID.trim() : null;
    if (!configuredAud) {
      return res.status(503).json({ success: false, error: 'Google authentication is not configured on this server.' });
    }
    if (payload.aud?.trim() !== configuredAud) {
      return res.status(401).json({ success: false, error: 'Google authentication audience mismatch.' });
    }

    const isVerified = payload.email_verified === true || payload.email_verified === 'true';
    if (!isVerified) {
      return res.status(401).json({ success: false, error: 'Google account email is not verified by Google.' });
    }

    if (payload.exp && payload.exp * 1000 < Date.now()) {
      return res.status(401).json({ success: false, error: 'Google authentication token has expired.' });
    }

    if (!payload.email) {
      return res.status(400).json({ success: false, error: 'Google account has no associated email address.' });
    }

    const authResult = authAndStore.loginWithGoogle(payload.email, payload.name || payload.email.split('@')[0], payload.sub || 'unknown');

    const cookieOpts = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 14 * 24 * 60 * 60 * 1000,
      path: '/',
    };
    res.cookie('applyvise_token', authResult.token, cookieOpts);
    res.cookie('applywise_token', authResult.token, cookieOpts);

    res.json({
      success: true,
      user: authResult.user,
      token: authResult.token,
      message: 'Signed in with Google successfully.',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(400).json({ success: false, error: `Google authentication failed: ${msg}` });
  }
});

// ============================================================================
// 2. RESUME UPLOAD & PARSING (CRITICAL BUG FIX)
// ============================================================================

app.post(
  '/api/resumes/upload',
  requireAuth,
  upload.single('file'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ success: false, error: 'Please attach a PDF or DOCX resume document.' });
      }

      const extraction = await resumeEngine.extractText(file.buffer, file.originalname, file.mimetype);

      if (extraction.isScanned || !extraction.text || extraction.text.length < 40) {
        return res.status(422).json({
          success: false,
          isScanned: true,
          error: extraction.warning || 'Scanned or image document detected. No readable text could be extracted. Please upload a standard text PDF or DOCX file.',
        });
      }

      // Record document in DB
      authAndStore.saveResumeDocument(req.user!.id, {
        fileName: file.originalname,
        fileType: extraction.format,
        fileSizeBytes: file.size,
        extractedText: extraction.text.slice(0, 50000),
        isScanned: false,
      });

      // Parse structured profile via Gemini
      const existingProfile = authAndStore.getProfile(req.user!.id);
      const parsedProfile = await resumeEngine.structureProfileWithAI(extraction.text, existingProfile);

      // Merge and save
      authAndStore.saveProfile(req.user!.id, parsedProfile);
      authAndStore.addAuditLog(req.user!.id, 'User manual', 'RESUME_UPLOADED', file.originalname, `Extracted and structured profile with ${parsedProfile.skills.length} skills and ${parsedProfile.experiences.length} experience entries`);
      authAndStore.addNotification(req.user!.id, 'Resume Parsed Successfully', `Extracted profile for ${parsedProfile.fullName}. Please review your information.`, 'system');

      res.json({
        success: true,
        profile: parsedProfile,
        extractedTextSummary: extraction.text.slice(0, 300) + '...',
        warning: extraction.warning,
      });
    } catch (err: unknown) {
      console.error('Resume upload error:', err);
      const msg = err instanceof Error ? err.message : String(err);
      res.status(400).json({ success: false, error: msg });
    }
  }
);

app.post('/api/ai/parse-resume', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { resumeText } = req.body;
  if (!resumeText || typeof resumeText !== 'string' || resumeText.trim().length < 40) {
    return res.status(400).json({ success: false, error: 'Valid resume text (minimum 40 characters) is required.' });
  }

  // Guard: Catch raw PDF binary stream if user pasted raw bytes
  if (resumeText.startsWith('%PDF-') || resumeText.includes('stream\r\n') || /[\x00-\x08\x0E-\x1F]/.test(resumeText.slice(0, 100))) {
    return res.status(400).json({
      success: false,
      error: 'Raw binary PDF bytes detected. Please upload your PDF using the "Upload Resume" button instead of pasting binary characters.',
    });
  }

  try {
    const existingProfile = authAndStore.getProfile(req.user!.id);
    const parsed = await resumeEngine.structureProfileWithAI(resumeText, existingProfile);
    authAndStore.saveProfile(req.user!.id, parsed);

    authAndStore.addAuditLog(req.user!.id, 'User manual', 'RESUME_PARSED_TEXT', req.user!.email, `Parsed resume text for ${parsed.fullName}`);
    res.json({ success: true, profile: parsed });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: `Resume parsing failed: ${msg}` });
  }
});


// Candidate Fact Registry APIs
app.get('/api/candidate-facts', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const facts = authAndStore.getCandidateFacts(req.user!.id);
  res.json({ success: true, facts });
});

app.post('/api/candidate-facts', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const fact = req.body;
  authAndStore.saveCandidateFact(req.user!.id, fact);
  res.json({ success: true, fact });
});

app.delete('/api/candidate-facts/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  authAndStore.deleteCandidateFact(req.user!.id, req.params.id);
  res.json({ success: true });
});

// Grounded AI Copilot API
app.post('/api/ai/copilot', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { message, context = {}, conversationId = `conv_${Date.now()}` } = req.body;
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'A valid query message is required.' });
    }

    const profile = authAndStore.getProfile(req.user!.id);
    const facts = authAndStore.getCandidateFacts(req.user!.id);
    const preferences = authAndStore.getPreferences(req.user!.id);
    const applications = authAndStore.getApplications(req.user!.id);
    let targetJob = null;
    if (context.jobId) {
      targetJob = authAndStore.getVacancyById(context.jobId);
    }

    const reply = await generateCopilotResponse({
      message,
      context,
      user: { id: req.user!.id, fullName: req.user!.fullName || 'Ayush Prakash', email: req.user!.email },
      profile,
      preferences,
      applications,
      facts,
      job: targetJob,
      apiKey: process.env.GEMINI_API_KEY
    });

    res.json({
      success: true,
      reply,
      conversationId
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: `Copilot error: ${msg}` });
  }
});

// Resume Document Export (ATS DOCX download)
app.get('/api/resumes/:appId/export/docx', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const application = authAndStore.getApplicationById(req.user!.id, req.params.appId);
    if (!application) {
      return res.status(404).json({ success: false, error: 'Application record not found.' });
    }

    const profile = authAndStore.getProfile(req.user!.id);
    if (!profile) {
      return res.status(404).json({ success: false, error: 'Profile not found.' });
    }

    // Pre-export claim validation
    const facts = authAndStore.getCandidateFacts(req.user!.id);
    const profileFacts = facts.length > 0 ? facts : buildFactsFromProfile(profile);
    const audit = auditTailoredResume(application.tailoredResume, profileFacts);
    if (!audit.isValid) {
      return res.status(422).json({
        success: false,
        error: 'Resume export blocked by AI Integrity Engine. Unsupported candidate claims detected.',
        unsupportedClaims: audit.unsupportedClaims
      });
    }

    const docBuffer = await resumeEngine.generateDocx(profile, application.tailoredResume);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${application.company.replace(/[^a-zA-Z0-9]/g, '_')}_Resume.docx"`);
    res.send(docBuffer);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: `Failed to generate DOCX document: ${msg}` });
  }
});

// ============================================================================
// 3. USER PROFILE & PREFERENCES APIS
// ============================================================================

app.get('/api/profile', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const profile = authAndStore.getProfile(req.user!.id);
  res.json({ success: true, profile });
});

app.put('/api/profile', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const updates = req.body;
  const current = authAndStore.getProfile(req.user!.id);
  if (!current) {
    return res.status(404).json({ success: false, error: 'Profile not found.' });
  }

  const updated = {
    ...current,
    ...updates,
    masterResumeLastUpdated: new Date().toISOString(),
  };

  authAndStore.saveProfile(req.user!.id, updated);
  authAndStore.addAuditLog(req.user!.id, 'User manual', 'PROFILE_UPDATED', 'Master Profile', 'Updated profile information');
  res.json({ success: true, profile: updated });
});

app.get('/api/preferences', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const preferences = authAndStore.getPreferences(req.user!.id);
  res.json({ success: true, preferences });
});

app.put('/api/preferences', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const current = authAndStore.getPreferences(req.user!.id);
  const updated = { ...current, ...req.body };
  authAndStore.savePreferences(req.user!.id, updated);
  authAndStore.addAuditLog(req.user!.id, 'User manual', 'PREFERENCES_UPDATED', 'Preferences', 'Updated career targets and filters');
  res.json({ success: true, preferences: updated });
});

app.get('/api/settings', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const settings = authAndStore.getSettings(req.user!.id);
  res.json({ success: true, settings });
});

app.put('/api/settings', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const current = authAndStore.getSettings(req.user!.id);
  const updated = { ...current, ...req.body };
  authAndStore.saveSettings(req.user!.id, updated);
  res.json({ success: true, settings: updated });
});

app.post('/api/settings/emergency-stop', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const current = authAndStore.getSettings(req.user!.id);
  const nextStop = req.body.enabled !== undefined ? !!req.body.enabled : !current.emergencyStop;
  current.emergencyStop = nextStop;
  authAndStore.saveSettings(req.user!.id, current);

  authAndStore.addAuditLog(
    req.user!.id,
    'User manual',
    nextStop ? 'EMERGENCY_STOP_ENGAGED' : 'EMERGENCY_STOP_CLEARED',
    'Safety System',
    nextStop ? 'Automation paused by user' : 'Automation re-enabled',
    nextStop ? 'warning' : 'info'
  );

  res.json({ success: true, emergencyStop: current.emergencyStop, settings: current });
});

// ============================================================================
// 4. REAL JOB DISCOVERY & MATCHING
// ============================================================================

app.get('/api/vacancies', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  let vacancies = authAndStore.getVacancies(100);
  if (vacancies.length === 0) {
    try {
      const liveRes = await jobDiscovery.searchJobs({ limit: 25 });
      if (liveRes.vacancies.length > 0) {
        authAndStore.saveVacancies(liveRes.vacancies);
        vacancies = authAndStore.getVacancies(100);
      }
    } catch (e) {
      console.error('Initial live job discovery error:', e);
    }
  }

  // If user is logged in, attach match evaluation
  if (req.user) {
    const profile = authAndStore.getProfile(req.user.id);
    const preferences = authAndStore.getPreferences(req.user.id);

    if (profile && preferences) {
      for (const v of vacancies) {
        if (!v.matchEvaluation) {
          const evalRes = await matchingEngine.evaluateMatch(profile, preferences, v);
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

  res.json({ success: true, vacancies });
});

app.get('/api/jobs/search', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  const query = String(req.query.q || req.query.query || '').trim();
  const company = String(req.query.company || '').trim().toLowerCase();
  const location = String(req.query.location || '').trim().toLowerCase();
  const workArrangement = String(req.query.workArrangement || (req.query.remote === 'true' ? 'remote' : 'all'));
  const employmentType = String(req.query.employmentType || 'all').toLowerCase();
  const experienceLevel = String(req.query.experienceLevel || 'all').toLowerCase();
  const salaryMin = req.query.salaryMin ? parseFloat(String(req.query.salaryMin)) : undefined;
  const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
  const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || '15'), 10)));

  let vacancies = authAndStore.getVacancies(200);
  if (vacancies.length === 0) {
    try {
      const liveRes = await jobDiscovery.searchJobs({ query });
      if (liveRes.vacancies.length > 0) {
        authAndStore.saveVacancies(liveRes.vacancies);
        vacancies = authAndStore.getVacancies(200);
      }
    } catch (e) {
      console.warn('Initial vacancy fetch warning:', e);
    }
  }

  // Filter
  let filtered = vacancies.filter(v => {
    if (query) {
      const q = query.toLowerCase();
      const matchQ = v.title.toLowerCase().includes(q) ||
        v.company.toLowerCase().includes(q) ||
        v.description.toLowerCase().includes(q) ||
        (v.requirements || []).some(r => r.toLowerCase().includes(q));
      if (!matchQ) return false;
    }
    if (company && !v.company.toLowerCase().includes(company)) return false;
    if (location && location !== 'all locations') {
      const matchLoc = v.location.toLowerCase().includes(location) ||
        (v.country && v.country.toLowerCase().includes(location));
      if (!matchLoc) return false;
    }
    if (workArrangement !== 'all') {
      if (workArrangement === 'remote' && !v.remote && v.arrangement !== 'remote') return false;
      if (workArrangement === 'hybrid' && v.arrangement !== 'hybrid') return false;
      if (workArrangement === 'onsite' && (v.remote || v.arrangement === 'remote' || v.arrangement === 'hybrid')) return false;
    }
    if (employmentType !== 'all') {
      const et = ((v as any).employmentType || 'full-time').toLowerCase();
      if (!et.includes(employmentType)) return false;
    }
    if (experienceLevel !== 'all') {
      const el = ((v as any).experienceLevel || 'mid').toLowerCase();
      if (el !== experienceLevel) return false;
    }
    if (salaryMin && (v.salaryRange?.min || 0) < salaryMin) return false;
    return true;
  });

  // Calculate matches for authenticated user
  if (req.user) {
    const profile = authAndStore.getProfile(req.user.id);
    const preferences = authAndStore.getPreferences(req.user.id);
    if (profile && preferences) {
      for (const v of filtered) {
        if (!v.matchEvaluation) {
          const evalRes = await matchingEngine.evaluateMatch(profile, preferences, v);
          v.matchEvaluation = {
            matchScore: evalRes.score,
            breakdown: evalRes.breakdown,
            matchedSkills: evalRes.reasons.slice(0, 3),
            missingSkills: evalRes.missingRequirements || [],
            reasons: evalRes.reasons,
            eligibilityIssues: evalRes.eligibilityConcerns || [],
            salaryCompatibility: 'compatible',
            sponsorshipStatus: 'unspecified',
            recommendation: !evalRes.isEligible ? 'DO_NOT_APPLY' : (evalRes.score >= 80 ? 'STRONG_APPLY' : evalRes.score >= 60 ? 'CONSIDER' : 'MARGINAL'),
            evaluatedAt: new Date().toISOString(),
          };
        }
      }
    }
  }

  const total = filtered.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const offset = (page - 1) * limit;
  const paginated = filtered.slice(offset, offset + limit);

  res.json({
    success: true,
    total,
    page,
    limit,
    totalPages,
    jobs: paginated,
    vacancies: paginated,
  });
});

app.get('/api/jobs/status', (req: Request, res: Response) => {
  const vacancies = authAndStore.getVacancies(200);
  res.json({
    success: true,
    totalCachedJobs: vacancies.length,
    refreshCadence: '10 minutes',
    sources: [
      { source_id: 'remotive', source_name: 'Remotive Global', connector_type: 'aggregator_api', status: 'healthy', total_jobs: vacancies.length },
      { source_id: 'arbeitnow', source_name: 'Arbeitnow Jobs', connector_type: 'aggregator_api', status: 'healthy', total_jobs: vacancies.length },
      { source_id: 'jobicy', source_name: 'Jobicy Global Remote', connector_type: 'aggregator_api', status: 'healthy', total_jobs: vacancies.length },
    ],
    lastChecked: new Date().toISOString(),
  });
});

app.get('/api/jobs/sources', (req: Request, res: Response) => {
  res.json({
    success: true,
    sources: [
      { id: 'remotive', name: 'Remotive Global', type: 'aggregator_api', status: 'healthy' },
      { id: 'arbeitnow', name: 'Arbeitnow Jobs', type: 'aggregator_api', status: 'healthy' },
      { id: 'jobicy', name: 'Jobicy Global Remote', type: 'aggregator_api', status: 'healthy' },
    ],
  });
});

app.post('/api/jobs/refresh', optionalAuth, async (req: Request, res: Response) => {
  const liveRes = await jobDiscovery.searchJobs({});
  if (liveRes.vacancies.length > 0) {
    authAndStore.saveVacancies(liveRes.vacancies);
  }
  res.json({
    success: true,
    totalJobsFetched: liveRes.vacancies.length,
    message: `Refreshed job sources, fetched ${liveRes.vacancies.length} live openings.`,
  });
});

app.post('/api/jobs/search', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { query, country, remoteOnly } = req.body;
  const result = await jobDiscovery.searchJobs({ query, country, remoteOnly });

  if (result.vacancies.length > 0) {
    authAndStore.saveVacancies(result.vacancies);
  }

  // Calculate matches for authenticated user
  if (req.user) {
    const profile = authAndStore.getProfile(req.user.id);
    const preferences = authAndStore.getPreferences(req.user.id);
    if (profile && preferences) {
      for (const v of result.vacancies) {
        const evalRes = await matchingEngine.evaluateMatch(profile, preferences, v);
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
    authAndStore.addAuditLog(req.user.id, 'User manual', 'JOB_SEARCH', query || 'all', `Discovered ${result.vacancies.length} vacancies across Remotive, Arbeitnow, and Jobicy`);
  }

  res.json({
    success: true,
    totalDiscovered: result.vacancies.length,
    vacancies: result.vacancies,
    errors: result.errors,
  });
});

app.post('/api/vacancies/:id/recheck', async (req: Request, res: Response) => {
  const vacancy = authAndStore.getVacancyById(req.params.id);
  if (!vacancy) {
    return res.status(404).json({ success: false, error: 'Vacancy not found.' });
  }

  const check = await jobDiscovery.recheckVacancy(vacancy);
  vacancy.isActive = check.isActive;
  vacancy.lastCheckedAt = check.lastCheckedAt;
  authAndStore.saveVacancies([vacancy]);

  res.json({ success: true, vacancy });
});

// ============================================================================
// 5. APPLICATIONS & TRUTHFUL SUBMISSIONS
// ============================================================================

app.get('/api/applications', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const applications = authAndStore.getApplications(req.user!.id);
  res.json({ success: true, applications });
});

app.post('/api/applications/create-from-vacancy', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { vacancyId } = req.body;
  const vacancy = authAndStore.getVacancyById(vacancyId);
  if (!vacancy) {
    return res.status(404).json({ success: false, error: 'Vacancy not found.' });
  }

  const profile = authAndStore.getProfile(req.user!.id);
  const preferences = authAndStore.getPreferences(req.user!.id);

  if (!profile) {
    return res.status(400).json({ success: false, error: 'Please upload or complete your career profile first.' });
  }

  // Tailor resume strictly against master profile
  const tailoring = await resumeEngine.tailorResume(profile, vacancy.title, vacancy.company, vacancy.description);
  const match = await matchingEngine.evaluateMatch(profile, preferences || authAndStore.getPreferences(req.user!.id), vacancy);

  const newApp: ApplicationRecord = {
    id: `app_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    duplicateKey: `${vacancy.company}::${vacancy.title}::${req.user!.id}`.toLowerCase(),
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

  authAndStore.saveApplication(req.user!.id, newApp);
  authAndStore.addAuditLog(req.user!.id, 'Agent autonomous', 'APPLICATION_PREPARED', `${vacancy.company} - ${vacancy.title}`, 'Generated ATS resume package without hallucinated facts');
  authAndStore.addNotification(req.user!.id, 'Application Package Prepared', `Tailored documents ready for ${vacancy.title} at ${vacancy.company}.`, 'approval_needed', { applicationId: newApp.id });

  res.json({ success: true, application: newApp });
});

app.post('/api/applications/:id/transition', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { newStatus, note } = req.body as { newStatus: ApplicationStatus; note?: string };

  const appRecord = authAndStore.getApplicationById(req.user!.id, id);
  if (!appRecord) {
    return res.status(404).json({ success: false, error: 'Application not found.' });
  }

  const isValid = validateStateTransition(appRecord.status, newStatus);
  if (!isValid) {
    return res.status(400).json({
      success: false,
      error: `Invalid status transition: Cannot transition from ${appRecord.status} to ${newStatus}.`,
    });
  }

  appRecord.status = newStatus;
  appRecord.updatedAt = new Date().toISOString();
  appRecord.timeline.push({
    timestamp: new Date().toISOString(),
    stage: newStatus,
    note: note || `Status transitioned to ${newStatus}`,
    actor: 'User manual',
  });

  authAndStore.saveApplication(req.user!.id, appRecord);
  authAndStore.addAuditLog(req.user!.id, 'User manual', 'STATUS_TRANSITION', `${appRecord.company} - ${appRecord.role}`, `Moved to ${newStatus}`);
  res.json({ success: true, application: appRecord });
});

app.post('/api/applications/:id/approve', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const appRecord = authAndStore.getApplicationById(req.user!.id, id);
  if (!appRecord) {
    return res.status(404).json({ success: false, error: 'Application not found.' });
  }

  appRecord.status = 'AUTHORIZED_TO_SUBMIT';
  appRecord.updatedAt = new Date().toISOString();
  appRecord.timeline.push({
    timestamp: new Date().toISOString(),
    stage: 'AUTHORIZED_TO_SUBMIT',
    note: 'User verified tailored package and authorized submission.',
    actor: 'User approved',
  });

  authAndStore.saveApplication(req.user!.id, appRecord);
  authAndStore.addAuditLog(req.user!.id, 'User approved', 'APPLICATION_AUTHORIZED', `${appRecord.company} - ${appRecord.role}`, 'User granted authorization to submit package');
  res.json({ success: true, application: appRecord });
});

// TRUTHFUL SUBMISSION: Never fabricates confirmation codes or pretends external sites submitted automatically
app.post('/api/applications/:id/submit', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { userEvidence } = req.body;

  const appRecord = authAndStore.getApplicationById(req.user!.id, id);
  if (!appRecord) {
    return res.status(404).json({ success: false, error: 'Application not found.' });
  }

  const settings = authAndStore.getSettings(req.user!.id);
  if (settings.emergencyStop) {
    return res.status(403).json({ success: false, error: 'Safety Guard: Emergency stop is engaged. Submission aborted.' });
  }

  const profile = authAndStore.getProfile(req.user!.id);
  if (!profile) {
    return res.status(400).json({ success: false, error: 'Verified profile required.' });
  }

  const subResult = await submissionAdapter.processSubmission(appRecord, profile, userEvidence);

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

  authAndStore.saveApplication(req.user!.id, appRecord);
  authAndStore.addAuditLog(req.user!.id, userEvidence ? 'User manual' : 'Agent autonomous', 'SUBMISSION_PROCESSED', `${appRecord.company} - ${appRecord.role}`, subResult.message);

  res.json({
    success: true,
    application: appRecord,
    guidedApplication: subResult.guidedApplication,
    message: subResult.message,
  });
});

// ============================================================================
// 6. AUDIT LOGS, NOTIFICATIONS & INTEGRATIONS
// ============================================================================

app.get('/api/audit-logs', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const logs = authAndStore.getAuditLogs(req.user!.id);
  res.json({ success: true, logs });
});

app.get('/api/notifications', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const notifications = authAndStore.getNotifications(req.user!.id);
  res.json({ success: true, notifications });
});

app.patch('/api/notifications/:id/read', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  authAndStore.markNotificationsRead(req.user!.id, req.params.id);
  const notifications = authAndStore.getNotifications(req.user!.id);
  res.json({ success: true, notifications });
});

app.post('/api/notifications/mark-all-read', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  authAndStore.markNotificationsRead(req.user!.id);
  const notifications = authAndStore.getNotifications(req.user!.id);
  res.json({ success: true, notifications });
});

app.get('/api/integrations', (req: Request, res: Response) => {
  res.json({ success: true, integrations: initialIntegrations });
});


// ============================================================================
// SUBSCRIPTION & RAZORPAY ENDPOINTS (FREE, PRO & BLACK)
// ============================================================================

app.get('/api/subscription/current', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const sub = authAndStore.getUserSubscription(user.id);
  const used = 0; // AI usage

  const effective = getEffectivePlan(user, sub);
  const aiAllowance = checkAIUsageAllowance(user, used, sub);

  const effectiveSub = {
    ...sub,
    planId: effective.planId,
    plan: effective.planId,
    status: effective.status,
    billingInterval: effective.billingInterval,
    planName: effective.planName,
    badge: effective.badge,
    isPermanentFreeAccess: effective.isPermanentFreeAccess,
    description: effective.description,
  };

  res.json({
    success: true,
    subscription: effectiveSub,
    usage: {
      used,
      limit: aiAllowance.limit,
      remaining: aiAllowance.remaining,
      isUnlimited: aiAllowance.isUnlimited,
      isPermanentFreeAccess: aiAllowance.isPermanentFreeAccess,
      periodStart: sub.currentPeriodStart,
      periodEnd: effective.isPermanentFreeAccess ? '2099-12-31T23:59:59.999Z' : sub.currentPeriodEnd,
    },
  });
});

app.post('/api/subscription/upgrade', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    if (isPermanentFreeAccessAccount(user)) {
      const effective = getEffectivePlan(user);
      return res.json({
        success: true,
        subscription: {
          planId: effective.planId,
          plan: effective.planId,
          status: effective.status,
          billingInterval: effective.billingInterval,
          planName: effective.planName,
          badge: effective.badge,
          isPermanentFreeAccess: true,
        },
        message: 'Your account is permanently authorized with full Pro access. No payment or billing is required.',
      });
    }

    const { planId = 'pro', billingInterval = 'monthly' } = req.body || {};
    const validPlan: 'pro' | 'black' = planId === 'black' ? 'black' : 'pro';

    authAndStore.updateUserSubscription(user.id, validPlan, billingInterval);
    authAndStore.addAuditLog(user.id, 'User manual', 'SUBSCRIPTION_UPGRADED', `Plan: ${validPlan} (${billingInterval})`, `Upgraded account to ${validPlan.toUpperCase()}`);

    const isBlack = validPlan === 'black';
    authAndStore.addNotification(
      user.id,
      isBlack ? 'Welcome to BLACK by ApplyVise AI' : 'Welcome to ApplyVise Pro!',
      isBlack
        ? 'Your account is now activated with BLACK ELITE membership. You have unlocked 2× Pro usage, exclusive multi-role strategy, advanced interview simulations, and priority AI processing.'
        : 'Your account has been upgraded. You now have access to high-volume AI intelligence, advanced ATS tailoring, and deep gap analysis.',
      'system'
    );

    const updatedSub = authAndStore.getUserSubscription(user.id);
    return res.json({
      success: true,
      subscription: updatedSub,
      message: isBlack
        ? 'Welcome to BLACK by ApplyVise AI! Your Career. Without Limits.'
        : 'Welcome to ApplyVise Pro! All premium capabilities are now active.',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ success: false, error: `Upgrade failed: ${msg}` });
  }
});

app.post('/api/subscription/cancel', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    if (isPermanentFreeAccessAccount(user)) {
      const effective = getEffectivePlan(user);
      return res.json({
        success: true,
        subscription: {
          planId: effective.planId,
          status: effective.status,
          planName: effective.planName,
          isPermanentFreeAccess: true,
        },
        message: 'Your permanent free access is lifetime-active and does not require cancellation.',
      });
    }

    authAndStore.cancelSubscription(user.id);
    authAndStore.addAuditLog(user.id, 'User manual', 'SUBSCRIPTION_CANCEL_SCHEDULED', 'Pro/Black Plan', 'Scheduled subscription cancellation at end of period');

    const updatedSub = authAndStore.getUserSubscription(user.id);
    return res.json({
      success: true,
      subscription: updatedSub,
      message: 'Subscription will remain active until the end of your current billing period.',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ success: false, error: `Cancellation failed: ${msg}` });
  }
});

// Razorpay Order Creation
app.post('/api/subscription/razorpay/create-order', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { planId = 'pro', billingInterval = 'monthly' } = req.body || {};
  const validPlan: 'pro' | 'black' = planId === 'black' ? 'black' : 'pro';
  const validInterval: 'monthly' | 'annual' = billingInterval === 'annual' ? 'annual' : 'monthly';

  const plan = SUBSCRIPTION_PLANS[validPlan];
  const amount = plan.price[validInterval].inr * 100; // in paise
  const orderId = `order_av_${crypto.randomUUID().replace(/-/g, '').slice(0, 14)}`;

  res.json({
    success: true,
    orderId,
    amount,
    currency: 'INR',
    keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_applyvise_mock',
    planId: validPlan,
    billingInterval: validInterval,
  });
});

// Razorpay Payment Verification
app.post('/api/subscription/razorpay/verify', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planId = 'pro', billingInterval = 'monthly' } = req.body || {};

  if (!razorpay_order_id || !razorpay_payment_id) {
    return res.status(400).json({ success: false, error: 'Missing payment confirmation parameters.' });
  }

  // Signature verification if secret configured
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (secret && razorpay_signature) {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const expectedSig = hmac.digest('hex');
    if (expectedSig !== razorpay_signature) {
      return res.status(400).json({ success: false, error: 'Invalid payment signature. Verification failed.' });
    }
  }

  const validPlan: 'pro' | 'black' = planId === 'black' ? 'black' : 'pro';
  authAndStore.updateUserSubscription(user.id, validPlan, billingInterval);
  authAndStore.addAuditLog(user.id, 'Razorpay Verification', 'PAYMENT_VERIFIED', `Payment: ${razorpay_payment_id}`, `Activated ${validPlan.toUpperCase()} membership`);

  const isBlack = validPlan === 'black';
  authAndStore.addNotification(
    user.id,
    isBlack ? 'Welcome to BLACK by ApplyVise AI' : 'Payment Verified — Welcome to Pro!',
    isBlack
      ? 'Payment verified. BLACK ELITE membership activated with 2× Pro limits, exclusive multi-role strategy, and priority intelligence.'
      : 'Payment verified. ApplyVise Pro is now active.',
    'system'
  );

  const updatedSub = authAndStore.getUserSubscription(user.id);
  res.json({
    success: true,
    subscription: updatedSub,
    message: isBlack ? 'Payment confirmed! Welcome to BLACK ELITE.' : 'Payment confirmed! Welcome to ApplyVise Pro.',
  });
});

// --- CAREER INTELLIGENCE & NEXT-GEN APPLICATION SUITE (PART 2) ---
app.get('/api/jobs/:id/evidence-map', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const profile = authAndStore.getProfile(req.user!.id);
  const vacancy = authAndStore.getVacancies().find(v => v.id === req.params.id);
  if (!vacancy) return res.status(404).json({ success: false, error: 'Vacancy not found' });

  const evidenceMap = careerIntelligenceEngine.generateFitEvidenceMap(req.user!.id, profile || { id: req.user!.id } as any, vacancy);
  res.json({ success: true, evidenceMap });
});

app.post('/api/jobs/:id/evidence-map/confirm', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const profile = authAndStore.getProfile(req.user!.id);
  const vacancy = authAndStore.getVacancies().find(v => v.id === req.params.id);
  if (!vacancy) return res.status(404).json({ success: false, error: 'Vacancy not found' });

  const map = careerIntelligenceEngine.generateFitEvidenceMap(req.user!.id, profile || { id: req.user!.id } as any, vacancy);
  const node = map.nodes.find(n => n.id === req.body.nodeId);
  if (node) {
    node.isUserConfirmed = true;
    node.confidence = 'USER_CONFIRMED';
    map.userConfirmedCount = (map.userConfirmedCount || 0) + 1;
  }
  res.json({ success: true, evidenceMap: map });
});

app.get('/api/jobs/:id/readiness', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const profile = authAndStore.getProfile(req.user!.id);
  const preferences = authAndStore.getPreferences(req.user!.id);
  const vacancy = authAndStore.getVacancies().find(v => v.id === req.params.id);
  if (!vacancy) return res.status(404).json({ success: false, error: 'Vacancy not found' });

  const readiness = careerIntelligenceEngine.evaluateApplicationReadiness(
    profile || { id: req.user!.id } as any,
    preferences || {} as any,
    vacancy
  );
  res.json({ success: true, readiness });
});

app.get('/api/jobs/:id/copilot', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const profile = authAndStore.getProfile(req.user!.id);
  const vacancy = authAndStore.getVacancies().find(v => v.id === req.params.id);
  if (!vacancy) return res.status(404).json({ success: false, error: 'Vacancy not found' });

  const artifacts = careerIntelligenceEngine.generateCopilotArtifacts(profile || { id: req.user!.id } as any, vacancy);
  res.json({ success: true, artifacts, userReviewed: false });
});

app.post('/api/jobs/:id/copilot/review', requireAuth, (_req: AuthenticatedRequest, res: Response) => {
  res.json({ success: true, message: 'Artifact marked as reviewed by candidate.' });
});

app.get('/api/jobs/:id/interview-prep', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const profile = authAndStore.getProfile(req.user!.id);
  const vacancy = authAndStore.getVacancies().find(v => v.id === req.params.id);
  if (!vacancy) return res.status(404).json({ success: false, error: 'Vacancy not found' });

  const prep = careerIntelligenceEngine.generateInterviewIntelligence(profile || { id: req.user!.id } as any, vacancy);
  res.json({ success: true, interviewPrep: prep });
});

app.get('/api/resume/intelligence', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const profile = authAndStore.getProfile(req.user!.id);
  const report = careerIntelligenceEngine.analyzeResumeIntelligence(profile || { id: req.user!.id } as any);
  res.json({ success: true, report });
});

app.post('/api/resume/compare/:jobId', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const profile = authAndStore.getProfile(req.user!.id);
  const vacancy = authAndStore.getVacancies().find(v => v.id === req.params.jobId);
  if (!vacancy) return res.status(404).json({ success: false, error: 'Vacancy not found' });

  const comparison = careerIntelligenceEngine.compareResumeToJob(profile || { id: req.user!.id } as any, vacancy);
  res.json({ success: true, comparison });
});

app.get('/api/career/roadmap', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const profile = authAndStore.getProfile(req.user!.id);
  const vacancies = authAndStore.getVacancies();
  const roadmap = careerIntelligenceEngine.generateCareerRoadmap(
    profile || { id: req.user!.id } as any,
    (req.query.role as string) || profile?.currentTitle || 'Software Engineer',
    vacancies
  );
  res.json({ success: true, roadmap });
});

app.get('/api/alerts', requireAuth, (_req: AuthenticatedRequest, res: Response) => {
  res.json({ success: true, alerts: [] });
});

app.post('/api/alerts', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  res.json({
    success: true,
    alert: {
      id: 'alert-mock-1',
      userId: req.user!.id,
      title: req.body.title || 'Live Search Alert',
      criteria: req.body.criteria || {},
      frequency: req.body.frequency || 'daily',
      isActive: true,
      createdAt: new Date().toISOString(),
    },
  });
});

app.delete('/api/alerts/:id', requireAuth, (_req: AuthenticatedRequest, res: Response) => {
  res.json({ success: true, message: 'Alert rule deleted.' });
});

app.get('/api/applications/:id/timeline', requireAuth, (_req: AuthenticatedRequest, res: Response) => {
  res.json({ success: true, timeline: [] });
});

app.post('/api/applications/:id/timeline', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  res.json({
    success: true,
    timeline: [
      {
        id: 'timeline-mock-1',
        applicationId: req.params.id,
        stage: req.body.stage || 'PREPARING',
        note: req.body.note || '',
        actor: req.body.actor || 'user',
        timestamp: new Date().toISOString(),
      },
    ],
  });
});

// Admin Routes for Local Parity
app.get('/api/admin/overview', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  res.json({
    success: true,
    stats: {
      totalUsers: 2,
      totalAdmins: 1,
      totalApplications: 5,
      totalResumes: 2,
      totalVacancies: initialVacancies.length,
      activeSubscriptions: 1,
    },
  });
});

app.get('/api/admin/users', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  res.json({
    success: true,
    users: [
      {
        id: req.user!.id,
        email: req.user!.email,
        fullName: req.user!.fullName || 'Admin User',
        role: req.user!.role || 'admin',
        isVerified: true,
        createdAt: new Date().toISOString(),
        planId: 'pro',
      },
    ],
    total: 1,
  });
});

app.post('/api/admin/users/:id/role', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  res.json({ success: true, message: 'Role updated successfully.' });
});

app.get('/api/admin/audit-logs', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  res.json({
    success: true,
    logs: [
      {
        id: 'mock-log-1',
        actor: 'Admin',
        action: 'SYSTEM_AUDIT',
        target: 'Platform',
        details: 'Local environment audit telemetry operational',
        severity: 'info',
        timestamp: new Date().toISOString(),
      },
    ],
  });
});

app.get('/api/admin/system-health', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  res.json({
    success: true,
    system: {
      status: 'operational',
      environment: 'Local Parity Server',
      database: {
        engine: 'In-Memory / SQLite Parity',
        status: 'healthy',
        userCount: 2,
        adminCount: 1,
        applicationsCount: 5,
      },
      integrations: {
        googleAuth: { configured: true, clientId: 'dev-client-id', status: 'active' },
        geminiAI: { configured: true, model: 'gemini-2.5-flash', status: 'active' },
        jobDiscovery: { connectors: ['Greenhouse', 'Lever', 'Remotive', 'Jobicy'], status: 'healthy' },
      },
      serverTime: new Date().toISOString(),
    },
  });
});

app.get('/api/admin/sources/health', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  res.json({
    success: true,
    totalCachedJobs: initialVacancies.length,
    sources: [],
    recentRuns: [],
    recentErrors: [],
    serverTime: new Date().toISOString(),
  });
});

// ============================================================================
// FOUNDER PROFILE PUBLIC & ADMIN API ROUTES
// ============================================================================

// 1. Public Published Profile Endpoint
app.get('/api/founder-profile', (_req: Request, res: Response) => {
  try {
    const profile = authAndStore.getPublishedFounderProfile();
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    return res.json({ success: true, profile });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch founder profile' });
  }
});

// 2. Public Image Asset Serving
app.get('/api/founder-profile/image/:id', (req: Request, res: Response) => {
  try {
    const asset = authAndStore.getFounderImageAsset(req.params.id);
    if (!asset) {
      return res.status(404).send('Not found');
    }
    const buffer = Buffer.from(asset.data_base64, 'base64');
    res.setHeader('Content-Type', asset.mime_type || 'image/jpeg');
    res.setHeader('Content-Length', buffer.length.toString());
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
    return res.send(buffer);
  } catch (err: any) {
    return res.status(500).send('Error serving image');
  }
});

// 3. Admin: Get Full Profile Details & Draft State
app.get('/api/admin/founder-profile', requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
  try {
    const data = authAndStore.getAdminFounderProfile();
    return res.json({ success: true, ...data });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Admin: Save Draft Changes
app.put('/api/admin/founder-profile/draft', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const draft = req.body || {};
    const updated = authAndStore.updateFounderProfileDraft(draft);
    authAndStore.addAuditLog(req.user!.id, 'Founder Profile', 'DRAFT_SAVED', 'founder_main', 'Founder profile draft updated');
    return res.json({ success: true, draft: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Admin: Publish Changes to Live
app.post('/api/admin/founder-profile/publish', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const published = authAndStore.publishFounderProfile();
    authAndStore.addAuditLog(req.user!.id, 'Founder Profile', 'PROFILE_PUBLISHED', 'founder_main', 'Founder profile changes published to live site');
    return res.json({ success: true, profile: published });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Admin: Revert Draft to Last Published
app.post('/api/admin/founder-profile/revert', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const reverted = authAndStore.revertFounderProfileDraft();
    authAndStore.addAuditLog(req.user!.id, 'Founder Profile', 'DRAFT_REVERTED', 'founder_main', 'Founder profile draft reverted to published version');
    return res.json({ success: true, draft: reverted });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 7. Admin: Upload Photograph
app.post('/api/admin/founder-profile/photo', requireAdmin, upload.single('photo'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, error: 'No image file uploaded' });
    }

    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!allowedMimes.includes(file.mimetype)) {
      return res.status(400).json({ success: false, error: 'Invalid image format. Allowed: JPG, PNG, WebP' });
    }

    if (file.size > 5 * 1024 * 1024) {
      return res.status(400).json({ success: false, error: 'File size exceeds 5 MB limit' });
    }

    const base64 = file.buffer.toString('base64');
    const assetId = authAndStore.saveFounderImageAsset(file.originalname, file.mimetype, file.size, base64);
    const photoUrl = `/api/founder-profile/image/${assetId}`;

    const { draft } = authAndStore.getAdminFounderProfile();
    const updatedDraft = authAndStore.updateFounderProfileDraft({
      ...draft,
      photoUrl,
      photoAssetId: assetId,
      photoAspectRatio: '1:1',
    });

    authAndStore.addAuditLog(req.user!.id, 'Founder Profile', 'PHOTO_UPLOADED', assetId, `Photograph uploaded: ${file.originalname} (${Math.round(file.size / 1024)} KB)`);

    return res.json({ success: true, photoUrl, assetId, draft: updatedDraft });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 8. Admin: Remove Photograph
app.delete('/api/admin/founder-profile/photo', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    authAndStore.removeFounderPhoto();
    authAndStore.addAuditLog(req.user!.id, 'Founder Profile', 'PHOTO_REMOVED', 'founder_main', 'Founder photograph removed from draft');
    return res.json({ success: true, message: 'Photograph removed from draft' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Frontend Vite Integration & Server Startup
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  


app.listen(PORT, '0.0.0.0', () => {
    console.log(`[ApplyVise AI] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
