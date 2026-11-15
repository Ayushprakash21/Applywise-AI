const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 960 },
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();
  const outDir = path.resolve('C:/Users/Ayush/.gemini/antigravity/brain/a07b0288-92a2-43e6-812b-95ae60a52c22/black_elite_screenshots');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  console.log('Navigating to Pricing page...');
  await page.goto('http://localhost:3000/pricing', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // 1. Ensure Light Mode is active
  await page.evaluate(() => {
    localStorage.setItem('applywise_theme', 'light');
    localStorage.setItem('applyvise_black_appearance', 'light');
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
    document.documentElement.setAttribute('data-theme-mode', 'light');
    document.documentElement.setAttribute('data-be-appearance', 'light');
    window.dispatchEvent(new Event('storage'));
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  // Capture Full Pricing Page in Light Mode
  await page.screenshot({
    path: path.join(outDir, '01_pricing_page_light_mode_black_elite.png'),
    fullPage: false,
  });
  console.log('Captured 01_pricing_page_light_mode_black_elite.png');

  // Capture BLACK Elite Card Closeup in Light Mode
  const blackCard = await page.locator('[data-testid="pricing-card-black"]');
  await blackCard.screenshot({
    path: path.join(outDir, '03_black_elite_card_closeup_light.png'),
  });
  console.log('Captured 03_black_elite_card_closeup_light.png');

  // 2. Switch to Dark Mode
  await page.evaluate(() => {
    localStorage.setItem('applywise_theme', 'dark');
    localStorage.setItem('applyvise_black_appearance', 'dark');
    document.documentElement.classList.remove('light');
    document.documentElement.classList.add('dark');
    document.documentElement.setAttribute('data-theme-mode', 'dark');
    document.documentElement.setAttribute('data-be-appearance', 'dark');
    window.dispatchEvent(new Event('storage'));
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  // Capture Full Pricing Page in Dark Mode
  await page.screenshot({
    path: path.join(outDir, '02_pricing_page_dark_mode_black_elite.png'),
    fullPage: false,
  });
  console.log('Captured 02_pricing_page_dark_mode_black_elite.png');

  // Capture BLACK Elite Card Closeup in Dark Mode
  const blackCardDark = await page.locator('[data-testid="pricing-card-black"]');
  await blackCardDark.screenshot({
    path: path.join(outDir, '04_black_elite_card_closeup_dark.png'),
  });
  console.log('Captured 04_black_elite_card_closeup_dark.png');

  await browser.close();
  console.log('Finished capturing all verification screenshots.');
}

main().catch(err => {
  console.error('Error running capture script:', err);
  process.exit(1);
});
