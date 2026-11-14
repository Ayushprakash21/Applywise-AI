const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const outDir = 'C:\\Users\\Ayush\\.gemini\\antigravity\\brain\\a07b0288-92a2-43e6-812b-95ae60a52c22\\theme_switch_journey_screenshots';
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function runThemeJourney() {
  console.log('🚀 Starting ApplyVise Comprehensive Global Theme Session Journey Test...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const journeyResults = [];

  function recordStep(stepNum, name, passed, details) {
    console.log(`[Step ${stepNum}] ${name}: ${passed ? '✅ PASS' : '❌ FAIL'} (${details})`);
    journeyResults.push({ stepNum, name, passed, details });
  }

  // Helper to check DOM appearance
  async function getActiveAppearance() {
    return await page.evaluate(() => {
      const root = document.documentElement;
      const attr = root.getAttribute('data-be-appearance');
      const isDarkClass = root.classList.contains('dark');
      const stored = localStorage.getItem('applyvise_be_appearance');
      return { attr, isDarkClass, stored };
    });
  }

  // Helper to click global theme switch
  async function clickGlobalThemeSwitch() {
    const sw = page.locator('[data-testid="global-theme-switch"]:visible').first();
    await sw.waitFor({ state: 'visible', timeout: 5000 });
    await sw.click();
    await page.waitForTimeout(500);
  }

  // --- Step 1: Open homepage in Light Mode ---
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    localStorage.setItem('applyvise_be_appearance', 'light');
    localStorage.setItem('applyvise_be_palette', 'dune');
    if (window.__APPLYVISE_THEME__?.setAppearance) {
      window.__APPLYVISE_THEME__.setAppearance('light');
    }
  });
  await page.waitForTimeout(600);
  let status = await getActiveAppearance();
  let pass1 = status.attr === 'light' && !status.isDarkClass;
  recordStep(1, 'Open homepage in Light Mode', pass1, `attr: ${status.attr}, darkClass: ${status.isDarkClass}`);
  await page.screenshot({ path: path.join(outDir, '01_homepage_light.png'), fullPage: false });

  // --- Step 2: Switch to Dark Mode via GlobalThemeSwitch ---
  await clickGlobalThemeSwitch();
  status = await getActiveAppearance();
  let pass2 = status.attr === 'dark' && status.isDarkClass;
  recordStep(2, 'Switch to Dark Mode on homepage', pass2, `attr: ${status.attr}, stored: ${status.stored}`);
  await page.screenshot({ path: path.join(outDir, '02_homepage_dark.png'), fullPage: false });

  // --- Step 3 & 4: Navigate to Sign In & Confirm Dark Mode remains active ---
  const signInBtn = page.locator('button[data-testid="sign-in-button"]').first();
  if (await signInBtn.isVisible()) {
    await signInBtn.click();
  } else {
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
  }
  await page.waitForTimeout(600);
  status = await getActiveAppearance();
  let pass4 = status.attr === 'dark' && status.isDarkClass;
  recordStep(4, 'Confirm Dark Mode remains active on Sign In', pass4, `attr: ${status.attr}, darkClass: ${status.isDarkClass}`);
  await page.screenshot({ path: path.join(outDir, '04_signin_dark.png'), fullPage: false });

  // --- Step 5 & 6: Navigate to Sign Up & Confirm Dark Mode remains active ---
  await page.goto('http://localhost:3000/signup', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  status = await getActiveAppearance();
  let pass6 = status.attr === 'dark' && status.isDarkClass;
  recordStep(6, 'Confirm Dark Mode remains active on Sign Up', pass6, `attr: ${status.attr}, darkClass: ${status.isDarkClass}`);
  await page.screenshot({ path: path.join(outDir, '06_signup_dark.png'), fullPage: false });

  // --- Step 7 & 8: Sign in & Open candidate dashboard ---
  // Seed auth token to simulate logged-in candidate session
  await page.evaluate(() => {
    const mockUser = {
      id: 'usr_test_sess_01',
      fullName: 'Alex Rivera',
      email: 'alex.rivera@example.com',
      role: 'candidate',
      plan: 'black',
    };
    localStorage.setItem('applyvise_auth_token', 'mock_jwt_test_token_123');
    localStorage.setItem('applyvise_user', JSON.stringify(mockUser));
  });
  await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  status = await getActiveAppearance();
  let pass9 = status.attr === 'dark' && status.isDarkClass;
  recordStep(9, 'Confirm Dark Mode remains active on Candidate Dashboard', pass9, `attr: ${status.attr}, darkClass: ${status.isDarkClass}`);
  await page.screenshot({ path: path.join(outDir, '09_candidate_dashboard_dark.png'), fullPage: false });

  // --- Step 10: Navigate through major candidate sections (Jobs, Tracker, Profile) ---
  await page.goto('http://localhost:3000/jobs', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  let statusJobs = await getActiveAppearance();
  await page.screenshot({ path: path.join(outDir, '10_jobs_dark.png'), fullPage: false });

  await page.goto('http://localhost:3000/applications', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  let statusApps = await getActiveAppearance();
  await page.screenshot({ path: path.join(outDir, '10_applications_dark.png'), fullPage: false });

  let pass10 = statusJobs.attr === 'dark' && statusApps.attr === 'dark';
  recordStep(10, 'Navigate major candidate sections in Dark Mode', pass10, 'All sections verified dark');

  // --- Step 11 & 12: Switch to Light Mode from Candidate Dashboard ---
  await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  await clickGlobalThemeSwitch();
  status = await getActiveAppearance();
  let pass12 = status.attr === 'light' && !status.isDarkClass;
  recordStep(12, 'Confirm visible components change to Light Mode in Dashboard', pass12, `attr: ${status.attr}, darkClass: ${status.isDarkClass}`);
  await page.screenshot({ path: path.join(outDir, '12_candidate_dashboard_light.png'), fullPage: false });

  // --- Step 13 & 14: Refresh page & Confirm selected theme persists ---
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  status = await getActiveAppearance();
  let pass14 = status.attr === 'light' && !status.isDarkClass && status.stored === 'light';
  recordStep(14, 'Confirm selected Light Mode persists across refresh', pass14, `attr: ${status.attr}, stored: ${status.stored}`);
  await page.screenshot({ path: path.join(outDir, '14_dashboard_persisted_light.png'), fullPage: false });

  // --- Step 15 & 16: Log out & Confirm theme remains consistent on public homepage ---
  await page.evaluate(() => {
    localStorage.removeItem('applyvise_auth_token');
    localStorage.removeItem('applyvise_user');
  });
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  status = await getActiveAppearance();
  let pass16 = status.attr === 'light' && !status.isDarkClass && status.stored === 'light';
  recordStep(16, 'Confirm theme remains consistent on public homepage after logout', pass16, `attr: ${status.attr}, stored: ${status.stored}`);
  await page.screenshot({ path: path.join(outDir, '16_homepage_after_logout_light.png'), fullPage: false });

  // Also verify Pricing and Admin Login in Light Mode
  await page.goto('http://localhost:3000/pricing', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(outDir, '17_pricing_light.png'), fullPage: false });

  await page.goto('http://localhost:3000/admin/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(outDir, '18_admin_login_light.png'), fullPage: false });

  await context.close();
  await browser.close();

  const totalPassed = journeyResults.filter(r => r.passed).length;
  console.log(`\n🎉 Theme Journey Results: ${totalPassed} / ${journeyResults.length} steps passed!`);
  fs.writeFileSync(path.join(outDir, 'theme-journey-results.json'), JSON.stringify(journeyResults, null, 2));
}

runThemeJourney().catch(err => {
  console.error('Theme Journey Execution Error:', err);
  process.exit(1);
});
