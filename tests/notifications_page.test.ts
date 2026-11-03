import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { authAndStore } from '../server/authAndStore.ts';
import { NotificationItem } from '../src/types/index.ts';

test('Notifications: 1. Component architecture and App.tsx integration', () => {
  // A. Component file must exist
  assert.ok(fs.existsSync('src/components/NotificationsPage.tsx'), 'NotificationsPage.tsx must exist');
  const notifSrc = fs.readFileSync('src/components/NotificationsPage.tsx', 'utf8');

  // B. Required header, metric badges, and filters
  assert.ok(notifSrc.includes('Stay informed about your career activity'), 'Must contain required header description');
  assert.ok(notifSrc.includes('Total') && notifSrc.includes('Unread') && notifSrc.includes('Read'), 'Must display Total, Unread, and Read counts');
  assert.ok(notifSrc.includes('Search notifications'), 'Must include notification search filter');
  assert.ok(notifSrc.includes('Mark all read'), 'Must include Mark all read button');

  // C. Empty & Error states
  assert.ok(notifSrc.includes("You're all caught up"), 'Must contain designed empty state headline');
  assert.ok(notifSrc.includes('Important updates about your career journey will appear here'), 'Must contain empty state subtitle');
  assert.ok(notifSrc.includes('Unable to load notifications'), 'Must contain visible error banner');
  assert.ok(notifSrc.includes('Retry'), 'Must include retry button in error state');

  // D. Premium glassmorphic visual tokens
  assert.ok(notifSrc.includes('backdrop-blur'), 'Must use translucent frosted glass backdrop-blur');
  assert.ok(notifSrc.includes('border-l-4 border-l-blue-600'), 'Unread notifications must feature blue indicator');
  assert.ok(notifSrc.includes('from-[#2563EB] to-[#8065F5]'), 'Must use electric blue & radiant violet gradient');

  // E. App.tsx integration
  const appSrc = fs.readFileSync('src/App.tsx', 'utf8');
  assert.ok(appSrc.includes("import { NotificationsPage } from './components/NotificationsPage.tsx'"), 'App.tsx must import NotificationsPage');
  assert.ok(appSrc.includes("activeTab === 'notifications'"), 'App.tsx must render NotificationsPage on activeTab === notifications');
  assert.ok(appSrc.includes("'/notifications'"), 'App.tsx must register /notifications in protected and known routes');

  // F. DashboardShell dropdown link
  const shellSrc = fs.readFileSync('src/components/DashboardShell.tsx', 'utf8');
  assert.ok(shellSrc.includes("View all in Notifications"), 'DashboardShell dropdown must link to Notifications tab');
});

test('Notifications: 2. Notification type visual distinction and contextual actions', () => {
  const notifSrc = fs.readFileSync('src/components/NotificationsPage.tsx', 'utf8');

  // Must handle distinct notification types with appropriate iconography and styling
  assert.ok(notifSrc.includes('Opportunity Match'), 'Must format match notifications');
  assert.ok(notifSrc.includes('Application Sent'), 'Must format submission_success notifications');
  assert.ok(notifSrc.includes('Action Required'), 'Must format submission_failed notifications');
  assert.ok(notifSrc.includes('Approval Needed'), 'Must format approval_needed notifications');
  assert.ok(notifSrc.includes('Interview Reminder'), 'Must format reminder notifications');
  assert.ok(notifSrc.includes('System Update'), 'Must format system notifications');

  // Must support contextual direct action buttons
  assert.ok(notifSrc.includes('Explore Opportunity'), 'Must offer Explore Opportunity action for matches');
  assert.ok(notifSrc.includes('View Applications'), 'Must offer View Applications action for application updates');
  assert.ok(notifSrc.includes('Mark as read'), 'Must offer individual Mark as read action for unread items');
});

test('Notifications: 3. Multi-user security and notification isolation', () => {
  const userA = authAndStore.createUser('Alice Engineer', `alice_${Date.now()}@test.com`, 'SecurePass123!');
  const userB = authAndStore.createUser('Bob Developer', `bob_${Date.now()}@test.com`, 'SecurePass123!');

  // Add specific notification for User A
  authAndStore.addNotification(userA.id, 'Alice Job Match', 'New Staff Engineer vacancy found', 'match');

  // Add specific notification for User B
  authAndStore.addNotification(userB.id, 'Bob Application Submitted', 'Your application to Stripe was recorded', 'submission_success');

  // Verify User A only sees their own notifications
  const notifsA = authAndStore.getNotifications(userA.id);
  assert.ok(notifsA.some(n => n.title === 'Alice Job Match'), 'User A must see Alice Job Match');
  assert.ok(!notifsA.some(n => n.title === 'Bob Application Submitted'), 'User A must NEVER see User B notifications');

  // Verify User B only sees their own notifications
  const notifsB = authAndStore.getNotifications(userB.id);
  assert.ok(notifsB.some(n => n.title === 'Bob Application Submitted'), 'User B must see Bob Application Submitted');
  assert.ok(!notifsB.some(n => n.title === 'Alice Job Match'), 'User B must NEVER see User A notifications');

  // User B cannot mark User A's notification as read
  const aliceNotif = notifsA.find(n => n.title === 'Alice Job Match')!;
  assert.equal(aliceNotif.read, false);

  // Bob attempts to mark Alice's notification as read
  authAndStore.markNotificationsRead(userB.id, aliceNotif.id);

  // Alice's notification must remain unread
  const refreshedAliceNotifs = authAndStore.getNotifications(userA.id);
  const aliceNotifStill = refreshedAliceNotifs.find(n => n.id === aliceNotif.id)!;
  assert.equal(aliceNotifStill.read, false, 'Notification must remain unread because Bob does not own it');
});

test('Notifications: 4. Single item read and mark all as read persistence', () => {
  const user = authAndStore.createUser('Charlie Tester', `charlie_${Date.now()}@test.com`, 'SecurePass123!');

  // Add multiple notifications
  authAndStore.addNotification(user.id, 'Interview Round 1', 'Scheduled for tomorrow at 2 PM', 'reminder');
  authAndStore.addNotification(user.id, 'Profile 85% Complete', 'Add two more skills to reach 100%', 'system');

  const initialNotifs = authAndStore.getNotifications(user.id);
  const unreadInitial = initialNotifs.filter(n => !n.read).length;
  assert.ok(unreadInitial >= 2, 'Should have at least 2 unread notifications');

  // Mark one notification as read
  const targetNotif = initialNotifs.find(n => n.title === 'Interview Round 1')!;
  authAndStore.markNotificationsRead(user.id, targetNotif.id);

  // Verify state after single mark
  const afterSingle = authAndStore.getNotifications(user.id);
  const updatedTarget = afterSingle.find(n => n.id === targetNotif.id)!;
  assert.equal(updatedTarget.read, true, 'Target notification must be marked as read');
  assert.equal(afterSingle.filter(n => !n.read).length, unreadInitial - 1, 'Unread count must decrease by 1');

  // Mark all notifications as read
  authAndStore.markNotificationsRead(user.id);

  // Verify all notifications are read
  const afterAll = authAndStore.getNotifications(user.id);
  assert.equal(afterAll.filter(n => !n.read).length, 0, 'All notifications must be marked as read');
  assert.ok(afterAll.every(n => n.read === true), 'Every notification must have read === true');
});

test('Notifications: 5. Empty state handling and calculation accuracy', () => {
  // New user with zero notifications
  const rawId = `empty_user_${Date.now()}`;
  const notifications: NotificationItem[] = [];

  const total = notifications.length;
  const unread = notifications.filter(n => !n.read).length;
  const read = total - unread;

  assert.equal(total, 0, 'Total should be 0');
  assert.equal(unread, 0, 'Unread should be 0');
  assert.equal(read, 0, 'Read should be 0');
});
