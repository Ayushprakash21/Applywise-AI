import React, { useState } from 'react';
import {
  Search,
  Sparkles,
  ShieldCheck,
  Globe,
  CheckCircle2,
  Building,
  ChevronRight,
  MapPin,
  Cpu,
  Layers,
  Network,
  Activity,
  Check,
  X,
  ArrowRight,
  Terminal,
  Menu,
  X as CloseIcon,
  Shield,
  FileText,
  Bookmark,
  Send,
  Briefcase,
  AlertCircle
} from 'lucide-react';
import { BrandLogo } from './BrandLogo.tsx';
import { JobVacancy } from '../types/index.ts';
import { FounderSection } from './FounderSection.tsx';
import { CareerNetworkVisual } from './CareerNetworkVisual.tsx';

interface LandingPageProps {
  onOpenAuth: (mode: 'login' | 'signup') => void;
  onOpenPrivacy: () => void;
  onOpenTerms: () => void;
  onOpenAbout?: () => void;
  onOpenPricing?: () => void;
  onOpenAdmin?: () => void;
  featuredVacancies: JobVacancy[];
  onSelectVacancy: (vacancy: JobVacancy) => void;
  onSearch: (query: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onOpenAuth,
  onOpenPrivacy,
  onOpenTerms,
  onOpenAbout,
  onOpenPricing,
  onOpenAdmin,
  featuredVacancies,
  onSelectVacancy,
  onSearch,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'fit' | 'audit' | 'tailor'>('fit');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearch(searchQuery.trim());
    }
  };

  return (
    <div className="min-h-screen bg-[#E9EDF3] neu-bg text-slate-800 flex flex-col font-sans">
      {/* Top Navigation - Clean Consumer SaaS Header */}
      <header className="sticky top-0 z-50 bg-[#EEF2F7]/95 backdrop-blur-md border-b border-slate-300/60 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          <BrandLogo
            variant="light"
            size="md"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          />

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center space-x-7 text-xs font-semibold text-slate-600">
            <a href="#network" className="hover:text-blue-600 transition-colors">
              Skill Alignment
            </a>
            <a href="#journey" className="hover:text-blue-600 transition-colors">
              How It Works
            </a>
            <a href="#cockpit" className="hover:text-blue-600 transition-colors">
              Job Match Preview
            </a>
            <a href="#integrity" className="hover:text-blue-600 transition-colors">
              Integrity Standard
            </a>
            <a href="#jobs" className="hover:text-blue-600 transition-colors">
              Live Vacancies
            </a>
            {onOpenPricing && (
              <button
                onClick={onOpenPricing}
                className="hover:text-blue-600 transition-colors font-semibold"
              >
                Pricing
              </button>
            )}
            {onOpenAbout && (
              <button
                onClick={onOpenAbout}
                className="hover:text-blue-600 transition-colors font-semibold"
              >
                About Us
              </button>
            )}
          </nav>

          {/* Action CTAs */}
          <div className="hidden sm:flex items-center space-x-3">
            <button
              onClick={() => onOpenAuth('login')}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-blue-600 transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={() => onOpenAuth('signup')}
              className="group px-5 py-2.5 rounded-xl text-xs font-semibold text-white neu-button-primary transition-all flex items-center space-x-1.5"
            >
              <span>Get Started Free</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          {/* Mobile menu trigger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-slate-600 hover:text-slate-900 transition-colors"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <CloseIcon className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile dropdown drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden neu-panel border-b border-slate-300 px-6 py-6 space-y-4 text-xs font-semibold text-slate-700 animate-in fade-in slide-in-from-top-2">
            <a
              href="#network"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 hover:text-blue-600"
            >
              Skill Alignment
            </a>
            <a
              href="#journey"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 hover:text-blue-600"
            >
              How It Works
            </a>
            <a
              href="#cockpit"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 hover:text-blue-600"
            >
              Job Match Preview
            </a>
            <a
              href="#integrity"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 hover:text-blue-600"
            >
              Integrity Standard
            </a>
            <a
              href="#jobs"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 hover:text-blue-600"
            >
              Live Vacancies
            </a>
            {onOpenPricing && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenPricing();
                }}
                className="block w-full text-left py-2 hover:text-blue-600"
              >
                Pricing
              </button>
            )}
            {onOpenAbout && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAbout();
                }}
                className="block w-full text-left py-2 hover:text-blue-600"
              >
                About Us
              </button>
            )}
            <div className="pt-4 border-t border-slate-200/80 flex flex-col space-y-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAuth('login');
                }}
                className="w-full py-2.5 rounded-xl neu-button text-center font-semibold text-slate-700"
              >
                Sign In
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAuth('signup');
                }}
                className="w-full py-2.5 rounded-xl neu-button-primary text-white font-semibold text-center"
              >
                Get Started Free
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 md:pt-20 md:pb-24 border-b border-slate-300/60">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center space-y-6 sm:space-y-7">
          {/* Friendly System Pill */}
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full neu-inset text-blue-700 text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5 text-blue-600" />
            <span>APPLYVISE AI 2.0 · TRUTHFUL CAREER INTELLIGENCE</span>
          </div>

          {/* Main Hero Headline */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
            Your next career move <br />
            <span className="text-blue-600">starts with clarity.</span>
          </h1>

          {/* Subheading */}
          <p className="max-w-2xl mx-auto text-sm sm:text-base md:text-lg text-slate-600 leading-relaxed font-normal">
            Bring your experience, job opportunities, applications, and career goals together in one intelligent workspace. Make informed career decisions with a clearer view of your next step.
          </p>

          {/* Dual CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={() => onOpenAuth('signup')}
              className="w-full sm:w-auto px-8 py-3.5 neu-button-primary text-white font-semibold text-sm rounded-xl transition-all flex items-center justify-center space-x-2"
            >
              <span>Get Started Free</span>
              <ArrowRight className="h-4 w-4" />
            </button>
            <a
              href="#cockpit"
              className="w-full sm:w-auto px-8 py-3.5 neu-button text-slate-700 font-semibold text-sm rounded-xl transition-colors flex items-center justify-center space-x-2"
            >
              <span>Explore Job Match</span>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </a>
          </div>

          {/* Interactive Search Capsule */}
          <div className="max-w-2xl mx-auto pt-4 px-2 sm:px-0">
            <form
              onSubmit={handleSearchSubmit}
              className="relative flex flex-col sm:flex-row items-stretch sm:items-center p-2 rounded-2xl neu-panel gap-2"
            >
              <div className="flex items-center min-w-0 flex-1 neu-inset rounded-xl px-3 py-1.5">
                <Search className="h-5 w-5 text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search by title, skill, or role (e.g. Product Manager, Go, Staff Frontend)..."
                  className="w-full min-w-0 px-2.5 py-1.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 outline-none bg-transparent"
                />
              </div>
              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-2.5 neu-button-primary rounded-xl text-xs sm:text-sm font-semibold shrink-0 transition"
              >
                Find Jobs
              </button>
            </form>

            {/* Popular Filter Pills */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-4 text-xs text-slate-600">
              <span className="font-semibold text-slate-500">Popular:</span>
              {[
                'Software Engineer',
                'Product Manager',
                'Data Analyst',
                'Marketing',
                'DevOps',
                'Customer Success'
              ].map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    setSearchQuery(tag);
                    onSearch(tag);
                  }}
                  className="px-3 py-1.5 neu-chip rounded-xl text-slate-700 text-xs font-medium"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Visual Graph Section Anchor */}
        <div id="network" className="mt-12 max-w-6xl mx-auto px-4 sm:px-6">
          <div className="neu-panel p-4 sm:p-6">
            <div className="mb-3 text-left">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <Network className="h-4 w-4 text-blue-600" />
                <span>Interactive Skill Alignment</span>
              </h3>
              <p className="text-xs text-slate-500">
                Visualize how verified skills map directly to live market opportunities.
              </p>
            </div>
            <CareerNetworkVisual theme="light" />
          </div>
        </div>
      </section>

      {/* Section A: 3 Core Product Pillars */}
      <section className="py-16 sm:py-20 border-b border-slate-300/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-2.5">
            <span className="text-blue-600 font-semibold text-xs tracking-wider uppercase">
              Why Job Seekers Choose ApplyVise AI
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Honest, simple tools to manage your entire search.
            </h2>
            <p className="text-slate-600 text-xs sm:text-sm leading-relaxed max-w-2xl mx-auto">
              No buzzwords, no invented experience, and no spammy auto-submissions. Built for real people who value substance and truthfulness.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {/* Pillar 1 */}
            <div className="p-6 sm:p-7 neu-card neu-raised-hover flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl neu-inset flex items-center justify-center text-blue-600">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">Truthful Resume Tailoring</h3>
                  <p className="text-slate-600 text-xs leading-relaxed mt-1">
                    Every tailored resume and bullet point is strictly derived from your actual experience. We never fabricate employers, dates, or credentials.
                  </p>
                </div>
              </div>
              <div className="pt-3 border-t border-slate-200/80 flex items-center space-x-2 text-blue-600 text-xs font-semibold">
                <CheckCircle2 className="h-4 w-4" />
                <span>Zero AI hallucinations</span>
              </div>
            </div>

            {/* Pillar 2 */}
            <div className="p-6 sm:p-7 neu-card neu-raised-hover flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl neu-inset flex items-center justify-center text-emerald-600">
                  <Globe className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">Verified Job Feeds</h3>
                  <p className="text-slate-600 text-xs leading-relaxed mt-1">
                    Live openings gathered directly from official hiring boards (Remotive, Arbeitnow, Jobicy). No dead links, ghost openings, or recycled postings.
                  </p>
                </div>
              </div>
              <div className="pt-3 border-t border-slate-200/80 flex items-center space-x-2 text-emerald-600 text-xs font-semibold">
                <CheckCircle2 className="h-4 w-4" />
                <span>Real active listings</span>
              </div>
            </div>

            {/* Pillar 3 */}
            <div className="p-6 sm:p-7 neu-card neu-raised-hover flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl neu-inset flex items-center justify-center text-indigo-600">
                  <Briefcase className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">Application Tracker</h3>
                  <p className="text-slate-600 text-xs leading-relaxed mt-1">
                    Keep your active submissions, interview stages, and follow-ups in one clean, straightforward workspace that you control completely.
                  </p>
                </div>
              </div>
              <div className="pt-3 border-t border-slate-200/80 flex items-center space-x-2 text-indigo-600 text-xs font-semibold">
                <CheckCircle2 className="h-4 w-4" />
                <span>Clear interview tracking</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section B: How It Works (The 6-Stage Journey) */}
      <section id="journey" className="py-16 sm:py-20 border-b border-slate-300/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-2.5">
            <span className="text-blue-600 font-semibold text-xs tracking-wider uppercase">
              Step-by-Step Guidance
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              From raw resume to tracked applications.
            </h2>
            <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
              A transparent, stress-free process designed to help you organize your career search in minutes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                num: '01',
                title: 'Resume Ingestion',
                subtitle: 'Zero-loss extraction',
                desc: 'Upload your PDF or Word resume. Our parser securely extracts your verified employment periods, skills, and accomplishments.',
                badge: 'PDF.js & Word',
              },
              {
                num: '02',
                title: 'Twin Construction',
                subtitle: 'Profile modeling',
                desc: 'Organizes your career background into structured competencies, seniority indicators, and target preferences.',
                badge: 'Structured Facts',
              },
              {
                num: '03',
                title: 'Live Vacancy Stream',
                subtitle: 'Opportunity matching',
                desc: 'Discovers verified engineering, product, and leadership openings across top global hiring feeds.',
                badge: 'Real Openings',
              },
              {
                num: '04',
                title: 'Evidence-Based Fit',
                subtitle: 'Clear compatibility',
                desc: 'Evaluates role requirements against your verified skills with clear, understandable explanations.',
                badge: 'Clear Breakdown',
              },
              {
                num: '05',
                title: 'Truthful Tailoring',
                subtitle: 'ATS-grade optimization',
                desc: 'Formats your authentic accomplishments to match vacancy requirements without inventing unearned titles or skills.',
                badge: 'Clean DOCX Export',
              },
              {
                num: '06',
                title: 'Tracked Submission',
                subtitle: 'Application progress',
                desc: 'Keeps track of where you applied, interview dates, and next steps in a clean personal board.',
                badge: 'Organized Tracker',
              },
            ].map(stage => (
              <div
                key={stage.num}
                className="p-6 neu-card neu-raised-hover flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200/80">
                    <span className="font-mono text-2xl font-black text-blue-600">
                      {stage.num}
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-lg neu-inset text-blue-700">
                      {stage.badge}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-1">{stage.title}</h3>
                  <div className="text-xs font-semibold text-blue-600 mb-2">{stage.subtitle}</div>
                  <p className="text-slate-600 text-xs leading-relaxed">{stage.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section C: Phase 3 Redesigned Match Experience */}
      <section id="cockpit" className="py-16 sm:py-20 border-b border-slate-300/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-10">
          {/* Phase 3 Required Page Heading and Supporting Text */}
          <div className="text-center max-w-3xl mx-auto space-y-2.5">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Your job match
            </h2>
            <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
              See how your experience compares with this role and where you may need to improve.
            </p>
          </div>

          {/* Interactive Consumer-Facing Job Match Card */}
          <div className="max-w-4xl mx-auto neu-panel overflow-hidden">
            {/* Clean Tab Switcher */}
            <div className="px-6 py-4 border-b border-slate-300/60 flex flex-wrap items-center justify-between gap-4">
              <div className="text-xs font-bold text-slate-800">
                Sample Role Evaluation
              </div>

              <div className="flex items-center space-x-1.5 p-1 neu-inset rounded-xl text-xs font-semibold overflow-x-auto max-w-full">
                <button
                  onClick={() => setActiveTab('fit')}
                  className={`px-3.5 py-1.5 rounded-lg transition-all shrink-0 ${
                    activeTab === 'fit'
                      ? 'neu-raised text-blue-700 font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Job Match & Fit
                </button>
                <button
                  onClick={() => setActiveTab('audit')}
                  className={`px-3.5 py-1.5 rounded-lg transition-all shrink-0 ${
                    activeTab === 'audit'
                      ? 'neu-raised text-blue-700 font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Profile Evidence
                </button>
                <button
                  onClick={() => setActiveTab('tailor')}
                  className={`px-3.5 py-1.5 rounded-lg transition-all shrink-0 ${
                    activeTab === 'tailor'
                      ? 'neu-raised text-blue-700 font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tailored Resume
                </button>
              </div>
            </div>

            {/* Tab Contents */}
            <div className="p-6 sm:p-8">
              {activeTab === 'fit' && (
                <div className="space-y-6">
                  {/* Phase 3 Job Summary Card */}
                  <div className="p-5 neu-card flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded-md neu-inset text-blue-700 text-[10px] font-semibold uppercase">
                          Full-Time
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-semibold">
                          Remote
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-slate-900">Staff Distributed Systems Engineer</h3>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                        <span className="font-semibold text-slate-700">Stripe</span>
                        <span>·</span>
                        <span>United States & Canada (Remote)</span>
                        <span>·</span>
                        <span className="text-emerald-700 font-semibold">$240,000 – $295,000 / year (Verified listing)</span>
                      </div>
                    </div>

                    <button
                      onClick={() => onOpenAuth('signup')}
                      className="px-4 py-2 rounded-xl neu-button-primary text-xs font-semibold shrink-0"
                    >
                      View or Apply for Role
                    </button>
                  </div>

                  {/* Phase 3 Match Summary */}
                  <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-blue-800 uppercase tracking-wider">
                        Match Assessment
                      </span>
                      <span className="text-xs font-bold text-blue-700 px-2.5 py-0.5 rounded-full bg-blue-100">
                        Strong Fit · 88% Alignment
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      Calculated from your verified background: 4 of 5 core competencies (distributed consensus, Go services, edge computing, cross-functional leadership) match the published job spec.
                    </p>
                  </div>

                  {/* Phase 3 Why This Job May Fit */}
                  <div className="space-y-2.5">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Why this job may fit
                    </h4>
                    <div className="space-y-2 text-xs">
                      {[
                        { title: 'Relevant experience', detail: '7+ years engineering scalable cloud services and high-throughput systems.' },
                        { title: 'Matching skills', detail: 'Go, Raft consensus protocols, low-latency KV data stores, and edge platforms.' },
                        { title: 'Related responsibilities', detail: 'Led distributed infrastructure teams and partnered with product teams on system reliability.' },
                      ].map((item, idx) => (
                        <div key={idx} className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-start space-x-2.5">
                          <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-slate-900">{item.title}: </span>
                            <span className="text-slate-600">{item.detail}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Phase 3 Areas to Improve */}
                  <div className="space-y-2.5">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Areas to improve
                    </h4>
                    <div className="space-y-2 text-xs">
                      {[
                        'This role requests experience with a skill that isn\'t listed on your profile: eBPF monitoring.',
                        'Your resume doesn\'t yet provide evidence for this requirement: multi-region failover testing.',
                        'Consider adding a relevant project if you have this experience.',
                      ].map((gap, idx) => (
                        <div key={idx} className="p-3 rounded-lg bg-amber-50/60 border border-amber-200 flex items-start space-x-2.5 text-amber-900">
                          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                          <span>{gap}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Phase 3 Next Steps Actions */}
                  <div className="pt-2 border-t border-slate-100">
                    <div className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                      Next steps
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <button
                        onClick={() => onOpenAuth('signup')}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                      >
                        Tailor my resume
                      </button>
                      <button
                        onClick={() => onOpenAuth('signup')}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
                      >
                        Review my experience
                      </button>
                      <button
                        onClick={() => onOpenAuth('signup')}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
                      >
                        Create a cover letter
                      </button>
                      <button
                        onClick={() => onOpenAuth('signup')}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
                      >
                        Save this job
                      </button>
                      <button
                        onClick={() => onOpenAuth('signup')}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
                      >
                        Track my application
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'audit' && (
                <div className="space-y-6">
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center space-x-3 text-xs text-emerald-800 font-medium">
                    <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
                    <span>AUDIT PASS: Zero fabricated credentials, metrics, or false employer statements detected.</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                    <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                      <div className="font-semibold text-blue-700 uppercase tracking-wider flex items-center space-x-2">
                        <Terminal className="h-4 w-4" />
                        <span>Candidate Master Fact-Sheet</span>
                      </div>
                      <div className="p-3 bg-white rounded-lg border border-slate-200 text-slate-700 space-y-1.5 leading-relaxed text-[11px] font-mono">
                        <div>• Company: Cloudflare (2021 - 2024)</div>
                        <div>• Role: Senior Infrastructure Engineer</div>
                        <div>• Impact: Reduced tail latency by 38% across edge clusters</div>
                        <div>• Tech: Go, Rust, Raft consensus</div>
                      </div>
                    </div>

                    <div className="p-5 rounded-xl bg-blue-50/40 border border-blue-200 space-y-3">
                      <div className="font-semibold text-blue-700 uppercase tracking-wider flex items-center space-x-2">
                        <FileText className="h-4 w-4" />
                        <span>Tailored Output Bullet</span>
                      </div>
                      <div className="p-3 bg-white rounded-lg border border-blue-200 text-slate-800 space-y-1.5 leading-relaxed text-[11px] font-mono">
                        <div className="text-emerald-700 font-bold">// Grounded in Fact #1 & #3:</div>
                        <div>"Architected low-latency distributed edge synchronization services in Go, cutting tail latency 38% using Raft consensus protocols."</div>
                        <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-100">Audit Trail Matched (No Hallucination)</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'tailor' && (
                <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 space-y-4 text-xs font-mono">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <div className="text-blue-700 font-bold uppercase tracking-wider">
                      ATS DOCX EXPORT ENGINE · STRIPE-ALIGNED
                    </div>
                    <span className="text-[11px] text-slate-500 font-sans">Format: Standard ATS-12 Compliant</span>
                  </div>
                  <div className="space-y-3 text-slate-700 text-[11px] leading-relaxed font-sans">
                    <p className="text-slate-900 font-bold text-sm">AYUSH PRAKASH — LEAD PRODUCT & SYSTEMS ARCHITECT</p>
                    <p className="text-slate-500">San Francisco, CA · ayush@example.com · github.com/Ayushprakash21</p>
                    <div className="pt-2">
                      <span className="text-blue-700 font-bold text-xs uppercase tracking-wider">PROFESSIONAL SUMMARY</span>
                      <p className="text-slate-600 mt-1 leading-relaxed">
                        High-integrity software engineer and product architect with verified expertise building edge-scale distributed applications and fault-tolerant cloud systems.
                      </p>
                    </div>
                    <div className="pt-2">
                      <span className="text-blue-700 font-bold text-xs uppercase tracking-wider">TARGETED COMPETENCIES</span>
                      <p className="text-slate-600 mt-1 leading-relaxed">
                        Distributed Systems · Edge Computing · Go · TypeScript · Cloudflare Workers · Consensus Algorithms
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Section D: The Zero-Hallucination Standard */}
      <section id="integrity" className="py-16 sm:py-20 bg-[#F8FAFC] border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-10">
          <div className="text-center max-w-3xl mx-auto space-y-2.5">
            <span className="text-blue-600 font-semibold text-xs tracking-wider uppercase">
              Application Integrity Engine
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              The Zero-Hallucination Standard.
            </h2>
            <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
              Most AI career tools make up numbers, fabricate employers, and flood ATS portals with toxic spam. ApplyVise AI is engineered with rigorous mathematical verification.
            </p>
          </div>

          {/* Comparison Matrix */}
          <div className="max-w-4xl mx-auto rounded-2xl bg-white border border-slate-200 shadow-xs overflow-hidden">
            <div className="grid grid-cols-1 sm:grid-cols-2 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
              <div className="p-4 sm:p-5 text-rose-700 bg-rose-50/70 flex items-center space-x-2">
                <X className="h-4 w-4 shrink-0 text-rose-600" />
                <span>Generic Generative AI</span>
              </div>
              <div className="p-4 sm:p-5 text-blue-700 bg-blue-50/70 flex items-center space-x-2 border-t sm:border-t-0 sm:border-l border-slate-200">
                <Check className="h-4 w-4 shrink-0 text-blue-600" />
                <span>ApplyVise AI Engine</span>
              </div>
            </div>

            <div className="divide-y divide-slate-100 text-xs sm:text-sm">
              {[
                {
                  issue: 'Work Experience Integrity',
                  bad: 'Invents achievements, false project impact, and unearned titles to game resume screeners.',
                  good: 'Strict constraint: Resumes are built solely from your verified master profile facts.',
                },
                {
                  issue: 'Job Sourcing Authenticity',
                  bad: 'Scrapes stale, closed, or fictional openings from secondary repost aggregators.',
                  good: 'Synchronizes live API feeds directly from verified primary hiring boards with live status.',
                },
                {
                  issue: 'Match Transparency',
                  bad: 'Gives arbitrary 99% scores without explaining gaps or why you match.',
                  good: 'Provides evidence-backed compatibility scoring with explicit skill gap analysis.',
                },
                {
                  issue: 'Submission Accountability',
                  bad: 'Fakes submission confirmations and generates spam applications without candidate oversight.',
                  good: 'Transparent tracking, authentic external portal links, and verifiable audit records.',
                },
              ].map((row, idx) => (
                <div key={idx} className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
                  <div className="p-4 sm:p-5 text-slate-600 bg-white space-y-1">
                    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{row.issue}</div>
                    <p className="text-xs text-rose-700/90 leading-relaxed">{row.bad}</p>
                  </div>
                  <div className="p-4 sm:p-5 text-slate-800 bg-blue-50/20 space-y-1">
                    <div className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider">{row.issue}</div>
                    <p className="text-xs text-slate-800 leading-relaxed font-medium">{row.good}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Section E: Live Job Discovery */}
      <section id="jobs" className="py-16 sm:py-20 border-b border-slate-300/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <span className="text-blue-600 font-semibold text-xs tracking-wider uppercase">
                Live Feed
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Live Discovered Vacancies
              </h2>
              <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
                Real openings from verified company hiring feeds with live status.
              </p>
            </div>
            <button
              onClick={() => onOpenAuth('signup')}
              className="px-4 py-2 rounded-xl neu-button text-blue-700 text-xs font-semibold flex items-center space-x-1.5 w-fit transition-colors"
            >
              <span>Explore All Live Listings</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {featuredVacancies.slice(0, 6).map(v => (
              <div
                key={v.id}
                onClick={() => onSelectVacancy(v)}
                className="group p-5 sm:p-6 neu-card neu-raised-hover cursor-pointer flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-lg neu-inset text-slate-600 text-[10px] uppercase font-semibold">
                      {v.source}
                    </span>
                    {v.remote && (
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-semibold">
                        Remote
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                      {v.title}
                    </h3>
                    <div className="flex items-center space-x-1.5 text-xs text-slate-500 mt-1">
                      <Building className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>{v.company}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center space-x-1 truncate max-w-[170px]">
                    <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                    <span className="truncate">{v.location}</span>
                  </div>
                  <span className="text-blue-600 font-semibold flex items-center space-x-1 group-hover:translate-x-0.5 transition-transform">
                    <span>Details</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section F: Meet the Founder */}
      <section id="founder">
        <FounderSection theme="light" onReadStory={onOpenAbout} />
      </section>

      {/* Section G: Call to Action */}
      <section className="py-16 sm:py-20 bg-blue-600 text-white relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-5 relative z-10">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
            Make your next career move <br />
            with complete confidence.
          </h2>

          <p className="text-xs sm:text-sm text-blue-100 max-w-xl mx-auto leading-relaxed">
            Create your free account today. Upload your resume, configure your target roles, and start applying with verified clarity.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={() => onOpenAuth('signup')}
              className="w-full sm:w-auto px-8 py-3.5 bg-white hover:bg-slate-50 text-blue-700 font-bold text-sm rounded-xl shadow-md transition-all"
            >
              Start for Free
            </button>
            <button
              onClick={() => onOpenAuth('login')}
              className="w-full sm:w-auto px-8 py-3.5 bg-blue-700/60 hover:bg-blue-700 border border-blue-400/40 text-white font-semibold text-sm rounded-xl transition-colors"
            >
              Sign In to Existing Account
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto bg-slate-900 text-slate-400 py-12 text-xs border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <BrandLogo
            variant="dark"
            size="sm"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          />

          <div className="flex flex-wrap items-center justify-center gap-6 font-medium text-[11px] text-slate-400">
            {onOpenAbout && (
              <button onClick={onOpenAbout} className="hover:text-white transition-colors">
                About Us
              </button>
            )}
            {onOpenPricing && (
              <button onClick={onOpenPricing} className="hover:text-white transition-colors">
                Pricing & Plans
              </button>
            )}
            {onOpenAdmin && (
              <button onClick={onOpenAdmin} className="hover:text-white transition-colors">
                Admin Portal
              </button>
            )}
            <button onClick={onOpenPrivacy} className="hover:text-white transition-colors">
              Privacy Policy
            </button>
            <button onClick={onOpenTerms} className="hover:text-white transition-colors">
              Terms of Use
            </button>
            <span className="text-slate-500">Zero Hallucination Standard</span>
          </div>

          <p className="text-slate-500 font-mono text-[11px]">
            © {new Date().getFullYear()} ApplyVise AI. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};
