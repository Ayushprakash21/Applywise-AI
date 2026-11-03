import React, { useState, useEffect } from 'react';
import {
  Brain,
  ShieldCheck,
  Award,
  AlertTriangle,
  Target,
  Compass,
  CheckCircle2,
  BookOpen,
  ArrowRight,
  Sparkles,
  ExternalLink,
  Clock,
  Layers,
  GraduationCap
} from 'lucide-react';
import { UserProfile, CareerPreferences, CareerRoadmap, CareerRoadmapItem } from '../types/index.ts';
import { api } from '../services/api.ts';

interface PersonalCareerIntelligenceViewProps {
  profile: UserProfile | null;
  preferences: CareerPreferences | null;
  onOpenRoadmapProject?: (item: CareerRoadmapItem) => void;
  className?: string;
}

export const PersonalCareerIntelligenceView: React.FC<PersonalCareerIntelligenceViewProps> = ({
  profile,
  preferences,
  onOpenRoadmapProject,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState<'strengths' | 'gaps' | 'roadmap' | 'advice'>('strengths');
  const [roadmap, setRoadmap] = useState<CareerRoadmap | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchRoadmap = async () => {
      setIsLoading(true);
      try {
        const res = await api.getCareerRoadmap(profile?.currentTitle);
        if (res.success) {
          setRoadmap(res.roadmap);
        }
      } catch (err) {
        console.error('Failed to load career roadmap:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRoadmap();
  }, [profile?.currentTitle]);

  const verifiedSkills = (profile?.skills || []).filter(s => s.verified);
  const unverifiedSkills = (profile?.skills || []).filter(s => !s.verified);
  const experiences = profile?.experiences || [];

  return (
    <div className={`p-5 rounded-2xl neu-surface border border-white/80 shadow-md ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700/60 gap-3">
        <div className="flex items-center space-x-2">
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600">
            <Brain className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
              Personal Career Intelligence
            </h3>
            <p className="text-xs text-slate-500">Grounded Candidate Strengths, Evidence & Advancement Roadmap</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center p-1 rounded-xl neu-inset text-xs font-medium overflow-x-auto">
          <button
            onClick={() => setActiveTab('strengths')}
            className={`px-3 py-1 rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'strengths'
                ? 'bg-white shadow-xs text-purple-600 font-bold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Strengths ({verifiedSkills.length})
          </button>
          <button
            onClick={() => setActiveTab('gaps')}
            className={`px-3 py-1 rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'gaps'
                ? 'bg-white shadow-xs text-purple-600 font-bold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Market Gaps
          </button>
          <button
            onClick={() => setActiveTab('roadmap')}
            className={`px-3 py-1 rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'roadmap'
                ? 'bg-white shadow-xs text-purple-600 font-bold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Roadmap ({roadmap?.prioritizedGaps?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('advice')}
            className={`px-3 py-1 rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'advice'
                ? 'bg-white shadow-xs text-purple-600 font-bold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Strategic Advice
          </button>
        </div>
      </div>

      {/* Tab 1: Candidate Strengths & Evidence */}
      {activeTab === 'strengths' && (
        <div className="pt-4 space-y-4">
          {/* Verified Skills */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 font-mono mb-2 flex items-center space-x-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>Verified Functional Skills & Competencies</span>
            </h4>
            <div className="flex flex-wrap gap-2">
              {verifiedSkills.length > 0 ? (
                verifiedSkills.map((sk, idx) => (
                  <div
                    key={idx}
                    className="px-2.5 py-1 rounded-xl bg-white/80 dark:bg-slate-900/60 border border-emerald-200 text-xs font-medium text-slate-800 dark:text-slate-200 flex items-center space-x-1.5 shadow-2xs"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    <span>{sk.name}</span>
                    <span className="text-[10px] uppercase font-mono text-slate-400">({sk.category})</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 italic">No verified skills attached to profile yet.</p>
              )}
            </div>
          </div>

          {/* Extracted Experience Achievements */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 font-mono mb-2 flex items-center space-x-1.5">
              <Award className="h-4 w-4 text-blue-600" />
              <span>Ground Truth Impact Highlights</span>
            </h4>
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {experiences.flatMap(e => e.achievements || []).length > 0 ? (
                experiences.flatMap((e, eIdx) =>
                  (e.achievements || []).map((ach, aIdx) => (
                    <div
                      key={`${eIdx}-${aIdx}`}
                      className="p-2.5 rounded-xl bg-white/60 dark:bg-slate-900/40 border border-slate-200/80 text-xs text-slate-700 dark:text-slate-300 flex items-start space-x-2"
                    >
                      <span className="text-blue-500 font-bold">•</span>
                      <span>
                        <strong className="text-slate-900 dark:text-white">{e.company}:</strong> {ach}
                      </span>
                    </div>
                  ))
                )
              ) : (
                <p className="text-xs text-slate-400 italic">Upload your resume to extract factual accomplishments.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Market Gaps */}
      {activeTab === 'gaps' && (
        <div className="pt-4 space-y-3">
          <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 text-xs text-amber-900 dark:text-amber-300 flex items-start space-x-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              <strong>Market Gap Benchmark:</strong> Based on live vacancies matching target roles (
              {preferences?.targetRoles?.join(', ') || profile?.currentTitle || 'Software Engineer'}), these
              skills appear regularly in job requirements but are unverified in your current profile.
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {roadmap?.prioritizedGaps?.filter(i => i.isEssential).map((item, idx) => (
              <div key={idx} className="p-3.5 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">{item.skill}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200 uppercase">
                    Essential Gap
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300">{item.recommendedAction}</p>
                <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400 font-mono">
                  <span>Effort: {item.learningEffort}</span>
                  <span>Impact: High</span>
                </div>
              </div>
            )) || (
              <p className="text-xs text-slate-400 italic col-span-2">No critical market gaps detected.</p>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Career Improvement Roadmap */}
      {activeTab === 'roadmap' && (
        <div className="pt-4 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-slate-500 pb-2">
            <span>Role Target: <strong>{profile?.currentTitle || 'Target Career'}</strong></span>
            <span>{roadmap?.prioritizedGaps?.length || 0} Recommended Milestones</span>
          </div>

          <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
            {roadmap?.prioritizedGaps?.map(item => (
              <div
                key={item.id}
                className="p-3.5 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 hover:border-purple-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {item.skill}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border uppercase ${
                        item.isEssential
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}
                    >
                      {item.isEssential ? 'Essential Qualification' : 'Optional Growth'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300">
                    {item.recommendedAction}
                  </p>
                  {item.realisticCoursesOrProjects?.[0] && (
                    <p className="text-[10px] text-purple-600 font-medium">
                      Project: {item.realisticCoursesOrProjects[0].title} (~{item.realisticCoursesOrProjects[0].estimatedTime})
                    </p>
                  )}
                </div>

                <div className="flex items-center space-x-3 shrink-0">
                  <span className="text-xs font-mono text-slate-500 capitalize">
                    {item.learningEffort} effort
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Strategic Advice */}
      {activeTab === 'advice' && (
        <div className="pt-4 space-y-3">
          <div className="p-4 rounded-xl neu-inset space-y-2 text-xs text-slate-700 dark:text-slate-300">
            <h4 className="font-bold text-slate-900 dark:text-white flex items-center space-x-1.5 font-mono text-xs uppercase text-purple-600">
              <Sparkles className="h-4 w-4" />
              <span>Grounded Application Strategy</span>
            </h4>
            <p>
              1. <strong>Lead with Verified Depth:</strong> Target roles where your core verified skills (
              {verifiedSkills.slice(0, 3).map(s => s.name).join(', ') || 'verified skills'}) form 80%+ of the primary requirements.
            </p>
            <p>
              2. <strong>Bridge Don't Bluff:</strong> When applying to stretch roles, frame transferable experience as operational exposure rather than claiming full end-to-end mastery.
            </p>
            <p>
              3. <strong>Prepare Evidence Talking Points:</strong> In interviews, prepare STAR stories around your quantifiable achievements: {experiences[0]?.achievements?.[0] || 'your core career achievements'}.
            </p>
          </div>
        </div>
      )}

      {/* Ethical Grounding Footer */}
      <p className="mt-3 text-[10px] text-slate-400 text-center font-mono">
        All insights are computed from your uploaded resume and live employer job specifications.
      </p>
    </div>
  );
};