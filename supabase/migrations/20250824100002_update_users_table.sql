-- =====================================================
-- UPDATE USERS TABLE (CONDITIONAL)
-- Add LinkedIn URL and designation fields if users table exists
-- =====================================================

-- Only run these updates if the users table exists and doesn't already have these columns
DO $$
BEGIN
    -- Check if users table exists and add columns if missing
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users') THEN
        -- Add LinkedIn URL field if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'linkedin_url') THEN
            ALTER TABLE users ADD COLUMN linkedin_url TEXT;
        END IF;
        
        -- Add designation field if it doesn't exist  
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'designation') THEN
            ALTER TABLE users ADD COLUMN designation VARCHAR(200);
        END IF;
        
        -- Add bio field if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'bio') THEN
            ALTER TABLE users ADD COLUMN bio TEXT;
        END IF;
        
        -- Add constraints if they don't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.constraint_column_usage WHERE constraint_name = 'check_linkedin_url_format') THEN
            ALTER TABLE users ADD CONSTRAINT check_linkedin_url_format 
            CHECK (
                linkedin_url IS NULL OR 
                linkedin_url ~ '^https?://(www\.)?linkedin\.com/.*' OR
                linkedin_url ~ '^https?://(www\.)?linkedin\.com/in/.*'
            );
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.constraint_column_usage WHERE constraint_name = 'check_designation_length') THEN
            ALTER TABLE users ADD CONSTRAINT check_designation_length 
            CHECK (designation IS NULL OR length(designation) <= 200);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.constraint_column_usage WHERE constraint_name = 'check_bio_length') THEN
            ALTER TABLE users ADD CONSTRAINT check_bio_length 
            CHECK (bio IS NULL OR length(bio) <= 2000);
        END IF;
    END IF;
END $$;

-- =====================================================
-- CREATE VIEW FOR BOARDMATE PROFILES
-- Comprehensive view combining user info with associations
-- =====================================================

CREATE OR REPLACE VIEW boardmate_profiles AS
SELECT 
  u.id,
  u.email,
  u.full_name,
  u.avatar_url,
  u.role as system_role,
  u.status as user_status,
  u.company,
  u.position,
  u.designation,
  u.linkedin_url,
  u.bio,
  u.created_at as user_created_at,
  u.updated_at as user_updated_at,
  
  -- Organization membership
  om.organization_id,
  om.role as org_role,
  om.status as org_status,
  om.joined_at as org_joined_at,
  om.last_accessed as org_last_accessed,
  o.name as organization_name,
  o.logo_url as organization_logo,
  
  -- Board memberships (aggregated)
  COALESCE(
    json_agg(
      DISTINCT jsonb_build_object(
        'board_id', bm.board_id,
        'board_name', b.name,
        'board_type', b.board_type,
        'board_status', b.status,
        'member_role', bm.role,
        'member_status', bm.status,
        'appointed_date', bm.appointed_date,
        'term_start_date', bm.term_start_date,
        'term_end_date', bm.term_end_date,
        'is_voting_member', bm.is_voting_member,
        'attendance_rate', bm.attendance_rate
      )
    ) FILTER (WHERE bm.id IS NOT NULL), 
    '[]'::json
  ) as board_memberships,
  
  -- Committee memberships (aggregated)
  COALESCE(
    json_agg(
      DISTINCT jsonb_build_object(
        'committee_id', cm.committee_id,
        'committee_name', c.name,
        'committee_type', c.committee_type,
        'committee_status', c.status,
        'board_name', cb.name,
        'member_role', cm.role,
        'member_status', cm.status,
        'appointed_date', cm.appointed_date,
        'term_start_date', cm.term_start_date,
        'term_end_date', cm.term_end_date,
        'is_voting_member', cm.is_voting_member,
        'attendance_rate', cm.attendance_rate
      )
    ) FILTER (WHERE cm.id IS NOT NULL), 
    '[]'::json
  ) as committee_memberships,
  
  -- Vault memberships (aggregated)
  COALESCE(
    json_agg(
      DISTINCT jsonb_build_object(
        'vault_id', vm.vault_id,
        'vault_name', v.name,
        'vault_status', v.status,
        'member_role', vm.role,
        'member_status', vm.status,
        'joined_at', vm.joined_at,
        'last_accessed_at', vm.last_accessed_at,
        'access_count', vm.access_count
      )
    ) FILTER (WHERE vm.id IS NOT NULL), 
    '[]'::json
  ) as vault_memberships

FROM users u
LEFT JOIN organization_members om ON u.id = om.user_id
LEFT JOIN organizations o ON om.organization_id = o.id
LEFT JOIN board_members bm ON u.id = bm.user_id AND bm.status = 'active'
LEFT JOIN boards b ON bm.board_id = b.id
LEFT JOIN committee_members cm ON u.id = cm.user_id AND cm.status = 'active'
LEFT JOIN committees c ON cm.committee_id = c.id
LEFT JOIN boards cb ON cm.board_id = cb.id
LEFT JOIN vault_members vm ON u.id = vm.user_id AND vm.status = 'active'
LEFT JOIN vaults v ON vm.vault_id = v.id

WHERE u.status = 'approved'
GROUP BY 
  u.id, u.email, u.full_name, u.avatar_url, u.role, u.status, 
  u.company, u.position, u.designation, u.linkedin_url, u.bio,
  u.created_at, u.updated_at,
  om.organization_id, om.role, om.status, om.joined_at, om.last_accessed,
  o.name, o.logo_url;

-- Add RLS policy for the view
CREATE POLICY "Users can view boardmate profiles in their organization" ON boardmate_profiles
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- SEED DATA FOR TESTING
-- Create sample boards and committees
-- =====================================================

-- Insert sample boards (only if they don't exist)
INSERT INTO boards (id, name, description, board_type, organization_id, created_by, established_date, settings)
SELECT 
  gen_random_uuid(),
  'Main Board of Directors',
  'Primary board of directors responsible for strategic oversight and governance',
  'main_board',
  o.id,
  u.id,
  '2020-01-01',
  '{"quorum_requirement": 60, "voting_threshold": 50, "allow_virtual_meetings": true}'::jsonb
FROM organizations o
CROSS JOIN (SELECT id FROM auth.users LIMIT 1) u
WHERE o.name IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM boards WHERE name = 'Main Board of Directors' AND organization_id = o.id)
LIMIT 1;

-- Insert sample committees
INSERT INTO committees (id, name, description, committee_type, organization_id, board_id, created_by, established_date)
SELECT 
  gen_random_uuid(),
  'Audit Committee',
  'Responsible for oversight of financial reporting and internal controls',
  'audit',
  o.id,
  b.id,
  u.id,
  '2020-01-01'
FROM organizations o
CROSS JOIN boards b ON b.organization_id = o.id AND b.board_type = 'main_board'
CROSS JOIN (SELECT id FROM auth.users LIMIT 1) u
WHERE o.name IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM committees WHERE name = 'Audit Committee' AND organization_id = o.id)
LIMIT 1;

INSERT INTO committees (id, name, description, committee_type, organization_id, board_id, created_by, established_date)
SELECT 
  gen_random_uuid(),
  'Compensation Committee',
  'Responsible for executive compensation and benefits',
  'compensation',
  o.id,
  b.id,
  u.id,
  '2020-01-01'
FROM organizations o
CROSS JOIN boards b ON b.organization_id = o.id AND b.board_type = 'main_board'
CROSS JOIN (SELECT id FROM auth.users LIMIT 1) u
WHERE o.name IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM committees WHERE name = 'Compensation Committee' AND organization_id = o.id)
LIMIT 1;