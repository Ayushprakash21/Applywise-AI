import { chromium } from 'playwright';
import path from 'path';

const BASE_URL = 'http://localhost:3000';
const ARTIFACT_DIR = 'C:/Users/Ayush/.gemini/antigravity/brain/a07b0288-92a2-43e6-812b-95ae60a52c22';

async function run() {
  console.log('Starting Playwright capture for Admin Console and Notifications...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: 'dark',
  });
  const page = await context.newPage();

  // 1. Log in as allowlisted BLACK ELITE admin: ayushprakash0021@gmail.com
  console.log('Logging in as ayushprakash0021@gmail.com...');
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', 'ayushprakash0021@gmail.com');
  await page.fill('input[type="password"]', 'Password123!');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);

  // Dismiss onboarding if present
  try {
    const skipBtn = page.locator('button:has-text("Skip for now")');
    if (await skipBtn.count() > 0 && await skipBtn.first().isVisible()) {
      await skipBtn.first().click({ force: true });
      await page.waitForTimeout(1000);
    }
  } catch (e) {}

  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  // 2. Navigate to Notifications
  console.log('Navigating to Notifications...');
  const notifBtn = page.locator('aside button:has-text("Notifications")');
  if (await notifBtn.count() > 0) {
    await notifBtn.first().click({ force: true });
  } else {
    await page.goto(`${BASE_URL}/notifications`, { waitUntil: 'networkidle' });
  }
  await page.waitForTimeout(1500);
  console.log('Capturing Notifications Page...');
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'notifications_page_fixed.png') });
  console.log('Saved: notifications_page_fixed.png');

  // 3. Navigate to Admin Console
  console.log('Navigating to Admin Console...');
  await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  console.log('Capturing Admin Console...');
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'admin_console_fixed.png') });
  console.log('Saved: admin_console_fixed.png');

  await browser.close();
  console.log('Capture completed successfully!');
}

run().catch(err => {
  console.error('Capture failed:', err);
  process.exit(1);
});
