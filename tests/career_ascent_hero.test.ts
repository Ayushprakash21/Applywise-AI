// tests/career_ascent_hero.test.ts
// Comprehensive Test Suite for APPLYWISE AI — THE CAREER ASCENT 3D Homepage Hero

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('ApplyWise AI — The Career Ascent 3D Hero Suite', () => {
  const heroTsxPath = path.resolve('src/components/hero/CareerAscentHero.tsx');
  const canvasTsxPath = path.resolve('src/components/hero/CareerAscentCanvas.tsx');
  const heroCssPath = path.resolve('src/components/hero/CareerAscentHero.css');
  const landingPath = path.resolve('src/components/LandingPage.tsx');

  const heroTsxSrc = fs.readFileSync(heroTsxPath, 'utf8');
  const canvasTsxSrc = fs.readFileSync(canvasTsxPath, 'utf8');
  const heroCssSrc = fs.readFileSync(heroCssPath, 'utf8');
  const landingSrc = fs.readFileSync(landingPath, 'utf8');

  test('1. Architectural Files and Components Exist in Hero Directory', () => {
    assert.ok(fs.existsSync(heroTsxPath), 'CareerAscentHero.tsx must exist');
    assert.ok(fs.existsSync(canvasTsxPath), 'CareerAscentCanvas.tsx must exist');
    assert.ok(fs.existsSync(heroCssPath), 'CareerAscentHero.css must exist');
    assert.ok(fs.existsSync(landingPath), 'LandingPage.tsx must exist');
  });

  test('2. LandingPage Integrates CareerAscentHero with Correct Callbacks', () => {
    assert.match(landingSrc, /import\s*\{\s*CareerAscentHero\s*\}\s*from\s*['"]\.\/hero\/CareerAscentHero\.tsx['"]/, 'LandingPage must import CareerAscentHero');
    assert.match(landingSrc, /<CareerAscentHero/, 'LandingPage must render CareerAscentHero');
    assert.match(landingSrc, /onExploreJobs=/, 'Must connect onExploreJobs callback');
    assert.match(landingSrc, /onBuildProfile=/, 'Must connect onBuildProfile callback');
    assert.match(landingSrc, /vacancies=\{featuredVacancies\}/, 'Must pass vacancies');
    assert.match(landingSrc, /onSelectVacancy=\{onSelectVacancy\}/, 'Must pass onSelectVacancy callback');
  });

  test('3. Exact Headline, Supporting Headline, Description & CTAs', () => {
    // Headline: "Your next career move starts here."
    assert.match(heroTsxSrc, /Your next career move/, 'Headline must contain "Your next career move"');
    assert.match(heroTsxSrc, /starts here\./, 'Headline must contain "starts here."');

    // Supporting headline: "Discover. Prepare. Advance."
    assert.match(heroTsxSrc, /Discover\.\s*Prepare\.\s*Advance\./, 'Must have supporting headline "Discover. Prepare. Advance."');

    // Description
    assert.match(
      heroTsxSrc,
      /Find opportunities before the crowd\.\s*Let AI do the heavy lifting\./,
      'Must contain verified product description'
    );
    assert.match(
      heroTsxSrc,
      /Discover relevant jobs,\s*understand your career fit and move forward with intelligent application tools\./,
      'Must contain verified product description part 2'
    );

    // Primary & Secondary CTAs
    assert.match(heroTsxSrc, /Explore opportunities/, 'Primary CTA must be "Explore opportunities"');
    assert.match(heroTsxSrc, /Build my career profile/, 'Secondary CTA must be "Build my career profile"');
  });

  test('4. Five Architectural Milestones (01 to 05)', () => {
    assert.match(heroTsxSrc, /'01',\s*label:\s*'Discover'/, 'Stage 1 must be 01 Discover');
    assert.match(heroTsxSrc, /'02',\s*label:\s*'Match'/, 'Stage 2 must be 02 Match');
    assert.match(heroTsxSrc, /'03',\s*label:\s*'Prepare'/, 'Stage 3 must be 03 Prepare');
    assert.match(heroTsxSrc, /'04',\s*label:\s*'Apply'/, 'Stage 4 must be 04 Apply');
    assert.match(heroTsxSrc, /'05',\s*label:\s*'Advance'/, 'Stage 5 must be 05 Advance');

    // Canvas also defines all 5 stages in 3D
    assert.match(canvasTsxSrc, /'01 DISCOVER'/, '3D canvas defines 01 DISCOVER');
    assert.match(canvasTsxSrc, /'02 MATCH'/, '3D canvas defines 02 MATCH');
    assert.match(canvasTsxSrc, /'03 PREPARE'/, '3D canvas defines 03 PREPARE');
    assert.match(canvasTsxSrc, /'04 APPLY'/, '3D canvas defines 04 APPLY');
    assert.match(canvasTsxSrc, /'05 ADVANCE'/, '3D canvas defines 05 ADVANCE');
  });

  test('5. Three.js Architectural Canvas: Transparent Blue Glass & Neon Edges', () => {
    assert.match(canvasTsxSrc, /THREE\.PerspectiveCamera/, 'Must configure Three.js PerspectiveCamera');
    assert.match(canvasTsxSrc, /THREE\.MeshPhysicalMaterial/, 'Must use MeshPhysicalMaterial for transparent blue glass');
    assert.match(canvasTsxSrc, /transmission:\s*0\.\d+/, 'Glass material must feature physical transmission');
    assert.match(canvasTsxSrc, /THREE\.EdgesGeometry/, 'Must generate architectural illuminated edge geometries');
    assert.match(canvasTsxSrc, /THREE\.LineSegments/, 'Must render illuminated line segments');
    assert.match(canvasTsxSrc, /THREE\.BoxGeometry/, 'Must construct ascending 3D platform slabs');
  });

  test('6. Summit Destination Gateway (Stage 5 ADVANCE)', () => {
    assert.match(canvasTsxSrc, /isDestination:\s*true/, 'Summit stage marked as destination');
    assert.match(canvasTsxSrc, /THREE\.TorusGeometry/, 'Destination features rotating prismatic rings');
    assert.match(canvasTsxSrc, /THREE\.SphereGeometry/, 'Destination features radiant core sphere');
  });

  test('7. Energy Conduits & Sequential Traveling Light Pulse', () => {
    assert.match(canvasTsxSrc, /THREE\.LineCurve3/, 'Must construct 3D curves between ascending platforms');
    assert.match(canvasTsxSrc, /pulseLight/, 'Must illuminate sequential traveling pulse light');
  });

  test('8. Strict Color Palette (Zero Orange in Standard Hero)', () => {
    // Deep Navy #080F1C
    assert.ok(heroCssSrc.includes('#080F1C'), 'CSS defines Deep Navy #080F1C');
    // Midnight Blue #101D30
    assert.ok(heroCssSrc.includes('#101D30'), 'CSS defines Midnight Blue #101D30');
    // Electric Blue #20B9F3
    assert.ok(heroCssSrc.includes('#20B9F3'), 'CSS defines Electric Blue #20B9F3');
    // Azure #0788D1
    assert.ok(heroCssSrc.includes('#0788D1'), 'CSS defines Azure #0788D1');
    // Ice Blue #B9E9FF
    assert.ok(heroCssSrc.includes('#B9E9FF'), 'CSS defines Ice Blue #B9E9FF');

    // No orange in standard hero
    assert.ok(!heroCssSrc.includes('#ff6a2b'), 'Must eliminate legacy orange #ff6a2b');
    assert.ok(!heroCssSrc.includes('#ffb36b'), 'Must eliminate legacy orange #ffb36b');
  });

  test('9. Live Opportunity Integration: Real Data Binding & Clean Hiding When Empty', () => {
    assert.match(heroTsxSrc, /CompanyLogo/, 'Must use official CompanyLogo component');
    assert.match(heroTsxSrc, /realJob1/, 'Must bind realJob1');
    assert.match(heroTsxSrc, /realJob2/, 'Must bind realJob2');
    assert.match(heroTsxSrc, /realJob3/, 'Must bind realJob3');
    assert.match(
      heroTsxSrc,
      /\{\(realJob1\s*\|\|\s*realJob2\s*\|\|\s*realJob3\)\s*&&/,
      'Floating panels must be hidden when real vacancy data is unavailable'
    );
  });

  test('10. Performance & Accessibility: IntersectionObserver & Reduced Motion', () => {
    assert.match(canvasTsxSrc, /IntersectionObserver/, 'Must implement IntersectionObserver to pause off-screen rendering');
    assert.match(canvasTsxSrc, /prefers-reduced-motion/, 'Must respect user prefers-reduced-motion setting');
    assert.match(heroCssSrc, /@media\s*\(prefers-reduced-motion:\s*reduce\)/, 'CSS must include reduced motion query');
    assert.match(canvasTsxSrc, /!webglSupported/, 'Must provide fallback when WebGL is unsupported');
  });

  test('11. Light Mode & Dark Mode Theming', () => {
    assert.match(heroCssSrc, /theme-black-light/, 'CSS must support .theme-black-light');
    assert.match(heroCssSrc, /data-be-appearance="light"/, 'CSS must support [data-be-appearance="light"]');
    assert.match(heroTsxSrc, /useTheme/, 'Hero must consume centralized theme context');
    assert.match(canvasTsxSrc, /isDarkRef/, 'Canvas dynamically adapts to isDark changes');
  });
});
