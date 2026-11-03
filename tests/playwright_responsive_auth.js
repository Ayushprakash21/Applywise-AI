import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import path from 'node:path';

const ARTIFACT_DIR = 'C:/Users/Ayush/.gemini/antigravity/brain/a07b0288-92a2-43e6-812b-95ae60a52c22';
const BASE_URL = 'http://localhost:4173';

const VIEWPORTS = [
  { width: 1920, height: 1080, name: 'desktop_1920x1080' },
  { width: 1914, height: 948,  name: 'desktop_1914x948' },
  { width: 1440, height: 900,  name: 'desktop_1440x900' },
  { width: 1366, height: 768,  name: 'laptop_1366x768' },
  { width: 1024, height: 768,  name: 'tablet_landscape_1024x768' },
  { width: 768,  height: 1024, name: 'tablet_portrait_768x1024' },
  { width: 390,  height: 844,  name: 'mobile_390x844' },
  { width: 360,  height: 800,  name: 'mobile_360x800' }
];

async function runTests() {
  console.log('--- STARTING PLAYWRIGHT RESPONSIVE AUTHENTICATION SUITE ---');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const results = [];

  for (const vp of VIEWPORTS) {
    console.log(`\nTesting viewport: ${vp.name} (${vp.width}x${vp.height})...`);
    const page = await browser.newPage({
      viewport: { width: vp.width, height: vp.height }
    });

    try {
      // 1. Direct route to /signup
      await page.goto(`${BASE_URL}/signup`, { waitUntil: 'networkidle' });
      await page.waitForSelector('#signup-name', { timeout: 5000 });

      // Measure card and elements
      const metrics = await page.evaluate(() => {
        const docScrollWidth = document.documentElement.scrollWidth;
        const winInnerWidth = window.innerWidth;
        const card = document.querySelector('.glass-auth-surface');
        const cardRect = card ? card.getBoundingClientRect() : null;
        const nameInput = document.querySelector('#signup-name');
        const nameRect = nameInput ? nameInput.getBoundingClientRect() : null;
        const emailInput = document.querySelector('#signup-email');
        const emailRect = emailInput ? emailInput.getBoundingClientRect() : null;
        const googleBtn = Array.from(document.querySelectorAll('button')).find(b => (b.innerText || '').includes('Google'));
        const googleRect = googleBtn ? googleBtn.getBoundingClientRect() : null;
        const h1 = document.querySelector('h1');
        const h1Rect = h1 ? h1.getBoundingClientRect() : null;

        return {
          scrollWidth: docScrollWidth,
          innerWidth: winInnerWidth,
          hasHorizontalOverflow: docScrollWidth > winInnerWidth + 1,
          cardWidth: cardRect ? cardRect.width : 0,
          cardHeight: cardRect ? cardRect.height : 0,
          nameInputWidth: nameRect ? nameRect.width : 0,
          emailInputWidth: emailRect ? emailRect.width : 0,
          googleBtnWidth: googleRect ? googleRect.width : 0,
          googleVisible: !!googleBtn && googleRect.height > 30,
          h1Height: h1Rect ? h1Rect.height : 0,
          h1Text: h1 ? h1.innerText : ''
        };
      });

      console.log(`  Card Width: ${metrics.cardWidth.toFixed(1)}px | Horizontal Overflow: ${metrics.hasHorizontalOverflow}`);
      console.log(`  Name Input Width: ${metrics.nameInputWidth.toFixed(1)}px | Google Button Visible: ${metrics.googleVisible}`);

      // Assertions
      assert.ok(!metrics.hasHorizontalOverflow, `Viewport ${vp.name} must not have horizontal overflow (scrollWidth=${metrics.scrollWidth}, innerWidth=${metrics.innerWidth})`);
      assert.ok(metrics.googleVisible, `Google auth button must be visible in ${vp.name}`);
      assert.ok(metrics.cardWidth > 280, `Card width (${metrics.cardWidth}px) must be substantial in ${vp.name}`);

      if (vp.width >= 1440) {
        // Desktop requirements: Card must be 480px–560px
        assert.ok(
          metrics.cardWidth >= 480 && metrics.cardWidth <= 560,
          `Desktop card width in ${vp.name} must be between 480px and 560px (actual: ${metrics.cardWidth.toFixed(1)}px)`
        );
        // Heading should fit on one line (height < 50px)
        assert.ok(metrics.h1Height <= 50, `Title in ${vp.name} should stay on one line (height: ${metrics.h1Height}px)`);
      } else if (vp.width < 768) {
        // Mobile requirements (< 768px): Card width should be approx calc(100% - 32px)
        assert.ok(metrics.cardWidth >= vp.width - 64, `Mobile card width (${metrics.cardWidth}px) should occupy full width with margins in ${vp.name}`);
      } else {
        // Tablet requirements (768px - 1439px): Single column centered card between 480px and 540px
        assert.ok(metrics.cardWidth >= 480 && metrics.cardWidth <= 540, `Tablet card width (${metrics.cardWidth}px) should be 480-540px in ${vp.name}`);
      }

      // Input relative width assertion: Inputs must occupy full available card width minus padding
      assert.ok(metrics.nameInputWidth >= metrics.cardWidth - 90, `Name input must occupy full width inside card (input: ${metrics.nameInputWidth}px, card: ${metrics.cardWidth}px)`);

      // Screenshot capture
      const screenshotPath = path.join(ARTIFACT_DIR, `auth_responsive_${vp.name}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: false });
      console.log(`  Screenshot saved: ${screenshotPath}`);

      // 2. Navigation from homepage test (in 1914x948)
      if (vp.name === 'desktop_1914x948') {
        console.log('  Testing route transition from Homepage (/) to /signup...');
        await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
        // Click Get Started in header
        const getStartedBtn = await page.locator('nav button, header button').filter({ hasText: /Get Started/i }).first();
        if (await getStartedBtn.isVisible()) {
          await getStartedBtn.click();
          await page.waitForURL('**/signup', { timeout: 3000 });
          const navigatedCardWidth = await page.evaluate(() => {
            const card = document.querySelector('.glass-auth-surface');
            return card ? card.getBoundingClientRect().width : 0;
          });
          console.log(`  Navigated /signup card width: ${navigatedCardWidth.toFixed(1)}px`);
          assert.ok(navigatedCardWidth >= 480 && navigatedCardWidth <= 560, 'Card width after navigation from homepage must be 480–560px');
        }
      }

      results.push({ viewport: vp.name, status: 'PASS', metrics });
    } catch (err) {
      console.error(`  FAIL in ${vp.name}:`, err.message);
      results.push({ viewport: vp.name, status: 'FAIL', error: err.message });
      throw err;
    } finally {
      await page.close();
    }
  }

  await browser.close();
  console.log('\n--- ALL 8 VIEWPORTS PASSED WITH ZERO REGRESSIONS ---');
  return results;
}

runTests().catch(err => {
  console.error('Test suite execution failed:', err);
  process.exit(1);
});
