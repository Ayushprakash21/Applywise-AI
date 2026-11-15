// tools/validate_carousel_redesign.cjs
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUTPUT_DIR = path.resolve('C:/Users/Ayush/.gemini/antigravity/brain/a07b0288-92a2-43e6-812b-95ae60a52c22/carousel_redesign_screenshots');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function run() {
  console.log('Launching browser for Carousel Redesign Verification...');
  const browser = await chromium.launch({ headless: true });

  const viewports = [
    { name: '1920_ultrawide_dark', width: 1920, height: 1080, isMobile: false },
    { name: '1440_desktop_dark', width: 1440, height: 900, isMobile: false },
    { name: '390_mobile_dark', width: 390, height: 844, isMobile: true },
  ];

  for (const vp of viewports) {
    console.log(`\nTesting viewport: ${vp.name} (${vp.width}x${vp.height})...`);
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      colorScheme: 'dark',
      isMobile: vp.isMobile,
      hasTouch: vp.isMobile,
    });

    const page = await context.newPage();
    await page.addInitScript(() => {
      localStorage.setItem('applyvise_black_appearance', 'dark');
      localStorage.setItem('applyvise_theme', 'dark');
      localStorage.setItem('theme', 'dark');
    });

    await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);

    // Scroll directly to the opportunity ticker
    const tickerMetrics = await page.evaluate(() => {
      const track = document.querySelector('.opportunity-ticker-track');
      if (!track) return null;

      track.scrollIntoView({ behavior: 'instant', block: 'center' });
      const firstCard = track.querySelector('[role="button"]');
      if (!firstCard) return null;

      const cardRect = firstCard.getBoundingClientRect();
      // Locate the CompanyLogo outer box (which has w-10 h-10)
      const logoBox = firstCard.querySelector('[class*="w-10"], [class*="w-9"], [class*="w-8"]') || firstCard.firstElementChild;
      const logoRect = logoBox ? logoBox.getBoundingClientRect() : null;

      const titleEl = firstCard.querySelector('span.font-bold, [class*="text-[15"], [class*="text-[16"]');
      const titleStyle = titleEl ? window.getComputedStyle(titleEl) : null;

      const compEl = firstCard.querySelector('span.font-semibold, [class*="text-[12"], [class*="text-[13"]');
      const compStyle = compEl ? window.getComputedStyle(compEl) : null;

      const recencyEl = firstCard.querySelector('span.font-mono');
      const recencyStyle = recencyEl ? window.getComputedStyle(recencyEl) : null;

      const trackStyle = window.getComputedStyle(track);

      return {
        cardWidth: Math.round(cardRect.width),
        cardHeight: Math.round(cardRect.height),
        logoWidth: logoRect ? Math.round(logoRect.width) : null,
        logoHeight: logoRect ? Math.round(logoRect.height) : null,
        titleFontSize: titleStyle ? titleStyle.fontSize : null,
        titleFontWeight: titleStyle ? titleStyle.fontWeight : null,
        companyFontSize: compStyle ? compStyle.fontSize : null,
        recencyFontSize: recencyStyle ? recencyStyle.fontSize : null,
        animationDuration: trackStyle.animationDuration,
        animationPlayState: trackStyle.animationPlayState,
      };
    });

    console.log(`Measured metrics at ${vp.width}px:`, JSON.stringify(tickerMetrics, null, 2));

    await page.waitForTimeout(500);
    const shotPath = path.join(OUTPUT_DIR, `${vp.name}.png`);
    await page.screenshot({ path: shotPath });
    console.log(`Saved screenshot: ${shotPath}`);

    // Test hover pause on 1440
    if (vp.width === 1440) {
      console.log('Testing hover pause on 1440px desktop...');
      const containerBox = await page.evaluate(() => {
        const c = document.querySelector('[aria-label="Live Career Opportunities Ticker"]');
        if (!c) return null;
        const r = c.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      });

      if (containerBox) {
        await page.mouse.move(containerBox.x, containerBox.y);
        await page.waitForTimeout(500);

        const hoverState = await page.evaluate(() => {
          const track = document.querySelector('.opportunity-ticker-track');
          return track ? window.getComputedStyle(track).animationPlayState : null;
        });
        console.log('Hover animationPlayState:', hoverState);

        const hoverShot = path.join(OUTPUT_DIR, '1440_desktop_hover_paused.png');
        await page.screenshot({ path: hoverShot });
        console.log(`Saved hover paused screenshot: ${hoverShot}`);
      }
    }

    await context.close();
  }

  await browser.close();
  console.log('\nAll viewport validation completed successfully!');
}

run().catch((err) => {
  console.error('Validation error:', err);
  process.exit(1);
});
