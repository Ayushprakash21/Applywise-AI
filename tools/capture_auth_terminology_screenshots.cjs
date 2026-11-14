const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT_DIR = path.resolve('C:/Users/Ayush/.gemini/antigravity/brain/a07b0288-92a2-43e6-812b-95ae60a52c22/auth_terminology_screenshots');

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function capture() {
  console.log('🚀 Starting Auth Terminology Screenshot Verification (Light & Dark Mode)...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  try {
    // 1. Login Light Mode
    console.log('📸 Capturing Sign In (Light Mode)...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
    await page.evaluate(() => {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('applyvise_theme', 'light');
    });
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(OUT_DIR, '01_signin_light.png'), fullPage: true });

    // 2. Login Dark Mode
    console.log('📸 Capturing Sign In (Dark Mode)...');
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
      localStorage.setItem('applyvise_theme', 'dark');
    });
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(OUT_DIR, '02_signin_dark.png'), fullPage: true });

    // 3. Signup Light Mode
    console.log('📸 Capturing Create Account / Sign Up (Light Mode)...');
    await page.goto('http://localhost:3000/signup', { waitUntil: 'networkidle' });
    await page.evaluate(() => {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('applyvise_theme', 'light');
    });
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(OUT_DIR, '03_signup_light.png'), fullPage: true });

    // 4. Signup Dark Mode
    console.log('📸 Capturing Create Account / Sign Up (Dark Mode)...');
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
      localStorage.setItem('applyvise_theme', 'dark');
    });
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(OUT_DIR, '04_signup_dark.png'), fullPage: true });

    // 5. About Page "Create Account" CTA
    console.log('📸 Capturing About Page "Create Account" CTA...');
    await page.goto('http://localhost:3000/about', { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(OUT_DIR, '05_about_create_account_cta.png'), fullPage: false });

    console.log(`✅ All auth terminology screenshots captured in: ${OUT_DIR}`);
  } catch (err) {
    console.error('❌ Error during capture:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

capture();
