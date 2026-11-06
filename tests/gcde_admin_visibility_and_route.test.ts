// tests/gcde_admin_visibility_and_route.test.ts
// Verification Suite for ApplyVise AI — GCDE Admin Visibility & Direct Route Fix

import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

describe('ApplyVise AI — GCDE Admin Visibility & Direct Route Suite', () => {
  const appFile = fs.readFileSync(path.resolve(process.cwd(), 'src/App.tsx'), 'utf8');
  const adminConsoleFile = fs.readFileSync(path.resolve(process.cwd(), 'src/components/AdminConsole.tsx'), 'utf8');
  const gsiFile = fs.readFileSync(path.resolve(process.cwd(), 'src/components/GlobalSourceIntelligence.tsx'), 'utf8');

  it('1. KNOWN_ROUTES explicitly includes /admin/gcde', () => {
    assert.ok(
      appFile.includes("'/admin/gcde'"),
      'KNOWN_ROUTES in App.tsx must include /admin/gcde so it never renders 404'
    );
  });

  it('2. App.tsx routes /admin/gcde directly to AdminConsole with initialTab="sources"', () => {
    assert.ok(
      appFile.includes("currentRoute === '/admin' || currentRoute === '/admin/gcde'"),
      'App.tsx must handle both /admin and /admin/gcde'
    );
    assert.ok(
      appFile.includes("initialTab={currentRoute === '/admin/gcde' ? 'sources' : 'overview'}"),
      'App.tsx must pass initialTab="sources" when navigating to /admin/gcde'
    );
    assert.ok(
      appFile.includes("onNavigateRoute={route => navigateTo(route)}"),
      'App.tsx must bind onNavigateRoute to navigateTo for URL synchronization'
    );
  });

  it('3. Candidate protection: non-admin users cannot access /admin or /admin/gcde', () => {
    assert.ok(
      appFile.includes("currentUser.role !== 'admin' && (currentRoute === '/admin' || currentRoute === '/admin/gcde')"),
      'Candidate users attempting to visit /admin or /admin/gcde must be intercepted'
    );
    assert.ok(
      appFile.includes("Access denied: Administrator privileges required."),
      'Candidate users must receive an explicit access denied toast notice'
    );
  });

  it('4. AdminConsole defines GCDE as prominent tab #2 right after overview with Globe icon', () => {
    assert.ok(
      adminConsoleFile.includes("import {") && adminConsoleFile.includes("Globe,"),
      'AdminConsole must import Globe icon from lucide-react'
    );
    assert.ok(
      adminConsoleFile.includes('Global Career Discovery Engine'),
      'AdminConsole tab must be titled "Global Career Discovery Engine"'
    );
    assert.ok(
      adminConsoleFile.includes('GCDE'),
      'AdminConsole tab must include the executive "GCDE" badge'
    );

    // Verify ordering: overview comes before sources, and sources comes before users
    const overviewIdx = adminConsoleFile.indexOf('id="admin-tab-overview"');
    const sourcesIdx = adminConsoleFile.indexOf('id="admin-tab-sources"');
    const usersIdx = adminConsoleFile.indexOf('id="admin-tab-users"');

    assert.ok(overviewIdx !== -1, 'admin-tab-overview must exist');
    assert.ok(sourcesIdx !== -1, 'admin-tab-sources must exist');
    assert.ok(usersIdx !== -1, 'admin-tab-users must exist');
    assert.ok(
      overviewIdx < sourcesIdx && sourcesIdx < usersIdx,
      'GCDE (sources) must be positioned immediately after Overview & KPIs and before Users & Roles'
    );
  });

  it('5. Subnavigation responsiveness: zero overflow-x-auto horizontal clipping and mobile module selector exists', () => {
    assert.ok(
      adminConsoleFile.includes('flex flex-wrap items-center gap-1.5 text-xs'),
      'Navigation container must use flex-wrap so all 8 admin destinations wrap without horizontal clipping'
    );
    assert.ok(
      adminConsoleFile.includes('id="admin-mobile-nav-select"'),
      'Mobile dropdown selector must exist for narrow screens (360px - 640px)'
    );
    assert.ok(
      adminConsoleFile.includes('min-h-[38px]'),
      'Admin navigation buttons must satisfy accessible touch target heights'
    );
  });

  it('6. URL synchronization: AdminConsole updates browser history between /admin/gcde and /admin', () => {
    assert.ok(
      adminConsoleFile.includes("onNavigateRoute('/admin/gcde')") || adminConsoleFile.includes("window.history.pushState({}, '', '/admin/gcde')"),
      'Selecting GCDE tab must push /admin/gcde to browser history'
    );
    assert.ok(
      adminConsoleFile.includes("onNavigateRoute('/admin')") || adminConsoleFile.includes("window.history.pushState({}, '', '/admin')"),
      'Selecting standard tabs must push /admin to browser history'
    );
    assert.ok(
      adminConsoleFile.includes("window.addEventListener('popstate'"),
      'AdminConsole must listen to popstate for browser Back/Forward navigation'
    );
  });

  it('7. GCDE section renders dedicated hero banner with exact title, subtitle, and badge', () => {
    assert.ok(
      adminConsoleFile.includes('Global Career Discovery Engine'),
      'Hero banner must display Global Career Discovery Engine'
    );
    assert.ok(
      adminConsoleFile.includes('Global job intelligence, employer career portals, ATS connectors and geographic coverage.'),
      'Hero banner must display exact subtitle required by spec'
    );
    assert.ok(
      adminConsoleFile.includes('Dedicated Destination: /admin/gcde'),
      'Hero banner must indicate direct route /admin/gcde'
    );
  });

  it('8. GlobalSourceIntelligence implements independent request states for all 3 data feeds', () => {
    assert.ok(
      gsiFile.includes('sourcesState') && gsiFile.includes('companiesState') && gsiFile.includes('coverageState'),
      'GlobalSourceIntelligence must track sourcesState, companiesState, and coverageState independently'
    );
    assert.ok(
      gsiFile.includes('loadSources') && gsiFile.includes('loadCompanies') && gsiFile.includes('loadCoverage'),
      'GlobalSourceIntelligence must provide dedicated independent loader functions for each service'
    );
  });

  it('9. GlobalSourceIntelligence distinguishes Complete Failure, Partial Failure, Zero Records, and Loading', () => {
    // Complete Failure
    assert.ok(
      gsiFile.includes('isCompleteFailure'),
      'GlobalSourceIntelligence must detect complete API failure'
    );
    assert.ok(
      gsiFile.includes('GCDE Core Telemetry Services Unavailable'),
      'Complete failure must display prominent core service offline banner'
    );
    assert.ok(
      gsiFile.includes('Retry All Requests'),
      'Complete failure must provide Retry All Requests button'
    );

    // Partial Failure
    assert.ok(
      gsiFile.includes('isPartialFailure'),
      'GlobalSourceIntelligence must detect partial API failure'
    );
    assert.ok(
      gsiFile.includes('Partial GCDE Service Degradation'),
      'Partial failure must display warning alert with specific failed service list'
    );
    assert.ok(
      gsiFile.includes('Retry Failed'),
      'Partial failure must provide Retry Failed button'
    );

    // Zero records
    assert.ok(
      gsiFile.includes('Zero Job Sources Registered'),
      'Sources table must display honest zero-record state when catalog is empty'
    );
    assert.ok(
      gsiFile.includes('Zero Discovered Employers'),
      'Companies table must display honest zero-record state when directory is empty'
    );
    assert.ok(
      gsiFile.includes('Zero Geographic Records'),
      'Coverage matrix must display honest zero-record state when geographic data is empty'
    );
  });

  it('10. Zero fabricated metrics: KPI cards display "Unavailable" on service failure and calculate actual rate-limited count', () => {
    assert.ok(
      gsiFile.includes('Unavailable'),
      'KPI cards must show "Unavailable" when underlying API fails, never fabricating 0 or fake healthy status'
    );
    assert.ok(
      gsiFile.includes("sources.filter(s => s.healthStatus === 'rate_limited').length"),
      'Rate-limited connectors count must be calculated dynamically from sources, never hardcoded "0 rate-limited"'
    );
  });

  it('11. Preserves existing GCDE operations: Add Career Site modal, ATS detection, and manual sync', () => {
    assert.ok(
      gsiFile.includes('handleDetectATS'),
      'Automatic ATS detection function must be preserved'
    );
    assert.ok(
      gsiFile.includes('handleManualSync'),
      'Manual source sync function must be preserved'
    );
    assert.ok(
      gsiFile.includes('api.triggerSourceSync'),
      'Backend source sync endpoint integration must be preserved'
    );
    assert.ok(
      gsiFile.includes('api.addCompanyDirectory'),
      'Backend company creation endpoint integration must be preserved'
    );
  });
});
