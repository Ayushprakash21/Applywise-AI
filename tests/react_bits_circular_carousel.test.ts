import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('React Bits CircularCarousel Component Integration & Genuine Product Showcase', async (t) => {
  const rootDir = process.cwd();
  const componentPath = path.resolve(rootDir, 'src/components/ui/CircularCarousel.tsx');
  const componentCssPath = path.resolve(rootDir, 'src/components/ui/CircularCarousel.css');
  const installedComponentPath = path.resolve(rootDir, 'components/CircularCarousel.tsx');
  const installedComponentCssPath = path.resolve(rootDir, 'components/CircularCarousel.css');
  const showcasePath = path.resolve(rootDir, 'src/components/CinematicProductShowcase.tsx');
  const landingPath = path.resolve(rootDir, 'src/components/LandingPage.tsx');

  // Verify component files exist
  assert.ok(fs.existsSync(componentPath), 'CircularCarousel.tsx must exist in src/components/ui/');
  assert.ok(fs.existsSync(componentCssPath), 'CircularCarousel.css must exist in src/components/ui/');
  assert.ok(fs.existsSync(installedComponentPath), 'components/CircularCarousel.tsx must exist from shadcn installation');
  assert.ok(fs.existsSync(installedComponentCssPath), 'components/CircularCarousel.css must exist from shadcn installation');

  const componentSrc = fs.readFileSync(componentPath, 'utf8');
  const componentCss = fs.readFileSync(componentCssPath, 'utf8');
  const showcaseSrc = fs.readFileSync(showcasePath, 'utf8');
  const landingSrc = fs.readFileSync(landingPath, 'utf8');

  await t.test('1. Component Installation and Source API Parity', () => {
    // Check exports
    assert.match(componentSrc, /export interface CircularCarouselItem/, 'Must export CircularCarouselItem interface');
    assert.match(componentSrc, /export interface CircularCarouselProps/, 'Must export CircularCarouselProps interface');
    assert.match(componentSrc, /export default CircularCarousel/, 'Must have default export CircularCarousel');

    // Check actual installed source API props
    assert.match(componentSrc, /preset\?: CircularCarouselPreset/, 'Must support preset prop');
    assert.match(componentSrc, /cardWidth\?: number/, 'Must support cardWidth prop');
    assert.match(componentSrc, /aspectRatio\?: number/, 'Must support aspectRatio prop');
    assert.match(componentSrc, /gap\?: number/, 'Must support gap prop');
    assert.match(componentSrc, /autoplay\?: CircularCarouselAutoplay/, 'Must support autoplay prop');
    assert.match(componentSrc, /draggable\?: boolean/, 'Must support draggable prop');
    assert.match(componentSrc, /momentum\?: number/, 'Must support momentum prop');
    assert.match(componentSrc, /snap\?: boolean/, 'Must support snap prop');
    assert.match(componentSrc, /focusOnClick\?: boolean/, 'Must support focusOnClick prop');
    assert.match(componentSrc, /fadeColor\?: string/, 'Must support fadeColor prop');
    assert.match(componentSrc, /onItemClick\?:/, 'Must support onItemClick prop');
    assert.match(componentSrc, /onChange\?:/, 'Must support onChange prop');
  });

  await t.test('2. Genuine ApplyVise Product Visuals & Items', () => {
    const requiredItems = [
      { id: 'job-discovery', title: 'Job Discovery', path: '/jobs', file: '01-job-discovery.png' },
      { id: 'resume-studio', title: 'Resume Studio', path: '/resume_studio', file: '02-resume-studio.png' },
      { id: 'career-intelligence', title: 'Career Intelligence', path: '/career_twin', file: '03-career-intelligence.png' },
      { id: 'recruiter-intelligence', title: 'Recruiter Intelligence', path: '/dashboard/hr-outreach', file: '04-recruiter-intelligence.png' },
      { id: 'application-tracker', title: 'Application Tracker', path: '/applications', file: '05-application-tracker.png' },
      { id: 'ai-assistant', title: 'AI Career Assistant', path: '/dashboard/ai-autopilot', file: '06-ai-assistant.png' }
    ];

    for (const item of requiredItems) {
      // Check code definitions
      assert.match(showcaseSrc, new RegExp(item.title), `Showcase must include ${item.title}`);
      assert.match(showcaseSrc, new RegExp(item.path), `Showcase must define destination ${item.path} for ${item.title}`);

      // Verify physical image file exists in public/showcase
      const imgPath = path.resolve(rootDir, 'public/showcase', item.file);
      assert.ok(fs.existsSync(imgPath), `Screenshot ${item.file} must exist in public/showcase/`);
      const stat = fs.statSync(imgPath);
      assert.ok(stat.size > 10000, `Screenshot ${item.file} must be an authentic image with non-trivial size (got ${stat.size} bytes)`);
    }

    // No random stock/geometric placeholders
    assert.doesNotMatch(showcaseSrc, /unsplash\.com\/photo/i, 'Must not use generic unsplash stock photos in showcase');
  });

  await t.test('3. Interaction Suite (Drag, Momentum, Snap, Focus, Keyboard, Reduced Motion)', () => {
    // Drag & Momentum
    assert.match(componentSrc, /handlePointerDown/, 'Must implement pointer down');
    assert.match(componentSrc, /handlePointerMove/, 'Must implement pointer move');
    assert.match(componentSrc, /releasePointer/, 'Must implement pointer release and velocity calculation');
    assert.match(componentSrc, /SPRING = 118/, 'Must implement physical spring settling');

    // Snap & Click-to-focus
    assert.match(componentSrc, /focusIndex/, 'Must implement focusIndex');
    assert.match(componentSrc, /focusOnClick/, 'Must implement focusOnClick');

    // Keyboard accessibility
    assert.match(componentSrc, /handleKeyDown/, 'Must implement handleKeyDown');
    assert.match(componentSrc, /ArrowRight|ArrowLeft/, 'Must support arrow key navigation');
    assert.match(componentSrc, /role="region"/, 'Carousel container must have accessible region role');
    assert.match(componentSrc, /role="group"/, 'Slides must have accessible group role');

    // Touch support in CSS
    assert.match(componentCss, /touch-action: pan-y/, 'Must define touch-action for vertical page scrolling stability');
    assert.match(componentCss, /touch-action: pan-x/, 'Must define touch-action for horizontal drag');

    // Reduced motion
    assert.match(componentSrc, /prefers-reduced-motion/, 'Component must check prefers-reduced-motion media query');
    assert.match(componentCss, /@media \(prefers-reduced-motion: reduce\)/, 'CSS must include prefers-reduced-motion overrides');
  });

  await t.test('4. Visual Integration & Theme Adaptation', () => {
    // Dynamic fadeColor based on theme
    assert.match(showcaseSrc, /fadeColor=\{isDark \?/, 'Showcase must pass adaptive fadeColor according to theme');
    assert.match(showcaseSrc, /useTheme\(\)/, 'Showcase must synchronize with centralized ThemeContext');
    assert.match(showcaseSrc, /dark:bg-slate-950|dark:text-slate-100/, 'Showcase must define high-contrast dark mode classes');
    assert.match(showcaseSrc, /bg-slate-50|text-slate-800/, 'Showcase must define clean light mode classes');
  });

  await t.test('5. Workspace Navigation & Accessible Alternatives', () => {
    assert.match(showcaseSrc, /Accessible List View/, 'Showcase must provide Accessible List View alternative');
    assert.match(showcaseSrc, /viewMode === '3d' \?/, 'Showcase must toggle between 3d and accessible list mode');
    assert.match(showcaseSrc, /handleStep\('prev'\)/, 'Showcase must provide previous step control');
    assert.match(showcaseSrc, /handleStep\('next'\)/, 'Showcase must provide next step control');
    assert.match(showcaseSrc, /handleSelectIndex/, 'Showcase must allow direct indicator pill jumping');
  });
});
