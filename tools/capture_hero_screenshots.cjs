const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const outDir = 'C:\\Users\\Ayush\\.gemini\\antigravity\\brain\\a07b0288-92a2-43e6-812b-95ae60a52c22\\hero_screenshots';
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function capture() {
  const browser = await chromium.launch({ headless: true });

  const viewports = [
    { name: '01_320x640_ultra_mobile', width: 320, height: 640 },
    { name: '02_375x812_standard_mobile', width: 375, height: 812 },
    { name: '03_430x932_large_mobile', width: 430, height: 932 },
    { name: '04_768x1024_tablet', width: 768, height: 1024 },
    { name: '05_1366x768_laptop', width: 1366, height: 768 },
    { name: '06_1536x864_desktop', width: 1536, height: 864 },
    { name: '07_1920x1080_high_dpi', width: 1920, height: 1080 },
  ];

  async function setThemeAndPalette(page, appearance, palette = 'dune') {
    await page.evaluate(({ appMode, pal }) => {
      if (window.__APPLYVISE_THEME__) {
        window.__APPLYVISE_THEME__.setPalette(pal);
        window.__APPLYVISE_THEME__.setAppearance(appMode);
      } else {
        localStorage.setItem('applyvise_be_appearance', appMode);
        localStorage.setItem('applyvise_be_palette', pal);
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

  // 1. Capture across all 7 viewports in Light Mode and Dark Mode
  for (const vp of viewports) {
    console.log(`Capturing ${vp.name}...`);
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await context.newPage();
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });

    // Light Mode
    await setThemeAndPalette(page, 'light', 'dune');
    await page.screenshot({
      path: path.join(outDir, `${vp.name}_light.png`),
      fullPage: false,
    });

    // Dark Mode
    await setThemeAndPalette(page, 'dark', 'dune');
    await page.screenshot({
      path: path.join(outDir, `${vp.name}_dark.png`),
      fullPage: false,
    });

    await context.close();
  }

  // 2. Palette showcase at 1536x864 (Dune, Ocean, Aurora, Dusk, Silk)
  console.log('Capturing Palette Showcase...');
  const palContext = await browser.newContext({ viewport: { width: 1536, height: 864 } });
  const palPage = await palContext.newPage();
  await palPage.goto('http://localhost:3000/', { waitUntil: 'networkidle' });

  const palettes = ['dune', 'ocean', 'aurora', 'dusk', 'silk'];
  for (const pal of palettes) {
    // Light
    await setThemeAndPalette(palPage, 'light', pal);
    await palPage.screenshot({
      path: path.join(outDir, `palette_${pal}_light.png`),
      fullPage: false,
    });

    // Dark
    await setThemeAndPalette(palPage, 'dark', pal);
    await palPage.screenshot({
      path: path.join(outDir, `palette_${pal}_dark.png`),
      fullPage: false,
    });
  }

  // 3. Capture Full Page & Zero-Hallucination Section
  console.log('Capturing Full Page & Zero-Hallucination Section...');
  // Light fullpage
  await setThemeAndPalette(palPage, 'light', 'dune');
  await palPage.screenshot({
    path: path.join(outDir, '08_full_homepage_light.png'),
    fullPage: true,
  });

  // Dark fullpage
  await setThemeAndPalette(palPage, 'dark', 'dune');
  await palPage.screenshot({
    path: path.join(outDir, '09_full_homepage_dark.png'),
    fullPage: true,
  });

  // Zero-Hallucination section close-up
  const integritySection = await palPage.$('#integrity');
  if (integritySection) {
    // Light
    await setThemeAndPalette(palPage, 'light', 'dune');
    await integritySection.screenshot({
      path: path.join(outDir, '10_zero_hallucination_light.png'),
    });
    // Dark
    await setThemeAndPalette(palPage, 'dark', 'dune');
    await integritySection.screenshot({
      path: path.join(outDir, '11_zero_hallucination_dark.png'),
    });
  }

  await palContext.close();
  await browser.close();
  console.log('All screenshots captured successfully in:', outDir);
}

capture().catch((err) => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
