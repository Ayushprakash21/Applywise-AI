// tools/capture_career_ascent_hero.cjs
// Automated Visual & Responsive Verification Suite for APPLYWISE AI — THE CAREER ASCENT 3D Hero

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const outDir = 'C:\\Users\\Ayush\\.gemini\\antigravity\\brain\\a07b0288-92a2-43e6-812b-95ae60a52c22\\career_ascent_screenshots';
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function runAudit() {
  console.log('🚀 Starting Comprehensive Career Ascent 3D Hero Verification...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // -------------------------------------------------------------
    // 1. Desktop Ultrawide 1920x1080 (Dark Mode)
    // -------------------------------------------------------------
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="career-ascent-hero"]', { timeout: 10000 });
    await page.waitForTimeout(1000);

    // Set dark mode
    await page.evaluate(() => {
      window.localStorage.setItem('applyvise_be_appearance', 'dark');
      window.localStorage.setItem('applyvise_black_appearance', 'dark');
      document.documentElement.classList.remove('theme-black-light');
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-be-appearance', 'dark');
      window.dispatchEvent(new CustomEvent('applyvise-black-elite-theme-change', {
        detail: { appearance: 'dark' }
      }));
    });
    await page.waitForTimeout(800);

    const heroEl = page.locator('[data-testid="career-ascent-hero"]').first();
    const screenshot1920Dark = path.join(outDir, '01_career_ascent_1920_dark.png');
    await heroEl.screenshot({ path: screenshot1920Dark });
    console.log('✅ Captured 01_career_ascent_1920_dark.png');

    // -------------------------------------------------------------
    // 2. Desktop Standard 1440x900 (Dark Mode)
    // -------------------------------------------------------------
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(500);

    const screenshot1440Dark = path.join(outDir, '02_career_ascent_1440_dark.png');
    await heroEl.screenshot({ path: screenshot1440Dark });
    console.log('✅ Captured 02_career_ascent_1440_dark.png');

    // -------------------------------------------------------------
    // 3. Desktop Standard 1440x900 (Light Mode)
    // -------------------------------------------------------------
    await page.evaluate(() => {
      window.localStorage.setItem('applyvise_be_appearance', 'light');
      window.localStorage.setItem('applyvise_black_appearance', 'light');
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('theme-black-light');
      document.documentElement.setAttribute('data-be-appearance', 'light');
      window.dispatchEvent(new CustomEvent('applyvise-black-elite-theme-change', {
        detail: { appearance: 'light' }
      }));
    });
    await page.waitForTimeout(800);

    const screenshot1440Light = path.join(outDir, '03_career_ascent_1440_light.png');
    await heroEl.screenshot({ path: screenshot1440Light });
    console.log('✅ Captured 03_career_ascent_1440_light.png');

    // -------------------------------------------------------------
    // 4. Interactive Stage Activation: Stage 05 ADVANCE
    // -------------------------------------------------------------
    const stage5Btn = page.locator('[data-testid="ca-stage-btn-5"]').first();
    if (await stage5Btn.isVisible()) {
      await stage5Btn.click();
      await page.waitForTimeout(600);
      const screenshotStage5 = path.join(outDir, '04_career_ascent_stage5_advance_active.png');
      await heroEl.screenshot({ path: screenshotStage5 });
      console.log('✅ Captured 04_career_ascent_stage5_advance_active.png');
    }

    // -------------------------------------------------------------
    // 5. Tablet 1024x768 (Dark Mode)
    // -------------------------------------------------------------
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.evaluate(() => {
      window.localStorage.setItem('applyvise_be_appearance', 'dark');
      document.documentElement.classList.remove('theme-black-light');
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-be-appearance', 'dark');
      window.dispatchEvent(new CustomEvent('applyvise-black-elite-theme-change', {
        detail: { appearance: 'dark' }
      }));
    });
    await page.waitForTimeout(600);

    const screenshot1024Dark = path.join(outDir, '05_career_ascent_1024_dark.png');
    await heroEl.screenshot({ path: screenshot1024Dark });
    console.log('✅ Captured 05_career_ascent_1024_dark.png');

    // -------------------------------------------------------------
    // 6. Mobile 390x844 (Dark Mode)
    // -------------------------------------------------------------
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(600);

    const screenshot390Dark = path.join(outDir, '06_career_ascent_390_mobile_dark.png');
    await heroEl.screenshot({ path: screenshot390Dark });
    console.log('✅ Captured 06_career_ascent_390_mobile_dark.png');

    // -------------------------------------------------------------
    // 7. Mobile 390x844 (Light Mode)
    // -------------------------------------------------------------
    await page.evaluate(() => {
      window.localStorage.setItem('applyvise_be_appearance', 'light');
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('theme-black-light');
      document.documentElement.setAttribute('data-be-appearance', 'light');
      window.dispatchEvent(new CustomEvent('applyvise-black-elite-theme-change', {
        detail: { appearance: 'light' }
      }));
    });
    await page.waitForTimeout(600);

    const screenshot390Light = path.join(outDir, '07_career_ascent_390_mobile_light.png');
    await heroEl.screenshot({ path: screenshot390Light });
    console.log('✅ Captured 07_career_ascent_390_mobile_light.png');

    // Audit computed styles & text content
    const contentAudit = await page.evaluate(() => {
      const hero = document.querySelector('[data-testid="career-ascent-hero"]');
      if (!hero) return null;
      const title = hero.querySelector('[data-testid="ca-main-headline"]')?.textContent?.trim();
      const subtitle = hero.querySelector('[data-testid="ca-supporting-headline"]')?.textContent?.trim();
      const desc = hero.querySelector('[data-testid="ca-description"]')?.textContent?.trim();
      const canvas = hero.querySelector('canvas');
      return {
        title,
        subtitle,
        desc,
        hasCanvas: Boolean(canvas),
        canvasWidth: canvas?.width,
        canvasHeight: canvas?.height,
      };
    });
    console.log('Hero Content & Canvas Audit:', contentAudit);

    fs.writeFileSync(path.join(outDir, 'audit_summary.json'), JSON.stringify({ audit: contentAudit }, null, 2));
    console.log('🎉 Career Ascent visual verification complete!');
  } catch (err) {
    console.error('Audit execution error:', err);
  } finally {
    await browser.close();
  }
}

runAudit();
