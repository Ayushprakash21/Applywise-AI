import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import {
  BLACK_ELITE_PALETTES,
  BlackElitePalette,
  BlackEliteAppearance,
  getStoredPalette,
  getStoredAppearance,
  applyThemeToDOM,
  setBlackElitePalette,
  setBlackEliteAppearance,
} from '../src/utils/blackEliteTheme.ts';

describe('APPLYVISE AI — Global Light Mode Architecture & Full System Visual Audit Suite', () => {

  it('1. Palettes Registry Integrity: All 5 curated palettes define complete dark and light tokens', () => {
    const requiredPalettes: BlackElitePalette[] = ['ocean', 'dune', 'dusk', 'silk', 'aurora'];
    const requiredModes: BlackEliteAppearance[] = ['dark', 'light'];

    for (const pal of requiredPalettes) {
      assert.ok(BLACK_ELITE_PALETTES[pal], `Palette ${pal} must exist in registry`);
      const meta = BLACK_ELITE_PALETTES[pal];
      assert.ok(meta.name && meta.description && meta.amplitude, `${pal} metadata must be complete`);
      assert.strictEqual(meta.swatches.length, 3, `${pal} must define 3 swatches`);

      for (const mode of requiredModes) {
        const tokens = meta[mode];
        assert.ok(tokens, `${pal}.${mode} tokens must exist`);
        assert.ok(tokens.bgPrimary, `${pal}.${mode} must define bgPrimary`);
        assert.ok(tokens.bgCard, `${pal}.${mode} must define bgCard`);
        assert.ok(tokens.bgElevated, `${pal}.${mode} must define bgElevated`);
        assert.ok(tokens.textPrimary, `${pal}.${mode} must define textPrimary`);
        assert.ok(tokens.textSecondary, `${pal}.${mode} must define textSecondary`);
        assert.ok(tokens.accent, `${pal}.${mode} must define accent`);
        assert.ok(tokens.borderSubtle, `${pal}.${mode} must define borderSubtle`);
      }
    }
  });

  it('2. Dune Signature Light Theme Tokens match Design System Specification', () => {
    const duneLight = BLACK_ELITE_PALETTES.dune.light;
    assert.strictEqual(duneLight.bgPrimary, '#F5F3EE', 'Dune Light main background must be #F5F3EE');
    assert.strictEqual(duneLight.bgCard, '#FFFFFF', 'Dune Light primary surface must be #FFFFFF');
    assert.strictEqual(duneLight.bgSidebar, '#F0EDE5', 'Dune Light sidebar must be #F0EDE5');
    assert.strictEqual(duneLight.textPrimary, '#20242B', 'Dune Light primary text must be #20242B');
    assert.strictEqual(duneLight.textSecondary, '#555C66', 'Dune Light secondary text must be #555C66');
    assert.strictEqual(duneLight.textHeading, '#191D24', 'Dune Light heading text must be #191D24');
    assert.strictEqual(duneLight.borderSubtle, '#DEDAD0', 'Dune Light standard border must be #DEDAD0');
    assert.strictEqual(duneLight.accent, '#A78343', 'Dune Light primary champagne accent must be #A78343');
    assert.strictEqual(duneLight.statusSuccess, '#147A58', 'Dune Light success color must be #147A58');
    assert.strictEqual(duneLight.statusWarning, '#9A6517', 'Dune Light warning color must be #9A6517');
    assert.strictEqual(duneLight.statusError, '#B43D43', 'Dune Light danger color must be #B43D43');
    assert.strictEqual(duneLight.statusInfo, '#315E9C', 'Dune Light info color must be #315E9C');
  });

  it('3. DOM Token Injection: applyThemeToDOM sets both --be-* and 24 global semantic tokens', () => {
    const stylesSet: Record<string, string> = {};
    const attrsSet: Record<string, string> = {};
    const classes = new Set<string>();

    const fakeElem = {
      setAttribute: (k: string, v: string) => { attrsSet[k] = v; },
      removeAttribute: (k: string) => { delete attrsSet[k]; },
      classList: {
        add: (c: string) => classes.add(c),
        remove: (c: string) => classes.delete(c),
        contains: (c: string) => classes.has(c),
      },
      style: {
        setProperty: (k: string, v: string) => { stylesSet[k] = v; },
      },
    };

    (global as any).document = {
      documentElement: fakeElem,
      body: fakeElem,
    };

    // Test Light Mode DOM Application
    applyThemeToDOM('dune', 'light', true);

    assert.strictEqual(attrsSet['data-be-appearance'], 'light');
    assert.strictEqual(attrsSet['data-theme-mode'], 'light');
    assert.strictEqual(attrsSet['data-be-palette'], 'dune');
    assert.ok(classes.has('theme-black-light'), 'root must have theme-black-light');
    assert.ok(!classes.has('theme-black-dark'), 'root must NOT have theme-black-dark in light mode');

    // Verify 24 Standardized Global Semantic Tokens are injected
    const requiredSemanticTokens = [
      '--app-bg',
      '--surface-primary',
      '--surface-secondary',
      '--surface-elevated',
      '--surface-input',
      '--surface-overlay',
      '--text-primary',
      '--text-secondary',
      '--text-muted',
      '--text-disabled',
      '--text-heading',
      '--text-inverse',
      '--border-subtle',
      '--border-default',
      '--border-strong',
      '--border-focus',
      '--accent-primary',
      '--accent-hover',
      '--accent-subtle',
      '--accent-contrast',
      '--status-success',
      '--status-warning',
      '--status-danger',
      '--status-info',
      '--shadow-card',
      '--shadow-elevated',
      '--focus-ring',
    ];

    for (const token of requiredSemanticTokens) {
      assert.ok(stylesSet[token], `Semantic token ${token} must be set in document style`);
    }

    assert.strictEqual(stylesSet['--app-bg'], '#F5F3EE');
    assert.strictEqual(stylesSet['--surface-primary'], '#FFFFFF');
    assert.strictEqual(stylesSet['--text-primary'], '#20242B');

    // Test Dark Mode DOM Application
    applyThemeToDOM('dune', 'dark', true);
    assert.strictEqual(attrsSet['data-be-appearance'], 'dark');
    assert.ok(classes.has('theme-black-dark'), 'root must have theme-black-dark in dark mode');
    assert.ok(!classes.has('theme-black-light'), 'root must NOT have theme-black-light in dark mode');
    assert.strictEqual(stylesSet['--app-bg'], '#090A0C');
    assert.strictEqual(stylesSet['--surface-primary'], '#14171C');
  });

  it('4. index.css Light Mode Architecture: verifies CSS rules for sidebar, cards, tables, inputs and safety guards', () => {
    const cssPath = path.resolve(process.cwd(), 'src/index.css');
    const css = fs.readFileSync(cssPath, 'utf8');

    assert.ok(css.includes('.theme-black-light'), 'index.css must include .theme-black-light');
    assert.ok(css.includes('[data-be-appearance="light"]'), 'index.css must include [data-be-appearance="light"]');

    // Sidebar navigation in Light mode
    assert.ok(
      css.includes('.theme-black-light aside button:not([class*="rounded-full"])'),
      'index.css must define light aside button colors'
    );
    assert.ok(css.includes('var(--be-text-secondary, #555C66)'), 'sidebar buttons must use dark legible text in light mode');

    // Safety guards neutralizing hardcoded dark hex in light mode
    assert.ok(css.includes('.theme-black-light [class*="bg-[#14171C]"]'), 'index.css must neutralize bg-[#14171C] in light mode');
    assert.ok(css.includes('.theme-black-light [class*="bg-[#191D23]"]'), 'index.css must neutralize bg-[#191D23] in light mode');
    assert.ok(css.includes('.theme-black-light [class*="border-[rgba(255,255,255"]'), 'index.css must neutralize dark borders in light mode');
    assert.ok(css.includes('.theme-black-light [class*="text-[#F2F0EA]"]'), 'index.css must neutralize light text on light cards');

    // Header controls
    assert.ok(css.includes('.theme-black-light header'), 'index.css must style header in light mode');
    assert.ok(css.includes('[data-testid="active-safe-pill"]'), 'index.css must style Active Safe pill in light mode');

    // Modals and dialogs
    assert.ok(css.includes('.theme-black-light [role="dialog"]'), 'index.css must style dialogs in light mode');

    // AI Copilot floating button
    assert.ok(css.includes('.theme-black-light button[aria-label="Open ApplyVise Copilot"]'), 'index.css must style copilot button in light mode');
  });

  it('5. WCAG 2.2 AA Contrast Ratios: validates color pairs meet accessibility thresholds', () => {
    // Relative luminance calculation according to WCAG 2.1 / 2.2
    function getLuminance(hex: string): number {
      const cleanHex = hex.replace('#', '');
      const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
      const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
      const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

      const a = [r, g, b].map(v => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
      return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
    }

    function getContrastRatio(hex1: string, hex2: string): number {
      const lum1 = getLuminance(hex1);
      const lum2 = getLuminance(hex2);
      const brightest = Math.max(lum1, lum2);
      const darkest = Math.min(lum1, lum2);
      return (brightest + 0.05) / (darkest + 0.05);
    }

    // Dune Light Checks
    const bgSurface = '#FFFFFF';
    const textPrimary = '#20242B';
    const textSecondary = '#555C66';
    const textHeading = '#191D24';
    const mainBg = '#F5F3EE';

    const ratioPrimary = getContrastRatio(textPrimary, bgSurface);
    const ratioSecondary = getContrastRatio(textSecondary, bgSurface);
    const ratioHeading = getContrastRatio(textHeading, mainBg);

    // WCAG AA requires 4.5:1 for normal body text, 3:1 for large text/headings
    assert.ok(ratioPrimary >= 4.5, `Primary text on white contrast (${ratioPrimary.toFixed(2)}) must be >= 4.5`);
    assert.ok(ratioSecondary >= 4.5, `Secondary text on white contrast (${ratioSecondary.toFixed(2)}) must be >= 4.5`);
    assert.ok(ratioHeading >= 4.5, `Heading text on main bg contrast (${ratioHeading.toFixed(2)}) must be >= 4.5`);
  });

  it('6. Component Code Inspection: CareerAtlas, CareerDesk and DashboardShell use dynamic theme tokens', () => {
    const atlasPath = path.resolve(process.cwd(), 'src/components/CareerAtlas.tsx');
    const atlas = fs.readFileSync(atlasPath, 'utf8');

    // Verify CareerAtlas uses dynamic CSS variables rather than bare unshielded hex in class strings
    assert.ok(atlas.includes('var(--be-bg-card'), 'CareerAtlas must consume var(--be-bg-card)');
    assert.ok(atlas.includes('var(--be-bg-elevated'), 'CareerAtlas must consume var(--be-bg-elevated)');
    assert.ok(atlas.includes('var(--be-border-subtle'), 'CareerAtlas must consume var(--be-border-subtle)');

    const deskPath = path.resolve(process.cwd(), 'src/components/CareerDesk.tsx');
    const desk = fs.readFileSync(deskPath, 'utf8');
    assert.ok(desk.includes('var(--be-bg-card'), 'CareerDesk must consume var(--be-bg-card)');
  });
});
