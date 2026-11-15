// src/components/hero/AvCinematicHero.tsx
// APPLYWISE AI — THE SINGLE PRIMARY CINEMATIC AV HERO
// Full-screen 4K Cinematic Hero with Luminous AV Gateway, Neon Pilgrim & Staggered Animations

import React from 'react';
import './AvCinematicHero.css';
import { AvCinematicCanvas } from './AvCinematicCanvas.tsx';
import { JobVacancy } from '../../types/index.ts';
import { ArrowRight, Play, ChevronDown } from 'lucide-react';

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
      const el = document.getElementById('jobs') || document.getElementById('journey');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSecondaryCTA = () => {
    if (onExploreHowItWorks) {
      onExploreHowItWorks();
    } else {
      const el = document.getElementById('journey') || document.getElementById('jobs');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleScrollDown = () => {
    const nextSection = document.getElementById('journey') || document.getElementById('jobs');
    if (nextSection) {
      nextSection.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo({ top: window.innerHeight, behavior: 'smooth' });
    }
  };

  return (
    <section
      className={`av-hero-section relative w-full overflow-hidden ${className}`}
      aria-label="ApplyWise AI — Single Cinematic AV Hero"
      data-testid="av-cinematic-hero"
      data-theme-surface="dark"
    >
      {/* FULL-SECTION CINEMATIC ARTWORK & ANIMATION CANVAS LAYER */}
      <div className="av-hero-artwork-backdrop" data-testid="av-hero-artwork-backdrop">
        <AvCinematicCanvas imageSrc="/hero/av-pilgrim-hero.jpg" isFullBleed={true} />
      </div>

      {/* CAREFULLY CONTROLLED READABILITY GRADIENT OVERLAY */}
      <div className="av-hero-gradient-overlay" aria-hidden="true" />

      {/* FOREGROUND HERO CONTENT CONTAINER */}
      <div className="av-hero-foreground">
        <div className="av-hero-content-col">
          {/* Main Headline with Staggered Entrance */}
          <h1 className="av-hero-headline" data-testid="av-main-headline">
            <span className="av-headline-white av-anim-line-1">India&apos;s First</span>
            <br />
            <span className="av-headline-gold av-anim-line-2">AI-Powered Job</span>
            <br />
            <span className="av-headline-white av-anim-line-3">Discovery &amp; Application</span>
            <br className="hidden sm:inline" />
            <span className="av-headline-white av-anim-line-4">Automation Platform.</span>
          </h1>

          {/* Supporting Description */}
          <p className="av-hero-description av-anim-desc" data-testid="av-supporting-description">
            Find the right opportunities, tailor your applications and move faster towards your next career milestone.
          </p>

          {/* Action CTAs */}
          <div className="av-hero-ctas av-anim-ctas">
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
      </div>

      {/* SCROLL TO EXPLORE INDICATOR */}
      <div className="av-hero-scroll-indicator" data-testid="av-scroll-indicator">
        <button
          type="button"
          onClick={handleScrollDown}
          className="av-scroll-btn group"
          aria-label="Scroll to explore career opportunities"
        >
          <span className="av-scroll-text">Scroll to Explore</span>
          <div className="av-scroll-chevron-circle">
            <ChevronDown className="w-4 h-4 text-[#F4B942] group-hover:translate-y-0.5 transition-transform" />
          </div>
        </button>
      </div>
    </section>
  );
};

export default AvCinematicHero;
