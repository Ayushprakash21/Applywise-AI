import React from 'react';
import {
  ShieldCheck,
  Briefcase,
  Bot,
  BrainCircuit,
  FileCheck2,
  Lock,
  Layers,
  Clock,
  Compass,
  Target
} from 'lucide-react';
import { BrandLogo } from './BrandLogo.tsx';
import { GlobalFooter } from './GlobalFooter.tsx';
import { FounderSection } from './FounderSection.tsx';
import { useTheme } from '../context/ThemeContext.tsx';

interface AboutPageProps {
  onGetStarted: () => void;
  onExplorePro: () => void;
  onNavigateHome: () => void;
}

export const AboutPage: React.FC<AboutPageProps> = ({
  onGetStarted,
  onExplorePro,
  onNavigateHome,
}) => {
  const { appearance } = useTheme();
  return (
    <div className="min-h-screen bg-[var(--be-bg-primary,#F5F3EE)] text-[var(--be-text-primary,#20242B)] flex flex-col font-sans">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-[var(--be-bg-card,#FFFFFF)] border-b border-[var(--be-border-subtle,#DEDAD0)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <BrandLogo size="md" onClick={onNavigateHome} />

          <div className="flex items-center space-x-3">
            <button
              onClick={onNavigateHome}
              className="px-3.5 py-1.5 text-xs font-semibold text-[var(--be-text-secondary,#555C66)] hover:text-[var(--be-text-heading,#191D24)] transition cursor-pointer"
            >
              Home
            </button>
            <button
              onClick={onExplorePro}
              className="px-3.5 py-1.5 text-xs font-semibold text-[var(--be-accent,#A78343)] hover:underline transition cursor-pointer"
            >
              Pricing & Plans
            </button>
            <button
              onClick={onGetStarted}
              className="px-4 py-2 bg-[var(--be-accent,#A78343)] hover:bg-[var(--be-gold-hover,#8E6F37)] text-white rounded-md text-xs font-semibold shadow-xs transition flex items-center cursor-pointer"
            >
              Start Career Assessment
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section — Architectural Split Layout */}
      <section className="py-16 md:py-20 border-b border-[var(--be-border-subtle,#DEDAD0)] bg-[var(--be-bg-card,#FFFFFF)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center space-x-2 text-xs font-medium text-[var(--be-accent,#A78343)]">
              <span className="w-2 h-2 rounded-full bg-[var(--be-accent,#A78343)]" />
              <span>Platform Architecture & Mission</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold text-[var(--be-text-heading,#191D24)] tracking-tight leading-tight">
              Truthful career intelligence built for realistic professional progression.
            </h1>

            <p className="text-base text-[var(--be-text-secondary,#555C66)] leading-relaxed max-w-xl">
              ApplyVise AI integrates vacancy aggregation, authentic ATS resume tailoring, application tracking, and candidate career roadmaps into one coherent operating system without fabricated credentials.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={onGetStarted}
                className="px-6 py-3 bg-[var(--be-accent,#A78343)] hover:bg-[var(--be-gold-hover,#8E6F37)] text-white rounded-md text-xs sm:text-sm font-semibold shadow-xs transition cursor-pointer"
              >
                Create Candidate Account
              </button>
              <button
                onClick={onExplorePro}
                className="px-6 py-3 border border-[var(--be-border-subtle,#DEDAD0)] bg-[var(--be-bg-primary,#F5F3EE)] hover:bg-[var(--be-border-subtle,#DEDAD0)]/50 text-[var(--be-text-primary,#20242B)] rounded-md text-xs sm:text-sm font-semibold transition cursor-pointer"
              >
                Review Subscription Tiers
              </button>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="p-6 rounded-lg bg-[var(--be-bg-primary,#F5F3EE)] border border-[var(--be-border-subtle,#DEDAD0)] space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--be-border-subtle,#DEDAD0)]">
                <span className="text-xs font-semibold text-[var(--be-text-secondary,#555C66)]">System Verification Baseline</span>
                <span className="text-xs font-bold text-[var(--be-accent,#A78343)]">v2.4 Active</span>
              </div>
              <ul className="space-y-3 text-xs text-[var(--be-text-secondary,#555C66)]">
                <li className="flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-[var(--status-success,#147A58)] shrink-0 mt-0.5" />
                  <span><strong>Zero Hallucination Guarantee:</strong> Resumes strictly preserve candidate ground-truth employment tenures.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Target className="w-4 h-4 text-[var(--be-accent,#A78343)] shrink-0 mt-0.5" />
                  <span><strong>Multi-Source Vacancies:</strong> Direct Greenhouse, Lever, and verified career page integrations.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Lock className="w-4 h-4 text-[var(--be-accent,#A78343)] shrink-0 mt-0.5" />
                  <span><strong>Data Isolation:</strong> Cryptographic PBKDF2 hashing, session tokens, and strict Cloudflare D1 multi-tenancy.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Origin & Core Philosophy */}
      <section className="py-16 border-b border-[var(--be-border-subtle,#DEDAD0)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-16">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            <div className="md:col-span-4">
              <span className="text-xs font-semibold text-[var(--be-accent,#A78343)]">Foundation & Origin</span>
              <h2 className="text-2xl font-bold text-[var(--be-text-heading,#191D24)] mt-1">Why ApplyVise Exists</h2>
            </div>
            <div className="md:col-span-8 space-y-4 text-xs sm:text-sm text-[var(--be-text-secondary,#555C66)] leading-relaxed">
              <p>
                ApplyVise AI was created around the real-world friction of modern job searching: repetitive applications, scattered tracking spreadsheets, inconsistent resume adjustments, and the overwhelming effort involved in presenting oneself effectively across different opportunities.
              </p>
              <p>
                Rather than treating AI as a superficial gimmick or an engine for generating fictional claims, ApplyVise AI was founded on the belief that career technology should be grounded in truthfulness, structured organization, and disciplined assistance.
              </p>
              <p>
                Today, the platform is an evolving career ecosystem where candidates can discover verified vacancies across global aggregators, match their authentic experience, and prepare tailored documents with zero-hallucination verification.
              </p>
            </div>
          </div>

          {/* Mission & Vision Panels */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-md bg-[var(--be-bg-card,#FFFFFF)] border border-[var(--be-border-subtle,#DEDAD0)] space-y-3">
              <div className="w-8 h-8 rounded bg-[var(--be-bg-primary,#F5F3EE)] flex items-center justify-center text-[var(--be-accent,#A78343)]">
                <Target className="h-4 w-4" />
              </div>
              <h3 className="text-base font-bold text-[var(--be-text-heading,#191D24)]">Mission</h3>
              <p className="text-xs sm:text-sm text-[var(--be-text-secondary,#555C66)] leading-relaxed">
                Empower professionals to orchestrate their careers through structured organization, transparent opportunity evaluations, and factual resume customization.
              </p>
            </div>

            <div className="p-6 rounded-md bg-[var(--be-bg-card,#FFFFFF)] border border-[var(--be-border-subtle,#DEDAD0)] space-y-3">
              <div className="w-8 h-8 rounded bg-[var(--be-bg-primary,#F5F3EE)] flex items-center justify-center text-[var(--be-accent,#A78343)]">
                <Compass className="h-4 w-4" />
              </div>
              <h3 className="text-base font-bold text-[var(--be-text-heading,#191D24)]">Vision</h3>
              <p className="text-xs sm:text-sm text-[var(--be-text-secondary,#555C66)] leading-relaxed">
                Establish the global standard for truthful career intelligence, eliminating administrative job-search friction while protecting candidate privacy.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Platform Capabilities */}
      <section className="py-16 max-w-6xl mx-auto px-4 sm:px-6 space-y-10">
        <div>
          <span className="text-xs font-semibold text-[var(--be-accent,#A78343)]">Integrated Workflows</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--be-text-heading,#191D24)] tracking-tight mt-1">Platform Capabilities</h2>
          <p className="text-xs sm:text-sm text-[var(--be-text-secondary,#555C66)] mt-1">
            Grounded modules connecting every stage of professional development and opportunity pursuit.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="p-5 rounded-md bg-[var(--be-bg-card,#FFFFFF)] border border-[var(--be-border-subtle,#DEDAD0)] space-y-2">
            <div className="w-7 h-7 rounded bg-[var(--be-bg-primary,#F5F3EE)] flex items-center justify-center text-[var(--be-accent,#A78343)]">
              <Briefcase className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-bold text-[var(--be-text-heading,#191D24)]">Career Pipeline Management</h3>
            <p className="text-xs text-[var(--be-text-secondary,#555C66)] leading-relaxed">
              Unified tracking for all applications with deterministic status machines, submission dates, and interview logging.
            </p>
          </div>

          <div className="p-5 rounded-md bg-[var(--be-bg-card,#FFFFFF)] border border-[var(--be-border-subtle,#DEDAD0)] space-y-2">
            <div className="w-7 h-7 rounded bg-[var(--be-bg-primary,#F5F3EE)] flex items-center justify-center text-[var(--be-accent,#A78343)]">
              <Bot className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-bold text-[var(--be-text-heading,#191D24)]">Grounded AI Copilot</h3>
            <p className="text-xs text-[var(--be-text-secondary,#555C66)] leading-relaxed">
              Supervised intelligence providing interview preparation, resume audits, and recruiter outreach drafts referencing verified facts.
            </p>
          </div>

          <div className="p-5 rounded-md bg-[var(--be-bg-card,#FFFFFF)] border border-[var(--be-border-subtle,#DEDAD0)] space-y-2">
            <div className="w-7 h-7 rounded bg-[var(--be-bg-primary,#F5F3EE)] flex items-center justify-center text-[var(--be-accent,#A78343)]">
              <BrainCircuit className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-bold text-[var(--be-text-heading,#191D24)]">Opportunity Match Scoring</h3>
            <p className="text-xs text-[var(--be-text-secondary,#555C66)] leading-relaxed">
              Six-dimension objective matching across competencies, experience duration, title relevance, and work visa criteria.
            </p>
          </div>

          <div className="p-5 rounded-md bg-[var(--be-bg-card,#FFFFFF)] border border-[var(--be-border-subtle,#DEDAD0)] space-y-2">
            <div className="w-7 h-7 rounded bg-[var(--be-bg-primary,#F5F3EE)] flex items-center justify-center text-[var(--be-accent,#A78343)]">
              <FileCheck2 className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-bold text-[var(--be-text-heading,#191D24)]">ATS Document Engine</h3>
            <p className="text-xs text-[var(--be-text-secondary,#555C66)] leading-relaxed">
              Generate native Word (.docx) documents structured for enterprise applicant tracking systems with zero unverified additions.
            </p>
          </div>

          <div className="p-5 rounded-md bg-[var(--be-bg-card,#FFFFFF)] border border-[var(--be-border-subtle,#DEDAD0)] space-y-2">
            <div className="w-7 h-7 rounded bg-[var(--be-bg-primary,#F5F3EE)] flex items-center justify-center text-[var(--be-accent,#A78343)]">
              <Layers className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-bold text-[var(--be-text-heading,#191D24)]">Career Atlas Trajectories</h3>
            <p className="text-xs text-[var(--be-text-secondary,#555C66)] leading-relaxed">
              Map transferable competencies and realistic development milestones to compare vertical and lateral advancement tracks.
            </p>
          </div>

          <div className="p-5 rounded-md bg-[var(--be-bg-card,#FFFFFF)] border border-[var(--be-border-subtle,#DEDAD0)] space-y-2">
            <div className="w-7 h-7 rounded bg-[var(--be-bg-primary,#F5F3EE)] flex items-center justify-center text-[var(--be-accent,#A78343)]">
              <Clock className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-bold text-[var(--be-text-heading,#191D24)]">Continuous Architecture</h3>
            <p className="text-xs text-[var(--be-text-secondary,#555C66)] leading-relaxed">
              Incremental updates with multilingual localization, automated interview rehearsal, and verified employer directory indexing.
            </p>
          </div>
        </div>
      </section>

      {/* Meet the Founder Section */}
      <FounderSection theme={appearance} />

      {/* Core Principles */}
      <section className="py-16 bg-[var(--be-bg-card,#FFFFFF)] border-t border-[var(--be-border-subtle,#DEDAD0)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-10">
          <div>
            <span className="text-xs font-semibold text-[var(--be-accent,#A78343)]">Engineering Standards</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--be-text-heading,#191D24)] tracking-tight mt-1">Core Architecture Principles</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="p-4 rounded-md bg-[var(--be-bg-primary,#F5F3EE)] border border-[var(--be-border-subtle,#DEDAD0)] space-y-1.5">
              <span className="text-[11px] font-bold text-[var(--be-accent,#A78343)]">Integrity</span>
              <h4 className="font-bold text-xs text-[var(--be-text-heading,#191D24)]">Factual Truthfulness</h4>
              <p className="text-[11px] text-[var(--be-text-secondary,#555C66)] leading-relaxed">No invented employers, degrees, or falsified performance metrics.</p>
            </div>
            <div className="p-4 rounded-md bg-[var(--be-bg-primary,#F5F3EE)] border border-[var(--be-border-subtle,#DEDAD0)] space-y-1.5">
              <span className="text-[11px] font-bold text-[var(--be-accent,#A78343)]">Pragmatism</span>
              <h4 className="font-bold text-xs text-[var(--be-text-heading,#191D24)]">Outcome Orientation</h4>
              <p className="text-[11px] text-[var(--be-text-secondary,#555C66)] leading-relaxed">Tools built to accelerate applications, not to introduce decorative noise.</p>
            </div>
            <div className="p-4 rounded-md bg-[var(--be-bg-primary,#F5F3EE)] border border-[var(--be-border-subtle,#DEDAD0)] space-y-1.5">
              <span className="text-[11px] font-bold text-[var(--be-accent,#A78343)]">Isolation</span>
              <h4 className="font-bold text-xs text-[var(--be-text-heading,#191D24)]">Strict Multi-Tenancy</h4>
              <p className="text-[11px] text-[var(--be-text-secondary,#555C66)] leading-relaxed">Candidate records are cryptographic boundaries across all edge datastores.</p>
            </div>
            <div className="p-4 rounded-md bg-[var(--be-bg-primary,#F5F3EE)] border border-[var(--be-border-subtle,#DEDAD0)] space-y-1.5">
              <span className="text-[11px] font-bold text-[var(--be-accent,#A78343)]">Accountability</span>
              <h4 className="font-bold text-xs text-[var(--be-text-heading,#191D24)]">Transparent AI</h4>
              <p className="text-[11px] text-[var(--be-text-secondary,#555C66)] leading-relaxed">All AI-generated recommendations cite concrete evidence from the job posting.</p>
            </div>
            <div className="p-4 rounded-md bg-[var(--be-bg-primary,#F5F3EE)] border border-[var(--be-border-subtle,#DEDAD0)] space-y-1.5">
              <span className="text-[11px] font-bold text-[var(--be-accent,#A78343)]">Access</span>
              <h4 className="font-bold text-xs text-[var(--be-text-heading,#191D24)]">Permanent Baseline</h4>
              <p className="text-[11px] text-[var(--be-text-secondary,#555C66)] leading-relaxed">Generous free tier enabling every candidate to search and apply with dignity.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <GlobalFooter
        variant="landing"
        onNavigateHome={onNavigateHome}
        onNavigatePricing={onExplorePro}
      />
    </div>
  );
};