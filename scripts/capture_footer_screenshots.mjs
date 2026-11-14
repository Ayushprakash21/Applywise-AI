import { chromium } from 'playwright';
import path from 'path';

const BASE_URL = 'http://localhost:3000';
const ARTIFACT_DIR = 'C:/Users/Ayush/.gemini/antigravity/brain/a07b0288-92a2-43e6-812b-95ae60a52c22';

async function run() {
  console.log('Starting Playwright capture for Brand Positioning & Footer Redesign...');
  const browser = await chromium.launch({ headless: true });

  // 1. Landing Page Footer (Desktop)
  const desktopCtx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: 'dark',
  });
  const landingPage = await desktopCtx.newPage();
  console.log('Navigating to landing page...');
  await landingPage.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
  await landingPage.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await landingPage.waitForTimeout(1000);

  const landingFooter = landingPage.locator('footer').first();
  if (await landingFooter.count() > 0) {
    await landingFooter.screenshot({ path: path.join(ARTIFACT_DIR, 'footer_landing_desktop.png') });
    console.log('Saved: footer_landing_desktop.png');
  }

  // 2. Landing Page Footer (Mobile)
  const mobileCtx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
    colorScheme: 'dark',
  });
  const mobilePage = await mobileCtx.newPage();
  await mobilePage.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
  await mobilePage.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await mobilePage.waitForTimeout(1000);

  const mobileFooter = mobilePage.locator('footer').first();
  if (await mobileFooter.count() > 0) {
    await mobileFooter.screenshot({ path: path.join(ARTIFACT_DIR, 'footer_landing_mobile.png') });
    console.log('Saved: footer_landing_mobile.png');
  }

  // 3. About Page Footer
  const aboutPage = await desktopCtx.newPage();
  await aboutPage.goto(`${BASE_URL}/about`, { waitUntil: 'networkidle' });
  await aboutPage.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await aboutPage.waitForTimeout(1000);
  const aboutFooter = aboutPage.locator('footer').first();
  if (await aboutFooter.count() > 0) {
    await aboutFooter.screenshot({ path: path.join(ARTIFACT_DIR, 'footer_about_desktop.png') });
    console.log('Saved: footer_about_desktop.png');
  }

  // 4. Pricing Page Footer
  const pricingPage = await desktopCtx.newPage();
  await pricingPage.goto(`${BASE_URL}/pricing`, { waitUntil: 'networkidle' });
  await pricingPage.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await pricingPage.waitForTimeout(1000);
  const pricingFooter = pricingPage.locator('footer').first();
  if (await pricingFooter.count() > 0) {
    await pricingFooter.screenshot({ path: path.join(ARTIFACT_DIR, 'footer_pricing_desktop.png') });
    console.log('Saved: footer_pricing_desktop.png');
  }

  // 5. Authenticated Dashboard Footer (Desktop & Mobile)
  const authCtx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: 'dark',
  });
  const authPage = await authCtx.newPage();
  console.log('Logging in to capture dashboard footer...');
  await authPage.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  await authPage.fill('input[type="email"]', 'ayushprakash0021@gmail.com');
  await authPage.fill('input[type="password"]', 'Password123!');
  await authPage.click('button[type="submit"]');
  await authPage.waitForTimeout(3000);

  // Dismiss onboarding modal
  try {
    const skipBtn = authPage.locator('button:has-text("Skip for now")');
    if (await skipBtn.count() > 0) {
      await skipBtn.first().click({ force: true });
      await authPage.waitForTimeout(1000);
    }
  } catch (e) {
    console.log('Onboarding check note:', e.message);
  }
  await authPage.keyboard.press('Escape');
  await authPage.waitForTimeout(600);

  await authPage.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await authPage.waitForTimeout(1000);

  const dashFooter = authPage.locator('footer').last();
  if (await dashFooter.count() > 0) {
    await dashFooter.screenshot({ path: path.join(ARTIFACT_DIR, 'footer_dashboard_desktop_dark.png') });
    console.log('Saved: footer_dashboard_desktop_dark.png');
  }

  // Dashboard mobile view
  const dashMobilePage = await browser.newPage({
    viewport: { width: 390, height: 844 },
  });
  await dashMobilePage.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  await dashMobilePage.fill('input[type="email"]', 'ayushprakash0021@gmail.com');
  await dashMobilePage.fill('input[type="password"]', 'Password123!');
  await dashMobilePage.click('button[type="submit"]');
  await dashMobilePage.waitForTimeout(3000);
  try {
    const skipBtn = dashMobilePage.locator('button:has-text("Skip for now")');
    if (await skipBtn.count() > 0) {
      await skipBtn.first().click({ force: true });
      await dashMobilePage.waitForTimeout(1000);
    }
  } catch (e) {}
  await dashMobilePage.keyboard.press('Escape');
  await dashMobilePage.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await dashMobilePage.waitForTimeout(1000);

  const dashMobileFooter = dashMobilePage.locator('footer').last();
  if (await dashMobileFooter.count() > 0) {
    await dashMobileFooter.screenshot({ path: path.join(ARTIFACT_DIR, 'footer_dashboard_mobile_dark.png') });
    console.log('Saved: footer_dashboard_mobile_dark.png');
  }

  await browser.close();
  console.log('All footer screenshots captured successfully.');
}

run().catch(err => {
  console.error('Capture failed:', err);
  process.exit(1);
});
