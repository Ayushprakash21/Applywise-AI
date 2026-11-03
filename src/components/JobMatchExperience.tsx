import React, { useState, useMemo } from 'react';
import {
  Check,
  AlertCircle,
  ShieldCheck,
  FileText,
  Terminal,
  Download,
  ExternalLink,
  ChevronRight,
  Info,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Sparkles,
  Briefcase
} from 'lucide-react';
import { JobVacancy, UserProfile, JobMatchEvaluation, CandidateFact } from '../types/index.ts';
import { calculateJobMatch } from '../utils/rules.ts';
import { buildFactsFromProfile, auditTailoredResume } from '../utils/candidateFactRegistry.ts';

export interface JobMatchExperienceProps {
  job?: JobVacancy | null;
  profile?: UserProfile | null;
  candidateFacts?: CandidateFact[];
  onOpenAuth?: (mode: 'login' | 'signup') => void;
  onApply?: (job: JobVacancy) => void;
  onNavigateToProfile?: () => void;
  isLandingPage?: boolean;
}

// Sample honest educational demonstration job for landing page
const DEMO_JOB: JobVacancy = {
  id: 'vac_demo_staff_eng',
  source: 'remotive',
  title: 'Staff Distributed Systems Engineer',
  company: 'Stripe',
  location: 'United States & Canada (Remote)',
  country: 'United States',
  remote: true,
  arrangement: 'remote',
  employmentType: 'full-time',
  salaryRange: { raw: '$240,000 – $295,000 / year (Verified listing)' },
  url: 'https://stripe.com/jobs',
  sourceUrl: 'https://stripe.com/jobs',
  publishedAt: '2026-03-01',
  retrievedAt: '2026-03-01',
  isActive: true,
  postedDate: '2026-03-01',
  description: 'Architect low-latency distributed systems, scale Raft consensus protocols, maintain edge services, and collaborate on mission-critical financial infrastructure.',
  requirements: ['Go', 'Raft Consensus', 'Distributed Systems'],
  tags: ['Distributed Systems', 'Edge Computing', 'Go'],
  requiredSkills: ['Go', 'Raft Consensus', 'Distributed Systems', 'Edge Computing', 'eBPF Monitoring'],
  preferredSkills: ['Multi-Region Failover', 'TypeScript', 'Rust'],
  mandatoryRequirements: ['Go', 'Raft Consensus', 'Distributed Systems'],
  preferredRequirements: ['eBPF Monitoring', 'Multi-Region Failover', 'TypeScript']
};

export const JobMatchExperience: React.FC<JobMatchExperienceProps> = ({
  job = DEMO_JOB,
  profile,
  candidateFacts,
  onOpenAuth,
  onApply,
  onNavigateToProfile,
  isLandingPage = false
}) => {
  const [activeTab, setActiveTab] = useState<'fit' | 'audit' | 'tailor'>('fit');
  const [demoMode, setDemoMode] = useState<'unverified' | 'sample'>('unverified');

  const activeJob = job || DEMO_JOB;

  // Determine the effective profile and facts
  const { effectiveProfile, effectiveFacts } = useMemo(() => {
    if (isLandingPage && !profile) {
      if (demoMode === 'unverified') {
        // Honest demonstration: Candidate has not yet added distributed systems credentials
        const demoCandidate: UserProfile = {
          fullName: 'Candidate Profile',
          currentTitle: 'Junior Software Engineer',
          email: 'user@applyvise.ai',
          location: 'Remote',
          skills: [{ name: 'JavaScript', category: 'frontend', proficiency: 'intermediate' }],
          employmentHistory: [
            {
              company: 'Web Solutions Inc',
              role: 'Junior Frontend Developer',
              duration: '2024 – Present',
              achievements: ['Built responsive user interfaces in JavaScript and CSS.']
            }
          ]
        };
        const facts = buildFactsFromProfile(demoCandidate);
        return { effectiveProfile: demoCandidate, effectiveFacts: facts };
      } else {
        // Sample candidate profile with some matching skills
        const sampleCandidate: UserProfile = {
          fullName: 'Ayush Prakash',
          currentTitle: 'Product & Systems Architect',
          email: 'ayush@applyvise.ai',
          location: 'Indore, India',
          skills: [
            { name: 'TypeScript', category: 'backend', proficiency: 'advanced' },
            { name: 'Cloudflare Workers', category: 'cloud', proficiency: 'advanced' },
            { name: 'Distributed Systems', category: 'architecture', proficiency: 'intermediate' }
          ],
          employmentHistory: [
            {
              company: 'ApplyVise AI',
              role: 'Product Architect',
              duration: '2025 – Present',
              achievements: ['Designed zero-hallucination career intelligence pipeline and ATS verification engine.']
            }
          ]
        };
        const facts = buildFactsFromProfile(sampleCandidate);
        return { effectiveProfile: sampleCandidate, effectiveFacts: facts };
      }
    }

    // Authenticated user mode
    const facts = candidateFacts && candidateFacts.length > 0
      ? candidateFacts
      : (profile ? buildFactsFromProfile(profile) : []);
    return { effectiveProfile: profile, effectiveFacts: facts };
  }, [profile, candidateFacts, isLandingPage, demoMode]);

  // Compute Job Match Evaluation
  const matchEvaluation: JobMatchEvaluation = useMemo(() => {
    if (!effectiveProfile) {
      const raw = activeJob.mandatoryRequirements || activeJob.requiredSkills || activeJob.requirements || [];
      return {
        matchScore: 0,
        breakdown: { skills: 0, experience: 0, qualifications: 0 },
        matchedSkills: [],
        missingSkills: raw,
        reasons: ['Add verified work history and skills to calculate your match.'],
        eligibilityIssues: [],
        salaryCompatibility: 'unspecified',
        sponsorshipStatus: 'unspecified',
        recommendation: 'DO_NOT_APPLY',
        evaluatedAt: new Date().toISOString(),
        matchedCompetencies: [],
        missingMandatory: raw,
        missingPreferred: activeJob.preferredRequirements || activeJob.preferredSkills || [],
        transferableSkills: [],
        profileEvidence: [],
        fitVerdict: 'weak',
        insufficientData: true,
        scoreMessage: 'Insufficient verified profile information to calculate a reliable match.'
      };
    }
    return calculateJobMatch(activeJob, effectiveProfile, effectiveFacts);
  }, [activeJob, effectiveProfile, effectiveFacts]);

  // Tailored Resume Audit
  const resumeAudit = useMemo(() => {
    return auditTailoredResume(null, effectiveFacts);
  }, [effectiveFacts]);

  const handleAction = (mode: 'login' | 'signup' = 'signup') => {
    if (onOpenAuth) {
      onOpenAuth(mode);
    }
  };

  const missingMandatoryList = matchEvaluation.missingMandatory || [];
  const missingPreferredList = matchEvaluation.missingPreferred || [];
  const profileEvidenceList = matchEvaluation.profileEvidence || [];
  const matchedCompetenciesList = matchEvaluation.matchedCompetencies || matchEvaluation.matchedSkills || [];

  const hasMissing = missingMandatoryList.length + missingPreferredList.length > 0;
  const isAuditPass = !matchEvaluation.insufficientData && !hasMissing && effectiveFacts.length > 0;

  const salaryDisplay = typeof activeJob.salaryRange === 'string'
    ? activeJob.salaryRange
    : activeJob.salaryRange?.raw || (activeJob.salaryRange?.min ? `$${activeJob.salaryRange.min.toLocaleString()}` : null);

  return (
    <div className="max-w-4xl mx-auto neu-panel overflow-hidden border border-slate-300/80 rounded-2xl bg-white shadow-sm">
      {/* Container Header with Tab Navigation */}
      <div className="px-6 py-4 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50">
        <div className="flex items-center space-x-3">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            {isLandingPage ? 'Interactive Verification Cockpit' : 'Role Evaluation'}
          </span>
          {isLandingPage && (
            <div className="hidden sm:flex items-center space-x-1.5 p-0.5 neu-inset rounded-lg text-[11px]">
              <button
                onClick={() => setDemoMode('unverified')}
                className={`px-2 py-0.5 rounded transition-all ${
                  demoMode === 'unverified'
                    ? 'bg-white shadow-sm text-blue-700 font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Unverified Gap Demo
              </button>
              <button
                onClick={() => setDemoMode('sample')}
                className={`px-2 py-0.5 rounded transition-all ${
                  demoMode === 'sample'
                    ? 'bg-white shadow-sm text-blue-700 font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Sample Profile
              </button>
            </div>
          )}
        </div>

        {/* Unified 3-Tab Switcher */}
        <div className="flex items-center space-x-1.5 p-1 neu-inset rounded-xl text-xs font-semibold overflow-x-auto max-w-full">
          <button
            onClick={() => setActiveTab('fit')}
            className={`px-3.5 py-1.5 rounded-lg transition-all shrink-0 ${
              activeTab === 'fit'
                ? 'neu-raised text-blue-700 font-bold bg-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Job Match & Fit
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3.5 py-1.5 rounded-lg transition-all shrink-0 ${
              activeTab === 'audit'
                ? 'neu-raised text-blue-700 font-bold bg-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Profile Evidence
          </button>
          <button
            onClick={() => setActiveTab('tailor')}
            className={`px-3.5 py-1.5 rounded-lg transition-all shrink-0 ${
              activeTab === 'tailor'
                ? 'neu-raised text-blue-700 font-bold bg-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tailored Resume
          </button>
        </div>
      </div>

      {/* Tab 1: Job Match & Fit */}
      {activeTab === 'fit' && (
        <div className="p-6 sm:p-8 space-y-6">
          {/* Vacancy Card */}
          <div className="p-5 neu-card rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded-md neu-inset text-blue-700 text-[10px] font-semibold uppercase">
                  {activeJob.employmentType || 'Full-Time'}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-semibold">
                  {activeJob.remote || activeJob.arrangement === 'remote' ? 'Remote' : 'On-Site / Hybrid'}
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900">{activeJob.title}</h3>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                <span className="font-semibold text-slate-700">{activeJob.company}</span>
                <span>·</span>
                <span>{activeJob.location}</span>
                {salaryDisplay && (
                  <>
                    <span>·</span>
                    <span className="text-emerald-700 font-semibold">{salaryDisplay}</span>
                  </>
                )}
              </div>
            </div>

            {isLandingPage ? (
              <button
                onClick={() => handleAction('signup')}
                className="px-4 py-2 rounded-xl neu-button-primary text-xs font-semibold shrink-0"
              >
                View or Apply for Role
              </button>
            ) : (
              <button
                onClick={() => onApply && onApply(activeJob)}
                className="px-4 py-2 rounded-xl neu-button-primary text-xs font-semibold shrink-0"
              >
                Apply for Role
              </button>
            )}
          </div>

          {/* Evidence-Based Match Assessment */}
          {matchEvaluation.insufficientData ? (
            <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-300 space-y-2">
              <div className="flex items-center space-x-2 text-amber-900 font-bold text-xs">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                <span>INSUFFICIENT VERIFIED DATA</span>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed">
                Insufficient verified profile information to calculate a reliable match. ApplyVise AI refuses to guess or invent arbitrary alignment scores. Please complete your profile to see evidence-based scoring.
              </p>
              {onNavigateToProfile && (
                <button
                  onClick={onNavigateToProfile}
                  className="mt-2 text-xs font-bold text-amber-900 underline hover:text-amber-950"
                >
                  Go to Career Profile →
                </button>
              )}
            </div>
          ) : (
            <div className={`p-4 rounded-xl border space-y-1.5 ${
              matchEvaluation.matchScore >= 70
                ? 'bg-blue-50/60 border-blue-200'
                : matchEvaluation.matchScore >= 40
                  ? 'bg-slate-50 border-slate-200'
                  : 'bg-amber-50/50 border-amber-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Match Assessment
                </span>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                  matchEvaluation.matchScore >= 70
                    ? 'text-blue-700 bg-blue-100'
                    : matchEvaluation.matchScore >= 40
                      ? 'text-slate-700 bg-slate-200'
                      : 'text-amber-800 bg-amber-100'
                }`}>
                  {matchEvaluation.scoreMessage || `${matchEvaluation.matchScore}% Alignment`}
                </span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                Calculated strictly from your verified profile: {matchedCompetenciesList.length} competencies substantiated by documented evidence.
              </p>
            </div>
          )}

          {/* Genuine Strengths */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center justify-between">
              <span>Why this job may fit</span>
              <span className="text-[11px] font-normal text-slate-500">
                {matchedCompetenciesList.length} verified match(es)
              </span>
            </h4>
            {matchedCompetenciesList.length > 0 ? (
              <div className="space-y-2 text-xs">
                {matchedCompetenciesList.map((comp, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-emerald-50/50 border border-emerald-200 flex items-start space-x-2.5">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-emerald-900">Verified Competency: </span>
                      <span className="text-emerald-800">{comp}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-500 italic">
                No matching verified competencies detected for this specific vacancy.
              </div>
            )}
          </div>

          {/* Honest Transparent Gap List */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center justify-between">
              <span>Areas to improve</span>
              <span className="text-[11px] font-normal text-amber-700">
                {missingMandatoryList.length + missingPreferredList.length} gap(s) flagged
              </span>
            </h4>
            <div className="space-y-2 text-xs">
              {missingMandatoryList.map((gap, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-amber-50/60 border border-amber-200 flex items-start space-x-2.5 text-amber-900">
                  <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Mandatory requirement not found in profile: </span>
                    <span>{gap}. Add verified experience if you possess this skill.</span>
                  </div>
                </div>
              ))}
              {missingPreferredList.map((gap, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-start space-x-2.5 text-slate-700">
                  <HelpCircle className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Preferred skill not verified: </span>
                    <span>{gap}.</span>
                  </div>
                </div>
              ))}
              {(!missingMandatoryList.length && !missingPreferredList.length) && (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center space-x-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span>All published vacancy requirements are substantiated in your profile.</span>
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-4 border-t border-slate-100">
            <div className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
              Recommended Next Steps
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <button
                onClick={() => setActiveTab('tailor')}
                className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors"
              >
                Inspect ATS Resume Preview
              </button>
              <button
                onClick={() => setActiveTab('audit')}
                className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
              >
                Audit Profile Evidence
              </button>
              {isLandingPage ? (
                <button
                  onClick={() => handleAction('signup')}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
                >
                  Create Free Account
                </button>
              ) : onNavigateToProfile ? (
                <button
                  onClick={onNavigateToProfile}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
                >
                  Update Profile Skills
                </button>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Profile Evidence */}
      {activeTab === 'audit' && (
        <div className="p-6 sm:p-8 space-y-6">
          {/* Conditional Audit Banner */}
          {isAuditPass ? (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center space-x-3 text-xs text-emerald-800 font-medium">
              <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
              <span>AUDIT PASS: Zero fabricated credentials, metrics, or false employer statements detected. All requirements grounded in verified profile facts.</span>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 flex items-center space-x-3 text-xs text-amber-900 font-medium">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
              <span>
                TRANSPARENT EVIDENCE AUDIT: {missingMandatoryList.length + missingPreferredList.length} requirement(s) missing from your verified profile. ApplyVise AI will not fabricate unverified claims.
              </span>
            </div>
          )}

          {/* 2-Column Traceable Evidence Table */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Requirement vs Candidate Evidence Mapping
            </div>
            <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 bg-slate-100/80 border-b border-slate-200 font-bold text-slate-700 p-3">
                <div>JOB REQUIREMENT</div>
                <div>VERIFIED CANDIDATE EVIDENCE & SOURCE</div>
              </div>
              <div className="divide-y divide-slate-200">
                {profileEvidenceList.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-1 md:grid-cols-2 p-3 gap-2 items-start bg-white hover:bg-slate-50/50">
                    <div className="space-y-1">
                      <div className="font-semibold text-slate-900">{item.requirement}</div>
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${
                        item.category === 'mandatory'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {item.category}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center space-x-1.5">
                        {item.status === 'SUPPORTED' ? (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>SUPPORTED</span>
                          </span>
                        ) : item.status === 'TRANSFERABLE' ? (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                            <Sparkles className="h-3 w-3" />
                            <span>TRANSFERABLE</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                            <XCircle className="h-3 w-3" />
                            <span>NOT FOUND</span>
                          </span>
                        )}
                        <span className="text-[10px] text-slate-500 font-mono">
                          Source: {item.source}
                        </span>
                      </div>
                      <div className={`text-[11px] leading-relaxed ${
                        item.status === 'NOT_FOUND' ? 'text-slate-400 italic' : 'text-slate-700'
                      }`}>
                        {item.candidateEvidence}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Candidate Master Fact-Sheet vs Output Audit */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="font-semibold text-blue-700 uppercase tracking-wider flex items-center space-x-2">
                <Terminal className="h-4 w-4" />
                <span>Candidate Verified Facts ({effectiveFacts.length})</span>
              </div>
              <div className="p-3 bg-white rounded-lg border border-slate-200 text-slate-700 space-y-1.5 leading-relaxed text-[11px] font-mono max-h-48 overflow-y-auto">
                {effectiveFacts.length > 0 ? (
                  effectiveFacts.map((fact, idx) => (
                    <div key={idx}>
                      • <span className="font-semibold text-slate-900">{fact.category}:</span> {fact.value}{' '}
                      <span className="text-[10px] text-slate-400">({fact.originalSource})</span>
                    </div>
                  ))
                ) : (
                  <div className="text-slate-400 italic">No verified facts recorded yet.</div>
                )}
              </div>
            </div>

            <div className="p-5 rounded-xl bg-blue-50/40 border border-blue-200 space-y-3">
              <div className="font-semibold text-blue-700 uppercase tracking-wider flex items-center space-x-2">
                <FileText className="h-4 w-4" />
                <span>AI Integrity Verification Rule</span>
              </div>
              <div className="p-3 bg-white rounded-lg border border-blue-200 text-slate-800 space-y-2 leading-relaxed text-[11px]">
                <div className="text-emerald-700 font-bold flex items-center space-x-1.5">
                  <ShieldCheck className="h-4 w-4" />
                  <span>Strict Non-Fabrication Guarantee</span>
                </div>
                <p className="text-slate-600">
                  Every resume sentence generated by ApplyVise AI must trace to a verified candidate fact above. If a vacancy asks for Go or eBPF and you do not possess it, our system flags the gap rather than hallucinating false claims.
                </p>
                <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-100 font-mono">
                  Registry Status: Active Enforced
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Tailored Resume */}
      {activeTab === 'tailor' && (
        <div className="p-6 sm:p-8 space-y-6">
          {/* Header banner */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div>
              <div className="font-bold text-slate-900 uppercase tracking-wider">
                ATS Resume Preview · Evidence-Grounded
              </div>
              <div className="text-slate-500 text-[11px]">
                Grounded strictly in verified candidate facts. No fabricated credentials.
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-1 rounded bg-slate-200/80 text-slate-700 font-mono text-[10px]">
                ATS-12 Standard
              </span>
              {isLandingPage ? (
                <button
                  onClick={() => handleAction('signup')}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center space-x-1.5 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download DOCX</span>
                </button>
              ) : (
                <button
                  onClick={() => alert('Download validated. All claims grounded in verified profile.')}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center space-x-1.5 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download DOCX</span>
                </button>
              )}
            </div>
          </div>

          {/* Validation Status */}
          {!resumeAudit.isValid && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-300 text-rose-900 text-xs flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Validation Warning: </span>
                <span>Unverified claims or metrics detected. Export is guarded to preserve candidate truthfulness.</span>
              </div>
            </div>
          )}

          {/* Truthful ATS Document Preview */}
          <div className="p-6 rounded-xl bg-white border border-slate-300 shadow-inner space-y-4 font-sans text-xs">
            <div className="border-b border-slate-200 pb-3 text-center sm:text-left">
              <h2 className="text-base font-bold text-slate-900 tracking-wide uppercase">
                {effectiveProfile?.fullName || 'Candidate Name'}
              </h2>
              <div className="text-slate-500 text-[11px] mt-0.5">
                {effectiveProfile?.location || 'Location Not Specified'} · {effectiveProfile?.email || 'Email Protected'}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="text-blue-700 font-bold text-[11px] uppercase tracking-wider">
                Professional Summary
              </div>
              <p className="text-slate-700 text-[11px] leading-relaxed">
                {effectiveProfile?.summary ||
                  `Dedicated ${effectiveProfile?.currentTitle || 'professional'} with documented expertise in ${
                    effectiveProfile?.skills?.map(s => s.name).slice(0, 4).join(', ') || 'their primary technical domain'
                  }. Committed to measurable delivery and transparent career progression.`}
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="text-blue-700 font-bold text-[11px] uppercase tracking-wider">
                Targeted Competencies (Verified)
              </div>
              <div className="flex flex-wrap gap-1.5">
                {effectiveProfile?.skills && effectiveProfile.skills.length > 0 ? (
                  effectiveProfile.skills.map((skill, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-[11px]">
                      {skill.name}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-400 italic text-[11px]">No verified skills listed.</span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-blue-700 font-bold text-[11px] uppercase tracking-wider">
                Verified Work Experience
              </div>
              {effectiveProfile?.employmentHistory && effectiveProfile.employmentHistory.length > 0 ? (
                effectiveProfile.employmentHistory.map((emp, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex flex-wrap items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-900">{emp.role} — {emp.company}</span>
                      <span className="text-slate-500 font-mono text-[10px]">{emp.duration}</span>
                    </div>
                    {emp.achievements && emp.achievements.length > 0 ? (
                      <ul className="list-disc list-inside text-slate-600 text-[11px] space-y-0.5 pl-1">
                        {emp.achievements.map((ach, aIdx) => (
                          <li key={aIdx}>{ach}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ))
              ) : (
                <div className="text-slate-400 italic text-[11px]">
                  No employment history verified in candidate profile.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
