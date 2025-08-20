-- =====================================================
-- ORGANIZATIONS SYSTEM - CORE MIGRATION
-- Phase 1: Organizations and Core Tables
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 1. ORGANIZATIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic Information
  name TEXT NOT NULL CHECK (length(name) >= 2 AND length(name) <= 100),
  slug TEXT UNIQUE NOT NULL CHECK (slug ~ '^[a-z0-9-]+$' AND length(slug) >= 2),
  description TEXT CHECK (length(description) <= 500),
  
  -- Branding & Identity
  logo_url TEXT,
  website TEXT CHECK (website ~ '^https?://'),
  industry TEXT,
  organization_size TEXT CHECK (organization_size IN ('startup', 'small', 'medium', 'large', 'enterprise')),
  
  -- Ownership & Timestamps
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Soft Delete & Archival
  is_active BOOLEAN DEFAULT true,
  deleted_at TIMESTAMPTZ,
  deletion_scheduled_for TIMESTAMPTZ,
  
  -- Settings & Configuration
  settings JSONB DEFAULT '{
    "board_pack_auto_archive_days": 365,
    "invitation_expires_hours": 72,
    "max_members": 100,
    "require_2fa": false,
    "allow_viewer_downloads": true,
    "auto_approve_domain_users": false,
    "approved_domains": []
  }'::jsonb,
  
  -- Compliance & Metadata
  compliance_settings JSONB DEFAULT '{}',
  billing_settings JSONB DEFAULT '{}',
  
  -- Constraints
  CONSTRAINT valid_deletion_schedule CHECK (
    (deleted_at IS NULL AND deletion_scheduled_for IS NULL) OR
    (deleted_at IS NOT NULL AND deletion_scheduled_for > deleted_at)
  )
);

-- =====================================================
-- 2. ORGANIZATION MEMBERS TABLE
-- =====================================================

CREATE TYPE organization_role AS ENUM ('owner', 'admin', 'member', 'viewer');
CREATE TYPE membership_status AS ENUM ('active', 'suspended', 'pending_activation');

CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Core Relationships
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Role & Permissions
  role organization_role NOT NULL DEFAULT 'member',
  custom_permissions JSONB DEFAULT '{}',
  
  -- Membership Metadata
  invited_by UUID REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_accessed TIMESTAMPTZ DEFAULT NOW(),
  access_count INTEGER DEFAULT 0,
  
  -- Status & Control
  status membership_status DEFAULT 'active',
  is_primary BOOLEAN DEFAULT false, -- User's primary organization
  receive_notifications BOOLEAN DEFAULT true,
  
  -- Security & Audit
  invitation_accepted_ip INET,
  last_login_ip INET,
  suspicious_activity_count INTEGER DEFAULT 0,
  
  -- Constraints
  UNIQUE(organization_id, user_id),
  
  CONSTRAINT only_one_owner_per_org CHECK (
    role != 'owner' OR (
      SELECT COUNT(*) 
      FROM organization_members om2 
      WHERE om2.organization_id = organization_members.organization_id 
      AND om2.role = 'owner' 
      AND om2.status = 'active'
    ) <= 1
  )
);

-- =====================================================
-- 3. ORGANIZATION INVITATIONS TABLE  
-- =====================================================

CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'rejected', 'expired', 'revoked');

CREATE TABLE IF NOT EXISTS organization_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Core Data
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL CHECK (email ~ '^[^@]+@[^@]+\.[^@]+$'),
  role organization_role NOT NULL,
  
  -- Security Tokens
  invitation_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  email_verification_code TEXT NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex'),
  
  -- Timing & Expiration
  created_at TIMESTAMPTZ DEFAULT NOW(),
  token_expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '72 hours'),
  accepted_at TIMESTAMPTZ,
  
  -- Invitation Details
  invited_by UUID NOT NULL REFERENCES users(id),
  accepted_by UUID REFERENCES users(id),
  personal_message TEXT CHECK (length(personal_message) <= 500),
  
  -- Status & Security
  status invitation_status DEFAULT 'pending',
  attempt_count INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  
  -- Security Tracking
  created_ip INET,
  accepted_ip INET,
  device_fingerprint TEXT,
  
  -- Constraints
  UNIQUE(organization_id, email, status) DEFERRABLE,
  
  CONSTRAINT valid_expiration CHECK (token_expires_at > created_at),
  CONSTRAINT accepted_within_expiry CHECK (
    accepted_at IS NULL OR accepted_at <= token_expires_at
  ),
  CONSTRAINT attempt_limit CHECK (attempt_count <= max_attempts)
);

-- =====================================================
-- 4. ORGANIZATION SETTINGS & FEATURES
-- =====================================================

CREATE TABLE IF NOT EXISTS organization_features (
  organization_id UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Feature Flags
  ai_summarization BOOLEAN DEFAULT true,
  advanced_permissions BOOLEAN DEFAULT false,
  sso_enabled BOOLEAN DEFAULT false,
  audit_logs BOOLEAN DEFAULT true,
  api_access BOOLEAN DEFAULT false,
  white_label BOOLEAN DEFAULT false,
  
  -- Limits & Quotas
  max_board_packs INTEGER DEFAULT 100,
  max_file_size_mb INTEGER DEFAULT 50,
  max_storage_gb NUMERIC(8,2) DEFAULT 10.0,
  
  -- Current Usage
  current_board_packs INTEGER DEFAULT 0,
  current_storage_gb NUMERIC(8,2) DEFAULT 0,
  
  -- Billing & Plan
  plan_type TEXT DEFAULT 'free' CHECK (plan_type IN ('free', 'professional', 'enterprise')),
  subscription_ends_at TIMESTAMPTZ,
  
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 5. INDEXES FOR PERFORMANCE
-- =====================================================

-- Organizations
CREATE INDEX idx_organizations_slug ON organizations(slug) WHERE is_active = true;
CREATE INDEX idx_organizations_created_by ON organizations(created_by);
CREATE INDEX idx_organizations_active ON organizations(is_active, created_at DESC);
CREATE INDEX idx_organizations_deletion_scheduled ON organizations(deletion_scheduled_for) 
  WHERE deletion_scheduled_for IS NOT NULL;

-- Organization Members  
CREATE INDEX idx_org_members_organization_id ON organization_members(organization_id, status);
CREATE INDEX idx_org_members_user_id ON organization_members(user_id, status);
CREATE INDEX idx_org_members_role ON organization_members(organization_id, role);
CREATE INDEX idx_org_members_last_accessed ON organization_members(last_accessed DESC);
CREATE INDEX idx_org_members_primary ON organization_members(user_id) WHERE is_primary = true;

-- Organization Invitations
CREATE INDEX idx_org_invitations_token ON organization_invitations(invitation_token) 
  WHERE status = 'pending';
CREATE INDEX idx_org_invitations_email ON organization_invitations(email, status);
CREATE INDEX idx_org_invitations_org_id ON organization_invitations(organization_id, status);
CREATE INDEX idx_org_invitations_expires ON organization_invitations(token_expires_at) 
  WHERE status = 'pending';

-- =====================================================
-- 6. TRIGGERS FOR AUTOMATION
-- =====================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_organizations_updated_at 
  BEFORE UPDATE ON organizations 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-expire invitations
CREATE OR REPLACE FUNCTION expire_old_invitations()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE organization_invitations 
  SET status = 'expired'
  WHERE status = 'pending' 
    AND token_expires_at < NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_expire_invitations
  AFTER INSERT OR UPDATE ON organization_invitations
  FOR EACH STATEMENT EXECUTE FUNCTION expire_old_invitations();

-- Update access tracking
CREATE OR REPLACE FUNCTION update_member_access()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_accessed = NOW();
  NEW.access_count = OLD.access_count + 1;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- =====================================================
-- 7. INITIAL DATA & CONSTRAINTS
-- =====================================================

-- Ensure at least one owner per organization
CREATE OR REPLACE FUNCTION ensure_organization_owner()
RETURNS TRIGGER AS $$
BEGIN
  -- If deleting or changing role from owner, ensure another owner exists
  IF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND OLD.role = 'owner' AND NEW.role != 'owner') THEN
    IF NOT EXISTS (
      SELECT 1 FROM organization_members 
      WHERE organization_id = COALESCE(NEW.organization_id, OLD.organization_id)
        AND role = 'owner' 
        AND status = 'active'
        AND id != COALESCE(NEW.id, OLD.id)
    ) THEN
      RAISE EXCEPTION 'Organization must have at least one owner';
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

CREATE TRIGGER ensure_org_owner_trigger
  BEFORE UPDATE OR DELETE ON organization_members
  FOR EACH ROW EXECUTE FUNCTION ensure_organization_owner();

-- =====================================================
-- 8. MIGRATION TRACKING
-- =====================================================

INSERT INTO _migrations (name, executed_at) 
VALUES ('001-organizations-core', NOW())
ON CONFLICT (name) DO NOTHING;

-- Create migration tracking table if it doesn't exist
CREATE TABLE IF NOT EXISTS _migrations (
  name TEXT PRIMARY KEY,
  executed_at TIMESTAMPTZ DEFAULT NOW()
);