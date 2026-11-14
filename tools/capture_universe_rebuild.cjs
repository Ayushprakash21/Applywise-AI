// tools/capture_universe_rebuild.cjs
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUTPUT_DIR = path.resolve('C:/Users/Ayush/.gemini/antigravity/brain/a07b0288-92a2-43e6-812b-95ae60a52c22/universe_rebuild_screenshots');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function run() {
  console.log('Launching browser for universe rebuild verification...');
  const browser = await chromium.launch({ headless: true });

  try {
    // 1. Desktop Light Mode (1440x900) - Warm ivory page background
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
    await pageLight.waitForTimeout(2000);

    // Scroll to #network (Career Opportunity Universe)
    await pageLight.evaluate(() => {
      const el = document.querySelector('#network') || document.querySelector('[data-testid="career-opportunity-universe"]');
      if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
      else window.scrollBy(0, 750);
    });
    await pageLight.waitForTimeout(1000);

    const shot1 = path.join(OUTPUT_DIR, '01_universe_desktop_light.png');
    await pageLight.screenshot({ path: shot1 });
    console.log('Saved:', shot1);

    // 2. Click "Accessible List View" button to verify list mode!
    console.log('Toggling to Accessible List View...');
    const listBtn = await pageLight.$('button:has-text("Accessible List View")');
    if (listBtn) {
      await listBtn.click();
      await pageLight.waitForTimeout(1000);
      const shot2 = path.join(OUTPUT_DIR, '02_universe_accessible_list_view.png');
      await pageLight.screenshot({ path: shot2 });
      console.log('Saved:', shot2);

      // Toggle back to Cards View
      const cardsBtn = await pageLight.$('button:has-text("Opportunity Cards View")');
      if (cardsBtn) await cardsBtn.click();
      await pageLight.waitForTimeout(800);
    }

    // 3. Desktop Dark Mode (1440x900)
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
    await pageDark.waitForTimeout(2000);

    await pageDark.evaluate(() => {
      const el = document.querySelector('#network') || document.querySelector('[data-testid="career-opportunity-universe"]');
      if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
      else window.scrollBy(0, 750);
    });
    await pageDark.waitForTimeout(1000);

    const shot3 = path.join(OUTPUT_DIR, '03_universe_desktop_dark.png');
    await pageDark.screenshot({ path: shot3 });
    console.log('Saved:', shot3);

    // 4. Mobile Viewport (390x844 - iPhone 14)
    const contextMobile = await browser.newContext({
      viewport: { width: 390, height: 844 },
      colorScheme: 'light',
      isMobile: true,
      hasTouch: true,
    });
    const pageMobile = await contextMobile.newPage();
    await pageMobile.addInitScript(() => {
      localStorage.setItem('applyvise_black_appearance', 'light');
      localStorage.setItem('applyvise_theme', 'light');
      localStorage.setItem('theme', 'light');
    });

    console.log('Navigating to http://localhost:3000 (Mobile)...');
    await pageMobile.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
    await pageMobile.waitForTimeout(2000);

    await pageMobile.evaluate(() => {
      const el = document.querySelector('#network') || document.querySelector('[data-testid="career-opportunity-universe"]');
      if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
      else window.scrollBy(0, 800);
    });
    await pageMobile.waitForTimeout(1000);

    const shot4 = path.join(OUTPUT_DIR, '04_universe_mobile_light.png');
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
