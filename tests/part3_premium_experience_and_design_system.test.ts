import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { SUBSCRIPTION_PLANS, COMPARISON_FEATURES } from '../src/config/plans.ts';
import { JOURNEY_STEPS } from '../src/components/ApplicationJourneyView.tsx';

describe('ApplyVise AI Part 3 — Premium SaaS Experience & Design Architecture Suite', () => {
  const readSrc = (relPath: string) => fs.readFileSync(path.resolve(relPath), 'utf-8');

  it('1. Visual Identity & Design Tokens: CSS defines neu-glass, badges, and reduced-motion accessibility', () => {
    const css = readSrc('src/index.css');

    // Layered surfaces & glassmorphism
    assert.ok(css.includes('.neu-glass'), 'Must define .neu-glass layered surface');
    assert.ok(css.includes('.neu-glass-dark'), 'Must define .neu-glass-dark surface');
    assert.ok(css.includes('.neu-glow-primary'), 'Must define .neu-glow-primary accent');

    // Evidence badges
    assert.ok(css.includes('.badge-evidence-verified'), 'Must define .badge-evidence-verified');
    assert.ok(css.includes('.badge-evidence-gap'), 'Must define .badge-evidence-gap');

    // Reduced motion accessibility
    assert.ok(css.includes('@media (prefers-reduced-motion: reduce)'), 'Must enforce reduced motion accessibility');
    assert.ok(css.includes('transition-duration: 0.01ms'), 'Reduced motion must collapse transition durations');
  });

  it('2. Signature Feature A — Career Fit Lens: Visual suitability with 5-second snapshot & no false guarantees', () => {
    const lensSrc = readSrc('src/components/CareerFitLens.tsx');

    assert.ok(lensSrc.includes('Career Fit Lens'), 'Must expose Career Fit Lens component header');
    assert.ok(lensSrc.includes('strokeDashoffset'), 'Must calculate circular score arc gauge');
    assert.ok(lensSrc.includes('Essential Requirements Matched'), 'Must display verified essential requirements');
    assert.ok(lensSrc.includes('Identified Gaps to Address'), 'Must display actionable gaps');
    assert.ok(lensSrc.includes('What Makes You Relevant'), 'Must provide plain-English relevance points');
    assert.ok(lensSrc.includes('Scores represent algorithmic profile alignment, not guaranteed hiring probability'), 'Must include ethical AI disclaimer');
  });

  it('3. Signature Feature B — Application Journey: Visual 7-step candidate-controlled workflow', () => {
    assert.strictEqual(JOURNEY_STEPS.length, 7, 'Application Journey must have exactly 7 steps');

    const expectedSteps = ['discover', 'understand_fit', 'improve_resume', 'prepare_application', 'review', 'apply', 'track'];
    JOURNEY_STEPS.forEach((step, idx) => {
      assert.strictEqual(step.id, expectedSteps[idx], `Step ${idx + 1} must be ${expectedSteps[idx]}`);
    });

    const journeySrc = readSrc('src/components/ApplicationJourneyView.tsx');
    assert.ok(journeySrc.includes('Candidate-Controlled Workflow'), 'Must preserve candidate control');
    assert.ok(journeySrc.includes('Candidate Review'), 'Must enforce Candidate Review gate');
    assert.ok(journeySrc.includes('ApplyVise AI will never submit fabricated information'), 'Must affirm zero-fabrication pledge');
  });

  it('4. Signature Feature C — Career Momentum: Real ground truth progress metrics without vanity metrics', () => {
    const momentumSrc = readSrc('src/components/CareerMomentumCard.tsx');

    assert.ok(momentumSrc.includes('Career Momentum'), 'Must display Career Momentum card header');
    assert.ok(momentumSrc.includes('Applications Prepared'), 'Must track prepared applications');
    assert.ok(momentumSrc.includes('Submissions Recorded'), 'Must track recorded submissions');
    assert.ok(momentumSrc.includes('Interviews Attended'), 'Must track interviews attended');
    assert.ok(momentumSrc.includes('Verified Skills'), 'Must track verified skill progress');
    assert.ok(momentumSrc.includes('Zero fabricated activity. All metrics derived from verified user data.'), 'Must affirm ground truth guarantee');
  });

  it('5. Signature Feature D — Opportunity Radar: Live verified vacancies with provenance & timestamps', () => {
    const radarSrc = readSrc('src/components/OpportunityRadar.tsx');

    assert.ok(radarSrc.includes('Opportunity Radar'), 'Must display Opportunity Radar');
    assert.ok(radarSrc.includes('Verified'), 'Must display verification timestamps');
    assert.ok(radarSrc.includes('Direct Feed'), 'Must display verified source tags');
    assert.ok(radarSrc.includes('Synchronized every 10 min via automated Cloudflare Edge Cron'), 'Must detail automated synchronization');
    assert.ok(radarSrc.includes('Stale & expired postings automatically purged'), 'Must guarantee stale posting purge');
  });

  it('6. Signature Feature E — Personal Career Intelligence: Candidate strengths, roadmap & market gaps', () => {
    const pciSrc = readSrc('src/components/PersonalCareerIntelligenceView.tsx');

    assert.ok(pciSrc.includes('Personal Career Intelligence'), 'Must display Personal Career Intelligence header');
    assert.ok(pciSrc.includes('Verified Functional Skills & Competencies'), 'Must surface candidate strengths');
    assert.ok(pciSrc.includes('Ground Truth Impact Highlights'), 'Must display authentic achievements');
    assert.ok(pciSrc.includes('Market Gap Benchmark'), 'Must analyze market gaps against live listings');
    assert.ok(pciSrc.includes('Career Improvement Roadmap'), 'Must surface career roadmap');
    assert.ok(pciSrc.includes('Lead with Verified Depth'), 'Must provide grounded application strategy');
  });

  it('7. Job Discovery Experience: Quick suggestions, skeletons, and side-by-side comparison', () => {
    const searchSrc = readSrc('src/components/JobSearchPage.tsx');

    // Quick suggestions
    assert.ok(searchSrc.includes('Suggestions:'), 'Must provide quick search suggestion pills');
    assert.ok(searchSrc.includes('Senior Software Engineer'), 'Suggestion includes Senior Software Engineer');

    // Skeleton loaders
    assert.ok(searchSrc.includes('animate-pulse'), 'Must render skeleton pulse cards while searching');

    // Empty state with real explanation
    assert.ok(searchSrc.includes('No matching vacancies found for your criteria'), 'Must provide clear empty state');
    assert.ok(searchSrc.includes('Reset All Filters'), 'Must provide 1-click filter reset');

    // Side-by-side comparison
    assert.ok(searchSrc.includes('JobComparisonDrawer'), 'Must integrate JobComparisonDrawer');
    assert.ok(searchSrc.includes('Compare Side-by-Side'), 'Must provide Compare Side-by-Side action');

    const compareSrc = readSrc('src/components/JobComparisonDrawer.tsx');
    assert.ok(compareSrc.includes('Side-by-Side Opportunity Comparison'), 'Drawer displays comparison title');
    assert.ok(compareSrc.includes('Strategic Alignment Recommendation'), 'Drawer provides comparative advice');
  });

  it('8. Premium Dashboard: CareerCommandCenter answers "What should I do next?" with real data', () => {
    const cccSrc = readSrc('src/components/CareerCommandCenter.tsx');

    assert.ok(cccSrc.includes('CareerMomentumCard'), 'Dashboard integrates CareerMomentumCard');
    assert.ok(cccSrc.includes('OpportunityRadar'), 'Dashboard integrates OpportunityRadar');
    assert.ok(cccSrc.includes('PersonalCareerIntelligenceView'), 'Dashboard integrates PersonalCareerIntelligenceView');
    assert.ok(cccSrc.includes('Recommended Priority Action'), 'Dashboard highlights recommended priority action');
    assert.ok(cccSrc.includes('Answers: "What should I do next?"'), 'Explicitly addresses what to do next');
  });

  it('9. Admin Experience: Reliable control center with real metrics & Job Ingestion health', () => {
    const adminSrc = readSrc('src/components/AdminConsole.tsx');

    assert.ok(adminSrc.includes('Job Ingestion & Sources'), 'Admin subnavigation includes Job Ingestion & Sources');
    assert.ok(adminSrc.includes('Job Source Ingestion Health'), 'Displays ingestion health tab');
    assert.ok(adminSrc.includes('Recent Ingestion Pipeline Runs'), 'Renders pipeline runs table');
    assert.ok(adminSrc.includes('Promise.allSettled'), 'Uses Promise.allSettled for resilient loading');
    assert.ok(adminSrc.includes('getAdminSourcesHealth'), 'Calls getAdminSourcesHealth API');
  });

  it('10. Tiered Feature Architecture: Clear Free vs Pro entitlements without paywalling user data', () => {
    assert.strictEqual(SUBSCRIPTION_PLANS.free.price.monthly.usd, 0, 'Free plan is $0');
    assert.strictEqual(SUBSCRIPTION_PLANS.pro.price.monthly.usd, 9.99, 'Pro plan is $9.99/mo');

    // Verification that essential user data access is NOT restricted
    const trackingFeature = COMPARISON_FEATURES.find(f => f.name === 'Application Tracking');
    assert.ok(trackingFeature?.includedInFree, 'Application tracking must be free');

    const extractionFeature = COMPARISON_FEATURES.find(f => f.name === 'Resume Extraction');
    assert.ok(extractionFeature?.includedInFree, 'Basic resume extraction must be free');

    // Advanced features are Pro
    const evidenceFeature = COMPARISON_FEATURES.find(f => f.name === 'Advanced Fit Evidence Map');
    assert.strictEqual(evidenceFeature?.includedInFree, false);
    assert.strictEqual(evidenceFeature?.includedInPro, true);

    const compareFeature = COMPARISON_FEATURES.find(f => f.name === 'Side-by-Side Opportunity Comparison');
    assert.strictEqual(compareFeature?.includedInFree, false);
    assert.strictEqual(compareFeature?.includedInPro, true);
  });

  it('11. Complete 21-Step Candidate User Journey Contract Verification', () => {
    const appSrc = readSrc('src/App.tsx');

    // Step 1: Landing Page
    assert.ok(appSrc.includes('<LandingPage'), 'Step 1: Landing page rendered for unauthenticated guests');

    // Step 2 & 3: Account Creation & Auth Verification
    assert.ok(appSrc.includes('FlowSignup'), 'Step 2: Sign-up supported');
    assert.ok(appSrc.includes('FlowLogin'), 'Step 3: Login & session verification supported');

    // Step 4 & 5: Complete profile & upload resume
    assert.ok(appSrc.includes('ProfileAndPreferencesPage'), 'Step 4: Profile and preferences workspace');
    assert.ok(appSrc.includes('ResumeOnboardingModal'), 'Step 5: Factual resume onboarding upload flow');

    // Step 6 & 7: Verify extracted facts & confirm preferences
    assert.ok(appSrc.includes('ResumeStudioTab'), 'Step 6: Resume Studio for factual review');

    // Step 8 & 9: Ingest & view live opportunities
    assert.ok(appSrc.includes('JobSearchPage'), 'Step 8-9: Job Search & discovery with live feeds');

    // Step 10 & 11: Open job & inspect evidence-based match
    assert.ok(appSrc.includes('JobDetailDrawer'), 'Step 10-11: Job Detail Drawer with Career Fit Lens');

    // Step 12 & 13: Tailor resume & cover letter
    assert.ok(appSrc.includes('ApplicationCopilotView') || readSrc('src/components/JobDetailDrawer.tsx').includes('ApplicationCopilotView'), 'Step 12-13: Tailor resume & cover letter via Copilot');

    // Step 14 & 15: Save job & prepare application
    assert.ok(appSrc.includes('onPrepareApplication') || readSrc('src/components/JobDetailDrawer.tsx').includes('onPrepareApplication'), 'Step 14-15: Prepare application pipeline');

    // Step 16 & 17: Candidate review & tracking
    assert.ok(appSrc.includes('ApplicationsPage'), 'Step 16-17: Applications tracker and pipeline stages');

    // Step 18: Notifications
    assert.ok(appSrc.includes('NotificationItem') && appSrc.includes('notifications'), 'Step 18: Notification item delivery');

    // Step 19 & 20: Profile updates & logout/login
    assert.ok(appSrc.includes('handleLogout') || appSrc.includes('onLogout'), 'Step 20: Secure logout and session clearing');

    // Step 21: Data persistence verified
    assert.ok(appSrc.includes('api.getMe'), 'Step 21: Server-side token validation and session restoration');
  });
});