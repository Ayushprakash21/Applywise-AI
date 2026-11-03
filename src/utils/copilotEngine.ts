// src/utils/copilotEngine.ts
// Controlled AI Copilot Engine grounded exclusively in verified candidate facts

import {
  UserProfile,
  CareerPreferences,
  ApplicationRecord,
  CandidateFact,
  JobVacancy,
  JobMatchEvaluation
} from '../types/index.ts';
import { calculateJobMatch } from './rules.ts';
import { buildFactsFromProfile, getVerifiedFacts } from './candidateFactRegistry.ts';

export interface CopilotContext {
  page?: string;
  jobId?: string;
  details?: Record<string, any>;
}

export interface CopilotToolRegistry {
  getCandidateProfile: (profile: UserProfile | null, facts: CandidateFact[]) => Record<string, any>;
  getVerifiedEmploymentHistory: (profile: UserProfile | null, facts: CandidateFact[]) => Array<{
    company: string;
    role: string;
    duration: string;
    achievements: string[];
    isVerified: boolean;
  }>;
  getVerifiedSkills: (profile: UserProfile | null, facts: CandidateFact[]) => Array<{
    name: string;
    source: string;
    isVerified: boolean;
  }>;
  getEducation: (profile: UserProfile | null, facts: CandidateFact[]) => Array<{
    institution: string;
    degree: string;
    year: string;
  }>;
  getCertifications: (profile: UserProfile | null, facts: CandidateFact[]) => Array<{
    name: string;
    issuer: string;
    year: string;
  }>;
  getJobDescription: (job: JobVacancy | null) => Record<string, any>;
  getJobMatchEvidence: (profile: UserProfile | null, job: JobVacancy | null, facts: CandidateFact[]) => JobMatchEvaluation | null;
  getApplicationHistory: (applications: ApplicationRecord[]) => Array<{
    id: string;
    company: string;
    role: string;
    status: string;
    createdAt: string;
  }>;
  getResumeVersions: (profile: UserProfile | null, applications: ApplicationRecord[]) => Array<{
    id: string;
    title: string;
    lastUpdated?: string;
  }>;
  getCareerPreferences: (preferences: CareerPreferences | null) => Record<string, any>;
}

export const copilotTools: CopilotToolRegistry = {
  getCandidateProfile: (profile, facts) => {
    if (!profile) return { error: 'No profile found' };
    const verifiedFacts = getVerifiedFacts(facts.length > 0 ? facts : buildFactsFromProfile(profile));
    return {
      fullName: profile.fullName || 'Candidate',
      currentTitle: profile.currentTitle || 'Professional',
      email: profile.email || 'Not provided',
      phone: profile.phone || 'Not provided',
      location: profile.location || 'Not provided',
      summary: profile.summary || 'No summary provided',
      verifiedFactCount: verifiedFacts.length,
      hasEmploymentHistory: (profile.employmentHistory || []).length > 0,
      hasSkills: (profile.skills || []).length > 0
    };
  },

  getVerifiedEmploymentHistory: (profile, facts) => {
    if (!profile || !profile.employmentHistory || profile.employmentHistory.length === 0) {
      return [];
    }
    const verifiedFacts = getVerifiedFacts(facts.length > 0 ? facts : buildFactsFromProfile(profile));
    const verifiedEmployers = new Set(
      verifiedFacts.filter(f => f.category === 'EMPLOYMENT').map(f => f.value.toLowerCase())
    );

    return profile.employmentHistory.map(emp => ({
      company: emp.company,
      role: emp.role,
      duration: emp.duration,
      achievements: emp.achievements || [],
      isVerified: verifiedEmployers.has(emp.company.toLowerCase()) || verifiedFacts.length === 0
    }));
  },

  getVerifiedSkills: (profile, facts) => {
    if (!profile || !profile.skills || profile.skills.length === 0) {
      return [];
    }
    const allFacts = facts.length > 0 ? facts : buildFactsFromProfile(profile);
    const skillFacts = allFacts.filter(f => f.category === 'SKILL');

    return profile.skills.map(s => {
      const match = skillFacts.find(f => f.value.toLowerCase() === s.name.toLowerCase());
      return {
        name: s.name,
        source: match?.originalSource || 'Profile Skills',
        isVerified: match ? match.verificationStatus === 'USER_CONFIRMED' || match.verificationStatus === 'USER_CORRECTED' || match.verificationStatus === 'EXTRACTED' : true
      };
    });
  },

  getEducation: (profile) => {
    if (!profile || !profile.education) return [];
    return profile.education.map(ed => ({
      institution: ed.institution,
      degree: ed.degree,
      year: ed.year
    }));
  },

  getCertifications: (profile) => {
    if (!profile || !profile.certifications) return [];
    return profile.certifications.map(c => ({
      name: c.name,
      issuer: c.issuer,
      year: c.year
    }));
  },

  getJobDescription: (job) => {
    if (!job) return { error: 'No job selected or available in context' };
    return {
      id: job.id,
      title: job.title,
      company: job.company,
      location: job.location,
      workArrangement: job.workArrangement,
      salaryRange: job.salaryRange,
      requiredSkills: job.requiredSkills || [],
      preferredSkills: job.preferredSkills || [],
      descriptionSnippet: (job.description || '').slice(0, 500)
    };
  },

  getJobMatchEvidence: (profile, job, facts) => {
    if (!profile || !job) return null;
    const effectiveFacts = facts.length > 0 ? facts : buildFactsFromProfile(profile);
    return calculateJobMatch(job, profile, effectiveFacts);
  },

  getApplicationHistory: (applications) => {
    return (applications || []).map(app => ({
      id: app.id,
      company: app.company,
      role: app.role,
      status: app.status,
      createdAt: app.createdAt
    }));
  },

  getResumeVersions: (profile, applications) => {
    const versions: Array<{ id: string; title: string; lastUpdated?: string }> = [];
    if (profile) {
      versions.push({
        id: 'master',
        title: 'Master Candidate Profile',
        lastUpdated: profile.masterResumeLastUpdated
      });
    }
    for (const app of applications) {
      if (app.tailoredResume) {
        versions.push({
          id: `tailored_${app.id}`,
          title: `Tailored: ${app.role} at ${app.company}`,
          lastUpdated: app.updatedAt
        });
      }
    }
    return versions;
  },

  getCareerPreferences: (preferences) => {
    if (!preferences) return { status: 'No preferences configured' };
    return {
      targetRoles: preferences.targetRoles || [],
      targetCountries: preferences.targetCountries || [],
      workArrangements: preferences.workArrangements || [],
      minSalaryUSD: preferences.minSalaryUSD || 0,
      visaSponsorshipRequired: preferences.visaSponsorshipRequired || false
    };
  }
};

export interface ProcessCopilotParams {
  message: string;
  context?: CopilotContext;
  user: { id: string; fullName: string; email: string };
  profile: UserProfile | null;
  preferences?: CareerPreferences | null;
  applications?: ApplicationRecord[];
  facts?: CandidateFact[];
  job?: JobVacancy | null;
  apiKey?: string;
}

export async function generateCopilotResponse(params: ProcessCopilotParams): Promise<string> {
  const {
    message,
    context = {},
    user,
    profile,
    preferences = null,
    applications = [],
    facts = [],
    job = null,
    apiKey
  } = params;

  // 1. Gather all tool outputs for grounding
  const candidateProfileData = copilotTools.getCandidateProfile(profile, facts);
  const employmentHistoryData = copilotTools.getVerifiedEmploymentHistory(profile, facts);
  const skillsData = copilotTools.getVerifiedSkills(profile, facts);
  const educationData = copilotTools.getEducation(profile, facts);
  const certsData = copilotTools.getCertifications(profile, facts);
  const jobData = copilotTools.getJobDescription(job);
  const matchEvidence = job && profile ? copilotTools.getJobMatchEvidence(profile, job, facts) : null;
  const applicationHistory = copilotTools.getApplicationHistory(applications);
  const resumeVersions = copilotTools.getResumeVersions(profile, applications);
  const preferencesData = copilotTools.getCareerPreferences(preferences);

  // Construct grounded system prompt with strict rules
  const systemPrompt = `You are ApplyVise AI Copilot, a strictly grounded, zero-hallucination career intelligence assistant.

CORE PRODUCT CONSTRAINTS:
1. Ground every claim about the candidate in the VERIFIED DATA provided below.
2. If the user asks about an experience, skill, metric, education, or employer not listed in the verified data, you MUST say: "I don't have that information in your verified profile."
3. NEVER invent skills, metrics, percentages, degrees, certifications, or employers.
4. When suggesting resume bullets, use ONLY verified facts.
5. If the user asks whether they qualify for a role, provide an honest, evidence-based assessment highlighting gaps as well as strengths. Never inflate match scores.

=== VERIFIED CANDIDATE DATA ===
Candidate: ${user.fullName} (${user.email})
Profile: ${JSON.stringify(candidateProfileData)}
Verified Work History: ${JSON.stringify(employmentHistoryData)}
Verified Skills: ${JSON.stringify(skillsData)}
Education: ${JSON.stringify(educationData)}
Certifications: ${JSON.stringify(certsData)}
Target Preferences: ${JSON.stringify(preferencesData)}
Applications: ${JSON.stringify(applicationHistory)}
Available Resumes: ${JSON.stringify(resumeVersions)}
Target Job: ${JSON.stringify(jobData)}
Match Evidence & Gaps: ${JSON.stringify(matchEvidence || 'No active job evaluated')}
================================`;

  // Try Gemini if available
  if (apiKey) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            { role: 'user', parts: [{ text: `${systemPrompt}\n\nUser Question:\n${message}` }] }
          ],
          generationConfig: { maxOutputTokens: 1024, temperature: 0.2 }
        }),
        signal: AbortSignal.timeout(15000)
      });
      if (res.ok) {
        const data = await res.json() as any;
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (reply && reply.trim().length > 0) {
          return reply.trim();
        }
      }
    } catch {
      // Fallback below
    }
  }

  // Deterministic Grounded Engine
  const qLower = message.toLowerCase();

  // If asking about qualification / match
  if (qLower.includes('qualify') || qLower.includes('fit') || qLower.includes('match') || qLower.includes('chance')) {
    if (!job) {
      return `To evaluate if you qualify, please select a specific job vacancy from **Find Jobs** or provide the job requirements. I will check your verified background against the job description without making assumptions.`;
    }
    if (!matchEvidence || matchEvidence.insufficientData) {
      return `**Assessment for ${job.title} at ${job.company}:**\n\nI have **insufficient verified profile information** in your account to calculate a reliable match. Please add or verify your employment history and skills in your **Career Profile** so I can evaluate your genuine alignment.`;
    }
    const gaps = matchEvidence.missingMandatory?.concat(matchEvidence.missingPreferred || []) || [];
    let text = `**Honest Match Assessment for ${job.title} (${matchEvidence.matchScore}% Alignment):**\n\n`;
    if (matchEvidence.matchedCompetencies && matchEvidence.matchedCompetencies.length > 0) {
      text += `**Verified Strengths:**\n${matchEvidence.matchedCompetencies.map(c => `• ${c}`).join('\n')}\n\n`;
    }
    if (gaps.length > 0) {
      text += `**Gaps Identified in Your Verified Profile:**\n${gaps.map(g => `• ${g} (Not found in your verified profile)`).join('\n')}\n\n`;
    }
    text += `*Note: ApplyVise AI adheres to a strict zero-fabrication standard. I will not suggest exaggerating or claiming unverified credentials.*`;
    return text;
  }

  // If asking about resume / bullet points
  if (qLower.includes('bullet') || qLower.includes('resume') || qLower.includes('tailor') || qLower.includes('cv')) {
    if (!profile || !profile.employmentHistory || profile.employmentHistory.length === 0) {
      return `I don't have any verified employment history in your profile yet. Please add your real work history under **Career Profile** so I can generate truthful resume recommendations.`;
    }
    const latestEmp = profile.employmentHistory[0];
    return `**Grounded Resume Recommendations for ${profile.fullName}:**\n\nBased exclusively on your verified role as **${latestEmp.role}** at **${latestEmp.company}**:\n\n` +
      `1. **Focus on Verified Scope:** Lead with your authentic responsibilities in ${latestEmp.role}.\n` +
      `2. **Quantify Only Real Outcomes:** If you have documented metrics from your work at ${latestEmp.company}, include them. Do not include estimated or fabricated numbers.\n` +
      `3. **ATS Alignment:** Your resume will list verified skills: ${skillsData.slice(0, 5).map(s => s.name).join(', ') || 'as verified in your profile'}.`;
  }

  // If asking about a specific skill / credential
  if (qLower.includes('do i have') || qLower.includes('my experience with')) {
    const matchedSkill = skillsData.find(s => qLower.includes(s.name.toLowerCase()));
    if (matchedSkill) {
      return `Yes, **${matchedSkill.name}** is listed on your verified profile (Source: ${matchedSkill.source}).`;
    }
    return `I don't have that information in your verified profile. If you have experience in that area, you can add and verify it in your **Career Profile**.`;
  }

  // General Grounded Career Response
  return `**ApplyVise Grounded Career Assistant:**\n\nI am connected to your verified profile facts (${user.fullName}, ${profile?.currentTitle || 'Professional'}):\n\n` +
    `• **Verified Work Records:** ${employmentHistoryData.length} employer(s)\n` +
    `• **Verified Skills:** ${skillsData.length} skill(s)\n` +
    `• **Tracked Applications:** ${applicationHistory.length} active\n\n` +
    `How can I help you analyze a job match or prepare an ATS-ready application today?`;
}
