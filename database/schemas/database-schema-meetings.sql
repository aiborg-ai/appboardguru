-- =====================================================
-- MEETINGS SYSTEM - COMPREHENSIVE DATABASE SCHEMA
-- Board Meeting Management with Full Workflow Support
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 1. MEETINGS TABLE - Core Meeting Data
-- =====================================================

CREATE TYPE meeting_type AS ENUM ('agm', 'board', 'committee', 'other');
CREATE TYPE meeting_status AS ENUM ('draft', 'scheduled', 'in_progress', 'completed', 'cancelled', 'postponed');
CREATE TYPE meeting_visibility AS ENUM ('public', 'organization', 'private');
CREATE TYPE recurrence_type AS ENUM ('none', 'daily', 'weekly', 'monthly', 'yearly');

CREATE TABLE meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Organization & Ownership
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  
  -- Meeting Details
  title VARCHAR(255) NOT NULL CHECK (length(title) >= 1 AND length(title) <= 255),
  description TEXT CHECK (length(description) <= 2000),
  meeting_type meeting_type NOT NULL DEFAULT 'board',
  status meeting_status DEFAULT 'draft',
  visibility meeting_visibility DEFAULT 'organization',
  
  -- Scheduling
  scheduled_start TIMESTAMPTZ NOT NULL,
  scheduled_end TIMESTAMPTZ NOT NULL,
  timezone VARCHAR(50) DEFAULT 'UTC',
  location TEXT,
  virtual_meeting_url TEXT,
  
  -- Recurrence
  is_recurring BOOLEAN DEFAULT false,
  recurrence_type recurrence_type DEFAULT 'none',
  recurrence_interval INTEGER DEFAULT 1,
  recurrence_end_date TIMESTAMPTZ,
  parent_meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
  
  -- Meeting Management
  agenda_finalized BOOLEAN DEFAULT false,
  invitations_sent BOOLEAN DEFAULT false,
  documents_locked BOOLEAN DEFAULT false,
  
  -- Metadata
  estimated_duration_minutes INTEGER DEFAULT 60,
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  
  -- Settings
  settings JSONB DEFAULT '{
    "allow_virtual_attendance": true,
    "auto_record": false,
    "require_rsvp": true,
    "send_reminders": true,
    "reminder_intervals": [7, 1, 1],
    "allow_agenda_suggestions": true,
    "enable_pre_meeting_tasks": true,
    "generate_minutes_template": true
  }'::jsonb,
  
  -- Tags & Categories
  tags TEXT[] DEFAULT '{}',
  category VARCHAR(100),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ,
  cancelled_reason TEXT,
  
  -- Constraints
  CONSTRAINT valid_meeting_duration CHECK (scheduled_end > scheduled_start),
  CONSTRAINT valid_actual_times CHECK (
    actual_start IS NULL OR actual_end IS NULL OR actual_end >= actual_start
  ),
  CONSTRAINT valid_recurrence CHECK (
    (is_recurring = false AND recurrence_type = 'none') OR
    (is_recurring = true AND recurrence_type != 'none')
  )
);

-- =====================================================
-- 2. MEETING AGENDA ITEMS - Structured Agenda
-- =====================================================

CREATE TYPE agenda_item_type AS ENUM ('presentation', 'discussion', 'decision', 'information', 'break');

CREATE TABLE meeting_agenda_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Meeting Reference
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  
  -- Item Details
  title VARCHAR(255) NOT NULL,
  description TEXT,
  item_type agenda_item_type DEFAULT 'discussion',
  
  -- Organization
  order_index INTEGER NOT NULL DEFAULT 0,
  estimated_duration_minutes INTEGER DEFAULT 10,
  
  -- Ownership & Presentation
  presenter_user_id UUID REFERENCES auth.users(id),
  responsible_user_id UUID REFERENCES auth.users(id),
  
  -- Content
  content TEXT, -- Rich text content
  objectives TEXT[], -- What should be achieved
  
  -- Status
  is_confidential BOOLEAN DEFAULT false,
  requires_decision BOOLEAN DEFAULT false,
  decision_text TEXT,
  decision_made BOOLEAN DEFAULT false,
  
  -- Timing
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(meeting_id, order_index),
  CONSTRAINT valid_item_duration CHECK (estimated_duration_minutes > 0),
  CONSTRAINT valid_actual_item_times CHECK (
    actual_start IS NULL OR actual_end IS NULL OR actual_end >= actual_start
  )
);

-- =====================================================
-- 3. MEETING INVITEES - Attendee Management
-- =====================================================

CREATE TYPE attendee_role AS ENUM ('board_member', 'guest', 'presenter', 'observer', 'secretary', 'facilitator');
CREATE TYPE rsvp_status AS ENUM ('pending', 'accepted', 'declined', 'tentative', 'no_response');
CREATE TYPE attendance_status AS ENUM ('not_attended', 'attended', 'partially_attended', 'late', 'left_early');

CREATE TABLE meeting_invitees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Invitee Details
  attendee_role attendee_role NOT NULL DEFAULT 'guest',
  is_required BOOLEAN DEFAULT true,
  is_organizer BOOLEAN DEFAULT false,
  
  -- RSVP & Response
  rsvp_status rsvp_status DEFAULT 'pending',
  rsvp_timestamp TIMESTAMPTZ,
  rsvp_notes TEXT,
  
  -- Attendance Tracking
  attendance_status attendance_status DEFAULT 'not_attended',
  checked_in_at TIMESTAMPTZ,
  checked_out_at TIMESTAMPTZ,
  attendance_notes TEXT,
  
  -- Permissions
  can_invite_others BOOLEAN DEFAULT false,
  can_modify_agenda BOOLEAN DEFAULT false,
  can_upload_documents BOOLEAN DEFAULT false,
  speaking_time_minutes INTEGER DEFAULT 0,
  
  -- Communication
  invitation_sent BOOLEAN DEFAULT false,
  invitation_sent_at TIMESTAMPTZ,
  reminder_count INTEGER DEFAULT 0,
  last_reminder_sent TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(meeting_id, user_id),
  CONSTRAINT valid_speaking_time CHECK (speaking_time_minutes >= 0)
);

-- =====================================================
-- 4. MEETING DOCUMENTS - Document Attachments
-- =====================================================

CREATE TYPE document_category AS ENUM ('agenda', 'supporting', 'presentation', 'report', 'minutes', 'action_items', 'reference');

CREATE TABLE meeting_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  agenda_item_id UUID REFERENCES meeting_agenda_items(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Document Details
  title VARCHAR(255) NOT NULL,
  description TEXT,
  file_name VARCHAR(500) NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type VARCHAR(100) NOT NULL,
  mime_type VARCHAR(200) NOT NULL,
  
  -- Categorization
  category document_category DEFAULT 'supporting',
  is_confidential BOOLEAN DEFAULT false,
  
  -- Access Control
  visibility attendee_role[] DEFAULT ARRAY['board_member', 'guest', 'presenter', 'observer', 'secretary', 'facilitator'],
  download_count INTEGER DEFAULT 0,
  
  -- Version Control
  version_number INTEGER DEFAULT 1,
  is_latest_version BOOLEAN DEFAULT true,
  previous_version_id UUID REFERENCES meeting_documents(id),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_file_size CHECK (file_size > 0),
  CONSTRAINT valid_version CHECK (version_number > 0)
);

-- =====================================================
-- 5. MEETING NOTIFICATIONS - Email & Push Queue
-- =====================================================

CREATE TYPE notification_type AS ENUM ('invitation', 'reminder', 'agenda_update', 'document_added', 'meeting_cancelled', 'meeting_rescheduled', 'rsvp_reminder', 'pre_meeting_task');
CREATE TYPE notification_status AS ENUM ('pending', 'sent', 'failed', 'cancelled');
CREATE TYPE notification_channel AS ENUM ('email', 'push', 'sms', 'in_app');

CREATE TABLE meeting_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  recipient_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Notification Details
  notification_type notification_type NOT NULL,
  channel notification_channel DEFAULT 'email',
  status notification_status DEFAULT 'pending',
  
  -- Content
  subject VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  template_name VARCHAR(100),
  template_data JSONB DEFAULT '{}',
  
  -- Scheduling
  scheduled_send_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  
  -- Tracking
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  response_data JSONB DEFAULT '{}',
  
  -- Error Handling
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_retry_count CHECK (retry_count >= 0 AND retry_count <= max_retries)
);

-- =====================================================
-- 6. MEETING TEMPLATES - Reusable Meeting Structures
-- =====================================================

CREATE TABLE meeting_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Template Information
  name VARCHAR(255) NOT NULL,
  description TEXT,
  meeting_type meeting_type NOT NULL,
  
  -- Template Data
  template_data JSONB NOT NULL, -- Contains meeting structure, agenda items, default settings
  default_duration_minutes INTEGER DEFAULT 60,
  default_settings JSONB DEFAULT '{}',
  
  -- Ownership & Scope
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE, -- NULL for global templates
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_public BOOLEAN DEFAULT false,
  is_system_template BOOLEAN DEFAULT false,
  
  -- Usage & Tracking
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT template_name_length CHECK (length(name) >= 1 AND length(name) <= 255)
);

-- =====================================================
-- 7. MEETING ATTENDANCE LOG - Detailed Participation
-- =====================================================

CREATE TABLE meeting_attendance_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Attendance Details
  joined_at TIMESTAMPTZ NOT NULL,
  left_at TIMESTAMPTZ,
  duration_minutes INTEGER GENERATED ALWAYS AS (
    CASE 
      WHEN left_at IS NOT NULL THEN 
        EXTRACT(EPOCH FROM (left_at - joined_at)) / 60
      ELSE NULL
    END
  ) STORED,
  
  -- Participation Type
  attendance_method VARCHAR(50) DEFAULT 'in_person', -- 'in_person', 'virtual', 'phone'
  connection_quality VARCHAR(20), -- 'excellent', 'good', 'fair', 'poor'
  
  -- Activity Tracking
  spoke_duration_minutes INTEGER DEFAULT 0,
  questions_asked INTEGER DEFAULT 0,
  votes_cast INTEGER DEFAULT 0,
  
  -- Technical Details
  ip_address INET,
  user_agent TEXT,
  device_type VARCHAR(50),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_attendance_duration CHECK (
    left_at IS NULL OR left_at >= joined_at
  ),
  CONSTRAINT valid_speaking_time CHECK (spoke_duration_minutes >= 0)
);

-- =====================================================
-- 8. PERFORMANCE INDEXES
-- =====================================================

-- Meetings indexes
CREATE INDEX idx_meetings_organization ON meetings(organization_id, status, scheduled_start DESC);
CREATE INDEX idx_meetings_created_by ON meetings(created_by, created_at DESC);
CREATE INDEX idx_meetings_status ON meetings(status, scheduled_start) WHERE status IN ('scheduled', 'in_progress');
CREATE INDEX idx_meetings_scheduled_start ON meetings(scheduled_start DESC);
CREATE INDEX idx_meetings_type ON meetings(meeting_type, organization_id);
CREATE INDEX idx_meetings_recurring ON meetings(parent_meeting_id) WHERE is_recurring = true;
CREATE INDEX idx_meetings_search ON meetings USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- Agenda items indexes
CREATE INDEX idx_agenda_items_meeting ON meeting_agenda_items(meeting_id, order_index);
CREATE INDEX idx_agenda_items_presenter ON meeting_agenda_items(presenter_user_id) WHERE presenter_user_id IS NOT NULL;
CREATE INDEX idx_agenda_items_responsible ON meeting_agenda_items(responsible_user_id) WHERE responsible_user_id IS NOT NULL;

-- Invitees indexes
CREATE INDEX idx_invitees_meeting ON meeting_invitees(meeting_id, attendee_role);
CREATE INDEX idx_invitees_user ON meeting_invitees(user_id, rsvp_status);
CREATE INDEX idx_invitees_pending_rsvp ON meeting_invitees(meeting_id, rsvp_status) WHERE rsvp_status = 'pending';
CREATE INDEX idx_invitees_organizer ON meeting_invitees(meeting_id) WHERE is_organizer = true;

-- Documents indexes
CREATE INDEX idx_documents_meeting ON meeting_documents(meeting_id, category);
CREATE INDEX idx_documents_agenda_item ON meeting_documents(agenda_item_id) WHERE agenda_item_id IS NOT NULL;
CREATE INDEX idx_documents_uploaded_by ON meeting_documents(uploaded_by, created_at DESC);
CREATE INDEX idx_documents_latest ON meeting_documents(meeting_id) WHERE is_latest_version = true;

-- Notifications indexes
CREATE INDEX idx_notifications_meeting ON meeting_notifications(meeting_id, notification_type);
CREATE INDEX idx_notifications_recipient ON meeting_notifications(recipient_user_id, status);
CREATE INDEX idx_notifications_pending ON meeting_notifications(scheduled_send_at) WHERE status = 'pending';
CREATE INDEX idx_notifications_retry ON meeting_notifications(status, retry_count) WHERE status = 'failed';

-- Attendance log indexes
CREATE INDEX idx_attendance_log_meeting ON meeting_attendance_log(meeting_id, joined_at DESC);
CREATE INDEX idx_attendance_log_user ON meeting_attendance_log(user_id, joined_at DESC);

-- =====================================================
-- 9. ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all meeting tables
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_agenda_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_invitees ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_attendance_log ENABLE ROW LEVEL SECURITY;

-- Meetings RLS Policies
CREATE POLICY "Users can view meetings in their organizations" ON meetings
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Meeting organizers can manage meetings" ON meetings
  FOR ALL USING (created_by = auth.uid());

CREATE POLICY "Organization admins can manage meetings" ON meetings
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND status = 'active' 
      AND role IN ('owner', 'admin')
    )
  );

-- Meeting Invitees RLS Policies
CREATE POLICY "Users can view invitee lists for their meetings" ON meeting_invitees
  FOR SELECT USING (
    meeting_id IN (
      SELECT m.id FROM meetings m
      JOIN organization_members om ON m.organization_id = om.organization_id
      WHERE om.user_id = auth.uid() AND om.status = 'active'
    )
  );

CREATE POLICY "Meeting organizers can manage invitees" ON meeting_invitees
  FOR ALL USING (
    meeting_id IN (
      SELECT id FROM meetings WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update their own RSVP" ON meeting_invitees
  FOR UPDATE USING (user_id = auth.uid()) 
  WITH CHECK (user_id = auth.uid());

-- Meeting Documents RLS Policies
CREATE POLICY "Meeting attendees can view documents" ON meeting_documents
  FOR SELECT USING (
    meeting_id IN (
      SELECT mi.meeting_id FROM meeting_invitees mi
      WHERE mi.user_id = auth.uid()
    )
  );

CREATE POLICY "Meeting organizers can manage documents" ON meeting_documents
  FOR ALL USING (
    meeting_id IN (
      SELECT id FROM meetings WHERE created_by = auth.uid()
    )
    OR uploaded_by = auth.uid()
  );

-- =====================================================
-- 10. TRIGGERS AND FUNCTIONS
-- =====================================================

-- Update meeting statistics
CREATE OR REPLACE FUNCTION update_meeting_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update invitee count and RSVP statistics
  -- This would be expanded based on specific requirements
  RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

CREATE TRIGGER meeting_invitee_stats_trigger
  AFTER INSERT OR UPDATE OR DELETE ON meeting_invitees
  FOR EACH ROW EXECUTE FUNCTION update_meeting_stats();

-- Auto-send meeting reminders
CREATE OR REPLACE FUNCTION schedule_meeting_reminders()
RETURNS void AS $$
BEGIN
  -- Insert reminder notifications based on meeting settings
  INSERT INTO meeting_notifications (
    meeting_id, recipient_user_id, notification_type, channel,
    subject, content, scheduled_send_at
  )
  SELECT 
    m.id,
    mi.user_id,
    'reminder',
    'email',
    'Meeting Reminder: ' || m.title,
    'This is a reminder about your upcoming meeting: ' || m.title,
    m.scheduled_start - INTERVAL '1 day'
  FROM meetings m
  JOIN meeting_invitees mi ON m.id = mi.meeting_id
  WHERE m.status = 'scheduled'
    AND m.scheduled_start > NOW() + INTERVAL '1 day'
    AND m.scheduled_start < NOW() + INTERVAL '2 days'
    AND mi.rsvp_status IN ('accepted', 'tentative')
    AND NOT EXISTS (
      SELECT 1 FROM meeting_notifications mn
      WHERE mn.meeting_id = m.id 
        AND mn.recipient_user_id = mi.user_id
        AND mn.notification_type = 'reminder'
        AND mn.scheduled_send_at::date = (m.scheduled_start - INTERVAL '1 day')::date
    );
END;
$$ language 'plpgsql';

-- Update timestamps trigger
CREATE TRIGGER update_meetings_updated_at 
  BEFORE UPDATE ON meetings 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agenda_items_updated_at 
  BEFORE UPDATE ON meeting_agenda_items 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meeting_templates_updated_at 
  BEFORE UPDATE ON meeting_templates 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 11. INITIAL SYSTEM TEMPLATES
-- =====================================================

INSERT INTO meeting_templates (name, description, meeting_type, template_data, is_system_template, created_by) 
VALUES 
(
  'Standard Board Meeting', 
  'Default template for regular board meetings',
  'board',
  '{
    "agenda_items": [
      {"title": "Call to Order", "type": "information", "duration": 5},
      {"title": "Approval of Previous Minutes", "type": "decision", "duration": 10},
      {"title": "CEO Report", "type": "presentation", "duration": 20},
      {"title": "Financial Report", "type": "presentation", "duration": 15},
      {"title": "Strategic Initiatives Update", "type": "discussion", "duration": 30},
      {"title": "Risk Management Review", "type": "discussion", "duration": 20},
      {"title": "New Business", "type": "discussion", "duration": 15},
      {"title": "Executive Session", "type": "discussion", "duration": 15},
      {"title": "Adjournment", "type": "information", "duration": 5}
    ],
    "default_settings": {
      "require_rsvp": true,
      "auto_record": false,
      "send_reminders": true
    }
  }',
  true,
  '00000000-0000-0000-0000-000000000000'
),
(
  'Annual General Meeting (AGM)',
  'Template for annual shareholder meetings',
  'agm',
  '{
    "agenda_items": [
      {"title": "Registration and Welcome", "type": "information", "duration": 15},
      {"title": "Call to Order", "type": "information", "duration": 5},
      {"title": "Annual Report Presentation", "type": "presentation", "duration": 30},
      {"title": "Financial Statements Review", "type": "presentation", "duration": 25},
      {"title": "Auditor Report", "type": "presentation", "duration": 15},
      {"title": "Director Elections", "type": "decision", "duration": 20},
      {"title": "Shareholder Proposals", "type": "discussion", "duration": 30},
      {"title": "Q&A Session", "type": "discussion", "duration": 25},
      {"title": "Closing Remarks", "type": "information", "duration": 10}
    ]
  }',
  true,
  '00000000-0000-0000-0000-000000000000'
),
(
  'Committee Meeting',
  'Lightweight template for committee meetings',
  'committee',
  '{
    "agenda_items": [
      {"title": "Call to Order", "type": "information", "duration": 3},
      {"title": "Review of Action Items", "type": "discussion", "duration": 10},
      {"title": "Main Discussion Topic", "type": "discussion", "duration": 30},
      {"title": "Decisions Required", "type": "decision", "duration": 15},
      {"title": "Next Steps", "type": "discussion", "duration": 10},
      {"title": "Next Meeting Date", "type": "information", "duration": 2}
    ],
    "default_settings": {
      "require_rsvp": false,
      "send_reminders": true
    }
  }',
  true,
  '00000000-0000-0000-0000-000000000000'
);

-- =====================================================
-- 12. MIGRATION COMPLETION
-- =====================================================

-- Create migration tracking table if it doesn't exist
CREATE TABLE IF NOT EXISTS _migrations (
  name TEXT PRIMARY KEY,
  executed_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO _migrations (name, executed_at) 
VALUES ('database-schema-meetings', NOW())
ON CONFLICT (name) DO UPDATE SET executed_at = NOW();

-- Success confirmation
SELECT 'Meetings system database schema created successfully!' as message;