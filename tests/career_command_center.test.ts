import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('Unified Career Operating System & Command Center Architecture', async (t) => {
  const shellPath = path.resolve(process.cwd(), 'src/components/DashboardShell.tsx');
  const commandCenterPath = path.resolve(process.cwd(), 'src/components/CareerCommandCenter.tsx');
  const interviewsPath = path.resolve(process.cwd(), 'src/components/InterviewsPage.tsx');
  const reportPath = path.resolve(process.cwd(), 'src/components/CareerIntelligenceReport.tsx');
  const appPath = path.resolve(process.cwd(), 'src/App.tsx');
  const workerPath = path.resolve(process.cwd(), 'worker/index.ts');
  const apiPath = path.resolve(process.cwd(), 'src/services/api.ts');

  assert.ok(fs.existsSync(shellPath), 'DashboardShell.tsx must exist');
  assert.ok(fs.existsSync(commandCenterPath), 'CareerCommandCenter.tsx must exist');
  assert.ok(fs.existsSync(interviewsPath), 'InterviewsPage.tsx must exist');
  assert.ok(fs.existsSync(reportPath), 'CareerIntelligenceReport.tsx must exist');
  assert.ok(fs.existsSync(appPath), 'App.tsx must exist');
  assert.ok(fs.existsSync(workerPath), 'worker/index.ts must exist');
  assert.ok(fs.existsSync(apiPath), 'src/services/api.ts must exist');

  const shellSource = fs.readFileSync(shellPath, 'utf8');
  const commandSource = fs.readFileSync(commandCenterPath, 'utf8');
  const interviewsSource = fs.readFileSync(interviewsPath, 'utf8');
  const reportSource = fs.readFileSync(reportPath, 'utf8');
  const appSource = fs.readFileSync(appPath, 'utf8');
  const workerSource = fs.readFileSync(workerPath, 'utf8');
  const apiSource = fs.readFileSync(apiPath, 'utf8');

  await t.test('Question 1: Where do I stand in my career? (Metrics & Overview)', () => {
    // 4 Key Metric Cards
    assert.match(commandSource, /Profile Completion/i, 'Metrics card: Profile Completion');
    assert.match(commandSource, /Relevant Job Matches/i, 'Metrics card: Relevant Job Matches');
    assert.match(commandSource, /Active Applications/i, 'Metrics card: Active Applications');
    assert.match(commandSource, /Upcoming Interviews/i, 'Metrics card: Upcoming Interviews');
    assert.match(commandSource, /onNavigateTab\('profile'\)/, 'Profile metric is clickable and navigates to profile');
    assert.match(commandSource, /onNavigateTab\('matches'\)/, 'Matches metric is clickable and navigates to matches');
    assert.match(commandSource, /onNavigateTab\('applications'\)/, 'Applications metric is clickable and navigates to tracker');
    assert.match(commandSource, /onNavigateTab\('interviews'\)/, 'Interviews metric is clickable and navigates to interviews');
  });

  await t.test('Question 2: Which job opportunities are relevant to me? (Recommended Opportunities)', () => {
    assert.match(commandSource, /Recommended Job Opportunities/i, 'Recommended jobs section header');
    assert.match(commandSource, /highMatches\.map/, 'Maps over real evaluated vacancies');
    assert.match(commandSource, /onSelectVacancy/, 'Selecting vacancy triggers inspection modal/drawer');
    assert.match(commandSource, /Zero-Hallucination Factual Guarantee|Match scores are estimates/i, 'Truthful disclaimer without hallucination');
  });

  await t.test('Question 3: What should I do next? (Next Best Action)', () => {
    assert.match(commandSource, /Your Recommended Action|Next Best Action|\/\/ Recommended Action/i, 'Next Best Action section title');
    assert.match(commandSource, /nextAction\.title/, 'Displays dynamic action title');
    assert.match(commandSource, /nextAction\.reason/, 'Displays transparent reason for the recommendation');
    assert.match(commandSource, /handleExecuteAction/, 'Action button handles routing by type');
  });

  await t.test('Question 4: What is happening with my applications? (Pipeline Stages)', () => {
    assert.match(commandSource, /Application Pipeline & Status Lifecycle/i, 'Application pipeline section');
    assert.match(commandSource, /Draft/i, 'Pipeline contains Draft stage');
    assert.match(commandSource, /Ready to Apply/i, 'Pipeline contains Ready to Apply stage');
    assert.match(commandSource, /Applied/i, 'Pipeline contains Applied stage');
    assert.match(commandSource, /Interview/i, 'Pipeline contains Interview stage');
    assert.match(commandSource, /Offer/i, 'Pipeline contains Offer stage');
  });

  await t.test('Question 5: How can I improve my chances? (Skills, Prep & Copilot)', () => {
    assert.match(commandSource, /Verified Career Twin Status/i, 'Career twin grounding');
    assert.match(commandSource, /AI Career Copilot/i, 'Copilot assistant section');
    assert.match(commandSource, /onAskCopilotPrompt/, 'Shortcut prompts stage queries to Copilot');
    assert.match(interviewsSource, /Verified STAR Talking Points/i, 'Interviews workspace provides STAR talking points');
    assert.match(reportSource, /Career Intelligence & Skill Gap Report/i, 'Full gap report component');
  });

  await t.test('Sidebar Navigation Structure Contract', () => {
    assert.match(shellSource, /WORKSPACE/, 'Sidebar category: WORKSPACE');
    assert.match(shellSource, /CAREER INTELLIGENCE/, 'Sidebar category: CAREER INTELLIGENCE');
    assert.match(shellSource, /ACCOUNT/, 'Sidebar category: ACCOUNT');
    assert.match(shellSource, /overview/, 'Workspace nav item: overview');
    assert.match(shellSource, /profile/, 'Workspace nav item: profile');
    assert.match(shellSource, /resume_intelligence/, 'Workspace nav item: resume_intelligence');
    assert.match(shellSource, /jobs/, 'Workspace nav item: jobs');
    assert.match(shellSource, /matches/, 'Workspace nav item: matches');
    assert.match(shellSource, /applications/, 'Workspace nav item: applications');
    assert.match(shellSource, /interviews/, 'Workspace nav item: interviews');
  });

  await t.test('Backend /api/dashboard/summary Contract & D1 Integration', () => {
    assert.match(workerSource, /app\.get\('\/api\/dashboard\/summary'/, 'Worker exposes /api/dashboard/summary endpoint');
    assert.match(workerSource, /profileCompletion/, 'Summary computes profileCompletion');
    assert.match(workerSource, /pipeline/, 'Summary computes pipeline status counts');
    assert.match(workerSource, /nextActions/, 'Summary computes nextActions list');
    assert.match(apiSource, /getDashboardSummary/, 'API client exposes getDashboardSummary method');
  });

  await t.test('Default Route on Login is Overview (Career Command Center)', () => {
    assert.match(appSource, /useState<DashboardTab>\('overview'\)/, 'App default active tab is overview');
    assert.match(appSource, /<CareerCommandCenter/, 'App renders CareerCommandCenter when activeTab is overview');
    assert.match(appSource, /<InterviewsPage/, 'App renders InterviewsPage when activeTab is interviews');
    assert.match(appSource, /<CareerIntelligenceReport/, 'App renders CareerIntelligenceReport when activeTab is career_report');
  });
});
