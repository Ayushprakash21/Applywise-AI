import React, { useState, useEffect } from 'react';
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
  Compass,
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
import { GlobalFooter } from './GlobalFooter.tsx';
import { JobVacancy } from '../types/index.ts';
import { FounderSection } from './FounderSection.tsx';
import { CareerNetworkVisual } from './CareerNetworkVisual.tsx';
import { GlobalThemeSwitch } from './ui/GlobalThemeSwitch.tsx';
import { useTheme } from '../context/ThemeContext.tsx';
import { JobMatchExperience } from './JobMatchExperience.tsx';
import { CareerIntelligenceHero } from './hero/CareerIntelligenceHero.tsx';
import { CareerAscentHero } from './hero/CareerAscentHero.tsx';
import { AvCinematicHero } from './hero/AvCinematicHero.tsx';
import {
  getStoredAppearance,
  setBlackEliteAppearance,
  getStoredPalette,
  setBlackElitePalette,
  BlackElitePalette,
  BlackEliteAppearance,
  THEME_CHANGE_EVENT,
} from '../utils/blackEliteTheme.ts';

interface LandingPageProps {
  onOpenAuth: (mode: 'login' | 'signup') => void;
  onOpenPrivacy: () => void;
  onOpenTerms: () => void;
  onOpenAbout?: () => void;
  onOpenPricing?: () => void;
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
  featuredVacancies,
  onSelectVacancy,
  onSearch,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('');
  const { appearance, isDark } = useTheme();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);

      const sections = ['network', 'journey', 'cockpit', 'integrity', 'jobs'];
      const scrollPos = window.scrollY + 120;
      for (const section of sections) {
        const el = document.getElementById(section);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPos >= top && scrollPos < top + height) {
            setActiveSection(section);
            break;
          }
        }
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearch(searchQuery.trim());
    }
  };

  return (
    <div className="min-h-screen bg-[var(--be-bg-canvas,#F5F3EE)] text-[var(--be-text-primary,#20242B)] flex flex-col font-sans transition-colors duration-200">
      {/* Top Navigation — Theme-Aware Frosted Glass Overlay */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'bg-[#F5F3EE]/95 dark:bg-[#080F1C]/85 backdrop-blur-md border-b border-[#E2DFD7] dark:border-white/10 shadow-sm dark:shadow-xl'
            : 'bg-[#F5F3EE]/90 dark:bg-[#080F1C]/35 backdrop-blur-md border-b border-[#E2DFD7]/80 dark:border-white/10'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          {/* Brand Logo */}
          <BrandLogo
            variant="auto"
            size="md"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          />

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center space-x-7 text-xs font-semibold">
            <a
              href="#network"
              className={`transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#0788D1]/40 rounded-sm ${
                activeSection === 'network'
                  ? 'text-[#0788D1] dark:text-[#F4B942] font-bold'
                  : 'text-[#1B2638] dark:text-slate-200 hover:text-[#0788D1] dark:hover:text-[#F4B942]'
              }`}
            >
              Skill Alignment
            </a>
            <a
              href="#journey"
              className={`transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#0788D1]/40 rounded-sm ${
                activeSection === 'journey'
                  ? 'text-[#0788D1] dark:text-[#F4B942] font-bold'
                  : 'text-[#1B2638] dark:text-slate-200 hover:text-[#0788D1] dark:hover:text-[#F4B942]'
              }`}
            >
              How It Works
            </a>
            <a
              href="#cockpit"
              className={`transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#0788D1]/40 rounded-sm ${
                activeSection === 'cockpit'
                  ? 'text-[#0788D1] dark:text-[#F4B942] font-bold'
                  : 'text-[#1B2638] dark:text-slate-200 hover:text-[#0788D1] dark:hover:text-[#F4B942]'
              }`}
            >
              Job Match Preview
            </a>
            <a
              href="#integrity"
              className={`transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#0788D1]/40 rounded-sm ${
                activeSection === 'integrity'
                  ? 'text-[#0788D1] dark:text-[#F4B942] font-bold'
                  : 'text-[#1B2638] dark:text-slate-200 hover:text-[#0788D1] dark:hover:text-[#F4B942]'
              }`}
            >
              Integrity Standard
            </a>
            <a
              href="#jobs"
              className={`transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#0788D1]/40 rounded-sm ${
                activeSection === 'jobs'
                  ? 'text-[#0788D1] dark:text-[#F4B942] font-bold'
                  : 'text-[#1B2638] dark:text-slate-200 hover:text-[#0788D1] dark:hover:text-[#F4B942]'
              }`}
            >
              Live Vacancies
            </a>
            {onOpenPricing && (
              <button
                onClick={onOpenPricing}
                className="text-[#1B2638] dark:text-slate-200 hover:text-[#0788D1] dark:hover:text-[#F4B942] transition-colors font-semibold cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#0788D1]/40 rounded-sm"
              >
                Pricing
              </button>
            )}
            {onOpenAbout && (
              <button
                onClick={onOpenAbout}
                className="text-[#1B2638] dark:text-slate-200 hover:text-[#0788D1] dark:hover:text-[#F4B942] transition-colors font-semibold cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#0788D1]/40 rounded-sm"
              >
                About Us
              </button>
            )}
          </nav>

          {/* Action CTAs & Global Theme Switch Slider */}
          <div className="hidden lg:flex items-center space-x-3">
            <GlobalThemeSwitch />
            <button
              onClick={() => onOpenAuth('login')}
              aria-label="Sign In"
              data-testid="sign-in-button"
              className="px-4 py-2 text-xs font-semibold text-[#1B2638] hover:text-[#0788D1] dark:text-slate-200 dark:hover:text-white transition-colors cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#0788D1]/40 rounded-lg"
            >
              Sign In
            </button>
            <button
              onClick={() => onOpenAuth('signup')}
              aria-label="Getting Started"
              data-testid="getting-started-button"
              className="group px-5 py-2.5 rounded-xl text-xs font-bold text-[#080F1C] bg-[#F4B942] hover:bg-[#F3B748] transition-all flex items-center space-x-1.5 shadow-md cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#F4B942]/60"
            >
              <span>Get Started Free</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          {/* Mobile menu trigger */}
          <div className="lg:hidden flex items-center space-x-2">
            <GlobalThemeSwitch size="sm" />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-[#1B2638] hover:text-[#0788D1] dark:text-slate-200 dark:hover:text-white transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#0788D1]/40 rounded-lg"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <CloseIcon className="h-6 w-6 text-current" /> : <Menu className="h-6 w-6 text-current" />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-[#F5F3EE]/95 dark:bg-[#080F1C]/95 backdrop-blur-xl border-b border-[#E2DFD7] dark:border-white/10 px-6 py-6 space-y-4 text-xs font-semibold text-[#1B2638] dark:text-slate-200 animate-in fade-in slide-in-from-top-2 shadow-xl">
            <a
              href="#network"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-[#1B2638] hover:text-[#0788D1] dark:text-slate-200 dark:hover:text-[#F4B942]"
            >
              Skill Alignment
            </a>
            <a
              href="#journey"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-[#1B2638] hover:text-[#0788D1] dark:text-slate-200 dark:hover:text-[#F4B942]"
            >
              How It Works
            </a>
            <a
              href="#cockpit"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-[#1B2638] hover:text-[#0788D1] dark:text-slate-200 dark:hover:text-[#F4B942]"
            >
              Job Match Preview
            </a>
            <a
              href="#integrity"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-[#1B2638] hover:text-[#0788D1] dark:text-slate-200 dark:hover:text-[#F4B942]"
            >
              Integrity Standard
            </a>
            <a
              href="#jobs"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-[#1B2638] hover:text-[#0788D1] dark:text-slate-200 dark:hover:text-[#F4B942]"
            >
              Live Vacancies
            </a>
            {onOpenPricing && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenPricing();
                }}
                className="block w-full text-left py-2 text-[#1B2638] hover:text-[#0788D1] dark:text-slate-200 dark:hover:text-[#F4B942]"
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
                className="block w-full text-left py-2 text-[#1B2638] hover:text-[#0788D1] dark:text-slate-200 dark:hover:text-[#F4B942]"
              >
                About Us
              </button>
            )}
            <div className="pt-4 border-t border-[#E2DFD7] dark:border-white/10 flex flex-col space-y-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAuth('login');
                }}
                className="w-full py-2.5 rounded-xl bg-slate-200/80 hover:bg-slate-300/80 border border-slate-300/60 dark:bg-white/5 dark:border-white/15 dark:hover:bg-white/10 flex items-center justify-center font-semibold text-[#1B2638] dark:text-white transition-colors cursor-pointer"
              >
                Sign In
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAuth('signup');
                }}
                className="w-full py-2.5 rounded-xl text-[#080F1C] bg-[#F4B942] hover:bg-[#F3B748] font-bold flex items-center justify-center transition-colors shadow-md cursor-pointer"
              >
                Get Started Free
              </button>
            </div>
          </div>
        )}
      </header>

      {/* APPLYWISE AI — THE SINGLE PRIMARY CINEMATIC AV HERO (Image 3) */}
      <AvCinematicHero
        onOpenAuth={onOpenAuth}
        onExploreHowItWorks={() => {
          const el = document.getElementById('journey');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }}
        onSearch={onSearch}
        vacancies={featuredVacancies}
        onSelectVacancy={onSelectVacancy}
      />

      {/* 
        Hero and visual components registry contracts (superseded by single cinematic AV hero):
        <CareerAscentHero
          onExploreJobs={() => onSearch('')}
          onBuildProfile={() => onOpenAuth('signup')}
          vacancies={featuredVacancies}
          onSelectVacancy={onSelectVacancy}
        />
        <CareerIntelligenceHero
          onOpenAuth={onOpenAuth}
          onSearch={onSearch}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          handleSearchSubmit={handleSearchSubmit}
          vacancies={featuredVacancies}
          onSelectVacancy={onSelectVacancy}
        />
      */}

      {/* Career Opportunity Universe Section — Architectural Discovery Metadata */}
      <section id="network" className="sr-only" aria-hidden="true">
        <div className="sr-only">
          <h3>Career Opportunity Universe</h3>
          <p>Explore where your verified experience connects with real career opportunities.</p>
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
            <div className="p-6 sm:p-7 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 hover:shadow-xs transition-all duration-200 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl bg-[#F5F3EE] border border-slate-200 flex items-center justify-center text-slate-900">
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
            <div className="p-6 sm:p-7 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 hover:shadow-xs transition-all duration-200 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl bg-[#F5F3EE] border border-slate-200 flex items-center justify-center text-emerald-700">
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
            <div className="p-6 sm:p-7 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 hover:shadow-xs transition-all duration-200 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl bg-[#F5F3EE] border border-slate-200 flex items-center justify-center text-slate-900">
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
      <section id="journey" className={`py-16 sm:py-20 border-b transition-colors duration-200 ${
        isDark ? 'border-slate-800' : 'border-slate-300/60'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-2.5">
            <span className={`font-semibold text-xs tracking-wider uppercase transition-colors duration-200 ${
              isDark ? 'text-[#FFB15C]' : 'text-blue-600'
            }`}>
              Step-by-Step Guidance
            </span>
            <h2 className={`text-2xl sm:text-4xl font-extrabold tracking-tight transition-colors duration-200 ${
              isDark ? 'text-[#FFFFFF]' : 'text-slate-900'
            }`}>
              From raw resume to tracked applications.
            </h2>
            <p className={`text-xs sm:text-sm leading-relaxed transition-colors duration-200 ${
              isDark ? 'text-[#C5C9D0]' : 'text-slate-600'
            }`}>
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
                className={`p-6 rounded-2xl border transition-all duration-200 flex flex-col justify-between hover:shadow-xs ${
                  isDark
                    ? 'bg-[#17191D] border-[#30343A] hover:border-[#454A52]'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className={`flex items-center justify-between pb-3 mb-3 border-b ${
                    isDark ? 'border-[#454A52]' : 'border-slate-200/80'
                  }`}>
                    <span className={`font-mono text-2xl font-black ${
                      isDark ? 'text-[#FFFFFF]' : 'text-slate-900'
                    }`}>
                      {stage.num}
                    </span>
                    <span className={`text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-lg border ${
                      isDark
                        ? 'bg-[#282B31] border-[#454A52] text-[#E6E8EB]'
                        : 'bg-[#F5F3EE] border-slate-200 text-slate-700'
                    }`}>
                      {stage.badge}
                    </span>
                  </div>
                  <h3 className={`text-base font-bold mb-1 ${
                    isDark ? 'text-[#F5F5F5]' : 'text-slate-900'
                  }`}>
                    {stage.title}
                  </h3>
                  <div className={`text-xs font-semibold mb-2 ${
                    isDark ? 'text-[#FFB15C]' : 'text-[var(--be-accent,#A78343)]'
                  }`}>
                    {stage.subtitle}
                  </div>
                  <p className={`text-xs leading-relaxed ${
                    isDark ? 'text-[#C5C9D0]' : 'text-slate-600'
                  }`}>
                    {stage.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section C: Three-Tab Evidence & Match Verification Experience */}
      <section id="cockpit" className="py-16 sm:py-20 border-b border-slate-300/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-10">
          <div className="text-center max-w-3xl mx-auto space-y-2.5">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Your job match
            </h2>
            <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
              See how your experience aligns with this role and discover actionable ways to strengthen your application.
            </p>
          </div>

          <JobMatchExperience
            isLandingPage={true}
            onOpenAuth={onOpenAuth}
          />
        </div>
      </section>

      {/* Section D: The Zero-Hallucination Standard */}
      <section id="integrity" className="py-16 sm:py-20 bg-[#F8FAFC] dark:bg-[var(--be-bg-primary,#0D1014)] border-b border-slate-200/80 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-10">
          <div className="text-center max-w-3xl mx-auto space-y-2.5">
            <span className="text-blue-600 dark:text-sky-400 font-semibold text-xs tracking-wider uppercase">
              Application Integrity Engine
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-[var(--be-text-primary,#F2F0EA)] tracking-tight">
              The Zero-Hallucination Standard.
            </h2>
            <p className="text-slate-600 dark:text-[var(--be-text-secondary,#C0BDB5)] text-xs sm:text-sm leading-relaxed">
              Most AI career tools make up numbers, fabricate employers, and flood ATS portals with toxic spam. ApplyVise AI is engineered with rigorous mathematical verification.
            </p>
          </div>

          {/* Comparison Matrix */}
          <div className="max-w-4xl mx-auto rounded-2xl bg-white dark:bg-[#14171C] border border-slate-200 dark:border-slate-800 shadow-md overflow-hidden">
            <div className="grid grid-cols-1 sm:grid-cols-2 text-xs font-semibold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              {/* Left Column Header — Generic Generative AI */}
              <div className="p-4 sm:p-5 text-rose-700 dark:text-rose-300 bg-rose-50/80 dark:bg-rose-950/40 flex items-center space-x-2">
                <X className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
                <span className="font-bold tracking-wide">Generic Generative AI</span>
              </div>
              {/* Right Column Header — ApplyVise AI Engine (Premium Dark Navy Header) */}
              <div
                data-theme-surface="dark"
                className="p-4 sm:p-5 text-white bg-[#0D1B30] flex items-center space-x-2.5 border-t sm:border-t-0 sm:border-l border-slate-700/60 shadow-inner"
              >
                <div className="h-5 w-5 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 border border-emerald-400/40">
                  <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                </div>
                <span className="font-bold tracking-wide text-white text-xs sm:text-sm">ApplyVise AI Engine</span>
              </div>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs sm:text-sm">
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
                <div key={idx} className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-slate-800/80">
                  {/* Left Column Row — Generic Generative AI */}
                  <div className="p-4 sm:p-5 text-slate-600 dark:text-slate-300 bg-white dark:bg-[#14171C] space-y-1.5">
                    <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{row.issue}</div>
                    <p className="text-xs text-rose-700 dark:text-rose-300/90 leading-relaxed font-medium">{row.bad}</p>
                  </div>
                  {/* Right Column Row — ApplyVise AI Engine (Premium Dark Navy Surface with High Contrast) */}
                  <div
                    data-theme-surface="dark"
                    className="p-4 sm:p-5 bg-[#0B1528] text-white space-y-1.5 border-t sm:border-t-0 sm:border-l border-slate-800/60"
                  >
                    <div className="text-[10px] font-bold text-sky-300 dark:text-sky-300 uppercase tracking-wider">{row.issue}</div>
                    <p className="text-xs text-slate-100 dark:text-slate-100 leading-relaxed font-medium">{row.good}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>


      {/* Section E: Live Discovered Vacancies (Image 3: 6 Vacancy Cards) */}
      <section id="jobs" className="py-16 sm:py-20 border-b border-slate-300/60 dark:border-slate-800 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-1">
              <span className="text-blue-600 dark:text-sky-400 font-semibold text-xs tracking-wider uppercase">
                Real-Time Verified Stream
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Live Discovered Vacancies
              </h2>
              <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm">
                Fresh opportunities from verified sources, updated regularly.
              </p>
            </div>
            <div>
              <button
                onClick={() => onSearch('')}
                className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-blue-600 dark:text-sky-400 hover:text-blue-700 dark:hover:text-sky-300 transition-colors cursor-pointer group"
              >
                <span>View All Jobs</span>
                <ArrowRight className="h-4 w-4 transform group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>

          {/* 6 High-Density Opportunity Cards matching Image 3 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {(featuredVacancies && featuredVacancies.length >= 6 
              ? featuredVacancies.slice(0, 6) 
              : [
                  ...featuredVacancies,
                  {
                    id: 'sample-vac-1',
                    title: 'Supply Chain Operations Lead',
                    company: 'Apex Logistics',
                    location: 'Bengaluru',
                    country: 'India',
                    arrangement: 'hybrid',
                    remote: false,
                    url: 'https://applywise.ai/jobs/scm-lead',
                    description: 'Lead supply chain distribution, vendor relations and inventory operations across regional fulfillment hubs.',
                    publishedAt: '1h ago',
                    source: 'direct_feed',
                    requirements: ['Supply Chain', 'Operations'],
                    tags: ['Logistics', 'Operations'],
                    retrievedAt: new Date().toISOString(),
                    isActive: true,
                  },
                  {
                    id: 'sample-vac-2',
                    title: 'Project Manager - SCM',
                    company: 'Nexus Global',
                    location: 'Hyderabad',
                    country: 'India',
                    arrangement: 'onsite',
                    remote: false,
                    url: 'https://applywise.ai/jobs/pm-scm',
                    description: 'Coordinate cross-functional logistics planning, freight tracking, and operational efficiency milestones.',
                    publishedAt: '2h ago',
                    source: 'direct_feed',
                    requirements: ['Project Management', 'SCM'],
                    tags: ['SCM', 'Management'],
                    retrievedAt: new Date().toISOString(),
                    isActive: true,
                  },
                  {
                    id: 'sample-vac-3',
                    title: 'Operations Excellence Analyst',
                    company: 'Starlight Tech',
                    location: 'Pune',
                    country: 'India',
                    arrangement: 'hybrid',
                    remote: false,
                    url: 'https://applywise.ai/jobs/ops-analyst',
                    description: 'Analyze fulfillment throughput, optimize warehouse logistics workflows, and track KPI dashboards.',
                    publishedAt: '2h ago',
                    source: 'direct_feed',
                    requirements: ['Operations', 'Analytics'],
                    tags: ['Operations', 'Analytics'],
                    retrievedAt: new Date().toISOString(),
                    isActive: true,
                  },
                  {
                    id: 'sample-vac-4',
                    title: 'Demand Planning Specialist',
                    company: 'Horizon Retail',
                    location: 'Chennai',
                    country: 'India',
                    arrangement: 'hybrid',
                    remote: false,
                    url: 'https://applywise.ai/jobs/demand-planning',
                    description: 'Develop demand forecasts, evaluate historic procurement data, and synchronize inventory buffers.',
                    publishedAt: '3h ago',
                    source: 'direct_feed',
                    requirements: ['Demand Planning', 'ERP'],
                    tags: ['Planning', 'Procurement'],
                    retrievedAt: new Date().toISOString(),
                    isActive: true,
                  },
                  {
                    id: 'sample-vac-5',
                    title: 'Supply Chain Data Analyst',
                    company: 'BluePeak Analytics',
                    location: 'Gurugram',
                    country: 'India',
                    arrangement: 'onsite',
                    remote: false,
                    url: 'https://applywise.ai/jobs/sc-data-analyst',
                    description: 'Build predictive dispatch pipelines, visualize freight SLA benchmarks, and model route cost efficiency.',
                    publishedAt: '3h ago',
                    source: 'direct_feed',
                    requirements: ['SQL', 'Python'],
                    tags: ['Data Analysis', 'Supply Chain'],
                    retrievedAt: new Date().toISOString(),
                    isActive: true,
                  },
                  {
                    id: 'sample-vac-6',
                    title: 'Procurement Operations Analyst',
                    company: 'Crestfield Industries',
                    location: 'Mumbai',
                    country: 'India',
                    arrangement: 'hybrid',
                    remote: false,
                    url: 'https://applywise.ai/jobs/procurement-ops',
                    description: 'Manage procurement audits, purchase requisition verification, and strategic vendor contract compliance.',
                    publishedAt: '4h ago',
                    source: 'direct_feed',
                    requirements: ['Procurement', 'Contract Analysis'],
                    tags: ['Procurement', 'Finance Operations'],
                    retrievedAt: new Date().toISOString(),
                    isActive: true,
                  },
                ]
            ).slice(0, 6).map((vac) => {
              const locationText = vac.location || (vac.remote ? 'Remote' : 'Location Unspecified');
              const arrangementBadge = vac.arrangement || (vac.remote ? 'Remote' : 'On-site');
              const timeDisplay = vac.publishedAt 
                ? (typeof vac.publishedAt === 'string' && vac.publishedAt.includes('ago') 
                    ? vac.publishedAt 
                    : 'Verified active') 
                : '1h ago';

              return (
                <div
                  key={vac.id}
                  onClick={() => onSelectVacancy ? onSelectVacancy(vac as any) : onSearch(vac.title)}
                  className="p-5 rounded-2xl bg-white dark:bg-[#14171C] border border-slate-200 dark:border-slate-800/80 hover:border-blue-500/50 dark:hover:border-sky-500/50 hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-sky-950/40 border border-blue-100 dark:border-sky-900/60 flex items-center justify-center text-blue-600 dark:text-sky-400 shrink-0">
                          <Briefcase className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-sky-400 transition-colors">
                            {vac.title}
                          </h3>
                          <div className="text-xs text-slate-500 dark:text-slate-400 truncate flex items-center gap-1.5 mt-0.5">
                            <span className="font-medium text-slate-700 dark:text-slate-300">{vac.company}</span>
                            <span>•</span>
                            <span>{locationText}</span>
                            {arrangementBadge && (
                              <>
                                <span>•</span>
                                <span className="capitalize">{arrangementBadge}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 mt-4 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs">
                    <span className="text-slate-400 dark:text-slate-500 font-medium">
                      {timeDisplay}
                    </span>
                    <span className="inline-flex items-center gap-1 font-bold text-blue-600 dark:text-sky-400 group-hover:translate-x-0.5 transition-transform">
                      <span>Apply</span>
                      <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Section F: Meet the Founder */}
      <section id="founder">
        <FounderSection theme="light" onReadStory={onOpenAbout} />
      </section>

      {/* Section G: Call to Action */}
      <section className="py-16 sm:py-20 bg-blue-600 text-white relative overflow-hidden" data-theme-surface="dark">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-5 relative z-10" data-theme-surface="dark">
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
              className="w-full sm:w-auto px-8 py-3.5 bg-white hover:bg-slate-100 text-slate-900 font-extrabold text-sm rounded-xl shadow-md transition-all cursor-pointer"
            >
              Start for Free
            </button>
            <button
              onClick={() => onOpenAuth('login')}
              className="w-full sm:w-auto px-8 py-3.5 bg-blue-700/60 hover:bg-blue-700 border border-blue-400/40 text-white font-semibold text-sm rounded-xl transition-colors cursor-pointer"
            >
              Sign In to Existing Account
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <GlobalFooter
        variant="landing"
        onOpenAbout={onOpenAbout}
        onOpenPricing={onOpenPricing}
        onOpenPrivacy={onOpenPrivacy}
        onOpenTerms={onOpenTerms}
      />
    </div>
  );
};
