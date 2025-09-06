-- Complete BoardGuru Database Schema
-- This migration creates all required tables in the correct order to handle foreign key dependencies

-- ============================================
-- 1. Create organizations table first (no dependencies)
-- ============================================
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
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

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(status);

-- ============================================
-- 2. Create users table (depends on auth.users)
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

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- ============================================
-- 3. Create boards table (depends on organizations)
-- ============================================
CREATE TABLE IF NOT EXISTS public.boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL DEFAULT 'board' CHECK (type IN ('board', 'committee', 'advisory', 'executive')),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  settings JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_boards_organization_id ON boards(organization_id);
CREATE INDEX IF NOT EXISTS idx_boards_status ON boards(status);

-- ============================================
-- 4. Create meetings table (depends on boards, organizations, users)
-- ============================================
CREATE TABLE IF NOT EXISTS public.meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL CHECK (type IN ('board', 'committee', 'executive', 'special', 'annual', 'extraordinary')),
  status VARCHAR(50) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('draft', 'scheduled', 'in_progress', 'completed', 'cancelled', 'postponed')),
  
  -- Associations
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Schedule
  scheduled_start TIMESTAMPTZ NOT NULL,
  scheduled_end TIMESTAMPTZ NOT NULL,
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  
  -- Location
  location JSONB NOT NULL DEFAULT '{"type": "virtual"}',
  
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
  created_by UUID NOT NULL REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT scheduled_time_check CHECK (scheduled_end > scheduled_start),
  CONSTRAINT actual_time_check CHECK (actual_end IS NULL OR actual_start IS NULL OR actual_end > actual_start)
);

CREATE INDEX IF NOT EXISTS idx_meetings_organization_id ON meetings(organization_id);
CREATE INDEX IF NOT EXISTS idx_meetings_board_id ON meetings(board_id);
CREATE INDEX IF NOT EXISTS idx_meetings_status ON meetings(status);
CREATE INDEX IF NOT EXISTS idx_meetings_scheduled_start ON meetings(scheduled_start);
CREATE INDEX IF NOT EXISTS idx_meetings_created_by ON meetings(created_by);
CREATE INDEX IF NOT EXISTS idx_meetings_chairperson_id ON meetings(chairperson_id);
CREATE INDEX IF NOT EXISTS idx_meetings_tags ON meetings USING gin(tags);

-- ============================================
-- 5. Create organization_members table
-- ============================================
CREATE TABLE IF NOT EXISTS public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  status VARCHAR(50) DEFAULT 'active',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_organization_members_org_id ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON organization_members(user_id);

-- ============================================
-- 6. Create meeting_attendees table
-- ============================================
CREATE TABLE IF NOT EXISTS public.meeting_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'attendee' CHECK (role IN ('organizer', 'chairperson', 'secretary', 'presenter', 'attendee', 'observer')),
  status VARCHAR(50) DEFAULT 'invited' CHECK (status IN ('invited', 'accepted', 'declined', 'tentative', 'attended', 'absent')),
  invitation_sent_at TIMESTAMPTZ,
  response_at TIMESTAMPTZ,
  attended BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(meeting_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_meeting_attendees_meeting_id ON meeting_attendees(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_attendees_user_id ON meeting_attendees(user_id);
CREATE INDEX IF NOT EXISTS idx_meeting_attendees_status ON meeting_attendees(status);

-- ============================================
-- 7. Create board_members table
-- ============================================
CREATE TABLE IF NOT EXISTS public.board_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('chair', 'vice_chair', 'secretary', 'treasurer', 'member', 'observer')),
  status VARCHAR(50) DEFAULT 'active',
  term_start DATE,
  term_end DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(board_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_board_members_board_id ON board_members(board_id);
CREATE INDEX IF NOT EXISTS idx_board_members_user_id ON board_members(user_id);

-- ============================================
-- 8. Create triggers for updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers to all tables
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_boards_updated_at BEFORE UPDATE ON boards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meetings_updated_at BEFORE UPDATE ON meetings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organization_members_updated_at BEFORE UPDATE ON organization_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meeting_attendees_updated_at BEFORE UPDATE ON meeting_attendees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_board_members_updated_at BEFORE UPDATE ON board_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 9. Enable Row Level Security
-- ============================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_members ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 10. Create RLS Policies
-- ============================================

-- Organizations policies
CREATE POLICY "Users can view organizations they belong to"
  ON organizations FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND (
      EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = organizations.id
        AND organization_members.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create organizations"
  ON organizations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Organization admins can update"
  ON organizations FOR UPDATE
  USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organizations.id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role IN ('admin', 'owner')
    )
  );

-- Users policies
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can view users in their organizations"
  ON users FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM organization_members om1
      WHERE om1.user_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM organization_members om2
        WHERE om2.user_id = users.id
        AND om2.organization_id = om1.organization_id
      )
    )
  );

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Boards policies
CREATE POLICY "Users can view boards in their organizations"
  ON boards FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = boards.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Organization admins can manage boards"
  ON boards FOR ALL
  USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = boards.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role IN ('admin', 'owner')
    )
  );

-- Meetings policies
CREATE POLICY "Users can view meetings they're invited to"
  ON meetings FOR SELECT
  USING (
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

CREATE POLICY "Users can create meetings in their organizations"
  ON meetings FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND (
      created_by = auth.uid() AND
      EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = meetings.organization_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role IN ('admin', 'owner', 'member')
      )
    )
  );

CREATE POLICY "Meeting organizers can update their meetings"
  ON meetings FOR UPDATE
  USING (
    auth.uid() IS NOT NULL AND (
      created_by = auth.uid() OR
      chairperson_id = auth.uid()
    )
  );

CREATE POLICY "Meeting creators can delete their meetings"
  ON meetings FOR DELETE
  USING (
    auth.uid() IS NOT NULL AND
    created_by = auth.uid()
  );

-- Organization members policies
CREATE POLICY "Users can view members of their organizations"
  ON organization_members FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND (
      user_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM organization_members om
        WHERE om.user_id = auth.uid()
        AND om.organization_id = organization_members.organization_id
      )
    )
  );

CREATE POLICY "Organization admins can manage members"
  ON organization_members FOR ALL
  USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.user_id = auth.uid()
      AND om.organization_id = organization_members.organization_id
      AND om.role IN ('admin', 'owner')
    )
  );

-- Meeting attendees policies
CREATE POLICY "Users can view meeting attendees for meetings they can see"
  ON meeting_attendees FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM meetings
      WHERE meetings.id = meeting_attendees.meeting_id
      AND (
        meetings.created_by = auth.uid() OR
        meetings.chairperson_id = auth.uid() OR
        meetings.secretary_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM meeting_attendees ma
          WHERE ma.meeting_id = meetings.id
          AND ma.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Meeting organizers can manage attendees"
  ON meeting_attendees FOR ALL
  USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM meetings
      WHERE meetings.id = meeting_attendees.meeting_id
      AND (meetings.created_by = auth.uid() OR meetings.chairperson_id = auth.uid())
    )
  );

-- Board members policies
CREATE POLICY "Users can view board members"
  ON board_members FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM boards
      JOIN organization_members ON organization_members.organization_id = boards.organization_id
      WHERE boards.id = board_members.board_id
      AND organization_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Board chairs and org admins can manage board members"
  ON board_members FOR ALL
  USING (
    auth.uid() IS NOT NULL AND (
      EXISTS (
        SELECT 1 FROM board_members bm
        WHERE bm.board_id = board_members.board_id
        AND bm.user_id = auth.uid()
        AND bm.role = 'chair'
      ) OR
      EXISTS (
        SELECT 1 FROM boards
        JOIN organization_members ON organization_members.organization_id = boards.organization_id
        WHERE boards.id = board_members.board_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role IN ('admin', 'owner')
      )
    )
  );

-- ============================================
-- 11. Create function to auto-create user profile
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url, status, password_set)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url',
    'active',
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for auto-creating user profiles
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 12. Grant permissions
-- ============================================
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- ============================================
-- 13. Insert sample data for testing (optional)
-- ============================================
-- This will only insert if the test user exists
DO $$
DECLARE
  test_user_id UUID;
  test_org_id UUID;
  test_board_id UUID;
BEGIN
  -- Get test user ID
  SELECT id INTO test_user_id FROM auth.users WHERE email = 'test.director@appboardguru.com' LIMIT 1;
  
  IF test_user_id IS NOT NULL THEN
    -- Create sample organization if it doesn't exist
    INSERT INTO organizations (id, name, slug, description, type, status)
    VALUES (
      '01490829-abab-4469-8137-c37b5da52b87',
      'Fortune 500 Companies',
      'fortune-500-companies',
      'Leading global corporations',
      'corporate',
      'active'
    )
    ON CONFLICT (id) DO NOTHING;
    
    -- Add test user as owner of the organization
    INSERT INTO organization_members (organization_id, user_id, role, status)
    VALUES (
      '01490829-abab-4469-8137-c37b5da52b87',
      test_user_id,
      'owner',
      'active'
    )
    ON CONFLICT (organization_id, user_id) DO NOTHING;
    
    -- Create a sample board
    INSERT INTO boards (id, name, description, type, organization_id, status)
    VALUES (
      gen_random_uuid(),
      'Board of Directors',
      'Main governing board',
      'board',
      '01490829-abab-4469-8137-c37b5da52b87',
      'active'
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO test_board_id;
    
    -- Add test user as board chair
    IF test_board_id IS NOT NULL THEN
      INSERT INTO board_members (board_id, user_id, role, status)
      VALUES (
        test_board_id,
        test_user_id,
        'chair',
        'active'
      )
      ON CONFLICT (board_id, user_id) DO NOTHING;
    END IF;
  END IF;
END $$;

-- ============================================
-- Migration complete!
-- ============================================