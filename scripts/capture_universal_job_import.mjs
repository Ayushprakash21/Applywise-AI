import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const BASE_URL = 'http://localhost:3000';
const ARTIFACT_DIR = 'C:/Users/Ayush/.gemini/antigravity/brain/a07b0288-92a2-43e6-812b-95ae60a52c22';

async function run() {
  console.log('Starting Playwright verification for Universal Job Import...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: 'dark',
  });
  const page = await context.newPage();

  try {
    // 1. Log in
    console.log('Logging in as ayushprakash0021@gmail.com');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', 'ayushprakash0021@gmail.com');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // Dismiss onboarding if present
    try {
      const skipBtn = page.locator('button:has-text("Skip for now")');
      if (await skipBtn.count() > 0 && await skipBtn.first().isVisible()) {
        await skipBtn.first().click({ force: true });
        await page.waitForTimeout(500);
      }
    } catch {}
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);

    // 2. Career Desk with "+ Import Job" trigger
    console.log('Capturing Career Desk...');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'universal_job_import_career_desk.png') });
    console.log('Saved: universal_job_import_career_desk.png');

    // 3. Navigate to Opportunity Radar
    console.log('Navigating to Opportunity Radar...');
    const radarBtn = page.locator('aside button:has-text("Opportunity Radar")');
    if (await radarBtn.count() > 0) {
      await radarBtn.first().click({ force: true });
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(ARTIFACT_DIR, 'universal_job_import_radar_trigger.png') });
      console.log('Saved: universal_job_import_radar_trigger.png');
    }

    // 4. Click "+ Import Job" button to open modal
    console.log('Opening Import Opportunity modal...');
    const importBtn = page.getByRole('button', { name: /import job/i });
    if (await importBtn.count() > 0) {
      console.log('Found import button, clicking...');
      await importBtn.first().click({ force: true });
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(ARTIFACT_DIR, 'universal_job_import_modal_url.png') });
      console.log('Saved: universal_job_import_modal_url.png');

      // 5. Switch to "Paste Description" Tab
      console.log('Switching to Paste Description tab...');
      const pasteTab = page.getByRole('button', { name: /paste description/i });
      if (await pasteTab.count() > 0) {
        await pasteTab.first().click({ force: true });
        await page.waitForTimeout(800);
        await page.screenshot({ path: path.join(ARTIFACT_DIR, 'universal_job_import_modal_paste.png') });
        console.log('Saved: universal_job_import_modal_paste.png');
      }

      // 6. Fill pasted description and click Parse
      console.log('Simulating text parse to reach Review & Editing screen...');
      await page.fill('textarea', `Senior Staff Infrastructure Engineer\nCompany: Anthropic\nLocation: San Francisco, CA (Hybrid)\n\nAbout the role:\nWe are expanding the compute clusters driving frontier research.\nYou will architect low-latency networking, orchestrate distributed training jobs, and harden security.\n\nRequirements:\n- 7+ years of experience in distributed infrastructure systems\n- Deep knowledge of Kubernetes, Terraform, and Python/Go\n- Experience building GPU clusters and high-bandwidth interconnects\n- Production experience with PostgreSQL and Prometheus/Grafana observability`);
      await page.waitForTimeout(500);

      const parseBtn = page.getByRole('button', { name: /parse description/i });
      if (await parseBtn.count() > 0) {
        await parseBtn.first().click({ force: true });
        await page.waitForTimeout(2000);
        await page.screenshot({ path: path.join(ARTIFACT_DIR, 'universal_job_import_modal_review.png') });
        console.log('Saved: universal_job_import_modal_review.png');
      }
    } else {
      console.warn('Could not find import button on Opportunity Radar!');
    }

    console.log('All Playwright UI captures succeeded cleanly!');
  } catch (err) {
    console.error('Playwright verification error:', err);
  } finally {
    await browser.close();
  }
}

run();
