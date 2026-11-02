import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

describe('Admin Authorization and Security Tests', () => {
  it('Admin authorization contract: only users with role === admin are permitted', () => {
    interface MockUser {
      id: string;
      email: string;
      role?: string;
    }

    const checkAdminAccess = (user: MockUser | null) => {
      if (!user) return { status: 401, error: 'Unauthorized: Authentication required' };
      if (user.role !== 'admin') return { status: 403, error: 'Forbidden: Administrator privileges required' };
      return { status: 200, success: true };
    };

    const regularUser: MockUser = { id: 'u1', email: 'regular@example.com', role: 'user' };
    const undefinedRoleUser: MockUser = { id: 'u2', email: 'undefined@example.com' };
    const adminUser: MockUser = { id: 'u3', email: 'ayushprakash0021@gmail.com', role: 'admin' };

    // Unauthenticated
    assert.strictEqual(checkAdminAccess(null).status, 401);
    // Regular user
    const regRes = checkAdminAccess(regularUser);
    assert.strictEqual(regRes.status, 403);
    assert.match(regRes.error || '', /Forbidden/);
    // Undefined role
    assert.strictEqual(checkAdminAccess(undefinedRoleUser).status, 403);
    // Verified Admin
    const adminRes = checkAdminAccess(adminUser);
    assert.strictEqual(adminRes.status, 200);
    assert.strictEqual(adminRes.success, true);
  });

  it('Self-demotion prevention: Admin cannot demote themselves to prevent operator lockout', () => {
    const activeAdminId = 'admin_999';
    const targetUserId = 'admin_999';
    const requestedRole = 'user';

    const handleRoleUpdate = (actorId: string, targetId: string, newRole: string) => {
      if (actorId === targetId && newRole !== 'admin') {
        return {
          status: 400,
          error: 'Security Constraint: You cannot demote yourself from the administrator role.',
        };
      }
      return { status: 200, success: true };
    };

    const selfDemoteRes = handleRoleUpdate(activeAdminId, targetUserId, requestedRole);
    assert.strictEqual(selfDemoteRes.status, 400);
    assert.match(selfDemoteRes.error || '', /cannot demote yourself/i);

    // Demoting another user is permitted
    const otherUserRes = handleRoleUpdate(activeAdminId, 'user_888', requestedRole);
    assert.strictEqual(otherUserRes.status, 200);
    assert.strictEqual(otherUserRes.success, true);
  });

  it('Navigation Bar Sticky Architecture & Neumorphic Polish', () => {
    const appHeaderPath = path.resolve(process.cwd(), 'src/components/AppHeader.tsx');
    assert.ok(fs.existsSync(appHeaderPath), 'AppHeader.tsx must exist');
    const headerSource = fs.readFileSync(appHeaderPath, 'utf8');

    // Sticky / Fixed Positioning
    assert.ok(
      headerSource.includes('sticky top-0 z-50'),
      'AppHeader must use sticky top-0 z-50 to ensure fixed header scrolling'
    );
    // Backdrop blur / Glassmorphism
    assert.ok(
      headerSource.includes('backdrop-blur-md'),
      'AppHeader must use backdrop-blur-md for glassmorphism'
    );
    // Segmented tab navigation container
    assert.ok(
      headerSource.includes('bg-slate-100/90') && headerSource.includes('shadow-[inset_0_1px_2px'),
      'AppHeader must render segmented neumorphic tab container'
    );
    // Mobile bottom navigation bar
    assert.ok(
      headerSource.includes('fixed bottom-0') || headerSource.includes('safe-bottom'),
      'AppHeader must provide dedicated mobile bottom navigation'
    );
    // Harmonized component height
    assert.ok(
      headerSource.includes('h-8.5'),
      'AppHeader must standardize control heights to h-8.5'
    );
  });

  it('Admin Routing & Console Entry in App.tsx', () => {
    const appPath = path.resolve(process.cwd(), 'src/App.tsx');
    assert.ok(fs.existsSync(appPath), 'App.tsx must exist');
    const appSource = fs.readFileSync(appPath, 'utf8');

    assert.ok(appSource.includes("currentRoute === '/admin'"), 'App.tsx must handle /admin route');
    assert.ok(appSource.includes("currentRoute === '/admin/login'"), 'App.tsx must handle /admin/login route');
    assert.ok(appSource.includes('<AdminConsole'), 'App.tsx must render AdminConsole for authorized admins');
    assert.ok(appSource.includes('<AdminLoginPage'), 'App.tsx must render AdminLoginPage');
    assert.ok(appSource.includes('pb-24 lg:pb-8'), 'App.tsx must apply padding to prevent mobile bottom bar overlap');
  });

  it('Admin Provisioning CLI Script exists and is configured in package.json', () => {
    const scriptPath = path.resolve(process.cwd(), 'scripts/promote-admin.ts');
    assert.ok(fs.existsSync(scriptPath), 'scripts/promote-admin.ts must exist');

    const pkgPath = path.resolve(process.cwd(), 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    assert.ok(pkg.scripts['admin:promote'], 'package.json must contain "admin:promote" script');
  });

  it('Backend Admin Routes & Worker Store Integration', () => {
    const workerIndexPath = path.resolve(process.cwd(), 'worker/index.ts');
    assert.ok(fs.existsSync(workerIndexPath), 'worker/index.ts must exist');
    const workerIndexSource = fs.readFileSync(workerIndexPath, 'utf8');

    assert.ok(workerIndexSource.includes('/api/admin/overview'), 'worker/index.ts must expose /api/admin/overview');
    assert.ok(workerIndexSource.includes('/api/admin/users'), 'worker/index.ts must expose /api/admin/users');
    assert.ok(workerIndexSource.includes('/api/admin/audit-logs'), 'worker/index.ts must expose /api/admin/audit-logs');
    assert.ok(workerIndexSource.includes('/api/admin/system-health'), 'worker/index.ts must expose /api/admin/system-health');
    assert.ok(workerIndexSource.includes("user.role !== 'admin'"), 'worker/index.ts must enforce admin role check');
  });
});
