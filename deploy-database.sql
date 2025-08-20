-- =====================================================
-- BOARDGURU DATABASE DEPLOYMENT SCRIPT
-- Run this complete script in your Supabase SQL Editor
-- =====================================================

-- Create migration tracking table first
CREATE TABLE IF NOT EXISTS _migrations (
  name TEXT PRIMARY KEY,
  executed_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- MIGRATION 001: ORGANIZATIONS CORE
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create enums
CREATE TYPE organization_role AS ENUM ('owner', 'admin', 'member', 'viewer');
CREATE TYPE membership_status AS ENUM ('active', 'suspended', 'pending_activation');
CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'rejected', 'expired', 'revoked');

-- 1. ORGANIZATIONS TABLE
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

-- 2. ORGANIZATION MEMBERS TABLE
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
  UNIQUE(organization_id, user_id)
);

-- 3. ORGANIZATION INVITATIONS TABLE
CREATE TABLE IF NOT EXISTS organization_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Core Data
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL CHECK (email ~ '^[^@]+@[^@]+\\.[^@]+$'),
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

-- 4. ORGANIZATION FEATURES TABLE
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_organizations_created_by ON organizations(created_by);
CREATE INDEX IF NOT EXISTS idx_organizations_active ON organizations(is_active, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_org_members_organization_id ON organization_members(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON organization_members(user_id, status);
CREATE INDEX IF NOT EXISTS idx_org_members_role ON organization_members(organization_id, role);

CREATE INDEX IF NOT EXISTS idx_org_invitations_token ON organization_invitations(invitation_token) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_org_invitations_email ON organization_invitations(email, status);
CREATE INDEX IF NOT EXISTS idx_org_invitations_org_id ON organization_invitations(organization_id, status);

-- Create trigger functions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for organizations
CREATE TRIGGER update_organizations_updated_at 
  BEFORE UPDATE ON organizations 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Ownership validation trigger function
CREATE OR REPLACE FUNCTION ensure_organization_owner()
RETURNS TRIGGER AS $$
DECLARE
  owner_count INTEGER;
BEGIN
  -- Handle INSERT and UPDATE operations
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- If inserting/updating to owner role, check if another owner already exists
    IF NEW.role = 'owner' AND NEW.status = 'active' THEN
      SELECT COUNT(*) INTO owner_count
      FROM organization_members 
      WHERE organization_id = NEW.organization_id
        AND role = 'owner' 
        AND status = 'active'
        AND (TG_OP = 'INSERT' OR id != NEW.id);
      
      IF owner_count > 0 THEN
        RAISE EXCEPTION 'Organization can only have one owner. Transfer ownership first.';
      END IF;
    END IF;
  END IF;
  
  -- Handle DELETE and UPDATE operations that remove/change owner
  IF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND OLD.role = 'owner' AND (NEW.role != 'owner' OR NEW.status != 'active')) THEN
    -- Check if this would leave the organization without an owner
    SELECT COUNT(*) INTO owner_count
    FROM organization_members 
    WHERE organization_id = COALESCE(NEW.organization_id, OLD.organization_id)
      AND role = 'owner' 
      AND status = 'active'
      AND id != COALESCE(OLD.id, NEW.id);
    
    IF owner_count = 0 THEN
      RAISE EXCEPTION 'Organization must have at least one owner';
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Create ownership validation trigger
CREATE TRIGGER ensure_org_owner_trigger
  BEFORE INSERT OR UPDATE OR DELETE ON organization_members
  FOR EACH ROW EXECUTE FUNCTION ensure_organization_owner();

-- Auto-expire invitations trigger
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

-- Record migration
INSERT INTO _migrations (name, executed_at) 
VALUES ('001-organizations-core', NOW())
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- ENABLE ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on all organization tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_features ENABLE ROW LEVEL SECURITY;

-- Utility function to get user's organization IDs
CREATE OR REPLACE FUNCTION user_organization_ids()
RETURNS UUID[] AS $$
BEGIN
  RETURN ARRAY(
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
      AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to check if user is organization admin
CREATE OR REPLACE FUNCTION is_organization_admin(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM organization_members
    WHERE organization_id = org_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
      AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Organizations policies
CREATE POLICY "Members can view their organizations" ON organizations
  FOR SELECT USING (
    id = ANY(user_organization_ids())
  );

CREATE POLICY "Owners can update organizations" ON organizations
  FOR UPDATE USING (
    is_organization_admin(id)
  );

CREATE POLICY "Authenticated users can create organizations" ON organizations
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND created_by = auth.uid()
  );

-- Organization members policies
CREATE POLICY "Members can view organization membership" ON organization_members
  FOR SELECT USING (
    organization_id = ANY(user_organization_ids())
  );

CREATE POLICY "Admins can manage organization members" ON organization_members
  FOR ALL USING (
    is_organization_admin(organization_id)
  );

-- Organization invitations policies
CREATE POLICY "Admins can manage organization invitations" ON organization_invitations
  FOR ALL USING (
    is_organization_admin(organization_id) OR 
    email = (SELECT email FROM users WHERE id = auth.uid())
  );

-- Organization features policies
CREATE POLICY "Members can view organization features" ON organization_features
  FOR SELECT USING (
    organization_id = ANY(user_organization_ids())
  );

CREATE POLICY "Admins can update organization features" ON organization_features
  FOR UPDATE USING (
    is_organization_admin(organization_id)
  );

-- =====================================================
-- UPDATE BOARD PACKS FOR MULTI-TENANT
-- =====================================================

-- Add organization context to board_packs if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='board_packs' AND column_name='organization_id') THEN
        ALTER TABLE board_packs 
        ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Update board_packs RLS policies
DROP POLICY IF EXISTS "Approved users can view board packs" ON board_packs;
DROP POLICY IF EXISTS "Directors and admins can insert board packs" ON board_packs;
DROP POLICY IF EXISTS "Directors and admins can update board packs" ON board_packs;
DROP POLICY IF EXISTS "Directors and admins can delete board packs" ON board_packs;

-- New multi-tenant policies for board_packs
CREATE POLICY "Organization members can view board packs" ON board_packs
  FOR SELECT USING (
    organization_id = ANY(user_organization_ids()) OR organization_id IS NULL
  );

CREATE POLICY "Members can upload board packs" ON board_packs
  FOR INSERT WITH CHECK (
    (organization_id IS NULL OR organization_id = ANY(user_organization_ids()))
    AND uploaded_by = auth.uid()
  );

CREATE POLICY "Users can update their board packs" ON board_packs
  FOR UPDATE USING (
    (organization_id IS NULL OR organization_id = ANY(user_organization_ids()))
    AND (uploaded_by = auth.uid() OR is_organization_admin(organization_id))
  );

CREATE POLICY "Users can delete their board packs" ON board_packs
  FOR DELETE USING (
    (organization_id IS NULL OR organization_id = ANY(user_organization_ids()))
    AND (uploaded_by = auth.uid() OR is_organization_admin(organization_id))
  );

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'SUCCESS: BoardGuru multi-tenant database deployed!';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Tables created:';
  RAISE NOTICE '  ✓ organizations';
  RAISE NOTICE '  ✓ organization_members';
  RAISE NOTICE '  ✓ organization_invitations';
  RAISE NOTICE '  ✓ organization_features';
  RAISE NOTICE '  ✓ board_packs (updated for multi-tenant)';
  RAISE NOTICE '';
  RAISE NOTICE 'Security enabled:';
  RAISE NOTICE '  ✓ Row Level Security (RLS) policies';
  RAISE NOTICE '  ✓ Organization ownership validation';
  RAISE NOTICE '  ✓ Multi-tenant data isolation';
  RAISE NOTICE '';
  RAISE NOTICE 'Ready for BoardGuru multi-tenant deployment!';
  RAISE NOTICE '============================================';
END;
$$;