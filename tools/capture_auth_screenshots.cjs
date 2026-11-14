const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const outDir = 'C:\\Users\\Ayush\\.gemini\\antigravity\\brain\\a07b0288-92a2-43e6-812b-95ae60a52c22\\auth_screenshots';
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function capture() {
  const browser = await chromium.launch({ headless: true });

  const viewports = [
    { name: 'desktop_1920x1080', width: 1920, height: 1080 },
    { name: 'laptop_1366x768', width: 1366, height: 768 },
    { name: 'tablet_768x1024', width: 768, height: 1024 },
    { name: 'mobile_375x812', width: 375, height: 812 },
  ];

  // Helper to set theme in page
  async function setTheme(page, appearance) {
    await page.evaluate((appMode) => {
      localStorage.setItem('applyvise_be_appearance', appMode);
      if (window.__APPLYVISE_THEME__?.setAppearance) {
        window.__APPLYVISE_THEME__.setAppearance(appMode);
      } else {
        const root = document.documentElement;
        const body = document.body;
        root.setAttribute('data-be-appearance', appMode);
        root.setAttribute('data-theme-mode', appMode);
        body.setAttribute('data-be-appearance', appMode);
        body.setAttribute('data-theme-mode', appMode);
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
    }, appearance);
    await page.waitForTimeout(400);
  }

  // 1. Desktop 1920x1080 - Light & Dark Modes
  console.log('Capturing Desktop 1920x1080...');
  const deskContext = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const deskPage = await deskContext.newPage();

  // Login Light
  await deskPage.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
  await setTheme(deskPage, 'light');
  await deskPage.screenshot({ path: path.join(outDir, '01_login_desktop_light.png'), fullPage: false });

  // Login Dark
  await setTheme(deskPage, 'dark');
  await deskPage.screenshot({ path: path.join(outDir, '02_login_desktop_dark.png'), fullPage: false });

  // Signup Light
  await deskPage.goto('http://localhost:3000/signup', { waitUntil: 'networkidle' });
  await setTheme(deskPage, 'light');
  await deskPage.screenshot({ path: path.join(outDir, '03_signup_desktop_light.png'), fullPage: false });

  // Signup Dark
  await setTheme(deskPage, 'dark');
  await deskPage.screenshot({ path: path.join(outDir, '04_signup_desktop_dark.png'), fullPage: false });

  // Forgot Password Light & Dark
  await deskPage.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
  await setTheme(deskPage, 'light');
  const forgotBtn = await deskPage.$('button:has-text("Forgot password?")');
  if (forgotBtn) {
    await forgotBtn.click();
    await deskPage.waitForTimeout(300);
    await deskPage.screenshot({ path: path.join(outDir, '05_forgot_password_desktop_light.png'), fullPage: false });
    await setTheme(deskPage, 'dark');
    await deskPage.screenshot({ path: path.join(outDir, '06_forgot_password_desktop_dark.png'), fullPage: false });
  }
  await deskContext.close();

  // 2. Responsive viewports (Laptop, Tablet, Mobile)
  for (const vp of viewports.slice(1)) {
    console.log(`Capturing ${vp.name}...`);
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const p = await ctx.newPage();

    // Login Light
    await p.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
    await setTheme(p, 'light');
    await p.screenshot({ path: path.join(outDir, `07_login_${vp.name}_light.png`), fullPage: false });

    // Signup Light
    await p.goto('http://localhost:3000/signup', { waitUntil: 'networkidle' });
    await setTheme(p, 'light');
    await p.screenshot({ path: path.join(outDir, `08_signup_${vp.name}_light.png`), fullPage: false });

    await ctx.close();
  }

  await browser.close();
  console.log('Finished capturing all authentication screenshots in: ' + outDir);
}

capture().catch(err => {
  console.error('Error capturing auth screenshots:', err);
  process.exit(1);
});
