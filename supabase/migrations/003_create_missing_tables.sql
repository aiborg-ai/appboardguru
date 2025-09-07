-- Create only missing tables - Safe to run multiple times
-- This migration creates tables only if they don't exist

-- ============================================
-- 1. Ensure organizations table exists
-- ============================================
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE,
  description TEXT,
  logo_url TEXT,
  website TEXT,
  industry VARCHAR(100),
  size VARCHAR(50),
  type VARCHAR(50) DEFAULT 'corporate',
  status VARCHAR(50) DEFAULT 'active',
  settings JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. Ensure users table exists
-- ============================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255),
  avatar_url TEXT,
  role VARCHAR(50) DEFAULT 'user',
  status VARCHAR(50) DEFAULT 'active',
  password_set BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. CREATE BOARDS TABLE (This is what's missing!)
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

-- ============================================
-- 4. Create organization_members table
-- ============================================
CREATE TABLE IF NOT EXISTS public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member',
  status VARCHAR(50) DEFAULT 'active',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- ============================================
-- 5. Create board_members table
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

-- ============================================
-- 6. Create meetings table (with board_id reference)
-- ============================================
CREATE TABLE IF NOT EXISTS public.meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) DEFAULT 'board',
  status VARCHAR(50) DEFAULT 'scheduled',
  
  -- Associations (board_id can be NULL)
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Schedule
  scheduled_start TIMESTAMPTZ NOT NULL,
  scheduled_end TIMESTAMPTZ NOT NULL,
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  
  -- Location
  location JSONB DEFAULT '{"type": "virtual"}',
  
  -- Meeting details
  agenda_items JSONB DEFAULT '[]',
  minutes JSONB,
  decisions JSONB DEFAULT '[]',
  action_items JSONB DEFAULT '[]',
  documents JSONB DEFAULT '[]',
  recordings JSONB DEFAULT '[]',
  
  -- Participants
  chairperson_id UUID REFERENCES auth.users(id),
  secretary_id UUID REFERENCES auth.users(id),
  attendees JSONB DEFAULT '[]',
  quorum_required INTEGER DEFAULT 1,
  attendance_count INTEGER DEFAULT 0,
  
  -- Recurrence
  recurrence JSONB,
  parent_meeting_id UUID REFERENCES meetings(id),
  
  -- Metadata
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 7. Create meeting_attendees table
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

-- ============================================
-- 8. Create indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(status);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_boards_organization_id ON boards(organization_id);
CREATE INDEX IF NOT EXISTS idx_boards_status ON boards(status);
CREATE INDEX IF NOT EXISTS idx_meetings_organization_id ON meetings(organization_id);
CREATE INDEX IF NOT EXISTS idx_meetings_board_id ON meetings(board_id);
CREATE INDEX IF NOT EXISTS idx_meetings_status ON meetings(status);
CREATE INDEX IF NOT EXISTS idx_meetings_scheduled_start ON meetings(scheduled_start);
CREATE INDEX IF NOT EXISTS idx_organization_members_org_id ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_board_members_board_id ON board_members(board_id);
CREATE INDEX IF NOT EXISTS idx_board_members_user_id ON board_members(user_id);
CREATE INDEX IF NOT EXISTS idx_meeting_attendees_meeting_id ON meeting_attendees(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_attendees_user_id ON meeting_attendees(user_id);

-- ============================================
-- 9. Create update trigger function
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================
-- 10. Add update triggers
-- ============================================
DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_boards_updated_at ON boards;
CREATE TRIGGER update_boards_updated_at BEFORE UPDATE ON boards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_meetings_updated_at ON meetings;
CREATE TRIGGER update_meetings_updated_at BEFORE UPDATE ON meetings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_organization_members_updated_at ON organization_members;
CREATE TRIGGER update_organization_members_updated_at BEFORE UPDATE ON organization_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_board_members_updated_at ON board_members;
CREATE TRIGGER update_board_members_updated_at BEFORE UPDATE ON board_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_meeting_attendees_updated_at ON meeting_attendees;
CREATE TRIGGER update_meeting_attendees_updated_at BEFORE UPDATE ON meeting_attendees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 11. Enable RLS
-- ============================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_attendees ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 12. Create basic RLS policies
-- ============================================

-- Allow authenticated users to view organizations they belong to
CREATE POLICY "view_own_organizations" ON organizations
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND (
      EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = organizations.id
        AND organization_members.user_id = auth.uid()
      )
    )
  );

-- Allow authenticated users to create organizations
CREATE POLICY "create_organizations" ON organizations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Allow users to view their own profile
CREATE POLICY "view_own_profile" ON users
  FOR SELECT USING (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "update_own_profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Allow users to insert their own profile
CREATE POLICY "insert_own_profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Allow users to view boards in their organizations
CREATE POLICY "view_org_boards" ON boards
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = boards.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

-- Allow org admins to manage boards
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

-- Allow users to view meetings in their organizations
CREATE POLICY "view_org_meetings" ON meetings
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND (
      created_by = auth.uid() OR
      chairperson_id = auth.uid() OR
      secretary_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM meeting_attendees
        WHERE meeting_attendees.meeting_id = meetings.id
        AND meeting_attendees.user_id = auth.uid()
      ) OR
      EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = meetings.organization_id
        AND organization_members.user_id = auth.uid()
      )
    )
  );

-- Allow users to create meetings in their organizations
CREATE POLICY "create_org_meetings" ON meetings
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = meetings.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

-- Allow meeting creators to update their meetings
CREATE POLICY "update_own_meetings" ON meetings
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND (
      created_by = auth.uid() OR
      chairperson_id = auth.uid()
    )
  );

-- Allow meeting creators to delete their meetings
CREATE POLICY "delete_own_meetings" ON meetings
  FOR DELETE USING (
    auth.uid() IS NOT NULL AND
    created_by = auth.uid()
  );

-- Allow users to view organization members
CREATE POLICY "view_org_members" ON organization_members
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND (
      user_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM organization_members om
        WHERE om.user_id = auth.uid()
        AND om.organization_id = organization_members.organization_id
      )
    )
  );

-- Allow org admins to manage members
CREATE POLICY "manage_org_members" ON organization_members
  FOR ALL USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.user_id = auth.uid()
      AND om.organization_id = organization_members.organization_id
      AND om.role IN ('admin', 'owner')
    )
  );

-- ============================================
-- 13. Grant permissions
-- ============================================
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- ============================================
-- 14. Insert test data if test user exists
-- ============================================
DO $$
DECLARE
  test_user_id UUID;
  test_org_id UUID := '01490829-abab-4469-8137-c37b5da52b87';
  test_board_id UUID;
BEGIN
  -- Get test user ID
  SELECT id INTO test_user_id FROM auth.users WHERE email = 'test.director@appboardguru.com' LIMIT 1;
  
  IF test_user_id IS NOT NULL THEN
    -- Ensure user profile exists
    INSERT INTO users (id, email, full_name, status)
    VALUES (test_user_id, 'test.director@appboardguru.com', 'Test Director', 'active')
    ON CONFLICT (id) DO NOTHING;
    
    -- Create sample organization
    INSERT INTO organizations (id, name, slug, description, type, status)
    VALUES (
      test_org_id,
      'Fortune 500 Companies',
      'fortune-500-companies',
      'Leading global corporations',
      'corporate',
      'active'
    )
    ON CONFLICT (id) DO NOTHING;
    
    -- Add test user as owner
    INSERT INTO organization_members (organization_id, user_id, role, status)
    VALUES (test_org_id, test_user_id, 'owner', 'active')
    ON CONFLICT (organization_id, user_id) DO NOTHING;
    
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
    
    -- Add test user as board chair if board was created
    IF test_board_id IS NOT NULL THEN
      INSERT INTO board_members (board_id, user_id, role, status)
      VALUES (test_board_id, test_user_id, 'chair', 'active')
      ON CONFLICT (board_id, user_id) DO NOTHING;
    END IF;
    
    RAISE NOTICE 'Test data created successfully for user: %', test_user_id;
  END IF;
END $$;

-- ============================================
-- Migration complete!
-- ============================================