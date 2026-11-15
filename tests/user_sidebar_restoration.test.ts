import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('ApplyWise AI User Sidebar — Complete 14-Module Restoration & Integrity Suite', async (t) => {
  const shellPath = path.resolve('src/components/DashboardShell.tsx');
  const appPath = path.resolve('src/App.tsx');

  assert.ok(fs.existsSync(shellPath), 'DashboardShell.tsx must exist');
  assert.ok(fs.existsSync(appPath), 'App.tsx must exist');

  const shellSrc = fs.readFileSync(shellPath, 'utf8');
  const appSrc = fs.readFileSync(appPath, 'utf8');

  await t.test('1. Section Structure and Group Names', () => {
    assert.match(shellSrc, /group:\s*'CAREER INTELLIGENCE & WORKSPACE'/);
    assert.match(shellSrc, /group:\s*'CAREER OPERATIONS & PROFILE'/);
    assert.match(shellSrc, /group:\s*'ACCOUNT'/);
  });

  await t.test('2. Exactly 14 Navigation Entries in Precise Order', () => {
    // Expected items in order
    const expectedItems = [
      // CAREER INTELLIGENCE & WORKSPACE (8 items)
      { id: 'desk', label: 'Career Desk' },
      { id: 'autopilot', label: 'AI Autopilot' },
      { id: 'radar', label: 'Opportunity Radar' },
      { id: 'control', label: 'Application Control' },
      { id: 'interview_studio', label: 'Interview Studio' },
      { id: 'recruiter_review', label: 'Recruiter Review' },
      { id: 'atlas', label: 'Career Atlas' },
      { id: 'hr_outreach', label: 'AI HR Outreach' },

      // CAREER OPERATIONS & PROFILE (3 items)
      { id: 'profile', label: 'Career Profile & Facts' },
      { id: 'resume_studio', label: 'Resume Studio' },
      { id: 'career_report', label: 'Skills & Gap Report' },

      // ACCOUNT (3 items)
      { id: 'notifications', label: 'Notifications' },
      { id: 'settings', label: 'Settings' },
      { id: 'subscription', label: 'Membership & Billing' },
    ];

    assert.equal(expectedItems.length, 14, 'Must have exactly 14 navigation entries');

    for (const item of expectedItems) {
      assert.ok(
        shellSrc.includes(`id: '${item.id}'`),
        `DashboardShell must include navigation item id: '${item.id}'`
      );
    }

    // Verify ordering by checking sequential index positions in shellSrc
    let lastIndex = -1;
    for (const item of expectedItems) {
      const currentIndex = shellSrc.indexOf(`id: '${item.id}'`);
      assert.ok(currentIndex > lastIndex, `Item '${item.id}' must appear after previous item`);
      lastIndex = currentIndex;
    }
  });

  await t.test('3. Visual Design & Theme Styling Tokens', () => {
    // Light blue-grey sidebar background
    assert.match(shellSrc, /bg-\[#F0F4F8\]/, 'Sidebar must use light blue-grey background #F0F4F8');
    // Blue active-state indicator
    assert.match(shellSrc, /bg-blue-600/, 'Active item must feature blue active indicator bg-blue-600');
    // Rounded navigation items
    assert.match(shellSrc, /rounded-xl/, 'Navigation items must be rounded-xl');
    // Collapse and expansion toggle
    assert.match(shellSrc, /setSidebarCollapsed\(!sidebarCollapsed\)/, 'Collapse toggle handler must exist');
    assert.match(shellSrc, /ChevronRight/, 'ChevronRight icon for collapsed state');
    assert.match(shellSrc, /ChevronLeft/, 'ChevronLeft icon for expanded state');
    // Tooltips on collapsed
    assert.match(shellSrc, /title=\{sidebarCollapsed \? item\.label : undefined\}/, 'Tooltips when collapsed');
  });

  await t.test('4. Functional Routes and Page Connections in App.tsx', () => {
    // Verify each view is connected
    assert.match(appSrc, /activeTab === 'desk'/, 'CareerDesk component connected');
    assert.match(appSrc, /activeTab === 'autopilot'/, 'AiAutopilotStudio connected');
    assert.match(appSrc, /activeTab === 'radar'/, 'Opportunity Radar connected');
    assert.match(appSrc, /activeTab === 'control'/, 'Application Control connected');
    assert.match(appSrc, /activeTab === 'interview_studio'/, 'Interview Studio connected');
    assert.match(appSrc, /activeTab === 'recruiter_review'/, 'Recruiter Review connected');
    assert.match(appSrc, /activeTab === 'atlas'/, 'Career Atlas connected');
    assert.match(appSrc, /activeTab === 'hr_outreach'/, 'AI HR Outreach connected');
    assert.match(appSrc, /activeTab === 'profile'/, 'Profile connected');
    assert.match(appSrc, /activeTab === 'resume_studio'/, 'Resume Studio connected');
    assert.match(appSrc, /activeTab === 'career_report'/, 'Skills & Gap Report connected');
    assert.match(appSrc, /activeTab === 'notifications'/, 'Notifications connected');
  });
});
