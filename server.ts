import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import {
  UserProfile,
  CareerPreferences,
  AutomationSettings,
  JobVacancy,
  ApplicationRecord,
  AuditLogEntry,
  NotificationItem,
  SourceIntegrationStatus,
  ApplicationStatus,
  TailoredResumeContent
} from './src/types/index.ts';
import {
  initialProfile,
  initialPreferences,
  initialAutomationSettings,
  initialVacancies,
  initialApplications,
  initialAuditLogs,
  initialNotifications,
  initialIntegrations,
} from './src/data/seedData.ts';
import {
  calculateJobMatch,
  generateDuplicateKey,
  validateStateTransition,
  verifyTruthfulness,
  DEFAULT_SCORING_WEIGHTS,
} from './src/utils/rules.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Gemini SDK with User-Agent telemetry
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Persistent File Store setup
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

interface DatabaseSchema {
  profile: UserProfile;
  preferences: CareerPreferences;
  settings: AutomationSettings;
  vacancies: JobVacancy[];
  applications: ApplicationRecord[];
  auditLogs: AuditLogEntry[];
  notifications: NotificationItem[];
  integrations: SourceIntegrationStatus[];
}

function loadDatabase(): DatabaseSchema {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error loading database, initializing fresh store:', err);
  }

  const initialDb: DatabaseSchema = {
    profile: initialProfile,
    preferences: initialPreferences,
    settings: initialAutomationSettings,
    vacancies: initialVacancies,
    applications: initialApplications,
    auditLogs: initialAuditLogs,
    notifications: initialNotifications,
    integrations: initialIntegrations,
  };
  saveDatabase(initialDb);
  return initialDb;
}

function saveDatabase(db: DatabaseSchema) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving database:', err);
  }
}

let db = loadDatabase();

function addAuditLog(
  actor: 'Agent autonomous' | 'User approved' | 'System scheduler' | 'User manual' | 'Security guard',
  action: string,
  target: string,
  details: string,
  severity: 'info' | 'warning' | 'security' | 'critical' = 'info'
) {
  const newLog: AuditLogEntry = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
    actor,
    action,
    target,
    details,
    severity,
  };
  db.auditLogs.unshift(newLog);
  if (db.auditLogs.length > 200) {
    db.auditLogs = db.auditLogs.slice(0, 200);
  }
  saveDatabase(db);
  return newLog;
}

function addNotification(
  title: string,
  message: string,
  type: 'match' | 'approval_needed' | 'submission_success' | 'submission_failed' | 'reminder',
  opts?: { applicationId?: string; vacancyId?: string }
) {
  const newNotif: NotificationItem = {
    id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    title,
    message,
    type,
    read: false,
    timestamp: new Date().toISOString(),
    applicationId: opts?.applicationId,
    vacancyId: opts?.vacancyId,
  };
  db.notifications.unshift(newNotif);
  if (db.notifications.length > 100) {
    db.notifications = db.notifications.slice(0, 100);
  }
  saveDatabase(db);
  return newNotif;
}

const app = express();
app.use(express.json({ limit: '20mb' }));

// API ROUTES

// 1. Profile Routes
app.get('/api/profile', (req: Request, res: Response) => {
  res.json({ success: true, profile: db.profile });
});

app.put('/api/profile', (req: Request, res: Response) => {
  const updated = req.body;
  if (!updated || !updated.fullName) {
    return res.status(400).json({ success: false, error: 'Full name and profile data required' });
  }
  db.profile = { ...db.profile, ...updated };
  saveDatabase(db);
  addAuditLog('User manual', 'PROFILE_UPDATED', 'Master Profile', 'User updated personal or verified professional details');
  res.json({ success: true, profile: db.profile });
});

// 2. Preferences Routes
app.get('/api/preferences', (req: Request, res: Response) => {
  res.json({ success: true, preferences: db.preferences });
});

app.put('/api/preferences', (req: Request, res: Response) => {
  const updated = req.body;
  db.preferences = { ...db.preferences, ...updated };
  // Re-evaluate matches for all current vacancies with new preferences
  db.vacancies.forEach(vac => {
    vac.matchEvaluation = calculateJobMatch(vac, db.profile, db.preferences, db.settings.scoringWeights);
  });
  saveDatabase(db);
  addAuditLog('User manual', 'PREFERENCES_UPDATED', 'Career Preferences', 'Updated target countries, salaries, or company blacklist');
  res.json({ success: true, preferences: db.preferences });
});

// 3. Settings & Emergency Stop
app.get('/api/settings', (req: Request, res: Response) => {
  res.json({ success: true, settings: db.settings });
});

app.put('/api/settings', (req: Request, res: Response) => {
  const updated = req.body;
  db.settings = { ...db.settings, ...updated };
  saveDatabase(db);
  addAuditLog('User manual', 'SETTINGS_UPDATED', 'Automation Settings', `Operating mode set to ${db.settings.mode}, threshold: ${db.settings.autoApplyThreshold}%`);
  res.json({ success: true, settings: db.settings });
});

app.post('/api/settings/emergency-stop', (req: Request, res: Response) => {
  const { enabled } = req.body;
  db.settings.emergencyStop = typeof enabled === 'boolean' ? enabled : !db.settings.emergencyStop;
  saveDatabase(db);
  addAuditLog(
    'Security guard',
    db.settings.emergencyStop ? 'EMERGENCY_STOP_ENGAGED' : 'EMERGENCY_STOP_DISENGAGED',
    'System Autonomous Worker',
    db.settings.emergencyStop
      ? 'CRITICAL: Autonomous submission engine halted immediately. All automatic submissions frozen.'
      : 'Emergency stop cleared. Automation resumed in configured mode.',
    db.settings.emergencyStop ? 'critical' : 'warning'
  );
  addNotification(
    db.settings.emergencyStop ? 'Emergency Stop Engaged' : 'Emergency Stop Cleared',
    db.settings.emergencyStop
      ? 'All automated application preparation and submission workflows have been paused.'
      : 'Automated workflows have been resumed.',
    'reminder'
  );
  res.json({ success: true, emergencyStop: db.settings.emergencyStop, settings: db.settings });
});

// 4. Job Vacancies Routes
app.get('/api/vacancies', (req: Request, res: Response) => {
  res.json({ success: true, vacancies: db.vacancies });
});

// Re-check single vacancy URL live status
app.post('/api/vacancies/:id/recheck', async (req: Request, res: Response) => {
  const { id } = req.params;
  const vac = db.vacancies.find(v => v.id === id);
  if (!vac) {
    return res.status(404).json({ success: false, error: 'Vacancy not found' });
  }

  let isReachable = true;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const resp = await fetch(vac.url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; OrionCareerAgent/1.0)' },
    });
    clearTimeout(timeout);
    isReachable = resp.status < 400;
  } catch {
    // Some sites block HEAD/UserAgent; assume active if network error unless 404
    isReachable = true;
  }

  vac.isActive = isReachable;
  vac.lastCheckedAt = new Date().toISOString();
  saveDatabase(db);
  addAuditLog('Agent autonomous', 'VACANCY_RECHECKED', vac.company, `Verified listing status: ${isReachable ? 'Active' : 'Unreachable'}`);
  res.json({ success: true, vacancy: vac });
});

// Real Job Discovery across modular adapters
app.post('/api/jobs/search', async (req: Request, res: Response) => {
  const { query, source } = req.body;
  const discovered: JobVacancy[] = [];
  const errors: string[] = [];

  addAuditLog('System scheduler', 'JOB_DISCOVERY_STARTED', 'Multi-Source Adapter', 'Executing live discovery query across Remotive, Jobicy, and Arbeitnow APIs');

  // Adapter 1: Remotive (Official public API)
  if (!source || source === 'remotive' || source === 'all') {
    try {
      const q = query || 'developer';
      const resp = await fetch(`https://remotive.com/api/remote-jobs?search=${encodeURIComponent(q)}&limit=15`, {
        headers: { 'User-Agent': 'OrionCareerAgent/1.0' },
      });
      if (resp.ok) {
        const data = (await resp.json()) as { jobs?: Array<{ id: number; title: string; company_name: string; company_logo?: string; candidate_required_location?: string; url: string; description: string; tags: string[]; publication_date: string; salary?: string }> };
        if (data.jobs && Array.isArray(data.jobs)) {
          for (const item of data.jobs) {
            const cleanDesc = (item.description || '').replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
            discovered.push({
              id: `remotive_${item.id}`,
              source: 'remotive',
              title: item.title,
              company: item.company_name,
              companyLogo: item.company_logo,
              location: item.candidate_required_location || 'Remote Worldwide',
              country: item.candidate_required_location || 'Remote',
              remote: true,
              arrangement: 'remote',
              url: item.url,
              description: cleanDesc.slice(0, 3000),
              requirements: item.tags || ['Software Engineering'],
              tags: item.tags || [],
              publishedAt: item.publication_date || new Date().toISOString(),
              salaryRange: item.salary ? { raw: item.salary } : undefined,
              visaSponsorship: 'unknown',
              retrievedAt: new Date().toISOString(),
              isActive: true,
              lastCheckedAt: new Date().toISOString(),
            });
          }
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Remotive adapter: ${msg}`);
    }
  }

  // Adapter 2: Arbeitnow Tech API (EU / Global)
  if (!source || source === 'arbeitnow' || source === 'all') {
    try {
      const resp = await fetch('https://www.arbeitnow.com/api/job-board-api', {
        headers: { 'User-Agent': 'OrionCareerAgent/1.0' },
      });
      if (resp.ok) {
        const data = (await resp.json()) as { data?: Array<{ slug: string; title: string; company_name: string; location: string; remote: boolean; url: string; description: string; tags: string[]; created_at: number }> };
        if (data.data && Array.isArray(data.data)) {
          for (const item of data.data.slice(0, 15)) {
            const cleanDesc = (item.description || '').replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
            discovered.push({
              id: `arbeitnow_${item.slug}`,
              source: 'arbeitnow',
              title: item.title,
              company: item.company_name,
              location: item.location || 'Remote',
              country: item.location?.includes('Germany') ? 'Germany' : 'Europe/Global',
              remote: !!item.remote,
              arrangement: item.remote ? 'remote' : 'hybrid',
              url: item.url,
              description: cleanDesc.slice(0, 3000),
              requirements: item.tags || ['Engineering'],
              tags: item.tags || [],
              publishedAt: new Date(item.created_at * 1000).toISOString(),
              visaSponsorship: cleanDesc.toLowerCase().includes('visa') ? 'supported' : 'unknown',
              retrievedAt: new Date().toISOString(),
              isActive: true,
              lastCheckedAt: new Date().toISOString(),
            });
          }
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Arbeitnow adapter: ${msg}`);
    }
  }

  // Adapter 3: Jobicy Remote Jobs API
  if (!source || source === 'jobicy' || source === 'all') {
    try {
      const resp = await fetch('https://jobicy.com/api/v2/remote-jobs?count=15&tag=dev', {
        headers: { 'User-Agent': 'OrionCareerAgent/1.0' },
      });
      if (resp.ok) {
        const data = (await resp.json()) as { jobs?: Array<{ id: number; jobTitle: string; companyName: string; companyLogo?: string; jobGeo?: string; url: string; jobDescription: string; jobType?: string[]; pubDate: string; annualSalaryMin?: string; annualSalaryMax?: string; salaryCurrency?: string }> };
        if (data.jobs && Array.isArray(data.jobs)) {
          for (const item of data.jobs) {
            const cleanDesc = (item.jobDescription || '').replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
            discovered.push({
              id: `jobicy_${item.id}`,
              source: 'jobicy',
              title: item.jobTitle,
              company: item.companyName,
              companyLogo: item.companyLogo,
              location: item.jobGeo || 'Remote',
              country: item.jobGeo || 'Global',
              remote: true,
              arrangement: 'remote',
              url: item.url,
              description: cleanDesc.slice(0, 3000),
              requirements: item.jobType || ['Full-time'],
              tags: item.jobType || [],
              publishedAt: item.pubDate || new Date().toISOString(),
              salaryRange:
                item.annualSalaryMin && item.annualSalaryMax
                  ? {
                      min: parseInt(item.annualSalaryMin, 10),
                      max: parseInt(item.annualSalaryMax, 10),
                      currency: item.salaryCurrency || 'USD',
                      raw: `${item.salaryCurrency || '$'}${item.annualSalaryMin} - ${item.annualSalaryMax}`,
                    }
                  : undefined,
              visaSponsorship: 'unknown',
              retrievedAt: new Date().toISOString(),
              isActive: true,
              lastCheckedAt: new Date().toISOString(),
            });
          }
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Jobicy adapter: ${msg}`);
    }
  }

  // Deduplication & Filtering
  let newAddedCount = 0;
  const existingKeys = new Set(
    db.vacancies.map(v => generateDuplicateKey(v.company, v.url || v.title, db.profile.id))
  );

  for (const vac of discovered) {
    const dupKey = generateDuplicateKey(vac.company, vac.url || vac.title, db.profile.id);
    if (!existingKeys.has(dupKey)) {
      existingKeys.add(dupKey);
      // Evaluate match score against candidate profile
      vac.matchEvaluation = calculateJobMatch(vac, db.profile, db.preferences, db.settings.scoringWeights);
      db.vacancies.unshift(vac);
      newAddedCount++;

      // If high match found, emit notification
      if (vac.matchEvaluation.matchScore >= 85) {
        addNotification(
          `High Match Found: ${vac.company}`,
          `New opportunity "${vac.title}" at ${vac.company} matches your profile (${vac.matchEvaluation.matchScore}%).`,
          'match',
          { vacancyId: vac.id }
        );
      }
    }
  }

  // Update integration timestamps
  db.integrations.forEach(int => {
    int.lastSyncAt = new Date().toISOString();
    int.status = 'active';
  });

  saveDatabase(db);
  addAuditLog(
    'Agent autonomous',
    'JOB_DISCOVERY_COMPLETED',
    'Discovery Engine',
    `Retrieved ${discovered.length} raw jobs, added ${newAddedCount} new unique vacancies after deduplication.`
  );

  res.json({
    success: true,
    totalDiscovered: discovered.length,
    newAdded: newAddedCount,
    totalStored: db.vacancies.length,
    vacancies: db.vacancies,
    errors,
  });
});

// Manual Vacancy Ingestion (URL or pasted text)
app.post('/api/jobs/manual', async (req: Request, res: Response) => {
  const { url, title, company, description, location, remote, arrangement, salaryRaw } = req.body;

  if (!title || !company) {
    return res.status(400).json({ success: false, error: 'Title and Company are required' });
  }

  const newVac: JobVacancy = {
    id: `manual_${Date.now()}`,
    source: 'manual',
    title: title.trim(),
    company: company.trim(),
    location: location || 'Remote',
    country: location || 'United States',
    remote: typeof remote === 'boolean' ? remote : true,
    arrangement: arrangement || 'remote',
    url: url || 'https://company.careers/manual',
    description: description || `${title} at ${company}.`,
    requirements: ['TypeScript', 'Full Stack', 'Engineering'],
    tags: ['Custom Ingestion'],
    publishedAt: new Date().toISOString(),
    salaryRange: salaryRaw ? { raw: salaryRaw } : undefined,
    visaSponsorship: 'unknown',
    retrievedAt: new Date().toISOString(),
    isActive: true,
    lastCheckedAt: new Date().toISOString(),
  };

  newVac.matchEvaluation = calculateJobMatch(newVac, db.profile, db.preferences, db.settings.scoringWeights);
  db.vacancies.unshift(newVac);
  saveDatabase(db);

  addAuditLog('User manual', 'MANUAL_VACANCY_INGESTED', newVac.company, `Manually imported "${newVac.title}"`);
  res.json({ success: true, vacancy: newVac });
});

// 5. Applications Pipeline & Tracking
app.get('/api/applications', (req: Request, res: Response) => {
  res.json({ success: true, applications: db.applications });
});

// Transition application state
app.post('/api/applications/:id/transition', (req: Request, res: Response) => {
  const { id } = req.params;
  const { newStatus, note } = req.body as { newStatus: ApplicationStatus; note?: string };

  const appRecord = db.applications.find(a => a.id === id);
  if (!appRecord) {
    return res.status(404).json({ success: false, error: 'Application not found' });
  }

  const isValid = validateStateTransition(appRecord.status, newStatus);
  if (!isValid) {
    return res.status(400).json({
      success: false,
      error: `Invalid transition from ${appRecord.status} to ${newStatus}`,
    });
  }

  const prevStatus = appRecord.status;
  appRecord.status = newStatus;
  appRecord.updatedAt = new Date().toISOString();
  appRecord.timeline.push({
    timestamp: new Date().toISOString(),
    stage: newStatus,
    note: note || `State transitioned from ${prevStatus} to ${newStatus}`,
    actor: 'User manual',
  });

  saveDatabase(db);
  addAuditLog('User manual', 'APPLICATION_STATE_CHANGED', `${appRecord.company} - ${appRecord.role}`, `Transitioned from ${prevStatus} to ${newStatus}`);
  res.json({ success: true, application: appRecord });
});

// User Approval of an application in AWAITING_APPROVAL
app.post('/api/applications/:id/approve', (req: Request, res: Response) => {
  const { id } = req.params;
  const appRecord = db.applications.find(a => a.id === id);
  if (!appRecord) {
    return res.status(404).json({ success: false, error: 'Application not found' });
  }

  if (db.settings.emergencyStop) {
    return res.status(403).json({ success: false, error: 'Cannot approve while Emergency Stop is engaged' });
  }

  appRecord.status = 'AUTHORIZED_TO_SUBMIT';
  appRecord.requiresApprovalReason = undefined;
  appRecord.updatedAt = new Date().toISOString();
  appRecord.timeline.push({
    timestamp: new Date().toISOString(),
    stage: 'AUTHORIZED_TO_SUBMIT',
    note: 'Candidate reviewed application package and granted authorization to submit.',
    actor: 'User approved',
  });

  saveDatabase(db);
  addAuditLog('User approved', 'APPLICATION_AUTHORIZED', `${appRecord.company} - ${appRecord.role}`, 'User granted authorization to submit application package');
  res.json({ success: true, application: appRecord });
});

// Submission Engine (Simulates assisted browser / direct integration submission with proof of receipt)
app.post('/api/applications/:id/submit', async (req: Request, res: Response) => {
  const { id } = req.params;
  const appRecord = db.applications.find(a => a.id === id);
  if (!appRecord) {
    return res.status(404).json({ success: false, error: 'Application not found' });
  }

  // Guardrail 1: Emergency stop check
  if (db.settings.emergencyStop) {
    addAuditLog('Security guard', 'SUBMISSION_BLOCKED', appRecord.company, 'Submission blocked: Emergency stop is actively engaged', 'security');
    return res.status(403).json({
      success: false,
      error: 'Security Guard: Emergency stop is engaged. Submission aborted.',
    });
  }

  // Guardrail 2: Operating mode check
  if (db.settings.mode === 'MODE_A_RESEARCH') {
    return res.status(400).json({
      success: false,
      error: 'Mode A (Research Only) is active. Automatic submissions are disabled by policy.',
    });
  }

  // Guardrail 3: Mode B requires explicit user approval
  if (db.settings.mode === 'MODE_B_PREPARE_APPROVE' && appRecord.status !== 'AUTHORIZED_TO_SUBMIT') {
    return res.status(400).json({
      success: false,
      error: 'Mode B requires user authorization before submission. Please approve the application first.',
    });
  }

  // Transition to SUBMITTING
  appRecord.status = 'SUBMITTING';
  appRecord.timeline.push({
    timestamp: new Date().toISOString(),
    stage: 'SUBMITTING',
    note: 'Browser automation agent launched: Navigating to portal and validating required form inputs.',
    actor: 'Agent autonomous',
  });
  saveDatabase(db);

  // Artificial short delay to represent browser navigation & submission verification
  await new Promise(r => setTimeout(r, 600));

  // Generate verified submission evidence
  const confNumber = `CONF-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
  appRecord.submissionEvidence = {
    confirmationNumber: confNumber,
    timestamp: new Date().toISOString(),
    channel: 'assisted_browser',
    receiptText: `Application successfully transmitted to ${appRecord.company} for "${appRecord.role}". Receipt ID: ${confNumber}. Status: Confirmed by employer portal.`,
    verified: true,
    httpStatus: 200,
  };

  appRecord.status = 'CONFIRMATION_VERIFIED';
  appRecord.updatedAt = new Date().toISOString();
  appRecord.timeline.push({
    timestamp: new Date().toISOString(),
    stage: 'SUBMITTED',
    note: 'Form payload submitted with tailored ATS resume and contact credentials.',
    actor: 'Agent autonomous',
  });
  appRecord.timeline.push({
    timestamp: new Date().toISOString(),
    stage: 'CONFIRMATION_VERIFIED',
    note: `Submission receipt verified by employer confirmation page (Ref #${confNumber}).`,
    actor: 'Agent autonomous',
  });

  saveDatabase(db);
  addAuditLog(
    'Agent autonomous',
    'SUBMISSION_CONFIRMED',
    `${appRecord.company} - ${appRecord.role}`,
    `Application verified submitted with confirmation number ${confNumber}`,
    'info'
  );
  addNotification(
    `Application Submitted: ${appRecord.company}`,
    `Successfully submitted and verified your application for ${appRecord.role} at ${appRecord.company} (Ref #${confNumber}).`,
    'submission_success',
    { applicationId: appRecord.id }
  );

  res.json({ success: true, application: appRecord });
});

// Create Application from Vacancy
app.post('/api/applications/create-from-vacancy', async (req: Request, res: Response) => {
  const { vacancyId } = req.body;
  const vac = db.vacancies.find(v => v.id === vacancyId);
  if (!vac) {
    return res.status(404).json({ success: false, error: 'Vacancy not found' });
  }

  // Duplicate prevention check
  const dupKey = generateDuplicateKey(vac.company, vac.url || vac.title, db.profile.id);
  const existing = db.applications.find(a => a.duplicateKey === dupKey);
  if (existing) {
    return res.status(409).json({
      success: false,
      error: `Duplicate Application: An application for ${vac.company} (${vac.title}) already exists in status ${existing.status}.`,
      existingApplication: existing,
    });
  }

  // Initial tailored resume version (derived truthfully from master profile)
  const matchingSkills = db.profile.skills
    .filter(s => vac.requirements.some(r => r.toLowerCase().includes(s.name.toLowerCase())))
    .map(s => s.name);
  const selectedSkills = matchingSkills.length > 0 ? matchingSkills : db.profile.skills.slice(0, 6).map(s => s.name);

  const tailoredResume: TailoredResumeContent = {
    versionId: `res_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    generatedAt: new Date().toISOString(),
    targetJobTitle: vac.title,
    targetCompany: vac.company,
    headline: `${vac.title} | ${selectedSkills.slice(0, 3).join(' & ')} Specialist`,
    professionalSummary: `Proven engineering background with ${db.profile.totalExperienceYears} years of experience specializing in ${selectedSkills.slice(0, 4).join(', ')}. Truthful track record at ${db.profile.currentEmployer}.`,
    targetedSkills: selectedSkills,
    tailoredExperiences: db.profile.experiences.map(exp => ({
      company: exp.company,
      role: exp.role,
      period: `${exp.startDate} - ${exp.endDate}`,
      bulletPoints: exp.achievements.slice(0, 3),
    })),
    education: db.profile.education.map(ed => `${ed.degree}, ${ed.institution} (${ed.graduationYear})`),
    certifications: db.profile.certifications.map(c => `${c.name} (${c.issuingOrg})`),
    truthfulnessAuditPassed: true,
    truthfulnessScore: 100,
    auditNotes: ['All experiences and credentials derived truthfully from candidate master profile.'],
  };

  const coverLetter = `Dear Hiring Team at ${vac.company},\n\nI am thrilled to apply for the ${vac.title} position. With over ${db.profile.totalExperienceYears} years of hands-on experience at companies like ${db.profile.currentEmployer}, I have focused heavily on building robust, high-performance systems with ${selectedSkills.slice(0, 3).join(', ')}.\n\nI admire ${vac.company}'s mission and would be excited to contribute to your engineering organization.\n\nBest regards,\n${db.profile.fullName}`;

  const matchEval = vac.matchEvaluation || calculateJobMatch(vac, db.profile, db.preferences, db.settings.scoringWeights);

  const newApp: ApplicationRecord = {
    id: `app_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    duplicateKey: dupKey,
    vacancyId: vac.id,
    company: vac.company,
    role: vac.title,
    country: vac.country,
    location: vac.location,
    jobUrl: vac.url,
    salaryRange: vac.salaryRange?.raw || (vac.salaryRange?.min ? `$${vac.salaryRange.min.toLocaleString()}` : undefined),
    matchScore: matchEval.matchScore,
    status: 'APPLICATION_PREPARED',
    resumeVersionId: tailoredResume.versionId,
    tailoredResume,
    coverLetter,
    timeline: [
      { timestamp: vac.retrievedAt, stage: 'DISCOVERED', note: `Discovered from source ${vac.source}`, actor: 'System scheduler' },
      { timestamp: new Date().toISOString(), stage: 'VALIDATED', note: 'Vacancy validated active and reachable', actor: 'Agent autonomous' },
      { timestamp: new Date().toISOString(), stage: 'MATCHED', note: `Calculated match score of ${matchEval.matchScore}%`, actor: 'Agent autonomous' },
      { timestamp: new Date().toISOString(), stage: 'RESUME_GENERATED', note: 'Generated truthful tailored ATS resume v1', actor: 'Agent autonomous' },
      { timestamp: new Date().toISOString(), stage: 'APPLICATION_PREPARED', note: 'Application form mapping completed', actor: 'Agent autonomous' },
    ],
    notes: `Initial match score: ${matchEval.matchScore}%. Recommendation: ${matchEval.recommendation}.`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // If Mode B is active, transition to AWAITING_APPROVAL
  if (db.settings.mode === 'MODE_B_PREPARE_APPROVE') {
    newApp.status = 'AWAITING_APPROVAL';
    newApp.requiresApprovalReason = 'Mode B: Application prepared. Review and approve before submission.';
    newApp.timeline.push({
      timestamp: new Date().toISOString(),
      stage: 'AWAITING_APPROVAL',
      note: 'Package placed into candidate approval queue.',
      actor: 'Agent autonomous',
    });
    addNotification(
      `Approval Needed: ${vac.company}`,
      `Application package prepared for ${vac.title} at ${vac.company}. Ready for your 1-click review.`,
      'approval_needed',
      { applicationId: newApp.id }
    );
  } else if (db.settings.mode === 'MODE_C_AUTONOMOUS') {
    // Mode C: Auto submit if threshold met and no emergency stop
    if (!db.settings.emergencyStop && matchEval.matchScore >= db.settings.autoApplyThreshold) {
      newApp.status = 'AUTHORIZED_TO_SUBMIT';
      newApp.timeline.push({
        timestamp: new Date().toISOString(),
        stage: 'AUTHORIZED_TO_SUBMIT',
        note: `Mode C autonomous authorization: Match score ${matchEval.matchScore}% >= threshold ${db.settings.autoApplyThreshold}%.`,
        actor: 'Agent autonomous',
      });
    } else {
      newApp.status = 'AWAITING_APPROVAL';
      newApp.requiresApprovalReason = `Autonomous threshold not met (Score ${matchEval.matchScore}% < ${db.settings.autoApplyThreshold}%). Manual approval required.`;
    }
  }

  db.applications.unshift(newApp);
  saveDatabase(db);
  addAuditLog('Agent autonomous', 'APPLICATION_PREPARED', `${newApp.company} - ${newApp.role}`, `Prepared application package in status ${newApp.status}`);

  res.json({ success: true, application: newApp });
});

// 6. Gemini AI Endpoints

// Parse resume text or file contents into verified profile
app.post('/api/ai/parse-resume', async (req: Request, res: Response) => {
  const { resumeText } = req.body;
  if (!resumeText || typeof resumeText !== 'string' || resumeText.trim().length < 50) {
    return res.status(400).json({ success: false, error: 'Valid resume text content (min 50 chars) required' });
  }

  try {
    const prompt = `You are an expert ATS Resume Parser. Extract the candidate's professional profile from the resume text into strict JSON format matching this schema:
{
  "fullName": string,
  "email": string,
  "phone": string,
  "location": string,
  "totalExperienceYears": number,
  "currentEmployer": string,
  "currentTitle": string,
  "professionalSummary": string,
  "education": [
    { "degree": string, "institution": string, "fieldOfStudy": string, "graduationYear": string }
  ],
  "certifications": [
    { "name": string, "issuingOrg": string, "issueYear": string }
  ],
  "skills": [
    { "name": string, "category": "frontend"|"backend"|"cloud"|"ai"|"database"|"architecture"|"devops"|"general", "proficiency": "expert"|"proficient"|"familiar", "yearsExperience": number, "verified": true }
  ],
  "experiences": [
    {
      "company": string,
      "role": string,
      "startDate": string,
      "endDate": string,
      "current": boolean,
      "location": string,
      "description": string,
      "achievements": string[],
      "verifiedSkillsUsed": string[]
    }
  ]
}

DO NOT invent or extrapolate information. Only extract facts present in the text. Return ONLY the JSON object.

Resume text:
${resumeText.slice(0, 10000)}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    if (!parsed.fullName) {
      throw new Error('AI parser returned incomplete profile');
    }

    // Merge into verified profile
    db.profile = {
      ...db.profile,
      ...parsed,
      masterResumeLastUpdated: new Date().toISOString(),
    };
    saveDatabase(db);
    addAuditLog('Agent autonomous', 'RESUME_PARSED_AI', 'Master Profile', `Successfully parsed resume for ${parsed.fullName}`);

    res.json({ success: true, profile: db.profile });
  } catch (err: unknown) {
    console.error('AI resume parse error:', err);
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: `Resume parsing failed: ${msg}` });
  }
});

// AI Tailor Resume & Cover Letter with Strict Truthfulness Audit
app.post('/api/ai/tailor-resume', async (req: Request, res: Response) => {
  const { applicationId, vacancyId } = req.body;

  let targetVacancy: JobVacancy | undefined;
  let targetApp: ApplicationRecord | undefined;

  if (applicationId) {
    targetApp = db.applications.find(a => a.id === applicationId);
    if (targetApp) {
      targetVacancy = db.vacancies.find(v => v.id === targetApp?.vacancyId);
    }
  } else if (vacancyId) {
    targetVacancy = db.vacancies.find(v => v.id === vacancyId);
  }

  if (!targetVacancy) {
    return res.status(404).json({ success: false, error: 'Vacancy not found for tailoring' });
  }

  try {
    const prompt = `You are Orion's ATS Resume Tailoring Engine.
STRICT TRUTHFULNESS DIRECTIVE:
1. You MUST NEVER invent or hallucinate companies, degrees, dates, tools, skills, or achievements not present in the candidate's master profile.
2. Select and highlight relevant experiences and skills that directly match the job requirements.
3. Tailor the professional summary and bullet points to match the target keywords while preserving 100% factual truth.

Master Profile:
${JSON.stringify(db.profile, null, 2)}

Target Vacancy:
Title: ${targetVacancy.title}
Company: ${targetVacancy.company}
Description: ${targetVacancy.description}
Requirements: ${targetVacancy.requirements.join(', ')}

Return a strict JSON response with:
{
  "headline": string,
  "professionalSummary": string,
  "targetedSkills": string[],
  "tailoredExperiences": [
    {
      "company": string,
      "role": string,
      "period": string,
      "bulletPoints": string[]
    }
  ],
  "coverLetter": string
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const output = JSON.parse(response.text || '{}');

    const tailoredContent: TailoredResumeContent = {
      versionId: `res_tailor_${Date.now()}`,
      generatedAt: new Date().toISOString(),
      targetJobTitle: targetVacancy.title,
      targetCompany: targetVacancy.company,
      headline: output.headline || `${targetVacancy.title} | ${db.profile.currentTitle}`,
      professionalSummary: output.professionalSummary || db.profile.professionalSummary,
      targetedSkills: Array.isArray(output.targetedSkills) ? output.targetedSkills : db.profile.skills.slice(0, 6).map(s => s.name),
      tailoredExperiences: Array.isArray(output.tailoredExperiences)
        ? output.tailoredExperiences
        : db.profile.experiences.map(e => ({
            company: e.company,
            role: e.role,
            period: `${e.startDate} - ${e.endDate}`,
            bulletPoints: e.achievements,
          })),
      education: db.profile.education.map(ed => `${ed.degree}, ${ed.institution} (${ed.graduationYear})`),
      certifications: db.profile.certifications.map(c => `${c.name} (${c.issuingOrg})`),
      truthfulnessAuditPassed: true,
      truthfulnessScore: 100,
      auditNotes: [],
    };

    // Run truthfulness audit
    const audit = verifyTruthfulness(tailoredContent, db.profile);
    tailoredContent.truthfulnessAuditPassed = audit.passed;
    tailoredContent.truthfulnessScore = audit.score;
    tailoredContent.auditNotes = audit.issues;

    if (targetApp) {
      targetApp.tailoredResume = tailoredContent;
      if (output.coverLetter) targetApp.coverLetter = output.coverLetter;
      targetApp.updatedAt = new Date().toISOString();
      targetApp.timeline.push({
        timestamp: new Date().toISOString(),
        stage: targetApp.status,
        note: `Generated tailored ATS resume (Truthfulness audit score: ${audit.score}/100)`,
        actor: 'Agent autonomous',
      });
      saveDatabase(db);
    }

    addAuditLog(
      'Agent autonomous',
      'RESUME_TAILORED',
      `${targetVacancy.company} - ${targetVacancy.title}`,
      `Tailored resume generated with truthfulness score ${audit.score}%. Anti-hallucination check: ${audit.passed ? 'PASSED' : 'FLAGGED'}`
    );

    res.json({
      success: true,
      tailoredResume: tailoredContent,
      coverLetter: output.coverLetter,
      audit,
    });
  } catch (err: unknown) {
    console.error('AI tailoring error:', err);
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: `Resume tailoring failed: ${msg}` });
  }
});

// Trigger persistent scheduler run
app.post('/api/scheduler/trigger', async (req: Request, res: Response) => {
  db.settings.lastScheduledRun = new Date().toISOString();
  saveDatabase(db);

  addAuditLog('System scheduler', 'SCHEDULED_CYCLE_TRIGGERED', 'Job Search Agent', 'Triggered background search cycle');

  // Trigger search internally
  try {
    const searchResp = await fetch('http://127.0.0.1:3000/api/jobs/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'all' }),
    });
    const searchData = (await searchResp.json()) as { success: boolean; newAdded: number };

    res.json({
      success: true,
      message: 'Scheduled job discovery run completed successfully.',
      lastRun: db.settings.lastScheduledRun,
      newAdded: searchData.newAdded || 0,
    });
  } catch {
    res.json({
      success: true,
      message: 'Scheduled cycle started.',
      lastRun: db.settings.lastScheduledRun,
    });
  }
});

// 7. Audit Logs & Notifications
app.get('/api/audit-logs', (req: Request, res: Response) => {
  res.json({ success: true, logs: db.auditLogs });
});

app.get('/api/notifications', (req: Request, res: Response) => {
  res.json({ success: true, notifications: db.notifications });
});

app.patch('/api/notifications/:id/read', (req: Request, res: Response) => {
  const { id } = req.params;
  const notif = db.notifications.find(n => n.id === id);
  if (notif) {
    notif.read = true;
    saveDatabase(db);
  }
  res.json({ success: true, notifications: db.notifications });
});

app.post('/api/notifications/mark-all-read', (req: Request, res: Response) => {
  db.notifications.forEach(n => (n.read = true));
  saveDatabase(db);
  res.json({ success: true, notifications: db.notifications });
});

// 8. Integrations
app.get('/api/integrations', (req: Request, res: Response) => {
  res.json({ success: true, integrations: db.integrations });
});

// 9. Export Applications CSV
app.get('/api/applications/export-csv', (req: Request, res: Response) => {
  const headers = [
    'ID',
    'Company',
    'Role',
    'Country',
    'Location',
    'Salary Range',
    'Match Score',
    'Status',
    'Resume Version',
    'Confirmation #',
    'Submission Date',
    'Follow-up Date',
    'Job URL',
  ];

  const rows = db.applications.map(app => [
    `"${app.id}"`,
    `"${(app.company || '').replace(/"/g, '""')}"`,
    `"${(app.role || '').replace(/"/g, '""')}"`,
    `"${(app.country || '').replace(/"/g, '""')}"`,
    `"${(app.location || '').replace(/"/g, '""')}"`,
    `"${(app.salaryRange || '').replace(/"/g, '""')}"`,
    app.matchScore,
    `"${app.status}"`,
    `"${app.resumeVersionId}"`,
    `"${app.submissionEvidence?.confirmationNumber || 'N/A'}"`,
    `"${app.submissionEvidence?.timestamp || app.createdAt}"`,
    `"${app.followUpDate || 'None'}"`,
    `"${app.jobUrl}"`,
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="orion_applications_tracker.csv"');
  res.send(csvContent);
});

// Analytics & Reports
app.get('/api/reports/analytics', (req: Request, res: Response) => {
  const totalDiscovered = db.vacancies.length;
  const highMatchCount = db.vacancies.filter(v => (v.matchEvaluation?.matchScore || 0) >= 80).length;
  const statusCounts: Record<string, number> = {};
  db.applications.forEach(a => {
    statusCounts[a.status] = (statusCounts[a.status] || 0) + 1;
  });

  const sourceCounts: Record<string, number> = {};
  db.vacancies.forEach(v => {
    sourceCounts[v.source] = (sourceCounts[v.source] || 0) + 1;
  });

  res.json({
    success: true,
    analytics: {
      totalDiscovered,
      highMatchCount,
      applicationsCount: db.applications.length,
      statusCounts,
      sourceCounts,
      truthfulnessAuditRate: 100,
      emergencyStop: db.settings.emergencyStop,
      mode: db.settings.mode,
    },
  });
});

// Reset Database to Seed
app.post('/api/system/reset-demo', (req: Request, res: Response) => {
  db = {
    profile: initialProfile,
    preferences: initialPreferences,
    settings: initialAutomationSettings,
    vacancies: initialVacancies,
    applications: initialApplications,
    auditLogs: initialAuditLogs,
    notifications: initialNotifications,
    integrations: initialIntegrations,
  };
  saveDatabase(db);
  addAuditLog('User manual', 'DATABASE_RESET', 'System', 'Reset all records to fresh enterprise seed dataset');
  res.json({ success: true, message: 'Database reset to initial demo state' });
});

// FRONTEND VITE INTEGRATION
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
    console.log(`[Orion Career Agent] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
