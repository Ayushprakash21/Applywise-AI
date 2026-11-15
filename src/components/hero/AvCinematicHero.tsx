// src/components/hero/AvCinematicHero.tsx
// APPLYWISE AI — THE SINGLE PRIMARY CINEMATIC AV HERO
// Official Layout matching Image 3 with Neon Pilgrim Beneath the AV Monogram (Image 2)

import React from 'react';
import './AvCinematicHero.css';
import { AvCinematicCanvas } from './AvCinematicCanvas.tsx';
import { JobVacancy } from '../../types/index.ts';
import {
  ArrowRight,
  Compass,
  FileText,
  Zap,
  TrendingUp,
  Play
} from 'lucide-react';

export interface AvCinematicHeroProps {
  onOpenAuth?: (mode: 'login' | 'signup') => void;
  onExploreHowItWorks?: () => void;
  onSearch?: (query: string) => void;
  vacancies?: JobVacancy[];
  onSelectVacancy?: (vacancy: JobVacancy) => void;
  className?: string;
}

export const AvCinematicHero: React.FC<AvCinematicHeroProps> = ({
  onOpenAuth,
  onExploreHowItWorks,
  onSearch,
  vacancies,
  onSelectVacancy,
  className = '',
}) => {
  const handlePrimaryCTA = () => {
    if (onOpenAuth) {
      onOpenAuth('signup');
    } else {
      const el = document.getElementById('jobs');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSecondaryCTA = () => {
    if (onExploreHowItWorks) {
      onExploreHowItWorks();
    } else {
      const el = document.getElementById('journey');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section
      className={`av-hero-section ${className}`}
      aria-label="ApplyWise AI — Single Cinematic AV Hero"
      data-testid="av-cinematic-hero"
      data-theme-surface="dark"
    >
      <div className="av-hero-container">
        {/* LEFT COLUMN: 40% Width - Brand Narrative, Headline, Description, Action CTAs */}
        <div className="av-hero-left">
          {/* Brand Identity Pill */}
          <div className="av-brand-pill" data-testid="av-brand-pill">
            <span className="av-brand-icon" aria-hidden="true">AV</span>
            <span className="av-brand-text">ApplyWise AI</span>
          </div>

          {/* Main Headline */}
          <h1 className="av-hero-headline" data-testid="av-main-headline">
            India's First <br />
            <span className="av-headline-accent">AI-Powered Job</span> <br />
            Discovery &amp; Application <br className="hidden sm:inline" />
            Automation Platform.
          </h1>

          {/* Supporting Description */}
          <p className="av-hero-description" data-testid="av-supporting-description">
            Find the right opportunities, tailor your applications and move faster towards your next career milestone.
          </p>

          {/* Action CTAs */}
          <div className="av-hero-ctas">
            <button
              type="button"
              className="av-btn-primary"
              onClick={handlePrimaryCTA}
              data-testid="av-get-started-btn"
            >
              <span>Get Started for Free</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              className="av-btn-secondary"
              onClick={handleSecondaryCTA}
              data-testid="av-explore-how-it-works-btn"
            >
              <Play className="w-3.5 h-3.5 fill-current opacity-80" />
              <span>Explore How It Works</span>
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: 60% Width - The Animated AV Monogram Cinematic Artwork (Image 2) */}
        <div className="av-hero-right" data-testid="av-hero-artwork-column">
          <AvCinematicCanvas imageSrc="/hero/av-pilgrim-hero.jpg" />
        </div>
      </div>

      {/* TRUST / CAPABILITIES STRIP (Matching Image 3) */}
      <div className="av-trust-strip" data-testid="av-trust-strip">
        <div className="av-trust-container">
          <span className="av-trust-label">
            Trusted by professionals for smarter career growth
          </span>

          <div className="av-trust-pills">
            <span className="av-trust-pill">
              <Compass className="av-trust-pill-icon" />
              <span>AI Job Discovery</span>
            </span>
            <span className="av-trust-pill">
              <FileText className="av-trust-pill-icon" />
              <span>Resume Intelligence</span>
            </span>
            <span className="av-trust-pill">
              <Zap className="av-trust-pill-icon" />
              <span>Application Automation</span>
            </span>
            <span className="av-trust-pill">
              <TrendingUp className="av-trust-pill-icon" />
              <span>Career Insights</span>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AvCinematicHero;
