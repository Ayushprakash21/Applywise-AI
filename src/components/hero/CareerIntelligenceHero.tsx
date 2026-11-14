import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  ShieldCheck,
  Search,
  Briefcase,
  Cpu,
  Target,
  FileCheck2,
  Compass,
  Check,
  SlidersHorizontal,
  ChevronRight,
  Sparkles,
  Layers,
  Database,
  Network
} from 'lucide-react';

export interface CareerIntelligenceHeroProps {
  onOpenAuth: (mode: 'login' | 'signup') => void;
  onSearch: (query: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  handleSearchSubmit: (e: React.FormEvent) => void;
  popularTags?: string[];
}

export type OperatingDimensionKey = 'experience' | 'skills' | 'opportunities' | 'application';

interface SystemDimension {
  id: OperatingDimensionKey;
  step: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  headline: string;
  description: string;
  capabilities: { label: string; verified: boolean }[];
  systemMetric: { label: string; value: string };
}

const SYSTEM_DIMENSIONS: SystemDimension[] = [
  {
    id: 'experience',
    step: '01',
    title: 'Experience Architecture',
    icon: Briefcase,
    headline: 'Candidate Fact Registry',
    description: 'Grounds every career claim in authentic employment history extracted from verified resumes. Never hallucinates companies, titles, or dates.',
    capabilities: [
      { label: 'Chronological Verification', verified: true },
      { label: 'Master Profile Grounding', verified: true },
      { label: 'Zero-Fabrication Constraint', verified: true },
    ],
    systemMetric: { label: 'Verification Standard', value: 'Mathematical Fact Grounding' },
  },
  {
    id: 'skills',
    step: '02',
    title: 'Competency Modeling',
    icon: Cpu,
    headline: 'Evidence-Grounded Skills',
    description: 'Constructs verified competency vectors directly tied to demonstrative work history. Eliminates keyword stuffing and artificial score inflation.',
    capabilities: [
      { label: 'System Architecture', verified: true },
      { label: 'Distributed Operations', verified: true },
      { label: 'TypeScript & Cloud', verified: true },
      { label: 'Truthfulness Guarantee', verified: true },
    ],
    systemMetric: { label: 'Skill Taxonomy', value: 'Evidence-Backed Vector Model' },
  },
  {
    id: 'opportunities',
    step: '03',
    title: 'Opportunity Ingestion',
    icon: Target,
    headline: 'Live Hiring Feeds',
    description: 'Direct ingestion from enterprise ATS platforms (Greenhouse, Lever, Ashby, SmartRecruiters) and authentic employer career pages with live validation.',
    capabilities: [
      { label: 'Direct ATS Connectors', verified: true },
      { label: 'Multi-Source Deduplication', verified: true },
      { label: 'Stale Posting Rejection', verified: true },
    ],
    systemMetric: { label: 'Source Ingestion', value: 'Direct Enterprise Feeds' },
  },
  {
    id: 'application',
    step: '04',
    title: 'Application Control',
    icon: FileCheck2,
    headline: 'Verifiable Submissions',
    description: 'Generates clean, ATS-optimized DOCX applications tailored solely to verified facts, with comprehensive recruiter screening and submission audit trails.',
    capabilities: [
      { label: 'Native DOCX ATS Formatting', verified: true },
      { label: 'Pre-Submission Screening', verified: true },
      { label: 'Complete Audit Trail', verified: true },
    ],
    systemMetric: { label: 'Format Integrity', value: 'Deterministic ATS Standard' },
  },
];

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
  const [activeDimension, setActiveDimension] = useState<OperatingDimensionKey>('experience');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(mediaQuery.matches);
      const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, []);

  const currentDim = SYSTEM_DIMENSIONS.find(d => d.id === activeDimension) || SYSTEM_DIMENSIONS[0];

  return (
    <section
      aria-label="Career Intelligence Hero"
      className="relative overflow-hidden pt-8 pb-16 md:pt-14 md:pb-24 border-b border-[var(--be-border-subtle,#DEDAD0)] bg-[var(--be-bg-canvas,#F5F3EE)] text-[var(--be-text-primary,#20242B)] transition-colors duration-200"
    >
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Editorial Eyebrow & System Status */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="inline-flex items-center space-x-2.5 px-3 py-1 rounded-full text-xs font-semibold bg-[var(--be-bg-card,#FFFFFF)] border border-[var(--be-border-subtle,#DEDAD0)] shadow-2xs">
            <span
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: 'var(--be-accent, #A78343)' }}
              aria-hidden="true"
            />
            <span className="tracking-wide text-[var(--be-text-secondary,#555C66)] font-mono text-[11px]">
              APPLYVISE AI · UNIFIED CAREER OPERATING SYSTEM
            </span>
          </div>

          <div className="hidden sm:inline-flex items-center space-x-2 text-xs font-medium text-[var(--be-text-muted,#707782)]">
            <ShieldCheck className="h-4 w-4 text-[var(--be-accent,#A78343)]" />
            <span>Mathematical Fit Engine · Zero AI Hallucinations</span>
          </div>
        </div>

        {/* Central Editorial Narrative Masthead */}
        <div className="max-w-4xl space-y-5">
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-[var(--be-text-primary,#191D24)] tracking-tight leading-[1.08] font-heading">
            Your Career.{' '}
            <span
              className="block sm:inline"
              style={{ color: 'var(--be-accent, #A78343)' }}
            >
              Intelligently Orchestrated.
            </span>
          </h1>

          <p className="max-w-3xl text-base sm:text-lg md:text-xl text-[var(--be-text-secondary,#555C66)] leading-relaxed font-sans">
            Bring your professional experience, skills, opportunities and applications into one intelligent career workspace. An operating system designed to connect candidate reality with authentic market demand — grounded in mathematical truth.
          </p>

          {/* Action Callouts */}
          <div className="flex flex-wrap items-center gap-3.5 pt-2">
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
        </div>

        {/* Integrated Search & Gateway Capsule */}
        <div className="max-w-3xl space-y-3.5 pt-2">
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
                className="w-full min-w-0 px-2.5 py-1 text-xs sm:text-sm text-[var(--be-text-primary,#20242B)] placeholder:text-[var(--be-text-muted,#707782)] outline-none bg-transparent font-sans"
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

          {/* Popular Role Tags */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--be-text-secondary,#555C66)]">
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

        {/* The Career Operating System — Authentic Multi-Dimensional Architecture Canvas */}
        <div className="space-y-6 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--be-border-subtle,#DEDAD0)] pb-4">
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-[var(--be-text-primary,#191D24)] tracking-tight font-heading">
                The Career Operating System Architecture
              </h2>
              <p className="text-xs sm:text-sm text-[var(--be-text-secondary,#555C66)]">
                How authentic experience, verified skills, and real opportunities connect without fabrication.
              </p>
            </div>

            <div className="text-xs font-mono font-semibold px-2.5 py-1 rounded-lg bg-[var(--be-bg-card,#FFFFFF)] text-[var(--be-accent,#A78343)] border border-[var(--be-border-subtle,#DEDAD0)]">
              System Pipeline Architecture
            </div>
          </div>

          {/* Stage Navigation Ribbon */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {SYSTEM_DIMENSIONS.map(dim => {
              const Icon = dim.icon;
              const isActive = dim.id === activeDimension;
              return (
                <button
                  key={dim.id}
                  type="button"
                  onClick={() => setActiveDimension(dim.id)}
                  className={`p-3.5 sm:p-4 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                    isActive
                      ? 'bg-[var(--be-bg-card,#FFFFFF)] border-[var(--be-accent,#A78343)] shadow-xs'
                      : 'bg-[var(--be-bg-elevated,#FAF8F5)] border-[var(--be-border-subtle,#DEDAD0)] hover:bg-[var(--be-bg-card,#FFFFFF)]'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        isActive
                          ? 'bg-[var(--be-accent,#A78343)] text-[var(--be-accent-contrast,#FFFFFF)]'
                          : 'bg-[var(--be-bg-card,#FFFFFF)] text-[var(--be-text-muted,#707782)] border border-[var(--be-border-subtle,#DEDAD0)]'
                      }`}
                    >
                      {dim.step}
                    </span>
                    <Icon
                      className={`h-4 w-4 ${
                        isActive ? 'text-[var(--be-accent,#A78343)]' : 'text-[var(--be-text-muted,#707782)]'
                      }`}
                    />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[var(--be-text-primary,#191D24)]">
                      {dim.title}
                    </div>
                    <div className="text-[11px] text-[var(--be-text-muted,#707782)] line-clamp-1">
                      {dim.headline}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active Dimension Architectural Detail View */}
          <div className="p-6 sm:p-8 rounded-2xl bg-[var(--be-bg-card,#FFFFFF)] border border-[var(--be-border-subtle,#DEDAD0)] shadow-xs space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Dimension Concept & Core Rules (7 cols) */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center space-x-2 text-xs font-mono font-semibold text-[var(--be-accent,#A78343)]">
                  <span>SYSTEM LAYER {currentDim.step}</span>
                  <span>·</span>
                  <span className="uppercase tracking-wider">{currentDim.title}</span>
                </div>

                <h3 className="text-xl sm:text-2xl font-bold text-[var(--be-text-primary,#191D24)] font-heading">
                  {currentDim.headline}
                </h3>

                <p className="text-sm text-[var(--be-text-secondary,#555C66)] leading-relaxed">
                  {currentDim.description}
                </p>

                <div className="pt-2">
                  <div className="text-xs font-semibold text-[var(--be-text-muted,#707782)] uppercase tracking-wider mb-2.5">
                    Verified Operating Capabilities
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {currentDim.capabilities.map(cap => (
                      <span
                        key={cap.label}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[var(--be-bg-elevated,#FAF8F5)] border border-[var(--be-border-subtle,#DEDAD0)] text-[var(--be-text-primary,#20242B)] flex items-center space-x-1.5"
                      >
                        <Check className="h-3 w-3 text-[var(--be-accent,#A78343)] shrink-0" />
                        <span>{cap.label}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Technical Contract & System Metadata (5 cols) */}
              <div className="lg:col-span-5 p-5 rounded-xl bg-[var(--be-bg-elevated,#FAF8F5)] border border-[var(--be-border-subtle,#DEDAD0)] space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--be-border-subtle,#DEDAD0)] pb-3">
                  <span className="text-xs font-mono font-semibold text-[var(--be-text-muted,#707782)]">
                    CONTRACT SPECIFICATION
                  </span>
                  <span className="text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-400">
                    ENFORCED
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <div className="text-[11px] text-[var(--be-text-muted,#707782)]">Operating Standard</div>
                    <div className="font-bold text-[var(--be-text-primary,#191D24)] mt-0.5">
                      {currentDim.systemMetric.value}
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] text-[var(--be-text-muted,#707782)]">AI Integrity Guard</div>
                    <div className="font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">
                      Strict Anti-Hallucination Policy Active
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] text-[var(--be-text-muted,#707782)]">Data Origin</div>
                    <div className="font-medium text-[var(--be-text-secondary,#555C66)] mt-0.5">
                      Verified User Facts & Direct Enterprise Feeds Only
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
