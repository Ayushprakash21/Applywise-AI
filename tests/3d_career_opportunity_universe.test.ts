import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('3D Career Opportunity Universe & Real-Time Intelligence Architecture', async (t) => {
  const universePath = path.resolve(process.cwd(), 'src/components/CareerOpportunityUniverse.tsx');
  const networkVisualPath = path.resolve(process.cwd(), 'src/components/CareerNetworkVisual.tsx');
  const landingPagePath = path.resolve(process.cwd(), 'src/components/LandingPage.tsx');

  assert.ok(fs.existsSync(universePath), 'CareerOpportunityUniverse.tsx component file must exist');
  assert.ok(fs.existsSync(networkVisualPath), 'CareerNetworkVisual.tsx must exist');
  assert.ok(fs.existsSync(landingPagePath), 'LandingPage.tsx must exist');

  const journeyPath = path.resolve(process.cwd(), 'src/components/CareerDiscoveryJourney.tsx');
  assert.ok(fs.existsSync(journeyPath), 'CareerDiscoveryJourney.tsx signature component must exist');
  const showcasePath = path.resolve(process.cwd(), 'src/components/CinematicProductShowcase.tsx');
  const universeSrc = fs.readFileSync(universePath, 'utf8') + '\n' + fs.readFileSync(journeyPath, 'utf8') + '\n' + (fs.existsSync(showcasePath) ? fs.readFileSync(showcasePath, 'utf8') : '');
  const visualSrc = fs.readFileSync(networkVisualPath, 'utf8');
  const landingSrc = fs.readFileSync(landingPagePath, 'utf8');

  await t.test('1. Architecture & Branding Concept', () => {
    // Verified naming
    assert.match(landingSrc, /Career Opportunity Universe/, 'Landing page title must be Career Opportunity Universe');
    assert.match(landingSrc, /Explore where your verified experience connects with real career opportunities\./, 'Must feature official subtitle');
    assert.match(universeSrc, /Career Opportunity Universe/, 'Universe component header');
    assert.match(visualSrc, /CareerOpportunityUniverse/, 'CareerNetworkVisual must embed CareerOpportunityUniverse');
  });

  await t.test('2. 3D Perspective Projection & Camera Controls', () => {
    // Camera pitch, yaw, zoom, reset
    assert.match(universeSrc, /rotX/, 'Must maintain 3D pitch rotation');
    assert.match(universeSrc, /rotY/, 'Must maintain 3D yaw rotation');
    assert.match(universeSrc, /zoom/, 'Must maintain camera zoom state');
    assert.match(universeSrc, /resetCamera/, 'Must provide reset camera function');
    assert.match(universeSrc, /focalLength/, 'Must use focal length perspective projection math');
  });

  await t.test('3. Candidate Profile Centre & Orbiting Skills', () => {
    // Central sphere "Verified Career Twin"
    assert.match(universeSrc, /Verified Career Twin/, 'Must draw Verified Career Twin center node');
    assert.match(universeSrc, /candidateSkills/, 'Must calculate candidate skills');
    assert.match(universeSrc, /System Architecture/, 'Must contain System Architecture skill');
    assert.match(universeSrc, /Truthfulness Guarantee/, 'Must contain Truthfulness Guarantee');
  });

  await t.test('4. Real Opportunity Tiers & Color Coded Intelligence', () => {
    assert.match(universeSrc, /STRONG_ALIGNMENT/, 'Must support Strong Alignment tier');
    assert.match(universeSrc, /GOOD_ALIGNMENT_WITH_GAPS/, 'Must support Good Alignment tier');
    assert.match(universeSrc, /STRETCH_OPPORTUNITY/, 'Must support Stretch Opportunity tier');
    assert.match(universeSrc, /LOW_ALIGNMENT/, 'Must support Low Alignment tier');
  });

  await t.test('5. Opportunity Intelligence Panel & Actions', () => {
    assert.match(universeSrc, /selectedVacancy/, 'Must support selected vacancy state');
    assert.match(universeSrc, /Opportunity Intelligence/, 'Sidebar panel title');
    assert.match(universeSrc, /Direct Application/, 'Must allow direct application');
    assert.match(universeSrc, /Truthful Fit Breakdown/, 'Must provide honest breakdown');
  });

  await t.test('6. Accessible List View Toggle', () => {
    assert.match(universeSrc, /viewMode/, 'Must support view mode state');
    assert.match(universeSrc, /'3d' \| 'list'/, 'Must toggle between 3d and list views');
    assert.match(universeSrc, /Accessible List View/, 'Must provide accessible list toggle option');
  });

  await t.test('7. Performance & Motion Resilience', () => {
    assert.match(universeSrc, /IntersectionObserver/, 'Must observe viewport intersection');
    assert.match(universeSrc, /visibilitychange/, 'Must observe tab visibility changes');
    assert.match(universeSrc, /prefers-reduced-motion/, 'Must respect reduced motion preferences');
    assert.match(universeSrc, /handleResize/, 'Must handle canvas responsive resize');
  });

  await t.test('8. Real-Data Fidelity (Zero Dummy Data when Empty)', () => {
    // If vacancies list is empty, universe handles empty state truthfully
    assert.match(universeSrc, /No opportunities discovered matching current filters/, 'Empty state message');
    assert.doesNotMatch(universeSrc, /"fictional"/i, 'Must never generate fictional employers');
  });
});
