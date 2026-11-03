import React from 'react';
import { CinematicProductShowcase, CinematicProductShowcaseProps } from './CinematicProductShowcase.tsx';

export interface CareerDiscoveryJourneyProps extends CinematicProductShowcaseProps {}

/**
 * CareerDiscoveryJourney - 3D Product Showcase (Cinematic Luxury Studio)
 * 
 * Replaces the obsolete orbiting network and 3-column dashboard with an authentic
 * luxury 3D product showcase matching the reference video (4-3.mp4):
 * - Monochromatic studio environment (pearl grey, silver, white and graphite)
 * - Horizontal 3D object carousel with smooth gliding movement
 * - Floating square product frames with realistic contact shadows and depth
 * - Center-focused scaling, perspective depth, and smooth focus transitions
 * - 6 Sculptural Objects: Career Identity, Verified Skills, Opportunity Discovery,
 *   AI Matching Engine, Application Studio, Career Growth
 * - Real backend job records with zero synthetic postings
 */
export const CareerDiscoveryJourney: React.FC<CareerDiscoveryJourneyProps> = (props) => {
  return <CinematicProductShowcase {...props} />;
};

export default CareerDiscoveryJourney;
