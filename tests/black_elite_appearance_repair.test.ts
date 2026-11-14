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
  setBlackElitePalette,
  setBlackEliteAppearance,
  applyThemeToDOM,
  initBlackEliteTheme,
  THEME_CHANGE_EVENT,
} from '../src/utils/blackEliteTheme.ts';

describe('APPLYVISE BLACK ELITE — Appearance System & 10 Curated Combinations Suite', () => {
  const allPalettes: BlackElitePalette[] = ['ocean', 'dune', 'dusk', 'silk', 'aurora'];
  const appearances: BlackEliteAppearance[] = ['dark', 'light'];

  it('1. Verifies all 10 mode and palette combinations are fully specified', () => {
    let count = 0;
    for (const pal of allPalettes) {
      for (const app of appearances) {
        const tokens = BLACK_ELITE_PALETTES[pal][app];
        assert.ok(tokens, `Combination ${pal}-${app} must exist`);
        assert.ok(tokens.bgPrimary, `${pal}-${app} must have bgPrimary`);
        assert.ok(tokens.bgSecondary, `${pal}-${app} must have bgSecondary`);
        assert.ok(tokens.bgSidebar, `${pal}-${app} must have bgSidebar`);
        assert.ok(tokens.bgCard, `${pal}-${app} must have bgCard`);
        assert.ok(tokens.bgElevated, `${pal}-${app} must have bgElevated`);
        assert.ok(tokens.bgInput, `${pal}-${app} must have bgInput`);
        assert.ok(tokens.borderSubtle, `${pal}-${app} must have borderSubtle`);
        assert.ok(tokens.borderFocus, `${pal}-${app} must have borderFocus`);
        assert.ok(tokens.textPrimary, `${pal}-${app} must have textPrimary`);
        assert.ok(tokens.textSecondary, `${pal}-${app} must have textSecondary`);
        assert.ok(tokens.accent, `${pal}-${app} must have accent`);
        assert.ok(tokens.accentContrast, `${pal}-${app} must have accentContrast`);
        count++;
      }
    }
    assert.strictEqual(count, 10, 'Must have exactly 10 verified combinations');
  });

  it('2. Verifies Dark Mode has dark primary background and Light Mode has light primary background', () => {
    for (const pal of allPalettes) {
      const darkTokens = BLACK_ELITE_PALETTES[pal].dark;
      const lightTokens = BLACK_ELITE_PALETTES[pal].light;

      // Dark primary background starts with #0 or dark shade
      assert.match(darkTokens.bgPrimary, /^#(0|1)/, `${pal} Dark mode must have deep obsidian bgPrimary`);
      // Light primary background is clean light
      assert.match(lightTokens.bgPrimary, /^#(F|E)/, `${pal} Light mode must have light bgPrimary`);

      // Text primary contrast
      assert.match(darkTokens.textPrimary, /^#(F|E)/, `${pal} Dark text must be high-contrast light`);
      assert.match(lightTokens.textPrimary, /^#(0|1|2)/, `${pal} Light text must be high-contrast dark`);
    }
  });

  it('3. DOM Theme Applicator sets CSS variables and classes', () => {
    // Mock minimal DOM environment
    const styleMap = new Map<string, string>();
    const classList = new Set<string>();
    const attributes = new Map<string, string>();

    const fakeElement = {
      style: {
        setProperty: (k: string, v: string) => styleMap.set(k, v),
      },
      classList: {
        add: (c: string) => classList.add(c),
        remove: (c: string) => classList.delete(c),
      },
      setAttribute: (k: string, v: string) => attributes.set(k, v),
    };

    const originalDoc = (globalThis as any).document;
    (globalThis as any).document = {
      documentElement: fakeElement,
      body: fakeElement,
    };

    try {
      applyThemeToDOM('ocean', 'light', true);

      assert.strictEqual(attributes.get('data-theme'), 'black');
      assert.strictEqual(attributes.get('data-be-palette'), 'ocean');
      assert.strictEqual(attributes.get('data-be-appearance'), 'light');
      assert.ok(classList.has('theme-black'));
      assert.ok(classList.has('theme-black-light'));
      assert.ok(!classList.has('theme-black-dark'));

      assert.strictEqual(styleMap.get('--be-bg-primary'), BLACK_ELITE_PALETTES.ocean.light.bgPrimary);
      assert.strictEqual(styleMap.get('--be-accent'), BLACK_ELITE_PALETTES.ocean.light.accent);

      // Now switch to Dusk Dark
      applyThemeToDOM('dusk', 'dark', true);
      assert.strictEqual(attributes.get('data-be-palette'), 'dusk');
      assert.strictEqual(attributes.get('data-be-appearance'), 'dark');
      assert.ok(classList.has('theme-black-dark'));
      assert.ok(!classList.has('theme-black-light'));
      assert.strictEqual(styleMap.get('--be-bg-primary'), BLACK_ELITE_PALETTES.dusk.dark.bgPrimary);
    } finally {
      (globalThis as any).document = originalDoc;
    }
  });

  it('4. Boot initialization in main.tsx guarantees immediate theme setup', () => {
    const mainSrc = fs.readFileSync(path.resolve('src/main.tsx'), 'utf8');
    assert.ok(mainSrc.includes('initBlackEliteTheme()'), 'src/main.tsx must invoke initBlackEliteTheme() on startup');
    assert.ok(mainSrc.includes('initTypographySystem()'), 'src/main.tsx must invoke initTypographySystem() on startup');
  });

  it('5. Global CSS in src/index.css uses dynamic CSS variables instead of hardcoded hex colors', () => {
    const cssSrc = fs.readFileSync(path.resolve('src/index.css'), 'utf8');

    // Cards use var(--be-bg-card)
    assert.ok(cssSrc.includes('background-color: var(--be-bg-card'), 'Cards must use var(--be-bg-card)');
    // Typography uses var(--be-text-primary)
    assert.ok(cssSrc.includes('color: var(--be-text-primary'), 'Typography must use var(--be-text-primary)');
    // Primary buttons use var(--be-accent)
    assert.ok(cssSrc.includes('background: var(--be-accent'), 'Primary buttons must use var(--be-accent)');
    // Inputs use var(--be-bg-input)
    assert.ok(cssSrc.includes('background-color: var(--be-bg-input'), 'Inputs must use var(--be-bg-input)');
    // Modals use var(--be-bg-modal)
    assert.ok(cssSrc.includes('background-color: var(--be-bg-modal'), 'Modals must use var(--be-bg-modal)');

    // Light appearance overrides exist
    assert.ok(cssSrc.includes('.theme-black-light'), 'Light mode overrides must be declared');
    assert.ok(cssSrc.includes('[data-be-appearance="light"]'), 'data-be-appearance="light" attribute selector must be declared');
  });

  it('6. Account dropdown prevents accidental click dismissal during theme selection', () => {
    const profileSrc = fs.readFileSync(path.resolve('src/components/ProfileIdentityComponent.tsx'), 'utf8');
    assert.ok(
      profileSrc.includes('stopPropagation'),
      'Profile dropdown must stop propagation on appearance control wrapper'
    );
  });

  it('7. Baseline token compatibility is preserved for existing tests', () => {
    const cssSrc = fs.readFileSync(path.resolve('src/index.css'), 'utf8');
    const expectedTokens = [
      '#08090D',
      '#101116',
      '#15171E',
      '#1C1E26',
      '#D6B46A',
      '#E5C477',
      '#F3DEAC',
      '#A88B4F',
      '#F7F4EC',
      '#B9B4A8',
      'rgba(214, 180, 106, 0.22)',
    ];

    for (const token of expectedTokens) {
      assert.ok(cssSrc.includes(token), `Must retain baseline token string ${token}`);
    }
  });
});
