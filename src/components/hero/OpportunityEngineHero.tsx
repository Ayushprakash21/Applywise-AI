// src/components/hero/OpportunityEngineHero.tsx
// Backwards compatibility re-export for ApplyWise AI "The Career Ascent" 3D Hero
// Replaces legacy oe-hero, oe-portal, and oe-actions with CareerAscentHero

import CareerAscentHero, { CareerAscentHeroProps } from './CareerAscentHero.tsx';

export type OpportunityEngineHeroProps = CareerAscentHeroProps;
export const OpportunityEngineHero = CareerAscentHero;
export default CareerAscentHero;
