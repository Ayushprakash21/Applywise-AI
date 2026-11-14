const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT_DIR = path.resolve('C:/Users/Ayush/.gemini/antigravity/brain/a07b0288-92a2-43e6-812b-95ae60a52c22/footer_branding_screenshots');

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function capture() {
  console.log('🚀 Starting Footer Branding Screenshot Verification across Desktop, Tablet, Mobile (Light & Dark)...');
  const browser = await chromium.launch({ headless: true });

  const viewports = [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'mobile', width: 375, height: 812 },
  ];

  try {
    for (const vp of viewports) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
      });
      const page = await context.newPage();

      // Light Mode
      console.log(`📸 Capturing ${vp.name} Homepage Footer (Light Mode)...`);
      await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
      await page.evaluate(() => {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('applyvise_theme', 'light');
      });
      await page.waitForTimeout(600);
      const footerElement = await page.$('footer');
      if (footerElement) {
        await footerElement.scrollIntoViewIfNeeded();
        await page.waitForTimeout(300);
        await footerElement.screenshot({
          path: path.join(OUT_DIR, `${vp.name}_footer_light.png`),
        });
      }

      // Dark Mode
      console.log(`📸 Capturing ${vp.name} Homepage Footer (Dark Mode)...`);
      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
        localStorage.setItem('applyvise_theme', 'dark');
      });
      await page.waitForTimeout(600);
      if (footerElement) {
        await footerElement.scrollIntoViewIfNeeded();
        await page.waitForTimeout(300);
        await footerElement.screenshot({
          path: path.join(OUT_DIR, `${vp.name}_footer_dark.png`),
        });
      }

      await context.close();
    }

    // Capture About page footer & Dashboard footer
    const desktopContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const deskPage = await desktopContext.newPage();

    console.log('📸 Capturing About Page Footer (Desktop)...');
    await deskPage.goto('http://localhost:3000/about', { waitUntil: 'networkidle' });
    const aboutFooter = await deskPage.$('footer');
    if (aboutFooter) {
      await aboutFooter.scrollIntoViewIfNeeded();
      await deskPage.waitForTimeout(300);
      await aboutFooter.screenshot({
        path: path.join(OUT_DIR, 'about_page_footer.png'),
      });
    }

    console.log(`✅ All footer branding screenshots captured in: ${OUT_DIR}`);
    await desktopContext.close();
  } catch (err) {
    console.error('❌ Error during capture:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

capture();
