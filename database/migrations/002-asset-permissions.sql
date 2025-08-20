-- =====================================================
-- ASSET PERMISSIONS SYSTEM - MIGRATION 002
-- Phase 2: Board Pack Permissions and Asset Management
-- =====================================================

-- =====================================================
-- 1. EXTEND BOARD PACKS FOR MULTI-TENANT
-- =====================================================

-- Add organization context to existing board_packs table
ALTER TABLE board_packs 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'organization' CHECK (visibility IN ('organization', 'public', 'private')),
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS auto_archive_date TIMESTAMPTZ;

-- Create board pack permissions table
CREATE TABLE IF NOT EXISTS board_pack_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Core Relations
  board_pack_id UUID NOT NULL REFERENCES board_packs(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Permission Grants
  granted_to_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  granted_to_role organization_role, -- Grant to all users with this role
  
  -- Permission Types
  can_view BOOLEAN DEFAULT true,
  can_download BOOLEAN DEFAULT false,
  can_comment BOOLEAN DEFAULT false,
  can_share BOOLEAN DEFAULT false,
  can_edit_metadata BOOLEAN DEFAULT false,
  
  -- Security & Audit
  granted_by UUID NOT NULL REFERENCES users(id),
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES users(id),
  
  -- Usage Tracking
  last_accessed TIMESTAMPTZ,
  access_count INTEGER DEFAULT 0,
  
  -- Constraints
  CONSTRAINT valid_grant_target CHECK (
    (granted_to_user_id IS NOT NULL AND granted_to_role IS NULL) OR
    (granted_to_user_id IS NULL AND granted_to_role IS NOT NULL)
  ),
  CONSTRAINT valid_revocation CHECK (
    (revoked_at IS NULL AND revoked_by IS NULL) OR
    (revoked_at IS NOT NULL AND revoked_by IS NOT NULL)
  ),
  UNIQUE(board_pack_id, granted_to_user_id),
  UNIQUE(board_pack_id, granted_to_role)
);

-- =====================================================
-- 2. BOARD PACK SHARING & COLLABORATION
-- =====================================================

CREATE TYPE share_type AS ENUM ('link', 'email', 'organization');
CREATE TYPE share_status AS ENUM ('active', 'expired', 'revoked', 'disabled');

CREATE TABLE IF NOT EXISTS board_pack_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Core Data
  board_pack_id UUID NOT NULL REFERENCES board_packs(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Share Configuration
  share_type share_type NOT NULL,
  share_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  share_url TEXT GENERATED ALWAYS AS (
    CASE 
      WHEN share_type = 'link' THEN '/shared/' || share_token
      ELSE NULL 
    END
  ) STORED,
  
  -- Access Control
  requires_login BOOLEAN DEFAULT true,
  password_protected BOOLEAN DEFAULT false,
  password_hash TEXT, -- bcrypt hash if password protected
  max_access_count INTEGER,
  current_access_count INTEGER DEFAULT 0,
  
  -- Timing & Expiration
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  last_accessed TIMESTAMPTZ,
  
  -- Security & Status
  status share_status DEFAULT 'active',
  access_log JSONB DEFAULT '[]', -- Track who accessed when
  security_settings JSONB DEFAULT '{}',
  
  -- Permissions for this share
  allow_download BOOLEAN DEFAULT false,
  allow_comment BOOLEAN DEFAULT false,
  watermark_required BOOLEAN DEFAULT true,
  
  -- Constraints
  CONSTRAINT valid_password CHECK (
    (password_protected = false AND password_hash IS NULL) OR
    (password_protected = true AND password_hash IS NOT NULL)
  ),
  CONSTRAINT valid_expiration CHECK (expires_at IS NULL OR expires_at > created_at),
  CONSTRAINT valid_access_limits CHECK (
    max_access_count IS NULL OR 
    current_access_count <= max_access_count
  )
);

-- =====================================================
-- 3. BOARD PACK COMMENTS & ANNOTATIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS board_pack_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Core Relations
  board_pack_id UUID NOT NULL REFERENCES board_packs(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Comment Data
  content TEXT NOT NULL CHECK (length(content) >= 1 AND length(content) <= 2000),
  page_number INTEGER, -- For PDF annotations
  position JSONB, -- For precise positioning { x, y, width, height }
  
  -- Threading & Replies
  parent_comment_id UUID REFERENCES board_pack_comments(id) ON DELETE CASCADE,
  thread_id UUID NOT NULL, -- All comments in a thread share this
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  edited_at TIMESTAMPTZ,
  
  -- Status & Moderation
  is_resolved BOOLEAN DEFAULT false,
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMPTZ,
  is_private BOOLEAN DEFAULT false, -- Only visible to commenter and admins
  
  -- Security
  reported_count INTEGER DEFAULT 0,
  is_flagged BOOLEAN DEFAULT false,
  flagged_reason TEXT,
  
  -- Constraints
  CONSTRAINT valid_thread_root CHECK (
    parent_comment_id IS NULL OR 
    parent_comment_id != id
  ),
  CONSTRAINT valid_resolution CHECK (
    (is_resolved = false AND resolved_by IS NULL AND resolved_at IS NULL) OR
    (is_resolved = true AND resolved_by IS NOT NULL AND resolved_at IS NOT NULL)
  )
);

-- =====================================================
-- 4. BOARD PACK ACTIVITY & ANALYTICS
-- =====================================================

CREATE TABLE IF NOT EXISTS board_pack_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Core Relations
  board_pack_id UUID NOT NULL REFERENCES board_packs(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Nullable for anonymous access
  
  -- Activity Details
  action TEXT NOT NULL CHECK (action IN (
    'view', 'download', 'share', 'comment', 'like', 'bookmark',
    'print', 'export', 'search', 'ai_summarize', 'ai_chat'
  )),
  details JSONB DEFAULT '{}', -- Action-specific metadata
  
  -- Context & Session
  session_id TEXT,
  ip_address INET,
  user_agent TEXT,
  referrer TEXT,
  
  -- Timing & Duration
  created_at TIMESTAMPTZ DEFAULT NOW(),
  duration_seconds INTEGER, -- For view/read time tracking
  
  -- Geography & Device (for analytics)
  country_code CHAR(2),
  device_type TEXT CHECK (device_type IN ('desktop', 'mobile', 'tablet', 'unknown')),
  
  -- Security Tracking
  is_suspicious BOOLEAN DEFAULT false,
  risk_score INTEGER CHECK (risk_score >= 0 AND risk_score <= 100)
);

-- =====================================================
-- 5. PERFORMANCE INDEXES
-- =====================================================

-- Board Pack Permissions
CREATE INDEX idx_board_pack_permissions_board_pack ON board_pack_permissions(board_pack_id, can_view);
CREATE INDEX idx_board_pack_permissions_user ON board_pack_permissions(granted_to_user_id, can_view);
CREATE INDEX idx_board_pack_permissions_role ON board_pack_permissions(granted_to_role, organization_id);
CREATE INDEX idx_board_pack_permissions_expires ON board_pack_permissions(expires_at) 
  WHERE expires_at IS NOT NULL AND revoked_at IS NULL;

-- Board Pack Shares
CREATE INDEX idx_board_pack_shares_token ON board_pack_shares(share_token) WHERE status = 'active';
CREATE INDEX idx_board_pack_shares_board_pack ON board_pack_shares(board_pack_id, status);
CREATE INDEX idx_board_pack_shares_expires ON board_pack_shares(expires_at) WHERE status = 'active';
CREATE INDEX idx_board_pack_shares_creator ON board_pack_shares(created_by, created_at DESC);

-- Board Pack Comments
CREATE INDEX idx_board_pack_comments_board_pack ON board_pack_comments(board_pack_id, created_at DESC);
CREATE INDEX idx_board_pack_comments_user ON board_pack_comments(user_id, created_at DESC);
CREATE INDEX idx_board_pack_comments_thread ON board_pack_comments(thread_id, created_at);
CREATE INDEX idx_board_pack_comments_parent ON board_pack_comments(parent_comment_id) 
  WHERE parent_comment_id IS NOT NULL;

-- Board Pack Activity
CREATE INDEX idx_board_pack_activity_board_pack ON board_pack_activity(board_pack_id, created_at DESC);
CREATE INDEX idx_board_pack_activity_user ON board_pack_activity(user_id, created_at DESC) 
  WHERE user_id IS NOT NULL;
CREATE INDEX idx_board_pack_activity_organization ON board_pack_activity(organization_id, action, created_at DESC);
CREATE INDEX idx_board_pack_activity_session ON board_pack_activity(session_id, created_at) 
  WHERE session_id IS NOT NULL;

-- Enhanced board_packs indexes for multi-tenant
CREATE INDEX idx_board_packs_organization ON board_packs(organization_id, status, created_at DESC);
CREATE INDEX idx_board_packs_visibility ON board_packs(visibility, organization_id);
CREATE INDEX idx_board_packs_tags ON board_packs USING gin(tags);
CREATE INDEX idx_board_packs_archived ON board_packs(archived_at) WHERE archived_at IS NOT NULL;

-- =====================================================
-- 6. AUTOMATED TRIGGERS & FUNCTIONS
-- =====================================================

-- Auto-generate thread_id for root comments
CREATE OR REPLACE FUNCTION generate_comment_thread_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_comment_id IS NULL THEN
    NEW.thread_id = NEW.id;
  ELSE
    -- Get thread_id from parent comment
    SELECT thread_id INTO NEW.thread_id 
    FROM board_pack_comments 
    WHERE id = NEW.parent_comment_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_comment_thread_id
  BEFORE INSERT ON board_pack_comments
  FOR EACH ROW EXECUTE FUNCTION generate_comment_thread_id();

-- Auto-expire shares
CREATE OR REPLACE FUNCTION expire_board_pack_shares()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE board_pack_shares 
  SET status = 'expired'
  WHERE status = 'active' 
    AND expires_at IS NOT NULL 
    AND expires_at < NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_expire_shares
  AFTER INSERT OR UPDATE ON board_pack_shares
  FOR EACH STATEMENT EXECUTE FUNCTION expire_board_pack_shares();

-- Update board pack access timestamp
CREATE OR REPLACE FUNCTION update_board_pack_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Update last accessed time on the board pack
  UPDATE board_packs 
  SET updated_at = NOW()
  WHERE id = NEW.board_pack_id;
  
  -- Update permission access tracking if applicable
  UPDATE board_pack_permissions 
  SET last_accessed = NOW(), access_count = access_count + 1
  WHERE board_pack_id = NEW.board_pack_id 
    AND (granted_to_user_id = NEW.user_id OR granted_to_role IS NOT NULL);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_board_pack_access
  AFTER INSERT ON board_pack_activity
  FOR EACH ROW 
  WHEN (NEW.action IN ('view', 'download'))
  EXECUTE FUNCTION update_board_pack_access();

-- =====================================================
-- 7. UTILITY FUNCTIONS
-- =====================================================

-- Function to check if user can access board pack
CREATE OR REPLACE FUNCTION user_can_access_board_pack(
  p_user_id UUID,
  p_board_pack_id UUID,
  p_action TEXT DEFAULT 'view'
)
RETURNS BOOLEAN AS $$
DECLARE
  v_organization_id UUID;
  v_user_role organization_role;
  v_has_permission BOOLEAN := false;
BEGIN
  -- Get board pack organization
  SELECT organization_id INTO v_organization_id
  FROM board_packs 
  WHERE id = p_board_pack_id;
  
  IF v_organization_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Get user's role in organization
  SELECT role INTO v_user_role
  FROM organization_members
  WHERE organization_id = v_organization_id
    AND user_id = p_user_id
    AND status = 'active';
  
  IF v_user_role IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check specific permissions
  CASE p_action
    WHEN 'view' THEN
      SELECT COALESCE(
        (SELECT can_view FROM board_pack_permissions 
         WHERE board_pack_id = p_board_pack_id AND granted_to_user_id = p_user_id),
        (SELECT can_view FROM board_pack_permissions 
         WHERE board_pack_id = p_board_pack_id AND granted_to_role = v_user_role),
        v_user_role IN ('owner', 'admin', 'member') -- Default org access
      ) INTO v_has_permission;
    
    WHEN 'download' THEN
      SELECT COALESCE(
        (SELECT can_download FROM board_pack_permissions 
         WHERE board_pack_id = p_board_pack_id AND granted_to_user_id = p_user_id),
        (SELECT can_download FROM board_pack_permissions 
         WHERE board_pack_id = p_board_pack_id AND granted_to_role = v_user_role),
        v_user_role IN ('owner', 'admin', 'member') -- Default for members+
      ) INTO v_has_permission;
    
    ELSE
      v_has_permission := v_user_role IN ('owner', 'admin');
  END CASE;
  
  RETURN COALESCE(v_has_permission, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. MIGRATION TRACKING
-- =====================================================

INSERT INTO _migrations (name, executed_at) 
VALUES ('002-asset-permissions', NOW())
ON CONFLICT (name) DO NOTHING;