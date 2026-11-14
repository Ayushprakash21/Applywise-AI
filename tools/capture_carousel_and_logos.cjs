// tools/capture_carousel_and_logos.cjs
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUTPUT_DIR = path.resolve('C:/Users/Ayush/.gemini/antigravity/brain/a07b0288-92a2-43e6-812b-95ae60a52c22/homepage_carousel_and_logo_screenshots');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function run() {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });

  try {
    // 1. Desktop Dark Mode (1440x900)
    const contextDark = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      colorScheme: 'dark',
    });
    const pageDark = await contextDark.newPage();
    await pageDark.addInitScript(() => {
      localStorage.setItem('applyvise_black_appearance', 'dark');
      localStorage.setItem('applyvise_theme', 'dark');
      localStorage.setItem('theme', 'dark');
    });

    console.log('Navigating to http://localhost:3000 (Dark Mode)...');
    await pageDark.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
    await pageDark.waitForTimeout(1500);

    // Scroll to position Opportunity Radar Carousel nicely in view
    await pageDark.evaluate(() => {
      const el = document.querySelector('.opportunity-ticker-track');
      if (el) el.scrollIntoView({ behavior: 'instant', block: 'center' });
      else window.scrollBy(0, 500);
    });
    await pageDark.waitForTimeout(500);

    const shot1 = path.join(OUTPUT_DIR, '01_desktop_hero_ticker_dark.png');
    await pageDark.screenshot({ path: shot1 });
    console.log('Saved:', shot1);

    // 2. Click a ticker card in Dark Mode to open JobDetailDrawer!
    console.log('Clicking ticker card via DOM click...');
    const clicked = await pageDark.evaluate(() => {
      const el = document.querySelector('.opportunity-ticker-track [role="button"]');
      if (el) {
        el.click();
        return true;
      }
      return false;
    });

    if (clicked) {
      await pageDark.waitForTimeout(1500);
      const shotDrawer = path.join(OUTPUT_DIR, '02_job_detail_drawer_verified_logo_dark.png');
      await pageDark.screenshot({ path: shotDrawer });
      console.log('Saved:', shotDrawer);

      // Close drawer (press Escape)
      await pageDark.keyboard.press('Escape');
      await pageDark.waitForTimeout(800);
    }

    // 3. Desktop Light Mode
    const contextLight = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      colorScheme: 'light',
    });
    const pageLight = await contextLight.newPage();
    await pageLight.addInitScript(() => {
      localStorage.setItem('applyvise_black_appearance', 'light');
      localStorage.setItem('applyvise_theme', 'light');
      localStorage.setItem('theme', 'light');
    });

    console.log('Navigating to http://localhost:3000 (Light Mode)...');
    await pageLight.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
    await pageLight.waitForTimeout(1500);

    await pageLight.evaluate(() => {
      const el = document.querySelector('.opportunity-ticker-track');
      if (el) el.scrollIntoView({ behavior: 'instant', block: 'center' });
      else window.scrollBy(0, 500);
    });
    await pageLight.waitForTimeout(500);

    const shot3 = path.join(OUTPUT_DIR, '03_desktop_hero_ticker_light.png');
    await pageLight.screenshot({ path: shot3 });
    console.log('Saved:', shot3);

    // 4. Mobile Dark Mode (390x844 - iPhone 14)
    const contextMobile = await browser.newContext({
      viewport: { width: 390, height: 844 },
      colorScheme: 'dark',
      isMobile: true,
      hasTouch: true,
    });
    const pageMobile = await contextMobile.newPage();
    await pageMobile.addInitScript(() => {
      localStorage.setItem('applyvise_black_appearance', 'dark');
      localStorage.setItem('applyvise_theme', 'dark');
      localStorage.setItem('theme', 'dark');
    });

    console.log('Navigating to http://localhost:3000 (Mobile Dark)...');
    await pageMobile.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
    await pageMobile.waitForTimeout(1500);

    await pageMobile.evaluate(() => {
      const el = document.querySelector('.opportunity-ticker-track');
      if (el) el.scrollIntoView({ behavior: 'instant', block: 'center' });
      else window.scrollBy(0, 550);
    });
    await pageMobile.waitForTimeout(500);

    const shot4 = path.join(OUTPUT_DIR, '04_mobile_hero_ticker_dark.png');
    await pageMobile.screenshot({ path: shot4 });
    console.log('Saved:', shot4);

    console.log('All verification screenshots captured successfully!');
  } finally {
    await browser.close();
  }
}

run().catch(err => {
  console.error('Screenshot error:', err);
  process.exit(1);
});
