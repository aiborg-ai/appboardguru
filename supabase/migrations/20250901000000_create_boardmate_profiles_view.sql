-- =====================================================
-- CREATE VIEW FOR BOARDMATE PROFILES
-- Comprehensive view combining user info with associations
-- Safe migration that checks for dependencies
-- =====================================================

-- Drop existing view if it exists
DROP VIEW IF EXISTS boardmate_profiles CASCADE;

-- Create the boardmate_profiles view
-- This view provides a comprehensive profile for each user including their associations
CREATE OR REPLACE VIEW boardmate_profiles AS
SELECT 
  u.id,
  u.email,
  u.full_name,
  u.avatar_url,
  u.role as system_role,
  u.status as user_status,
  COALESCE(u.company, 'Not specified') as company,
  COALESCE(u.position, 'Not specified') as position,
  COALESCE(u.designation, 'Board Member') as designation,
  u.linkedin_url,
  u.bio,
  u.created_at as user_created_at,
  u.updated_at as user_updated_at,
  
  -- Organization membership (if table exists)
  om.organization_id,
  COALESCE(om.role, 'member') as org_role,
  COALESCE(om.status, 'active') as org_status,
  om.joined_at as org_joined_at,
  om.last_accessed as org_last_accessed,
  COALESCE(o.name, 'Demo Organization') as organization_name,
  o.logo_url as organization_logo,
  
  -- Board memberships (return empty array if tables don't exist)
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'board_members') THEN
      COALESCE(
        (
          SELECT json_agg(
            jsonb_build_object(
              'board_id', bm.board_id,
              'board_name', COALESCE(b.name, 'Board'),
              'board_type', COALESCE(b.board_type, 'main_board'),
              'board_status', COALESCE(b.status, 'active'),
              'member_role', COALESCE(bm.role, 'board_member'),
              'member_status', COALESCE(bm.status, 'active'),
              'appointed_date', bm.appointed_date,
              'term_start_date', bm.term_start_date,
              'term_end_date', bm.term_end_date,
              'is_voting_member', COALESCE(bm.is_voting_member, true),
              'attendance_rate', COALESCE(bm.attendance_rate, 0)
            )
          )
          FROM board_members bm
          LEFT JOIN boards b ON b.id = bm.board_id
          WHERE bm.user_id = u.id
            AND bm.status = 'active'
        ),
        '[]'::json
      )
    ELSE '[]'::json
  END as board_memberships,
  
  -- Committee memberships (return empty array if tables don't exist)
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'committee_members') THEN
      COALESCE(
        (
          SELECT json_agg(
            jsonb_build_object(
              'committee_id', cm.committee_id,
              'committee_name', COALESCE(c.name, 'Committee'),
              'committee_type', COALESCE(c.committee_type, 'general'),
              'committee_status', COALESCE(c.status, 'active'),
              'board_name', COALESCE(b2.name, 'Board'),
              'member_role', COALESCE(cm.role, 'member'),
              'member_status', COALESCE(cm.status, 'active'),
              'appointed_date', cm.appointed_date,
              'term_start_date', cm.term_start_date,
              'term_end_date', cm.term_end_date,
              'is_voting_member', COALESCE(cm.is_voting_member, true),
              'attendance_rate', COALESCE(cm.attendance_rate, 0)
            )
          )
          FROM committee_members cm
          LEFT JOIN committees c ON c.id = cm.committee_id
          LEFT JOIN boards b2 ON b2.id = c.board_id
          WHERE cm.user_id = u.id
            AND cm.status = 'active'
        ),
        '[]'::json
      )
    ELSE '[]'::json
  END as committee_memberships,
  
  -- Vault memberships (return empty array if tables don't exist)
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vault_members') THEN
      COALESCE(
        (
          SELECT json_agg(
            jsonb_build_object(
              'vault_id', vm.vault_id,
              'vault_name', COALESCE(v.name, 'Vault'),
              'vault_status', COALESCE(v.status, 'active'),
              'member_role', COALESCE(vm.role, 'viewer'),
              'member_status', COALESCE(vm.status, 'active'),
              'joined_at', vm.joined_at,
              'last_accessed_at', vm.last_accessed_at,
              'access_count', COALESCE(vm.access_count, 0)
            )
          )
          FROM vault_members vm
          LEFT JOIN vaults v ON v.id = vm.vault_id
          WHERE vm.user_id = u.id
            AND vm.status = 'active'
        ),
        '[]'::json
      )
    ELSE '[]'::json
  END as vault_memberships

FROM users u
LEFT JOIN organization_members om ON om.user_id = u.id
LEFT JOIN organizations o ON o.id = om.organization_id
WHERE u.status = 'approved';

-- Grant appropriate permissions
GRANT SELECT ON boardmate_profiles TO authenticated;
GRANT SELECT ON boardmate_profiles TO anon;

-- Add comment explaining the view
COMMENT ON VIEW boardmate_profiles IS 'Comprehensive view of user profiles with all their board, committee, and vault associations';