import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';

test('Responsive UI Audit & Repairs: CSS and Utility Foundations', () => {
  const css = fs.readFileSync(path.resolve('src/index.css'), 'utf-8');

  // Verify safe-area and touch-target utilities
  assert.ok(css.includes('.touch-target'), 'index.css must provide .touch-target utility');
  assert.ok(css.includes('min-height: 44px'), '.touch-target must enforce min-height of 44px');
  assert.ok(css.includes('min-width: 44px'), '.touch-target must enforce min-width of 44px');
  assert.ok(css.includes('.safe-bottom'), 'index.css must provide .safe-bottom utility');
  assert.ok(css.includes('safe-area-inset-bottom'), 'safe-bottom must read safe-area-inset-bottom');
  assert.ok(css.includes('overflow-x: clip'), 'index.css must prevent horizontal body overflow');
});

test('Responsive UI: DashboardShell and AppHeader Mobile Navigation', () => {
  const shellSrc = fs.readFileSync(path.resolve('src/components/DashboardShell.tsx'), 'utf-8');
  const headerSrc = fs.readFileSync(path.resolve('src/components/AppHeader.tsx'), 'utf-8');

  // Dropdown sizing prevents clipping on 320px/360px phones
  assert.ok(shellSrc.includes('w-[calc(100vw-2rem)]'), 'Notifications dropdown must use calc(100vw-2rem) on mobile in DashboardShell');
  assert.ok(headerSrc.includes('w-[calc(100vw-2rem)]'), 'Notifications dropdown must use calc(100vw-2rem) on mobile in AppHeader');
  assert.ok(shellSrc.includes('max-w-[calc(100vw-2rem)]'), 'User menu dropdown must be constrained on mobile in DashboardShell');

  // Bottom navigation safe area and touch targets
  assert.ok(shellSrc.includes('pb-[max(0.5rem,env(safe-area-inset-bottom))]'), 'DashboardShell bottom nav must have safe area bottom padding');
  assert.ok(headerSrc.includes('pb-[max(0.5rem,env(safe-area-inset-bottom))]'), 'AppHeader bottom nav must have safe area bottom padding');
  assert.ok(shellSrc.includes('min-h-[44px] min-w-[48px]'), 'DashboardShell bottom nav items must meet 44px touch-target standards');
});

test('Responsive UI: Landing Page and Career Network Canvas', () => {
  const landingSrc = fs.readFileSync(path.resolve('src/components/LandingPage.tsx'), 'utf-8');
  const canvasSrc = fs.readFileSync(path.resolve('src/components/CareerNetworkVisual.tsx'), 'utf-8');

  // Hero search capsule responsive layout
  assert.ok(landingSrc.includes('flex flex-col sm:flex-row items-stretch sm:items-center'), 'Hero search capsule must stack on mobile');
  assert.ok(landingSrc.includes('min-w-0 flex-1'), 'Hero input must use min-w-0 to prevent Blink flex-child overflow');
  assert.ok(landingSrc.includes('overflow-x-auto max-w-full'), 'Hero cockpit tabs must be scrollable on mobile');

  // Network visual container responsiveness
  assert.ok(canvasSrc.includes('h-[400px] sm:h-[480px] md:h-[580px]'), 'Canvas container must adjust height for mobile');
  assert.ok(canvasSrc.includes('handleResize'), 'CareerNetworkVisual must handle window resize');
});

test('Responsive UI: Drawers & Modals Accessibility (Scroll Lock & Escape Dismiss)', () => {
  const drawerSrc = fs.readFileSync(path.resolve('src/components/JobDetailDrawer.tsx'), 'utf-8');
  const onboardingSrc = fs.readFileSync(path.resolve('src/components/ResumeOnboardingModal.tsx'), 'utf-8');
  const previewSrc = fs.readFileSync(path.resolve('src/components/ResumePreviewModal.tsx'), 'utf-8');
  const authSrc = fs.readFileSync(path.resolve('src/components/AuthModals.tsx'), 'utf-8');
  const legalSrc = fs.readFileSync(path.resolve('src/components/LegalModals.tsx'), 'utf-8');

  // Body overflow locking
  assert.ok(drawerSrc.includes("document.body.style.overflow = 'hidden'"), 'JobDetailDrawer must lock body scroll');
  assert.ok(onboardingSrc.includes("document.body.style.overflow = 'hidden'"), 'ResumeOnboardingModal must lock body scroll');
  assert.ok(previewSrc.includes("document.body.style.overflow = 'hidden'"), 'ResumePreviewModal must lock body scroll');
  assert.ok(authSrc.includes("document.body.style.overflow = 'hidden'"), 'AuthModals must lock body scroll');
  assert.ok(legalSrc.includes("document.body.style.overflow = 'hidden'"), 'LegalModals must lock body scroll');

  // Escape key listeners
  assert.ok(drawerSrc.includes("e.key === 'Escape'"), 'JobDetailDrawer must dismiss on Escape');
  assert.ok(onboardingSrc.includes("e.key === 'Escape'"), 'ResumeOnboardingModal must dismiss on Escape');
  assert.ok(previewSrc.includes("e.key === 'Escape'"), 'ResumePreviewModal must dismiss on Escape');
  assert.ok(authSrc.includes("e.key === 'Escape'"), 'AuthModals must dismiss on Escape');
});

test('Responsive UI: AICopilot Floating Positioning and Drawer Sizing', () => {
  const copilotSrc = fs.readFileSync(path.resolve('src/components/AICopilot.tsx'), 'utf-8');

  // Avoiding collision with mobile bottom nav bar
  assert.ok(copilotSrc.includes('bottom-20 right-4 sm:bottom-6 sm:right-6'), 'AICopilot button must sit above mobile bottom bar');
  assert.ok(copilotSrc.includes('touch-target'), 'AICopilot button must have touch-target class');
  assert.ok(copilotSrc.includes('inset-x-3 bottom-20 sm:inset-auto sm:bottom-6 sm:right-6 sm:w-[420px]'), 'AICopilot drawer must adapt to mobile viewport');
});

test('Responsive UI: Job Search and Applications Pages', () => {
  const jobsSrc = fs.readFileSync(path.resolve('src/components/JobSearchPage.tsx'), 'utf-8');
  const appsSrc = fs.readFileSync(path.resolve('src/components/ApplicationsPage.tsx'), 'utf-8');

  // Job Search inputs and buttons touch sizing
  assert.ok(jobsSrc.includes('min-h-[44px]'), 'JobSearchPage inputs and buttons must enforce 44px touch targets');
  assert.ok(jobsSrc.includes('flex flex-col sm:flex-row items-center justify-between gap-3'), 'Pagination controls must stack cleanly on mobile');

  // Applications Page
  assert.ok(appsSrc.includes('flex flex-wrap items-center gap-2 shrink-0 w-full sm:w-auto'), 'Application card actions must stack on mobile screens');
  assert.ok(appsSrc.includes('flex-1 sm:flex-initial justify-center'), 'Buttons must expand for touch tapping on mobile');
});

test('Responsive UI: Pricing Page Table and Cards', () => {
  const pricingSrc = fs.readFileSync(path.resolve('src/components/PricingPage.tsx'), 'utf-8');

  // Table horizontal scrolling on mobile
  assert.ok(pricingSrc.includes('overflow-x-auto overflow-touch'), 'Pricing comparison table must have touch overflow container');
  assert.ok(pricingSrc.includes('min-h-[44px]'), 'Pricing plan buttons must meet 44px touch height');
});
