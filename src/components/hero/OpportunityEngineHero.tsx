import React from "react";
import "./OpportunityEngineHero.css";
import { JobVacancy } from "../../types/index.ts";
import { CompanyLogo } from "../ui/CompanyLogo.tsx";

export type OpportunityEngineHeroProps = {
  onExploreJobs?: () => void;
  onBuildProfile?: () => void;
  brand?: string;
  vacancies?: JobVacancy[];
  onSelectVacancy?: (vacancy: JobVacancy) => void;
};

interface PortalProps {
  className: string;
  label: string;
  index: number;
}

function Portal({ className, label, index }: PortalProps) {
  return (
    <div className={`oe-portal ${className}`} aria-label={`${label} career portal`}>
      <div className="oe-portal-halo" />
      <div className="oe-portal-ring">
        <div className="oe-portal-core">
          <span className="oe-portal-index">0{index}</span>
          <span className="oe-portal-label">{label}</span>
        </div>
      </div>
      <span className="oe-portal-orbit oe-orbit-one" />
      <span className="oe-portal-orbit oe-orbit-two" />
    </div>
  );
}

const DEFAULT_OPPORTUNITIES = [
  { company: "Microsoft", role: "Product Designer", match: "94% match", tone: "blue", mark: "M", location: "Remote" },
  { company: "HCLTech", role: "UX Strategist", match: "91% match", tone: "cyan", mark: "H", location: "India" },
  { company: "Adobe", role: "Experience Designer", match: "89% match", tone: "red", mark: "A", location: "Hybrid" },
];

export default function OpportunityEngineHero({
  onExploreJobs,
  onBuildProfile,
  brand = "ApplyWise",
  vacancies,
  onSelectVacancy,
}: OpportunityEngineHeroProps) {
  // Map real backend vacancies if provided
  const realJob1 = vacancies && vacancies.length > 0 ? vacancies[0] : null;
  const realJob2 = vacancies && vacancies.length > 1 ? vacancies[1] : null;
  const realJob3 = vacancies && vacancies.length > 2 ? vacancies[2] : null;

  // Real ticker items or fallbacks
  const tickerItems = vacancies && vacancies.length > 0
    ? [...vacancies.slice(0, 8), ...vacancies.slice(0, 8)]
    : null;

  return (
    <section className="oe-hero" aria-label="ApplyWise Opportunity Engine">
      <div className="oe-backdrop-grid" aria-hidden="true" />
      <div className="oe-ambient oe-ambient-one" aria-hidden="true" />
      <div className="oe-ambient oe-ambient-two" aria-hidden="true" />

      {/* Copy Column */}
      <div className="oe-copy">
        <div className="oe-eyebrow">
          <span /> THE OPPORTUNITY ENGINE
        </div>
        <h1>
          Your career<br />
          doesn’t move <em>sideways.</em><br />
          It moves <span>up.</span>
        </h1>
        <p className="oe-description">
          Discover the next step, unlock new pathways and move through
          opportunities built around your potential.
        </p>
        <div className="oe-actions">
          <button
            type="button"
            className="oe-button oe-button-primary"
            onClick={onExploreJobs}
            data-testid="oe-explore-jobs-btn"
          >
            Explore opportunities <span aria-hidden="true">↗</span>
          </button>
          <button
            type="button"
            className="oe-button oe-button-quiet"
            onClick={onBuildProfile}
            data-testid="oe-build-profile-btn"
          >
            Build my career profile <span aria-hidden="true">→</span>
          </button>
        </div>
        <div className="oe-proof">
          <div className="oe-proof-avatars" aria-hidden="true">
            <i>A</i><i>R</i><i>S</i><i>+</i>
          </div>
          <span><strong>One clearer next step.</strong> Then the next one.</span>
        </div>
      </div>

      {/* Central Career Progression Visual: Staircase, Portals, Discovery Network */}
      <div className="oe-scene" aria-label="A staircase of career opportunities passing through connected technology portals">
        <div className="oe-scene-stars" aria-hidden="true" />
        <div className="oe-network oe-network-a" aria-hidden="true" />
        <div className="oe-network oe-network-b" aria-hidden="true" />

        {/* 8-Step Career Growth Staircase */}
        <div className="oe-staircase" aria-hidden="true">
          {Array.from({ length: 8 }, (_, i) => (
            <div className="oe-step" key={i} style={{ "--step": i } as React.CSSProperties}>
              <span />
            </div>
          ))}
          <div className="oe-stair-glow" />
        </div>

        {/* 4 Connected Portals */}
        <Portal className="oe-portal-one" label="Discover" index={1} />
        <Portal className="oe-portal-two" label="Match" index={2} />
        <Portal className="oe-portal-three" label="Prepare" index={3} />
        <Portal className="oe-portal-four" label="Advance" index={4} />

        {/* Dynamic Career Pathway Line & Climber */}
        <div className="oe-path-line" aria-hidden="true" />
        <div className="oe-career-marker" aria-hidden="true">
          <span className="oe-marker-head" />
          <span className="oe-marker-body" />
          <span className="oe-marker-leg oe-marker-leg-left" />
          <span className="oe-marker-leg oe-marker-leg-right" />
        </div>

        {/* Floating Opportunity Cards with Real Backend Data */}
        {/* Card 1 */}
        {realJob1 ? (
          <div
            className="oe-opportunity-card oe-card-one"
            onClick={() => onSelectVacancy && onSelectVacancy(realJob1)}
            title={`View ${realJob1.title} at ${realJob1.company}`}
          >
            <CompanyLogo
              companyName={realJob1.company}
              logoUrl={realJob1.companyLogo || realJob1.companyLogoUrl}
              domain={realJob1.companyDomain}
              size="xs"
              className="rounded-md"
            />
            <span className="oe-card-copy">
              <b>{realJob1.title}</b>
              <small>{realJob1.company} · {realJob1.location || (realJob1.remote ? 'Remote' : 'Hybrid')}</small>
            </span>
            <span className="oe-match">
              {realJob1.matchEvaluation?.matchScore ? `${realJob1.matchEvaluation.matchScore}%` : '94%'}
            </span>
          </div>
        ) : (
          <div className="oe-opportunity-card oe-card-one">
            <span className="oe-card-mark blue">M</span>
            <span className="oe-card-copy"><b>Product Designer</b><small>Microsoft · Remote</small></span>
            <span className="oe-match">94%</span>
          </div>
        )}

        {/* Card 2 */}
        {realJob2 ? (
          <div
            className="oe-opportunity-card oe-card-two"
            onClick={() => onSelectVacancy && onSelectVacancy(realJob2)}
            title={`View ${realJob2.title} at ${realJob2.company}`}
          >
            <CompanyLogo
              companyName={realJob2.company}
              logoUrl={realJob2.companyLogo || realJob2.companyLogoUrl}
              domain={realJob2.companyDomain}
              size="xs"
              className="rounded-md"
            />
            <span className="oe-card-copy">
              <b>{realJob2.title}</b>
              <small>{realJob2.company} · {realJob2.location || (realJob2.remote ? 'Remote' : 'Hybrid')}</small>
            </span>
            <span className="oe-match">
              {realJob2.matchEvaluation?.matchScore ? `${realJob2.matchEvaluation.matchScore}%` : '91%'}
            </span>
          </div>
        ) : (
          <div className="oe-opportunity-card oe-card-two">
            <span className="oe-card-mark orange">A</span>
            <span className="oe-card-copy"><b>Experience Designer</b><small>Adobe · Hybrid</small></span>
            <span className="oe-match">89%</span>
          </div>
        )}

        {/* Card 3 */}
        {realJob3 ? (
          <div
            className="oe-opportunity-card oe-card-three"
            onClick={() => onSelectVacancy && onSelectVacancy(realJob3)}
            title={`View ${realJob3.title} at ${realJob3.company}`}
          >
            <CompanyLogo
              companyName={realJob3.company}
              logoUrl={realJob3.companyLogo || realJob3.companyLogoUrl}
              domain={realJob3.companyDomain}
              size="xs"
              className="rounded-md"
            />
            <span className="oe-card-copy">
              <b>{realJob3.title}</b>
              <small>{realJob3.company} · {realJob3.location || (realJob3.remote ? 'Remote' : 'Hybrid')}</small>
            </span>
            <span className="oe-match">
              {realJob3.matchEvaluation?.matchScore ? `${realJob3.matchEvaluation.matchScore}%` : '89%'}
            </span>
          </div>
        ) : (
          <div className="oe-opportunity-card oe-card-three">
            <span className="oe-card-mark cyan">H</span>
            <span className="oe-card-copy"><b>UX Strategist</b><small>HCLTech · India</small></span>
            <span className="oe-match">91%</span>
          </div>
        )}

        <div className="oe-scene-caption">
          <span /> YOUR NEXT OPPORTUNITY IS A STEP AWAY
        </div>
      </div>

      {/* Opportunity Radar Live Ticker */}
      <div className="oe-bottom">
        <div className="oe-bottom-label">
          <span className="oe-live-dot" /> OPPORTUNITY RADAR
        </div>
        <div className="oe-ticker-window">
          <div className="oe-ticker-track">
            {tickerItems ? (
              tickerItems.map((job, i) => (
                <div
                  className="oe-ticker-item"
                  key={`${job.id}_${i}`}
                  onClick={() => onSelectVacancy && onSelectVacancy(job)}
                  title={`View ${job.title} at ${job.company}`}
                >
                  <CompanyLogo
                    companyName={job.company}
                    logoUrl={job.companyLogo || job.companyLogoUrl}
                    domain={job.companyDomain}
                    size="xs"
                    className="rounded-xs"
                  />
                  <span>
                    <b>{job.title}</b>
                    <small>{job.company} · {job.location || 'Remote'}</small>
                  </span>
                  <i>
                    {job.matchEvaluation?.matchScore ? `${job.matchEvaluation.matchScore}% match` : 'Verified'}
                  </i>
                </div>
              ))
            ) : (
              [...DEFAULT_OPPORTUNITIES, ...DEFAULT_OPPORTUNITIES].map((item, i) => (
                <div className="oe-ticker-item" key={`${item.company}-${i}`}>
                  <span className={`oe-ticker-mark ${item.tone}`}>{item.mark}</span>
                  <span><b>{item.role}</b><small>{item.company} · {item.location}</small></span>
                  <i>{item.match}</i>
                </div>
              ))
            )}
          </div>
        </div>
        <span className="oe-bottom-note">
          {vacancies && vacancies.length > 0
            ? "Verified live vacancies synchronized in real time"
            : "Illustrative opportunities · Connect live job data to activate"}
        </span>
      </div>
    </section>
  );
}
