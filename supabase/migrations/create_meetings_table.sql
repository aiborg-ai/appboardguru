-- Create meetings table if it doesn't exist
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_meetings_organization_id ON meetings(organization_id);
CREATE INDEX IF NOT EXISTS idx_meetings_board_id ON meetings(board_id);
CREATE INDEX IF NOT EXISTS idx_meetings_status ON meetings(status);
CREATE INDEX IF NOT EXISTS idx_meetings_scheduled_start ON meetings(scheduled_start);
CREATE INDEX IF NOT EXISTS idx_meetings_created_by ON meetings(created_by);
CREATE INDEX IF NOT EXISTS idx_meetings_chairperson_id ON meetings(chairperson_id);
CREATE INDEX IF NOT EXISTS idx_meetings_tags ON meetings USING gin(tags);

-- Create meeting_attendees junction table for many-to-many relationship
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

-- Create boards table if it doesn't exist (required for foreign key)
CREATE TABLE IF NOT EXISTS public.boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL DEFAULT 'board',
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_boards_organization_id ON boards(organization_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_meetings_updated_at BEFORE UPDATE ON meetings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meeting_attendees_updated_at BEFORE UPDATE ON meeting_attendees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;

-- RLS Policies for meetings
-- Allow authenticated users to view meetings they're invited to or in their organization
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

-- Allow users to create meetings in their organizations
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

-- Allow meeting creators and chairpersons to update meetings
CREATE POLICY "Meeting organizers can update their meetings"
  ON meetings FOR UPDATE
  USING (
    auth.uid() IS NOT NULL AND (
      created_by = auth.uid() OR
      chairperson_id = auth.uid()
    )
  );

-- Allow meeting creators to delete meetings
CREATE POLICY "Meeting creators can delete their meetings"
  ON meetings FOR DELETE
  USING (
    auth.uid() IS NOT NULL AND
    created_by = auth.uid()
  );

-- RLS Policies for meeting_attendees
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

-- RLS Policies for boards
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

-- Grant permissions
GRANT ALL ON meetings TO authenticated;
GRANT ALL ON meeting_attendees TO authenticated;
GRANT ALL ON boards TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;