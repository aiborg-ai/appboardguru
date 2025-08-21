-- =====================================================
-- UPDATE USERS TABLE
-- Add LinkedIn URL and designation fields for enhanced profiles
-- =====================================================

-- Add LinkedIn URL field to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
ADD COLUMN IF NOT EXISTS designation VARCHAR(200),
ADD COLUMN IF NOT EXISTS bio TEXT;

-- Add constraints for the new fields
ALTER TABLE users 
ADD CONSTRAINT IF NOT EXISTS check_linkedin_url_format 
CHECK (
  linkedin_url IS NULL OR 
  linkedin_url ~ '^https?://(www\.)?linkedin\.com/.*' OR
  linkedin_url ~ '^https?://(www\.)?linkedin\.com/in/.*'
);

ALTER TABLE users 
ADD CONSTRAINT IF NOT EXISTS check_designation_length 
CHECK (designation IS NULL OR length(designation) <= 200);

ALTER TABLE users 
ADD CONSTRAINT IF NOT EXISTS check_bio_length 
CHECK (bio IS NULL OR length(bio) <= 2000);

-- Add index on designation for filtering
CREATE INDEX IF NOT EXISTS idx_users_designation ON users(designation);

-- Add index on linkedin_url for searches
CREATE INDEX IF NOT EXISTS idx_users_linkedin_url ON users(linkedin_url) WHERE linkedin_url IS NOT NULL;

-- Update existing users to populate designation from position field if available
UPDATE users 
SET designation = position 
WHERE designation IS NULL AND position IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN users.linkedin_url IS 'LinkedIn profile URL for professional networking';
COMMENT ON COLUMN users.designation IS 'Official title or designation (e.g., Chairman, CEO, Independent Director)';
COMMENT ON COLUMN users.bio IS 'Professional biography or summary';

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

-- Enable RLS on the view (inherits from base tables)
ALTER VIEW boardmate_profiles OWNER TO postgres;

-- =====================================================
-- SEED DATA FOR TESTING
-- Create sample boards and committees
-- =====================================================

-- Insert sample boards (only if they don't exist)
DO $$
DECLARE
    org_record RECORD;
    user_record RECORD;
BEGIN
    -- Get first organization and user for sample data
    SELECT INTO org_record * FROM organizations LIMIT 1;
    SELECT INTO user_record * FROM users WHERE status = 'approved' LIMIT 1;
    
    IF org_record.id IS NOT NULL AND user_record.id IS NOT NULL THEN
        -- Insert sample board if it doesn't exist
        INSERT INTO boards (id, name, description, board_type, organization_id, created_by, established_date, settings)
        SELECT 
            gen_random_uuid(),
            'Main Board of Directors',
            'Primary board of directors responsible for strategic oversight and governance',
            'main_board',
            org_record.id,
            user_record.id,
            '2020-01-01',
            '{"quorum_requirement": 60, "voting_threshold": 50, "allow_virtual_meetings": true}'::jsonb
        WHERE NOT EXISTS (
            SELECT 1 FROM boards WHERE name = 'Main Board of Directors' AND organization_id = org_record.id
        );

        -- Insert sample committees
        INSERT INTO committees (id, name, description, committee_type, organization_id, board_id, created_by, established_date)
        SELECT 
            gen_random_uuid(),
            'Audit Committee',
            'Responsible for oversight of financial reporting and internal controls',
            'audit',
            org_record.id,
            b.id,
            user_record.id,
            '2020-01-01'
        FROM boards b 
        WHERE b.name = 'Main Board of Directors' AND b.organization_id = org_record.id
        AND NOT EXISTS (
            SELECT 1 FROM committees WHERE name = 'Audit Committee' AND organization_id = org_record.id
        );

        INSERT INTO committees (id, name, description, committee_type, organization_id, board_id, created_by, established_date)
        SELECT 
            gen_random_uuid(),
            'Compensation Committee',
            'Responsible for executive compensation and benefits',
            'compensation',
            org_record.id,
            b.id,
            user_record.id,
            '2020-01-01'
        FROM boards b 
        WHERE b.name = 'Main Board of Directors' AND b.organization_id = org_record.id
        AND NOT EXISTS (
            SELECT 1 FROM committees WHERE name = 'Compensation Committee' AND organization_id = org_record.id
        );
    END IF;
END $$;