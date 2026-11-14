// tests/admin_sidebar_and_typography.test.ts
// Comprehensive Test Suite for ApplyVise AI — Global Admin Sidebar & Intelligent Typography System

import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import {
  TYPOGRAPHY_PROFILES,
  FontFamilyId,
  DEFAULT_FONT_FAMILY,
  getAllFontProfiles,
  getFontProfile,
  getSemanticTypographyStyle,
} from '../src/utils/typographySystem.ts';

describe('ApplyVise AI — Global Admin Sidebar & Intelligent Typography Suite', () => {
  const adminConsolePath = path.resolve(process.cwd(), 'src/components/AdminConsole.tsx');
  const adminConsoleSrc = fs.readFileSync(adminConsolePath, 'utf8');

  const typographyModalPath = path.resolve(process.cwd(), 'src/components/TypographySettingsModal.tsx');
  const typographyModalSrc = fs.readFileSync(typographyModalPath, 'utf8');

  const cssPath = path.resolve(process.cwd(), 'src/index.css');
  const cssSrc = fs.readFileSync(cssPath, 'utf8');

  // ==========================================
  // PART 1: ADMIN CONSOLE SIDEBAR ARCHITECTURE
  // ==========================================
  describe('Part 1: Admin Console Vertical Sidebar Architecture', () => {
    it('1.1. Organizes all 10 administrative modules into 4 structured navigation groups', () => {
      assert.ok(adminConsoleSrc.includes('Command Center'), 'Sidebar must include Command Center group');
      assert.ok(adminConsoleSrc.includes('Intelligence & Discovery'), 'Sidebar must include Intelligence & Discovery group');
      assert.ok(adminConsoleSrc.includes('User Management'), 'Sidebar must include User Management group');
      assert.ok(adminConsoleSrc.includes('Operations & Security'), 'Sidebar must include Operations & Security group');
    });

    it('1.2. Defines all 10 exact administrative navigation tab IDs with accessible role and touch targets', () => {
      const expectedTabIds = [
        'admin-tab-overview',
        'admin-tab-sources',
        'admin-tab-hr-discovery',
        'admin-tab-growth-engine',
        'admin-tab-users',
        'admin-tab-provisioning',
        'admin-tab-founder',
        'admin-tab-resumes',
        'admin-tab-audit',
        'admin-tab-system',
      ];

      for (const tabId of expectedTabIds) {
        assert.ok(adminConsoleSrc.includes(`id="${tabId}"`), `Admin tab button ${tabId} must exist`);
      }

      assert.ok(adminConsoleSrc.includes('role="tab"'), 'Tab buttons must have role="tab"');
      assert.ok(adminConsoleSrc.includes('aria-selected='), 'Tab buttons must have aria-selected attribute');
      assert.ok(adminConsoleSrc.includes('min-h-[38px]'), 'Tab buttons must meet min-h-[38px] touch target requirement');
    });

    it('1.3. Enforces strict navigation ordering: Overview precedes GCDE, and GCDE precedes Users', () => {
      const overviewIdx = adminConsoleSrc.indexOf('id="admin-tab-overview"');
      const sourcesIdx = adminConsoleSrc.indexOf('id="admin-tab-sources"');
      const usersIdx = adminConsoleSrc.indexOf('id="admin-tab-users"');

      assert.ok(overviewIdx !== -1, 'admin-tab-overview must exist');
      assert.ok(sourcesIdx !== -1, 'admin-tab-sources must exist');
      assert.ok(usersIdx !== -1, 'admin-tab-users must exist');
      assert.ok(
        overviewIdx < sourcesIdx && sourcesIdx < usersIdx,
        'Overview must appear before GCDE (sources), and GCDE must appear before Users'
      );
    });

    it('1.4. Sidebar collapse/expand mechanics: toggle button, width transitions, and persistence', () => {
      assert.ok(
        adminConsoleSrc.includes('sidebarCollapsed'),
        'Sidebar must track collapsed state'
      );
      assert.ok(
        adminConsoleSrc.includes('applyvise_admin_sidebar_collapsed'),
        'Sidebar collapse state must be persisted in localStorage'
      );
      assert.ok(
        adminConsoleSrc.includes('toggleSidebarCollapsed'),
        'Sidebar must provide toggle handler'
      );
      assert.ok(
        adminConsoleSrc.includes("sidebarCollapsed ? 'w-20' : 'w-68'"),
        'Sidebar must transition between w-20 (collapsed) and w-68 (expanded)'
      );
      assert.ok(
        adminConsoleSrc.includes('aria-label={sidebarCollapsed ?'),
        'Sidebar toggle must expose dynamic accessible aria-label'
      );
    });

    it('1.5. Mobile responsive drawer and accessible module selector exist', () => {
      assert.ok(
        adminConsoleSrc.includes('mobileDrawerOpen'),
        'Mobile drawer state must exist'
      );
      assert.ok(
        adminConsoleSrc.includes('id="admin-mobile-nav-select"'),
        'Mobile navigation selector ID must exist for small screens'
      );
      assert.ok(
        adminConsoleSrc.includes('flex flex-wrap items-center gap-1.5 text-xs'),
        'Mobile quick-navigation must support responsive flex-wrap without horizontal overflow'
      );
    });

    it('1.6. Route synchronization: pushes /admin/gcde, /admin/growth-engine, and /admin', () => {
      assert.ok(
        adminConsoleSrc.includes("onNavigateRoute('/admin/gcde')") || adminConsoleSrc.includes("window.history.pushState({}, '', '/admin/gcde')"),
        'GCDE navigation must sync to /admin/gcde'
      );
      assert.ok(
        adminConsoleSrc.includes("onNavigateRoute('/admin/growth-engine')") || adminConsoleSrc.includes("window.history.pushState({}, '', '/admin/growth-engine')"),
        'Growth Engine navigation must sync to /admin/growth-engine'
      );
      assert.ok(
        adminConsoleSrc.includes("onNavigateRoute('/admin')") || adminConsoleSrc.includes("window.history.pushState({}, '', '/admin')"),
        'Standard tabs must sync to /admin'
      );
      assert.ok(
        adminConsoleSrc.includes("window.addEventListener('popstate'"),
        'Browser back/forward history events must synchronize active tab state'
      );
    });

    it('1.7. Header integrates Typography launcher button in executive BLACK ELITE styling', () => {
      assert.ok(
        adminConsoleSrc.includes('setTypographyModalOpen(true)'),
        'Header must contain trigger for Typography settings modal'
      );
      assert.ok(
        adminConsoleSrc.includes('TypographySettingsModal'),
        'Header must import and render TypographySettingsModal'
      );
      assert.ok(
        adminConsoleSrc.includes('#111318') && adminConsoleSrc.includes('#C6A66A'),
        'Admin Console must utilize executive BLACK ELITE background and gold tokens'
      );
    });
  });

  // ==========================================
  // PART 2: GLOBAL TYPOGRAPHY SYSTEM
  // ==========================================
  describe('Part 2: Global Typography & Intelligent Font Engine', () => {
    it('2.1. Exactly 10 font families are defined and accessible', () => {
      const profiles = getAllFontProfiles();
      assert.strictEqual(profiles.length, 10, 'Must provide exactly 10 curated font families');

      const expectedIds: FontFamilyId[] = [
        'poppins',
        'roboto',
        'lato',
        'montserrat',
        'oswald',
        'raleway',
        'libre-franklin',
        'josefin-sans',
        'kanit',
        'poiret-one',
      ];

      for (const id of expectedIds) {
        assert.ok(id in TYPOGRAPHY_PROFILES, `Font family ${id} must exist in TYPOGRAPHY_PROFILES`);
        const p = getFontProfile(id);
        assert.strictEqual(p.id, id);
        assert.ok(p.name.length > 0);
        assert.ok(p.family.length > 0);
        assert.ok(p.fallback.length > 0);
        assert.ok(p.googleFontsQuery.includes('family='));
      }
    });

    it('2.2. Default font is Poppins with complete weight scale', () => {
      assert.strictEqual(DEFAULT_FONT_FAMILY, 'poppins', 'Default font must be Poppins');
      const poppins = getFontProfile('poppins');
      assert.deepStrictEqual(poppins.supportedWeights, [300, 400, 500, 600, 700, 800]);
      assert.strictEqual(poppins.weightMap.regular, 400);
      assert.strictEqual(poppins.weightMap.bold, 700);
    });

    it('2.3. Intelligent weight clamping for Poiret One prevents synthetic bold distortion', () => {
      const poiret = getFontProfile('poiret-one');
      assert.strictEqual(poiret.isDisplayOnly, true);
      assert.deepStrictEqual(poiret.supportedWeights, [400], 'Poiret One must only have native weight 400');

      // Crucial: all weight levels clamp to 400 so browser never smears synthetic bold
      assert.strictEqual(poiret.weightMap.thin, 400);
      assert.strictEqual(poiret.weightMap.regular, 400);
      assert.strictEqual(poiret.weightMap.medium, 400);
      assert.strictEqual(poiret.weightMap.semibold, 400);
      assert.strictEqual(poiret.weightMap.bold, 400);
      assert.strictEqual(poiret.weightMap.extrabold, 400);

      // Tracking adjustment for graceful Art Deco letterforms
      assert.ok(parseFloat(poiret.trackingAdjustments.headings || '0') >= 0.05, 'Poiret One must feature wide tracked headings');
    });

    it('2.4. Oswald condensed typography includes breathing letter-spacing', () => {
      const oswald = getFontProfile('oswald');
      assert.strictEqual(oswald.category, 'Condensed Gothic');
      assert.ok(parseFloat(oswald.trackingAdjustments.body || '0') > 0, 'Oswald body must have positive tracking to prevent glyph crowding');
      assert.strictEqual(oswald.weightMap.extrabold, 700, 'Oswald extrabold must clamp to max supported weight 700');
    });

    it('2.5. Josefin Sans geometric vintage weights map correctly without gaps', () => {
      const josefin = getFontProfile('josefin-sans');
      assert.deepStrictEqual(josefin.supportedWeights, [300, 400, 600, 700]);
      // Medium gracefully maps to 400 since 500 is not in font
      assert.strictEqual(josefin.weightMap.medium, 400);
      assert.strictEqual(josefin.weightMap.semibold, 600);
      assert.strictEqual(josefin.weightMap.bold, 700);
    });

    it('2.6. Semantic style resolver generates valid CSS styles across all semantic roles', () => {
      const roles = [
        'heroHeading',
        'pageHeading',
        'sectionHeading',
        'cardHeading',
        'nav',
        'body',
        'supporting',
        'button',
        'input',
        'label',
        'tableHeader',
        'tableCell',
        'kpi',
        'badge',
        'code',
      ] as const;

      for (const role of roles) {
        const style = getSemanticTypographyStyle(role, getFontProfile('poppins'));
        assert.ok(style.fontFamily, `Role ${role} must resolve fontFamily`);
        assert.ok(style.fontWeight, `Role ${role} must resolve fontWeight`);
      }
    });

    it('2.7. CSS architecture binds to typography CSS variables with fallbacks', () => {
      assert.ok(
        cssSrc.includes('var(--font-family-display,'),
        'Heading styles must bind to --font-family-display CSS variable'
      );
      assert.ok(
        cssSrc.includes('var(--font-family-ui,'),
        'Body styles must bind to --font-family-ui CSS variable'
      );
      assert.ok(
        cssSrc.includes('var(--letter-spacing-headings,'),
        'Headings must bind to --letter-spacing-headings CSS variable'
      );
    });

    it('2.8. Candidate Resume DOCX export is strictly isolated from UI typography', () => {
      const resumeStudioSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/components/ResumeStudioTab.tsx'), 'utf8');
      assert.ok(
        resumeStudioSrc.includes('Download DOCX') || resumeStudioSrc.includes('docx'),
        'ResumeStudioTab must support DOCX download'
      );
      // Ensure candidate DOCX generator does not depend on dynamic UI font family
      assert.ok(
        !resumeStudioSrc.includes('applyGlobalFontFamily'),
        'ResumeStudioTab must not contaminate DOCX document styling with transient UI font changes'
      );
    });

    it('2.9. Typography Settings Modal features all 10 cards and interactive specimen preview', () => {
      assert.ok(
        typographyModalSrc.includes('getAllFontProfiles()'),
        'Typography modal must list all font profiles'
      );
      assert.ok(
        typographyModalSrc.includes('Career Intelligence Redefined'),
        'Typography modal preview must render Hero Heading specimen'
      );
      assert.ok(
        typographyModalSrc.includes('Verified Executive Opportunities'),
        'Typography modal preview must render Section Heading specimen'
      );
      assert.ok(
        typographyModalSrc.includes('Apply with Autopilot'),
        'Typography modal preview must render Action Button specimen'
      );
      assert.ok(
        typographyModalSrc.includes('$142,500 / yr'),
        'Typography modal preview must render KPI specimen'
      );
      assert.ok(
        typographyModalSrc.includes('ACTIVE SAFE'),
        'Typography modal preview must render Badge specimen'
      );
      assert.ok(
        typographyModalSrc.includes('handleResetDefault'),
        'Typography modal must provide Reset to Default action'
      );
    });
  });
});
