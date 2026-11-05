-- migrations/0012_user_provisioning_and_membership.sql
-- ApplyVise AI — Admin User Provisioning & Membership Management Architecture

-- 1. Administrative Membership Grants Table
CREATE TABLE IF NOT EXISTS membership_grants (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL, -- 'free' | 'pro' | 'black'
  validity_type TEXT NOT NULL, -- '6_months' | '12_months' | '24_months' | 'lifetime'
  membership_source TEXT NOT NULL DEFAULT 'ADMIN_GRANT', -- 'ADMIN_GRANT' | 'PAYMENT' | 'PROMOTIONAL' | 'SYSTEM'
  starts_at TEXT NOT NULL,
  expires_at TEXT, -- NULL for lifetime access
  status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'suspended' | 'revoked' | 'expired'
  granted_by TEXT NOT NULL, -- Admin ID
  reason TEXT, -- Administrative notes or grant justification
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_mgrants_user_id ON membership_grants(user_id);
CREATE INDEX IF NOT EXISTS idx_mgrants_status ON membership_grants(status);
CREATE INDEX IF NOT EXISTS idx_mgrants_expires_at ON membership_grants(expires_at);
CREATE INDEX IF NOT EXISTS idx_mgrants_plan ON membership_grants(plan);
CREATE INDEX IF NOT EXISTS idx_mgrants_granted_by ON membership_grants(granted_by);

-- 2. User Invitations Table for Safe User Provisioning (Zero Plaintext Credentials)
CREATE TABLE IF NOT EXISTS user_invitations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'accepted' | 'expired'
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_invitations_email ON user_invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON user_invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_user_id ON user_invitations(user_id);
