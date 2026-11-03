import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('Premium Dashboard Transformation: 1. DashboardShell glassmorphic architecture', () => {
  const shellSrc = fs.readFileSync('src/components/DashboardShell.tsx', 'utf8');

  // Must use pearl-white brand background
  assert.ok(shellSrc.includes('#E9EEF6'), 'DashboardShell must use pearl-white background');

  // Must use frosted glass navigation
  assert.ok(shellSrc.includes('backdrop-blur-xl'), 'Header must use frosted glass blur');
  assert.ok(shellSrc.includes('backdrop-blur-2xl'), 'Sidebar must use frosted glass blur');

  // Active state must feature subtle blue-violet gradient
  assert.ok(shellSrc.includes('from-blue-600') && shellSrc.includes('to-[#8065F5]'), 'Active navigation must use blue-violet gradient');

  // Responsive mobile navigation
  assert.ok(shellSrc.includes('min-h-[44px] min-w-[48px]'), 'Mobile nav items must meet 44px touch target standard');
  assert.ok(shellSrc.includes('pb-[max(0.5rem,env(safe-area-inset-bottom))]'), 'Mobile nav must handle iOS safe area padding');
});

test('Premium Dashboard Transformation: 2. CareerIntelligenceHeroCanvas 3D environment & fallback', () => {
  assert.ok(fs.existsSync('src/components/CareerIntelligenceHeroCanvas.tsx'), 'CareerIntelligenceHeroCanvas must exist');
  const heroCanvasSrc = fs.readFileSync('src/components/CareerIntelligenceHeroCanvas.tsx', 'utf8');

  // Three.js 3D kinetic elements
  assert.ok(heroCanvasSrc.includes('MeshPhysicalMaterial'), 'Must use transmission glass material');
  assert.ok(heroCanvasSrc.includes('TorusGeometry'), 'Must model illuminated orbital light rings');
  assert.ok(heroCanvasSrc.includes('CylinderGeometry'), 'Must model studio pedestal base');
  assert.ok(heroCanvasSrc.includes('mousemove'), 'Must support interactive pointer parallax');
  assert.ok(heroCanvasSrc.includes('prefers-reduced-motion'), 'Must check for reduced motion preference');
});

test('Premium Dashboard Transformation: 3. CareerMomentumTimeline real ground-truth progression', () => {
  assert.ok(fs.existsSync('src/components/CareerMomentumTimeline.tsx'), 'CareerMomentumTimeline must exist');
  const timelineSrc = fs.readFileSync('src/components/CareerMomentumTimeline.tsx', 'utf8');

  assert.ok(timelineSrc.includes('PROFILE CREATED'), 'Must include PROFILE CREATED stage');
  assert.ok(timelineSrc.includes('RESUME VERIFIED'), 'Must include RESUME VERIFIED stage');
  assert.ok(timelineSrc.includes('SKILLS ANALYZED'), 'Must include SKILLS ANALYZED stage');
  assert.ok(timelineSrc.includes('JOBS DISCOVERED'), 'Must include JOBS DISCOVERED stage');
  assert.ok(timelineSrc.includes('APPLICATION PREPARED'), 'Must include APPLICATION PREPARED stage');
  assert.ok(timelineSrc.includes('APPLICATION SUBMITTED'), 'Must include APPLICATION SUBMITTED stage');
});

test('Premium Dashboard Transformation: 4. OpportunityRadar spatial 3D radar & accessible list view', () => {
  const radarSrc = fs.readFileSync('src/components/OpportunityRadar.tsx', 'utf8');

  assert.ok(radarSrc.includes('3D Spatial Radar'), 'Must provide 3D Spatial Radar view');
  assert.ok(radarSrc.includes('Accessible List View'), 'Must provide Accessible List View');
  assert.ok(radarSrc.includes('Verified Match Evidence'), 'Must highlight verified match evidence');
  assert.ok(radarSrc.includes('Synchronized every 10 min via automated Cloudflare Edge Cron'), 'Must detail automated synchronization');
  assert.ok(radarSrc.includes('Stale & expired postings automatically purged'), 'Must detail stale posting purging');
});

test('Premium Dashboard Transformation: 5. CareerCommandCenter integration and hierarchy', () => {
  const cccSrc = fs.readFileSync('src/components/CareerCommandCenter.tsx', 'utf8');

  // Welcome hero with 3D canvas
  assert.ok(cccSrc.includes('CareerIntelligenceHeroCanvas'), 'Command center must integrate 3D hero canvas');
  assert.ok(cccSrc.includes('Welcome back'), 'Command center must display personalized welcome');

  // AI Career Command Centre 4 Metric Panels
  assert.ok(cccSrc.includes('Your Career Command Centre'), 'Must feature Your Career Command Centre title');
  assert.ok(cccSrc.includes('Applications Prepared'), 'Must track Applications Prepared');
  assert.ok(cccSrc.includes('Submissions Recorded'), 'Must track Submissions Recorded');
  assert.ok(cccSrc.includes('Upcoming Interviews'), 'Must track Upcoming Interviews');
  assert.ok(cccSrc.includes('Verified Skills'), 'Must track Verified Skills');

  // Timelines and Radar
  assert.ok(cccSrc.includes('CareerMomentumTimeline'), 'Must integrate CareerMomentumTimeline');
  assert.ok(cccSrc.includes('CareerMomentumCard'), 'Must integrate CareerMomentumCard');
  assert.ok(cccSrc.includes('OpportunityRadar'), 'Must integrate OpportunityRadar');

  // Priority Action and Copilot
  assert.ok(cccSrc.includes('Recommended Priority Action'), 'Must highlight priority action');
  assert.ok(cccSrc.includes('AI Career Copilot'), 'Must integrate AI Career Copilot shortcuts');
});
