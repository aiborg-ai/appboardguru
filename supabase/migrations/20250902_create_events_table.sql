-- Create events table for calendar functionality
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic event info
  title VARCHAR(255) NOT NULL,
  description TEXT,
  event_type VARCHAR(50) DEFAULT 'other' CHECK (event_type IN ('meeting', 'deadline', 'reminder', 'other')),
  
  -- Dates and times
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  is_all_day BOOLEAN DEFAULT false,
  timezone VARCHAR(100) DEFAULT 'UTC',
  
  -- Location
  location TEXT,
  virtual_meeting_url TEXT,
  
  -- Organization context
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Recurrence
  recurring BOOLEAN DEFAULT false,
  recurrence_pattern TEXT, -- RRULE format
  recurrence_end_date TIMESTAMPTZ,
  parent_event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  
  -- Reminders and notifications
  reminder_minutes INTEGER,
  send_reminder BOOLEAN DEFAULT true,
  
  -- Attendees (array of email addresses)
  attendees TEXT[] DEFAULT '{}',
  
  -- Visual
  color VARCHAR(7) DEFAULT '#3B82F6',
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Audit fields
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes
  CONSTRAINT valid_event_dates CHECK (end_date IS NULL OR end_date >= start_date)
);

-- Create indexes for better query performance
CREATE INDEX idx_events_created_by ON events(created_by);
CREATE INDEX idx_events_organization_id ON events(organization_id);
CREATE INDEX idx_events_start_date ON events(start_date);
CREATE INDEX idx_events_end_date ON events(end_date);
CREATE INDEX idx_events_event_type ON events(event_type);
CREATE INDEX idx_events_recurring ON events(recurring);

-- Enable RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own events
CREATE POLICY "Users can view own events" ON events
  FOR SELECT
  USING (created_by = auth.uid());

-- Users can view events from their organizations
CREATE POLICY "Users can view organization events" ON events
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid() 
      AND status = 'active'
    )
  );

-- Users can create their own events
CREATE POLICY "Users can create own events" ON events
  FOR INSERT
  WITH CHECK (created_by = auth.uid());

-- Users can update their own events
CREATE POLICY "Users can update own events" ON events
  FOR UPDATE
  USING (created_by = auth.uid());

-- Users can delete their own events
CREATE POLICY "Users can delete own events" ON events
  FOR DELETE
  USING (created_by = auth.uid());

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_events_updated_at();