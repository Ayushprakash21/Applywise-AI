import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const BASE_URL = 'http://localhost:3000';
const ARTIFACT_DIR = 'C:/Users/Ayush/.gemini/antigravity/brain/a07b0288-92a2-43e6-812b-95ae60a52c22';

async function run() {
  console.log('Starting Playwright capture for BLACK ELITE Luxury Design System...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: 'dark',
  });
  const page = await context.newPage();

  // 1. Log in as allowlisted BLACK ELITE account: ayushprakash0021@gmail.com
  console.log('Logging in as allowlisted BLACK ELITE account: ayushprakash0021@gmail.com');
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', 'ayushprakash0021@gmail.com');
  await page.fill('input[type="password"]', 'Password123!');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);

  // 2. Dismiss onboarding modal if present, but capture it first
  try {
    const onboardingHeader = page.locator('text=Resume Intelligence Onboarding');
    if (await onboardingHeader.count() > 0 && await onboardingHeader.first().isVisible()) {
      console.log('Capturing Onboarding Modal...');
      await page.screenshot({ path: path.join(ARTIFACT_DIR, 'black_elite_onboarding_modal.png') });
      console.log('Saved: black_elite_onboarding_modal.png');
    }
    const skipBtn = page.locator('button:has-text("Skip for now")');
    if (await skipBtn.count() > 0 && await skipBtn.first().isVisible()) {
      await skipBtn.first().click({ force: true });
      await page.waitForTimeout(1000);
    }
  } catch (e) {
    console.log('Onboarding check note:', e.message);
  }

  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  // 3. Capture Career Desk (1440x900)
  console.log('Capturing Career Desk (1440x900)...');
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'black_elite_career_desk.png') });
  console.log('Saved: black_elite_career_desk.png');

  // 4. Capture 1920x1080 Viewport
  console.log('Capturing Desktop 1920x1080...');
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'black_elite_desktop_1920x1080.png') });
  console.log('Saved: black_elite_desktop_1920x1080.png');

  // 5. Capture 1366x768 Viewport
  console.log('Capturing Laptop 1366x768...');
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'black_elite_laptop_1366x768.png') });
  console.log('Saved: black_elite_laptop_1366x768.png');

  // Return to 1440x900 for section captures
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(500);

  // 6. Navigate to Opportunity Radar
  console.log('Navigating to Opportunity Radar...');
  const radarBtn = page.locator('aside button:has-text("Opportunity Radar")');
  if (await radarBtn.count() > 0) {
    await radarBtn.first().click({ force: true });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'black_elite_opportunity_radar.png') });
    console.log('Saved: black_elite_opportunity_radar.png');
  }

  // 7. Navigate to Career Profile & Facts
  console.log('Navigating to Career Profile & Facts...');
  const profileBtn = page.locator('aside button:has-text("Career Profile & Facts")');
  if (await profileBtn.count() > 0) {
    await profileBtn.first().click({ force: true });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'black_elite_profile_and_facts.png') });
    console.log('Saved: black_elite_profile_and_facts.png');
  }

  // 8. Navigate back to Career Desk before tablet and mobile view captures
  const deskBtn = page.locator('aside button:has-text("Career Desk")');
  if (await deskBtn.count() > 0) {
    await deskBtn.first().click({ force: true });
    await page.waitForTimeout(800);
  }

  // 9. Tablet 1024x768
  console.log('Capturing Tablet 1024x768...');
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'black_elite_tablet_1024x768.png') });
  console.log('Saved: black_elite_tablet_1024x768.png');

  // 10. Tablet Portrait 768x1024
  console.log('Capturing Tablet Portrait 768x1024...');
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'black_elite_tablet_768x1024.png') });
  console.log('Saved: black_elite_tablet_768x1024.png');

  // 11. Mobile Viewport (390x844)
  console.log('Capturing Mobile Viewport (390x844)...');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'black_elite_mobile_390x844.png') });
  console.log('Saved: black_elite_mobile_390x844.png');

  // 12. Mobile Viewport (360x800)
  console.log('Capturing Mobile Viewport (360x800)...');
  await page.setViewportSize({ width: 360, height: 800 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'black_elite_mobile_360x800.png') });
  console.log('Saved: black_elite_mobile_360x800.png');

  await browser.close();
  console.log('All BLACK ELITE screenshots captured successfully!');
}

run().catch(err => {
  console.error('Capture failed:', err);
  process.exit(1);
});
