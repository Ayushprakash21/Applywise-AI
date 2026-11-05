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
  await page.waitForTimeout(2500);

  // 2. Dismiss onboarding modal if present
  try {
    const skipBtn = page.locator('button:has-text("Skip for now")');
    if (await skipBtn.count() > 0 && await skipBtn.first().isVisible()) {
      console.log('Capturing Onboarding Modal...');
      await page.screenshot({ path: path.join(ARTIFACT_DIR, 'black_elite_onboarding_modal.png') });
      console.log('Saved: black_elite_onboarding_modal.png');
      await skipBtn.first().click({ force: true });
      await page.waitForTimeout(800);
    }
  } catch (e) {
    console.log('Onboarding check note:', e.message);
  }

  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  // 3. Capture Career Desk
  console.log('Capturing Career Desk...');
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'black_elite_career_desk.png') });
  console.log('Saved: black_elite_career_desk.png');

  // 4. Navigate to Opportunity Radar
  console.log('Navigating to Opportunity Radar...');
  const radarBtn = page.locator('aside button:has-text("Opportunity Radar")');
  if (await radarBtn.count() > 0) {
    await radarBtn.first().click({ force: true });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'black_elite_opportunity_radar.png') });
    console.log('Saved: black_elite_opportunity_radar.png');
  }

  // 5. Navigate to Career Profile & Facts
  console.log('Navigating to Career Profile & Facts...');
  const profileBtn = page.locator('aside button:has-text("Career Profile & Facts")');
  if (await profileBtn.count() > 0) {
    await profileBtn.first().click({ force: true });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'black_elite_profile_and_facts.png') });
    console.log('Saved: black_elite_profile_and_facts.png');
  }

  // 6. Navigate to Interview Studio
  console.log('Navigating to Interview Studio...');
  const interviewBtn = page.locator('aside button:has-text("Interview Studio")');
  if (await interviewBtn.count() > 0) {
    await interviewBtn.first().click({ force: true });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'black_elite_interview_studio.png') });
    console.log('Saved: black_elite_interview_studio.png');
  }

  // 7. Navigate to Recruiter Review
  console.log('Navigating to Recruiter Review...');
  const recruiterBtn = page.locator('aside button:has-text("Recruiter Review")');
  if (await recruiterBtn.count() > 0) {
    await recruiterBtn.first().click({ force: true });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'black_elite_recruiter_review.png') });
    console.log('Saved: black_elite_recruiter_review.png');
  }

  // 8. Navigate to Career Atlas
  console.log('Navigating to Career Atlas...');
  const atlasBtn = page.locator('aside button:has-text("Career Atlas")');
  if (await atlasBtn.count() > 0) {
    await atlasBtn.first().click({ force: true });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'black_elite_career_atlas.png') });
    console.log('Saved: black_elite_career_atlas.png');
  }

  // 9. Navigate back to Career Desk before mobile view
  const deskBtn = page.locator('aside button:has-text("Career Desk")');
  if (await deskBtn.count() > 0) {
    await deskBtn.first().click({ force: true });
    await page.waitForTimeout(800);
  }

  // 10. Capture Mobile Viewport (390x844)
  console.log('Capturing Mobile Viewport (390x844)...');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'black_elite_mobile_390x844.png') });
  console.log('Saved: black_elite_mobile_390x844.png');

  await browser.close();
  console.log('All BLACK ELITE screenshots captured successfully!');
}

run().catch(err => {
  console.error('Capture failed:', err);
  process.exit(1);
});
