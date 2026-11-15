// src/components/hero/CareerAscentHero.tsx
// APPLYWISE AI — THE CAREER ASCENT
// Custom Immersive 3D Architectural Homepage Hero Component
// Featuring 5 Ascending Architectural Stages, Interconnected Portals, Transparent Blue Glass, and Live Opportunity Data.

import React, { useState } from 'react';
import './CareerAscentHero.css';
import { JobVacancy } from '../../types/index.ts';
import { CompanyLogo } from '../ui/CompanyLogo.tsx';
import { CareerAscentCanvas } from './CareerAscentCanvas.tsx';
import { useTheme } from '../../context/ThemeContext.tsx';
import { ArrowUpRight, ArrowRight, Compass } from 'lucide-react';

export interface CareerAscentHeroProps {
  onExploreJobs?: () => void;
  onBuildProfile?: () => void;
  brand?: string;
  vacancies?: JobVacancy[];
  onSelectVacancy?: (vacancy: JobVacancy) => void;
}

const MILESTONES = [
  { id: 1, step: '01', label: 'Discover', desc: 'Real-time global vacancies' },
  { id: 2, step: '02', label: 'Match', desc: 'Evidence-based algorithmic fit' },
  { id: 3, step: '03', label: 'Prepare', desc: 'Truthful ATS resume tailoring' },
  { id: 4, step: '04', label: 'Apply', desc: 'Supervised autopilot submissions' },
  { id: 5, step: '05', label: 'Advance', desc: 'Target career breakthrough' },
];

export const CareerAscentHero: React.FC<CareerAscentHeroProps> = ({
  onExploreJobs,
  onBuildProfile,
  brand = 'ApplyWise',
  vacancies,
  onSelectVacancy,
}) => {
  const { isDark } = useTheme();
  const [activeStage, setActiveStage] = useState<number>(1);

  // Map real backend vacancies (up to 3) if provided; otherwise cleanly hide
  const realJob1 = vacancies && vacancies.length > 0 ? vacancies[0] : null;
  const realJob2 = vacancies && vacancies.length > 1 ? vacancies[1] : null;
  const realJob3 = vacancies && vacancies.length > 2 ? vacancies[2] : null;

  return (
    <section
      className="career-ascent-hero"
      aria-label="ApplyWise AI — The Career Ascent 3D Hero"
      data-testid="career-ascent-hero"
    >
      {/* Subtle Architectural Ambient Glows */}
      <div className="ca-ambient-glow ca-ambient-glow-cyan" aria-hidden="true" />
      <div className="ca-ambient-glow ca-ambient-glow-navy" aria-hidden="true" />

      <div className="max-w-[1720px] mx-auto ca-grid">
        {/* ========================================================= */}
        {/* LEFT COLUMN: Brand Narrative, Headline, Description, CTAs */}
        {/* ========================================================= */}
        <div className="ca-content min-w-0 flex-1">
          {/* Brand Eyebrow Badge */}
          <div className="ca-eyebrow" data-testid="ca-brand-eyebrow">
            <span className="ca-radar-dot" aria-hidden="true" />
            <span>ApplyWise AI · The Career Ascent</span>
          </div>

          {/* Main Headline */}
          <h1 className="ca-title" data-testid="ca-main-headline">
            Your next career move <br className="hidden sm:inline" />
            <span className="ca-title-accent">starts here.</span>
          </h1>

          {/* Supporting Headline */}
          <div className="ca-subtitle" data-testid="ca-supporting-headline">
            Discover. Prepare. Advance.
          </div>

          {/* Supporting Description */}
          <p className="ca-description" data-testid="ca-description">
            Find opportunities before the crowd. Let AI do the heavy lifting. Discover relevant jobs,
            understand your career fit and move forward with intelligent application tools.
          </p>

          {/* Primary & Secondary Action CTAs */}
          <div className="ca-actions flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              type="button"
              className="ca-btn-primary"
              onClick={onExploreJobs}
              data-testid="ca-explore-opportunities-btn"
            >
              <span>Explore opportunities</span>
              <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
            </button>

            <button
              type="button"
              className="ca-btn-secondary"
              onClick={onBuildProfile}
              data-testid="ca-build-profile-btn"
            >
              <span>Build my career profile</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          {/* Five Ascending Career Milestones Controller */}
          <div className="ca-milestones-card" aria-label="Five Ascending Career Milestones">
            <div className="ca-milestones-label">
              <span className="flex items-center gap-1.5 font-bold text-slate-300 dark:text-slate-200">
                <Compass className="w-3.5 h-3.5 text-[#20B9F3]" />
                Ascent Milestones
              </span>
              <span className="text-[10px] text-slate-400">Interactive 3D Stages</span>
            </div>

            <div className="ca-milestones-track">
              {MILESTONES.map((m) => {
                const isActive = activeStage === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setActiveStage(m.id)}
                    className={`ca-milestone-pill ${isActive ? 'active' : 'inactive'}`}
                    data-testid={`ca-stage-btn-${m.id}`}
                    title={`${m.step} ${m.label}: ${m.desc}`}
                  >
                    <span className="text-[9px] opacity-75">{m.step}</span>
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: Large 3D Architectural Scene & Panels       */}
        {/* ========================================================= */}
        <div className="relative w-full">
          <div className="ca-3d-wrapper">
            <CareerAscentCanvas
              activeStage={activeStage}
              onSelectStage={(s) => setActiveStage(s)}
              isDark={isDark}
            />

            {/* Live Backend Opportunity Cards (Rendered strictly when actual data exists) */}
            {(realJob1 || realJob2 || realJob3) && (
              <div className="ca-floating-cards" aria-label="Live Verified Vacancies">
                {realJob1 && (
                  <div
                    className="ca-opportunity-panel"
                    onClick={() => onSelectVacancy && onSelectVacancy(realJob1)}
                    title={`View ${realJob1.title} at ${realJob1.company}`}
                    role="button"
                    tabIndex={0}
                  >
                    <CompanyLogo
                      companyName={realJob1.company}
                      logoUrl={realJob1.companyLogo || realJob1.companyLogoUrl}
                      domain={realJob1.companyDomain}
                      size="xs"
                      className="shrink-0"
                    />
                    <div className="ca-opp-text">
                      <span className="ca-opp-title">{realJob1.title}</span>
                      <span className="ca-opp-sub">
                        {realJob1.company} · {realJob1.location || (realJob1.remote ? 'Remote' : 'Verified')}
                      </span>
                    </div>
                    {realJob1.matchEvaluation?.matchScore && (
                      <span className="ca-opp-match">
                        {realJob1.matchEvaluation.matchScore}%
                      </span>
                    )}
                  </div>
                )}

                {realJob2 && (
                  <div
                    className="ca-opportunity-panel"
                    onClick={() => onSelectVacancy && onSelectVacancy(realJob2)}
                    title={`View ${realJob2.title} at ${realJob2.company}`}
                    role="button"
                    tabIndex={0}
                  >
                    <CompanyLogo
                      companyName={realJob2.company}
                      logoUrl={realJob2.companyLogo || realJob2.companyLogoUrl}
                      domain={realJob2.companyDomain}
                      size="xs"
                      className="shrink-0"
                    />
                    <div className="ca-opp-text">
                      <span className="ca-opp-title">{realJob2.title}</span>
                      <span className="ca-opp-sub">
                        {realJob2.company} · {realJob2.location || (realJob2.remote ? 'Remote' : 'Verified')}
                      </span>
                    </div>
                    {realJob2.matchEvaluation?.matchScore && (
                      <span className="ca-opp-match">
                        {realJob2.matchEvaluation.matchScore}%
                      </span>
                    )}
                  </div>
                )}

                {realJob3 && (
                  <div
                    className="ca-opportunity-panel"
                    onClick={() => onSelectVacancy && onSelectVacancy(realJob3)}
                    title={`View ${realJob3.title} at ${realJob3.company}`}
                    role="button"
                    tabIndex={0}
                  >
                    <CompanyLogo
                      companyName={realJob3.company}
                      logoUrl={realJob3.companyLogo || realJob3.companyLogoUrl}
                      domain={realJob3.companyDomain}
                      size="xs"
                      className="shrink-0"
                    />
                    <div className="ca-opp-text">
                      <span className="ca-opp-title">{realJob3.title}</span>
                      <span className="ca-opp-sub">
                        {realJob3.company} · {realJob3.location || (realJob3.remote ? 'Remote' : 'Verified')}
                      </span>
                    </div>
                    {realJob3.matchEvaluation?.matchScore && (
                      <span className="ca-opp-match">
                        {realJob3.matchEvaluation.matchScore}%
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default CareerAscentHero;
