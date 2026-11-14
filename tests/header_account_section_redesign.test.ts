import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

describe('APPLYVISE AI — Global Header Account Section Redesign Suite', () => {
  const shellPath = path.resolve('src/components/DashboardShell.tsx');
  const profileCompPath = path.resolve('src/components/ProfileIdentityComponent.tsx');

  it('1. Unified Header Group: Flex container with consistent 12px gap (gap-3) and baseline alignment', () => {
    const shellSrc = fs.readFileSync(shellPath, 'utf8');

    // Right toolbar container defines gap-3 and shrink-0
    assert.ok(
      shellSrc.includes('flex items-center gap-3 shrink-0'),
      'Right toolbar must use unified flex container with 12px gap (gap-3) and shrink-0'
    );
  });

  it('2. Dimensional Consistency: All three controls share identical 40px (h-10) height', () => {
    const shellSrc = fs.readFileSync(shellPath, 'utf8');
    const profileSrc = fs.readFileSync(profileCompPath, 'utf8');

    // Status pill height: h-10
    assert.ok(
      shellSrc.includes('h-10 px-3.5 rounded-full border text-xs font-medium flex items-center space-x-2'),
      'Active Safe status pill must use h-10 height'
    );

    // Notification button: h-10 w-10
    assert.ok(
      shellSrc.includes('h-10 w-10 flex items-center justify-center rounded-xl border'),
      'Notification button must be a refined 40px square (h-10 w-10)'
    );

    // Account Profile trigger: h-10
    assert.ok(
      profileSrc.includes('h-10 px-2 sm:px-2.5 rounded-xl border flex items-center gap-2 sm:gap-2.5'),
      'Profile trigger button must use matching h-10 height with balanced internal padding'
    );
  });

  it('3. Active Safe Indicator: Refined pill, green indicator, and real status logic', () => {
    const shellSrc = fs.readFileSync(shellPath, 'utf8');

    // Status dot with subtle ping effect
    assert.ok(shellSrc.includes('relative flex h-2 w-2'), 'Status pill must render refined 2x2 dot container');
    assert.ok(shellSrc.includes('animate-ping'), 'Status pill must include subtle ping animation');

    // Active Safe text and Paused alternative
    assert.ok(shellSrc.includes("settings?.emergencyStop ? 'Paused' : 'Active Safe'"), 'Must preserve real status condition logic');
    assert.ok(shellSrc.includes('bg-[rgba(53,184,135,0.08)]'), 'Must use muted dark green background in BLACK ELITE');
    assert.ok(shellSrc.includes('border-[rgba(53,184,135,0.22)]'), 'Must use subtle green border');
    assert.ok(shellSrc.includes('text-[#35B887]'), 'Must use readable emerald status text');
  });

  it('4. Notification Control: Refined square button, accurate unread badge, and palette-aware styling', () => {
    const shellSrc = fs.readFileSync(shellPath, 'utf8');

    assert.ok(shellSrc.includes('aria-label="Notifications"'), 'Must provide accessible aria-label');
    assert.ok(shellSrc.includes('Bell className="h-4 w-4"'), 'Must render centered 16px bell icon');

    // Unread count badge
    assert.ok(shellSrc.includes('unreadCount > 0'), 'Badge must render conditionally on unread notifications');
    assert.ok(shellSrc.includes("unreadCount > 9 ? '9+' : unreadCount"), 'Badge must display accurate count with overflow clamp');
    assert.ok(shellSrc.includes('var(--be-accent'), 'Badge must use palette-aware accent token');

    // Notification dropdown panel
    assert.ok(shellSrc.includes('Mark all as read'), 'Dropdown must provide mark-as-read action');
    assert.ok(shellSrc.includes('View all in Notifications →'), 'Dropdown must link to full notifications view');
  });

  it('5. Account Profile Dropdown: Unified container without nested button boxes and crown-anchored membership', () => {
    const profileSrc = fs.readFileSync(profileCompPath, 'utf8');

    // 30px avatar dimensions
    assert.ok(
      profileSrc.includes('w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-full shrink-0'),
      'Avatar must be sized appropriately (30px)'
    );

    // Crown icon in membership badge
    assert.ok(profileSrc.includes('<RoyalCrownLogo size="xs" />'), 'Must include RoyalCrownLogo in BLACK ELITE membership');
    assert.ok(profileSrc.includes('BLACK ELITE'), 'Must display BLACK ELITE membership label');

    // Clean inline label without nested button box
    assert.ok(
      !profileSrc.includes('border-[rgba(198,166,106,0.25)] bg-[#111318]'),
      'Must eliminate nested button appearance inside profile container'
    );

    // Dropdown interaction and accessibility
    assert.ok(profileSrc.includes('role="menu"'), 'Dropdown must define role="menu"');
    assert.ok(profileSrc.includes('ChevronDown'), 'Must include ChevronDown indicator');
    assert.ok(profileSrc.includes('rotate-180'), 'ChevronDown must rotate on open state');
  });

  it('6. Theme & Palette Token Integration: Responsive and palette-aware', () => {
    const shellSrc = fs.readFileSync(shellPath, 'utf8');
    const profileSrc = fs.readFileSync(profileCompPath, 'utf8');

    // Uses CSS variables for input, card, and borders
    assert.ok(shellSrc.includes('var(--be-bg-input'), 'Must bind to --be-bg-input in shell');
    assert.ok(shellSrc.includes('var(--be-border-subtle'), 'Must bind to --be-border-subtle in shell');
    assert.ok(profileSrc.includes('var(--be-bg-input') || profileSrc.includes('var(--be-bg-card'), 'Profile must bind to theme background variables');

    // Light mode support
    assert.ok(shellSrc.includes('bg-white/80'), 'Must support light mode background in shell');
    assert.ok(profileSrc.includes('bg-white/80'), 'Must support light mode background in profile trigger');
  });
});
