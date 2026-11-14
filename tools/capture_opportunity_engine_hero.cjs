// tools/capture_opportunity_engine_hero.cjs
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUTPUT_DIR = path.resolve('C:/Users/Ayush/.gemini/antigravity/brain/a07b0288-92a2-43e6-812b-95ae60a52c22/opportunity_engine_hero_screenshots');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function run() {
  console.log('Launching browser for Opportunity Engine Hero verification...');
  const browser = await chromium.launch({ headless: true });

  try {
    // 1. Desktop Viewport (1440x900)
    const contextDesktop = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      colorScheme: 'dark',
    });
    const page = await contextDesktop.newPage();

    console.log('Navigating to http://localhost:3000 (Desktop)...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Scroll to the Opportunity Engine Hero section
    await page.evaluate(() => {
      const el = document.querySelector('.oe-hero');
      if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
    });
    await page.waitForTimeout(1000);

    const shot1 = path.join(OUTPUT_DIR, '01_opportunity_engine_desktop.png');
    await page.screenshot({ path: shot1 });
    console.log('Saved:', shot1);

    // 2. Click "Explore opportunities" to verify it scrolls to the Jobs Board!
    console.log('Testing "Explore opportunities" CTA click...');
    const exploreBtn = await page.$('[data-testid="oe-explore-jobs-btn"]');
    if (exploreBtn) {
      await exploreBtn.click();
      await page.waitForTimeout(1200);
      const shot2 = path.join(OUTPUT_DIR, '02_opportunity_engine_explore_jobs_nav.png');
      await page.screenshot({ path: shot2 });
      console.log('Saved:', shot2);

      // Scroll back up to hero
      await page.evaluate(() => {
        const el = document.querySelector('.oe-hero');
        if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
      });
      await page.waitForTimeout(800);
    }

    // 3. Mobile Viewport (390x844 - iPhone 14)
    const contextMobile = await browser.newContext({
      viewport: { width: 390, height: 844 },
      colorScheme: 'dark',
      isMobile: true,
      hasTouch: true,
    });
    const pageMobile = await contextMobile.newPage();
    console.log('Navigating to http://localhost:3000 (Mobile)...');
    await pageMobile.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
    await pageMobile.waitForTimeout(2000);

    await pageMobile.evaluate(() => {
      const el = document.querySelector('.oe-hero');
      if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
    });
    await pageMobile.waitForTimeout(1000);

    const shot3 = path.join(OUTPUT_DIR, '03_opportunity_engine_mobile.png');
    await pageMobile.screenshot({ path: shot3 });
    console.log('Saved:', shot3);

    console.log('All Opportunity Engine Hero verification screenshots captured!');
  } finally {
    await browser.close();
  }
}

run().catch(err => {
  console.error('Screenshot error:', err);
  process.exit(1);
});
