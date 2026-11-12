import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Award,
  BookOpen,
  Briefcase,
  Target,
  Plus,
  Trash2,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Check,
  X
} from 'lucide-react';
import {
  CareerDigitalTwin,
  DigitalTwinSkill,
  DigitalTwinExperience,
  TransferableSkillBridge,
  CareerOutcomeItem
} from '../types/index.ts';
import { api } from '../services/api.ts';
import { SearchableSelect } from './ui/SelectSystem.tsx';

interface CareerTwinPageProps {
  onShowToast: (msg: string) => void;
}

export const CareerTwinPage: React.FC<CareerTwinPageProps> = ({ onShowToast }) => {
  const [twin, setTwin] = useState<CareerDigitalTwin | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'skills' | 'transferable' | 'experience' | 'outcomes'>('overview');
  const [skillFilter, setSkillFilter] = useState<'all' | 'confirmed' | 'inferred' | 'unverified'>('all');

  // Transferable skills tester
  const [targetRoleInput, setTargetRoleInput] = useState('');
  const [targetDescInput, setTargetDescInput] = useState('');
  const [customBridges, setCustomBridges] = useState<TransferableSkillBridge[]>([]);
  const [isEvaluatingBridges, setIsEvaluatingBridges] = useState(false);

  // New skill form modal
  const [showAddSkillModal, setShowAddSkillModal] = useState(false);
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillCategory, setNewSkillCategory] = useState<DigitalTwinSkill['category']>('frontend');
  const [newSkillProficiency, setNewSkillProficiency] = useState<DigitalTwinSkill['proficiency']>('proficient');
  const [newSkillYears, setNewSkillYears] = useState(2);
  const [newSkillNotes, setNewSkillNotes] = useState('');

  // Outcomes & Insights
  const [outcomes, setOutcomes] = useState<CareerOutcomeItem[]>([]);
  const [insights, setInsights] = useState<{
    recurringSkillGaps: Array<{ skill: string; frequency: number }>;
    conversionStats: { applied: number; interview: number; offer: number; rejected: number };
    recommendations: string[];
  } | null>(null);
  const [showAddOutcomeModal, setShowAddOutcomeModal] = useState(false);
  const [newOutcomeRole, setNewOutcomeRole] = useState('');
  const [newOutcomeCompany, setNewOutcomeCompany] = useState('');
  const [newOutcomeType, setNewOutcomeType] = useState<CareerOutcomeItem['outcomeType']>('INTERVIEW_INVITATION');
  const [newOutcomeNotes, setNewOutcomeNotes] = useState('');

  const loadTwinData = async () => {
    setIsLoading(true);
    try {
      const [twinRes, outRes, insRes] = await Promise.all([
        api.getCareerTwin(),
        api.getCareerOutcomes().catch(() => ({ success: true, outcomes: [] })),
        api.getCareerTwinInsights().catch(() => ({ success: true, insights: null }))
      ]);

      if (twinRes.success && twinRes.twin) {
        setTwin(twinRes.twin);
        if (twinRes.twin.transferableBridges?.length > 0) {
          setCustomBridges(twinRes.twin.transferableBridges);
        }
      }
      if (outRes.success) {
        setOutcomes(outRes.outcomes || []);
      }
      if (insRes.success && insRes.insights) {
        setInsights(insRes.insights);
      }
    } catch (err: any) {
      onShowToast(err.message || 'Failed to load Career Digital Twin');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTwinData();
  }, []);

  const handleConfirmInference = async (skillId?: string, expId?: string) => {
    if (!twin) return;
    const now = new Date().toISOString();

    let updatedSkills = [...twin.skillsInventory];
    if (skillId) {
      updatedSkills = updatedSkills.map(s => {
        if (s.id === skillId) {
          return {
            ...s,
            provenance: {
              ...s.provenance,
              confidence: 'confirmed' as const,
              source: 'user_confirmed' as const,
              confirmedAt: now
            }
          };
        }
        return s;
      });
    }

    let updatedExps = [...twin.workExperiences];
    if (expId) {
      updatedExps = updatedExps.map(e => {
        if (e.id === expId) {
          return {
            ...e,
            provenance: {
              ...e.provenance,
              confidence: 'confirmed' as const,
              source: 'user_confirmed' as const,
              confirmedAt: now
            }
          };
        }
        return e;
      });
    }

    setIsSaving(true);
    try {
      const res = await api.updateCareerTwin({
        skillsInventory: updatedSkills,
        workExperiences: updatedExps,
      });
      if (res.success) {
        setTwin(res.twin);
        onShowToast('Fact confirmed and locked to Career Twin!');
      }
    } catch (err: any) {
      onShowToast(err.message || 'Failed to confirm fact');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDismissInference = async (skillId?: string) => {
    if (!twin) return;
    const updatedSkills = twin.skillsInventory.filter(s => s.id !== skillId);

    setIsSaving(true);
    try {
      const res = await api.updateCareerTwin({
        skillsInventory: updatedSkills,
      });
      if (res.success) {
        setTwin(res.twin);
        onShowToast('Inference dismissed.');
      }
    } catch (err: any) {
      onShowToast(err.message || 'Failed to dismiss inference');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddVerifiedSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twin || !newSkillName.trim()) return;

    const newSkill: DigitalTwinSkill = {
      id: crypto.randomUUID(),
      name: newSkillName.trim(),
      category: newSkillCategory,
      proficiency: newSkillProficiency,
      yearsExperience: Number(newSkillYears) || 1,
      provenance: {
        source: 'user_confirmed',
        confidence: 'confirmed',
        confirmedAt: new Date().toISOString(),
        notes: newSkillNotes.trim() || undefined
      }
    };

    const updatedSkills = [newSkill, ...twin.skillsInventory];
    setIsSaving(true);
    try {
      const res = await api.updateCareerTwin({ skillsInventory: updatedSkills });
      if (res.success) {
        setTwin(res.twin);
        setShowAddSkillModal(false);
        setNewSkillName('');
        setNewSkillNotes('');
        onShowToast(`Verified skill "${newSkill.name}" added to Twin!`);
      }
    } catch (err: any) {
      onShowToast(err.message || 'Failed to add skill');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestTransferableBridges = async () => {
    if (!targetRoleInput.trim()) return;
    setIsEvaluatingBridges(true);
    try {
      const res = await api.getTransferableSkills(targetRoleInput.trim(), targetDescInput.trim());
      if (res.success && res.bridges) {
        setCustomBridges(res.bridges);
        onShowToast('Transferable bridges calculated!');
      }
    } catch (err: any) {
      onShowToast(err.message || 'Bridge calculation failed');
    } finally {
      setIsEvaluatingBridges(false);
    }
  };

  const handleAddOutcome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOutcomeRole.trim() || !newOutcomeCompany.trim()) return;

    try {
      const res = await api.recordCareerOutcome({
        company: newOutcomeCompany.trim(),
        role: newOutcomeRole.trim(),
        outcomeType: newOutcomeType,
        outcomeSource: 'user_reported',
        notes: newOutcomeNotes.trim() || undefined,
      });
      if (res.success) {
        setOutcomes(prev => [res.outcome, ...prev]);
        setShowAddOutcomeModal(false);
        setNewOutcomeCompany('');
        setNewOutcomeRole('');
        setNewOutcomeNotes('');
        onShowToast('Outcome successfully recorded!');
        // Refresh insights
        const ins = await api.getCareerTwinInsights();
        if (ins.success) setInsights(ins.insights);
      }
    } catch (err: any) {
      onShowToast(err.message || 'Failed to record outcome');
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-base font-semibold text-slate-800">Synchronizing Career Digital Twin...</h2>
        <p className="text-xs text-slate-500 mt-1">Verifying evidence provenance, claim lineage, and domain bridges</p>
      </div>
    );
  }

  if (!twin) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 text-center">
        <p className="text-slate-600">Could not initialize Career Digital Twin.</p>
        <button
          onClick={loadTwinData}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  const pendingInferences = [
    ...twin.skillsInventory.filter(s => s.provenance.confidence === 'inferred'),
    ...twin.workExperiences.filter(e => e.provenance.confidence === 'inferred')
  ];

  const filteredSkills = twin.skillsInventory.filter(s => {
    if (skillFilter === 'all') return true;
    return s.provenance.confidence === skillFilter;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Page Header */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 mb-8 shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-50/60 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center space-x-2.5 mb-2">
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Evidence-Backed Model</span>
              </span>
              <span className="text-xs text-slate-500 font-medium">v2.0 Integrity Verified</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Career Digital Twin</h1>
            <p className="text-slate-600 text-sm mt-1 max-w-2xl leading-relaxed">
              A persistent, verifiable model of your professional identity. Distinguishes verified facts from AI inferences, prevents hallucinated resume claims, and bridges transferable skills.
            </p>
          </div>

          {/* Completeness Meter */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 min-w-[240px]">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-semibold text-slate-700">Twin Completeness</span>
              <span className="font-extrabold text-blue-600 text-sm font-mono">{twin.completenessScore}%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-600 to-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${twin.completenessScore}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 font-mono">
              <span>{twin.skillsInventory.length} Skills</span>
              <span>{pendingInferences.length} Pending Inferences</span>
            </div>
          </div>
        </div>

        {/* Sub-tab Navigation */}
        <div className="flex items-center space-x-2 mt-6 pt-4 border-t border-slate-100 overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('overview')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap flex items-center space-x-1.5 ${
              activeSubTab === 'overview' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Target className="h-3.5 w-3.5" />
            <span>Overview & Inferences</span>
            {pendingInferences.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-800 font-bold">
                {pendingInferences.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSubTab('skills')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap flex items-center space-x-1.5 ${
              activeSubTab === 'skills' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Award className="h-3.5 w-3.5" />
            <span>Skills Inventory ({twin.skillsInventory.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('transferable')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap flex items-center space-x-1.5 ${
              activeSubTab === 'transferable' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Transferable Bridges</span>
          </button>

          <button
            onClick={() => setActiveSubTab('experience')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap flex items-center space-x-1.5 ${
              activeSubTab === 'experience' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Briefcase className="h-3.5 w-3.5" />
            <span>Verified Experience ({twin.workExperiences.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('outcomes')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap flex items-center space-x-1.5 ${
              activeSubTab === 'outcomes' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            <span>Outcomes & Feedback</span>
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: OVERVIEW & INFERENCES */}
      {activeSubTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Inferences & Summary */}
          <div className="lg:col-span-2 space-y-6">
            {/* Pending Inferences Banner */}
            {pendingInferences.length > 0 ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 shadow-xs">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-5 w-5 text-amber-600" />
                    <h3 className="text-sm font-bold text-amber-900">
                      {pendingInferences.length} AI-Inferred Attribute{pendingInferences.length > 1 ? 's' : ''} Awaiting Review
                    </h3>
                  </div>
                  <span className="text-[11px] font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                    Action Required
                  </span>
                </div>
                <p className="text-xs text-amber-800 mt-1">
                  Our analysis extracted potential skills and role capabilities from your resume text. To safeguard truthfulness, these will not be claimed in tailored applications until you confirm them.
                </p>

                <div className="mt-4 space-y-2.5">
                  {twin.skillsInventory
                    .filter(s => s.provenance.confidence === 'inferred')
                    .map(skill => (
                      <div key={skill.id} className="flex items-center justify-between bg-white rounded-lg p-3 border border-amber-200/80">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-slate-900 text-xs">{skill.name}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-medium capitalize">
                              {skill.category}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Source: {skill.provenance.source} • Inferred proficiency: {skill.proficiency}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleConfirmInference(skill.id)}
                            disabled={isSaving}
                            className="flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-xs"
                          >
                            <Check className="h-3 w-3" />
                            <span>Confirm Fact</span>
                          </button>
                          <button
                            onClick={() => handleDismissInference(skill.id)}
                            disabled={isSaving}
                            className="p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                            title="Dismiss inference"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ) : (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 flex items-center space-x-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-emerald-900">All Twin Data Verified</h4>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    No pending unconfirmed AI inferences. All skills and experiences are locked to your confirmed ground-truth evidence.
                  </p>
                </div>
              </div>
            )}

            {/* Professional Summary */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-bold text-slate-900">Verified Professional Summary</h3>
                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Fact Stated by Candidate</span>
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed bg-slate-50/80 p-3.5 rounded-lg border border-slate-100">
                {twin.professionalSummary || 'No professional summary on file. Update your profile to auto-sync into your Career Twin.'}
              </p>
            </div>

            {/* Provenance Tier Explanation Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">Ground Truth & Lineage Hierarchy</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-white rounded-lg border border-emerald-200">
                  <div className="flex items-center space-x-1.5 text-emerald-700 font-bold mb-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span>User Confirmed</span>
                  </div>
                  <p className="text-[11px] text-slate-600">Strictly verified ground truth. Safe to assert in tailored resumes and ATS screening.</p>
                </div>
                <div className="p-3 bg-white rounded-lg border border-amber-200">
                  <div className="flex items-center space-x-1.5 text-amber-700 font-bold mb-1">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    <span>AI Inferred</span>
                  </div>
                  <p className="text-[11px] text-slate-600">Probable competency discovered in resumes. Requires manual approval before claiming.</p>
                </div>
                <div className="p-3 bg-white rounded-lg border border-slate-200">
                  <div className="flex items-center space-x-1.5 text-slate-600 font-bold mb-1">
                    <span className="h-2 w-2 rounded-full bg-slate-400" />
                    <span>Unverified Claim</span>
                  </div>
                  <p className="text-[11px] text-slate-600">External or unproven statement. Blocked by truthfulness engine if not backed by history.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Col: Career Goals & Learning Objectives */}
          <div className="space-y-6">
            {/* Career Goals */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Target className="h-4 w-4 text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-900">Career Goals</h3>
                </div>
              </div>
              <div className="space-y-2">
                {twin.careerGoals.map((goal, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-blue-50/60 border border-blue-100 text-xs">
                    <span className="text-blue-950 font-medium">{goal}</span>
                    <span className="text-[10px] text-blue-600 font-semibold bg-white px-2 py-0.5 rounded shadow-xs">Active</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Learning Objectives */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <BookOpen className="h-4 w-4 text-indigo-600" />
                  <h3 className="text-sm font-bold text-slate-900">Active Learning Objectives</h3>
                </div>
              </div>
              <div className="space-y-2">
                {twin.learningObjectives.map((obj, idx) => (
                  <div key={idx} className="flex items-center space-x-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 text-xs">
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                    <span className="text-slate-800 font-medium">{obj}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-gradient-to-br from-slate-50 to-blue-50/40 border border-slate-200 rounded-xl p-5">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Integrity Health</h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Verified Work Roles:</span>
                  <span className="font-semibold text-slate-800">{twin.workExperiences.length}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Verified Skills:</span>
                  <span className="font-semibold text-emerald-600">
                    {twin.skillsInventory.filter(s => s.provenance.confidence === 'confirmed').length}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Inferred Candidates:</span>
                  <span className="font-semibold text-amber-600">{pendingInferences.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: VERIFIED SKILLS INVENTORY */}
      {activeSubTab === 'skills' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900">Skills Inventory with Provenance Lineage</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Each skill records its evidence source and verification status. Only confirmed facts are used for automated claims.
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowAddSkillModal(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition shadow-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Verified Skill</span>
              </button>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center space-x-2 mb-6 border-b border-slate-100 pb-3">
            <button
              onClick={() => setSkillFilter('all')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                skillFilter === 'all' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              All Skills ({twin.skillsInventory.length})
            </button>
            <button
              onClick={() => setSkillFilter('confirmed')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition flex items-center space-x-1 ${
                skillFilter === 'confirmed' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-emerald-50 text-emerald-700'
              }`}
            >
              <CheckCircle2 className="h-3 w-3" />
              <span>Confirmed Facts ({twin.skillsInventory.filter(s => s.provenance.confidence === 'confirmed').length})</span>
            </button>
            <button
              onClick={() => setSkillFilter('inferred')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition flex items-center space-x-1 ${
                skillFilter === 'inferred' ? 'bg-amber-600 text-white' : 'text-slate-600 hover:bg-amber-50 text-amber-700'
              }`}
            >
              <AlertCircle className="h-3 w-3" />
              <span>AI Inferred ({twin.skillsInventory.filter(s => s.provenance.confidence === 'inferred').length})</span>
            </button>
            <button
              onClick={() => setSkillFilter('unverified')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                skillFilter === 'unverified' ? 'bg-slate-700 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Unverified ({twin.skillsInventory.filter(s => s.provenance.confidence === 'unverified').length})
            </button>
          </div>

          {/* Skills Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredSkills.map(skill => {
              const isConfirmed = skill.provenance.confidence === 'confirmed';
              const isInferred = skill.provenance.confidence === 'inferred';

              return (
                <div
                  key={skill.id}
                  className={`p-4 rounded-xl border transition ${
                    isConfirmed
                      ? 'bg-slate-50/50 border-slate-200 hover:border-blue-300'
                      : isInferred
                      ? 'bg-amber-50/30 border-amber-200 hover:border-amber-400'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{skill.name}</h4>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-[10px] font-semibold text-slate-600 bg-slate-200/80 px-2 py-0.5 rounded capitalize">
                          {skill.category}
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium">
                          {skill.yearsExperience} yr{skill.yearsExperience > 1 ? 's' : ''} exp
                        </span>
                      </div>
                    </div>
                    {isConfirmed && (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Confirmed Fact</span>
                      </span>
                    )}
                    {isInferred && (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800">
                        <AlertCircle className="h-3 w-3" />
                        <span>Inferred</span>
                      </span>
                    )}
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Proficiency: <strong className="text-slate-700 capitalize">{skill.proficiency}</strong></span>
                    {isInferred ? (
                      <button
                        onClick={() => handleConfirmInference(skill.id)}
                        className="text-emerald-700 hover:text-emerald-800 font-bold hover:underline"
                      >
                        Confirm as Fact
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-400">Locked Ground Truth</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: TRANSFERABLE SKILL BRIDGES */}
      {activeSubTab === 'transferable' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Transferable Skill Intelligence</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                  Maps your verified capabilities into adjacent industries and domains (e.g., Operations into Supply Chain, PM into Solutions Architecture). Shows evidence-backed bridges without inventing false experiences.
                </p>
              </div>
            </div>

            {/* Interactive Bridge Evaluator */}
            <div className="mt-6 bg-slate-50 border border-slate-200 rounded-xl p-4">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">Test Transferable Fit For Target Role</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <input
                  type="text"
                  placeholder="Target Job Title (e.g. Solutions Architect, Product Manager)"
                  value={targetRoleInput}
                  onChange={e => setTargetRoleInput(e.target.value)}
                  className="px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
                <input
                  type="text"
                  placeholder="Optional Job Description or Requirements snippet"
                  value={targetDescInput}
                  onChange={e => setTargetDescInput(e.target.value)}
                  className="px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>
              <button
                onClick={handleTestTransferableBridges}
                disabled={isEvaluatingBridges || !targetRoleInput.trim()}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition flex items-center space-x-1.5 disabled:opacity-50"
              >
                {isEvaluatingBridges ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                <span>Calculate Transferable Bridges</span>
              </button>
            </div>

            {/* Bridges List */}
            <div className="mt-6 space-y-4">
              {customBridges.length > 0 ? (
                customBridges.map((bridge, idx) => (
                  <div key={idx} className="bg-slate-50/70 border border-slate-200 rounded-xl p-5 hover:border-blue-200 transition">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                          Domain Bridge #{idx + 1}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900 mt-1">{bridge.targetRoleCategory}</h4>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-slate-500">Relevance Match:</span>
                        <span className="text-sm font-extrabold text-blue-700 bg-blue-100 px-2.5 py-0.5 rounded-full">
                          {bridge.relevanceScore}%
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 pt-3 border-t border-slate-200/60 text-xs">
                      <div>
                        <h5 className="font-semibold text-slate-700 mb-1.5 flex items-center space-x-1">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          <span>Direct & Transferable Capabilities ({(bridge.directSkills?.length || 0) + (bridge.transferableSkills?.length || 0)})</span>
                        </h5>
                        <div className="flex flex-wrap gap-1.5">
                          {bridge.directSkills?.map((sk: string, sIdx: number) => (
                            <span key={`dir-${sIdx}`} className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 text-[11px] font-medium border border-emerald-200/60">
                              {sk} (Direct)
                            </span>
                          ))}
                          {bridge.transferableSkills?.map((sk: string, sIdx: number) => (
                            <span key={`trans-${sIdx}`} className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 text-[11px] font-medium border border-blue-200/60">
                              {sk} (Transferable)
                            </span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h5 className="font-semibold text-slate-700 mb-1.5 flex items-center space-x-1">
                          <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                          <span>Required Target Gaps ({bridge.missingSkills?.length || 0})</span>
                        </h5>
                        <div className="flex flex-wrap gap-1.5">
                          {bridge.missingSkills?.map((gap: string, gIdx: number) => (
                            <span key={gIdx} className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 text-[11px] font-medium border border-amber-200/60">
                              {gap}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Bridge Narrative */}
                    <div className="mt-4 p-3 rounded-lg bg-white border border-slate-200 text-xs text-slate-700 space-y-1">
                      <div>
                        <strong className="text-slate-900">Transferable Rationale: </strong>
                        <span>{bridge.rationale}</span>
                      </div>
                      {bridge.recommendedAction && (
                        <div>
                          <strong className="text-blue-700">Recommended Action: </strong>
                          <span>{bridge.recommendedAction}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300">
                  <Sparkles className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs text-slate-600 font-medium">No custom transferable bridges evaluated yet.</p>
                  <p className="text-[11px] text-slate-400 mt-1">Enter a target role title above to compute transferable capabilities from your Career Twin.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: VERIFIED WORK EXPERIENCE */}
      {activeSubTab === 'experience' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900">Verified Work History & Lineage</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Ground-truth employers and quantified achievements confirmed in your digital twin.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {twin.workExperiences.map((exp, idx) => (
              <div key={exp.id || idx} className="p-5 rounded-xl border border-slate-200 bg-slate-50/40">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900">{exp.role}</h4>
                    <p className="text-xs font-semibold text-blue-700">{exp.company} • {exp.location || 'Remote'}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-slate-500 font-medium">{exp.startDate} - {exp.current ? 'Present' : exp.endDate}</span>
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>Verified History</span>
                    </span>
                  </div>
                </div>

                {exp.description && (
                  <p className="text-xs text-slate-600 mt-3 leading-relaxed">{exp.description}</p>
                )}

                {exp.achievements && exp.achievements.length > 0 && (
                  <div className="mt-3">
                    <h5 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">Evidenced Achievements:</h5>
                    <ul className="list-disc list-inside space-y-1 text-xs text-slate-600">
                      {exp.achievements.map((ach, aIdx) => (
                        <li key={aIdx}>{ach}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {exp.skillsUsed && exp.skillsUsed.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-200/70 flex flex-wrap gap-1.5">
                    {exp.skillsUsed.map((sk, sIdx) => (
                      <span key={sIdx} className="px-2 py-0.5 rounded bg-slate-200/80 text-slate-700 text-[10px] font-semibold">
                        {sk}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 5: OUTCOMES & FEEDBACK LOOP */}
      {activeSubTab === 'outcomes' && (
        <div className="space-y-6">
          {/* Conversion Metrics */}
          {insights && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                <span className="text-xs text-slate-500 font-medium">Applications Filed</span>
                <p className="text-2xl font-extrabold text-slate-900 mt-1">{insights.conversionStats.applied}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                <span className="text-xs text-slate-500 font-medium">Interviews Secured</span>
                <p className="text-2xl font-extrabold text-blue-600 mt-1">{insights.conversionStats.interview}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                <span className="text-xs text-slate-500 font-medium">Offers Received</span>
                <p className="text-2xl font-extrabold text-emerald-600 mt-1">{insights.conversionStats.offer}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                <span className="text-xs text-slate-500 font-medium">Interview Rate</span>
                <p className="text-2xl font-extrabold text-indigo-600 mt-1">
                  {insights.conversionStats.applied > 0
                    ? `${Math.round((insights.conversionStats.interview / insights.conversionStats.applied) * 100)}%`
                    : '0%'}
                </p>
              </div>
            </div>
          )}

          {/* Adaptive Intelligence Recommendations */}
          {insights && insights.recommendations.length > 0 && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5">
              <div className="flex items-center space-x-2 mb-2">
                <Sparkles className="h-4 w-4 text-blue-700" />
                <h4 className="text-xs font-bold text-blue-950 uppercase tracking-wider">Career Intelligence Insights</h4>
              </div>
              <div className="space-y-2">
                {insights.recommendations.map((rec, rIdx) => (
                  <div key={rIdx} className="flex items-start space-x-2 text-xs text-blue-900">
                    <ArrowRight className="h-3.5 w-3.5 text-blue-600 shrink-0 mt-0.5" />
                    <span>{rec}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Outcomes History */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Application Outcome Tracking</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Record real-world recruiter responses and interview stages to calibrate your Career Twin.
                </p>
              </div>
              <button
                onClick={() => setShowAddOutcomeModal(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition shadow-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Log Outcome</span>
              </button>
            </div>

            <div className="space-y-3">
              {outcomes.length > 0 ? (
                outcomes.map(out => (
                  <div key={out.id} className="flex items-center justify-between p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-900">{out.company}</span>
                        <span className="text-slate-500">— {out.role}</span>
                      </div>
                      {out.notes && <p className="text-[11px] text-slate-600 mt-0.5">{out.notes}</p>}
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        out.outcomeType === 'OFFER_RECEIVED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : out.outcomeType === 'INTERVIEW_INVITATION' || out.outcomeType === 'INTERVIEW_COMPLETED'
                          ? 'bg-blue-100 text-blue-800'
                          : out.outcomeType === 'REJECTION_RECEIVED'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-slate-200 text-slate-800'
                      }`}>
                        {out.outcomeType.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(out.recordedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No outcomes logged yet. When you receive recruiter responses or interviews, log them here to power your career twin feedback loop!
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Verified Skill */}
      {showAddSkillModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">Add Verified Skill</h3>
              <button onClick={() => setShowAddSkillModal(false)} className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddVerifiedSkill} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Skill Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Distributed Systems, Kubernetes, React"
                  value={newSkillName}
                  onChange={e => setNewSkillName(e.target.value)}
                  className="w-full px-3 py-2 min-h-[40px] border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <SearchableSelect
                    value={newSkillCategory}
                    onChange={val => setNewSkillCategory(val as any)}
                    theme="light"
                    size="sm"
                    options={[
                      { value: 'frontend', label: 'Frontend' },
                      { value: 'backend', label: 'Backend' },
                      { value: 'cloud', label: 'Cloud / Infra' },
                      { value: 'ai', label: 'AI / ML' },
                      { value: 'database', label: 'Database' },
                      { value: 'architecture', label: 'Architecture' },
                      { value: 'devops', label: 'DevOps' },
                      { value: 'leadership', label: 'Leadership' },
                      { value: 'business_ops', label: 'Business Ops' },
                      { value: 'supply_chain', label: 'Supply Chain' },
                      { value: 'project_management', label: 'Project Management' },
                      { value: 'general', label: 'General' },
                    ]}
                    ariaLabel="Skill Category"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Proficiency</label>
                  <SearchableSelect
                    value={newSkillProficiency}
                    onChange={val => setNewSkillProficiency(val as any)}
                    searchable={false}
                    theme="light"
                    size="sm"
                    options={[
                      { value: 'expert', label: 'Expert' },
                      { value: 'proficient', label: 'Proficient' },
                      { value: 'familiar', label: 'Familiar' },
                    ]}
                    ariaLabel="Skill Proficiency"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Years of Practical Experience</label>
                <input
                  type="number"
                  min="0"
                  max="40"
                  value={newSkillYears}
                  onChange={e => setNewSkillYears(Number(e.target.value))}
                  className="w-full px-3 py-2 min-h-[40px] border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Evidence or Project Reference (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Led migration to Cloudflare Workers in 2024"
                  value={newSkillNotes}
                  onChange={e => setNewSkillNotes(e.target.value)}
                  className="w-full px-3 py-2 min-h-[40px] border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-2 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddSkillModal(false)}
                  className="px-4 py-2 min-h-[40px] border border-slate-300 rounded-lg text-slate-700 font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !newSkillName.trim()}
                  className="px-4 py-2 min-h-[40px] bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-xs disabled:opacity-50 touch-target"
                >
                  Save Fact to Twin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Outcome */}
      {showAddOutcomeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">Log Application Outcome</h3>
              <button onClick={() => setShowAddOutcomeModal(false)} className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddOutcome} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Company Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Stripe, Linear, Google"
                  value={newOutcomeCompany}
                  onChange={e => setNewOutcomeCompany(e.target.value)}
                  className="w-full px-3 py-2 min-h-[40px] border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Role Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senior Software Engineer"
                  value={newOutcomeRole}
                  onChange={e => setNewOutcomeRole(e.target.value)}
                  className="w-full px-3 py-2 min-h-[40px] border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Outcome Stage</label>
                <SearchableSelect
                  value={newOutcomeType}
                  onChange={val => setNewOutcomeType(val as any)}
                  searchable={false}
                  theme="light"
                  size="sm"
                  options={[
                    { value: 'APPLICATION_SUBMITTED', label: 'Application Submitted' },
                    { value: 'RECRUITER_CONTACTED', label: 'Recruiter Contacted' },
                    { value: 'INTERVIEW_INVITATION', label: 'Interview Invitation' },
                    { value: 'INTERVIEW_COMPLETED', label: 'Interview Completed' },
                    { value: 'OFFER_RECEIVED', label: 'Offer Received' },
                    { value: 'REJECTION_RECEIVED', label: 'Rejection Received' },
                    { value: 'WITHDRAWN', label: 'Withdrawn' },
                  ]}
                  ariaLabel="Outcome Stage"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes / Feedback Received</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Recruiter appreciated direct metrics on distributed systems"
                  value={newOutcomeNotes}
                  onChange={e => setNewOutcomeNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-2 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddOutcomeModal(false)}
                  className="px-4 py-2 min-h-[40px] border border-slate-300 rounded-lg text-slate-700 font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newOutcomeCompany.trim() || !newOutcomeRole.trim()}
                  className="px-4 py-2 min-h-[40px] bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-xs disabled:opacity-50 touch-target"
                >
                  Save Outcome
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
