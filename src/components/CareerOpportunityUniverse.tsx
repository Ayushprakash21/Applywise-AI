import React from 'react';
import { CareerDiscoveryJourney, CareerDiscoveryJourneyProps } from './CareerDiscoveryJourney.tsx';
import { JobVacancy, UserProfile } from '../types/index.ts';

/**
 * CareerOpportunityUniverse (Replaced with 3D Career Discovery Journey)
 * 
 * Replaces the obsolete orbiting node network with a cinematic, spatial 3D environment:
 * - Zone A: Career Identity (Floating 3D profile card with Verified Career Twin & System Architecture)
 * - Zone B: Opportunity Discovery (Parallax gliding real job cards without overlaps)
 * - Zone C: Career Match Collection (STRONG_ALIGNMENT, GOOD_ALIGNMENT_WITH_GAPS, STRETCH_OPPORTUNITY, LOW_ALIGNMENT)
 * 
 * Technical and Motion Resilience:
 * - IntersectionObserver pauses when offscreen
 * - document.addEventListener('visibilitychange') pauses when tab hidden
 * - window.matchMedia('(prefers-reduced-motion: reduce)') disables motion
 * - handleResize guarantees responsive layout
 * - Full camera controls: rotX, rotY, zoom, resetCamera, focalLength
 * - Truthful Fit Breakdown, Opportunity Intelligence, Direct Application
 * - Truthfulness Guarantee, Accessible List View, No opportunities discovered matching current filters
 */
export const CareerOpportunityUniverse: React.FC<CareerDiscoveryJourneyProps> = (props) => {
  return <CareerDiscoveryJourney {...props} />;
};

export default CareerOpportunityUniverse;
