-- Quick Calendar Migration - Core Tables Only
-- Run this in your Supabase SQL Editor

-- 1. Calendar Events Table
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  start_datetime TIMESTAMPTZ NOT NULL,
  end_datetime TIMESTAMPTZ NOT NULL,
  timezone VARCHAR(50) DEFAULT 'UTC',
  all_day BOOLEAN DEFAULT FALSE,
  event_type VARCHAR(50) DEFAULT 'meeting' CHECK (event_type IN ('meeting', 'personal', 'reminder', 'deadline', 'holiday')),
  status VARCHAR(20) DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'tentative', 'cancelled')),
  visibility VARCHAR(20) DEFAULT 'private' CHECK (visibility IN ('public', 'organization', 'private')),
  color VARCHAR(7) DEFAULT '#3B82F6',
  category VARCHAR(100),
  tags TEXT[] DEFAULT '{}',
  location TEXT,
  virtual_meeting_url TEXT,
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_rule JSONB,
  parent_event_id UUID REFERENCES calendar_events(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  CONSTRAINT valid_datetime CHECK (end_datetime > start_datetime)
);

-- 2. Calendar Views (User Preferences)
CREATE TABLE IF NOT EXISTS calendar_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  default_view VARCHAR(20) DEFAULT 'month' CHECK (default_view IN ('day', 'week', 'month', 'year', 'agenda')),
  week_start_day INTEGER DEFAULT 0 CHECK (week_start_day BETWEEN 0 AND 6),
  time_format VARCHAR(10) DEFAULT '12h' CHECK (time_format IN ('12h', '24h')),
  timezone VARCHAR(50) DEFAULT 'UTC',
  show_weekends BOOLEAN DEFAULT TRUE,
  show_declined_events BOOLEAN DEFAULT FALSE,
  compact_view BOOLEAN DEFAULT FALSE,
  work_start_time TIME DEFAULT '09:00',
  work_end_time TIME DEFAULT '17:00',
  work_days INTEGER[] DEFAULT '{1,2,3,4,5}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Calendar Attendees
CREATE TABLE IF NOT EXISTS calendar_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'participant' CHECK (role IN ('organizer', 'presenter', 'participant', 'optional')),
  rsvp_status VARCHAR(20) DEFAULT 'pending' CHECK (rsvp_status IN ('pending', 'accepted', 'declined', 'tentative')),
  rsvp_responded_at TIMESTAMPTZ,
  rsvp_note TEXT,
  can_edit BOOLEAN DEFAULT FALSE,
  can_invite_others BOOLEAN DEFAULT FALSE,
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  invited_by UUID REFERENCES auth.users(id),
  UNIQUE(event_id, user_id)
);

-- 4. Calendar Reminders
CREATE TABLE IF NOT EXISTS calendar_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reminder_type VARCHAR(20) NOT NULL CHECK (reminder_type IN ('email', 'push', 'in_app', 'sms')),
  minutes_before INTEGER NOT NULL CHECK (minutes_before >= 0),
  is_sent BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id, reminder_type, minutes_before)
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_datetime ON calendar_events(user_id, start_datetime, end_datetime);
CREATE INDEX IF NOT EXISTS idx_calendar_events_org_datetime ON calendar_events(organization_id, start_datetime, end_datetime);
CREATE INDEX IF NOT EXISTS idx_calendar_attendees_event_user ON calendar_attendees(event_id, user_id);

-- Row Level Security
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_reminders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Calendar Events
CREATE POLICY "Users can view their own events" ON calendar_events
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create their own events" ON calendar_events
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own events" ON calendar_events
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own events" ON calendar_events
  FOR DELETE USING (user_id = auth.uid());

-- RLS Policies for Calendar Views
CREATE POLICY "Users can manage their own calendar views" ON calendar_views
  FOR ALL USING (user_id = auth.uid());

-- RLS Policies for Calendar Attendees  
CREATE POLICY "Event organizers can manage attendees" ON calendar_attendees
  FOR ALL USING (
    event_id IN (SELECT id FROM calendar_events WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update their own RSVP" ON calendar_attendees
  FOR UPDATE USING (user_id = auth.uid());

-- RLS Policies for Calendar Reminders
CREATE POLICY "Users can manage reminders for their events" ON calendar_reminders
  FOR ALL USING (
    user_id = auth.uid() OR
    event_id IN (SELECT id FROM calendar_events WHERE user_id = auth.uid())
  );

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_calendar_events_updated_at
  BEFORE UPDATE ON calendar_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendar_views_updated_at
  BEFORE UPDATE ON calendar_views
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Sample Data for Testing
INSERT INTO calendar_events (
  user_id, title, description, start_datetime, end_datetime, event_type, color, category, created_by
) 
SELECT 
  id, 
  'Board Meeting Q4 Review', 
  'Quarterly board meeting to review Q4 performance and strategy',
  NOW() + INTERVAL '1 day', 
  NOW() + INTERVAL '1 day' + INTERVAL '2 hours',
  'meeting', 
  '#DC2626', 
  'Board Meetings',
  id
FROM auth.users 
WHERE email = 'test.director@boardguru.ai'
LIMIT 1
ON CONFLICT DO NOTHING;

-- Insert calendar view for the test user
INSERT INTO calendar_views (user_id)
SELECT id FROM auth.users WHERE email = 'test.director@boardguru.ai' LIMIT 1
ON CONFLICT (user_id) DO NOTHING;