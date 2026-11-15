const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function main() {
  const browser = await chromium.launch({ headless: true });
  const outDir = path.resolve('C:/Users/Ayush/.gemini/antigravity/brain/a07b0288-92a2-43e6-812b-95ae60a52c22/step_guidance_screenshots');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // 1. Desktop Dark Mode Capture
  const contextDark = await browser.newContext({
    viewport: { width: 1440, height: 960 },
    deviceScaleFactor: 2,
  });
  const pageDark = await contextDark.newPage();
  await pageDark.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  await pageDark.evaluate(() => {
    localStorage.setItem('applywise_theme', 'dark');
    localStorage.setItem('applyvise_black_appearance', 'dark');
    document.documentElement.classList.remove('light');
    document.documentElement.classList.add('dark');
    document.documentElement.setAttribute('data-theme-mode', 'dark');
    document.documentElement.setAttribute('data-be-appearance', 'dark');
    window.dispatchEvent(new Event('storage'));
  });
  await pageDark.reload({ waitUntil: 'networkidle' });
  await pageDark.waitForTimeout(800);

  const journeyDark = await pageDark.locator('#journey');
  await journeyDark.scrollIntoViewIfNeeded();
  await pageDark.waitForTimeout(400);
  await journeyDark.screenshot({
    path: path.join(outDir, '01_step_guidance_desktop_dark.png'),
  });
  console.log('Captured 01_step_guidance_desktop_dark.png');

  // 2. Desktop Light Mode Capture (Verify light mode remains unaffected)
  const contextLight = await browser.newContext({
    viewport: { width: 1440, height: 960 },
    deviceScaleFactor: 2,
  });
  const pageLight = await contextLight.newPage();
  await pageLight.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  await pageLight.evaluate(() => {
    localStorage.setItem('applywise_theme', 'light');
    localStorage.setItem('applyvise_black_appearance', 'light');
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
    document.documentElement.setAttribute('data-theme-mode', 'light');
    document.documentElement.setAttribute('data-be-appearance', 'light');
    window.dispatchEvent(new Event('storage'));
  });
  await pageLight.reload({ waitUntil: 'networkidle' });
  await pageLight.waitForTimeout(800);

  const journeyLight = await pageLight.locator('#journey');
  await journeyLight.scrollIntoViewIfNeeded();
  await pageLight.waitForTimeout(400);
  await journeyLight.screenshot({
    path: path.join(outDir, '02_step_guidance_desktop_light.png'),
  });
  console.log('Captured 02_step_guidance_desktop_light.png');

  // 3. Mobile Dark Mode Capture
  const contextMobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  const pageMobile = await contextMobile.newPage();
  await pageMobile.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  await pageMobile.evaluate(() => {
    localStorage.setItem('applywise_theme', 'dark');
    localStorage.setItem('applyvise_black_appearance', 'dark');
    document.documentElement.classList.remove('light');
    document.documentElement.classList.add('dark');
    document.documentElement.setAttribute('data-theme-mode', 'dark');
    document.documentElement.setAttribute('data-be-appearance', 'dark');
    window.dispatchEvent(new Event('storage'));
  });
  await pageMobile.reload({ waitUntil: 'networkidle' });
  await pageMobile.waitForTimeout(800);

  const journeyMobile = await pageMobile.locator('#journey');
  await journeyMobile.scrollIntoViewIfNeeded();
  await pageMobile.waitForTimeout(400);
  await journeyMobile.screenshot({
    path: path.join(outDir, '03_step_guidance_mobile_dark.png'),
  });
  console.log('Captured 03_step_guidance_mobile_dark.png');

  await browser.close();
  console.log('Finished capturing all verification screenshots.');
}

main().catch(err => {
  console.error('Error running capture script:', err);
  process.exit(1);
});
