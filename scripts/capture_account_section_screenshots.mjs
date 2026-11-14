import { chromium } from 'playwright';
import path from 'path';

const BASE_URL = 'http://localhost:3000';
const ARTIFACT_DIR = 'C:/Users/Ayush/.gemini/antigravity/brain/a07b0288-92a2-43e6-812b-95ae60a52c22';

async function run() {
  console.log('Starting Playwright capture for Header Account Section Redesign...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: 'dark',
  });
  const page = await context.newPage();

  // 1. Log in as allowlisted BLACK ELITE user
  console.log('Logging in...');
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', 'ayushprakash0021@gmail.com');
  await page.fill('input[type="password"]', 'Password123!');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);

  // Dismiss onboarding modal if open
  try {
    const skipBtn = page.locator('button:has-text("Skip for now")');
    if (await skipBtn.count() > 0) {
      await skipBtn.first().click({ force: true });
      await page.waitForTimeout(1000);
    }
  } catch (e) {
    console.log('Onboarding check note:', e.message);
  }
  await page.keyboard.press('Escape');
  await page.waitForTimeout(600);

  // 2. Capture Header Close-Up (Top-Right Account Group)
  console.log('Capturing Header Top-Right Account Group (Idle)...');
  const rightGroup = page.locator('header .shrink-0.flex.items-center, header div.flex.items-center.gap-3').last();
  await rightGroup.screenshot({ path: path.join(ARTIFACT_DIR, 'account_section_after_closeup.png') });
  console.log('Saved: account_section_after_closeup.png');

  // Full header capture
  const fullHeader = page.locator('header').first();
  await fullHeader.screenshot({ path: path.join(ARTIFACT_DIR, 'account_section_after_full_header.png') });
  console.log('Saved: account_section_after_full_header.png');

  // 3. Open Account Profile Dropdown
  console.log('Opening Account Profile Dropdown...');
  const profileButton = page.locator('#user-profile-menu-button');
  await profileButton.click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'account_section_after_profile_dropdown.png') });
  console.log('Saved: account_section_after_profile_dropdown.png');

  // Dismiss profile menu with Escape
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);

  // 4. Open Notification Panel
  console.log('Opening Notifications Dropdown...');
  const notifButton = page.locator('header button[aria-label="Notifications"]');
  await notifButton.click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'account_section_after_notifications.png') });
  console.log('Saved: account_section_after_notifications.png');

  // 5. Mobile Viewport (375x667)
  console.log('Setting Mobile Viewport...');
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 375, height: 667 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'account_section_after_mobile.png') });
  console.log('Saved: account_section_after_mobile.png');

  await browser.close();
  console.log('All screenshots captured successfully.');
}

run().catch(err => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
