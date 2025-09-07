-- ============================================
-- COMPREHENSIVE FIX FOR ALL SCHEMA ISSUES
-- Run this SINGLE migration to fix everything
-- ============================================

-- Create helper function to safely add columns
CREATE OR REPLACE FUNCTION add_column_if_not_exists(
    p_table_name text,
    p_column_name text,
    p_column_definition text
)
RETURNS void AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = p_table_name
        AND column_name = p_column_name
    ) THEN
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN %I %s', p_table_name, p_column_name, p_column_definition);
        RAISE NOTICE 'Added column % to table %', p_column_name, p_table_name;
    END IF;
EXCEPTION
    WHEN undefined_table THEN
        RAISE NOTICE 'Table % does not exist, will create it', p_table_name;
    WHEN OTHERS THEN
        RAISE NOTICE 'Error adding column % to table %: %', p_column_name, p_table_name, SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 1. CREATE BOARDS TABLE (Critical - Missing!)
-- ============================================
CREATE TABLE IF NOT EXISTS public.boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) DEFAULT 'board',
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'active',
  settings JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for boards
CREATE INDEX IF NOT EXISTS idx_boards_organization_id ON boards(organization_id);
CREATE INDEX IF NOT EXISTS idx_boards_status ON boards(status);

-- ============================================
-- 2. CREATE BOARD_MEMBERS TABLE (Critical - Missing!)
-- ============================================
CREATE TABLE IF NOT EXISTS public.board_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member',
  status VARCHAR(50) DEFAULT 'active',
  term_start DATE,
  term_end DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(board_id, user_id)
);

-- Create indexes for board_members
CREATE INDEX IF NOT EXISTS idx_board_members_board_id ON board_members(board_id);
CREATE INDEX IF NOT EXISTS idx_board_members_user_id ON board_members(user_id);

-- ============================================
-- 3. CREATE MEETING_ATTENDEES TABLE (Critical - Missing!)
-- ============================================
CREATE TABLE IF NOT EXISTS public.meeting_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'attendee',
  status VARCHAR(50) DEFAULT 'invited',
  invitation_sent_at TIMESTAMPTZ,
  response_at TIMESTAMPTZ,
  attended BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(meeting_id, user_id)
);

-- Create indexes for meeting_attendees
CREATE INDEX IF NOT EXISTS idx_meeting_attendees_meeting_id ON meeting_attendees(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_attendees_user_id ON meeting_attendees(user_id);

-- ============================================
-- 4. ADD MISSING COLUMNS TO ORGANIZATIONS
-- ============================================
SELECT add_column_if_not_exists('organizations', 'status', 'VARCHAR(50) DEFAULT ''active''');
SELECT add_column_if_not_exists('organizations', 'slug', 'VARCHAR(255)');
SELECT add_column_if_not_exists('organizations', 'type', 'VARCHAR(50) DEFAULT ''corporate''');
SELECT add_column_if_not_exists('organizations', 'settings', 'JSONB DEFAULT ''{}''::jsonb');
SELECT add_column_if_not_exists('organizations', 'metadata', 'JSONB DEFAULT ''{}''::jsonb');

-- Generate slugs for organizations without them
UPDATE organizations 
SET slug = LOWER(
    REGEXP_REPLACE(
        REGEXP_REPLACE(name, '[^a-zA-Z0-9\s-]', '', 'g'), 
        '\s+', '-', 'g'
    )
) || '-' || LEFT(MD5(RANDOM()::text), 6)
WHERE slug IS NULL OR slug = '';

-- ============================================
-- 5. ADD MISSING COLUMNS TO MEETINGS
-- ============================================
SELECT add_column_if_not_exists('meetings', 'board_id', 'UUID REFERENCES boards(id) ON DELETE CASCADE');
SELECT add_column_if_not_exists('meetings', 'chairperson_id', 'UUID REFERENCES auth.users(id)');
SELECT add_column_if_not_exists('meetings', 'secretary_id', 'UUID REFERENCES auth.users(id)');
SELECT add_column_if_not_exists('meetings', 'created_by', 'UUID REFERENCES auth.users(id)');
SELECT add_column_if_not_exists('meetings', 'updated_by', 'UUID REFERENCES auth.users(id)');
SELECT add_column_if_not_exists('meetings', 'location', 'JSONB DEFAULT ''{\"type\": \"virtual\"}''::jsonb');
SELECT add_column_if_not_exists('meetings', 'agenda_items', 'JSONB DEFAULT ''[]''::jsonb');
SELECT add_column_if_not_exists('meetings', 'minutes', 'JSONB');
SELECT add_column_if_not_exists('meetings', 'decisions', 'JSONB DEFAULT ''[]''::jsonb');
SELECT add_column_if_not_exists('meetings', 'action_items', 'JSONB DEFAULT ''[]''::jsonb');
SELECT add_column_if_not_exists('meetings', 'documents', 'JSONB DEFAULT ''[]''::jsonb');
SELECT add_column_if_not_exists('meetings', 'recordings', 'JSONB DEFAULT ''[]''::jsonb');
SELECT add_column_if_not_exists('meetings', 'attendees', 'JSONB DEFAULT ''[]''::jsonb');
SELECT add_column_if_not_exists('meetings', 'quorum_required', 'INTEGER DEFAULT 1');
SELECT add_column_if_not_exists('meetings', 'attendance_count', 'INTEGER DEFAULT 0');
SELECT add_column_if_not_exists('meetings', 'recurrence', 'JSONB');
SELECT add_column_if_not_exists('meetings', 'parent_meeting_id', 'UUID REFERENCES meetings(id)');
SELECT add_column_if_not_exists('meetings', 'tags', 'TEXT[] DEFAULT ''{}''');
SELECT add_column_if_not_exists('meetings', 'metadata', 'JSONB DEFAULT ''{}''::jsonb');
SELECT add_column_if_not_exists('meetings', 'actual_start', 'TIMESTAMPTZ');
SELECT add_column_if_not_exists('meetings', 'actual_end', 'TIMESTAMPTZ');

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_meetings_board_id ON meetings(board_id);
CREATE INDEX IF NOT EXISTS idx_meetings_chairperson_id ON meetings(chairperson_id);
CREATE INDEX IF NOT EXISTS idx_meetings_created_by ON meetings(created_by);

-- ============================================
-- 6. ENABLE RLS ON ALL TABLES
-- ============================================
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_attendees ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 7. CREATE RLS POLICIES FOR BOARDS
-- ============================================
DROP POLICY IF EXISTS "view_org_boards" ON boards;
CREATE POLICY "view_org_boards" ON boards
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = boards.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "manage_org_boards" ON boards;
CREATE POLICY "manage_org_boards" ON boards
  FOR ALL USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = boards.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role IN ('admin', 'owner')
    )
  );

-- ============================================
-- 8. CREATE RLS POLICIES FOR BOARD_MEMBERS
-- ============================================
DROP POLICY IF EXISTS "view_board_members" ON board_members;
CREATE POLICY "view_board_members" ON board_members
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND (
      user_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM board_members bm
        WHERE bm.user_id = auth.uid()
        AND bm.board_id = board_members.board_id
      )
    )
  );

DROP POLICY IF EXISTS "manage_board_members" ON board_members;
CREATE POLICY "manage_board_members" ON board_members
  FOR ALL USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM board_members bm
      WHERE bm.user_id = auth.uid()
      AND bm.board_id = board_members.board_id
      AND bm.role IN ('chair', 'admin')
    )
  );

-- ============================================
-- 9. CREATE RLS POLICIES FOR MEETING_ATTENDEES
-- ============================================
DROP POLICY IF EXISTS "view_meeting_attendees" ON meeting_attendees;
CREATE POLICY "view_meeting_attendees" ON meeting_attendees
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND (
      user_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM meeting_attendees ma
        WHERE ma.user_id = auth.uid()
        AND ma.meeting_id = meeting_attendees.meeting_id
      )
    )
  );

DROP POLICY IF EXISTS "manage_meeting_attendees" ON meeting_attendees;
CREATE POLICY "manage_meeting_attendees" ON meeting_attendees
  FOR ALL USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM meetings m
      WHERE m.id = meeting_attendees.meeting_id
      AND (m.created_by = auth.uid() OR m.chairperson_id = auth.uid())
    )
  );

-- ============================================
-- 10. CREATE UPDATE TRIGGERS
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for new tables
DROP TRIGGER IF EXISTS update_boards_updated_at ON boards;
CREATE TRIGGER update_boards_updated_at BEFORE UPDATE ON boards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_board_members_updated_at ON board_members;
CREATE TRIGGER update_board_members_updated_at BEFORE UPDATE ON board_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_meeting_attendees_updated_at ON meeting_attendees;
CREATE TRIGGER update_meeting_attendees_updated_at BEFORE UPDATE ON meeting_attendees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 11. GRANT PERMISSIONS
-- ============================================
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- ============================================
-- 12. CREATE SAMPLE BOARD DATA
-- ============================================
DO $$
DECLARE
  test_org_id UUID;
  test_user_id UUID;
  test_board_id UUID;
BEGIN
  -- Get first organization
  SELECT id INTO test_org_id FROM organizations LIMIT 1;
  
  -- Get first user
  SELECT id INTO test_user_id FROM auth.users LIMIT 1;
  
  IF test_org_id IS NOT NULL AND test_user_id IS NOT NULL THEN
    -- Create a sample board
    INSERT INTO boards (name, description, type, organization_id, status)
    VALUES (
      'Board of Directors',
      'Main governing board',
      'board',
      test_org_id,
      'active'
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO test_board_id;
    
    -- Add user as board member if board was created
    IF test_board_id IS NOT NULL THEN
      INSERT INTO board_members (board_id, user_id, role, status)
      VALUES (test_board_id, test_user_id, 'chair', 'active')
      ON CONFLICT (board_id, user_id) DO NOTHING;
      
      RAISE NOTICE 'Sample board created with ID: %', test_board_id;
    END IF;
  END IF;
END $$;

-- ============================================
-- 13. CLEANUP
-- ============================================
DROP FUNCTION IF EXISTS add_column_if_not_exists(text, text, text);

-- ============================================
-- MIGRATION COMPLETE!
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'MIGRATION COMPLETE!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Fixed issues:';
  RAISE NOTICE '1. Created boards table';
  RAISE NOTICE '2. Created board_members table';
  RAISE NOTICE '3. Created meeting_attendees table';
  RAISE NOTICE '4. Added status column to organizations';
  RAISE NOTICE '5. Added ALL missing columns to meetings (board_id, chairperson_id, etc.)';
  RAISE NOTICE '6. Set up RLS policies';
  RAISE NOTICE '7. Created sample board data';
  RAISE NOTICE '========================================';
END $$;