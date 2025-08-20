-- =====================================================
-- VAULTS SYSTEM - COMPREHENSIVE DATABASE SCHEMA
-- Board Meeting Workspaces with Organization Context
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 1. VAULTS TABLE - Core Workspace Containers
-- =====================================================

CREATE TYPE vault_status AS ENUM ('draft', 'active', 'archived', 'expired', 'cancelled');
CREATE TYPE vault_priority AS ENUM ('low', 'medium', 'high', 'urgent');

CREATE TABLE vaults (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Organization & Meeting Context
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  meeting_id UUID, -- Optional: Link to board meeting record
  
  -- Basic Information
  name VARCHAR(255) NOT NULL CHECK (length(name) >= 1 AND length(name) <= 255),
  description TEXT CHECK (length(description) <= 2000),
  meeting_date TIMESTAMPTZ,
  location TEXT CHECK (length(location) <= 500),
  
  -- Ownership & Creation
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Status & Lifecycle
  status vault_status DEFAULT 'draft',
  priority vault_priority DEFAULT 'medium',
  starts_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  
  -- Configuration & Settings
  settings JSONB DEFAULT '{
    "auto_archive_after_meeting": true,
    "auto_archive_days": 90,
    "allow_comments": true,
    "allow_downloads": true,
    "require_approval_for_uploads": false,
    "max_file_size_mb": 100,
    "allowed_file_types": ["pdf", "docx", "pptx", "xlsx", "png", "jpg"],
    "notification_settings": {
      "notify_on_new_assets": true,
      "notify_on_member_join": true,
      "notify_before_expiry": true
    }
  }'::jsonb,
  
  -- Metadata & Organization
  tags TEXT[] DEFAULT '{}',
  category VARCHAR(100) DEFAULT 'board_meeting',
  template_id UUID, -- Reference to vault template
  
  -- Access & Security
  is_public BOOLEAN DEFAULT false,
  requires_invitation BOOLEAN DEFAULT true,
  access_code TEXT, -- Optional access code for joining
  
  -- Statistics & Tracking
  member_count INTEGER DEFAULT 0,
  asset_count INTEGER DEFAULT 0,
  total_size_bytes BIGINT DEFAULT 0,
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_meeting_date CHECK (
    meeting_date IS NULL OR meeting_date > created_at
  ),
  CONSTRAINT valid_expiry CHECK (
    expires_at IS NULL OR expires_at > starts_at
  ),
  CONSTRAINT valid_archive_date CHECK (
    archived_at IS NULL OR archived_at >= created_at
  )
);

-- =====================================================
-- 2. VAULT INVITATIONS - Broadcasting Mechanism
-- =====================================================

CREATE TYPE vault_invitation_status AS ENUM ('pending', 'accepted', 'rejected', 'expired', 'revoked');
CREATE TYPE vault_permission_level AS ENUM ('viewer', 'contributor', 'moderator', 'admin');

CREATE TABLE vault_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Core References
  vault_id UUID NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
  invited_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Invitation Details
  status vault_invitation_status DEFAULT 'pending',
  permission_level vault_permission_level DEFAULT 'viewer',
  personal_message TEXT CHECK (length(personal_message) <= 1000),
  
  -- Security & Tokens
  invitation_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  access_code TEXT, -- Optional code for vault access
  
  -- Timing & Expiration
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  responded_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  
  -- Security & Tracking
  sent_via VARCHAR(50) DEFAULT 'email', -- email, sms, in_app
  attempt_count INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 5,
  created_ip INET,
  accepted_ip INET,
  device_fingerprint TEXT,
  
  -- Custom Permissions
  custom_permissions JSONB DEFAULT '{}',
  
  -- Constraints
  UNIQUE(vault_id, invited_user_id, status) DEFERRABLE,
  CONSTRAINT valid_invitation_expiry CHECK (expires_at > created_at),
  CONSTRAINT valid_response_time CHECK (
    responded_at IS NULL OR responded_at <= expires_at
  ),
  CONSTRAINT valid_attempt_limit CHECK (attempt_count <= max_attempts)
);

-- =====================================================
-- 3. VAULT MEMBERS - Accepted Users
-- =====================================================

CREATE TYPE vault_member_role AS ENUM ('owner', 'admin', 'moderator', 'contributor', 'viewer');
CREATE TYPE vault_member_status AS ENUM ('active', 'suspended', 'pending', 'left');

CREATE TABLE vault_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Core Relationships
  vault_id UUID NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Role & Permissions
  role vault_member_role DEFAULT 'contributor',
  status vault_member_status DEFAULT 'active',
  
  -- Membership Timeline
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  invited_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  
  -- Activity Tracking
  access_count INTEGER DEFAULT 0,
  contribution_count INTEGER DEFAULT 0, -- uploads, comments, etc.
  download_count INTEGER DEFAULT 0,
  
  -- Custom Settings
  notification_preferences JSONB DEFAULT '{
    "email_notifications": true,
    "push_notifications": true,
    "digest_frequency": "daily"
  }',
  custom_permissions JSONB DEFAULT '{}',
  
  -- Security & Audit
  invitation_id UUID REFERENCES vault_invitations(id),
  joined_via VARCHAR(50) DEFAULT 'invitation', -- invitation, access_code, direct_add
  joined_ip INET,
  last_login_ip INET,
  
  -- Constraints
  UNIQUE(vault_id, user_id),
  CONSTRAINT valid_left_date CHECK (
    left_at IS NULL OR left_at >= joined_at
  )
);

-- =====================================================
-- 4. VAULT ASSETS - Documents in Vaults
-- =====================================================

CREATE TABLE vault_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Core References
  vault_id UUID NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Addition Details
  added_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Organization & Display
  folder_path VARCHAR(500) DEFAULT '/',
  display_order INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  is_required_reading BOOLEAN DEFAULT false,
  
  -- Versioning (for future use)
  version_number INTEGER DEFAULT 1,
  is_latest_version BOOLEAN DEFAULT true,
  previous_version_id UUID REFERENCES vault_assets(id),
  
  -- Access Control
  visibility VARCHAR(20) DEFAULT 'inherit' CHECK (visibility IN ('inherit', 'public', 'members', 'admin')),
  download_permissions VARCHAR(20) DEFAULT 'inherit' CHECK (download_permissions IN ('inherit', 'all', 'members', 'admin', 'none')),
  
  -- Custom Settings
  custom_permissions JSONB DEFAULT '{}',
  presentation_settings JSONB DEFAULT '{}', -- display preferences
  
  -- Statistics
  view_count INTEGER DEFAULT 0,
  download_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  
  -- Constraints
  UNIQUE(vault_id, asset_id),
  CONSTRAINT valid_display_order CHECK (display_order >= 0)
);

-- =====================================================
-- 5. VAULT ACTIVITY LOG - Comprehensive Audit Trail
-- =====================================================

CREATE TYPE vault_activity_type AS ENUM (
  'vault_created', 'vault_updated', 'vault_archived', 'vault_deleted',
  'member_invited', 'member_joined', 'member_left', 'member_removed', 'member_role_changed',
  'asset_added', 'asset_removed', 'asset_updated', 'asset_viewed', 'asset_downloaded',
  'comment_added', 'comment_updated', 'comment_deleted',
  'settings_changed', 'permission_changed',
  'access_granted', 'access_denied', 'suspicious_activity'
);

CREATE TABLE vault_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Core References
  vault_id UUID NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Activity Details
  activity_type vault_activity_type NOT NULL,
  performed_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  affected_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- for member actions
  affected_asset_id UUID REFERENCES assets(id) ON DELETE SET NULL, -- for asset actions
  
  -- Activity Metadata
  activity_details JSONB DEFAULT '{}',
  activity_description TEXT,
  
  -- Context & Environment
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  device_fingerprint TEXT,
  session_id TEXT,
  
  -- Security & Risk Assessment
  risk_level VARCHAR(20) DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  requires_review BOOLEAN DEFAULT false,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  
  -- Additional Context
  request_id TEXT,
  correlation_id TEXT, -- for tracking related activities
  
  -- Indexes will be created separately
  INDEX (vault_id, timestamp DESC),
  INDEX (performed_by_user_id, timestamp DESC),
  INDEX (activity_type, timestamp DESC),
  INDEX (risk_level, requires_review) WHERE requires_review = true
);

-- =====================================================
-- 6. VAULT TEMPLATES - Reusable Vault Structures
-- =====================================================

CREATE TABLE vault_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Template Information
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) DEFAULT 'board_meeting',
  
  -- Template Configuration
  template_data JSONB NOT NULL, -- Contains vault structure, folders, default settings
  default_settings JSONB DEFAULT '{}',
  default_permissions JSONB DEFAULT '{}',
  
  -- Ownership & Scope
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE, -- NULL for global templates
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_public BOOLEAN DEFAULT false,
  is_system_template BOOLEAN DEFAULT false,
  
  -- Usage & Tracking
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT template_name_length CHECK (length(name) >= 1 AND length(name) <= 255)
);

-- =====================================================
-- 7. PERFORMANCE INDEXES
-- =====================================================

-- Vaults indexes
CREATE INDEX idx_vaults_organization_id ON vaults(organization_id, status, created_at DESC);
CREATE INDEX idx_vaults_created_by ON vaults(created_by, created_at DESC);
CREATE INDEX idx_vaults_status ON vaults(status, expires_at) WHERE status IN ('active', 'draft');
CREATE INDEX idx_vaults_meeting_date ON vaults(meeting_date DESC) WHERE meeting_date IS NOT NULL;
CREATE INDEX idx_vaults_expires_at ON vaults(expires_at) WHERE status = 'active' AND expires_at IS NOT NULL;
CREATE INDEX idx_vaults_last_activity ON vaults(last_activity_at DESC);
CREATE INDEX idx_vaults_search ON vaults USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- Vault invitations indexes
CREATE INDEX idx_vault_invitations_vault_id ON vault_invitations(vault_id, status);
CREATE INDEX idx_vault_invitations_user_id ON vault_invitations(invited_user_id, status);
CREATE INDEX idx_vault_invitations_token ON vault_invitations(invitation_token) WHERE status = 'pending';
CREATE INDEX idx_vault_invitations_expires ON vault_invitations(expires_at) WHERE status = 'pending';
CREATE INDEX idx_vault_invitations_org_id ON vault_invitations(organization_id, status, created_at DESC);

-- Vault members indexes
CREATE INDEX idx_vault_members_vault_id ON vault_members(vault_id, status, role);
CREATE INDEX idx_vault_members_user_id ON vault_members(user_id, status, last_accessed_at DESC);
CREATE INDEX idx_vault_members_org_id ON vault_members(organization_id, status);
CREATE INDEX idx_vault_members_active ON vault_members(vault_id, status) WHERE status = 'active';
CREATE INDEX idx_vault_members_access ON vault_members(last_accessed_at DESC);

-- Vault assets indexes
CREATE INDEX idx_vault_assets_vault_id ON vault_assets(vault_id, display_order);
CREATE INDEX idx_vault_assets_asset_id ON vault_assets(asset_id);
CREATE INDEX idx_vault_assets_added_by ON vault_assets(added_by_user_id, added_at DESC);
CREATE INDEX idx_vault_assets_folder ON vault_assets(vault_id, folder_path);
CREATE INDEX idx_vault_assets_featured ON vault_assets(vault_id, is_featured) WHERE is_featured = true;
CREATE INDEX idx_vault_assets_required ON vault_assets(vault_id, is_required_reading) WHERE is_required_reading = true;

-- Activity log indexes (already defined in table)
-- Additional composite indexes
CREATE INDEX idx_vault_activity_vault_user ON vault_activity_log(vault_id, performed_by_user_id, timestamp DESC);
CREATE INDEX idx_vault_activity_org_time ON vault_activity_log(organization_id, timestamp DESC);
CREATE INDEX idx_vault_activity_risk ON vault_activity_log(risk_level, timestamp DESC) WHERE risk_level IN ('high', 'critical');

-- =====================================================
-- 8. ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all vault tables
ALTER TABLE vaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_templates ENABLE ROW LEVEL SECURITY;

-- Vaults RLS Policies
CREATE POLICY "Users can view vaults in their organizations" ON vaults
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Organization admins can manage vaults" ON vaults
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND status = 'active' 
      AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Vault owners can manage their vaults" ON vaults
  FOR ALL USING (created_by = auth.uid());

-- Vault Members RLS Policies
CREATE POLICY "Users can view vault members for accessible vaults" ON vault_members
  FOR SELECT USING (
    vault_id IN (
      SELECT v.id FROM vaults v
      JOIN organization_members om ON v.organization_id = om.organization_id
      WHERE om.user_id = auth.uid() AND om.status = 'active'
    )
  );

CREATE POLICY "Vault admins can manage members" ON vault_members
  FOR ALL USING (
    vault_id IN (
      SELECT vm.vault_id FROM vault_members vm
      WHERE vm.user_id = auth.uid() AND vm.status = 'active'
      AND vm.role IN ('owner', 'admin', 'moderator')
    )
  );

-- Vault Invitations RLS Policies
CREATE POLICY "Users can view invitations sent to them" ON vault_invitations
  FOR SELECT USING (invited_user_id = auth.uid());

CREATE POLICY "Vault admins can manage invitations" ON vault_invitations
  FOR ALL USING (
    vault_id IN (
      SELECT vm.vault_id FROM vault_members vm
      WHERE vm.user_id = auth.uid() AND vm.status = 'active'
      AND vm.role IN ('owner', 'admin', 'moderator')
    )
    OR invited_by_user_id = auth.uid()
  );

-- Vault Assets RLS Policies
CREATE POLICY "Vault members can view vault assets" ON vault_assets
  FOR SELECT USING (
    vault_id IN (
      SELECT vault_id FROM vault_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Contributors can add assets to vaults" ON vault_assets
  FOR INSERT WITH CHECK (
    vault_id IN (
      SELECT vault_id FROM vault_members 
      WHERE user_id = auth.uid() AND status = 'active'
      AND role IN ('owner', 'admin', 'moderator', 'contributor')
    )
    AND added_by_user_id = auth.uid()
  );

-- Activity Log RLS Policies
CREATE POLICY "Organization members can view vault activity" ON vault_activity_log
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- =====================================================
-- 9. TRIGGERS AND FUNCTIONS
-- =====================================================

-- Update vault statistics
CREATE OR REPLACE FUNCTION update_vault_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update member count
  UPDATE vaults SET 
    member_count = (
      SELECT COUNT(*) FROM vault_members 
      WHERE vault_id = COALESCE(NEW.vault_id, OLD.vault_id) 
      AND status = 'active'
    ),
    last_activity_at = NOW()
  WHERE id = COALESCE(NEW.vault_id, OLD.vault_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

CREATE TRIGGER vault_member_stats_trigger
  AFTER INSERT OR UPDATE OR DELETE ON vault_members
  FOR EACH ROW EXECUTE FUNCTION update_vault_stats();

-- Update asset count and size
CREATE OR REPLACE FUNCTION update_vault_asset_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE vaults SET 
    asset_count = (
      SELECT COUNT(*) FROM vault_assets 
      WHERE vault_id = COALESCE(NEW.vault_id, OLD.vault_id)
    ),
    total_size_bytes = (
      SELECT COALESCE(SUM(a.file_size), 0) 
      FROM vault_assets va
      JOIN assets a ON va.asset_id = a.id
      WHERE va.vault_id = COALESCE(NEW.vault_id, OLD.vault_id)
    ),
    last_activity_at = NOW()
  WHERE id = COALESCE(NEW.vault_id, OLD.vault_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

CREATE TRIGGER vault_asset_stats_trigger
  AFTER INSERT OR UPDATE OR DELETE ON vault_assets
  FOR EACH ROW EXECUTE FUNCTION update_vault_asset_stats();

-- Auto-expire vault invitations
CREATE OR REPLACE FUNCTION expire_vault_invitations()
RETURNS void AS $$
BEGIN
  UPDATE vault_invitations 
  SET status = 'expired'
  WHERE status = 'pending' 
    AND expires_at < NOW();
END;
$$ language 'plpgsql';

-- Create scheduled job to run expiration check (requires pg_cron extension)
-- SELECT cron.schedule('expire-vault-invitations', '0 * * * *', 'SELECT expire_vault_invitations();');

-- Auto-archive expired vaults
CREATE OR REPLACE FUNCTION auto_archive_vaults()
RETURNS void AS $$
BEGIN
  UPDATE vaults 
  SET 
    status = 'archived',
    archived_at = NOW()
  WHERE status = 'active' 
    AND expires_at < NOW()
    AND (settings->>'auto_archive_after_meeting')::boolean = true;
END;
$$ language 'plpgsql';

-- Update timestamps trigger
CREATE TRIGGER update_vaults_updated_at 
  BEFORE UPDATE ON vaults 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vault_templates_updated_at 
  BEFORE UPDATE ON vault_templates 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 10. INITIAL SYSTEM TEMPLATES
-- =====================================================

INSERT INTO vault_templates (name, description, category, template_data, is_system_template, created_by) 
VALUES 
(
  'Standard Board Meeting', 
  'Default template for regular board meetings with common folder structure',
  'board_meeting',
  '{
    "folders": [
      {"name": "Agenda", "order": 1, "required": true},
      {"name": "Previous Minutes", "order": 2, "required": false},
      {"name": "Financial Reports", "order": 3, "required": true},
      {"name": "Committee Reports", "order": 4, "required": false},
      {"name": "Presentations", "order": 5, "required": false},
      {"name": "Resolutions", "order": 6, "required": false},
      {"name": "Supporting Documents", "order": 7, "required": false}
    ],
    "default_permissions": {
      "viewer": ["view", "download"],
      "contributor": ["view", "download", "upload", "comment"],
      "moderator": ["view", "download", "upload", "comment", "manage_members"],
      "admin": ["all"]
    },
    "settings": {
      "auto_archive_days": 90,
      "require_approval_for_uploads": false,
      "allow_comments": true
    }
  }',
  true,
  '00000000-0000-0000-0000-000000000000'
),
(
  'Annual Review Meeting',
  'Template for annual board review meetings with comprehensive documentation',
  'annual_review',
  '{
    "folders": [
      {"name": "Annual Report", "order": 1, "required": true},
      {"name": "Financial Statements", "order": 2, "required": true},
      {"name": "Audit Reports", "order": 3, "required": true},
      {"name": "Performance Reviews", "order": 4, "required": true},
      {"name": "Strategic Plans", "order": 5, "required": true},
      {"name": "Risk Assessments", "order": 6, "required": false},
      {"name": "Compliance Reports", "order": 7, "required": false}
    ]
  }',
  true,
  '00000000-0000-0000-0000-000000000000'
),
(
  'Committee Meeting',
  'Lightweight template for committee meetings',
  'committee',
  '{
    "folders": [
      {"name": "Agenda", "order": 1, "required": true},
      {"name": "Reports", "order": 2, "required": false},
      {"name": "Proposals", "order": 3, "required": false},
      {"name": "Reference Materials", "order": 4, "required": false}
    ],
    "settings": {
      "auto_archive_days": 30,
      "max_file_size_mb": 50
    }
  }',
  true,
  '00000000-0000-0000-0000-000000000000'
);

-- Update the template created_by to a valid user ID when available
-- This will be updated during data seeding

-- =====================================================
-- 11. MIGRATION COMPLETION
-- =====================================================

-- Create migration tracking table if it doesn't exist
CREATE TABLE IF NOT EXISTS _migrations (
  name TEXT PRIMARY KEY,
  executed_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO _migrations (name, executed_at) 
VALUES ('database-schema-vaults', NOW())
ON CONFLICT (name) DO UPDATE SET executed_at = NOW();

-- Success confirmation
SELECT 'Vaults system database schema created successfully!' as message;