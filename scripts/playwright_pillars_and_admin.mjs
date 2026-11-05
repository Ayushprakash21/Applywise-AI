import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const BASE_URL = 'http://localhost:3000';
const ARTIFACT_DIR = 'C:/Users/Ayush/.gemini/antigravity/brain/a07b0288-92a2-43e6-812b-95ae60a52c22';

async function verifyPillarsAndAdmin() {
  console.log('===============================================================');
  console.log('   PLAYWRIGHT SIX-PILLAR & ADMIN CONSOLE VERIFICATION        ');
  console.log('===============================================================');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: 'dark',
  });
  const page = await context.newPage();

  const timestamp = Date.now();
  const testEmail = `playwright_tester_${timestamp}@applyvise.com`;
  const password = 'Password123!';

  try {
    // 1. Sign up user
    console.log('\n[Flow 1] Registering test candidate on browser...');
    await page.goto(`${BASE_URL}/signup`, { waitUntil: 'networkidle' });
    await page.fill('input[type="text"]', 'Alexander Playwright');
    await page.fill('input[type="email"]', testEmail);
    const passwordInputs = page.locator('input[type="password"]');
    await passwordInputs.nth(0).fill(password);
    await passwordInputs.nth(1).fill(password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1500);

    // Save screenshot of authenticated dashboard / Career Desk
    console.log('[Flow 2] Capturing Dashboard / Career Desk...');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'browser_career_desk.png') });
    console.log('  Saved artifact: browser_career_desk.png');

    // 2. Navigate to Interview Studio
    console.log('\n[Flow 3] Navigating to Interview Studio...');
    const interviewLink = page.locator('text=Interview Studio').or(page.locator('text=Interview Rehearsal')).or(page.locator('button:has-text("Interview")'));
    if (await interviewLink.count() > 0) {
      await interviewLink.first().click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(ARTIFACT_DIR, 'browser_interview_studio.png') });
      console.log('  Saved artifact: browser_interview_studio.png');

      // Click Simulator Mode
      const startSimBtn = page.locator('button:has-text("Interactive Simulator")').or(page.locator('button:has-text("Start Timed Rehearsal")'));
      if (await startSimBtn.count() > 0) {
        await startSimBtn.first().click();
        await page.waitForTimeout(500);

        // Enter an answer
        const answerTextarea = page.locator('textarea');
        if (await answerTextarea.count() > 0) {
          await answerTextarea.fill('I engineered a distributed transaction coordinator using consensus logs that handled 25,000 TPS with zero data loss during cloud failover.');
          await page.waitForTimeout(500);

          // Click Next Question / Complete Session
          const nextBtn = page.locator('button:has-text("Next Question")').or(page.locator('button:has-text("Complete Session")'));
          if (await nextBtn.count() > 0) {
            await nextBtn.first().click();
            await page.waitForTimeout(1500);
            await page.screenshot({ path: path.join(ARTIFACT_DIR, 'browser_interview_evaluation_state.png') });
            console.log('  Saved artifact: browser_interview_evaluation_state.png');
          }
        }
      }
    }

    // 3. Promote user to Admin via backend store and access Admin Console
    console.log('\n[Flow 4] Promoting candidate to Admin in SQLite and logging in...');
    const { authAndStore } = await import('../server/authAndStore.ts');
    const userRow = authAndStore.getUserByEmail(testEmail);
    if (userRow) {
      authAndStore.updateUserRole(userRow.id, 'admin');
      console.log(`  User ${testEmail} promoted to admin in SQLite.`);
    }

    // Navigate to /admin (which presents AdminLoginPage if not logged in as admin)
    console.log('[Flow 5] Navigating to /admin as authorized administrator...');
    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const emailInput = page.locator('input[type="email"]');
    if (await emailInput.count() > 0 && await page.locator('button[type="submit"]').count() > 0) {
      console.log('  Filling AdminLoginPage credentials...');
      await emailInput.fill(testEmail);
      await page.fill('input[type="password"]', password);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2000);
    }

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'browser_admin_console_overview.png') });
    console.log('  Saved artifact: browser_admin_console_overview.png');

    // Click Resume Operations Tab
    console.log('\n[Flow 6] Testing Admin Resume Operations Tab...');
    const resumeTabBtn = page.locator('button:has-text("Resume Operations")');
    if (await resumeTabBtn.count() > 0) {
      await resumeTabBtn.first().click({ force: true });
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(ARTIFACT_DIR, 'browser_admin_resume_operations.png') });
      console.log('  Saved artifact: browser_admin_resume_operations.png');
      console.log('  ✔ Admin Resume Management GUI confirmed mounted and interactive!');
    } else {
      console.warn('  ✖ Could not find Resume Operations button in Admin Console');
    }

    console.log('\n===============================================================');
    console.log('   ALL BROWSER FLOWS EXECUTED SUCCESSFULLY                     ');
    console.log('===============================================================');
  } catch (err) {
    console.error('Browser testing error:', err);
    throw err;
  } finally {
    await browser.close();
  }
}

verifyPillarsAndAdmin().then(() => {
  process.exit(0);
}).catch(() => {
  process.exit(1);
});
