const playwright = require('playwright');
const fs = require('fs');
const path = require('path');

const outDir = 'C:\\Users\\Ayush\\.gemini\\antigravity\\brain\\a07b0288-92a2-43e6-812b-95ae60a52c22\\brand_positioning_screenshots';
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

(async () => {
  console.log('🚀 Starting Brand Positioning Screenshot Verification...');
  const browser = await playwright.chromium.launch({ headless: true });

  // 1. Homepage Desktop & Footer
  {
    console.log('📸 Capturing Homepage Desktop & Footer...');
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);

    // Capture Hero
    await page.screenshot({ path: path.join(outDir, '01_homepage_hero.png') });

    // Scroll down to Footer
    const footer = page.locator('footer');
    if (await footer.count() > 0) {
      await footer.scrollIntoViewIfNeeded();
      await page.waitForTimeout(400);
      await footer.screenshot({ path: path.join(outDir, '02_homepage_footer.png') });
    }

    await context.close();
  }

  // 2. Sign In Modal / View
  {
    console.log('📸 Capturing Sign In...');
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    
    // Click Sign In button
    const signInBtn = page.locator('[data-testid="sign-in-button"]');
    if (await signInBtn.count() > 0) {
      await signInBtn.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(outDir, '03_signin.png') });
    }

    await context.close();
  }

  // 3. Sign Up Modal / View
  {
    console.log('📸 Capturing Sign Up...');
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);

    // Click Getting Started button
    const getStartedBtn = page.locator('[data-testid="getting-started-button"]');
    if (await getStartedBtn.count() > 0) {
      await getStartedBtn.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(outDir, '04_signup.png') });
    }

    await context.close();
  }

  // 4. Pricing Page
  {
    console.log('📸 Capturing Pricing Page...');
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await page.goto('http://localhost:3000/pricing', { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(outDir, '05_pricing_page.png') });
    await context.close();
  }

  // 5. Candidate Dashboard
  {
    console.log('📸 Capturing Candidate Dashboard...');
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    
    // Inject mock candidate session in storage
    await page.addInitScript(() => {
      const mockUser = {
        id: 'usr_brand_audit',
        email: 'candidate@applyvise.ai',
        fullName: 'Ayush Prakash',
        role: 'candidate',
        plan: 'pro'
      };
      localStorage.setItem('applyvise_auth_token', 'mock_jwt_token_for_audit');
      localStorage.setItem('applyvise_user', JSON.stringify(mockUser));
      localStorage.setItem('applyvise_be_appearance', 'light');
    });

    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(outDir, '06_candidate_dashboard.png') });
    await context.close();
  }

  // 6. Mobile Homepage
  {
    console.log('📸 Capturing Mobile Homepage...');
    const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
    const page = await context.newPage();
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(outDir, '07_mobile_homepage.png') });
    await context.close();
  }

  await browser.close();
  console.log('✅ All 7 brand positioning screenshots captured in:', outDir);
})();
