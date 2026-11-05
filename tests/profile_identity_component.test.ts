import { test, describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { getUserInitials } from '../src/components/ProfileIdentityComponent.tsx';

describe('APPLYVISE AI — Premium Profile Identity & Account Menu Redesign Suite', () => {
  it('1. getUserInitials extracts 2-letter uppercase initials or single word fallback', () => {
    assert.strictEqual(getUserInitials('Ayush Prakash'), 'AP');
    assert.strictEqual(getUserInitials('Ayush Prakash Sharma'), 'AS');
    assert.strictEqual(getUserInitials('Ayush'), 'AY');
    assert.strictEqual(getUserInitials('', 'candidate@applyvise.ai'), 'CA');
    assert.strictEqual(getUserInitials('', ''), 'U');
  });

  it('2. ProfileIdentityComponent enforces visual hierarchy and crown placement rule', () => {
    const compSrc = fs.readFileSync(path.resolve('src/components/ProfileIdentityComponent.tsx'), 'utf8');

    // Name typography
    assert.ok(compSrc.includes('font-semibold text-xs sm:text-sm'), 'Name must use medium-to-semibold typography');
    assert.ok(compSrc.includes('truncate max-w-'), 'Name must truncate gracefully for long usernames');

    // Crown icon must NOT be placed directly beside username
    // Verify that user.fullName is followed by its closing tag without RoyalCrownLogo inline
    assert.ok(!compSrc.includes('{user.fullName || \'User\'}</span>\n          {plan === \'black\' && <RoyalCrownLogo'), 'Crown must NOT be directly inline with username');

    // Membership badge must be below username
    assert.ok(compSrc.includes('BLACK ELITE'), 'Must support BLACK ELITE badge');
    assert.ok(compSrc.includes('PRO MEMBER'), 'Must support PRO MEMBER badge');
    assert.ok(compSrc.includes('FREE MEMBER'), 'Must support FREE MEMBER badge');
    assert.ok(compSrc.includes('FOUNDER ACCESS'), 'Must support FOUNDER ACCESS badge');

    // Dropdown indicator (Chevron) at far right
    assert.ok(compSrc.includes('ChevronDown'), 'Must include ChevronDown indicator');
    assert.ok(compSrc.includes('rotate-180'), 'ChevronDown must rotate on open state');
  });

  it('3. Profile dropdown menu contains all 8 required routes and actions', () => {
    const compSrc = fs.readFileSync(path.resolve('src/components/ProfileIdentityComponent.tsx'), 'utf8');

    const requiredItems = [
      'Profile Overview',
      'Edit Profile',
      'Resume & Career Information',
      'Account Settings',
      'Subscription & Membership',
      'Security & Privacy',
      'Help & Support',
      'Sign Out'
    ];

    for (const label of requiredItems) {
      assert.ok(compSrc.includes(label), `Menu must contain item "${label}"`);
    }

    // Destructive action check
    assert.ok(compSrc.includes('isDestructive'), 'Sign Out must be marked as destructive action');
    assert.ok(compSrc.includes('text-rose-400') || compSrc.includes('text-rose-600') || compSrc.includes('text-rose-500'), 'Sign Out must have distinct destructive styling');
  });

  it('4. Keyboard accessibility & ARIA menu attributes', () => {
    const compSrc = fs.readFileSync(path.resolve('src/components/ProfileIdentityComponent.tsx'), 'utf8');

    assert.ok(compSrc.includes('role="menu"'), 'Dropdown must define role="menu"');
    assert.ok(compSrc.includes('role="menuitem"'), 'Actions must define role="menuitem"');
    assert.ok(compSrc.includes('aria-haspopup="menu"'), 'Trigger button must specify aria-haspopup="menu"');
    assert.ok(compSrc.includes('aria-expanded='), 'Trigger button must specify aria-expanded');
    assert.ok(compSrc.includes('Escape'), 'Must support Escape dismissal');
    assert.ok(compSrc.includes('ArrowDown'), 'Must support ArrowDown navigation');
    assert.ok(compSrc.includes('ArrowUp'), 'Must support ArrowUp navigation');
  });

  it('5. Shared component adoption in DashboardShell and AppHeader (No Duplication)', () => {
    const shellSrc = fs.readFileSync(path.resolve('src/components/DashboardShell.tsx'), 'utf8');
    const headerSrc = fs.readFileSync(path.resolve('src/components/AppHeader.tsx'), 'utf8');

    assert.ok(shellSrc.includes('<ProfileIdentityComponent'), 'DashboardShell must render shared ProfileIdentityComponent');
    assert.ok(headerSrc.includes('<ProfileIdentityComponent'), 'AppHeader must render shared ProfileIdentityComponent');

    // Both must import it cleanly
    assert.ok(shellSrc.includes("import { ProfileIdentityComponent } from './ProfileIdentityComponent.tsx'"), 'DashboardShell must import ProfileIdentityComponent');
    assert.ok(headerSrc.includes("import { ProfileIdentityComponent } from './ProfileIdentityComponent.tsx'"), 'AppHeader must import ProfileIdentityComponent');
  });

  it('6. AccountSettingsModal provides profile photo upload, preview, and removal controls', () => {
    const modalsSrc = fs.readFileSync(path.resolve('src/components/LegalModals.tsx'), 'utf8');

    assert.ok(modalsSrc.includes('Account Identity & Photograph'), 'AccountSettingsModal must include photo identity section');
    assert.ok(modalsSrc.includes('Change Photo') || modalsSrc.includes('Upload Photo'), 'AccountSettingsModal must provide photo upload/change action');
    assert.ok(modalsSrc.includes('Remove Photo'), 'AccountSettingsModal must provide photo remove action');
    assert.ok(modalsSrc.includes('handlePhotoUpload'), 'Must provide photo upload handler');
    assert.ok(modalsSrc.includes('handleRemovePhoto'), 'Must provide photo removal handler');
  });

  it('7. Multi-user security: photo and initials isolation', () => {
    const compSrc = fs.readFileSync(path.resolve('src/components/ProfileIdentityComponent.tsx'), 'utf8');
    const modalsSrc = fs.readFileSync(path.resolve('src/components/LegalModals.tsx'), 'utf8');

    // Ensure storage keys are partitioned by user ID to prevent cross-session leakage
    assert.ok(compSrc.includes('applyvise_user_photo_${user.id}'), 'Profile photo lookup must be scoped to user.id');
    assert.ok(modalsSrc.includes('applyvise_user_photo_${user.id}'), 'Photo storage must be scoped to user.id');
  });
});
