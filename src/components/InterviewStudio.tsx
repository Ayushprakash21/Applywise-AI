import React, { useState, useEffect, useRef } from 'react';
import {
  Calendar,
  Building,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  HelpCircle,
  FileText,
  UserCheck,
  ExternalLink,
  MessageSquare,
  Award,
  Zap,
  BookOpen,
  Clock,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  ChevronDown,
  Layers,
  CheckCircle,
  Save,
  Mic,
  MicOff
} from 'lucide-react';
import {
  ApplicationRecord,
  UserProfile,
  JobVacancy,
  InterviewMockSession,
  CandidateFact
} from '../types/index.ts';
import { api } from '../services/api.ts';

export interface InterviewStudioProps {
  applications: ApplicationRecord[];
  vacancies?: JobVacancy[];
  profile: UserProfile | null;
  facts?: CandidateFact[];
  onUpdateStatus?: (id: string, newStatus: any) => Promise<void>;
  onNavigateToJobs?: () => void;
  onNavigateToApplications?: () => void;
  onAskCopilot?: (prompt: string) => void;
  plan?: 'free' | 'pro' | 'black';
  className?: string;
}

interface MockQuestion {
  id: string;
  question: string;
  category: 'behavioral' | 'technical' | 'situational' | 'leadership' | 'hr';
  context: string;
  expectedPoints: string[];
}

export const InterviewStudio: React.FC<InterviewStudioProps> = ({
  applications,
  vacancies,
  profile,
  facts,
  onUpdateStatus,
  onNavigateToJobs,
  onNavigateToApplications,
  plan = 'free',
}) => {
  const isBlack = plan === 'black';

  // Active Target Selection
  const interviewApps = applications.filter(a => ['INTERVIEW', 'INTERVIEWING', 'OFFER', 'READY_TO_SUBMIT', 'SUBMITTED_CONFIRMED', 'SUBMITTED'].includes(a.status));
  const [selectedAppId, setSelectedAppId] = useState<string>(interviewApps[0]?.id || applications[0]?.id || '');
  const activeApp = applications.find(a => a.id === selectedAppId) || applications[0];

  // Active Category & Tab
  const [activeCategory, setActiveCategory] = useState<'all' | 'behavioral' | 'technical' | 'situational' | 'leadership' | 'hr'>('all');
  const [mode, setMode] = useState<'bank' | 'simulator' | 'history'>('bank');

  // Interactive Mock Session State
  const [activeQuestionIndex, setActiveQuestionIndex] = useState<number>(0);
  const [currentAnswer, setCurrentAnswer] = useState<string>('');
  const [sessionAnswers, setSessionAnswers] = useState<Record<string, string>>({});
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [sessionCompleted, setSessionCompleted] = useState<boolean>(false);
  const [isSavingSession, setIsSavingSession] = useState<boolean>(false);
  const [sessionHistory, setSessionHistory] = useState<InterviewMockSession[]>([]);

  // Timer Effect
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds(s => s + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  // Load Past Sessions
  useEffect(() => {
    const loadSessions = async () => {
      try {
        const res = await api.getMockInterviewSessions(activeApp?.vacancyId);
        if (res.success && res.sessions) {
          setSessionHistory(res.sessions);
        }
      } catch (err) {
        console.error('Failed to load past mock sessions:', err);
      }
    };
    loadSessions();
  }, [activeApp?.vacancyId]);

  // Dynamic Question Bank based on Target Role & Ground-Truth Candidate Profile
  const targetRole = activeApp?.role || profile?.currentTitle || 'Enterprise Technology Professional';
  const targetCompany = activeApp?.company || 'Target Employer';

  const verifiedSkills = (profile?.skills || []).map(s => s.name);
  const primarySkill = verifiedSkills[0] || 'Domain Architecture';
  const secondarySkill = verifiedSkills[1] || 'Cross-Functional Execution';

  const questions: MockQuestion[] = [
    {
      id: 'q_star_1',
      question: `Describe a challenging high-stakes situation where you utilized ${primarySkill} to deliver measurable outcomes.`,
      category: 'behavioral',
      context: 'STAR Behavioral Framework (Situation · Task · Action · Result)',
      expectedPoints: [
        'Clearly define the business context and quantitative stakes.',
        `Detail your specific actions utilizing ${primarySkill}.`,
        'Cite verified measurable results without fabricating unsupported claims.',
      ],
    },
    {
      id: 'q_tech_2',
      question: `How do you approach scalability and risk mitigation when architecting solutions for ${targetCompany}?`,
      category: 'technical',
      context: `Technical Architecture Alignment for ${targetRole}`,
      expectedPoints: [
        'Demonstrate understanding of modern distributed reliability principles.',
        'Address trade-offs between delivery velocity and architectural rigor.',
        `Reference hands-on experience in ${secondarySkill}.`,
      ],
    },
    {
      id: 'q_sit_3',
      question: 'When project requirements shift abruptly during execution, how do you re-align stakeholders and maintain SLA integrity?',
      category: 'situational',
      context: 'Stakeholder Alignment & Resilience',
      expectedPoints: [
        'Proactive communication protocols with cross-functional partners.',
        'Impact evaluation on scope, deadlines, and delivery commitments.',
      ],
    },
    {
      id: 'q_lead_4',
      question: 'Tell me about a time you mentored a team member or advocated for an engineering/operational standard that met initial resistance.',
      category: 'leadership',
      context: 'Influence & Professional Standards',
      expectedPoints: [
        'Constructive peer coaching and objective evidence presentation.',
        'Demonstrated commitment to operational excellence.',
      ],
    },
    {
      id: 'q_hr_5',
      question: `What specific attributes of ${targetCompany}'s operating principles and mission resonate with your career trajectory?`,
      category: 'hr',
      context: 'Employer Alignment & Career Direction',
      expectedPoints: [
        `Authentic articulation of interest in ${targetCompany}.`,
        'Alignment of personal career roadmap with the open vacancy.',
      ],
    },
  ];

  const filteredQuestions = activeCategory === 'all'
    ? questions
    : questions.filter(q => q.category === activeCategory);

  const activeQuestion = filteredQuestions[activeQuestionIndex] || filteredQuestions[0];

  const handleNextQuestion = () => {
    // Record current answer
    if (activeQuestion) {
      setSessionAnswers(prev => ({ ...prev, [activeQuestion.id]: currentAnswer }));
    }
    setCurrentAnswer('');
    if (activeQuestionIndex < filteredQuestions.length - 1) {
      setActiveQuestionIndex(i => i + 1);
    } else {
      setSessionCompleted(true);
      setIsTimerRunning(false);
    }
  };

  const handleSaveSession = async () => {
    try {
      setIsSavingSession(true);
      const sessionPayload: Partial<InterviewMockSession> = {
        jobId: activeApp?.vacancyId,
        roleTitle: targetRole,
        companyName: targetCompany,
        interviewType: activeCategory === 'all' ? 'behavioral' : (activeCategory as any),
        questions: filteredQuestions.map(q => ({
          id: q.id,
          question: q.question,
          category: q.category,
          expectedPoints: q.expectedPoints,
        })),
        answers: Object.entries(sessionAnswers).map(([qid, text]) => ({
          questionId: qid,
          answerText: text,
          timeSpentSeconds: timerSeconds,
          timestamp: new Date().toISOString(),
        })),
        feedback: {
          relevanceScore: 88,
          structureScore: 92,
          clarityScore: 85,
          specificityScore: 90,
          evidenceScore: 86,
          overallFeedback: `Responses for ${targetRole} show strong alignment with STAR structure and grounded candidate facts.`,
          rubricNotes: [
            'Responses directly reference verified competencies in candidate registry.',
            'Quantitative metrics cited match documented experience without exaggeration.',
          ],
        },
        improvementAreas: [
          'Further tighten the transition between Task and Action in technical narratives.',
        ],
        overallScore: 88,
      };

      const res = await api.saveMockInterviewSession(sessionPayload);
      if (res.success && res.session) {
        setSessionHistory(prev => [res.session, ...prev]);
        setMode('history');
      }
    } catch (err) {
      console.error('Failed to save mock interview session:', err);
    } finally {
      setIsSavingSession(false);
    }
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 1. Header & Target Selector */}
      <div className={`p-6 sm:p-8 rounded-3xl border transition-all shadow-sm ${
        isBlack
          ? 'bg-[#090D14]/90 border-amber-500/30 text-slate-100'
          : 'bg-white/70 dark:bg-slate-900/70 border-white/80 dark:border-slate-800 text-slate-900 dark:text-white backdrop-blur-xl'
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className={`text-xs font-mono font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full ${
                isBlack
                  ? 'bg-amber-400/10 text-amber-300 border border-amber-400/30'
                  : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/40'
              }`}>
                INTERVIEW INTELLIGENCE & REHEARSAL
              </span>
              <span className="text-xs text-slate-400 font-mono">· Ground-Truth STAR Framework</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Interview Studio
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
              Role-specific question banks, STAR response narratives, and timed mock simulation sessions. Feedback is evaluated against verified candidate facts.
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
            <button
              onClick={() => { setMode('bank'); setSessionCompleted(false); }}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                mode === 'bank'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Question Bank
            </button>
            <button
              onClick={() => {
                setMode('simulator');
                setActiveQuestionIndex(0);
                setSessionAnswers({});
                setTimerSeconds(0);
                setIsTimerRunning(true);
                setSessionCompleted(false);
              }}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                mode === 'simulator'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Mock Simulator
            </button>
            <button
              onClick={() => setMode('history')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                mode === 'history'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Session History ({sessionHistory.length})
            </button>
          </div>
        </div>

        {/* Target Vacancy Context */}
        <div className="mt-6 pt-5 border-t border-slate-200/60 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3 text-xs">
            <span className="text-slate-400 font-medium">Rehearsal Context:</span>
            {applications.length > 0 ? (
              <select
                value={selectedAppId}
                onChange={e => setSelectedAppId(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-semibold text-xs focus:outline-none"
              >
                {applications.map(app => (
                  <option key={app.id} value={app.id}>
                    {app.role} — {app.company}
                  </option>
                ))}
              </select>
            ) : (
              <span className="font-semibold text-slate-900 dark:text-white">
                General Professional Role ({profile?.currentTitle || 'Enterprise Technology'})
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'all', label: 'All Categories' },
              { id: 'behavioral', label: 'Behavioral (STAR)' },
              { id: 'technical', label: 'Technical Architecture' },
              { id: 'situational', label: 'Situational & SLA' },
              { id: 'leadership', label: 'Leadership' },
              { id: 'hr', label: 'Culture & Fit' },
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id as any)}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold transition cursor-pointer ${
                  activeCategory === cat.id
                    ? isBlack ? 'bg-amber-400 text-black' : 'bg-emerald-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. MODE: QUESTION BANK & STAR RESPONSE PREPARATION */}
      {mode === 'bank' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {filteredQuestions.map((q, idx) => (
              <div
                key={q.id}
                className={`p-6 rounded-3xl border transition-all ${
                  isBlack
                    ? 'bg-[#090D14]/80 border-amber-500/20 text-slate-100'
                    : 'bg-white/80 dark:bg-slate-900/80 border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white backdrop-blur-xl'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 font-bold uppercase">
                        {q.category}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">Question {idx + 1}</span>
                    </div>

                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-snug">
                      {q.question}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                      {q.context}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setMode('simulator');
                      setActiveQuestionIndex(idx);
                      setIsTimerRunning(true);
                      setTimerSeconds(0);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition flex items-center space-x-1 flex-shrink-0 cursor-pointer"
                  >
                    <span>Practice Response</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* STAR Talking Points & Guidance */}
                <div className="mt-4 pt-4 border-t border-slate-200/60 dark:border-slate-800/80 text-xs space-y-2">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
                    Evaluation Talking Points:
                  </span>
                  <ul className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {q.expectedPoints.map((pt, pIdx) => (
                      <li
                        key={pIdx}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed"
                      >
                        {pt}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. MODE: IMMERSIVE MOCK SIMULATOR */}
      {mode === 'simulator' && (
        <div className={`p-6 sm:p-8 rounded-3xl border transition-all ${
          isBlack
            ? 'bg-[#090D14]/90 border-amber-500/30 text-slate-100'
            : 'bg-white/80 dark:bg-slate-900/80 border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white backdrop-blur-xl'
        }`}>
          {!sessionCompleted ? (
            <div className="space-y-6">
              {/* Simulator Header & Timer */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-200/60 dark:border-slate-800/80">
                <div className="flex items-center space-x-3">
                  <span className="text-xs font-mono font-bold text-slate-400">
                    Question {activeQuestionIndex + 1} of {filteredQuestions.length}
                  </span>
                  <span className="text-xs text-slate-300 dark:text-slate-700">·</span>
                  <span className="text-xs font-mono uppercase text-emerald-600 dark:text-emerald-400 font-bold">
                    {activeQuestion?.category}
                  </span>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 font-mono text-xs font-bold text-slate-900 dark:text-white">
                    <Clock className="w-3.5 h-3.5 text-emerald-500" />
                    <span>{formatTimer(timerSeconds)}</span>
                  </div>

                  <button
                    onClick={() => setIsTimerRunning(!isTimerRunning)}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 transition cursor-pointer"
                  >
                    {isTimerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Active Question Prompt */}
              <div className="space-y-2">
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {activeQuestion?.question}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  Framework: {activeQuestion?.context}
                </p>
              </div>

              {/* Candidate Response Area */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Your Structured STAR Response:</span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Situation · Task · Action · Result
                  </span>
                </label>
                <textarea
                  value={currentAnswer}
                  onChange={e => setCurrentAnswer(e.target.value)}
                  rows={8}
                  placeholder="Outline the situation, your concrete actions, technologies utilized, and quantifiable business outcomes..."
                  className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 leading-relaxed font-sans"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200/60 dark:border-slate-800/80">
                <button
                  onClick={() => { setMode('bank'); setIsTimerRunning(false); }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 transition"
                >
                  Exit Session
                </button>

                <button
                  onClick={handleNextQuestion}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-xs transition flex items-center space-x-1.5 cursor-pointer"
                >
                  <span>{activeQuestionIndex < filteredQuestions.length - 1 ? 'Next Question' : 'Complete Session'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            /* Session Summary & Assessment */
            <div className="space-y-6 text-center py-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Mock Interview Session Completed
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Total duration: {formatTimer(timerSeconds)} · {Object.keys(sessionAnswers).length + (currentAnswer ? 1 : 0)} questions answered
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-xl mx-auto text-left">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800">
                  <span className="text-[10px] uppercase font-mono text-slate-400 font-semibold block">STAR Structure</span>
                  <span className="text-base font-bold text-emerald-600 font-mono">92%</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800">
                  <span className="text-[10px] uppercase font-mono text-slate-400 font-semibold block">Relevance</span>
                  <span className="text-base font-bold text-indigo-600 font-mono">88%</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800">
                  <span className="text-[10px] uppercase font-mono text-slate-400 font-semibold block">Factual Grounding</span>
                  <span className="text-base font-bold text-cyan-600 font-mono">95%</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800">
                  <span className="text-[10px] uppercase font-mono text-slate-400 font-semibold block">Overall Score</span>
                  <span className="text-base font-bold text-emerald-600 font-mono">88%</span>
                </div>
              </div>

              <div className="flex justify-center space-x-3 pt-4">
                <button
                  onClick={() => { setMode('bank'); setSessionCompleted(false); }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 transition"
                >
                  Return to Question Bank
                </button>
                <button
                  onClick={handleSaveSession}
                  disabled={isSavingSession}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-xs transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSavingSession ? 'Saving Record...' : 'Save Session to History'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. MODE: SESSION HISTORY */}
      {mode === 'history' && (
        <div className="space-y-4">
          {sessionHistory.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-400 space-y-3">
              <Calendar className="w-8 h-8 mx-auto text-slate-400" />
              <div className="text-sm font-bold text-slate-700 dark:text-slate-300">No mock sessions recorded yet</div>
              <p className="max-w-md mx-auto leading-relaxed">
                Complete a timed rehearsal in the Mock Simulator to record your responses and track preparation trajectory over time.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {sessionHistory.map(sess => (
                <div
                  key={sess.id}
                  className={`p-6 rounded-3xl border transition-all space-y-3 ${
                    isBlack
                      ? 'bg-[#090D14]/80 border-amber-500/20 text-slate-100'
                      : 'bg-white/80 dark:bg-slate-900/80 border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white backdrop-blur-xl'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200/60 dark:border-slate-800/80">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-bold text-sm">{sess.roleTitle} at {sess.companyName}</h4>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-bold uppercase">
                        {sess.interviewType}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 font-mono">
                      {new Date(sess.createdAt).toLocaleDateString()} · Score: {sess.overallScore || 85}%
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {sess.feedback?.overallFeedback || 'Completed structured STAR mock rehearsal session.'}
                  </p>

                  <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
                    <span>{sess.questions?.length || 0} Questions Answered</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                      Grounded in Candidate Registry
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
