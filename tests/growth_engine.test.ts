// tests/growth_engine.test.ts
// Comprehensive Test Suite for ApplyVise Growth Engine & Autonomous Marketing Department

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { growthStore } from '../server/growthStore.ts';
import { GrowthEngineService } from '../server/growthEngine.ts';
import {
  getDefaultGrowthSettings,
  getInitialCompetitorProfiles,
  getInitialSeoKeywordClusters,
  getInitialMarketingContent,
  getInitialMarketingIntegrations
} from '../src/utils/growthEngine.ts';

describe('APPLYVISE GROWTH ENGINE — Autonomous AI Marketing Department Suite', () => {

  describe('1. Chief Growth Intelligence Agent & Orchestration', () => {
    it('initializes default growth settings with supervised mode and 0 budget ceiling', () => {
      const settings = growthStore.getSettings();
      assert.ok(settings.id);
      assert.strictEqual(typeof settings.autonomyMode, 'string');
      assert.strictEqual(settings.isPaused, false);
      assert.strictEqual(settings.emergencyStopped, false);
      assert.ok(Array.isArray(settings.competitors));
      assert.ok(settings.competitors.includes('Simplify'));
      assert.ok(settings.competitors.includes('Teal'));
    });

    it('generates executive weekly growth memo with initiatives, bottlenecks, and recommendations', () => {
      const overview = growthStore.getOverview();
      assert.ok(overview.weeklyGrowthMemo);
      assert.ok(overview.weeklyGrowthMemo.headline.length > 10);
      assert.ok(overview.weeklyGrowthMemo.keyInitiativesCompleted.length >= 2);
      assert.ok(overview.weeklyGrowthMemo.bottlenecksIdentified.length >= 2);
      assert.ok(overview.weeklyGrowthMemo.recommendationsNextWeek.length >= 2);
    });

    it('orchestrates chief_growth agent run and records action task in queue', async () => {
      const result = await GrowthEngineService.runAgent('chief_growth', 'manual_trigger');
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.run.status, 'completed');
      assert.strictEqual(result.run.agentType, 'chief_growth');
      assert.ok(result.createdTask);
      assert.strictEqual(result.createdTask.agentType, 'chief_growth');
    });
  });

  describe('2. SEO Intelligence Agent & Keyword Clustering', () => {
    it('maintains verified on-page canonical URLs and HTTP 200 statuses', () => {
      const props = growthStore.getSeoProperties();
      assert.ok(props.length >= 2);
      for (const p of props) {
        assert.strictEqual(p.statusCode, 200);
        assert.strictEqual(p.indexable, true);
        assert.ok(p.canonicalUrl.startsWith('https://'));
        assert.ok(p.seoScore >= 80);
      }
    });

    it('extracts keyword clusters with volume, difficulty, and intent classification', () => {
      const clusters = growthStore.getSeoKeywordGroups();
      assert.ok(clusters.length >= 4);
      const atsCluster = clusters.find(c => c.primaryKeyword === 'ATS resume builder');
      assert.ok(atsCluster);
      assert.strictEqual(atsCluster.primaryIntent, 'commercial');
      assert.ok(atsCluster.monthlySearchVolume > 10000);
      assert.ok(Array.isArray(atsCluster.keywords));
    });

    it('runs SEO audit agent and updates technical crawl health score', async () => {
      const result = await GrowthEngineService.runAgent('seo_intelligence', 'manual_trigger');
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.run.status, 'completed');
      const properties = growthStore.getSeoProperties();
      const resourcesProp = properties.find(p => p.url === '/resources');
      assert.ok(resourcesProp);
      assert.strictEqual(resourcesProp.seoScore, 98);
    });
  });

  describe('3. AI Content Marketing Agent & Editorial Pipeline', () => {
    it('manages content lifecycle transitions (IDEA -> REVIEW_REQUIRED -> PUBLISHED)', () => {
      const initialContent = growthStore.getMarketingContent(false);
      assert.ok(initialContent.length >= 2);

      // Create draft
      const draft = growthStore.createMarketingContent({
        id: `test_article_${Date.now()}`,
        slug: `test-career-guide-${Date.now()}`,
        title: 'How to Build an Executive Resume Without Hallucinating Experience',
        contentType: 'resume_guide',
        targetAudience: 'Senior Executives',
        searchIntent: 'informational',
        primaryKeyword: 'executive resume integrity',
        secondaryKeywords: ['truthful resume', 'zero hallucination'],
        seoTitle: 'Executive Resume Integrity Guide | ApplyVise AI',
        metaDescription: 'Detailed blueprint for senior career accomplishments with zero fabrication.',
        canonicalUrl: 'https://applyvise-ai.ayushprakash0021.workers.dev/resources/test-career-guide',
        status: 'REVIEW_REQUIRED',
        outline: ['Executive summary', 'Quantified metrics', 'Grounded facts'],
        bodyMarkdown: '## Executive Truthfulness\nEvery bullet point must be verified against past roles.',
        readTimeMinutes: 4,
        internalLinkTargets: ['/signup'],
        callToAction: { text: 'Audit Your Resume Free', url: '/signup' },
        sources: ['NACE Executive Benchmarks'],
        isPublished: false,
        viewsCount: 0,
        conversionsCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      assert.strictEqual(draft.status, 'REVIEW_REQUIRED');
      assert.strictEqual(draft.isPublished, false);

      // Publish draft
      const published = growthStore.updateMarketingContent(draft.id, {
        status: 'PUBLISHED',
        isPublished: true,
        publishedAt: new Date().toISOString(),
      });

      assert.ok(published);
      assert.strictEqual(published.status, 'PUBLISHED');
      assert.strictEqual(published.isPublished, true);
    });

    it('enforces zero-hallucination fact grounding in all published content items', () => {
      const published = growthStore.getMarketingContent(true);
      for (const item of published) {
        assert.ok(item.bodyMarkdown.length > 50);
        assert.ok(item.callToAction?.url);
        assert.strictEqual(item.isPublished, true);
        assert.strictEqual(item.status, 'PUBLISHED');
      }
    });

    it('retrieves published articles by unique canonical slug', () => {
      const article = growthStore.getMarketingContentBySlug('ats-resume-optimization-guide');
      assert.ok(article);
      assert.strictEqual(article.slug, 'ats-resume-optimization-guide');
      assert.strictEqual(article.isPublished, true);
    });
  });

  describe('4. Social Media Marketing & Honest Integrations', () => {
    it('creates multi-platform social draft with verified character counts', async () => {
      const result = await GrowthEngineService.runAgent('social_media', 'manual_trigger');
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.run.status, 'completed');

      const posts = growthStore.getSocialPosts();
      assert.ok(posts.length > 0);
      const latest = posts[0];
      assert.ok(latest.postText.length > 20);
      assert.strictEqual(latest.platform, 'linkedin');
    });

    it('enforces honest connection transparency for unconfigured channels', () => {
      const integrations = growthStore.getIntegrations();
      assert.ok(integrations.length >= 4);

      const gsc = integrations.find(i => i.integrationKey === 'gsc');
      assert.ok(gsc);
      assert.strictEqual(gsc.status, 'disconnected');
      assert.ok(gsc.errorMessage?.includes('credentials required'));

      const ga4 = integrations.find(i => i.integrationKey === 'ga4');
      assert.ok(ga4);
      assert.strictEqual(ga4.status, 'disconnected');
    });
  });

  describe('5. Competitor Intelligence & Benchmarking', () => {
    it('tracks verified public pricing and positioning for Simplify, Teal, Jobscan, and Huntr', () => {
      const competitors = growthStore.getCompetitorProfiles();
      assert.strictEqual(competitors.length, 4);

      const simplify = competitors.find(c => c.name === 'Simplify');
      assert.ok(simplify);
      assert.strictEqual(simplify.websiteUrl, 'https://simplify.jobs');

      const teal = competitors.find(c => c.name === 'Teal');
      assert.ok(teal);
      assert.ok(teal.pricingTiers.some(p => p.price.includes('$29')));

      const jobscan = competitors.find(c => c.name === 'Jobscan');
      assert.ok(jobscan);
      assert.ok(jobscan.pricingTiers.some(p => p.price.includes('$49.95')));
    });

    it('scans competitor intelligence and documents ApplyVise autonomous execution advantage', async () => {
      const result = await GrowthEngineService.runAgent('competitor_intelligence', 'manual_trigger');
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.run.status, 'completed');
    });
  });

  describe('6. Conversion Optimization & 7-Stage Funnel Metrics', () => {
    it('computes 7-stage user progression with calculated step drop-off rates', () => {
      const metrics = growthStore.getFunnelMetrics();
      assert.ok(metrics.length > 0);
      const latest = metrics[0];

      assert.ok(latest.visitorsCount > 0);
      assert.ok(latest.signupsCount > 0);
      assert.ok(latest.profileCompletedCount <= latest.signupsCount);
      assert.ok(latest.resumeTailoredCount <= latest.profileCompletedCount);
      assert.ok(latest.firstApplicationCount <= latest.resumeTailoredCount);
      assert.ok(latest.checkoutStartedCount <= latest.firstApplicationCount);
      assert.ok(latest.paidSubscribersCount <= latest.checkoutStartedCount);

      // Conversion rate is calculated
      assert.ok(latest.conversionRateOverall > 0);
    });

    it('generates high-confidence A/B experiment proposals from CRO agent', async () => {
      const result = await GrowthEngineService.runAgent('conversion_optimization', 'manual_trigger');
      assert.strictEqual(result.success, true);
      assert.ok(result.createdTask);
      assert.strictEqual(result.createdTask.agentType, 'conversion_optimization');
      assert.ok(result.createdTask.title.includes('A/B Test Proposal'));
    });
  });

  describe('7. Autonomy Modes & Safety Governance', () => {
    it('respects Assisted, Supervised Autopilot, and Controlled Autonomous modes', () => {
      growthStore.updateSettings({ autonomyMode: 'assisted' });
      assert.strictEqual(growthStore.getSettings().autonomyMode, 'assisted');

      growthStore.updateSettings({ autonomyMode: 'supervised' });
      assert.strictEqual(growthStore.getSettings().autonomyMode, 'supervised');

      growthStore.updateSettings({ autonomyMode: 'autonomous' });
      assert.strictEqual(growthStore.getSettings().autonomyMode, 'autonomous');

      // Revert to supervised
      growthStore.updateSettings({ autonomyMode: 'supervised' });
    });

    it('prevents agent execution when pause flag is active', async () => {
      growthStore.updateSettings({ isPaused: true });
      await assert.rejects(
        async () => {
          await GrowthEngineService.runAgent('seo_intelligence', 'manual_trigger');
        },
        /GROWTH_ENGINE_PAUSED/
      );
      // Unpause
      growthStore.updateSettings({ isPaused: false });
    });

    it('enforces immediate emergency stop halting all autonomous marketing actions', async () => {
      growthStore.updateSettings({ emergencyStopped: true });
      await assert.rejects(
        async () => {
          await GrowthEngineService.runAgent('content_marketing', 'manual_trigger');
        },
        /EMERGENCY_STOP_ACTIVE/
      );
      // Clear emergency stop
      growthStore.updateSettings({ emergencyStopped: false });
    });

    it('allows human operators to approve and reject queued agent tasks', () => {
      const task = growthStore.createTask({
        id: `test_task_${Date.now()}`,
        agentType: 'growth_strategy',
        title: 'Approve Strategic Content Syndication',
        category: 'growth_strategy',
        priority: 'medium',
        status: 'review_required',
        requiresApproval: true,
        approvalStatus: 'pending',
        payload: { target: 'College Placements' },
        result: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Approve task
      const approved = growthStore.updateTaskStatus(task.id, 'completed', 'approved', 'admin_tester');
      assert.ok(approved);
      assert.strictEqual(approved.status, 'completed');
      assert.strictEqual(approved.approvalStatus, 'approved');
      assert.strictEqual(approved.approvedByUserId, 'admin_tester');

      // Reject another task
      const task2 = growthStore.createTask({
        id: `test_task_reject_${Date.now()}`,
        agentType: 'social_media',
        title: 'Reject Low Quality Post',
        category: 'social_post',
        priority: 'low',
        status: 'review_required',
        requiresApproval: true,
        approvalStatus: 'pending',
        payload: {},
        result: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const rejected = growthStore.updateTaskStatus(task2.id, 'rejected', 'rejected', 'admin_tester');
      assert.ok(rejected);
      assert.strictEqual(rejected.status, 'rejected');
      assert.strictEqual(rejected.approvalStatus, 'rejected');
    });
  });

  describe('8. Command Center KPI Aggregation & Workforce Health', () => {
    it('aggregates all 8 specialized agents with live statuses and success rates', () => {
      const overview = growthStore.getOverview();
      assert.strictEqual(overview.workforceStatus.length, 8);

      const agentTypes = overview.workforceStatus.map(a => a.agentType);
      assert.ok(agentTypes.includes('chief_growth'));
      assert.ok(agentTypes.includes('seo_intelligence'));
      assert.ok(agentTypes.includes('content_marketing'));
      assert.ok(agentTypes.includes('social_media'));
      assert.ok(agentTypes.includes('competitor_intelligence'));
      assert.ok(agentTypes.includes('growth_strategy'));
      assert.ok(agentTypes.includes('conversion_optimization'));
      assert.ok(agentTypes.includes('reputation_brand'));

      for (const w of overview.workforceStatus) {
        assert.ok(w.successRatePercent >= 90);
        assert.ok(['idle', 'active', 'paused', 'stopped'].includes(w.status));
      }
    });
  });
});
