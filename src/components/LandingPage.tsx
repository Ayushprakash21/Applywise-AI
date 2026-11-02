import React, { useState } from 'react';
import {
  Search,
  Sparkles,
  ShieldCheck,
  Compass,
  FileCheck,
  ArrowRight,
  Globe,
  Briefcase,
  CheckCircle2,
  Building,
  Lock,
  ChevronRight,
  MapPin
} from 'lucide-react';
import { BrandLogo } from './BrandLogo.tsx';
import { JobVacancy } from '../types/index.ts';
import { FounderSection } from './FounderSection.tsx';

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

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearch(searchQuery.trim());
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <BrandLogo size="md" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} />

          <div className="hidden md:flex items-center space-x-6 text-xs font-semibold text-slate-600">
            <a href="#features" className="hover:text-blue-600 transition">Features</a>
            <a href="#how-it-works" className="hover:text-blue-600 transition">How It Works</a>
            <a href="#real-jobs" className="hover:text-blue-600 transition">Live Discovery</a>
            {onOpenPricing && (
              <button onClick={onOpenPricing} className="hover:text-blue-600 transition">
                Pricing
              </button>
            )}
            {onOpenAbout && (
              <button onClick={onOpenAbout} className="hover:text-blue-600 transition">
                About Us
              </button>
            )}
            <button onClick={onOpenPrivacy} className="hover:text-blue-600 transition">Privacy</button>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => onOpenAuth('login')}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 transition"
            >
              Sign In
            </button>
            <button
              onClick={() => onOpenAuth('signup')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm shadow-blue-500/20 transition flex items-center space-x-1.5"
            >
              <span>Get Started Free</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28">
        {/* Subtle Ambient Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-blue-50/60 via-indigo-50/30 to-transparent pointer-events-none -z-10 rounded-full blur-3xl opacity-70" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center space-y-6">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-semibold shadow-xs">
            <Sparkles className="h-3.5 w-3.5 text-blue-600" />
            <span>ApplyWise AI 2.0 — Truthful Application Intelligence</span>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
            Discover real vacancies. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              Apply with truthful precision.
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-600 leading-relaxed">
            A free AI-powered career platform providing personalized job discovery, zero-hallucination resume tailoring, cross-country matching, and guided application assistance.
          </p>

          {/* Interactive Search Bar Teaser */}
          <div className="max-w-2xl mx-auto pt-2">
            <form onSubmit={handleSearchSubmit} className="relative flex items-center glass-card p-2 rounded-2xl shadow-lg border border-slate-200">
              <Search className="h-5 w-5 text-slate-400 ml-3 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by title or skill (e.g. Product Manager, React, Operations)..."
                className="w-full px-3 py-2 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 outline-none bg-transparent"
              />
              <button
                type="submit"
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-md shadow-blue-500/20 shrink-0 transition"
              >
                Find Jobs
              </button>
            </form>

            <div className="flex flex-wrap items-center justify-center gap-2 mt-3 text-xs text-slate-500">
              <span className="font-medium text-slate-400">Popular:</span>
              {['Software Engineer', 'Product Manager', 'Data Analyst', 'Marketing', 'DevOps'].map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => { setSearchQuery(tag); onSearch(tag); }}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 transition"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Core Pillars / Features Section */}
      <section id="features" className="py-16 bg-white border-y border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Engineered for genuine career advancement
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Unlike generic resume spammers, ApplyWise AI enforces strict factual accuracy and employer-aligned compliance.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 shadow-xs space-y-3">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl w-fit">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Zero-Hallucination Tailoring</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                All tailored resumes, bullet points, and cover letters are strictly derived from your verified master profile. We never invent employers, metrics, or degrees.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 shadow-xs space-y-3">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl w-fit">
                <Globe className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Real Multi-Source Vacancies</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Live aggregations across Remotive, Arbeitnow, and Jobicy feeds. Explore verified remote and on-site listings across the US, Canada, Europe, and globally.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 shadow-xs space-y-3">
              <div className="p-3 bg-purple-50 text-purple-600 rounded-xl w-fit">
                <FileCheck className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Guided Truthful Submissions</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                We never fake submission receipts. External portal applications provide tailored ATS downloads, prefilled fields, and verified confirmation tracking.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-16 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              A simple, transparent 4-step journey
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              From raw resume to verified application tracking in minutes.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { num: '01', title: 'Upload Resume', desc: 'Securely extract your verified career history from text-based PDF or DOCX documents.' },
              { num: '02', title: 'Set Preferences', desc: 'Choose target countries, desired roles, salary floors, and remote preferences.' },
              { num: '03', title: 'Discover & Match', desc: 'AI evaluates vacancy descriptions against your real skills and generates an honesty-audited match score.' },
              { num: '04', title: 'Prepare & Apply', desc: 'Download ATS-compatible DOCX resumes and track each verified application.' },
            ].map(step => (
              <div key={step.num} className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-2 relative">
                <span className="text-2xl font-black text-blue-100 font-mono">{step.num}</span>
                <h4 className="text-sm font-bold text-slate-900">{step.title}</h4>
                <p className="text-xs text-slate-500 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Live Featured Vacancies Preview */}
      <section id="real-jobs" className="py-16 bg-white border-t border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Live Discovered Roles</h2>
              <p className="text-xs text-slate-500 mt-0.5">Explore recent vacancies aggregated directly from official job boards.</p>
            </div>
            <button
              onClick={() => onOpenAuth('signup')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center space-x-1"
            >
              <span>View all available listings</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {featuredVacancies.slice(0, 6).map(v => (
              <div
                key={v.id}
                onClick={() => onSelectVacancy(v)}
                className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-blue-400 hover:shadow-md transition cursor-pointer flex flex-col justify-between space-y-3"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-mono uppercase">
                      {v.source}
                    </span>
                    {v.remote && (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-semibold">
                        Remote
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-sm text-slate-900 line-clamp-1">{v.title}</h3>
                  <div className="flex items-center space-x-1 text-xs text-blue-600 font-medium">
                    <Building className="h-3.5 w-3.5 shrink-0" />
                    <span>{v.company}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center space-x-1">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <span className="truncate max-w-[150px]">{v.location}</span>
                  </div>
                  <span className="text-blue-600 font-semibold flex items-center space-x-1">
                    <span>Details</span>
                    <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Meet the Founder Section */}
      <FounderSection onReadStory={onOpenAbout} />

      {/* CTA Footer Banner */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-6">
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Ready to optimize your application process?
          </h2>
          <p className="text-xs sm:text-sm text-blue-100 max-w-xl mx-auto">
            Create your free account today. Upload your resume, configure your target roles, and start applying with verified confidence.
          </p>
          <div className="flex items-center justify-center space-x-4 pt-2">
            <button
              onClick={() => onOpenAuth('signup')}
              className="px-6 py-3 bg-white text-blue-700 hover:bg-blue-50 rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-blue-900/20 transition"
            >
              Sign Up Free
            </button>
            <button
              onClick={() => onOpenAuth('login')}
              className="px-6 py-3 bg-blue-800/60 hover:bg-blue-800 text-white rounded-xl text-xs sm:text-sm font-semibold transition"
            >
              Sign In
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto bg-slate-900 text-slate-400 py-12 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <BrandLogo variant="dark" size="sm" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} />

          <div className="flex flex-wrap items-center justify-center gap-6">
            {onOpenAbout && (
              <button onClick={onOpenAbout} className="hover:text-white transition">About Us</button>
            )}
            {onOpenPricing && (
              <button onClick={onOpenPricing} className="hover:text-white transition">Pricing & Plans</button>
            )}
            {onOpenAdmin && (
              <button onClick={onOpenAdmin} className="hover:text-white transition">Admin Portal</button>
            )}
            <button onClick={onOpenPrivacy} className="hover:text-white transition">Privacy Policy</button>
            <button onClick={onOpenTerms} className="hover:text-white transition">Terms of Use</button>
            <span>Free Public Service</span>
            <span>Zero Hallucination Guarantee</span>
          </div>

          <p className="text-slate-500 text-[11px]">
            © {new Date().getFullYear()} ApplyWise AI. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};
