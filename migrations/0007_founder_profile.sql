-- migrations/0007_founder_profile.sql
-- Founder Profile & Photograph Management

CREATE TABLE IF NOT EXISTS founder_profile (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  designation TEXT NOT NULL,
  subtitle TEXT NOT NULL,
  company_name TEXT NOT NULL,
  short_bio TEXT,
  bio_paragraphs TEXT NOT NULL, -- JSON array of strings
  mission_statement TEXT,
  quote TEXT NOT NULL,
  quote_author TEXT NOT NULL,
  expertise_tags TEXT NOT NULL, -- JSON array of strings
  linkedin_url TEXT NOT NULL,
  story_url TEXT NOT NULL,
  photo_url TEXT,
  photo_asset_id TEXT,
  photo_aspect_ratio TEXT DEFAULT '1:1',
  is_published INTEGER NOT NULL DEFAULT 1,
  draft_data TEXT, -- JSON string containing draft changes
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  published_at TEXT
);

CREATE TABLE IF NOT EXISTS founder_image_assets (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  data_base64 TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_founder_image ON founder_image_assets(id);
