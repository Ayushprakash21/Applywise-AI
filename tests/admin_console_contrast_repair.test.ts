import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Helper to calculate relative luminance according to WCAG 2.1
function getLuminance(hex: string): number {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const R = toLinear(r);
  const G = toLinear(g);
  const B = toLinear(b);

  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

// Helper to calculate WCAG contrast ratio between two hex colors
function getContrastRatio(hex1: string, hex2: string): number {
  const lum1 = getLuminance(hex1);
  const lum2 = getLuminance(hex2);
  const brighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (brighter + 0.05) / (darker + 0.05);
}

describe('APPLYWISE ADMIN CONSOLE — Text Contrast & Theme Repair Suite', () => {
  const indexCss = fs.readFileSync(path.join(process.cwd(), 'src/index.css'), 'utf-8');
  const adminConsole = fs.readFileSync(path.join(process.cwd(), 'src/components/AdminConsole.tsx'), 'utf-8');
  const growthDashboard = fs.readFileSync(
    path.join(process.cwd(), 'src/components/admin/growth-engine/GrowthEngineDashboard.tsx'),
    'utf-8'
  );

  it('1. Verifies centralized design tokens in src/index.css', () => {
    assert.ok(indexCss.includes('--admin-surface-main: #171717;'), 'Main dark surface token missing');
    assert.ok(indexCss.includes('--admin-surface-secondary: #201D1A;'), 'Secondary surface token missing');
    assert.ok(indexCss.includes('--admin-surface-elevated: #292521;'), 'Elevated surface token missing');
    assert.ok(indexCss.includes('--admin-text-primary: #F5F5F4;'), 'Primary text token missing');
    assert.ok(indexCss.includes('--admin-text-secondary: #D6D0C7;'), 'Secondary text token missing');
    assert.ok(indexCss.includes('--admin-text-muted: #A8A29E;'), 'Muted text token missing');
    assert.ok(indexCss.includes('--admin-gold: #D6A84B;'), 'Primary gold token missing');
    assert.ok(indexCss.includes('--admin-gold-hover: #E8BD68;'), 'Gold hover token missing');
    assert.ok(indexCss.includes('--admin-border: #494139;'), 'Border token missing');
    assert.ok(indexCss.includes('--admin-success: #10B981;'), 'Success token missing');
    assert.ok(indexCss.includes('--admin-warning: #F59E0B;'), 'Warning token missing');
    assert.ok(indexCss.includes('--admin-danger: #F43F5E;'), 'Danger token missing');
    assert.ok(indexCss.includes('--admin-info: #38BDF8;'), 'Info token missing');
  });

  it('2. Verifies scoped dark workspace isolation rules in src/index.css', () => {
    assert.ok(
      indexCss.includes('[data-admin-workspace="dark"]') && indexCss.includes('.admin-dark-workspace'),
      'Scoped data-admin-workspace and .admin-dark-workspace rules missing'
    );
    assert.ok(
      indexCss.includes('[data-admin-workspace="dark"] h1') ||
      indexCss.includes('.admin-dark-workspace h1'),
      'Headings color override on dark admin workspace missing'
    );
    assert.ok(
      indexCss.includes('[data-admin-workspace="dark"] p') ||
      indexCss.includes('.admin-dark-workspace p'),
      'Paragraphs color override on dark admin workspace missing'
    );
  });

  it('3. Verifies light mode safety exclusions in src/index.css', () => {
    // Ensure light mode typography overrides have :not([data-admin-workspace="dark"] *)
    assert.ok(
      indexCss.includes(':not([data-admin-workspace="dark"] *)'),
      'Light mode typography rules must exclude dark admin workspace elements'
    );
    assert.ok(
      indexCss.includes(':not(.admin-dark-workspace *)'),
      'Light mode typography rules must exclude admin dark workspace class'
    );
  });

  it('4. Verifies AdminConsole.tsx wraps the Growth Engine in dark admin workspace', () => {
    assert.ok(
      adminConsole.includes('data-admin-workspace="dark"'),
      'AdminConsole must wrap growth_engine in data-admin-workspace="dark"'
    );
    assert.ok(
      adminConsole.includes('admin-dark-workspace'),
      'AdminConsole must wrap growth_engine in admin-dark-workspace class'
    );
  });

  it('5. Verifies GrowthEngineDashboard.tsx implements proper branding and token typography', () => {
    // Brand name correction
    assert.ok(
      growthDashboard.includes('ApplyWise Growth Engine'),
      'Header must read "ApplyWise Growth Engine" without typos'
    );
    assert.ok(
      !growthDashboard.includes('ApplyVise Growth Engine'),
      'Header must not contain "ApplyVise"'
    );

    // Root workspace definition
    assert.ok(
      growthDashboard.includes('data-admin-workspace="dark"'),
      'GrowthEngineDashboard root must define data-admin-workspace="dark"'
    );
    assert.ok(
      growthDashboard.includes('admin-dark-workspace'),
      'GrowthEngineDashboard root must define admin-dark-workspace class'
    );

    // Header typography
    assert.ok(
      growthDashboard.includes('text-[28px] sm:text-[32px] font-extrabold tracking-tight text-[#F5F5F4]'),
      'Main dashboard heading must use 28-32px font-extrabold with primary light text #F5F5F4'
    );

    // Executive KPI cards
    assert.ok(
      growthDashboard.includes('bg-[#201D1A]') && growthDashboard.includes('border-[#494139]'),
      'KPI cards must use secondary dark surface #201D1A and border #494139'
    );
    assert.ok(
      growthDashboard.includes('text-[32px] font-extrabold text-[#F5F5F4]'),
      'KPI metric values must use 32px font-extrabold with #F5F5F4'
    );

    // 8 Agent workforce cards
    assert.ok(
      growthDashboard.includes('Marketing Agent Workforce (8 Specialized Agents)'),
      'Workforce section title must be present'
    );
    assert.ok(
      growthDashboard.includes('text-[16px] font-bold text-[#F5F5F4]'),
      'Agent card titles must use 15-17px font-bold text-[#F5F5F4]'
    );
    assert.ok(
      growthDashboard.includes('text-[13.5px] text-[#D6D0C7] mt-1.5 leading-relaxed'),
      'Agent card descriptions must use 13-14px text-[#D6D0C7]'
    );
  });

  it('6. Mathematical WCAG 2.1 Contrast Ratio Verification', () => {
    const mainSurface = '#171717';
    const secondarySurface = '#201D1A';
    const elevatedSurface = '#292521';
    const primaryText = '#F5F5F4';
    const secondaryText = '#D6D0C7';
    const mutedText = '#A8A29E';
    const goldText = '#D6A84B';
    const darkNavyText = '#191D24';

    // Verify bug condition: Dark navy on dark charcoal fails WCAG
    const bugRatio = getContrastRatio(secondarySurface, darkNavyText);
    assert.ok(bugRatio < 1.3, `Bug contrast ratio ${bugRatio.toFixed(2)} should be unreadable (< 1.3:1)`);

    // Verify fixed condition: Primary text on dark surfaces
    const primaryOnMain = getContrastRatio(mainSurface, primaryText);
    const primaryOnSecondary = getContrastRatio(secondarySurface, primaryText);
    const primaryOnElevated = getContrastRatio(elevatedSurface, primaryText);

    assert.ok(primaryOnMain >= 15.0, `Primary on main surface ratio ${primaryOnMain.toFixed(2)}:1 must exceed 15:1`);
    assert.ok(primaryOnSecondary >= 14.0, `Primary on secondary surface ratio ${primaryOnSecondary.toFixed(2)}:1 must exceed 14:1`);
    assert.ok(primaryOnElevated >= 13.0, `Primary on elevated surface ratio ${primaryOnElevated.toFixed(2)}:1 must exceed 13:1`);

    // Verify secondary text (body) on dark surfaces meets WCAG AA (4.5:1)
    const secondaryOnSecondary = getContrastRatio(secondarySurface, secondaryText);
    assert.ok(
      secondaryOnSecondary >= 10.0,
      `Secondary text on card ratio ${secondaryOnSecondary.toFixed(2)}:1 must easily exceed WCAG AA 4.5:1`
    );

    // Verify gold accent text on dark surface meets WCAG AA (4.5:1)
    const goldOnSecondary = getContrastRatio(secondarySurface, goldText);
    assert.ok(
      goldOnSecondary >= 6.5,
      `Gold text on secondary surface ratio ${goldOnSecondary.toFixed(2)}:1 must exceed WCAG AA 4.5:1`
    );

    // Verify muted text on dark surface meets large text WCAG (3:1)
    const mutedOnSecondary = getContrastRatio(secondarySurface, mutedText);
    assert.ok(
      mutedOnSecondary >= 5.0,
      `Muted text on secondary surface ratio ${mutedOnSecondary.toFixed(2)}:1 must exceed 4.5:1`
    );
  });
});
