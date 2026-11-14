import { test, describe, it } from 'node:test';
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
  initBlackEliteTheme,
} from '../src/utils/blackEliteTheme.ts';

describe('APPLYVISE BLACK ELITE — Curated Palettes, Appearance Engine & Header Redesign Suite', () => {
  it('1. All 5 Curated Palettes are defined with required tokens and swatches', () => {
    const requiredPalettes: BlackElitePalette[] = ['ocean', 'dune', 'dusk', 'silk', 'aurora'];

    for (const palId of requiredPalettes) {
      const pal = BLACK_ELITE_PALETTES[palId];
      assert.ok(pal, `Palette ${palId} must be defined`);
      assert.strictEqual(pal.swatches.length, 3, `Palette ${palId} must have exactly 3 preview swatches`);
      assert.ok(pal.amplitude.includes('amplitude'), `Palette ${palId} must specify artistic amplitude metric`);
      assert.ok(pal.amplitude.includes('swell'), `Palette ${palId} must specify swell metric`);

      // Both dark and light variants exist
      for (const mode of ['dark', 'light'] as BlackEliteAppearance[]) {
        const tokens = pal[mode];
        assert.ok(tokens.bgPrimary, `${palId}.${mode} must have bgPrimary`);
        assert.ok(tokens.bgSecondary, `${palId}.${mode} must have bgSecondary`);
        assert.ok(tokens.bgSidebar, `${palId}.${mode} must have bgSidebar`);
        assert.ok(tokens.bgCard, `${palId}.${mode} must have bgCard`);
        assert.ok(tokens.bgElevated, `${palId}.${mode} must have bgElevated`);
        assert.ok(tokens.borderSubtle, `${palId}.${mode} must have borderSubtle`);
        assert.ok(tokens.textPrimary, `${palId}.${mode} must have textPrimary`);
        assert.ok(tokens.textSecondary, `${palId}.${mode} must have textSecondary`);
        assert.ok(tokens.accent, `${palId}.${mode} must have accent`);
        assert.ok(tokens.accentLight, `${palId}.${mode} must have accentLight`);
        assert.ok(tokens.accentMuted, `${palId}.${mode} must have accentMuted`);
      }
    }
  });

  it('2. Theme state persistence and DOM synchronization helpers', () => {
    // Test default values when localStorage is clean or unmocked
    const defaultPal = getStoredPalette();
    assert.ok(['dune', 'ocean', 'dusk', 'silk', 'aurora'].includes(defaultPal));

    const defaultAppearance = getStoredAppearance();
    assert.ok(['dark', 'light'].includes(defaultAppearance));

    // initBlackEliteTheme returns current palette and appearance
    const result = initBlackEliteTheme('black');
    assert.ok(result.palette);
    assert.ok(result.appearance);
  });

  it('3. Header Redesign: Left Brand uses refined EliteCrownBadge without bulky text badge', () => {
    const shellSrc = fs.readFileSync(path.resolve('src/components/DashboardShell.tsx'), 'utf8');
    const badgeSrc = fs.readFileSync(path.resolve('src/components/EliteCrownBadge.tsx'), 'utf8');

    // EliteCrownBadge component exists and has BLACK ELITE tooltip
    assert.ok(badgeSrc.includes('title="BLACK ELITE"'), 'EliteCrownBadge must provide BLACK ELITE title attribute');
    assert.ok(badgeSrc.includes('BLACK ELITE'), 'EliteCrownBadge must include BLACK ELITE tooltip indicator');

    // DashboardShell renders EliteCrownBadge for plan === 'black'
    assert.ok(shellSrc.includes('<EliteCrownBadge />'), 'DashboardShell must render EliteCrownBadge for BLACK ELITE');

    // Ensure bulky badge={plan === 'black' ? 'ELITE' : undefined} was removed from DashboardShell BrandLogo
    assert.ok(!shellSrc.includes("badge={plan === 'black' ? 'ELITE' : undefined}"), 'Bulky text badge must not be passed to BrandLogo');
  });

  it('4. Header Redesign: Integrated Center Search with ⌘K keycap and verified placeholder', () => {
    const shellSrc = fs.readFileSync(path.resolve('src/components/DashboardShell.tsx'), 'utf8');

    // Search placeholder
    assert.ok(
      shellSrc.includes('Search verified opportunities, skills, companies...'),
      'Center search must display exact required placeholder'
    );

    // Kbd ⌘K keycap
    assert.ok(shellSrc.includes('⌘K'), 'Center search must render subtle ⌘K shortcut');
    assert.ok(shellSrc.includes('<kbd'), '⌘K must be semantically tagged with <kbd>');

    // No bulky button in header search
    assert.ok(shellSrc.includes('role="search"'), 'Search container must have role="search"');
  });

  it('5. Header Redesign: Notification Bell with refined unread dot', () => {
    const shellSrc = fs.readFileSync(path.resolve('src/components/DashboardShell.tsx'), 'utf8');

    assert.ok(shellSrc.includes('aria-label="Notifications"'), 'Notification bell must be accessible');
    assert.ok(shellSrc.includes('unreadCount > 0'), 'Bell must render indicator conditionally');
    assert.ok(shellSrc.includes('var(--be-accent'), 'Black Elite indicator must use accent variable');
  });

  it('6. Account Dropdown: Segmented Dark/Light Appearance Slider & Curated Palettes Presets', () => {
    const profileSrc = fs.readFileSync(path.resolve('src/components/ProfileIdentityComponent.tsx'), 'utf8');
    const controlSrc = fs.readFileSync(path.resolve('src/components/BlackEliteAppearanceControl.tsx'), 'utf8');

    // Profile component embeds BlackEliteAppearanceControl for BLACK ELITE
    assert.ok(profileSrc.includes('<BlackEliteAppearanceControl />'), 'Profile dropdown must embed BlackEliteAppearanceControl');

    // Segmented slider with Dark and Light options
    assert.ok(controlSrc.includes('Appearance'), 'Must include Appearance section header');
    assert.ok(controlSrc.includes('Dark'), 'Must provide Dark mode segment');
    assert.ok(controlSrc.includes('Light'), 'Must provide Light mode segment');
    assert.ok(controlSrc.includes('role="radiogroup"'), 'Appearance control must use radiogroup');

    // 5 Presets rendered with swatches and amplitude metrics
    assert.ok(controlSrc.includes('Curated Palettes'), 'Must include Curated Palettes header');
    assert.ok(controlSrc.includes('amplitude'), 'Must show amplitude / swell metrics');
    assert.ok(controlSrc.includes('palette.swatches.map'), 'Must render color swatch cluster');
  });

  it('7. Dashboard Hero Search: Refined luxury pill without garish gradient button', () => {
    const heroSrc = fs.readFileSync(path.resolve('src/components/CareerCommandCenter.tsx'), 'utf8');

    // Search input placeholder
    assert.ok(heroSrc.includes('Search jobs, skills, or companies...'), 'Hero search must have placeholder');

    // No garish gradient button
    assert.ok(!heroSrc.includes('bg-gradient-to-r from-blue-600 via-indigo-600 to-[#8065F5]'), 'Garish gradient button must be removed from hero search');

    // Editorial greeting typography
    assert.ok(heroSrc.includes('font-heading text-2xl sm:text-3xl lg:text-4xl font-bold'), 'Greeting must use font-heading editorial styling');
  });

  it('8. Editorial Enterprise Typography: Google Fonts loaded in index.html and defined in index.css', () => {
    const htmlSrc = fs.readFileSync(path.resolve('index.html'), 'utf8');
    const cssSrc = fs.readFileSync(path.resolve('src/index.css'), 'utf8');

    // Google Fonts preconnect & link
    assert.ok(htmlSrc.includes('fonts.googleapis.com'), 'index.html must load fonts from Google Fonts');
    assert.ok(htmlSrc.includes('Plus+Jakarta+Sans'), 'index.html must load Plus Jakarta Sans');
    assert.ok(htmlSrc.includes('Manrope'), 'index.html must load Manrope');
    assert.ok(htmlSrc.includes('Inter'), 'index.html must load Inter');

    // CSS layer base definitions
    assert.ok(cssSrc.includes('Plus Jakarta Sans'), 'index.css must define Plus Jakarta Sans in typography base');
    assert.ok(cssSrc.includes('Manrope'), 'index.css must define Manrope in typography base');
    assert.ok(cssSrc.includes('font-heading'), 'index.css must define font-heading class');
    assert.ok(cssSrc.includes('font-sans'), 'index.css must define font-sans family');
  });
});
