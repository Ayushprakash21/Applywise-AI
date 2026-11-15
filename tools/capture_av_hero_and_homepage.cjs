// tools/capture_av_hero_and_homepage.cjs
// Visual Audit Script for APPLYWISE AI — CINEMATIC AV HERO & HOMEPAGE TRANSFORMATION
// Captures desktop, mobile, theme transitions, animation loop frames, and full footer

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.resolve('C:/Users/Ayush/.gemini/antigravity/brain/a07b0288-92a2-43e6-812b-95ae60a52c22/av_cinematic_hero_screenshots');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function run() {
  console.log('Starting Playwright capture for ApplyWise AI Cinematic AV Hero...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  const auditLog = {
    capturedAt: new Date().toISOString(),
    screenshots: [],
    checks: {},
  };

  try {
    const page = await context.newPage();
    await page.setViewportSize({ width: 1440, height: 900 });

    // Navigate to homepage
    console.log('Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000); // Allow canvas & font rendering

    // 1. Desktop Light Mode Top Hero
    const file01 = path.join(OUTPUT_DIR, '01_desktop_hero_light.png');
    await page.screenshot({ path: file01, fullPage: false });
    auditLog.screenshots.push({ name: '01_desktop_hero_light.png', description: 'Desktop 1440x900 Light Theme - Single Cinematic AV Hero' });
    console.log('Captured 01_desktop_hero_light.png');

    // 2. Desktop Dark Mode Top Hero
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme-mode', 'dark');
      document.documentElement.classList.add('dark');
    });
    await page.waitForTimeout(1000);
    const file02 = path.join(OUTPUT_DIR, '02_desktop_hero_dark.png');
    await page.screenshot({ path: file02, fullPage: false });
    auditLog.screenshots.push({ name: '02_desktop_hero_dark.png', description: 'Desktop 1440x900 Dark Theme - Single Cinematic AV Hero' });
    console.log('Captured 02_desktop_hero_dark.png');

    // 3. Section E: Live Discovered Vacancies
    const jobsSection = await page.$('#jobs');
    if (jobsSection) {
      await jobsSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(800);
      const file03 = path.join(OUTPUT_DIR, '03_live_discovered_vacancies_dark.png');
      await page.screenshot({ path: file03, fullPage: false });
      auditLog.screenshots.push({ name: '03_live_discovered_vacancies_dark.png', description: 'Live Discovered Vacancies (6 Cards Grid)' });
      console.log('Captured 03_live_discovered_vacancies_dark.png');
    }

    // 4. Clean Deep Navy Global Footer
    const footerElement = await page.$('footer');
    if (footerElement) {
      await footerElement.scrollIntoViewIfNeeded();
      await page.waitForTimeout(800);
      const file04 = path.join(OUTPUT_DIR, '04_deep_navy_footer.png');
      await footerElement.screenshot({ path: file04 });
      auditLog.screenshots.push({ name: '04_deep_navy_footer.png', description: 'Deep Navy Global Footer (#080F1C) matching Image 3' });
      console.log('Captured 04_deep_navy_footer.png');
    }

    // 5. Mobile Viewport (390x844 - iPhone 14)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.waitForTimeout(1000);
    const file05 = path.join(OUTPUT_DIR, '05_mobile_hero_dark.png');
    await page.screenshot({ path: file05, fullPage: false });
    auditLog.screenshots.push({ name: '05_mobile_hero_dark.png', description: 'Mobile 390x844 Dark Theme - Single Cinematic AV Hero' });
    console.log('Captured 05_mobile_hero_dark.png');

    // 6. Mobile Light Mode
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme-mode', 'light');
      document.documentElement.classList.remove('dark');
    });
    await page.waitForTimeout(1000);
    const file06 = path.join(OUTPUT_DIR, '06_mobile_hero_light.png');
    await page.screenshot({ path: file06, fullPage: false });
    auditLog.screenshots.push({ name: '06_mobile_hero_light.png', description: 'Mobile 390x844 Light Theme - Single Cinematic AV Hero' });
    console.log('Captured 06_mobile_hero_light.png');

    // 7. Multi-frame animation sequence of the 10-second loop
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    const heroCanvas = await page.$('[data-testid="av-cinematic-canvas"]');
    if (heroCanvas) {
      const timestamps = [1000, 3000, 5000, 7000, 9000];
      for (let i = 0; i < timestamps.length; i++) {
        await page.waitForTimeout(1500);
        const animFile = path.join(OUTPUT_DIR, `07_animation_frame_${i + 1}.png`);
        await heroCanvas.screenshot({ path: animFile });
        auditLog.screenshots.push({ name: `07_animation_frame_${i + 1}.png`, description: `Animation Loop Frame ${i + 1} (${timestamps[i] / 1000}s)` });
      }
      console.log('Captured 5 animation loop frames.');
    }

    // Save audit summary
    fs.writeFileSync(path.join(OUTPUT_DIR, 'audit_summary.json'), JSON.stringify(auditLog, null, 2));
    console.log('Audit completed successfully. All artifacts saved to:', OUTPUT_DIR);

  } catch (err) {
    console.error('Audit failed with error:', err);
  } finally {
    await browser.close();
  }
}

run();
