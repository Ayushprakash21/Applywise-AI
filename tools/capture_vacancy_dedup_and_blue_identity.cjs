const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function capture() {
  const outputDir = path.resolve(
    'C:/Users/Ayush/.gemini/antigravity/brain/a07b0288-92a2-43e6-812b-95ae60a52c22/vacancy_dedup_screenshots'
  );
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const results = {
    screenshots: [],
    duplicateSectionsDetected: 0,
    hasRawHtmlInDescription: false,
    verifiedRoleColor: '',
    inspectRoleColor: '',
  };

  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

    // 1. Desktop Light Mode
    console.log('Navigating to http://localhost:3000/ ...');
    await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Ensure Light mode
    await page.evaluate(() => {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    });
    await page.waitForTimeout(500);

    // Scroll to #network
    const networkSection = await page.$('#network');
    if (networkSection) {
      await networkSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(1000);
    }

    const file01 = path.join(outputDir, '01_career_universe_desktop_light.png');
    await page.screenshot({ path: file01, fullPage: false });
    results.screenshots.push({ name: '01_career_universe_desktop_light', path: file01 });
    console.log('Captured:', file01);

    // Check for duplicate sections
    const pageContent = await page.content();
    const duplicateMatches = pageContent.match(/Live Discovered Vacancies/gi) || [];
    results.duplicateSectionsDetected = duplicateMatches.length;

    // Check for raw HTML tags in descriptions
    const rawHtmlMatch = pageContent.match(/<div class="content-intro"/gi);
    results.hasRawHtmlInDescription = !!rawHtmlMatch;

    // Inspect colors of Verified Role badge and Inspect Role in DOM
    const badgeColors = await page.evaluate(() => {
      const allSpans = Array.from(document.querySelectorAll('span'));
      const badge = allSpans.find(el => el.textContent.includes('Verified Role'));
      const inspectRole = allSpans.find(el => el.textContent.includes('Inspect Role'));
      const card = document.querySelector('[data-testid="career-opportunity-universe"] [role="button"]');
      
      let badgeStyle = '';
      let inspectStyle = '';
      let cardBorder = '';

      if (badge) {
        badgeStyle = window.getComputedStyle(badge).color;
      }
      if (inspectRole) {
        inspectStyle = window.getComputedStyle(inspectRole).color;
      }
      if (card) {
        cardBorder = window.getComputedStyle(card).borderColor;
      }

      return { badgeStyle, inspectStyle, cardBorder };
    });
    results.verifiedRoleColor = badgeColors.badgeStyle;
    results.inspectRoleColor = badgeColors.inspectStyle;

    // 2. Desktop Dark Mode
    console.log('Switching to Dark Mode via GlobalThemeSwitch...');
    const themeBtn = await page.$('#global-theme-switch');
    if (themeBtn) {
      await themeBtn.click();
      await page.waitForTimeout(1000);
    } else {
      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      });
      await page.waitForTimeout(1000);
    }

    if (networkSection) {
      await networkSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
    }

    const file02 = path.join(outputDir, '02_career_universe_desktop_dark.png');
    await page.screenshot({ path: file02, fullPage: false });
    results.screenshots.push({ name: '02_career_universe_desktop_dark', path: file02 });
    console.log('Captured:', file02);

    // 3. Accessible List View (Dark Mode)
    const listBtn = await page.$('button[title="Toggle Accessible List View"]');
    if (listBtn) {
      await listBtn.click();
      await page.waitForTimeout(800);
      const file03 = path.join(outputDir, '03_accessible_list_view_dark.png');
      await page.screenshot({ path: file03, fullPage: false });
      results.screenshots.push({ name: '03_accessible_list_view_dark', path: file03 });
      console.log('Captured:', file03);

      // Toggle back to card view
      await listBtn.click();
      await page.waitForTimeout(500);
    }

    // 4. Modal / Job Detail trigger
    const firstCard = await page.$('[data-testid="career-opportunity-universe"] [role="button"]');
    if (firstCard) {
      await firstCard.click();
      await page.waitForTimeout(800);
      const file04 = path.join(outputDir, '04_opportunity_detail_modal_dark.png');
      await page.screenshot({ path: file04, fullPage: false });
      results.screenshots.push({ name: '04_opportunity_detail_modal_dark', path: file04 });
      console.log('Captured:', file04);

      // Close modal / drawer with Escape or Back button
      await page.keyboard.press('Escape');
      await page.waitForTimeout(600);
      const backBtn = await page.$('button:has-text("Back to Opportunities")');
      if (backBtn) {
        await backBtn.click();
        await page.waitForTimeout(500);
      }
    }

    // 5. Mobile Light View (390x844)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => {
      if (window.__APPLYVISE_THEME__) {
        window.__APPLYVISE_THEME__.setAppearance('light');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.setAttribute('data-theme-mode', 'light');
      }
    });
    await page.waitForTimeout(800);

    const mobileNetwork = await page.$('#network');
    if (mobileNetwork) {
      await mobileNetwork.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
    }

    const file05 = path.join(outputDir, '05_career_universe_mobile_light.png');
    await page.screenshot({ path: file05, fullPage: false });
    results.screenshots.push({ name: '05_career_universe_mobile_light', path: file05 });
    console.log('Captured:', file05);

    // 6. Mobile Dark View (390x844)
    await page.evaluate(() => {
      if (window.__APPLYVISE_THEME__) {
        window.__APPLYVISE_THEME__.setAppearance('dark');
      } else {
        document.documentElement.classList.add('dark');
        document.documentElement.setAttribute('data-theme-mode', 'dark');
      }
    });
    await page.waitForTimeout(800);

    if (mobileNetwork) {
      await mobileNetwork.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
    }

    const file06 = path.join(outputDir, '06_career_universe_mobile_dark.png');
    await page.screenshot({ path: file06, fullPage: false });
    results.screenshots.push({ name: '06_career_universe_mobile_dark', path: file06 });
    console.log('Captured:', file06);

    const summaryPath = path.join(outputDir, 'audit_summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(results, null, 2));
    console.log('Audit Summary written to:', summaryPath);
  } catch (err) {
    console.error('Capture error:', err);
  } finally {
    await browser.close();
  }
}

capture();
