const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const outDir = 'C:\\Users\\Ayush\\.gemini\\antigravity\\brain\\a07b0288-92a2-43e6-812b-95ae60a52c22\\theme_audit_screenshots';
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

function parseRgb(colorStr) {
  const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return { r: 0, g: 0, b: 0 };
  return {
    r: parseInt(match[1], 10),
    g: parseInt(match[2], 10),
    b: parseInt(match[3], 10),
  };
}

function luminance(r, g, b) {
  const a = [r, g, b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

function contrastRatio(rgb1, rgb2) {
  const lum1 = luminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = luminance(rgb2.r, rgb2.g, rgb2.b);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return ((brightest + 0.05) / (darkest + 0.05)).toFixed(2);
}

async function runAudit() {
  console.log('🚀 Starting Comprehensive Global Theme & Readability Audit...');
  const browser = await chromium.launch({ headless: true });
  const auditResults = {
    timestamp: new Date().toISOString(),
    viewportsAudited: 7,
    routesAudited: [],
    founderSectionAudit: {},
    contrastChecks: [],
    screenshotsCaptured: [],
  };

  const viewports = [
    { name: '01_320x640_ultra_mobile', width: 320, height: 640 },
    { name: '02_375x812_standard_mobile', width: 375, height: 812 },
    { name: '03_430x932_large_mobile', width: 430, height: 932 },
    { name: '04_768x1024_tablet', width: 768, height: 1024 },
    { name: '05_1366x768_laptop', width: 1366, height: 768 },
    { name: '06_1536x864_desktop', width: 1536, height: 864 },
    { name: '07_1920x1080_high_dpi', width: 1920, height: 1080 },
  ];

  async function applyTheme(page, appearance, palette = 'dune') {
    await page.evaluate(({ appMode, pal }) => {
      localStorage.setItem('applyvise_be_appearance', appMode);
      localStorage.setItem('applyvise_be_palette', pal);
      if (window.__APPLYVISE_THEME__?.setAppearance) {
        window.__APPLYVISE_THEME__.setPalette(pal);
        window.__APPLYVISE_THEME__.setAppearance(appMode);
      } else {
        const root = document.documentElement;
        const body = document.body;
        root.setAttribute('data-be-appearance', appMode);
        root.setAttribute('data-theme-mode', appMode);
        root.setAttribute('data-be-palette', pal);
        body.setAttribute('data-be-appearance', appMode);
        body.setAttribute('data-theme-mode', appMode);
        body.setAttribute('data-be-palette', pal);
        if (appMode === 'light') {
          root.classList.add('theme-black-light');
          body.classList.add('theme-black-light');
          root.classList.remove('theme-black-dark', 'dark');
          body.classList.remove('theme-black-dark', 'dark');
        } else {
          root.classList.add('theme-black-dark', 'dark');
          body.classList.add('theme-black-dark', 'dark');
          root.classList.remove('theme-black-light');
          body.classList.remove('theme-black-light');
        }
      }
    }, { appMode: appearance, pal: palette });
    await page.waitForTimeout(400);
  }

  // =========================================================================
  // 1. Audit Founder Section Specifically in Light and Dark Mode
  // =========================================================================
  console.log('📌 Auditing Founder Section (#founder) in Light and Dark mode...');
  {
    const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    const page = await context.newPage();
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });

    // LIGHT MODE
    await applyTheme(page, 'light');
    const founderEl = await page.$('#founder');
    if (founderEl) {
      await founderEl.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);

      // Check quote panel styles
      const quoteStyles = await page.evaluate(() => {
        const quotePanel = document.querySelector('#founder p.italic')?.parentElement;
        const quoteText = document.querySelector('#founder p.italic');
        const quoteAuthor = document.querySelector('#founder .text-right span');
        if (!quotePanel || !quoteText) return null;
        const panelComputed = window.getComputedStyle(quotePanel);
        const textComputed = window.getComputedStyle(quoteText);
        const authorComputed = quoteAuthor ? window.getComputedStyle(quoteAuthor) : null;
        return {
          panelBg: panelComputed.backgroundColor,
          panelBorder: panelComputed.borderColor,
          textColor: textComputed.color,
          authorColor: authorComputed ? authorComputed.color : null,
        };
      });

      if (quoteStyles) {
        const bgRgb = parseRgb(quoteStyles.panelBg);
        const textRgb = parseRgb(quoteStyles.textColor);
        const ratio = contrastRatio(bgRgb, textRgb);
        console.log(`  [Light Mode Founder Quote] bg=${quoteStyles.panelBg}, text=${quoteStyles.textColor}, ratio=${ratio}:1`);

        auditResults.founderSectionAudit.lightMode = {
          ...quoteStyles,
          contrastRatio: `${ratio}:1`,
          wcagPass: parseFloat(ratio) >= 4.5,
        };
      }

      const lightPath = path.join(outDir, 'founder_light.png');
      await founderEl.screenshot({ path: lightPath });
      auditResults.screenshotsCaptured.push('founder_light.png');
    }

    // DARK MODE
    await applyTheme(page, 'dark');
    if (founderEl) {
      await founderEl.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);

      const quoteStylesDark = await page.evaluate(() => {
        const quotePanel = document.querySelector('#founder p.italic')?.parentElement;
        const quoteText = document.querySelector('#founder p.italic');
        if (!quotePanel || !quoteText) return null;
        return {
          panelBg: window.getComputedStyle(quotePanel).backgroundColor,
          textColor: window.getComputedStyle(quoteText).color,
        };
      });

      if (quoteStylesDark) {
        const bgRgb = parseRgb(quoteStylesDark.panelBg);
        const textRgb = parseRgb(quoteStylesDark.textColor);
        const ratio = contrastRatio(bgRgb, textRgb);
        console.log(`  [Dark Mode Founder Quote] bg=${quoteStylesDark.panelBg}, text=${quoteStylesDark.textColor}, ratio=${ratio}:1`);

        auditResults.founderSectionAudit.darkMode = {
          ...quoteStylesDark,
          contrastRatio: `${ratio}:1`,
          wcagPass: parseFloat(ratio) >= 4.5,
        };
      }

      const darkPath = path.join(outDir, 'founder_dark.png');
      await founderEl.screenshot({ path: darkPath });
      auditResults.screenshotsCaptured.push('founder_dark.png');
    }

    await context.close();
  }

  // =========================================================================
  // 2. Audit Full Homepage across 7 Viewports (Light and Dark)
  // =========================================================================
  console.log('📌 Auditing Homepage across 7 viewports in Light & Dark Mode...');
  for (const vp of viewports) {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await context.newPage();
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });

    // Light
    await applyTheme(page, 'light');
    const vpLightName = `homepage_${vp.name}_light.png`;
    await page.screenshot({ path: path.join(outDir, vpLightName), fullPage: false });
    auditResults.screenshotsCaptured.push(vpLightName);

    // Dark
    await applyTheme(page, 'dark');
    const vpDarkName = `homepage_${vp.name}_dark.png`;
    await page.screenshot({ path: path.join(outDir, vpDarkName), fullPage: false });
    auditResults.screenshotsCaptured.push(vpDarkName);

    await context.close();
  }

  // =========================================================================
  // 3. Audit Candidate Sign In and Sign Up Pages (Light and Dark)
  // =========================================================================
  console.log('📌 Auditing Candidate Authentication (Sign In & Sign Up)...');
  {
    const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    const page = await context.newPage();
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });

    // Open Sign In
    const signInBtn = await page.$('button:has-text("Sign In")');
    if (signInBtn) {
      await signInBtn.click();
      await page.waitForTimeout(400);

      // Light Mode Sign In
      await applyTheme(page, 'light');
      await page.screenshot({ path: path.join(outDir, 'auth_signin_light.png'), fullPage: false });
      auditResults.screenshotsCaptured.push('auth_signin_light.png');

      // Check card background in Light mode
      const cardBg = await page.evaluate(() => {
        const card = document.querySelector('.glass-auth-surface');
        return card ? window.getComputedStyle(card).backgroundColor : null;
      });
      console.log(`  [Light Mode Auth Card] background=${cardBg}`);

      // Dark Mode Sign In
      await applyTheme(page, 'dark');
      await page.screenshot({ path: path.join(outDir, 'auth_signin_dark.png'), fullPage: false });
      auditResults.screenshotsCaptured.push('auth_signin_dark.png');
    }

    await context.close();
  }

  // =========================================================================
  // 4. Audit Zero-Hallucination Comparison Table (#integrity)
  // =========================================================================
  console.log('📌 Auditing Zero-Hallucination Standard (#integrity)...');
  {
    const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    const page = await context.newPage();
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });

    await applyTheme(page, 'light');
    const integritySection = await page.$('#integrity');
    if (integritySection) {
      await integritySection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);

      const comparisonStyles = await page.evaluate(() => {
        const applyViseCol = document.querySelector('[data-theme-surface="dark"]');
        const heading = applyViseCol ? applyViseCol.querySelector('span, .text-sky-300') : null;
        const p = applyViseCol ? applyViseCol.querySelector('p') : null;
        return {
          colBg: applyViseCol ? window.getComputedStyle(applyViseCol).backgroundColor : null,
          headingColor: heading ? window.getComputedStyle(heading).color : null,
          pColor: p ? window.getComputedStyle(p).color : null,
        };
      });

      console.log('  [ApplyVise Col in Light Mode]:', comparisonStyles);
      await integritySection.screenshot({ path: path.join(outDir, 'zero_hallucination_light.png') });
      auditResults.screenshotsCaptured.push('zero_hallucination_light.png');
    }

    await context.close();
  }

  await browser.close();

  const reportPath = path.join(outDir, 'theme-audit-results.json');
  fs.writeFileSync(reportPath, JSON.stringify(auditResults, null, 2));
  console.log(`✅ Theme audit complete! Saved ${auditResults.screenshotsCaptured.length} screenshots and report to:`);
  console.log(`   ${reportPath}`);
}

runAudit().catch(err => {
  console.error('Audit failed with error:', err);
  process.exit(1);
});
