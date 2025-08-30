-- =====================================================
-- MEETINGS SYSTEM
-- Complete database schema for meeting management
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. MEETINGS TABLE - Core meeting information
-- =====================================================

CREATE TYPE meeting_type AS ENUM ('agm', 'board', 'committee', 'other');
CREATE TYPE meeting_status AS ENUM ('draft', 'scheduled', 'in_progress', 'completed', 'cancelled', 'postponed');
CREATE TYPE agenda_item_type AS ENUM ('presentation', 'discussion', 'decision', 'information', 'break');
CREATE TYPE attendee_role AS ENUM ('organizer', 'chair', 'secretary', 'board_member', 'presenter', 'guest', 'observer', 'facilitator');
CREATE TYPE rsvp_status AS ENUM ('pending', 'accepted', 'declined', 'tentative', 'no_response');

CREATE TABLE meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Organization Context
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  board_id UUID REFERENCES boards(id) ON DELETE SET NULL,
  committee_id UUID REFERENCES committees(id) ON DELETE SET NULL,
  
  -- Basic Information
  title VARCHAR(255) NOT NULL CHECK (length(title) >= 1 AND length(title) <= 255),
  description TEXT,
  meeting_type meeting_type NOT NULL DEFAULT 'other',
  status meeting_status DEFAULT 'draft',
  meeting_number VARCHAR(50), -- e.g., "AGM-2024-001"
  
  -- Schedule
  scheduled_start TIMESTAMPTZ,
  scheduled_end TIMESTAMPTZ,
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  timezone VARCHAR(50) DEFAULT 'UTC',
  
  -- Location
  location TEXT,
  location_address TEXT,
  virtual_meeting_url TEXT,
  virtual_meeting_provider VARCHAR(50), -- e.g., 'zoom', 'teams', 'meet'
  is_hybrid BOOLEAN DEFAULT false,
  
  -- Recurrence
  is_recurring BOOLEAN DEFAULT false,
  recurrence_type VARCHAR(20), -- 'daily', 'weekly', 'monthly', 'yearly'
  recurrence_interval INTEGER,
  recurrence_end_date DATE,
  parent_meeting_id UUID REFERENCES meetings(id) ON DELETE SET NULL,
  
  -- Counts and Statistics
  attendee_count INTEGER DEFAULT 0,
  rsvp_count INTEGER DEFAULT 0,
  agenda_item_count INTEGER DEFAULT 0,
  document_count INTEGER DEFAULT 0,
  resolution_count INTEGER DEFAULT 0,
  action_item_count INTEGER DEFAULT 0,
  
  -- Quorum and Voting
  quorum_required INTEGER,
  quorum_met BOOLEAN,
  voting_enabled BOOLEAN DEFAULT true,
  
  -- Documents
  agenda_document_url TEXT,
  minutes_document_url TEXT,
  recording_url TEXT,
  transcript_url TEXT,
  
  -- Notifications
  send_reminders BOOLEAN DEFAULT true,
  reminder_days_before INTEGER[] DEFAULT '{7, 1}',
  last_reminder_sent TIMESTAMPTZ,
  
  -- Management
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  organizer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  secretary_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Settings and Metadata
  settings JSONB DEFAULT '{
    "allow_guests": true,
    "record_meeting": false,
    "auto_generate_minutes": false,
    "require_rsvp": true,
    "allow_proxy_voting": false,
    "public_meeting": false
  }'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Constraints
  CONSTRAINT valid_meeting_times CHECK (
    scheduled_end IS NULL OR scheduled_end > scheduled_start
  ),
  CONSTRAINT valid_actual_times CHECK (
    actual_end IS NULL OR actual_end > actual_start
  ),
  CONSTRAINT valid_quorum CHECK (
    quorum_required IS NULL OR quorum_required > 0
  )
);

-- Create indexes for performance
CREATE INDEX idx_meetings_organization ON meetings(organization_id);
CREATE INDEX idx_meetings_board ON meetings(board_id) WHERE board_id IS NOT NULL;
CREATE INDEX idx_meetings_committee ON meetings(committee_id) WHERE committee_id IS NOT NULL;
CREATE INDEX idx_meetings_status ON meetings(status);
CREATE INDEX idx_meetings_type ON meetings(meeting_type);
CREATE INDEX idx_meetings_scheduled_start ON meetings(scheduled_start);
CREATE INDEX idx_meetings_created_by ON meetings(created_by);
CREATE INDEX idx_meetings_parent ON meetings(parent_meeting_id) WHERE parent_meeting_id IS NOT NULL;

-- =====================================================
-- 2. MEETING_ATTENDEES TABLE - Meeting participants
-- =====================================================

CREATE TABLE meeting_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Core Relationships
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- External Attendee (if not a system user)
  external_email VARCHAR(255),
  external_name VARCHAR(255),
  external_organization VARCHAR(255),
  external_title VARCHAR(255),
  
  -- Role and Status
  role attendee_role DEFAULT 'guest',
  rsvp_status rsvp_status DEFAULT 'pending',
  rsvp_responded_at TIMESTAMPTZ,
  is_required BOOLEAN DEFAULT false,
  is_optional BOOLEAN DEFAULT false,
  
  -- Attendance Tracking
  attended BOOLEAN DEFAULT false,
  attendance_confirmed_at TIMESTAMPTZ,
  attendance_duration INTEGER, -- in minutes
  joined_at TIMESTAMPTZ,
  left_at TIMESTAMPTZ,
  
  -- Voting Rights
  can_vote BOOLEAN DEFAULT false,
  voting_weight INTEGER DEFAULT 1,
  proxy_for UUID REFERENCES meeting_attendees(id) ON DELETE SET NULL,
  
  -- Notes and Communication
  invitation_sent_at TIMESTAMPTZ,
  reminder_sent_at TIMESTAMPTZ,
  notes TEXT,
  dietary_requirements TEXT,
  accessibility_needs TEXT,
  
  -- Management
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(meeting_id, user_id),
  UNIQUE(meeting_id, external_email),
  CONSTRAINT attendee_identification CHECK (
    user_id IS NOT NULL OR external_email IS NOT NULL
  )
);

CREATE INDEX idx_meeting_attendees_meeting ON meeting_attendees(meeting_id);
CREATE INDEX idx_meeting_attendees_user ON meeting_attendees(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_meeting_attendees_rsvp ON meeting_attendees(rsvp_status);
CREATE INDEX idx_meeting_attendees_role ON meeting_attendees(role);

-- =====================================================
-- 3. MEETING_AGENDA_ITEMS TABLE - Meeting agenda
-- =====================================================

CREATE TABLE meeting_agenda_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Core Relationships
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  parent_item_id UUID REFERENCES meeting_agenda_items(id) ON DELETE CASCADE,
  
  -- Item Details
  title VARCHAR(255) NOT NULL,
  description TEXT,
  item_type agenda_item_type DEFAULT 'discussion',
  item_number VARCHAR(20), -- e.g., "1.1", "2.3.1"
  order_index INTEGER NOT NULL,
  
  -- Timing
  estimated_duration INTEGER, -- in minutes
  actual_duration INTEGER, -- in minutes
  scheduled_time TIME,
  
  -- Presenter/Owner
  presenter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  presenter_name VARCHAR(255),
  department VARCHAR(100),
  
  -- Documents and Materials
  supporting_documents JSONB DEFAULT '[]'::jsonb,
  presentation_url TEXT,
  
  -- Discussion and Decisions
  discussion_notes TEXT,
  decision_required BOOLEAN DEFAULT false,
  decision_made TEXT,
  voting_required BOOLEAN DEFAULT false,
  vote_results JSONB,
  
  -- Status
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  is_confidential BOOLEAN DEFAULT false,
  is_tabled BOOLEAN DEFAULT false,
  
  -- Management
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_duration CHECK (
    estimated_duration IS NULL OR estimated_duration > 0
  )
);

CREATE INDEX idx_agenda_items_meeting ON meeting_agenda_items(meeting_id);
CREATE INDEX idx_agenda_items_parent ON meeting_agenda_items(parent_item_id) WHERE parent_item_id IS NOT NULL;
CREATE INDEX idx_agenda_items_order ON meeting_agenda_items(meeting_id, order_index);
CREATE INDEX idx_agenda_items_presenter ON meeting_agenda_items(presenter_id) WHERE presenter_id IS NOT NULL;

-- =====================================================
-- 4. MEETING_DOCUMENTS TABLE - Meeting documents
-- =====================================================

CREATE TYPE document_category AS ENUM ('agenda', 'minutes', 'presentation', 'report', 'supporting', 'resolution', 'reference', 'other');

CREATE TABLE meeting_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Core Relationships
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  agenda_item_id UUID REFERENCES meeting_agenda_items(id) ON DELETE SET NULL,
  
  -- Document Information
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category document_category DEFAULT 'other',
  file_url TEXT NOT NULL,
  file_size INTEGER,
  file_type VARCHAR(50),
  
  -- Access Control
  is_confidential BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT false,
  requires_nda BOOLEAN DEFAULT false,
  
  -- Version Control
  version VARCHAR(20) DEFAULT '1.0',
  is_latest BOOLEAN DEFAULT true,
  previous_version_id UUID REFERENCES meeting_documents(id) ON DELETE SET NULL,
  
  -- Distribution
  distribute_before_meeting BOOLEAN DEFAULT true,
  distribution_date TIMESTAMPTZ,
  download_count INTEGER DEFAULT 0,
  
  -- Management
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_meeting_documents_meeting ON meeting_documents(meeting_id);
CREATE INDEX idx_meeting_documents_agenda_item ON meeting_documents(agenda_item_id) WHERE agenda_item_id IS NOT NULL;
CREATE INDEX idx_meeting_documents_category ON meeting_documents(category);
CREATE INDEX idx_meeting_documents_latest ON meeting_documents(meeting_id, is_latest) WHERE is_latest = true;

-- =====================================================
-- 5. MEETING_RESOLUTIONS TABLE - Decisions made
-- =====================================================

CREATE TYPE resolution_status AS ENUM ('draft', 'proposed', 'voting', 'passed', 'failed', 'tabled', 'withdrawn');

CREATE TABLE meeting_resolutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Core Relationships
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  agenda_item_id UUID REFERENCES meeting_agenda_items(id) ON DELETE SET NULL,
  
  -- Resolution Details
  resolution_number VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  resolution_text TEXT NOT NULL,
  resolution_type VARCHAR(50), -- 'ordinary', 'special', 'unanimous'
  
  -- Status
  status resolution_status DEFAULT 'draft',
  
  -- Proposer and Seconder
  proposed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  seconded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  proposed_at TIMESTAMPTZ,
  
  -- Voting
  voting_started_at TIMESTAMPTZ,
  voting_ended_at TIMESTAMPTZ,
  votes_for INTEGER DEFAULT 0,
  votes_against INTEGER DEFAULT 0,
  votes_abstain INTEGER DEFAULT 0,
  total_votes INTEGER DEFAULT 0,
  quorum_met BOOLEAN,
  
  -- Results
  passed BOOLEAN,
  passed_at TIMESTAMPTZ,
  implementation_deadline DATE,
  implementation_status VARCHAR(50),
  
  -- Management
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(meeting_id, resolution_number)
);

CREATE INDEX idx_resolutions_meeting ON meeting_resolutions(meeting_id);
CREATE INDEX idx_resolutions_agenda_item ON meeting_resolutions(agenda_item_id) WHERE agenda_item_id IS NOT NULL;
CREATE INDEX idx_resolutions_status ON meeting_resolutions(status);
CREATE INDEX idx_resolutions_passed ON meeting_resolutions(passed) WHERE passed IS NOT NULL;

-- =====================================================
-- 6. MEETING_ACTION_ITEMS TABLE - Follow-up tasks
-- =====================================================

CREATE TYPE action_priority AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE action_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled', 'blocked');

CREATE TABLE meeting_action_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Core Relationships
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  agenda_item_id UUID REFERENCES meeting_agenda_items(id) ON DELETE SET NULL,
  resolution_id UUID REFERENCES meeting_resolutions(id) ON DELETE SET NULL,
  
  -- Action Details
  title VARCHAR(255) NOT NULL,
  description TEXT,
  priority action_priority DEFAULT 'medium',
  status action_status DEFAULT 'pending',
  
  -- Assignment
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ,
  
  -- Timeline
  due_date DATE,
  completed_at TIMESTAMPTZ,
  
  -- Progress Tracking
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  progress_notes TEXT,
  last_update TIMESTAMPTZ,
  
  -- Management
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_action_items_meeting ON meeting_action_items(meeting_id);
CREATE INDEX idx_action_items_assigned_to ON meeting_action_items(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX idx_action_items_status ON meeting_action_items(status);
CREATE INDEX idx_action_items_due_date ON meeting_action_items(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX idx_action_items_priority ON meeting_action_items(priority);

-- =====================================================
-- 7. TRIGGER FUNCTIONS
-- =====================================================

-- Update meeting counts
CREATE OR REPLACE FUNCTION update_meeting_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_TABLE_NAME = 'meeting_attendees' THEN
    UPDATE meetings 
    SET 
      attendee_count = (SELECT COUNT(*) FROM meeting_attendees WHERE meeting_id = NEW.meeting_id),
      rsvp_count = (SELECT COUNT(*) FROM meeting_attendees WHERE meeting_id = NEW.meeting_id AND rsvp_status = 'accepted')
    WHERE id = NEW.meeting_id;
  ELSIF TG_TABLE_NAME = 'meeting_agenda_items' THEN
    UPDATE meetings 
    SET agenda_item_count = (SELECT COUNT(*) FROM meeting_agenda_items WHERE meeting_id = NEW.meeting_id)
    WHERE id = NEW.meeting_id;
  ELSIF TG_TABLE_NAME = 'meeting_documents' THEN
    UPDATE meetings 
    SET document_count = (SELECT COUNT(*) FROM meeting_documents WHERE meeting_id = NEW.meeting_id)
    WHERE id = NEW.meeting_id;
  ELSIF TG_TABLE_NAME = 'meeting_resolutions' THEN
    UPDATE meetings 
    SET resolution_count = (SELECT COUNT(*) FROM meeting_resolutions WHERE meeting_id = NEW.meeting_id)
    WHERE id = NEW.meeting_id;
  ELSIF TG_TABLE_NAME = 'meeting_action_items' THEN
    UPDATE meetings 
    SET action_item_count = (SELECT COUNT(*) FROM meeting_action_items WHERE meeting_id = NEW.meeting_id)
    WHERE id = NEW.meeting_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for count updates
CREATE TRIGGER update_attendee_count AFTER INSERT OR DELETE ON meeting_attendees
  FOR EACH ROW EXECUTE FUNCTION update_meeting_counts();

CREATE TRIGGER update_agenda_count AFTER INSERT OR DELETE ON meeting_agenda_items
  FOR EACH ROW EXECUTE FUNCTION update_meeting_counts();

CREATE TRIGGER update_document_count AFTER INSERT OR DELETE ON meeting_documents
  FOR EACH ROW EXECUTE FUNCTION update_meeting_counts();

CREATE TRIGGER update_resolution_count AFTER INSERT OR DELETE ON meeting_resolutions
  FOR EACH ROW EXECUTE FUNCTION update_meeting_counts();

CREATE TRIGGER update_action_count AFTER INSERT OR DELETE ON meeting_action_items
  FOR EACH ROW EXECUTE FUNCTION update_meeting_counts();

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_meetings_updated_at BEFORE UPDATE ON meetings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendees_updated_at BEFORE UPDATE ON meeting_attendees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agenda_updated_at BEFORE UPDATE ON meeting_agenda_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON meeting_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_resolutions_updated_at BEFORE UPDATE ON meeting_resolutions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_actions_updated_at BEFORE UPDATE ON meeting_action_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 8. ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_agenda_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_resolutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_action_items ENABLE ROW LEVEL SECURITY;

-- Meetings policies
CREATE POLICY "Users can view meetings they're invited to or in their organization"
  ON meetings FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM meeting_attendees WHERE meeting_id = meetings.id
    ) OR
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Users can create meetings in their organizations"
  ON meetings FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Meeting organizers can update their meetings"
  ON meetings FOR UPDATE
  USING (created_by = auth.uid() OR organizer_id = auth.uid())
  WITH CHECK (created_by = auth.uid() OR organizer_id = auth.uid());

CREATE POLICY "Meeting organizers can delete their meetings"
  ON meetings FOR DELETE
  USING (created_by = auth.uid() OR organizer_id = auth.uid());

-- Meeting attendees policies
CREATE POLICY "Users can view attendees of meetings they can see"
  ON meeting_attendees FOR SELECT
  USING (
    meeting_id IN (
      SELECT id FROM meetings WHERE auth.uid() IN (
        SELECT user_id FROM meeting_attendees WHERE meeting_id = meetings.id
      ) OR organization_id IN (
        SELECT organization_id FROM organization_members 
        WHERE user_id = auth.uid() AND status = 'active'
      )
    )
  );

CREATE POLICY "Meeting organizers can manage attendees"
  ON meeting_attendees FOR ALL
  USING (
    meeting_id IN (
      SELECT id FROM meetings 
      WHERE created_by = auth.uid() OR organizer_id = auth.uid()
    )
  );

-- Similar policies for other tables (agenda items, documents, resolutions, action items)
-- These follow the same pattern: view if you can see the meeting, manage if you're the organizer

-- =====================================================
-- 9. HELPER FUNCTIONS
-- =====================================================

-- Function to check if user can access meeting
CREATE OR REPLACE FUNCTION can_access_meeting(meeting_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM meetings m
    WHERE m.id = meeting_uuid
    AND (
      -- User is attendee
      EXISTS (
        SELECT 1 FROM meeting_attendees 
        WHERE meeting_id = meeting_uuid AND user_id = user_uuid
      )
      OR
      -- User is in the organization
      m.organization_id IN (
        SELECT organization_id FROM organization_members 
        WHERE user_id = user_uuid AND status = 'active'
      )
      OR
      -- User created or organizes the meeting
      m.created_by = user_uuid OR m.organizer_id = user_uuid
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get meeting summary
CREATE OR REPLACE FUNCTION get_meeting_summary(meeting_uuid UUID)
RETURNS TABLE (
  id UUID,
  title VARCHAR,
  scheduled_start TIMESTAMPTZ,
  attendee_count INTEGER,
  rsvp_accepted INTEGER,
  agenda_count INTEGER,
  document_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.title,
    m.scheduled_start,
    m.attendee_count,
    (SELECT COUNT(*) FROM meeting_attendees WHERE meeting_id = m.id AND rsvp_status = 'accepted')::INTEGER as rsvp_accepted,
    m.agenda_item_count as agenda_count,
    m.document_count
  FROM meetings m
  WHERE m.id = meeting_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 10. COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE meetings IS 'Core table for all meeting types including AGMs, board meetings, and committee meetings';
COMMENT ON TABLE meeting_attendees IS 'Tracks meeting participants, their roles, RSVP status, and attendance';
COMMENT ON TABLE meeting_agenda_items IS 'Hierarchical agenda items for meetings with timing and presentation details';
COMMENT ON TABLE meeting_documents IS 'Documents associated with meetings including agendas, minutes, and supporting materials';
COMMENT ON TABLE meeting_resolutions IS 'Formal resolutions and decisions made during meetings with voting records';
COMMENT ON TABLE meeting_action_items IS 'Follow-up tasks and action items arising from meetings';

-- Grant necessary permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;