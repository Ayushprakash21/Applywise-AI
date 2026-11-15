// tools/capture_header_logo_theme_audit.cjs
// Visual and CSS verification script for ApplyWise AI Header Logo across Light & Dark Modes

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const outDir = 'C:\\Users\\Ayush\\.gemini\\antigravity\\brain\\a07b0288-92a2-43e6-812b-95ae60a52c22\\header_logo_screenshots';
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function runAudit() {
  console.log('🚀 Starting ApplyWise AI Header Logo Light & Dark Mode Verification...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const results = {
    checks: [],
    screenshots: []
  };

  try {
    // -------------------------------------------------------------
    // 1. Homepage Header in Light Mode
    // -------------------------------------------------------------
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    
    // Set theme to light
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
    await page.waitForTimeout(500);

    const lightScreenshot = path.join(outDir, '01_header_logo_desktop_light.png');
    const headerEl = page.locator('header').first();
    await headerEl.screenshot({ path: lightScreenshot });
    results.screenshots.push(lightScreenshot);
    console.log('✅ Captured 01_header_logo_desktop_light.png');

    // Audit computed styles of logo in light mode
    const lightLogoAudit = await page.evaluate(() => {
      const header = document.querySelector('header');
      if (!header) return null;
      const logoText = header.querySelector('span.font-bold');
      const aiAccent = header.querySelector('span.text-\\[\\#168BDB\\]');
      const iconImg = header.querySelector('img[alt*="logo"]');
      const iconContainer = iconImg ? iconImg.parentElement : null;

      const compText = logoText ? window.getComputedStyle(logoText).color : null;
      const compAi = aiAccent ? window.getComputedStyle(aiAccent).color : null;
      const compContainerBg = iconContainer ? window.getComputedStyle(iconContainer).backgroundColor : null;
      const compContainerBorder = iconContainer ? window.getComputedStyle(iconContainer).borderColor : null;
      const compImgShadow = iconImg ? window.getComputedStyle(iconImg).filter : null;

      return {
        logoText: logoText ? logoText.textContent.trim() : null,
        logoTextColor: compText,
        aiColor: compAi,
        containerBg: compContainerBg,
        containerBorder: compContainerBorder,
        imgShadow: compImgShadow,
      };
    });
    console.log('Light Mode Computed Style Audit:', lightLogoAudit);
    results.checks.push({ mode: 'light', audit: lightLogoAudit });

    // -------------------------------------------------------------
    // 2. Homepage Header in Dark Mode
    // -------------------------------------------------------------
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
    await page.waitForTimeout(500);

    const darkScreenshot = path.join(outDir, '02_header_logo_desktop_dark.png');
    await headerEl.screenshot({ path: darkScreenshot });
    results.screenshots.push(darkScreenshot);
    console.log('✅ Captured 02_header_logo_desktop_dark.png');

    const darkLogoAudit = await page.evaluate(() => {
      const header = document.querySelector('header');
      if (!header) return null;
      const logoText = header.querySelector('span.font-bold');
      const aiAccent = header.querySelector('span.text-\\[\\#168BDB\\]');
      return {
        logoText: logoText ? logoText.textContent.trim() : null,
        logoTextColor: logoText ? window.getComputedStyle(logoText).color : null,
        aiColor: aiAccent ? window.getComputedStyle(aiAccent).color : null,
      };
    });
    console.log('Dark Mode Computed Style Audit:', darkLogoAudit);
    results.checks.push({ mode: 'dark', audit: darkLogoAudit });

    // -------------------------------------------------------------
    // 3. Mobile Viewport (390x844) in Light Mode
    // -------------------------------------------------------------
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => {
      window.localStorage.setItem('applyvise_be_appearance', 'light');
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('theme-black-light');
      document.documentElement.setAttribute('data-be-appearance', 'light');
      window.dispatchEvent(new CustomEvent('applyvise-black-elite-theme-change', {
        detail: { appearance: 'light' }
      }));
    });
    await page.waitForTimeout(500);

    const mobileLightScreenshot = path.join(outDir, '03_header_logo_mobile_light.png');
    await headerEl.screenshot({ path: mobileLightScreenshot });
    results.screenshots.push(mobileLightScreenshot);
    console.log('✅ Captured 03_header_logo_mobile_light.png');

    // -------------------------------------------------------------
    // 4. Mobile Viewport (390x844) in Dark Mode
    // -------------------------------------------------------------
    await page.evaluate(() => {
      window.localStorage.setItem('applyvise_be_appearance', 'dark');
      document.documentElement.classList.remove('theme-black-light');
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-be-appearance', 'dark');
      window.dispatchEvent(new CustomEvent('applyvise-black-elite-theme-change', {
        detail: { appearance: 'dark' }
      }));
    });
    await page.waitForTimeout(500);

    const mobileDarkScreenshot = path.join(outDir, '04_header_logo_mobile_dark.png');
    await headerEl.screenshot({ path: mobileDarkScreenshot });
    results.screenshots.push(mobileDarkScreenshot);
    console.log('✅ Captured 04_header_logo_mobile_dark.png');

    // -------------------------------------------------------------
    // 5. Authenticated Workspace / Dashboard Header (BLACK ELITE) in Light Mode
    // -------------------------------------------------------------
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', 'ayushprakash0021@gmail.com');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2500);

    // Dismiss any modal
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // Set light mode with Ocean palette (giving the light-blue header background)
    await page.evaluate(() => {
      window.localStorage.setItem('applyvise_be_appearance', 'light');
      window.localStorage.setItem('applyvise_black_appearance', 'light');
      window.localStorage.setItem('applyvise_be_palette', 'ocean');
      window.localStorage.setItem('applyvise_black_palette', 'ocean');
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('theme-black-light');
      document.documentElement.setAttribute('data-be-appearance', 'light');
      document.documentElement.setAttribute('data-be-palette', 'ocean');
      window.dispatchEvent(new CustomEvent('applyvise-black-elite-theme-change', {
        detail: { appearance: 'light', palette: 'ocean' }
      }));
    });
    await page.waitForTimeout(800);

    const dashHeader = page.locator('header').first();
    const dashLightScreenshot = path.join(outDir, '05_dashboard_header_black_elite_light.png');
    await dashHeader.screenshot({ path: dashLightScreenshot });
    results.screenshots.push(dashLightScreenshot);
    console.log('✅ Captured 05_dashboard_header_black_elite_light.png');

    // Audit Dashboard Header Logo styles in Light Mode
    const dashAuditLight = await page.evaluate(() => {
      const header = document.querySelector('header');
      if (!header) return null;
      const logoText = header.querySelector('span.font-bold');
      const aiAccent = header.querySelector('span.text-\\[\\#168BDB\\]');
      const crownBadge = header.querySelector('[title="BLACK ELITE"]');
      const compText = logoText ? window.getComputedStyle(logoText).color : null;
      const compAi = aiAccent ? window.getComputedStyle(aiAccent).color : null;
      const headerBg = window.getComputedStyle(header).backgroundColor;
      return {
        headerBg,
        logoText: logoText ? logoText.textContent.trim() : null,
        logoTextColor: compText,
        aiColor: compAi,
        hasCrownBadge: Boolean(crownBadge),
      };
    });
    console.log('Dashboard Header Light Mode Audit:', dashAuditLight);
    results.checks.push({ mode: 'dashboard_black_elite_light', audit: dashAuditLight });

    // -------------------------------------------------------------
    // 6. Authenticated Workspace / Dashboard Header in Dark Mode
    // -------------------------------------------------------------
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

    const dashDarkScreenshot = path.join(outDir, '06_dashboard_header_black_elite_dark.png');
    await dashHeader.screenshot({ path: dashDarkScreenshot });
    results.screenshots.push(dashDarkScreenshot);
    console.log('✅ Captured 06_dashboard_header_black_elite_dark.png');

    const dashAuditDark = await page.evaluate(() => {
      const header = document.querySelector('header');
      if (!header) return null;
      const logoText = header.querySelector('span.font-bold');
      const aiAccent = header.querySelector('span.text-\\[\\#168BDB\\]');
      const crownBadge = header.querySelector('[title="BLACK ELITE"]');
      const compText = logoText ? window.getComputedStyle(logoText).color : null;
      const compAi = aiAccent ? window.getComputedStyle(aiAccent).color : null;
      const headerBg = window.getComputedStyle(header).backgroundColor;
      return {
        headerBg,
        logoText: logoText ? logoText.textContent.trim() : null,
        logoTextColor: compText,
        aiColor: compAi,
        hasCrownBadge: Boolean(crownBadge),
      };
    });
    console.log('Dashboard Header Dark Mode Audit:', dashAuditDark);
    results.checks.push({ mode: 'dashboard_black_elite_dark', audit: dashAuditDark });

    fs.writeFileSync(path.join(outDir, 'audit_summary.json'), JSON.stringify(results, null, 2));
    console.log('🎉 Verification complete!');
  } catch (err) {
    console.error('Audit error:', err);
  } finally {
    await browser.close();
  }
}

runAudit();
