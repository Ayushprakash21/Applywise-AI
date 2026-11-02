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
  FileText
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
    <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-black">
      {/* Top Navigation - Fixed / Sticky Dark Glass */}
      <header className="sticky top-0 z-50 bg-[#030712]/80 backdrop-blur-xl border-b border-white/10 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          <BrandLogo
            variant="dark"
            size="md"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          />

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center space-x-7 text-xs font-mono uppercase tracking-wider text-slate-400">
            <a href="#network" className="hover:text-cyan-400 transition-colors">
              Career Graph
            </a>
            <a href="#journey" className="hover:text-cyan-400 transition-colors">
              Journey
            </a>
            <a href="#cockpit" className="hover:text-cyan-400 transition-colors">
              Cockpit
            </a>
            <a href="#integrity" className="hover:text-cyan-400 transition-colors">
              Integrity Engine
            </a>
            <a href="#jobs" className="hover:text-cyan-400 transition-colors">
              Live Vacancies
            </a>
            {onOpenPricing && (
              <button
                onClick={onOpenPricing}
                className="hover:text-cyan-400 transition-colors uppercase tracking-wider"
              >
                Pricing
              </button>
            )}
            {onOpenAbout && (
              <button
                onClick={onOpenAbout}
                className="hover:text-cyan-400 transition-colors uppercase tracking-wider"
              >
                About
              </button>
            )}
          </nav>

          {/* Action CTAs */}
          <div className="hidden sm:flex items-center space-x-3">
            <button
              onClick={() => onOpenAuth('login')}
              className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={() => onOpenAuth('signup')}
              className="relative group px-5 py-2.5 rounded-xl text-xs font-bold text-black bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 shadow-[0_0_20px_-3px_rgba(6,182,212,0.4)] transition-all flex items-center space-x-1.5"
            >
              <span>Get Started Free</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          {/* Mobile menu trigger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-slate-400 hover:text-white transition-colors"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <CloseIcon className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile dropdown drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-[#090d1a] border-b border-white/10 px-6 py-6 space-y-4 font-mono text-xs uppercase tracking-wider text-slate-300 animate-in fade-in slide-in-from-top-2">
            <a
              href="#network"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 hover:text-cyan-400"
            >
              Career Graph
            </a>
            <a
              href="#journey"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 hover:text-cyan-400"
            >
              Journey
            </a>
            <a
              href="#cockpit"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 hover:text-cyan-400"
            >
              Cockpit
            </a>
            <a
              href="#integrity"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 hover:text-cyan-400"
            >
              Integrity Engine
            </a>
            <a
              href="#jobs"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 hover:text-cyan-400"
            >
              Live Vacancies
            </a>
            {onOpenPricing && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenPricing();
                }}
                className="block w-full text-left py-2 hover:text-cyan-400"
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
                className="block w-full text-left py-2 hover:text-cyan-400"
              >
                About
              </button>
            )}
            <div className="pt-4 border-t border-white/10 flex flex-col space-y-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAuth('login');
                }}
                className="w-full py-2.5 rounded-lg border border-white/10 text-center font-semibold text-slate-200"
              >
                Sign In
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAuth('signup');
                }}
                className="w-full py-2.5 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-black font-bold text-center"
              >
                Get Started Free
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-20 md:pt-24 md:pb-32 bg-grid-cyber">
        {/* Ambient atmospheric glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-tr from-cyan-600/15 via-blue-600/10 to-transparent rounded-full blur-[120px] pointer-events-none -z-10" />
        <div className="absolute -top-20 left-10 w-96 h-96 bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none -z-10" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center space-y-8">
          {/* Monospaced System Pill */}
          <div className="inline-flex items-center space-x-2.5 px-4 py-1.5 rounded-full bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 text-xs font-mono tracking-wider shadow-[0_0_15px_-3px_rgba(6,182,212,0.3)]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
            </span>
            <span>APPLYWISE AI 2.0 · TRUTHFUL CAREER INTELLIGENCE</span>
          </div>

          {/* Main Hero Headline */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold text-white tracking-tight leading-[1.08]">
            Your next chapter <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-300">
              starts with clarity.
            </span>
          </h1>

          {/* Subheading */}
          <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-400 font-normal leading-relaxed">
            A career intelligence platform that maps verified experience to live opportunities with zero hallucination. Built for engineers, operators, and leaders who value substance over noise.
          </p>

          {/* Dual CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <button
              onClick={() => onOpenAuth('signup')}
              className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-black font-bold text-sm rounded-xl shadow-[0_0_30px_-5px_rgba(6,182,212,0.5)] transition-all flex items-center justify-center space-x-2"
            >
              <span>Get Started Free</span>
              <ArrowRight className="h-4 w-4" />
            </button>
            <a
              href="#cockpit"
              className="w-full sm:w-auto px-8 py-3.5 bg-white/5 hover:bg-white/10 border border-white/15 text-slate-300 hover:text-white font-semibold text-sm rounded-xl backdrop-blur-md transition-colors flex items-center justify-center space-x-2"
            >
              <span>Explore the Platform</span>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </a>
          </div>

          {/* Interactive Search Capsule */}
          <div className="max-w-2xl mx-auto pt-6">
            <form
              onSubmit={handleSearchSubmit}
              className="relative flex items-center p-2 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-xl shadow-2xl focus-within:border-cyan-500/60 transition-all"
            >
              <Search className="h-5 w-5 text-cyan-400 ml-3 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by title, skill, or tech stack (e.g. Distributed Systems, React, Staff Engineer)..."
                className="w-full px-3 py-2.5 text-xs sm:text-sm text-white placeholder:text-slate-500 outline-none bg-transparent"
              />
              <button
                type="submit"
                className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-cyan-500/20 shrink-0 transition"
              >
                Find Jobs
              </button>
            </form>

            {/* Popular Filter Pills */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-4 text-xs font-mono text-slate-400">
              <span className="text-slate-500">POPULAR:</span>
              {[
                'Distributed Systems',
                'Product Strategy',
                'TypeScript',
                'Cloudflare Workers',
                'AI Engineering',
                'Staff Frontend',
              ].map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    setSearchQuery(tag);
                    onSearch(tag);
                  }}
                  className="px-2.5 py-1 rounded-md bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-300 transition-all text-[11px]"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Visual Graph Section Anchor */}
        <div id="network" className="mt-16 max-w-6xl mx-auto px-4 sm:px-6">
          <CareerNetworkVisual />
        </div>
      </section>

      {/* Section A: The Career Network Constellation */}
      <section className="py-24 bg-[#050811] border-y border-white/10 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-16">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-cyan-400 font-mono text-xs tracking-widest uppercase">
              // Paradigm Shift
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
              From fragmented resumes <br />
              to an interconnected career graph.
            </h2>
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
              Traditional job searching relies on throwing flat documents into automated keyword black holes. ApplyWise AI models your career as an active, verified knowledge graph.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Card 1 */}
            <div className="group relative p-8 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-cyan-500/40 backdrop-blur-xl transition-all duration-300 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Network className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <span className="font-mono text-[10px] text-cyan-400 tracking-widest uppercase">01 / Foundation</span>
                  <h3 className="text-xl font-bold text-white">Career Digital Twin</h3>
                </div>
                <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
                  Your accomplishments, verified projects, core competencies, and career trajectory persist as a living digital twin—grounded strictly in your authentic history.
                </p>
              </div>
              <div className="pt-6 mt-6 border-t border-white/5 flex items-center space-x-2 text-cyan-400 font-mono text-xs">
                <CheckCircle2 className="h-4 w-4" />
                <span>Zero AI hallucinations</span>
              </div>
            </div>

            {/* Card 2 */}
            <div className="group relative p-8 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-cyan-500/40 backdrop-blur-xl transition-all duration-300 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-blue-950/60 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Globe className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <span className="font-mono text-[10px] text-blue-400 tracking-widest uppercase">02 / Sourcing</span>
                  <h3 className="text-xl font-bold text-white">Live Multi-Board Discovery</h3>
                </div>
                <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
                  Direct edge integration with primary vacancy feeds (Remotive, Arbeitnow, Jobicy). No dead links, no ghost postings, and zero speculative scraped listings.
                </p>
              </div>
              <div className="pt-6 mt-6 border-t border-white/5 flex items-center space-x-2 text-blue-400 font-mono text-xs">
                <CheckCircle2 className="h-4 w-4" />
                <span>Synchronized edge cache</span>
              </div>
            </div>

            {/* Card 3 */}
            <div className="group relative p-8 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-cyan-500/40 backdrop-blur-xl transition-all duration-300 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-950/60 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <span className="font-mono text-[10px] text-indigo-400 tracking-widest uppercase">03 / Verification</span>
                  <h3 className="text-xl font-bold text-white">Integrity Verification Engine</h3>
                </div>
                <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
                  Every match score and tailored resume is audited by a verification pipeline that enforces complete truthfulness before any document is generated.
                </p>
              </div>
              <div className="pt-6 mt-6 border-t border-white/5 flex items-center space-x-2 text-indigo-400 font-mono text-xs">
                <CheckCircle2 className="h-4 w-4" />
                <span>Mathematical fact-checking</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section B: From Experience to Opportunity (The 6-Stage Journey) */}
      <section id="journey" className="py-24 bg-[#030712] relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-16">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-cyan-400 font-mono text-xs tracking-widest uppercase">
              // Systematic Process
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
              From experience to opportunity.
            </h2>
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
              A structured 6-stage pipeline built to convert raw career history into verified, high-impact job applications.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                num: '01',
                title: 'Resume Ingestion',
                subtitle: 'Zero-loss extraction',
                desc: 'Upload PDF or DOCX resumes. The sandboxed parser extracts genuine employment periods, technologies, and demonstrable impact.',
                badge: 'PDF.js & XML Parser',
              },
              {
                num: '02',
                title: 'Twin Construction',
                subtitle: 'Knowledge modeling',
                desc: 'Synthesizes your experience into structured skill nodes, verified competencies, seniority indicators, and geographic preferences.',
                badge: 'Structured Graph',
              },
              {
                num: '03',
                title: 'Live Vacancy Stream',
                subtitle: 'Global opportunity matching',
                desc: 'Scans live multi-source engineering, product, and leadership openings worldwide across verified employer feeds.',
                badge: 'Sub-second Discovery',
              },
              {
                num: '04',
                title: 'Evidence-Based Fit',
                subtitle: 'Transparent compatibility',
                desc: 'Computes multi-dimensional match scores with an explicit gap breakdown. Know exactly why a vacancy fits before applying.',
                badge: 'Zero Speculation',
              },
              {
                num: '05',
                title: 'Truthful Tailoring',
                subtitle: 'ATS-grade optimization',
                desc: 'Re-aligns real achievements to vacancy requirements without inventing unearned titles, buzzwords, or phantom metrics.',
                badge: 'Clean DOCX Export',
              },
              {
                num: '06',
                title: 'Tracked Submission',
                subtitle: 'Audit trail & tracking',
                desc: 'Prefills application portals and logs direct submissions with verifiable timestamps and application status lifecycle.',
                badge: 'Complete Audit Log',
              },
            ].map(stage => (
              <div
                key={stage.num}
                className="relative p-6 sm:p-8 rounded-2xl bg-[#090d1a]/60 border border-white/10 hover:border-cyan-500/30 transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/5">
                    <span className="font-mono text-2xl font-black text-cyan-400/40 group-hover:text-cyan-400 transition-colors">
                      {stage.num}
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-white/5 text-slate-400 border border-white/5">
                      {stage.badge}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">{stage.title}</h3>
                  <div className="font-mono text-xs text-cyan-400/80 mb-3">{stage.subtitle}</div>
                  <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">{stage.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section C: Product Demonstration / Interactive Cockpit */}
      <section id="cockpit" className="py-24 bg-[#050811] border-y border-white/10 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-cyan-400 font-mono text-xs tracking-widest uppercase">
              // Platform Preview
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
              The Application Intelligence Cockpit.
            </h2>
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
              Experience the transparency of our matching engine. Inspect evidence, verify criteria, and view tailored documents in real time.
            </p>
          </div>

          {/* Interactive Cockpit Container */}
          <div className="max-w-5xl mx-auto rounded-2xl bg-[#090d1a] border border-cyan-500/20 shadow-[0_0_50px_-10px_rgba(6,182,212,0.15)] overflow-hidden">
            {/* Cockpit Window Bar */}
            <div className="px-6 py-4 bg-black/40 border-b border-white/10 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center space-x-2">
                <span className="h-3 w-3 rounded-full bg-rose-500/80 inline-block" />
                <span className="h-3 w-3 rounded-full bg-amber-500/80 inline-block" />
                <span className="h-3 w-3 rounded-full bg-emerald-500/80 inline-block" />
                <span className="ml-3 font-mono text-xs text-slate-400">
                  applywise-cockpit://v2.4/evaluation
                </span>
              </div>

              {/* Tabs */}
              <div className="flex items-center space-x-1 p-1 bg-white/5 rounded-xl border border-white/10 text-xs font-mono">
                <button
                  onClick={() => setActiveTab('fit')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    activeTab === 'fit'
                      ? 'bg-cyan-500 text-black font-bold shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Match Matrix
                </button>
                <button
                  onClick={() => setActiveTab('audit')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    activeTab === 'audit'
                      ? 'bg-cyan-500 text-black font-bold shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Truth Audit
                </button>
                <button
                  onClick={() => setActiveTab('tailor')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    activeTab === 'tailor'
                      ? 'bg-cyan-500 text-black font-bold shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  ATS Doc Preview
                </button>
              </div>
            </div>

            {/* Cockpit Content Panes */}
            <div className="p-6 sm:p-10">
              {activeTab === 'fit' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                  {/* Left Column: Job Spec */}
                  <div className="lg:col-span-1 space-y-4 p-5 rounded-xl bg-white/[0.02] border border-white/10">
                    <span className="font-mono text-[10px] text-cyan-400 uppercase tracking-widest">
                      Target Role
                    </span>
                    <div>
                      <h4 className="text-base font-bold text-white">Staff Distributed Systems Engineer</h4>
                      <p className="text-xs text-slate-400">Stripe · Infrastructure & Platforms</p>
                    </div>
                    <div className="pt-3 border-t border-white/10 space-y-2 text-xs font-mono">
                      <div className="flex justify-between text-slate-400">
                        <span>Location:</span>
                        <span className="text-slate-200">Remote (US / Canada)</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Salary Range:</span>
                        <span className="text-emerald-400 font-semibold">$240k - $295k</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Core Reqs:</span>
                        <span className="text-slate-200">Raft, Go, Edge KV, High Throughput</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Match Breakdown */}
                  <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/30">
                      <div>
                        <span className="font-mono text-xs text-cyan-400 uppercase tracking-wider">
                          Overall Match Score
                        </span>
                        <div className="text-3xl font-extrabold text-white mt-1">
                          94.2% <span className="text-xs text-emerald-400 font-normal ml-2">High Confidence Match</span>
                        </div>
                      </div>
                      <div className="w-16 h-16 rounded-full border-4 border-cyan-400/20 border-t-cyan-400 flex items-center justify-center font-mono text-sm font-bold text-cyan-300">
                        94%
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="text-xs font-mono uppercase text-slate-400 tracking-wider">
                        Evidence Cross-Verification
                      </div>
                      {[
                        { skill: 'Distributed Consensus (Raft / Paxos)', status: 'Verified in 2 past employers', match: 98 },
                        { skill: 'Go & Low-Latency Systems', status: '7 years production experience', match: 95 },
                        { skill: 'Edge Architectures & KV Storage', status: 'Active architecture patent / lead', match: 92 },
                        { skill: 'Cross-functional Staff Leadership', status: 'Led 14-person distributed team', match: 90 },
                      ].map((item, idx) => (
                        <div key={idx} className="p-3 rounded-lg bg-white/[0.02] border border-white/5 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-slate-200">{item.skill}</span>
                            <span className="font-mono text-cyan-400">{item.match}%</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full" style={{ width: `${item.match}%` }} />
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono flex items-center space-x-1">
                            <Check className="h-3 w-3 text-emerald-400" />
                            <span>{item.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'audit' && (
                <div className="space-y-6">
                  <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex items-center space-x-3 text-xs font-mono text-emerald-300">
                    <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0" />
                    <span>AUDIT PASS: Zero fabricated credentials, metrics, or false employer statements detected.</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                    <div className="p-5 rounded-xl bg-white/[0.02] border border-white/10 space-y-3">
                      <div className="font-mono text-cyan-400 uppercase tracking-widest flex items-center space-x-2">
                        <Terminal className="h-4 w-4" />
                        <span>Candidate Master Fact-Sheet</span>
                      </div>
                      <div className="p-3 bg-black/50 rounded font-mono text-slate-300 space-y-1.5 leading-relaxed text-[11px]">
                        <div>• Company: Cloudflare (2021 - 2024)</div>
                        <div>• Role: Senior Infrastructure Engineer</div>
                        <div>• Impact: Reduced tail latency by 38% across 12,000 edge nodes</div>
                        <div>• Tech: Go, Rust, eBPF, Raft consensus</div>
                      </div>
                    </div>

                    <div className="p-5 rounded-xl bg-white/[0.02] border border-white/10 space-y-3">
                      <div className="font-mono text-cyan-400 uppercase tracking-widest flex items-center space-x-2">
                        <FileText className="h-4 w-4" />
                        <span>Tailored Output Bullet</span>
                      </div>
                      <div className="p-3 bg-black/50 rounded font-mono text-cyan-100 space-y-1.5 leading-relaxed text-[11px]">
                        <div className="text-emerald-400 font-bold">// Grounded in Fact #1 & #3:</div>
                        <div>"Architected low-latency distributed edge synchronization services in Go, cutting tail latency 38% across 12,000 nodes using Raft consensus protocols."</div>
                        <div className="text-[10px] text-slate-400 pt-1 border-t border-white/10">Hash: 8f9b4c2... (Audit Trail Matched)</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'tailor' && (
                <div className="p-6 rounded-xl bg-white/[0.02] border border-white/10 space-y-4 font-mono text-xs">
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <div className="text-cyan-400 font-bold uppercase tracking-wider">
                      ATS DOCX EXPORT ENGINE · STRIPE-ALIGNED
                    </div>
                    <span className="text-[11px] text-slate-400">Format: Standard ATS-12 Compliant</span>
                  </div>
                  <div className="space-y-3 text-slate-300 text-[11px] leading-relaxed">
                    <p className="text-white font-bold text-sm">AYUSH PRAKASH — LEAD PRODUCT & SYSTEMS ARCHITECT</p>
                    <p className="text-slate-400">San Francisco, CA · ayush@example.com · github.com/Ayushprakash21</p>
                    <div className="pt-2">
                      <span className="text-cyan-400 font-bold">PROFESSIONAL SUMMARY</span>
                      <p className="text-slate-300 mt-1">
                        High-integrity software engineer and product architect with verified expertise building edge-scale distributed applications and fault-tolerant cloud systems.
                      </p>
                    </div>
                    <div className="pt-2">
                      <span className="text-cyan-400 font-bold">TARGETED COMPETENCIES</span>
                      <p className="text-slate-300 mt-1">
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

      {/* Section D: Truth and Verification Guarantee (Zero Hallucination) */}
      <section id="integrity" className="py-24 bg-[#030712] relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-16">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-cyan-400 font-mono text-xs tracking-widest uppercase">
              // Application Integrity Engine
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
              The Zero-Hallucination Standard.
            </h2>
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
              Most AI career tools make up numbers, fabricate employers, and flood ATS portals with toxic spam. ApplyWise AI is engineered with rigorous mathematical verification.
            </p>
          </div>

          {/* Comparison Matrix */}
          <div className="max-w-4xl mx-auto rounded-2xl bg-[#090d1a] border border-white/10 overflow-hidden">
            <div className="grid grid-cols-2 text-xs font-mono uppercase tracking-wider border-b border-white/10">
              <div className="p-4 sm:p-5 text-rose-400 bg-rose-950/20 flex items-center space-x-2">
                <X className="h-4 w-4 shrink-0" />
                <span>Generic Generative AI</span>
              </div>
              <div className="p-4 sm:p-5 text-cyan-300 bg-cyan-950/20 flex items-center space-x-2 border-l border-white/10">
                <Check className="h-4 w-4 shrink-0" />
                <span>ApplyWise AI Engine</span>
              </div>
            </div>

            <div className="divide-y divide-white/5 text-xs sm:text-sm">
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
                <div key={idx} className="grid grid-cols-2">
                  <div className="p-5 text-slate-400 bg-white/[0.01] border-r border-white/5 space-y-1">
                    <div className="font-mono text-[10px] text-slate-500 uppercase">{row.issue}</div>
                    <p className="text-xs text-rose-300/80 leading-relaxed">{row.bad}</p>
                  </div>
                  <div className="p-5 text-slate-200 bg-cyan-950/10 space-y-1">
                    <div className="font-mono text-[10px] text-cyan-400 uppercase">{row.issue}</div>
                    <p className="text-xs text-cyan-200 leading-relaxed font-medium">{row.good}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Section E: Live Job Discovery */}
      <section id="jobs" className="py-24 bg-[#050811] border-t border-white/10 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
              <span className="text-cyan-400 font-mono text-xs tracking-widest uppercase">
                // Live Stream
              </span>
              <h2 className="text-3xl font-extrabold text-white tracking-tight">
                Live Discovered Vacancies
              </h2>
              <p className="text-slate-400 text-xs sm:text-sm">
                Real-time openings aggregated across verified engineering, product, and operations boards.
              </p>
            </div>
            <button
              onClick={() => onOpenAuth('signup')}
              className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-cyan-300 font-mono text-xs uppercase tracking-wider flex items-center space-x-2 w-fit transition-colors"
            >
              <span>Explore All Live Listings</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredVacancies.slice(0, 6).map(v => (
              <div
                key={v.id}
                onClick={() => onSelectVacancy(v)}
                className="group p-6 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-cyan-500/40 hover:bg-white/[0.04] transition-all cursor-pointer flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-cyan-400 font-mono text-[10px] uppercase">
                      {v.source}
                    </span>
                    {v.remote && (
                      <span className="px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-[10px] font-semibold">
                        Remote
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white group-hover:text-cyan-300 transition-colors line-clamp-1">
                      {v.title}
                    </h3>
                    <div className="flex items-center space-x-1.5 text-xs text-slate-400 mt-1">
                      <Building className="h-3.5 w-3.5 text-slate-500" />
                      <span>{v.company}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs text-slate-400 font-mono">
                  <div className="flex items-center space-x-1 truncate max-w-[170px]">
                    <MapPin className="h-3 w-3 text-slate-500 shrink-0" />
                    <span className="truncate">{v.location}</span>
                  </div>
                  <span className="text-cyan-400 font-semibold flex items-center space-x-1 group-hover:translate-x-1 transition-transform">
                    <span>Inspect</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section F: Founder & Product Story */}
      <section id="founder">
        <FounderSection theme="dark" onReadStory={onOpenAbout} />
      </section>

      {/* Section G: Final Call to Action */}
      <section className="py-24 bg-gradient-to-b from-[#030712] via-[#090d1a] to-[#030712] relative overflow-hidden border-t border-white/10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-8 relative z-10">
          <span className="text-cyan-400 font-mono text-xs tracking-widest uppercase">
            // Make Your Next Move
          </span>

          <h2 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-white tracking-tight leading-tight">
            Make your next move <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
              a considered one.
            </span>
          </h2>

          <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto leading-relaxed">
            Create your free account today. Construct your verified Career Digital Twin, discover authentic vacancies, and apply with mathematical precision.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <button
              onClick={() => onOpenAuth('signup')}
              className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-black font-bold text-sm rounded-xl shadow-[0_0_30px_-5px_rgba(6,182,212,0.5)] transition-all"
            >
              Start for Free
            </button>
            <button
              onClick={() => onOpenAuth('login')}
              className="w-full sm:w-auto px-8 py-3.5 bg-white/5 hover:bg-white/10 border border-white/15 text-slate-300 hover:text-white font-semibold text-sm rounded-xl backdrop-blur-md transition-colors"
            >
              Sign In to Existing Account
            </button>
          </div>
        </div>
      </section>

      {/* Footer - Cinematic Dark */}
      <footer className="mt-auto bg-[#02050b] text-slate-400 py-12 text-xs border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <BrandLogo
            variant="dark"
            size="sm"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          />

          <div className="flex flex-wrap items-center justify-center gap-6 font-mono text-[11px] uppercase tracking-wider text-slate-500">
            {onOpenAbout && (
              <button onClick={onOpenAbout} className="hover:text-cyan-400 transition-colors">
                About Us
              </button>
            )}
            {onOpenPricing && (
              <button onClick={onOpenPricing} className="hover:text-cyan-400 transition-colors">
                Pricing & Plans
              </button>
            )}
            {onOpenAdmin && (
              <button onClick={onOpenAdmin} className="hover:text-cyan-400 transition-colors">
                Admin Portal
              </button>
            )}
            <button onClick={onOpenPrivacy} className="hover:text-cyan-400 transition-colors">
              Privacy Policy
            </button>
            <button onClick={onOpenTerms} className="hover:text-cyan-400 transition-colors">
              Terms of Use
            </button>
            <span className="text-slate-600">Zero Hallucination Standard</span>
          </div>

          <p className="text-slate-600 font-mono text-[11px]">
            © {new Date().getFullYear()} ApplyWise AI. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};
