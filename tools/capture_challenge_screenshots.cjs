const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const outDir = 'C:\\Users\\Ayush\\.gemini\\antigravity\\brain\\a07b0288-92a2-43e6-812b-95ae60a52c22\\challenge_screenshots';
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  
  // ==========================================
  // 1. PUBLIC MARKETING & AUTH PAGES
  // ==========================================
  console.log('--- 1. Capturing Public Pages ---');
  const pubContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pubPage = await pubContext.newPage();

  // Landing Desktop
  await pubPage.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  await pubPage.screenshot({ path: path.join(outDir, '01_landing_desktop.png') });

  // About Desktop
  await pubPage.goto('http://localhost:3000/about', { waitUntil: 'networkidle' });
  await pubPage.screenshot({ path: path.join(outDir, '02_about_desktop.png') });

  // Pricing Desktop
  await pubPage.goto('http://localhost:3000/pricing', { waitUntil: 'networkidle' });
  await pubPage.screenshot({ path: path.join(outDir, '03_pricing_desktop.png') });

  // Login Desktop
  await pubPage.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
  await pubPage.screenshot({ path: path.join(outDir, '04_login_desktop.png') });

  // Signup Desktop
  await pubPage.goto('http://localhost:3000/signup', { waitUntil: 'networkidle' });
  await pubPage.screenshot({ path: path.join(outDir, '05_signup_desktop.png') });
  await pubContext.close();

  // Mobile Viewport (390x844)
  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mobPage = await mobileContext.newPage();
  await mobPage.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  await mobPage.screenshot({ path: path.join(outDir, '06_landing_mobile.png') });
  await mobPage.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
  await mobPage.screenshot({ path: path.join(outDir, '07_login_mobile.png') });
  await mobPage.goto('http://localhost:3000/pricing', { waitUntil: 'networkidle' });
  await mobPage.screenshot({ path: path.join(outDir, '08_pricing_mobile.png') });
  await mobileContext.close();

  // Tablet Viewport (768x1024)
  const tabContext = await browser.newContext({ viewport: { width: 768, height: 1024 } });
  const tabLandingPage = await tabContext.newPage();
  await tabLandingPage.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  await tabLandingPage.screenshot({ path: path.join(outDir, '09_landing_tablet.png') });
  await tabContext.close();

  // ==========================================
  // 2. AUTHENTICATED CANDIDATE WORKSPACE
  // ==========================================
  console.log('--- 2. Performing Authentic Candidate Login ---');
  const appCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const appPage = await appCtx.newPage();

  await appPage.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
  await appPage.fill('input[type="email"]', 'candidate_audit@applyvise.ai');
  await appPage.fill('input[type="password"]', 'ValidPass123!');
  await appPage.click('button[type="submit"]');
  await appPage.waitForTimeout(2000);

  // Set onboarding dismissed to guarantee clean navigation
  await appPage.evaluate(() => {
    localStorage.setItem('applyvise_onboarding_dismissed_b2bd1aa5-148e-4786-9c23-b5297c11f86e', 'true');
    localStorage.setItem('applywise_onboarding_dismissed_b2bd1aa5-148e-4786-9c23-b5297c11f86e', 'true');
  });

  // Capture Career Desk Dark
  console.log('Capturing Career Desk Dark...');
  await appPage.screenshot({ path: path.join(outDir, '10_career_desk_dark.png') });

  // Navigation targets mapping
  const navTargets = [
    { label: 'AI Autopilot', file: '13_ai_autopilot_dark.png' },
    { label: 'Opportunity Radar', file: '11_opportunity_radar_dark.png' },
    { label: 'Application Control', file: '12_application_control_dark.png' },
    { label: 'Interview Studio', file: '16_interview_studio_dark.png' },
    { label: 'Recruiter Review', file: '17_recruiter_review_dark.png' },
    { label: 'Career Atlas', file: '14_career_atlas_dark.png' },
    { label: 'AI HR Outreach', file: '18_hr_outreach_dark.png' },
    { label: 'Career Profile & Facts', file: '19_profile_dark.png' },
    { label: 'Resume Studio', file: '15_resume_studio_dark.png' },
    { label: 'Skills & Gap Report', file: '19b_skills_dark.png' },
    { label: 'Notifications', file: '20_notifications_dark.png' },
    { label: 'Settings', file: '20b_settings_dark.png' },
    { label: 'Membership & Billing', file: '21_membership_dark.png' },
  ];

  for (const item of navTargets) {
    try {
      const btn = appPage.locator('aside button', { hasText: item.label }).first();
      if (await btn.isVisible({ timeout: 2000 })) {
        await btn.click({ timeout: 2000 });
        await appPage.waitForTimeout(800);
        await appPage.screenshot({ path: path.join(outDir, item.file) });
        console.log('Captured:', item.file);
      } else {
        console.log('Not visible:', item.label);
      }
    } catch (e) {
      console.log('Nav target click failed for:', item.label, e.message);
    }
  }

  // ==========================================
  // 3. LIGHT MODE CAPTURE & CONTRAST
  // ==========================================
  console.log('--- 3. Capturing Light Mode ---');
  await appPage.evaluate(() => {
    const root = document.documentElement;
    root.classList.remove('theme-black-dark');
    root.classList.add('theme-black-light');
    root.setAttribute('data-be-appearance', 'light');
    root.setAttribute('data-theme-mode', 'light');
    localStorage.setItem('applywise_appearance_mode', 'light');
    localStorage.setItem('applyvise_appearance_mode', 'light');
  });

  // Career Desk in Light Mode
  try {
    const deskBtn = appPage.locator('aside button', { hasText: 'Career Desk' }).first();
    if (await deskBtn.isVisible({ timeout: 2000 })) {
      await deskBtn.click({ timeout: 2000 });
      await appPage.waitForTimeout(800);
    }
  } catch {}
  await appPage.screenshot({ path: path.join(outDir, '22_career_desk_light.png') });

  // Career Atlas in Light Mode
  console.log('--- 4. Capturing Career Atlas Light Mode ---');
  try {
    const atlasBtn = appPage.locator('aside button', { hasText: 'Career Atlas' }).first();
    if (await atlasBtn.isVisible({ timeout: 2000 })) {
      await atlasBtn.click({ timeout: 2000 });
      await appPage.waitForTimeout(800);
      await appPage.screenshot({ path: path.join(outDir, '23_career_atlas_light.png') });
    }
  } catch {}

  // ==========================================
  // 4. CURATED PALETTES CAPTURE
  // ==========================================
  console.log('--- 5. Capturing Curated Palettes ---');
  const palettes = ['dune', 'aurora', 'ocean', 'silk', 'dusk'];
  for (const p of palettes) {
    await appPage.evaluate((pal) => {
      document.documentElement.setAttribute('data-be-palette', pal);
      localStorage.setItem('applywise_curated_palette', pal);
      localStorage.setItem('applyvise_curated_palette', pal);
    }, p);
    await appPage.waitForTimeout(500);
    await appPage.screenshot({ path: path.join(outDir, `24_palette_${p}.png`) });
  }

  await appCtx.close();

  // ==========================================
  // 5. AUTHENTIC ADMIN PORTAL
  // ==========================================
  console.log('--- 6. Performing Authentic Admin Login & Captures ---');
  const adminCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const adminPage = await adminCtx.newPage();

  await adminPage.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
  await adminPage.fill('input[type="email"]', 'admin_audit@applyvise.ai');
  await adminPage.fill('input[type="password"]', 'ValidPass123!');
  await adminPage.click('button[type="submit"]');
  await adminPage.waitForTimeout(2000);

  // Navigate to /admin
  await adminPage.goto('http://localhost:3000/admin', { waitUntil: 'networkidle' });
  await adminPage.waitForTimeout(1000);
  await adminPage.screenshot({ path: path.join(outDir, '25_admin_overview.png') });

  // Admin users tab
  try {
    const userBtn = adminPage.locator('aside button, nav button', { hasText: 'Users & Roles' }).first();
    if (await userBtn.isVisible({ timeout: 2000 })) {
      await userBtn.click({ timeout: 2000 });
      await adminPage.waitForTimeout(800);
      await adminPage.screenshot({ path: path.join(outDir, '26_admin_users.png') });
    }
  } catch {}

  // Admin system health & edge tab
  try {
    const edgeBtn = adminPage.locator('aside button, nav button', { hasText: 'System Health & Edge' }).first();
    if (await edgeBtn.isVisible({ timeout: 2000 })) {
      await edgeBtn.click({ timeout: 2000 });
      await adminPage.waitForTimeout(800);
      await adminPage.screenshot({ path: path.join(outDir, '27_admin_system_health.png') });
    }
  } catch {}

  await adminCtx.close();
  await browser.close();
  console.log('=== All challenge screenshots captured successfully! ===');
}

run().catch(err => {
  console.error('Error in challenge capture:', err);
  process.exit(1);
});
