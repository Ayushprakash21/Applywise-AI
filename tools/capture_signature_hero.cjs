const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const outDir = 'C:\\Users\\Ayush\\.gemini\\antigravity\\brain\\a07b0288-92a2-43e6-812b-95ae60a52c22\\signature_hero_screenshots';
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

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

async function captureHero() {
  console.log('📸 Capturing ApplyVise Signature Brand Experience Hero...');
  const browser = await chromium.launch({ headless: true });

  const viewports = [
    { name: 'desktop', width: 1536, height: 960 },
    { name: 'mobile', width: 390, height: 844 },
  ];

  for (const vp of viewports) {
    // 1. Light Mode
    const contextLight = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const pageLight = await contextLight.newPage();
    await pageLight.addInitScript(() => {
      localStorage.setItem('applyvise_be_appearance', 'light');
      localStorage.setItem('applyvise_be_palette', 'dune');
    });
    await pageLight.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await applyTheme(pageLight, 'light', 'dune');
    await pageLight.waitForTimeout(600);

    const lightHeroPath = path.join(outDir, `signature_hero_${vp.name}_light.png`);
    await pageLight.screenshot({ path: lightHeroPath, fullPage: false });
    console.log(`Saved: ${lightHeroPath}`);

    // 2. Dark Mode
    const contextDark = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const pageDark = await contextDark.newPage();
    await pageDark.addInitScript(() => {
      localStorage.setItem('applyvise_be_appearance', 'dark');
      localStorage.setItem('applyvise_be_palette', 'dune');
    });
    await pageDark.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await applyTheme(pageDark, 'dark', 'dune');
    await pageDark.waitForTimeout(600);

    const darkHeroPath = path.join(outDir, `signature_hero_${vp.name}_dark.png`);
    await pageDark.screenshot({ path: darkHeroPath, fullPage: false });
    console.log(`Saved: ${darkHeroPath}`);

    await contextLight.close();
    await contextDark.close();
  }

  // Also capture Dimension 2 (Competency Modeling) interactive tab click in light mode
  const contextInteractive = await browser.newContext({ viewport: { width: 1536, height: 960 } });
  const pageInteractive = await contextInteractive.newPage();
  await pageInteractive.addInitScript(() => {
    localStorage.setItem('applyvise_be_appearance', 'light');
    localStorage.setItem('applyvise_be_palette', 'dune');
  });
  await pageInteractive.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await applyTheme(pageInteractive, 'light', 'dune');
  await pageInteractive.waitForTimeout(500);

  // Click on Dimension 2: Competency Modeling
  const compButton = pageInteractive.locator('button:has-text("Competency Modeling")');
  if (await compButton.count() > 0) {
    await compButton.first().click();
    await pageInteractive.waitForTimeout(400);
    const compPath = path.join(outDir, 'signature_hero_tab_competency_light.png');
    await pageInteractive.screenshot({ path: compPath, fullPage: false });
    console.log(`Saved: ${compPath}`);
  }

  await contextInteractive.close();
  await browser.close();
  console.log('✅ Signature Hero screenshots captured successfully.');
}

captureHero().catch(err => {
  console.error('Error capturing screenshots:', err);
  process.exit(1);
});
