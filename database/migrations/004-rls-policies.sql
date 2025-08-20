-- =====================================================
-- ROW LEVEL SECURITY POLICIES - MIGRATION 004
-- Phase 4: Comprehensive RLS Implementation for Multi-Tenant Security
-- =====================================================

-- =====================================================
-- 1. ENABLE RLS ON ALL TABLES
-- =====================================================

-- Core organization tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_features ENABLE ROW LEVEL SECURITY;

-- Board pack and permissions tables
ALTER TABLE board_pack_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_pack_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_pack_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_pack_activity ENABLE ROW LEVEL SECURITY;

-- Security and audit tables
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE encryption_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_processing_records ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 2. UTILITY FUNCTIONS FOR RLS
-- =====================================================

-- Function to get user's organization IDs
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

-- Function to check if user is organization owner/admin
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

-- Function to check if user has specific role in organization
CREATE OR REPLACE FUNCTION has_organization_role(org_id UUID, required_role organization_role)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM organization_members
    WHERE organization_id = org_id
      AND user_id = auth.uid()
      AND role = required_role
      AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to check if user is system admin
CREATE OR REPLACE FUNCTION is_system_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM users
    WHERE id = auth.uid()
      AND role = 'admin'
      AND status = 'approved'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =====================================================
-- 3. ORGANIZATIONS TABLE POLICIES
-- =====================================================

-- Users can view organizations they're members of
CREATE POLICY "Members can view their organizations" ON organizations
  FOR SELECT USING (
    id = ANY(user_organization_ids())
  );

-- Only organization owners can update organization details
CREATE POLICY "Owners can update organizations" ON organizations
  FOR UPDATE USING (
    is_organization_admin(id)
  );

-- Only authenticated users can create organizations (they become owner)
CREATE POLICY "Authenticated users can create organizations" ON organizations
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND created_by = auth.uid()
  );

-- Only owners can delete organizations (soft delete)
CREATE POLICY "Owners can delete organizations" ON organizations
  FOR DELETE USING (
    is_organization_admin(id)
  );

-- =====================================================
-- 4. ORGANIZATION MEMBERS TABLE POLICIES
-- =====================================================

-- Members can view other members in their organizations
CREATE POLICY "Members can view organization membership" ON organization_members
  FOR SELECT USING (
    organization_id = ANY(user_organization_ids())
  );

-- Admins can add new members to their organizations
CREATE POLICY "Admins can add organization members" ON organization_members
  FOR INSERT WITH CHECK (
    is_organization_admin(organization_id)
  );

-- Admins can update member roles and status in their organizations
CREATE POLICY "Admins can update organization members" ON organization_members
  FOR UPDATE USING (
    is_organization_admin(organization_id)
    -- Additional check: cannot demote the last owner
    AND NOT (
      OLD.role = 'owner' AND NEW.role != 'owner' AND
      (SELECT COUNT(*) FROM organization_members 
       WHERE organization_id = OLD.organization_id 
         AND role = 'owner' 
         AND status = 'active' 
         AND id != OLD.id) = 0
    )
  );

-- Admins can remove members from their organizations
CREATE POLICY "Admins can remove organization members" ON organization_members
  FOR DELETE USING (
    is_organization_admin(organization_id)
    -- Cannot delete the last owner
    AND NOT (
      role = 'owner' AND
      (SELECT COUNT(*) FROM organization_members 
       WHERE organization_id = organization_members.organization_id 
         AND role = 'owner' 
         AND status = 'active' 
         AND id != organization_members.id) = 0
    )
  );

-- Users can leave organizations (except last owner)
CREATE POLICY "Users can leave organizations" ON organization_members
  FOR DELETE USING (
    user_id = auth.uid()
    AND NOT (
      role = 'owner' AND
      (SELECT COUNT(*) FROM organization_members om2
       WHERE om2.organization_id = organization_members.organization_id 
         AND om2.role = 'owner' 
         AND om2.status = 'active') = 1
    )
  );

-- =====================================================
-- 5. ORGANIZATION INVITATIONS TABLE POLICIES
-- =====================================================

-- Admins can view invitations for their organizations
CREATE POLICY "Admins can view organization invitations" ON organization_invitations
  FOR SELECT USING (
    is_organization_admin(organization_id)
  );

-- Admins can create invitations for their organizations
CREATE POLICY "Admins can create organization invitations" ON organization_invitations
  FOR INSERT WITH CHECK (
    is_organization_admin(organization_id) AND invited_by = auth.uid()
  );

-- Admins can update invitations for their organizations
CREATE POLICY "Admins can update organization invitations" ON organization_invitations
  FOR UPDATE USING (
    is_organization_admin(organization_id)
  );

-- Invited users can view their own invitations
CREATE POLICY "Users can view their invitations" ON organization_invitations
  FOR SELECT USING (
    email = (SELECT email FROM users WHERE id = auth.uid())
  );

-- =====================================================
-- 6. BOARD PACKS TABLE POLICIES (UPDATED)
-- =====================================================

-- Drop existing policies and create new multi-tenant ones
DROP POLICY IF EXISTS "Approved users can view board packs" ON board_packs;
DROP POLICY IF EXISTS "Directors and admins can insert board packs" ON board_packs;
DROP POLICY IF EXISTS "Directors and admins can update board packs" ON board_packs;
DROP POLICY IF EXISTS "Directors and admins can delete board packs" ON board_packs;

-- Members can view board packs in their organizations
CREATE POLICY "Organization members can view board packs" ON board_packs
  FOR SELECT USING (
    organization_id = ANY(user_organization_ids())
    AND (
      visibility = 'organization' OR
      visibility = 'public' OR
      (visibility = 'private' AND uploaded_by = auth.uid())
    )
  );

-- Members and above can upload board packs to their organizations
CREATE POLICY "Members can upload board packs" ON board_packs
  FOR INSERT WITH CHECK (
    organization_id = ANY(user_organization_ids())
    AND uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = board_packs.organization_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin', 'member')
        AND status = 'active'
    )
  );

-- Uploaders and admins can update their board packs
CREATE POLICY "Users can update their board packs" ON board_packs
  FOR UPDATE USING (
    organization_id = ANY(user_organization_ids())
    AND (
      uploaded_by = auth.uid() OR
      is_organization_admin(organization_id)
    )
  );

-- Uploaders and admins can delete their board packs
CREATE POLICY "Users can delete their board packs" ON board_packs
  FOR DELETE USING (
    organization_id = ANY(user_organization_ids())
    AND (
      uploaded_by = auth.uid() OR
      is_organization_admin(organization_id)
    )
  );

-- =====================================================
-- 7. BOARD PACK PERMISSIONS TABLE POLICIES
-- =====================================================

-- Organization members can view permissions for board packs in their orgs
CREATE POLICY "Members can view board pack permissions" ON board_pack_permissions
  FOR SELECT USING (
    organization_id = ANY(user_organization_ids())
  );

-- Admins and board pack owners can manage permissions
CREATE POLICY "Admins can manage board pack permissions" ON board_pack_permissions
  FOR ALL USING (
    organization_id = ANY(user_organization_ids())
    AND (
      is_organization_admin(organization_id) OR
      EXISTS (
        SELECT 1 FROM board_packs 
        WHERE id = board_pack_permissions.board_pack_id 
          AND uploaded_by = auth.uid()
      )
    )
  );

-- =====================================================
-- 8. BOARD PACK SHARES TABLE POLICIES
-- =====================================================

-- Organization members can view shares for board packs in their orgs
CREATE POLICY "Members can view board pack shares" ON board_pack_shares
  FOR SELECT USING (
    organization_id = ANY(user_organization_ids())
  );

-- Admins and board pack owners can manage shares
CREATE POLICY "Authorized users can manage board pack shares" ON board_pack_shares
  FOR ALL USING (
    organization_id = ANY(user_organization_ids())
    AND (
      is_organization_admin(organization_id) OR
      EXISTS (
        SELECT 1 FROM board_packs 
        WHERE id = board_pack_shares.board_pack_id 
          AND uploaded_by = auth.uid()
      )
    )
  );

-- =====================================================
-- 9. BOARD PACK COMMENTS TABLE POLICIES
-- =====================================================

-- Organization members can view comments on board packs they can access
CREATE POLICY "Members can view board pack comments" ON board_pack_comments
  FOR SELECT USING (
    organization_id = ANY(user_organization_ids())
    AND EXISTS (
      SELECT 1 FROM board_packs 
      WHERE id = board_pack_comments.board_pack_id
        AND organization_id = ANY(user_organization_ids())
    )
    AND (NOT is_private OR user_id = auth.uid() OR is_organization_admin(organization_id))
  );

-- Organization members can create comments on accessible board packs
CREATE POLICY "Members can create board pack comments" ON board_pack_comments
  FOR INSERT WITH CHECK (
    organization_id = ANY(user_organization_ids())
    AND user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM board_packs 
      WHERE id = board_pack_comments.board_pack_id
        AND organization_id = ANY(user_organization_ids())
    )
  );

-- Users can update their own comments, admins can update any
CREATE POLICY "Users can update their comments" ON board_pack_comments
  FOR UPDATE USING (
    organization_id = ANY(user_organization_ids())
    AND (user_id = auth.uid() OR is_organization_admin(organization_id))
  );

-- Users can delete their own comments, admins can delete any
CREATE POLICY "Users can delete their comments" ON board_pack_comments
  FOR DELETE USING (
    organization_id = ANY(user_organization_ids())
    AND (user_id = auth.uid() OR is_organization_admin(organization_id))
  );

-- =====================================================
-- 10. BOARD PACK ACTIVITY TABLE POLICIES
-- =====================================================

-- Users can view their own activity, admins can view organization activity
CREATE POLICY "Users can view relevant board pack activity" ON board_pack_activity
  FOR SELECT USING (
    organization_id = ANY(user_organization_ids())
    AND (
      user_id = auth.uid() OR
      is_organization_admin(organization_id)
    )
  );

-- System and authenticated users can insert activity logs
CREATE POLICY "System can insert board pack activity" ON board_pack_activity
  FOR INSERT WITH CHECK (
    (user_id IS NULL OR user_id = auth.uid())
    AND (organization_id IS NULL OR organization_id = ANY(user_organization_ids()))
  );

-- =====================================================
-- 11. AUDIT LOGS TABLE POLICIES
-- =====================================================

-- Users can view their own audit logs
CREATE POLICY "Users can view their audit logs" ON audit_logs
  FOR SELECT USING (
    user_id = auth.uid()
  );

-- Organization admins can view organization audit logs
CREATE POLICY "Admins can view organization audit logs" ON audit_logs
  FOR SELECT USING (
    organization_id = ANY(user_organization_ids())
    AND is_organization_admin(organization_id)
  );

-- System admins can view all audit logs
CREATE POLICY "System admins can view all audit logs" ON audit_logs
  FOR SELECT USING (
    is_system_admin()
  );

-- System can insert audit logs (via service role)
CREATE POLICY "System can insert audit logs" ON audit_logs
  FOR INSERT WITH CHECK (true);

-- =====================================================
-- 12. SECURITY INCIDENTS TABLE POLICIES
-- =====================================================

-- Organization admins can view incidents affecting their organization
CREATE POLICY "Admins can view organization security incidents" ON security_incidents
  FOR SELECT USING (
    organization_id = ANY(user_organization_ids())
    AND is_organization_admin(organization_id)
  );

-- System admins can view all incidents
CREATE POLICY "System admins can view all security incidents" ON security_incidents
  FOR SELECT USING (
    is_system_admin()
  );

-- System can manage incidents (detection, updates)
CREATE POLICY "System can manage security incidents" ON security_incidents
  FOR ALL WITH CHECK (true);

-- =====================================================
-- 13. USER SESSIONS TABLE POLICIES
-- =====================================================

-- Users can view their own sessions
CREATE POLICY "Users can view their sessions" ON user_sessions
  FOR SELECT USING (
    user_id = auth.uid()
  );

-- Users can terminate their own sessions
CREATE POLICY "Users can terminate their sessions" ON user_sessions
  FOR UPDATE USING (
    user_id = auth.uid()
  );

-- Organization admins can view sessions of their organization members
CREATE POLICY "Admins can view organization member sessions" ON user_sessions
  FOR SELECT USING (
    organization_id = ANY(user_organization_ids())
    AND is_organization_admin(organization_id)
  );

-- System can manage all sessions
CREATE POLICY "System can manage all sessions" ON user_sessions
  FOR ALL WITH CHECK (true);

-- =====================================================
-- 14. RATE LIMITS TABLE POLICIES
-- =====================================================

-- Users can view rate limits that affect them
CREATE POLICY "Users can view their rate limits" ON rate_limits
  FOR SELECT USING (
    identifier = auth.uid()::text OR
    identifier = current_setting('request.headers', true)::json->>'x-forwarded-for'
  );

-- System manages rate limits
CREATE POLICY "System manages rate limits" ON rate_limits
  FOR ALL WITH CHECK (true);

-- =====================================================
-- 15. ENCRYPTION KEYS TABLE POLICIES
-- =====================================================

-- Organization admins can view their organization's encryption keys
CREATE POLICY "Admins can view organization encryption keys" ON encryption_keys
  FOR SELECT USING (
    organization_id = ANY(user_organization_ids())
    AND is_organization_admin(organization_id)
  );

-- Only system admins can manage encryption keys
CREATE POLICY "System admins can manage encryption keys" ON encryption_keys
  FOR ALL USING (
    is_system_admin()
  );

-- =====================================================
-- 16. DATA PROCESSING RECORDS TABLE POLICIES
-- =====================================================

-- Users can view their own data processing records
CREATE POLICY "Users can view their data processing records" ON data_processing_records
  FOR SELECT USING (
    user_id = auth.uid()
  );

-- Organization admins can view processing records for their organization
CREATE POLICY "Admins can view organization data processing records" ON data_processing_records
  FOR SELECT USING (
    organization_id = ANY(user_organization_ids())
    AND is_organization_admin(organization_id)
  );

-- Organization admins can manage processing records for their organization
CREATE POLICY "Admins can manage organization data processing records" ON data_processing_records
  FOR ALL USING (
    organization_id = ANY(user_organization_ids())
    AND is_organization_admin(organization_id)
  );

-- =====================================================
-- 17. STORAGE POLICIES UPDATE
-- =====================================================

-- Update storage policies for multi-tenant architecture
DROP POLICY IF EXISTS "Approved users can view files" ON storage.objects;
DROP POLICY IF EXISTS "Directors and admins can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Directors and admins can update files" ON storage.objects;
DROP POLICY IF EXISTS "Directors and admins can delete files" ON storage.objects;

-- Organization members can view files in their organization's bucket paths
CREATE POLICY "Organization members can view files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'board-packs' 
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM organization_members om
      JOIN board_packs bp ON bp.organization_id = om.organization_id
      WHERE om.user_id = auth.uid()
        AND om.status = 'active'
        AND name LIKE bp.organization_id::text || '/%'
    )
  );

-- Organization members can upload files to their organization's path
CREATE POLICY "Organization members can upload files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'board-packs'
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM organization_members
      WHERE user_id = auth.uid()
        AND status = 'active'
        AND role IN ('owner', 'admin', 'member')
        AND organization_id::text = split_part(name, '/', 1)
    )
  );

-- File uploaders and organization admins can update files
CREATE POLICY "Authorized users can update files" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'board-packs'
    AND auth.uid() IS NOT NULL
    AND (
      owner = auth.uid() OR
      EXISTS (
        SELECT 1 FROM organization_members
        WHERE user_id = auth.uid()
          AND status = 'active'
          AND role IN ('owner', 'admin')
          AND organization_id::text = split_part(name, '/', 1)
      )
    )
  );

-- File uploaders and organization admins can delete files
CREATE POLICY "Authorized users can delete files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'board-packs'
    AND auth.uid() IS NOT NULL
    AND (
      owner = auth.uid() OR
      EXISTS (
        SELECT 1 FROM organization_members
        WHERE user_id = auth.uid()
          AND status = 'active'
          AND role IN ('owner', 'admin')
          AND organization_id::text = split_part(name, '/', 1)
      )
    )
  );

-- =====================================================
-- 18. SECURITY VALIDATION
-- =====================================================

-- Function to validate RLS is working correctly
CREATE OR REPLACE FUNCTION validate_rls_policies()
RETURNS TABLE(table_name TEXT, has_rls BOOLEAN, policy_count INTEGER) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.table_name::TEXT,
    t.row_security::BOOLEAN,
    COUNT(p.policyname)::INTEGER
  FROM information_schema.tables t
  LEFT JOIN pg_policies p ON p.tablename = t.table_name
  WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
    AND t.table_name NOT IN ('_migrations')
  GROUP BY t.table_name, t.row_security
  ORDER BY t.table_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 19. MIGRATION TRACKING
-- =====================================================

INSERT INTO _migrations (name, executed_at) 
VALUES ('004-rls-policies', NOW())
ON CONFLICT (name) DO NOTHING;

-- Final validation check
DO $$
DECLARE
  v_validation RECORD;
  v_issues TEXT[] := '{}';
BEGIN
  -- Check that all important tables have RLS enabled
  FOR v_validation IN SELECT * FROM validate_rls_policies() LOOP
    IF NOT v_validation.has_rls AND v_validation.table_name NOT LIKE '\_%' THEN
      v_issues := array_append(v_issues, 
        format('Table %s does not have RLS enabled', v_validation.table_name));
    END IF;
    
    IF v_validation.policy_count = 0 AND v_validation.table_name NOT LIKE '\_%' THEN
      v_issues := array_append(v_issues, 
        format('Table %s has no RLS policies', v_validation.table_name));
    END IF;
  END LOOP;
  
  IF array_length(v_issues, 1) > 0 THEN
    RAISE WARNING 'RLS validation issues found: %', array_to_string(v_issues, '; ');
  ELSE
    RAISE NOTICE 'RLS validation passed - all tables properly secured';
  END IF;
END;
$$;