const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const publicShowcaseDir = path.resolve(__dirname, '../public/showcase');
if (!fs.existsSync(publicShowcaseDir)) {
  fs.mkdirSync(publicShowcaseDir, { recursive: true });
}

async function captureProductShowcase() {
  console.log('📸 Capturing genuine ApplyVise product visuals for CircularCarousel...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1200, height: 800 } });
  const page = await context.newPage();

  // Seed authentic candidate profile & auth token
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    const mockUser = {
      id: 'usr_showcase_01',
      fullName: 'Alex Rivera',
      email: 'alex.rivera@example.com',
      role: 'candidate',
      plan: 'black',
      currentTitle: 'Senior Full Stack Engineer',
      targetRole: 'Staff Software Architect'
    };
    localStorage.setItem('applyvise_auth_token', 'mock_jwt_showcase_123');
    localStorage.setItem('applyvise_user', JSON.stringify(mockUser));
    localStorage.setItem('applyvise_be_appearance', 'light');
    localStorage.setItem('applyvise_be_palette', 'dune');
    if (window.__APPLYVISE_THEME__?.setAppearance) {
      window.__APPLYVISE_THEME__.setAppearance('light');
    }
  });

  const targets = [
    {
      name: '01-job-discovery.png',
      url: 'http://localhost:3000/jobs',
      selector: 'main, .dashboard-content, [role="main"], #root'
    },
    {
      name: '02-resume-studio.png',
      url: 'http://localhost:3000/resume_studio',
      selector: 'main, .dashboard-content, [role="main"], #root'
    },
    {
      name: '03-career-intelligence.png',
      url: 'http://localhost:3000/career_twin',
      selector: 'main, .dashboard-content, [role="main"], #root'
    },
    {
      name: '04-recruiter-intelligence.png',
      url: 'http://localhost:3000/dashboard/hr-outreach',
      selector: 'main, .dashboard-content, [role="main"], #root'
    },
    {
      name: '05-application-tracker.png',
      url: 'http://localhost:3000/applications',
      selector: 'main, .dashboard-content, [role="main"], #root'
    },
    {
      name: '06-ai-assistant.png',
      url: 'http://localhost:3000/dashboard/ai-autopilot',
      selector: 'main, .dashboard-content, [role="main"], #root'
    }
  ];

  for (const target of targets) {
    try {
      console.log(`Navigating to ${target.url}...`);
      await page.goto(target.url, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(800);
      const outPath = path.join(publicShowcaseDir, target.name);
      await page.screenshot({ path: outPath, clip: { x: 40, y: 70, width: 1120, height: 700 } });
      console.log(`Saved ${target.name}`);
    } catch (err) {
      console.error(`Failed to capture ${target.name}:`, err.message);
    }
  }

  await browser.close();
  console.log('🎉 Product showcase capture complete!');
}

captureProductShowcase().catch(err => {
  console.error(err);
  process.exit(1);
});
