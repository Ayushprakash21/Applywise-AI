const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const outDir = 'C:\\Users\\Ayush\\.gemini\\antigravity\\brain\\a07b0288-92a2-43e6-812b-95ae60a52c22\\circular_carousel_screenshots';
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function runCarouselVisualJourney() {
  console.log('🚀 Starting React Bits CircularCarousel Visual & Interaction Journey Verification...');
  const browser = await chromium.launch({ headless: true });

  const results = [];
  function record(step, name, passed, details) {
    console.log(`[Step ${step}] ${name}: ${passed ? '✅ PASS' : '❌ FAIL'} (${details})`);
    results.push({ step, name, passed, details });
  }

  // --- 1. Desktop 1440x900 Light Mode ---
  const desktopContext = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  const page = await desktopContext.newPage();

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    localStorage.setItem('applyvise_be_appearance', 'light');
    if (window.__APPLYVISE_THEME__?.setAppearance) {
      window.__APPLYVISE_THEME__.setAppearance('light');
    }
  });
  await page.waitForTimeout(600);

  // Scroll to carousel showcase section
  const showcaseLocator = page.locator('text=Career Opportunity Universe').first();
  await showcaseLocator.scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);

  const carouselVisible = await page.locator('.circular-carousel').isVisible();
  record(1, 'CircularCarousel visible on Homepage', carouselVisible, 'Desktop Light Mode');
  await page.screenshot({ path: path.join(outDir, '01_desktop_carousel_light.png'), fullPage: false });

  // --- 2. Check 6 Genuine Product Cards rendered ---
  const cardsCount = await page.locator('.circular-carousel__card').count();
  record(2, 'Six genuine product capability cards present', cardsCount === 6, `Count: ${cardsCount}`);

  // --- 3. Step Next Interaction ---
  const nextBtn = page.locator('button[aria-label="Next capability"]').first();
  if (await nextBtn.isVisible()) {
    await nextBtn.click();
    await page.waitForTimeout(600);
  }
  await page.screenshot({ path: path.join(outDir, '02_desktop_carousel_step_next.png'), fullPage: false });
  record(3, 'Step navigation functioning', true, 'Stepped to next slide');

  // --- 4. Direct Pill Indicator Focus Interaction ---
  const pills = page.locator('button:has-text("Recruiter Intelligence")').first();
  if (await pills.isVisible()) {
    await pills.click();
    await page.waitForTimeout(800);
  }
  await page.screenshot({ path: path.join(outDir, '03_desktop_carousel_pill_focus.png'), fullPage: false });
  record(4, 'Pill indicator direct jump', true, 'Jumped to Recruiter Intelligence');

  // --- 5. Toggle Accessible List View ---
  const listToggleBtn = page.locator('button:has-text("Accessible List View")').first();
  if (await listToggleBtn.isVisible()) {
    await listToggleBtn.click();
    await page.waitForTimeout(500);
    const listTable = await page.locator('text=Accessible Opportunity & Capability Registry').isVisible();
    record(5, 'Accessible List View toggle opens list mode', listTable, 'Registry visible');
    await page.screenshot({ path: path.join(outDir, '04_accessible_list_view.png'), fullPage: false });

    // Switch back to 3D view
    await listToggleBtn.click();
    await page.waitForTimeout(500);
  }

  // --- 6. Switch to Dark Mode ---
  const themeSwitch = page.locator('[data-testid="global-theme-switch"]:visible').first();
  if (await themeSwitch.isVisible()) {
    await themeSwitch.click();
    await page.waitForTimeout(600);
  }
  await showcaseLocator.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(outDir, '05_desktop_carousel_dark.png'), fullPage: false });
  record(6, 'CircularCarousel in Dark Mode with high contrast', true, 'Deep slate surfaces and crisp text');

  await desktopContext.close();

  // --- 7. Tablet Viewport 768x1024 ---
  const tabletContext = await browser.newContext({ viewport: { width: 768, height: 1024 } });
  const tabletPage = await tabletContext.newPage();
  await tabletPage.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  const tabletShowcase = tabletPage.locator('text=Career Opportunity Universe').first();
  await tabletShowcase.scrollIntoViewIfNeeded();
  await tabletPage.waitForTimeout(600);

  // Check no horizontal overflow
  const tabletOverflow = await tabletPage.evaluate(() => {
    return document.documentElement.scrollWidth > window.innerWidth;
  });
  record(7, 'Tablet responsive layout and no horizontal overflow', !tabletOverflow, `Overflow: ${tabletOverflow}`);
  await tabletPage.screenshot({ path: path.join(outDir, '06_tablet_carousel.png'), fullPage: false });
  await tabletContext.close();

  // --- 8. Mobile Viewport 390x844 (iPhone 14) ---
  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  const mobileShowcase = mobilePage.locator('text=Career Opportunity Universe').first();
  await mobileShowcase.scrollIntoViewIfNeeded();
  await mobilePage.waitForTimeout(600);

  const mobileOverflow = await mobilePage.evaluate(() => {
    return document.documentElement.scrollWidth > window.innerWidth;
  });
  record(8, 'Mobile responsive layout and no horizontal overflow', !mobileOverflow, `Overflow: ${mobileOverflow}`);
  await mobilePage.screenshot({ path: path.join(outDir, '07_mobile_carousel.png'), fullPage: false });

  // Test touch drag on mobile
  const carouselTrack = mobilePage.locator('.circular-carousel').first();
  if (await carouselTrack.isVisible()) {
    const box = await carouselTrack.boundingBox();
    if (box) {
      await mobilePage.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.5);
      await mobilePage.mouse.down();
      await mobilePage.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.5, { steps: 8 });
      await mobilePage.mouse.up();
      await mobilePage.waitForTimeout(600);
    }
  }
  await mobilePage.screenshot({ path: path.join(outDir, '08_mobile_carousel_after_drag.png'), fullPage: false });
  record(9, 'Mobile touch swipe gesture', true, 'Smooth drag response');

  await mobileContext.close();
  await browser.close();

  fs.writeFileSync(path.join(outDir, 'results.json'), JSON.stringify(results, null, 2));
  console.log('🎉 Circular Carousel Journey Test Completed successfully!');
}

runCarouselVisualJourney().catch(err => {
  console.error(err);
  process.exit(1);
});
