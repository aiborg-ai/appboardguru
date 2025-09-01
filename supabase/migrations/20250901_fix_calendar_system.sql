-- Fix Calendar System
-- Ensure all necessary tables and functions exist

-- Create calendar_events table if it doesn't exist
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Event details
  title VARCHAR(255) NOT NULL,
  description TEXT,
  start_datetime TIMESTAMPTZ NOT NULL,
  end_datetime TIMESTAMPTZ NOT NULL,
  timezone VARCHAR(100) DEFAULT 'UTC',
  all_day BOOLEAN DEFAULT FALSE,
  
  -- Event metadata
  event_type VARCHAR(50) DEFAULT 'meeting',
  status VARCHAR(50) DEFAULT 'confirmed',
  visibility VARCHAR(50) DEFAULT 'private',
  color VARCHAR(7) DEFAULT '#3B82F6',
  category VARCHAR(100),
  tags TEXT[] DEFAULT '{}',
  
  -- Location
  location TEXT,
  virtual_meeting_url TEXT,
  
  -- Recurrence
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_rule JSONB,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create calendar_attendees table if it doesn't exist
CREATE TABLE IF NOT EXISTS calendar_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES calendar_events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'participant',
  rsvp_status VARCHAR(50) DEFAULT 'pending',
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create calendar_reminders table if it doesn't exist
CREATE TABLE IF NOT EXISTS calendar_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES calendar_events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  reminder_type VARCHAR(50) DEFAULT 'email',
  minutes_before INTEGER DEFAULT 15,
  is_sent BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create or replace the check_calendar_conflicts function
CREATE OR REPLACE FUNCTION check_calendar_conflicts(
  p_user_id UUID,
  p_start_datetime TIMESTAMPTZ,
  p_end_datetime TIMESTAMPTZ,
  p_exclude_event_id UUID DEFAULT NULL
)
RETURNS TABLE (
  event_id UUID,
  title VARCHAR,
  start_datetime TIMESTAMPTZ,
  end_datetime TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ce.id as event_id,
    ce.title,
    ce.start_datetime,
    ce.end_datetime
  FROM calendar_events ce
  WHERE 
    ce.user_id = p_user_id
    AND ce.status != 'cancelled'
    AND (p_exclude_event_id IS NULL OR ce.id != p_exclude_event_id)
    AND (
      -- Check for any overlap
      (ce.start_datetime, ce.end_datetime) OVERLAPS (p_start_datetime, p_end_datetime)
    );
END;
$$;

-- Enable RLS on calendar tables
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_reminders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own events" ON calendar_events;
DROP POLICY IF EXISTS "Users can create their own events" ON calendar_events;
DROP POLICY IF EXISTS "Users can update their own events" ON calendar_events;
DROP POLICY IF EXISTS "Users can delete their own events" ON calendar_events;

-- Create RLS policies for calendar_events
CREATE POLICY "Users can view their own events"
ON calendar_events FOR SELECT
USING (
  user_id = auth.uid()
  OR created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM calendar_attendees
    WHERE event_id = calendar_events.id
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can create their own events"
ON calendar_events FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  OR created_by = auth.uid()
);

CREATE POLICY "Users can update their own events"
ON calendar_events FOR UPDATE
USING (
  user_id = auth.uid()
  OR created_by = auth.uid()
);

CREATE POLICY "Users can delete their own events"
ON calendar_events FOR DELETE
USING (
  user_id = auth.uid()
  OR created_by = auth.uid()
);

-- Drop existing attendee policies
DROP POLICY IF EXISTS "Users can view attendees for their events" ON calendar_attendees;
DROP POLICY IF EXISTS "Users can manage attendees for their events" ON calendar_attendees;

-- Create RLS policies for calendar_attendees
CREATE POLICY "Users can view attendees for their events"
ON calendar_attendees FOR SELECT
USING (
  user_id = auth.uid()
  OR invited_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM calendar_events
    WHERE id = calendar_attendees.event_id
    AND (user_id = auth.uid() OR created_by = auth.uid())
  )
);

CREATE POLICY "Users can manage attendees for their events"
ON calendar_attendees FOR ALL
USING (
  invited_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM calendar_events
    WHERE id = calendar_attendees.event_id
    AND (user_id = auth.uid() OR created_by = auth.uid())
  )
);

-- Drop existing reminder policies
DROP POLICY IF EXISTS "Users can manage their own reminders" ON calendar_reminders;

-- Create RLS policies for calendar_reminders
CREATE POLICY "Users can manage their own reminders"
ON calendar_reminders FOR ALL
USING (user_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_id ON calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_datetime ON calendar_events(start_datetime);
CREATE INDEX IF NOT EXISTS idx_calendar_events_end_datetime ON calendar_events(end_datetime);
CREATE INDEX IF NOT EXISTS idx_calendar_attendees_event_id ON calendar_attendees(event_id);
CREATE INDEX IF NOT EXISTS idx_calendar_attendees_user_id ON calendar_attendees(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_reminders_event_id ON calendar_reminders(event_id);
CREATE INDEX IF NOT EXISTS idx_calendar_reminders_user_id ON calendar_reminders(user_id);