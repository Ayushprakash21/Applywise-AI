import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Search,
  Briefcase,
  Layers,
  Activity,
  CheckCircle2,
  Target,
  Cpu,
  TrendingUp,
  Compass,
  FileText,
  Check,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';

export interface CareerIntelligenceHeroProps {
  onOpenAuth: (mode: 'login' | 'signup') => void;
  onSearch: (query: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  handleSearchSubmit: (e: React.FormEvent) => void;
  popularTags?: string[];
}

export const CareerIntelligenceHero: React.FC<CareerIntelligenceHeroProps> = ({
  onOpenAuth,
  onSearch,
  searchQuery,
  setSearchQuery,
  handleSearchSubmit,
  popularTags = [
    'Software Engineer',
    'Product Manager',
    'Data Analyst',
    'Marketing',
    'DevOps',
    'Customer Success',
  ],
}) => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'experience' | 'skills' | 'opportunities' | 'progress'>('all');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(mediaQuery.matches);
      const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, []);

  return (
    <section
      aria-label="Career Intelligence Hero"
      className="relative overflow-hidden pt-8 pb-16 md:pt-14 md:pb-24 border-b border-[var(--be-border-subtle,#DEDAD0)] bg-[var(--be-bg-canvas,#F5F3EE)] text-[var(--be-text-primary,#20242B)] transition-colors duration-200"
    >
      {/* Subtle Architectural Grid Lines */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-25"
        style={{
          backgroundImage: `linear-gradient(to right, var(--be-border-subtle, #DEDAD0) 1px, transparent 1px),
                            linear-gradient(to bottom, var(--be-border-subtle, #DEDAD0) 1px, transparent 1px)`,
          backgroundSize: '4rem 4rem',
          maskImage: 'radial-gradient(ellipse 65% 55% at 50% 35%, black 40%, transparent 85%)',
          WebkitMaskImage: 'radial-gradient(ellipse 65% 55% at 50% 35%, black 40%, transparent 85%)',
        }}
        aria-hidden="true"
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Editorial Top Eyebrow */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-semibold bg-[var(--be-bg-card,#FFFFFF)] border border-[var(--be-border-subtle,#DEDAD0)] shadow-2xs">
            <span
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: 'var(--be-accent, #A78343)' }}
              aria-hidden="true"
            />
            <span className="tracking-wide text-[var(--be-text-secondary,#555C66)]">
              APPLYVISE AI · UNIFIED CAREER OPERATING SYSTEM
            </span>
          </div>

          <div className="hidden sm:inline-flex items-center space-x-2 text-xs font-medium text-[var(--be-text-muted,#707782)]">
            <ShieldCheck className="h-4 w-4 text-[var(--be-accent,#A78343)]" />
            <span>Mathematical Fit Engine · Zero AI Hallucinations</span>
          </div>
        </div>

        {/* Asymmetrical Editorial Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Editorial Headline & Value Narrative (7 Columns) */}
          <div className="lg:col-span-6 xl:col-span-7 space-y-6">
            <div className="space-y-4">
              <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-[var(--be-text-primary,#191D24)] tracking-tight leading-[1.08] font-heading">
                Your Career.{' '}
                <span
                  className="block sm:inline"
                  style={{ color: 'var(--be-accent, #A78343)' }}
                >
                  Beyond the Next Application.
                </span>
              </h1>

              <p className="max-w-2xl text-base sm:text-lg text-[var(--be-text-secondary,#555C66)] leading-relaxed font-sans">
                Bring your professional experience, skills, opportunities and applications into one intelligent career workspace. Grounded in mathematical truth — never fabricated claims.
              </p>
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => onOpenAuth('signup')}
                data-testid="hero-primary-cta"
                className="group px-6 py-3.5 rounded-xl font-semibold text-sm text-[var(--be-accent-contrast,#FFFFFF)] transition-all flex items-center space-x-2 cursor-pointer shadow-sm hover:shadow-md"
                style={{
                  backgroundColor: 'var(--be-accent, #A78343)',
                }}
              >
                <span>Build My Career Strategy</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </button>

              <a
                href="#network"
                data-testid="hero-secondary-cta"
                className="px-6 py-3.5 rounded-xl font-semibold text-sm bg-[var(--be-bg-card,#FFFFFF)] border border-[var(--be-border-subtle,#DEDAD0)] text-[var(--be-text-primary,#20242B)] hover:bg-[var(--be-bg-elevated,#FAF8F5)] transition-colors flex items-center space-x-2 cursor-pointer shadow-2xs"
              >
                <span>Explore the Platform</span>
                <Compass className="h-4 w-4 text-[var(--be-text-muted,#707782)]" />
              </a>
            </div>

            {/* Editorial Trust Metrics */}
            <div className="pt-4 grid grid-cols-3 gap-4 border-t border-[var(--be-border-subtle,#DEDAD0)]/60 text-xs">
              <div>
                <div className="font-extrabold text-sm sm:text-base text-[var(--be-text-primary,#191D24)] font-heading">
                  100%
                </div>
                <div className="text-[var(--be-text-muted,#707782)] font-medium">Fact-Grounded</div>
              </div>
              <div>
                <div className="font-extrabold text-sm sm:text-base text-[var(--be-text-primary,#191D24)] font-heading">
                  12
                </div>
                <div className="text-[var(--be-text-muted,#707782)] font-medium">Verified Feeds</div>
              </div>
              <div>
                <div className="font-extrabold text-sm sm:text-base text-[var(--be-text-primary,#191D24)] font-heading">
                  0%
                </div>
                <div className="text-[var(--be-text-muted,#707782)] font-medium">Hallucinations</div>
              </div>
            </div>
          </div>

          {/* Right Column: The Career Intelligence Structure Centerpiece (5 Columns) */}
          <div className="lg:col-span-6 xl:col-span-5 relative">
            <div
              className={`p-5 sm:p-6 rounded-2xl bg-[var(--be-bg-card,#FFFFFF)] border border-[var(--be-border-subtle,#DEDAD0)] shadow-sm space-y-5 relative transition-all duration-300 ${
                !prefersReducedMotion ? 'hover:shadow-md' : ''
              }`}
            >
              {/* Structure Header */}
              <div className="flex items-center justify-between border-b border-[var(--be-border-subtle,#DEDAD0)] pb-3">
                <div className="flex items-center space-x-2">
                  <div
                    className="w-2.5 h-2.5 rounded-sm"
                    style={{ backgroundColor: 'var(--be-accent, #A78343)' }}
                    aria-hidden="true"
                  />
                  <span className="text-xs font-bold tracking-wider uppercase text-[var(--be-text-primary,#191D24)] font-heading">
                    Career Intelligence Structure
                  </span>
                </div>
                <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md bg-[var(--be-bg-elevated,#FAF8F5)] text-[var(--be-accent,#A78343)] border border-[var(--be-border-subtle,#DEDAD0)]">
                  Live Engine
                </span>
              </div>

              {/* Four Architectural Dimensions */}
              <div className="space-y-3.5">
                {/* 1. EXPERIENCE ARCHITECTURE */}
                <div className="p-3.5 rounded-xl bg-[var(--be-bg-elevated,#FAF8F5)] border border-[var(--be-border-subtle,#DEDAD0)]/80 space-y-1.5 transition-colors">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-[var(--be-text-muted,#707782)] uppercase tracking-wider flex items-center gap-1.5">
                      <Briefcase className="h-3.5 w-3.5 text-[var(--be-accent,#A78343)]" />
                      01 · Experience
                    </span>
                    <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                      <Check className="h-3 w-3 mr-0.5" /> Verified Facts Only
                    </span>
                  </div>
                  <div className="text-xs font-bold text-[var(--be-text-primary,#191D24)]">
                    Senior Process Associate · Supply Chain Operations
                  </div>
                  <div className="text-[11px] text-[var(--be-text-secondary,#555C66)]">
                    Chronology verified across authentic employer records · Zero fabricated bullet points
                  </div>
                </div>

                {/* 2. COMPETENCY VECTORS (SKILLS) */}
                <div className="p-3.5 rounded-xl bg-[var(--be-bg-elevated,#FAF8F5)] border border-[var(--be-border-subtle,#DEDAD0)]/80 space-y-2 transition-colors">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-[var(--be-text-muted,#707782)] uppercase tracking-wider flex items-center gap-1.5">
                      <Cpu className="h-3.5 w-3.5 text-[var(--be-accent,#A78343)]" />
                      02 · Skills
                    </span>
                    <span className="text-[10px] font-medium text-[var(--be-text-muted,#707782)]">
                      Evidence-Grounded
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { name: 'System Architecture', verified: true },
                      { name: 'Distributed Operations', verified: true },
                      { name: 'TypeScript & Cloud', verified: true },
                      { name: 'Truthfulness Guarantee', verified: true },
                    ].map(skill => (
                      <span
                        key={skill.name}
                        className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[var(--be-bg-card,#FFFFFF)] border border-[var(--be-border-subtle,#DEDAD0)] text-[var(--be-text-secondary,#555C66)] flex items-center gap-1"
                      >
                        <Check className="h-2.5 w-2.5 text-[var(--be-accent,#A78343)]" />
                        {skill.name}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 3. VERIFIED OPPORTUNITY MATCH */}
                <div className="p-3.5 rounded-xl bg-[var(--be-bg-elevated,#FAF8F5)] border border-[var(--be-border-subtle,#DEDAD0)]/80 space-y-1.5 transition-colors">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-[var(--be-text-muted,#707782)] uppercase tracking-wider flex items-center gap-1.5">
                      <Target className="h-3.5 w-3.5 text-[var(--be-accent,#A78343)]" />
                      03 · Opportunities
                    </span>
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-bold text-[var(--be-accent-contrast,#FFFFFF)]"
                      style={{ backgroundColor: 'var(--be-accent, #A78343)' }}
                    >
                      94% Match
                    </span>
                  </div>
                  <div className="text-xs font-bold text-[var(--be-text-primary,#191D24)]">
                    Staff Operations & Systems Engineer
                  </div>
                  <div className="text-[11px] text-[var(--be-text-secondary,#555C66)] flex items-center justify-between">
                    <span>Arbeitnow / Remotive Verified Feed</span>
                    <span className="font-medium text-emerald-700 dark:text-emerald-400">0 Skill Gaps</span>
                  </div>
                </div>

                {/* 4. CAREER MOMENTUM TELEMETRY */}
                <div className="p-3.5 rounded-xl bg-[var(--be-bg-elevated,#FAF8F5)] border border-[var(--be-border-subtle,#DEDAD0)]/80 space-y-2 transition-colors">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-[var(--be-text-muted,#707782)] uppercase tracking-wider flex items-center gap-1.5">
                      <TrendingUp className="h-3.5 w-3.5 text-[var(--be-accent,#A78343)]" />
                      04 · Progress
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                      Audit Clean
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-1.5 rounded-lg bg-[var(--be-bg-card,#FFFFFF)] border border-[var(--be-border-subtle,#DEDAD0)]">
                      <div className="text-xs font-bold text-[var(--be-text-primary,#191D24)]">1</div>
                      <div className="text-[9px] text-[var(--be-text-muted,#707782)]">Targeted App</div>
                    </div>
                    <div className="p-1.5 rounded-lg bg-[var(--be-bg-card,#FFFFFF)] border border-[var(--be-border-subtle,#DEDAD0)]">
                      <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400">0</div>
                      <div className="text-[9px] text-[var(--be-text-muted,#707782)]">Hallucinations</div>
                    </div>
                    <div className="p-1.5 rounded-lg bg-[var(--be-bg-card,#FFFFFF)] border border-[var(--be-border-subtle,#DEDAD0)]">
                      <div className="text-xs font-bold text-[var(--be-accent,#A78343)]">100%</div>
                      <div className="text-[9px] text-[var(--be-text-muted,#707782)]">Candidate Truth</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Search Capsule — Positioned with Intentional Spatial Hierarchy */}
        <div className="max-w-3xl mx-auto pt-4 px-2 sm:px-0 space-y-4">
          <form
            onSubmit={handleSearchSubmit}
            className="relative flex flex-col sm:flex-row items-stretch sm:items-center p-2 rounded-2xl bg-[var(--be-bg-card,#FFFFFF)] border border-[var(--be-border-subtle,#DEDAD0)] gap-2 shadow-xs"
          >
            <div className="flex items-center min-w-0 flex-1 bg-[var(--be-bg-canvas,#F5F3EE)] border border-[var(--be-border-subtle,#DEDAD0)] rounded-xl px-3 py-2">
              <Search className="h-5 w-5 text-[var(--be-text-muted,#707782)] shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by title, skill, or role (e.g. Product Manager, Go, Staff Frontend)..."
                aria-label="Search jobs by title, skill, or role"
                className="w-full min-w-0 px-2.5 py-1 text-xs sm:text-sm text-[var(--be-text-primary,#20242B)] placeholder:text-[var(--be-text-muted,#707782)] outline-none bg-transparent"
              />
            </div>
            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs sm:text-sm font-semibold shrink-0 transition-colors shadow-xs cursor-pointer text-[var(--be-accent-contrast,#FFFFFF)]"
              style={{
                backgroundColor: 'var(--be-accent, #A78343)',
              }}
            >
              Find Jobs
            </button>
          </form>

          {/* Popular Filter Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-[var(--be-text-secondary,#555C66)]">
            <span className="font-semibold text-[var(--be-text-muted,#707782)]">Popular:</span>
            {popularTags.map(tag => (
              <button
                key={tag}
                type="button"
                onClick={() => {
                  setSearchQuery(tag);
                  onSearch(tag);
                }}
                className="px-3 py-1 rounded-lg bg-[var(--be-bg-card,#FFFFFF)] border border-[var(--be-border-subtle,#DEDAD0)] hover:border-[var(--be-border-focus,rgba(167,131,67,0.45))] text-[var(--be-text-secondary,#555C66)] text-xs font-medium transition-colors shadow-2xs cursor-pointer"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
