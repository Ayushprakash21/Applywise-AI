// tests/platform_ui_readability_responsive.test.ts
// Platform-wide UI Readability, Dropdown & Responsive Verification Suite

import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import {
  BLACK_ELITE_PALETTES,
  BlackElitePalette,
  BlackEliteAppearance,
} from '../src/utils/blackEliteTheme.ts';
import {
  detectResolvedTheme,
  computePopoverPlacement,
} from '../src/components/ui/SelectSystem.tsx';
import { LANGUAGE_CATALOGUE, getAvailableLanguagesList } from '../src/utils/languageCatalogue.ts';

describe('APPLYVISE AI — Platform-Wide UI Readability, Dropdown & Responsive Suite', () => {
  const cssPath = path.resolve('src/index.css');
  const momentumPath = path.resolve('src/components/CareerMomentumCard.tsx');
  const selectSystemPath = path.resolve('src/components/ui/SelectSystem.tsx');
  const searchBarPath = path.resolve('src/components/GlobalSearchBar.tsx');
  const headerLangPath = path.resolve('src/components/HeaderLanguageSelector.tsx');
  const shellPath = path.resolve('src/components/DashboardShell.tsx');
  const profileCompPath = path.resolve('src/components/ProfileIdentityComponent.tsx');

  // ==========================================================================
  // 1. Career Momentum Dashboard Card Readability
  // ==========================================================================
  describe('1. Career Momentum Card Readability & Semantic Tokens', () => {
    it('1.1. Uses semantic CSS variables for card background and border rather than hardcoded white/black', () => {
      const src = fs.readFileSync(momentumPath, 'utf8');
      assert.ok(src.includes('var(--be-bg-card'), 'Must bind card background to var(--be-bg-card)');
      assert.ok(src.includes('var(--be-border-subtle'), 'Must bind border to var(--be-border-subtle)');
      assert.ok(!src.includes('bg-white/65'), 'Must eliminate legacy hardcoded bg-white/65');
    });

    it('1.2. Metric values and headings use high-contrast primary text tokens', () => {
      const src = fs.readFileSync(momentumPath, 'utf8');
      assert.ok(src.includes('var(--be-text-primary'), 'Heading and numbers must use var(--be-text-primary)');
      assert.ok(src.includes('Career Momentum'), 'Must render Career Momentum heading');
      assert.ok(src.includes('m.value'), 'Must render milestone metric values');
    });

    it('1.3. Subtext and labels use deliberate accessible secondary and muted tokens', () => {
      const src = fs.readFileSync(momentumPath, 'utf8');
      assert.ok(src.includes('var(--be-text-secondary'), 'Subtitles must use var(--be-text-secondary)');
      assert.ok(src.includes('var(--be-text-muted'), 'Muted indicators must use var(--be-text-muted)');
      assert.ok(src.includes('var(--be-status-success'), 'Ground truth badge must use var(--be-status-success)');
    });

    it('1.4. In index.css, rounded-3xl and rounded-2xl cards are not globally forced to dark modal backgrounds', () => {
      const css = fs.readFileSync(cssPath, 'utf8');
      assert.ok(
        !css.includes('.theme-black [class*="rounded-3xl bg-white"]'),
        'Must remove global blunt rule .theme-black [class*="rounded-3xl bg-white"] that forced cards to black modals'
      );
      assert.ok(
        !css.includes('.theme-black [class*="rounded-2xl bg-white"]'),
        'Must remove global blunt rule .theme-black [class*="rounded-2xl bg-white"]'
      );
    });
  });

  // ==========================================================================
  // 2. Recruiter Review & Select System Dropdown Architecture
  // ==========================================================================
  describe('2. Recruiter Review & Universal Select System Dropdowns', () => {
    it('2.1. detectResolvedTheme resolves to light mode when data-be-appearance is light', () => {
      // Test that detectResolvedTheme checks appearance attributes
      const selectSrc = fs.readFileSync(selectSystemPath, 'utf8');
      assert.ok(
        selectSrc.includes('data-be-appearance'),
        'detectResolvedTheme must inspect data-be-appearance attribute'
      );
      assert.ok(
        selectSrc.includes("appearance === 'light'"),
        'Must return light when appearance is light'
      );
    });

    it('2.2. Dropdown menu and triggers use semantic CSS variables across palettes', () => {
      const selectSrc = fs.readFileSync(selectSystemPath, 'utf8');
      assert.ok(selectSrc.includes('var(--be-bg-elevated'), 'Menu popover must use var(--be-bg-elevated)');
      assert.ok(selectSrc.includes('var(--be-text-primary'), 'Option text must use var(--be-text-primary)');
      assert.ok(selectSrc.includes('var(--be-border-focus'), 'Focus border must use var(--be-border-focus)');
      assert.ok(selectSrc.includes('var(--be-accent'), 'Selected option must use var(--be-accent)');
    });

    it('2.3. Options provide title tooltips for truncated job titles and descriptions', () => {
      const selectSrc = fs.readFileSync(selectSystemPath, 'utf8');
      assert.ok(
        selectSrc.includes('title={opt.label}'),
        'Option label must supply title attribute for accessible tooltips on long job titles'
      );
      assert.ok(
        selectSrc.includes('truncate'),
        'Long labels must truncate gracefully'
      );
    });

    it('2.4. Popover placement calculates boundary clamping and flips upward when space is constrained', () => {
      // Test computePopoverPlacement with space below
      const normalPlacement = computePopoverPlacement(
        { top: 100, bottom: 140, left: 100, width: 250 },
        { width: 1200, height: 800 }
      );
      assert.equal(normalPlacement.direction, 'down', 'Must open downwards when ample space below');
      assert.ok(normalPlacement.top >= 140, 'Top must be positioned below trigger');

      // Test computePopoverPlacement near bottom of viewport
      const bottomPlacement = computePopoverPlacement(
        { top: 720, bottom: 760, left: 100, width: 250 },
        { width: 1200, height: 800 }
      );
      assert.equal(bottomPlacement.direction, 'up', 'Must flip upward when space below is insufficient');
    });
  });

  // ==========================================================================
  // 3. Compact Header Language Selector & Universal 30-Language Engine
  // ==========================================================================
  describe('3. Header Language Selector & 30-Language Integrity', () => {
    it('3.1. Compact Globe control exists in Global Header with h-10 dimensional consistency', () => {
      const shellSrc = fs.readFileSync(shellPath, 'utf8');
      const langSrc = fs.readFileSync(headerLangPath, 'utf8');

      assert.ok(
        shellSrc.includes('<HeaderLanguageSelector'),
        'DashboardShell header must render HeaderLanguageSelector'
      );
      assert.ok(
        langSrc.includes('h-10'),
        'Header language button must use h-10 matching Active Safe & Notification bell'
      );
      assert.ok(
        langSrc.includes('<Globe'),
        'Header language button must use Lucide Globe icon'
      );
    });

    it('3.2. Language dropdown is an anchored popover with searchable list of all 30 languages', () => {
      const langSrc = fs.readFileSync(headerLangPath, 'utf8');
      assert.ok(langSrc.includes('getAvailableLanguagesList'), 'Must load all available languages');
      assert.ok(langSrc.includes('searchQuery'), 'Must support interactive search filtering');
      assert.ok(langSrc.includes('role="listbox"'), 'Dropdown must define role="listbox"');
      assert.ok(langSrc.includes('max-h-'), 'Dropdown must be constrained and scrollable');

      // Check all 30 languages exist in catalogue
      const allLangs = getAvailableLanguagesList();
      assert.equal(allLangs.length, 30, 'All 30 world languages must remain available in catalogue');
    });

    it('3.3. Large floating language modal is removed from ProfileIdentityComponent', () => {
      const profileSrc = fs.readFileSync(profileCompPath, 'utf8');
      assert.ok(
        !profileSrc.includes('languageModalOpen'),
        'Must remove languageModalOpen state and modal from ProfileIdentityComponent'
      );
      assert.ok(
        !profileSrc.includes('All 30 World Languages...'),
        'Must remove breaking oversized language panel from account menu'
      );
    });

    it('3.4. Language selector dismisses on outside click and Escape key', () => {
      const langSrc = fs.readFileSync(headerLangPath, 'utf8');
      assert.ok(langSrc.includes('handleClickOutside'), 'Must implement outside click listener');
      assert.ok(langSrc.includes("e.key === 'Escape'"), 'Must implement Escape key listener');
    });
  });

  // ==========================================================================
  // 4. Global Search Bar Readability & Nested Rectangular Outline Elimination
  // ==========================================================================
  describe('4. Global Search Bar Readability & CSS Outline Reset', () => {
    it('4.1. Global search bar height is standardized to h-10', () => {
      const searchSrc = fs.readFileSync(searchBarPath, 'utf8');
      assert.ok(searchSrc.includes('h-10'), 'Search container must use h-10 (40px) height');
    });

    it('4.2. Transparent input reset removes rectangular nested borders in light mode', () => {
      const css = fs.readFileSync(cssPath, 'utf8');
      assert.ok(
        css.includes('[role="search"] input'),
        'Must include explicit [role="search"] input reset rule'
      );
      assert.ok(
        css.includes('background-color: transparent !important;'),
        'Search input must have transparent background forced'
      );
      assert.ok(
        css.includes('border: 0 !important;'),
        'Search input must have border 0 forced'
      );
    });

    it('4.3. Search icon, placeholder, and shortcut badge have high contrast', () => {
      const searchSrc = fs.readFileSync(searchBarPath, 'utf8');
      assert.ok(searchSrc.includes('w-4 h-4'), 'Search icon must be appropriately sized (w-4 h-4)');
      assert.ok(searchSrc.includes('var(--be-text-secondary'), 'Search icon & badge must use var(--be-text-secondary)');
      assert.ok(searchSrc.includes('shortcutDisplay'), 'Must display platform-aware shortcut');
    });
  });

  // ==========================================================================
  // 5. Theme & Palette Consistency (Ocean, Dune, Dusk, Silk, Aurora in Light/Dark)
  // ==========================================================================
  describe('5. Theme & Palette Token Consistency', () => {
    const palettes: BlackElitePalette[] = ['ocean', 'dune', 'dusk', 'silk', 'aurora'];
    const appearances: BlackEliteAppearance[] = ['dark', 'light'];

    for (const p of palettes) {
      for (const a of appearances) {
        it(`5.1. Palette ${p} in ${a} mode has complete semantic tokens`, () => {
          const meta = BLACK_ELITE_PALETTES[p];
          assert.ok(meta, `Palette ${p} metadata must exist`);
          const tokens = meta[a];
          assert.ok(tokens.bgPrimary, `${p} ${a} must define bgPrimary`);
          assert.ok(tokens.bgCard, `${p} ${a} must define bgCard`);
          assert.ok(tokens.bgElevated, `${p} ${a} must define bgElevated`);
          assert.ok(tokens.textPrimary, `${p} ${a} must define textPrimary`);
          assert.ok(tokens.textSecondary, `${p} ${a} must define textSecondary`);
          assert.ok(tokens.textMuted, `${p} ${a} must define textMuted`);
          assert.ok(tokens.accent, `${p} ${a} must define accent`);
          assert.ok(tokens.borderSubtle, `${p} ${a} must define borderSubtle`);
          assert.ok(tokens.borderFocus, `${p} ${a} must define borderFocus`);
        });
      }
    }

    it('5.2. blackEliteTheme.ts sets --be-bg-modal variable for modal dialogs', () => {
      const themeSrc = fs.readFileSync(path.resolve('src/utils/blackEliteTheme.ts'), 'utf8');
      assert.ok(themeSrc.includes("'--be-bg-modal'"), 'Must define --be-bg-modal in blackEliteTheme.ts');
    });
  });

  // ==========================================================================
  // 6. Responsive Viewport Architecture & No Horizontal Overflow
  // ==========================================================================
  describe('6. Responsive Viewport Architecture', () => {
    it('6.1. Header controls collapse gracefully on small viewports (sm: breakpoint)', () => {
      const shellSrc = fs.readFileSync(shellPath, 'utf8');
      const searchSrc = fs.readFileSync(searchBarPath, 'utf8');

      // Search bar is hidden on mobile, toggled via search button
      assert.ok(shellSrc.includes('hidden md:flex'), 'Desktop search hides on small screens');
      assert.ok(shellSrc.includes('md:hidden'), 'Mobile search toggle icon exists');

      // Status pill text hides on mobile, preserving compact dot
      assert.ok(shellSrc.includes('hidden sm:inline'), 'Pill text hides on small mobile');
    });

    it('6.2. Dropdowns and popovers are clamped to viewport width and avoid overflow', () => {
      const viewports = [
        { width: 320, height: 640 },
        { width: 375, height: 812 },
        { width: 430, height: 932 },
        { width: 768, height: 1024 },
        { width: 1366, height: 768 },
        { width: 1536, height: 864 },
        { width: 1920, height: 1080 },
      ];

      for (const vp of viewports) {
        const placement = computePopoverPlacement(
          { top: 50, bottom: 90, left: vp.width - 100, width: 280 },
          vp
        );
        assert.ok(
          placement.left >= 0,
          `Left position ${placement.left} must be >= 0 for viewport width ${vp.width}`
        );
        assert.ok(
          placement.left + placement.width <= vp.width,
          `Right edge ${placement.left + placement.width} must fit within viewport ${vp.width}`
        );
      }
    });
  });

  // ==========================================================================
  // 7. Homepage Zero-Hallucination Comparison & Section Contrast Integrity
  // ==========================================================================
  describe('7. Homepage Zero-Hallucination Comparison & Section Contrast Integrity', () => {
    const landingPath = path.resolve('src/components/LandingPage.tsx');

    it('7.1. ApplyVise AI Engine column preserves premium dark navy surface with data-theme-surface', () => {
      const src = fs.readFileSync(landingPath, 'utf8');
      assert.ok(src.includes('data-theme-surface="dark"'), 'Must define data-theme-surface="dark" on ApplyVise column');
      assert.ok(src.includes('bg-[#0B1528]'), 'Must use rich navy surface bg-[#0B1528] for ApplyVise column');
      assert.ok(src.includes('bg-[#0D1B30]'), 'Must use dark navy header bg-[#0D1B30] for ApplyVise header');
    });

    it('7.2. ApplyVise column headings, check icon, and descriptions use bright accessible foreground colors', () => {
      const src = fs.readFileSync(landingPath, 'utf8');
      assert.ok(src.includes('text-sky-300'), 'Row titles must use luminous text-sky-300');
      assert.ok(src.includes('text-slate-100'), 'Good descriptions must use high-contrast text-slate-100');
      assert.ok(src.includes('text-emerald-400'), 'Check icon must use bright text-emerald-400');
      assert.ok(!src.includes('text-slate-800 bg-blue-50/20'), 'Must eliminate low-contrast dark text on navy');
    });

    it('7.3. Generic Generative AI column is visually distinct with accessible rose error indicators', () => {
      const src = fs.readFileSync(landingPath, 'utf8');
      assert.ok(src.includes('Generic Generative AI'), 'Must render Generic AI comparison column');
      assert.ok(src.includes('text-rose-700'), 'Must use visible rose accent in Generic AI column');
    });

    it('7.4. CSS architecture isolates dark surfaces from generic light mode paragraph color overrides', () => {
      const css = fs.readFileSync(cssPath, 'utf8');
      assert.ok(css.includes('[data-theme-surface="dark"]'), 'CSS must define isolated dark surface rule');
      assert.ok(css.includes('not([data-theme-surface="dark"] *)'), 'Light mode overrides must exclude dark surfaces');
      assert.ok(css.includes('--be-bg-canvas'), 'Theme tokens must define --be-bg-canvas');
    });

    it('7.5. Hero section and Call to Action banner adapt to theme canvas without unreadable text', () => {
      const src = fs.readFileSync(landingPath, 'utf8');
      assert.ok(src.includes('bg-[var(--be-bg-canvas,#F5F3EE)]'), 'Hero section must bind to --be-bg-canvas');
      assert.ok(src.includes('bg-blue-600 text-white'), 'CTA banner must maintain white text on blue surface');
      assert.ok(src.includes('data-theme-surface="dark"'), 'CTA banner must specify dark surface');
    });
  });
});
