import { chromium } from 'playwright';
import path from 'path';

const BASE_URL = 'http://localhost:3000';
const ARTIFACT_DIR = 'C:/Users/Ayush/.gemini/antigravity/brain/a07b0288-92a2-43e6-812b-95ae60a52c22';

async function run() {
  console.log('Starting Playwright capture for Global Search Bar Redesign...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: 'dark',
  });
  const page = await context.newPage();

  // 1. Log in
  console.log('Logging in as ayushprakash0021@gmail.com...');
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', 'ayushprakash0021@gmail.com');
  await page.fill('input[type="password"]', 'Password123!');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);

  // Dismiss onboarding modal if open
  try {
    const skipBtn = page.locator('button:has-text("Skip for now")');
    if (await skipBtn.count() > 0) {
      console.log('Clicking Skip for now on onboarding modal...');
      await skipBtn.first().click({ force: true });
      await page.waitForTimeout(1200);
    }
  } catch (e) {
    console.log('Onboarding check note:', e.message);
  }
  await page.keyboard.press('Escape');
  await page.waitForTimeout(800);

  // 2. Capture Header Search Bar (Idle)
  console.log('Capturing Desktop Header (Idle Search Bar)...');
  const header = page.locator('header').first();
  await header.screenshot({ path: path.join(ARTIFACT_DIR, 'search_bar_after_header_idle.png') });
  console.log('Saved: search_bar_after_header_idle.png');

  // Also capture close-up of search bar
  const searchBar = page.locator('header [role="search"]').first();
  await searchBar.screenshot({ path: path.join(ARTIFACT_DIR, 'search_bar_after_closeup_idle.png') });
  console.log('Saved: search_bar_after_closeup_idle.png');

  // Full page view
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'search_bar_after_full_page.png') });
  console.log('Saved: search_bar_after_full_page.png');

  // 3. Test Keyboard Shortcut (Ctrl+K)
  console.log('Testing Ctrl+K keyboard shortcut...');
  await page.keyboard.press('Control+k');
  await page.waitForTimeout(600);

  // Type a query in search bar to show autocomplete
  console.log('Typing query "Supply Chain"...');
  await page.keyboard.type('Supply');
  await page.waitForTimeout(600);

  // Capture focused autocomplete state
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'search_bar_after_autocomplete.png') });
  console.log('Saved: search_bar_after_autocomplete.png');

  // 4. Capture Admin Console Header
  console.log('Navigating to Admin Console...');
  await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const adminHeader = page.locator('header').first();
  await adminHeader.screenshot({ path: path.join(ARTIFACT_DIR, 'search_bar_admin_header.png') });
  console.log('Saved: search_bar_admin_header.png');

  // 5. Capture Mobile Responsive View (375x667)
  console.log('Setting Mobile Viewport...');
  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
  await page.setViewportSize({ width: 375, height: 667 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'search_bar_mobile_view.png') });
  console.log('Saved: search_bar_mobile_view.png');

  await browser.close();
  console.log('All screenshots captured successfully.');
}

run().catch(err => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
