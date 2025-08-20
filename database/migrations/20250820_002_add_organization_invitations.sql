-- =====================================================
-- ORGANIZATION INVITATIONS SYSTEM
-- Migration: 20250820_002_add_organization_invitations.sql
-- Description: Add organization invitations table for vault creation workflow
-- Created: 2025-08-20
-- =====================================================

-- =====================================================
-- UP MIGRATION
-- =====================================================

-- Create organization invitations table
CREATE TABLE IF NOT EXISTS organization_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Organization and invitation details
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'member', 'viewer')),
  
  -- Invitation metadata
  invited_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'accepted', 'declined', 'expired', 'cancelled')
  ),
  
  -- Invitation token and expiry
  invitation_token VARCHAR(255) UNIQUE DEFAULT gen_random_uuid()::text,
  expires_at TIMESTAMPTZ NOT NULL,
  
  -- Response tracking
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  declined_at TIMESTAMPTZ,
  declined_reason TEXT,
  
  -- Additional data (vault info, custom message, etc.)
  invitation_data JSONB DEFAULT '{}'::jsonb,
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(organization_id, email) -- Prevent duplicate invitations
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_organization_invitations_org_id ON organization_invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_invitations_email ON organization_invitations(email);
CREATE INDEX IF NOT EXISTS idx_organization_invitations_token ON organization_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_organization_invitations_status ON organization_invitations(status);
CREATE INDEX IF NOT EXISTS idx_organization_invitations_expires_at ON organization_invitations(expires_at);
CREATE INDEX IF NOT EXISTS idx_organization_invitations_invited_by ON organization_invitations(invited_by);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_organization_invitations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_organization_invitations_updated_at
  BEFORE UPDATE ON organization_invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_organization_invitations_updated_at();

-- Enable RLS
ALTER TABLE organization_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Policy: Service role can manage all invitations
CREATE POLICY "Service role full access to organization_invitations" ON organization_invitations
  FOR ALL USING (auth.role() = 'service_role');

-- Policy: Users can view invitations for organizations they're members of
CREATE POLICY "Organization members can view invitations" ON organization_invitations
  FOR SELECT USING (
    auth.role() = 'authenticated' AND
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid() 
      AND status = 'active'
      AND role IN ('owner', 'admin')
    )
  );

-- Policy: Organization admins can create invitations
CREATE POLICY "Organization admins can create invitations" ON organization_invitations
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND
    invited_by = auth.uid() AND
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid() 
      AND status = 'active'
      AND role IN ('owner', 'admin')
    )
  );

-- Policy: Organization admins can update invitations they created
CREATE POLICY "Organization admins can update their invitations" ON organization_invitations
  FOR UPDATE USING (
    auth.role() = 'authenticated' AND
    (
      invited_by = auth.uid() OR
      organization_id IN (
        SELECT organization_id 
        FROM organization_members 
        WHERE user_id = auth.uid() 
        AND status = 'active'
        AND role IN ('owner', 'admin')
      )
    )
  );

-- Policy: Users can update invitations sent to their email
CREATE POLICY "Users can update invitations sent to them" ON organization_invitations
  FOR UPDATE USING (
    auth.role() = 'authenticated' AND
    email = (SELECT email FROM users WHERE id = auth.uid())
  );

-- Create view for invitation management
CREATE OR REPLACE VIEW organization_invitations_with_details AS
SELECT 
  oi.id,
  oi.organization_id,
  oi.email,
  oi.full_name,
  oi.role,
  oi.status,
  oi.invitation_token,
  oi.expires_at,
  oi.accepted_at,
  oi.declined_at,
  oi.declined_reason,
  oi.invitation_data,
  oi.created_at,
  oi.updated_at,
  
  -- Organization details
  o.name as organization_name,
  o.slug as organization_slug,
  
  -- Inviter details
  u.full_name as invited_by_name,
  u.email as invited_by_email,
  
  -- Accepter details (if accepted)
  ua.full_name as accepted_by_name,
  ua.email as accepted_by_email,
  
  -- Computed fields
  CASE 
    WHEN oi.expires_at < NOW() AND oi.status = 'pending' THEN true
    ELSE false
  END as is_expired,
  
  EXTRACT(EPOCH FROM (oi.expires_at - NOW())) as seconds_until_expiry
  
FROM organization_invitations oi
JOIN organizations o ON oi.organization_id = o.id
JOIN users u ON oi.invited_by = u.id
LEFT JOIN users ua ON oi.accepted_by = ua.id;

-- Grant permissions on the view
GRANT SELECT ON organization_invitations_with_details TO authenticated;
GRANT SELECT ON organization_invitations_with_details TO service_role;

-- Function to cleanup expired invitations
CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE organization_invitations 
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'pending' 
  AND expires_at < NOW();
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- DOWN MIGRATION (Rollback)
-- =====================================================

/*
-- Uncomment to enable rollback

-- Drop function
DROP FUNCTION IF EXISTS cleanup_expired_invitations();

-- Drop view
DROP VIEW IF EXISTS organization_invitations_with_details;

-- Drop trigger and function
DROP TRIGGER IF EXISTS trigger_organization_invitations_updated_at ON organization_invitations;
DROP FUNCTION IF EXISTS update_organization_invitations_updated_at();

-- Drop indexes
DROP INDEX IF EXISTS idx_organization_invitations_invited_by;
DROP INDEX IF EXISTS idx_organization_invitations_expires_at;
DROP INDEX IF EXISTS idx_organization_invitations_status;
DROP INDEX IF EXISTS idx_organization_invitations_token;
DROP INDEX IF EXISTS idx_organization_invitations_email;
DROP INDEX IF EXISTS idx_organization_invitations_org_id;

-- Drop table
DROP TABLE IF EXISTS organization_invitations;

*/

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================