-- migrations/0018_growth_engine.sql
-- APPLYVISE GROWTH ENGINE: Autonomous AI Marketing Department & Growth Intelligence System

-- 1. Growth Agent Settings & Autonomy Control
CREATE TABLE IF NOT EXISTS growth_agent_settings (
  id TEXT PRIMARY KEY,
  autonomy_mode TEXT NOT NULL DEFAULT 'supervised', -- 'assisted', 'supervised', 'autonomous'
  is_paused INTEGER NOT NULL DEFAULT 0,
  publishing_permission TEXT NOT NULL DEFAULT 'manual_approval', -- 'manual_approval', 'auto_publish_approved_categories'
  content_frequency_per_week INTEGER NOT NULL DEFAULT 3,
  budget_ceiling_monthly REAL NOT NULL DEFAULT 0.0,
  allowed_domains_json TEXT NOT NULL DEFAULT '["applyvise-ai.ayushprakash0021.workers.dev"]',
  target_keywords_json TEXT NOT NULL DEFAULT '["ATS resume builder", "AI job application", "career intelligence", "automated job applications", "free ATS resume checker"]',
  competitors_json TEXT NOT NULL DEFAULT '["Simplify", "Teal", "Huntr", "Jobscan"]',
  connected_channels_json TEXT NOT NULL DEFAULT '{"linkedin":false,"meta":false,"x":false,"youtube":false,"gsc":false,"ga4":false}',
  emergency_stopped INTEGER NOT NULL DEFAULT 0,
  last_run_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 2. Growth Agent Execution Runs
CREATE TABLE IF NOT EXISTS growth_agent_runs (
  id TEXT PRIMARY KEY,
  run_type TEXT NOT NULL, -- 'scheduled', 'manual_trigger', 'event_driven'
  agent_type TEXT NOT NULL, -- 'chief_growth', 'seo_intelligence', 'content_marketing', 'social_media', 'competitor_intelligence', 'growth_strategy', 'conversion_optimization', 'reputation_brand'
  status TEXT NOT NULL, -- 'running', 'completed', 'failed', 'aborted'
  metrics_json TEXT NOT NULL DEFAULT '{}',
  summary TEXT,
  error_message TEXT,
  started_at TEXT NOT NULL,
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_growth_runs_agent ON growth_agent_runs(agent_type);
CREATE INDEX IF NOT EXISTS idx_growth_runs_started ON growth_agent_runs(started_at);

-- 3. Growth Agent Action Tasks & Approvals
CREATE TABLE IF NOT EXISTS growth_agent_tasks (
  id TEXT PRIMARY KEY,
  agent_type TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL, -- 'seo_audit', 'keyword_research', 'content_draft', 'social_post', 'competitor_scan', 'funnel_analysis', 'growth_strategy', 'reputation_scan'
  priority TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'review_required', 'approved', 'rejected', 'completed', 'failed'
  payload_json TEXT NOT NULL DEFAULT '{}',
  result_json TEXT NOT NULL DEFAULT '{}',
  requires_approval INTEGER NOT NULL DEFAULT 1,
  approval_status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  approved_by_user_id TEXT,
  approved_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_growth_tasks_status ON growth_agent_tasks(status);
CREATE INDEX IF NOT EXISTS idx_growth_tasks_category ON growth_agent_tasks(category);

-- 4. SEO Properties (Crawled & Audited Pages)
CREATE TABLE IF NOT EXISTS seo_properties (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  meta_description TEXT NOT NULL,
  canonical_url TEXT NOT NULL,
  status_code INTEGER NOT NULL DEFAULT 200,
  indexable INTEGER NOT NULL DEFAULT 1,
  sitemap_present INTEGER NOT NULL DEFAULT 1,
  robots_directive TEXT NOT NULL DEFAULT 'index, follow',
  h1 TEXT,
  word_count INTEGER NOT NULL DEFAULT 0,
  structured_data_type TEXT,
  internal_inlinks_count INTEGER NOT NULL DEFAULT 0,
  internal_outlinks_count INTEGER NOT NULL DEFAULT 0,
  seo_score INTEGER NOT NULL DEFAULT 85,
  issues_json TEXT NOT NULL DEFAULT '[]',
  last_crawled_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_seo_props_url ON seo_properties(url);
CREATE INDEX IF NOT EXISTS idx_seo_props_score ON seo_properties(seo_score);

-- 5. SEO Keyword Clusters & Tracking
CREATE TABLE IF NOT EXISTS seo_keyword_groups (
  id TEXT PRIMARY KEY,
  cluster_name TEXT NOT NULL,
  primary_intent TEXT NOT NULL DEFAULT 'informational', -- 'informational', 'navigational', 'commercial', 'transactional'
  primary_keyword TEXT NOT NULL,
  keywords_json TEXT NOT NULL DEFAULT '[]',
  monthly_search_volume INTEGER NOT NULL DEFAULT 0,
  difficulty_score INTEGER NOT NULL DEFAULT 30,
  current_visibility REAL NOT NULL DEFAULT 0.0,
  target_content_url TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_seo_keywords_cluster ON seo_keyword_groups(cluster_name);

-- 6. SEO Comprehensive Audits
CREATE TABLE IF NOT EXISTS seo_audit_results (
  id TEXT PRIMARY KEY,
  audit_type TEXT NOT NULL DEFAULT 'full_site',
  health_score INTEGER NOT NULL DEFAULT 92,
  total_pages_crawled INTEGER NOT NULL DEFAULT 0,
  indexable_pages INTEGER NOT NULL DEFAULT 0,
  critical_issues_count INTEGER NOT NULL DEFAULT 0,
  warnings_count INTEGER NOT NULL DEFAULT 0,
  details_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

-- 7. Marketing Content Production Pipeline
CREATE TABLE IF NOT EXISTS marketing_content (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  content_type TEXT NOT NULL, -- 'career_guide', 'resume_guide', 'ats_optimization', 'interview_prep', 'job_search_strategy', 'product_tutorial', 'comparison_page', 'faq', 'newsletter', 'social_post'
  target_audience TEXT NOT NULL DEFAULT 'Job Seekers & Mid-Career Professionals',
  search_intent TEXT NOT NULL DEFAULT 'informational',
  primary_keyword TEXT NOT NULL,
  secondary_keywords_json TEXT NOT NULL DEFAULT '[]',
  seo_title TEXT NOT NULL,
  meta_description TEXT NOT NULL,
  canonical_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'IDEA', -- 'IDEA', 'RESEARCHING', 'BRIEF_READY', 'DRAFTING', 'REVIEW_REQUIRED', 'APPROVED', 'SCHEDULED', 'PUBLISHED', 'UPDATE_RECOMMENDED', 'ARCHIVED', 'FAILED'
  outline_json TEXT NOT NULL DEFAULT '[]',
  body_markdown TEXT NOT NULL DEFAULT '',
  featured_image_url TEXT,
  read_time_minutes INTEGER NOT NULL DEFAULT 5,
  internal_link_targets_json TEXT NOT NULL DEFAULT '[]',
  call_to_action_json TEXT NOT NULL DEFAULT '{"text":"Build ATS Resume Free","url":"/signup"}',
  sources_json TEXT NOT NULL DEFAULT '[]',
  is_published INTEGER NOT NULL DEFAULT 0,
  published_at TEXT,
  views_count INTEGER NOT NULL DEFAULT 0,
  conversions_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_marketing_content_slug ON marketing_content(slug);
CREATE INDEX IF NOT EXISTS idx_marketing_content_status ON marketing_content(status);
CREATE INDEX IF NOT EXISTS idx_marketing_content_type ON marketing_content(content_type);

-- 8. Editorial Content Calendar
CREATE TABLE IF NOT EXISTS marketing_calendar (
  id TEXT PRIMARY KEY,
  content_id TEXT REFERENCES marketing_content(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  channel TEXT NOT NULL, -- 'blog', 'linkedin', 'meta', 'x', 'youtube', 'newsletter'
  scheduled_for TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled', -- 'scheduled', 'published', 'cancelled', 'failed'
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_mkt_calendar_sched ON marketing_calendar(scheduled_for);

-- 9. Social Media Connected Accounts & Status
CREATE TABLE IF NOT EXISTS social_accounts (
  id TEXT PRIMARY KEY,
  platform TEXT NOT NULL UNIQUE, -- 'linkedin', 'meta', 'x', 'youtube'
  account_name TEXT NOT NULL,
  connection_status TEXT NOT NULL DEFAULT 'disconnected', -- 'connected', 'disconnected', 'expired', 'error'
  permissions_json TEXT NOT NULL DEFAULT '[]',
  last_sync_at TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 10. Social Media Posts & Content
CREATE TABLE IF NOT EXISTS social_posts (
  id TEXT PRIMARY KEY,
  platform TEXT NOT NULL,
  content_text TEXT NOT NULL,
  hashtags_json TEXT NOT NULL DEFAULT '[]',
  media_urls_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'review_required', 'approved', 'scheduled', 'published', 'failed'
  scheduled_at TEXT,
  published_at TEXT,
  engagement_impressions INTEGER NOT NULL DEFAULT 0,
  engagement_clicks INTEGER NOT NULL DEFAULT 0,
  engagement_likes INTEGER NOT NULL DEFAULT 0,
  engagement_shares INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_social_posts_platform ON social_posts(platform);
CREATE INDEX IF NOT EXISTS idx_social_posts_status ON social_posts(status);

-- 11. Competitor Intelligence Profiles
CREATE TABLE IF NOT EXISTS competitor_profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  website_url TEXT NOT NULL,
  positioning_summary TEXT NOT NULL,
  pricing_tiers_json TEXT NOT NULL DEFAULT '[]',
  key_features_json TEXT NOT NULL DEFAULT '[]',
  strengths_json TEXT NOT NULL DEFAULT '[]',
  weaknesses_json TEXT NOT NULL DEFAULT '[]',
  last_monitored_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 12. Competitor Observations & Activity Tracking
CREATE TABLE IF NOT EXISTS competitor_observations (
  id TEXT PRIMARY KEY,
  competitor_id TEXT REFERENCES competitor_profiles(id) ON DELETE CASCADE,
  observation_type TEXT NOT NULL, -- 'pricing_change', 'feature_release', 'messaging_shift', 'content_strategy'
  title TEXT NOT NULL,
  source_url TEXT NOT NULL,
  details TEXT NOT NULL,
  confidence_score REAL NOT NULL DEFAULT 0.95,
  strategic_takeaway TEXT NOT NULL,
  observed_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_comp_obs_type ON competitor_observations(observation_type);

-- 13. Marketing Growth Campaigns
CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  objective TEXT NOT NULL, -- 'brand_awareness', 'candidate_acquisition', 'pro_subscription_conversion', 'seo_authority'
  channel TEXT NOT NULL, -- 'organic_seo', 'content_marketing', 'social_media', 'referral', 'partnership', 'newsletter'
  status TEXT NOT NULL DEFAULT 'active', -- 'draft', 'active', 'paused', 'completed'
  start_date TEXT NOT NULL,
  end_date TEXT,
  budget_allocated REAL NOT NULL DEFAULT 0.0,
  budget_spent REAL NOT NULL DEFAULT 0.0,
  target_audience TEXT NOT NULL,
  tracking_utm_campaign TEXT NOT NULL,
  total_visitors INTEGER NOT NULL DEFAULT 0,
  signups_generated INTEGER NOT NULL DEFAULT 0,
  subscribers_generated INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_mkt_campaigns_status ON marketing_campaigns(status);

-- 14. Customer Journey & Funnel Metrics
CREATE TABLE IF NOT EXISTS marketing_funnel_metrics (
  id TEXT PRIMARY KEY,
  period_date TEXT NOT NULL UNIQUE,
  landing_page_visits INTEGER NOT NULL DEFAULT 0,
  signup_initiations INTEGER NOT NULL DEFAULT 0,
  signups_completed INTEGER NOT NULL DEFAULT 0,
  profiles_completed INTEGER NOT NULL DEFAULT 0,
  resumes_uploaded INTEGER NOT NULL DEFAULT 0,
  first_tailoring_actions INTEGER NOT NULL DEFAULT 0,
  checkout_initiations INTEGER NOT NULL DEFAULT 0,
  payment_successes INTEGER NOT NULL DEFAULT 0,
  cancellations INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_funnel_period ON marketing_funnel_metrics(period_date);

-- 15. Marketing Integrations Status Registry
CREATE TABLE IF NOT EXISTS marketing_integrations (
  id TEXT PRIMARY KEY,
  integration_key TEXT NOT NULL UNIQUE, -- 'gsc', 'ga4', 'pagespeed', 'linkedin', 'meta', 'x', 'youtube', 'email_resend'
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'disconnected', -- 'connected', 'disconnected', 'error'
  config_json TEXT NOT NULL DEFAULT '{}',
  error_message TEXT,
  last_checked_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 16. Growth Agent Activity Logs
CREATE TABLE IF NOT EXISTS growth_agent_activity (
  id TEXT PRIMARY KEY,
  agent_type TEXT NOT NULL,
  action_type TEXT NOT NULL,
  summary TEXT NOT NULL,
  details_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_growth_activity_agent ON growth_agent_activity(agent_type);
CREATE INDEX IF NOT EXISTS idx_growth_activity_created ON growth_agent_activity(created_at);
