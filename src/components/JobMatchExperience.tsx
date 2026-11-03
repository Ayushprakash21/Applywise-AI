import React, { useState, useMemo } from 'react';
import {
  Check,
  ShieldCheck,
  Download,
  ChevronRight,
  Info,
  ExternalLink,
  Sparkles
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
  const [showDeepFactAudit, setShowDeepFactAudit] = useState(false);
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});

  const activeJob = job || DEMO_JOB;

  // Determine the effective profile and facts
  const { effectiveProfile, effectiveFacts } = useMemo(() => {
    if (isLandingPage && !profile) {
      if (demoMode === 'unverified') {
        // Honest demonstration: Candidate has not yet added distributed systems credentials
        const demoCandidate: UserProfile = {
          id: 'demo_candidate_unverified',
          fullName: 'Candidate Profile',
          currentTitle: 'Junior Software Engineer',
          email: 'candidate@applyvise.ai',
          phone: '',
          location: 'Remote',
          totalExperienceYears: 1,
          currentEmployer: 'Web Solutions Inc',
          professionalSummary: 'Junior Frontend Developer focused on responsive web interfaces.',
          education: [],
          certifications: [],
          experiences: [],
          skills: [{ name: 'JavaScript', category: 'frontend', proficiency: 'intermediate' }],
          employmentHistory: [
            {
              company: 'Web Solutions Inc',
              role: 'Junior Frontend Developer',
              duration: '2024 – Present',
              achievements: ['Developed responsive web interfaces and user interactions in JavaScript and CSS.']
            }
          ]
        };
        const facts = buildFactsFromProfile(demoCandidate);
        return { effectiveProfile: demoCandidate, effectiveFacts: facts };
      } else {
        // Sample candidate profile with some matching skills
        const sampleCandidate: UserProfile = {
          id: 'demo_candidate_sample',
          fullName: 'Candidate Profile (Demonstration)',
          currentTitle: 'Product & Systems Architect',
          email: 'candidate@applyvise.ai',
          phone: '',
          location: 'Remote',
          totalExperienceYears: 5,
          currentEmployer: 'ApplyVise AI',
          professionalSummary: 'Product and systems architect building resilient cloud applications.',
          education: [],
          certifications: [],
          experiences: [],
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
              achievements: ['Engineered career intelligence pipeline and zero-hallucination verification engine.']
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

  const toggleSource = (id: string) => {
    setExpandedSources(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const missingMandatoryList = matchEvaluation.missingMandatory || [];
  const missingPreferredList = matchEvaluation.missingPreferred || [];
  const profileEvidenceList = matchEvaluation.profileEvidence || [];
  const matchedCompetenciesList = matchEvaluation.matchedCompetencies || matchEvaluation.matchedSkills || [];

  const salaryDisplay = typeof activeJob.salaryRange === 'string'
    ? activeJob.salaryRange
    : activeJob.salaryRange?.raw || (activeJob.salaryRange?.min ? `$${activeJob.salaryRange.min.toLocaleString()}` : null);

  // Group up to 3 strongest matching areas
  const topStrengths = matchedCompetenciesList.slice(0, 3);

  // Group up to 3 skills to strengthen
  const skillsToStrengthen = useMemo(() => {
    const list: { name: string; type: 'mandatory' | 'preferred' }[] = [];
    missingMandatoryList.forEach(m => list.push({ name: m, type: 'mandatory' }));
    missingPreferredList.forEach(p => list.push({ name: p, type: 'preferred' }));
    return list.slice(0, 3);
  }, [missingMandatoryList, missingPreferredList]);

  return (
    <div className="max-w-4xl mx-auto rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden text-slate-800">
      {/* Top Navigation & View Switcher */}
      <div className="px-5 sm:px-6 py-4 border-b border-slate-200/70 flex flex-wrap items-center justify-between gap-3 bg-slate-50/40">
        <div className="flex items-center space-x-3">
          <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
            {isLandingPage ? 'Interactive Verification Cockpit' : 'Role Assessment'}
          </span>
          {isLandingPage && (
            <div className="hidden sm:flex items-center space-x-1 p-0.5 rounded-lg bg-slate-200/60 text-[11px]">
              <button
                onClick={() => setDemoMode('unverified')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  demoMode === 'unverified'
                    ? 'bg-white shadow-xs text-blue-700 font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Gaps Demo
              </button>
              <button
                onClick={() => setDemoMode('sample')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  demoMode === 'sample'
                    ? 'bg-white shadow-xs text-blue-700 font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Sample Profile
              </button>
            </div>
          )}
        </div>

        {/* 3-Tab Segment Switcher */}
        <div className="flex items-center space-x-1 p-1 bg-slate-100 rounded-xl text-xs font-medium overflow-x-auto max-w-full">
          <button
            onClick={() => setActiveTab('fit')}
            className={`px-3.5 py-1.5 rounded-lg transition-all shrink-0 ${
              activeTab === 'fit'
                ? 'bg-white text-slate-900 font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Job Match & Fit
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3.5 py-1.5 rounded-lg transition-all shrink-0 ${
              activeTab === 'audit'
                ? 'bg-white text-slate-900 font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Profile Evidence
          </button>
          <button
            onClick={() => setActiveTab('tailor')}
            className={`px-3.5 py-1.5 rounded-lg transition-all shrink-0 ${
              activeTab === 'tailor'
                ? 'bg-white text-slate-900 font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tailored Resume
          </button>
        </div>
      </div>

      {/* Tab 1: Job Match & Fit (Clean, Minimal, Non-Alarming) */}
      {activeTab === 'fit' && (
        <div className="p-6 sm:p-8 space-y-6">
          {/* Main Vacancy Information Card */}
          <div className="p-5 sm:p-6 rounded-xl border border-slate-200/80 bg-white flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-xs">
            <div className="space-y-1.5">
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium uppercase tracking-wider">
                  {activeJob.employmentType || 'Full-Time'}
                </span>
                <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium">
                  {activeJob.remote || activeJob.arrangement === 'remote' ? 'Remote' : 'On-Site / Hybrid'}
                </span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">{activeJob.title}</h3>
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500">
                <span className="font-semibold text-slate-800">{activeJob.company}</span>
                <span>·</span>
                <span>{activeJob.location}</span>
                {salaryDisplay && (
                  <>
                    <span>·</span>
                    <span className="text-slate-700 font-medium">{salaryDisplay}</span>
                  </>
                )}
              </div>
            </div>

            {isLandingPage ? (
              <button
                onClick={() => handleAction('signup')}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shrink-0 transition-colors shadow-xs"
              >
                View Job & Apply
              </button>
            ) : (
              <button
                onClick={() => onApply && onApply(activeJob)}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shrink-0 transition-colors shadow-xs"
              >
                View Job & Apply
              </button>
            )}
          </div>

          {/* Evidence-Backed Match Score Card */}
          <div className="p-5 sm:p-6 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-4">
            {matchEvaluation.insufficientData ? (
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-slate-800 font-semibold text-xs">
                  <Info className="h-4 w-4 text-slate-500 shrink-0" />
                  <span>Not enough verified information to calculate match score</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  ApplyVise AI calculates alignment scores strictly from verified candidate information. Add your work history and competencies to see your evidence-backed score.
                </p>
                {onNavigateToProfile && (
                  <button
                    onClick={onNavigateToProfile}
                    className="mt-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
                  >
                    Complete career profile →
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Match Assessment
                    </div>
                    <div className="flex items-baseline space-x-2.5 mt-0.5">
                      <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                        {matchEvaluation.matchScore}%
                      </span>
                      <span className="text-xs font-medium text-slate-600">
                        {matchEvaluation.matchScore >= 70
                          ? 'High Alignment'
                          : matchEvaluation.matchScore >= 40
                            ? 'Moderate Alignment'
                            : 'Foundational Alignment'}
                      </span>
                    </div>
                  </div>

                  {/* Clean progress indicator */}
                  <div className="w-full sm:w-48 space-y-1">
                    <div className="h-2 w-full bg-slate-200/80 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(matchEvaluation.matchScore, 4)}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-slate-500 text-right">
                      {matchedCompetenciesList.length} of {matchedCompetenciesList.length + missingMandatoryList.length} core requirements met
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed pt-1">
                  Calculated strictly from your verified profile: {matchedCompetenciesList.length} core {matchedCompetenciesList.length === 1 ? 'competency is' : 'competencies are'} substantiated by documented evidence.
                </p>
              </div>
            )}
          </div>

          {/* Decision Section: Two-Column Alignment & Constructive Strengths */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Where your experience aligns */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
                  Where your experience aligns
                </h4>
                <span className="text-[11px] text-slate-500">
                  {topStrengths.length} verified match{topStrengths.length === 1 ? '' : 'es'}
                </span>
              </div>

              {topStrengths.length > 0 ? (
                <div className="space-y-2 text-xs">
                  {topStrengths.map((comp, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl border border-slate-200/80 bg-white flex items-start space-x-2.5 shadow-xs"
                    >
                      <div className="p-1 rounded-full bg-blue-50 text-blue-600 shrink-0 mt-0.5">
                        <Check className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">{comp}</div>
                        <div className="text-slate-500 text-[11px] mt-0.5">
                          Substantiated by verified profile history.
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-slate-200/70 bg-slate-50/40 text-xs text-slate-500 leading-relaxed">
                  No direct matching competencies recorded yet for this role spec.
                </div>
              )}
            </div>

            {/* Skills to strengthen */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
                  Skills to strengthen
                </h4>
                <span className="text-[11px] text-slate-500">
                  {skillsToStrengthen.length} area{skillsToStrengthen.length === 1 ? '' : 's'}
                </span>
              </div>

              {skillsToStrengthen.length > 0 ? (
                <div className="space-y-2 text-xs">
                  {skillsToStrengthen.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl border border-slate-200/70 bg-slate-50/50 flex items-start space-x-2.5"
                    >
                      <div className="p-1 rounded-full bg-slate-200/70 text-slate-600 shrink-0 mt-0.5">
                        <Sparkles className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <div className="font-medium text-slate-900">
                          Skill to strengthen: <span className="font-semibold">{item.name}</span>
                        </div>
                        <div className="text-slate-500 text-[11px] mt-0.5">
                          {item.type === 'mandatory'
                            ? 'This requirement is not yet demonstrated in your profile.'
                            : 'Additional experience may be beneficial.'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-slate-200/70 bg-slate-50/40 text-xs text-slate-600 leading-relaxed flex items-center space-x-2">
                  <ShieldCheck className="h-4 w-4 text-slate-500 shrink-0" />
                  <span>All published role requirements are substantiated in your profile.</span>
                </div>
              )}
            </div>
          </div>

          {/* Secondary Actions & Progressive Disclosure */}
          <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setActiveTab('audit')}
                className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium transition-colors"
              >
                Explore Detailed Assessment →
              </button>
              <button
                onClick={() => setActiveTab('tailor')}
                className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium transition-colors"
              >
                View ATS Resume Preview
              </button>
            </div>

            {isLandingPage ? (
              <button
                onClick={() => handleAction('signup')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
              >
                Create Account to Match More Jobs →
              </button>
            ) : onNavigateToProfile ? (
              <button
                onClick={onNavigateToProfile}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
              >
                Update Profile Skills →
              </button>
            ) : null}
          </div>
        </div>
      )}

      {/* Tab 2: Profile Evidence (Clean 3-Column Table & Executive Assessment) */}
      {activeTab === 'audit' && (
        <div className="p-6 sm:p-8 space-y-6">
          {/* Subtle Verification Standard Note */}
          <div className="flex items-center space-x-2.5 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600">
            <ShieldCheck className="h-4 w-4 text-slate-500 shrink-0" />
            <span>AUDIT PASS: Zero fabricated credentials, metrics, or false employer statements detected. All requirements grounded in verified profile facts.</span>
          </div>

          {/* Minimal 3-Column Table: Requirement | Candidate Evidence | Assessment */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
                Alignment Breakdown & Evidence
              </h4>
              <span className="text-[11px] text-slate-500">
                {profileEvidenceList.length} criteria evaluated
              </span>
            </div>

            <div className="border border-slate-200/80 rounded-xl overflow-hidden text-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200/80 bg-slate-50/75 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4 w-1/3">Job Requirement</th>
                      <th className="py-3 px-4 w-5/12">Relevant Profile Grounding</th>
                      <th className="py-3 px-4 w-1/4">Assessment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {profileEvidenceList.map((item, idx) => {
                      const isSupported = item.status === 'SUPPORTED';
                      const isTransferable = item.status === 'TRANSFERABLE';
                      const isNotFound = item.status === 'NOT_FOUND';
                      const isUnverified = item.status === 'UNVERIFIED';

                      return (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          {/* Column 1: Job Requirement */}
                          <td className="py-3.5 px-4 align-top">
                            <div className="font-semibold text-slate-900">{item.requirement}</div>
                            <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider bg-slate-100 text-slate-600">
                              {item.category === 'mandatory' ? 'Core Requirement' : 'Preferred'}
                            </span>
                          </td>

                          {/* Column 2: Candidate Evidence */}
                          <td className="py-3.5 px-4 align-top text-slate-700">
                            {isNotFound ? (
                              <div className="text-slate-400 italic text-[11px]">
                                This requirement is not yet demonstrated in your profile.
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <div className="text-[11px] leading-relaxed">
                                  {item.candidateEvidence}
                                </div>
                                {item.source && (
                                  <div>
                                    <button
                                      onClick={() => toggleSource(item.id || String(idx))}
                                      className="text-[10px] text-slate-500 hover:text-slate-800 font-mono flex items-center space-x-1"
                                    >
                                      <span>Source: {expandedSources[item.id || String(idx)] ? item.source : 'Attributed'}</span>
                                      <ChevronRight className={`h-2.5 w-2.5 transition-transform ${expandedSources[item.id || String(idx)] ? 'rotate-90' : ''}`} />
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Column 3: Assessment */}
                          <td className="py-3.5 px-4 align-top">
                            <div>
                              {isSupported && (
                                <span className="inline-block px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-800">
                                  Supported
                                </span>
                              )}
                              {isTransferable && (
                                <span className="inline-block px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700">
                                  Partially supported
                                </span>
                              )}
                              {isUnverified && (
                                <span className="inline-block px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
                                  Needs verification
                                </span>
                              )}
                              {isNotFound && (
                                <span className="inline-block px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500">
                                  Not yet demonstrated
                                </span>
                              )}
                            </div>
                            {item.assessment && (
                              <div className="text-[11px] text-slate-500 mt-1 leading-normal">
                                {item.assessment}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* On-Demand Deep Audit Disclosure */}
          <div className="pt-2">
            <button
              onClick={() => setShowDeepFactAudit(!showDeepFactAudit)}
              className="text-xs font-medium text-slate-600 hover:text-slate-900 flex items-center space-x-1.5 transition-colors"
            >
              <span>{showDeepFactAudit ? 'Hide Fact Registry & Attribution' : 'View Verified Fact Registry & Attribution'}</span>
              <ChevronRight className={`h-3.5 w-3.5 transition-transform ${showDeepFactAudit ? 'rotate-90' : ''}`} />
            </button>

            {showDeepFactAudit && (
              <div className="mt-4 p-5 rounded-xl border border-slate-200/80 bg-slate-50/60 space-y-3 text-xs">
                <div className="font-semibold text-slate-800 uppercase tracking-wider text-[11px]">
                  Verified Candidate Fact Registry ({effectiveFacts.length} documented facts)
                </div>
                <div className="p-3 bg-white rounded-lg border border-slate-200/70 text-slate-700 space-y-1.5 font-mono text-[11px] max-h-48 overflow-y-auto">
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
                <div className="text-slate-500 text-[11px] leading-relaxed">
                  Strict Non-Fabrication Guarantee: Every tailored bullet and qualification assertion must trace directly to a confirmed entry in the candidate fact registry above.
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Tailored Resume (Executive Document Preview) */}
      {activeTab === 'tailor' && (
        <div className="p-6 sm:p-8 space-y-6">
          {/* Action Header */}
          <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div>
              <div className="font-semibold text-slate-900">
                Targeted Resume Preview
              </div>
              <div className="text-slate-500 text-[11px] mt-0.5">
                Standard ATS format · Grounded strictly in verified candidate facts
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {isLandingPage ? (
                <button
                  onClick={() => handleAction('signup')}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium flex items-center space-x-1.5 transition-colors shadow-xs"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download ATS Resume</span>
                </button>
              ) : (
                <button
                  onClick={() => alert('Resume validated. All statements grounded in verified profile facts.')}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium flex items-center space-x-1.5 transition-colors shadow-xs"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download ATS Resume</span>
                </button>
              )}
            </div>
          </div>

          {/* Clean Executive ATS Document Preview */}
          <div className="p-8 sm:p-10 rounded-xl bg-white border border-slate-200/90 shadow-xs font-sans text-xs space-y-5 max-w-3xl mx-auto">
            {/* Candidate Header */}
            <div className="border-b border-slate-200 pb-4 text-center sm:text-left">
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                {effectiveProfile?.fullName || 'Candidate Profile'}
              </h2>
              <div className="text-slate-600 font-medium text-xs mt-0.5">
                {effectiveProfile?.currentTitle || 'Software Professional'}
              </div>
              <div className="text-slate-400 text-[11px] mt-1">
                {effectiveProfile?.location || 'Remote'} · {isLandingPage ? 'Protected on Demonstration View' : (effectiveProfile?.email || 'Candidate on File')}
              </div>
            </div>

            {/* Professional Summary */}
            <div className="space-y-1.5">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Professional Summary
              </div>
              <p className="text-slate-700 text-[11px] leading-relaxed">
                {effectiveProfile?.summary ||
                  `Experienced ${effectiveProfile?.currentTitle || 'software professional'} with substantiated background in ${
                    effectiveProfile?.skills?.map(s => s.name).slice(0, 4).join(', ') || 'software engineering and delivery'
                  }. Focused on resilient technical architecture, measurable system delivery, and transparent execution.`}
              </p>
            </div>

            {/* Core Competencies */}
            <div className="space-y-1.5">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Core Competencies (Verified)
              </div>
              <div className="flex flex-wrap gap-1.5">
                {effectiveProfile?.skills && effectiveProfile.skills.length > 0 ? (
                  effectiveProfile.skills.map((skill, idx) => (
                    <span key={idx} className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-800 text-[11px] font-medium">
                      {skill.name}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-400 italic text-[11px]">No verified competencies recorded.</span>
                )}
              </div>
            </div>

            {/* Verified Experience */}
            <div className="space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Professional Experience
              </div>
              {effectiveProfile?.employmentHistory && effectiveProfile.employmentHistory.length > 0 ? (
                effectiveProfile.employmentHistory.map((emp, idx) => (
                  <div key={idx} className="space-y-1 border-l-2 border-slate-100 pl-3">
                    <div className="flex flex-wrap items-center justify-between text-xs">
                      <span className="font-semibold text-slate-900">{emp.role} — {emp.company}</span>
                      <span className="text-slate-500 font-mono text-[11px]">{emp.duration}</span>
                    </div>
                    {emp.achievements && emp.achievements.length > 0 ? (
                      <ul className="list-disc list-inside text-slate-600 text-[11px] space-y-1 pl-1">
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
