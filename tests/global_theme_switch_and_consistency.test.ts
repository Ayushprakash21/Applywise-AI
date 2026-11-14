import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import {
  BLACK_ELITE_PALETTES,
  BlackEliteAppearance,
  getStoredAppearance,
  setBlackEliteAppearance,
  applyThemeToDOM,
} from '../src/utils/blackEliteTheme.ts';

describe('APPLYVISE AI — Global Theme Switch Redesign & Complete Theme Consistency Suite', () => {
  const switchPath = path.resolve('src/components/ui/GlobalThemeSwitch.tsx');
  const landingPath = path.resolve('src/components/LandingPage.tsx');
  const authHeaderPath = path.resolve('src/components/AuthHeader.tsx');
  const dashboardShellPath = path.resolve('src/components/DashboardShell.tsx');
  const appHeaderPath = path.resolve('src/components/AppHeader.tsx');
  const adminConsolePath = path.resolve('src/components/AdminConsole.tsx');
  const pricingPagePath = path.resolve('src/components/PricingPage.tsx');
  const aboutPagePath = path.resolve('src/components/AboutPage.tsx');
  const publicResourcePath = path.resolve('src/components/PublicResourcePage.tsx');
  const adminLoginPath = path.resolve('src/components/AdminLoginPage.tsx');
  const themeContextPath = path.resolve('src/context/ThemeContext.tsx');

  it('1. GlobalThemeSwitch Component Contract & Accessibility', () => {
    assert.ok(fs.existsSync(switchPath), 'GlobalThemeSwitch.tsx component must exist');
    const src = fs.readFileSync(switchPath, 'utf8');

    // Role & Accessibility attributes
    assert.ok(src.includes('role="switch"'), 'Must define role="switch"');
    assert.ok(src.includes('aria-checked={isDark}'), 'Must bind aria-checked to active theme state');
    assert.ok(src.includes('aria-label={label}'), 'Must provide accessible aria-label');
    assert.ok(src.includes("Switch to Light Mode' : 'Switch to Dark Mode"), 'Must provide dynamic switch label');
    assert.ok(src.includes('data-testid="global-theme-switch"'), 'Must define data-testid="global-theme-switch"');

    // Dual Icons: Sun & MoonStar
    assert.ok(src.includes('Sun'), 'Must render Sun icon');
    assert.ok(src.includes('MoonStar'), 'Must render MoonStar icon matching reference design');

    // Sliding knob with smooth translation
    assert.ok(src.includes('translate-x-0'), 'Must define light mode knob position (translate-x-0)');
    assert.ok(src.includes('translate-x-8') || src.includes('translate-x-[30px]'), 'Must define dark mode knob translation');
    assert.ok(src.includes('rounded-full bg-white'), 'Knob must be a circular white element');

    // Keyboard navigation
    assert.ok(src.includes('handleKeyDown'), 'Must support keyboard navigation');
    assert.ok(src.includes("e.key === ' ' || e.key === 'Enter'"), 'Space and Enter must trigger toggle');
    assert.ok(src.includes("e.key === 'ArrowRight'"), 'ArrowRight must support dark switch');
    assert.ok(src.includes("e.key === 'ArrowLeft'"), 'ArrowLeft must support light switch');
  });

  it('2. Centralized Theme State Authority (ThemeContext & blackEliteTheme)', () => {
    const contextSrc = fs.readFileSync(themeContextPath, 'utf8');
    assert.ok(contextSrc.includes('useTheme()'), 'ThemeContext must export useTheme hook');
    assert.ok(contextSrc.includes('setAppearance:'), 'Context must expose setAppearance');
    assert.ok(contextSrc.includes('toggleAppearance:'), 'Context must expose toggleAppearance');
    assert.ok(contextSrc.includes('applyThemeToDOM('), 'Theme changes must immediately update the DOM');
    assert.ok(contextSrc.includes('THEME_CHANGE_EVENT'), 'Must dispatch cross-tab and cross-component sync event');
  });

  it('3. Public Layouts Integration: Homepage, Pricing, About, Resources', () => {
    const landingSrc = fs.readFileSync(landingPath, 'utf8');
    const pricingSrc = fs.readFileSync(pricingPagePath, 'utf8');
    const aboutSrc = fs.readFileSync(aboutPagePath, 'utf8');
    const resourceSrc = fs.readFileSync(publicResourcePath, 'utf8');

    // LandingPage
    assert.ok(landingSrc.includes('<GlobalThemeSwitch'), 'LandingPage must render GlobalThemeSwitch');
    assert.ok(!landingSrc.includes('toggleAppearance = () =>'), 'LandingPage must not maintain duplicate toggle logic');

    // PricingPage
    assert.ok(pricingSrc.includes('<GlobalThemeSwitch'), 'PricingPage must render GlobalThemeSwitch');
    assert.ok(!pricingSrc.includes("document.body.classList.contains('theme-black') ||\n    document.documentElement.getAttribute('data-theme') === 'black'"), 'PricingPage must not falsely lock to dark in light mode');

    // AboutPage
    assert.ok(aboutSrc.includes('<GlobalThemeSwitch'), 'AboutPage must render GlobalThemeSwitch');

    // PublicResourcePage
    assert.ok(resourceSrc.includes('<GlobalThemeSwitch'), 'PublicResourcePage must render GlobalThemeSwitch');
  });

  it('4. Authentication Layouts Integration: Sign In & Sign Up Header', () => {
    const authHeaderSrc = fs.readFileSync(authHeaderPath, 'utf8');
    assert.ok(authHeaderSrc.includes('<GlobalThemeSwitch'), 'AuthHeader must render GlobalThemeSwitch');
    assert.ok(authHeaderSrc.includes('onNavigateLogin'), 'Preserves login trigger');
    assert.ok(authHeaderSrc.includes('onNavigateSignup'), 'Preserves signup trigger');
  });

  it('5. Authenticated Layouts Integration: Candidate Dashboard & Candidate Pages', () => {
    const shellSrc = fs.readFileSync(dashboardShellPath, 'utf8');
    const appHeaderSrc = fs.readFileSync(appHeaderPath, 'utf8');

    // DashboardShell (Candidate Dashboard)
    assert.ok(shellSrc.includes('<GlobalThemeSwitch'), 'DashboardShell must render GlobalThemeSwitch in header toolbar');
    assert.ok(shellSrc.includes('HeaderLanguageSelector'), 'Maintains language selector');
    assert.ok(shellSrc.includes('aria-label="Notifications"'), 'Maintains notifications button');

    // AppHeader (Candidate Pages)
    assert.ok(appHeaderSrc.includes('<GlobalThemeSwitch'), 'AppHeader must render GlobalThemeSwitch');
  });

  it('6. Admin Layouts Integration: Admin Console & Admin Login Portal', () => {
    const adminConsoleSrc = fs.readFileSync(adminConsolePath, 'utf8');
    const adminLoginSrc = fs.readFileSync(adminLoginPath, 'utf8');

    // AdminConsole
    assert.ok(adminConsoleSrc.includes('<GlobalThemeSwitch'), 'AdminConsole must render GlobalThemeSwitch');
    assert.ok(adminConsoleSrc.includes('setTypographyModalOpen(true)'), 'Preserves typography modal trigger');

    // AdminLoginPage
    assert.ok(adminLoginSrc.includes('<GlobalThemeSwitch'), 'AdminLoginPage must render GlobalThemeSwitch');
    assert.ok(adminLoginSrc.includes('var(--be-bg-canvas'), 'AdminLoginPage must bind to --be-bg-canvas');
  });

  it('7. Single Authority & No Rogue Standalone Theme Toggles in Headers', () => {
    const landingSrc = fs.readFileSync(landingPath, 'utf8');
    // Ensure no standalone moon-only button remains in LandingPage header
    assert.ok(!landingSrc.includes('<Moon className="h-4 w-4" />'), 'No standalone Moon icon button in LandingPage desktop header');
    assert.ok(!landingSrc.includes('<Moon className="h-5 w-5" />'), 'No standalone Moon icon button in LandingPage mobile header');
  });
});
