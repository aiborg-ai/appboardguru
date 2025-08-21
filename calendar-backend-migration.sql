-- Calendar Backend Migration for BoardGuru
-- This file creates comprehensive calendar functionality extending the existing meetings table

-- 1. Calendar Events Table (extends meetings functionality)
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Link to existing meetings table (nullable for personal events)
  meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
  
  -- Basic event information
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Date and time
  start_datetime TIMESTAMPTZ NOT NULL,
  end_datetime TIMESTAMPTZ NOT NULL,
  timezone VARCHAR(50) DEFAULT 'UTC',
  all_day BOOLEAN DEFAULT FALSE,
  
  -- Event properties
  event_type VARCHAR(50) DEFAULT 'meeting' CHECK (event_type IN ('meeting', 'personal', 'reminder', 'deadline', 'holiday')),
  status VARCHAR(20) DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'tentative', 'cancelled')),
  visibility VARCHAR(20) DEFAULT 'private' CHECK (visibility IN ('public', 'organization', 'private')),
  
  -- Visual and categorization
  color VARCHAR(7) DEFAULT '#3B82F6', -- Hex color code
  category VARCHAR(100),
  tags TEXT[] DEFAULT '{}',
  
  -- Location
  location TEXT,
  virtual_meeting_url TEXT,
  
  -- Recurrence
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_rule JSONB, -- Store RRULE data
  parent_event_id UUID REFERENCES calendar_events(id) ON DELETE CASCADE,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES users(id),
  
  -- Indexes for performance
  CONSTRAINT valid_datetime CHECK (end_datetime > start_datetime)
);

-- 2. Calendar Views (user preferences)
CREATE TABLE IF NOT EXISTS calendar_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  
  -- View preferences
  default_view VARCHAR(20) DEFAULT 'month' CHECK (default_view IN ('day', 'week', 'month', 'year', 'agenda')),
  week_start_day INTEGER DEFAULT 0 CHECK (week_start_day BETWEEN 0 AND 6), -- 0 = Sunday
  time_format VARCHAR(10) DEFAULT '12h' CHECK (time_format IN ('12h', '24h')),
  timezone VARCHAR(50) DEFAULT 'UTC',
  
  -- Display settings
  show_weekends BOOLEAN DEFAULT TRUE,
  show_declined_events BOOLEAN DEFAULT FALSE,
  compact_view BOOLEAN DEFAULT FALSE,
  
  -- Working hours
  work_start_time TIME DEFAULT '09:00',
  work_end_time TIME DEFAULT '17:00',
  work_days INTEGER[] DEFAULT '{1,2,3,4,5}', -- 1=Monday, 7=Sunday
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Calendar Reminders
CREATE TABLE IF NOT EXISTS calendar_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Reminder settings
  reminder_type VARCHAR(20) NOT NULL CHECK (reminder_type IN ('email', 'push', 'in_app', 'sms')),
  minutes_before INTEGER NOT NULL CHECK (minutes_before >= 0),
  
  -- Status
  is_sent BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(event_id, user_id, reminder_type, minutes_before)
);

-- 4. Calendar Attendees (extends existing functionality)
CREATE TABLE IF NOT EXISTS calendar_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Invitation details
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'participant' CHECK (role IN ('organizer', 'presenter', 'participant', 'optional')),
  
  -- RSVP status
  rsvp_status VARCHAR(20) DEFAULT 'pending' CHECK (rsvp_status IN ('pending', 'accepted', 'declined', 'tentative')),
  rsvp_responded_at TIMESTAMPTZ,
  rsvp_note TEXT,
  
  -- Permissions
  can_edit BOOLEAN DEFAULT FALSE,
  can_invite_others BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  invited_by UUID REFERENCES users(id),
  
  UNIQUE(event_id, user_id)
);

-- 5. Calendar Subscriptions (shared calendars)
CREATE TABLE IF NOT EXISTS calendar_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  calendar_owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Subscription details
  name VARCHAR(255) NOT NULL,
  description TEXT,
  subscription_type VARCHAR(20) DEFAULT 'user' CHECK (subscription_type IN ('user', 'organization', 'external')),
  
  -- Permissions
  permission_level VARCHAR(20) DEFAULT 'read' CHECK (permission_level IN ('read', 'write', 'admin')),
  
  -- Display settings
  is_visible BOOLEAN DEFAULT TRUE,
  color VARCHAR(7) DEFAULT '#6366F1',
  
  -- Status
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled')),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(subscriber_id, calendar_owner_id)
);

-- 6. Calendar Availability (for scheduling assistance)
CREATE TABLE IF NOT EXISTS calendar_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Availability window
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0 = Sunday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  timezone VARCHAR(50) DEFAULT 'UTC',
  
  -- Availability type
  availability_type VARCHAR(20) DEFAULT 'available' CHECK (availability_type IN ('available', 'busy', 'tentative')),
  
  -- Date range (for exceptions or temporary availability)
  effective_from DATE,
  effective_until DATE,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_datetime ON calendar_events(user_id, start_datetime, end_datetime);
CREATE INDEX IF NOT EXISTS idx_calendar_events_org_datetime ON calendar_events(organization_id, start_datetime, end_datetime);
CREATE INDEX IF NOT EXISTS idx_calendar_events_meeting_id ON calendar_events(meeting_id);
CREATE INDEX IF NOT EXISTS idx_calendar_reminders_event_user ON calendar_reminders(event_id, user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_attendees_event_status ON calendar_attendees(event_id, rsvp_status);
CREATE INDEX IF NOT EXISTS idx_calendar_subscriptions_subscriber ON calendar_subscriptions(subscriber_id, status);
CREATE INDEX IF NOT EXISTS idx_calendar_availability_user_day ON calendar_availability(user_id, day_of_week);

-- Functions for recurring events
CREATE OR REPLACE FUNCTION generate_recurring_events(
  base_event_id UUID,
  end_date DATE
) RETURNS INTEGER AS $$
DECLARE
  base_event calendar_events%ROWTYPE;
  occurrence_date TIMESTAMPTZ;
  new_event_id UUID;
  count INTEGER := 0;
BEGIN
  -- Get the base event
  SELECT * INTO base_event FROM calendar_events WHERE id = base_event_id;
  
  IF NOT FOUND OR NOT base_event.is_recurring THEN
    RETURN 0;
  END IF;
  
  -- Generate occurrences based on recurrence rule
  -- This is a simplified implementation - in production, use a proper RRULE library
  occurrence_date := base_event.start_datetime;
  
  WHILE occurrence_date::DATE <= end_date LOOP
    -- Add interval based on recurrence pattern
    CASE (base_event.recurrence_rule->>'freq')::TEXT
      WHEN 'DAILY' THEN 
        occurrence_date := occurrence_date + INTERVAL '1 day';
      WHEN 'WEEKLY' THEN 
        occurrence_date := occurrence_date + INTERVAL '1 week';
      WHEN 'MONTHLY' THEN 
        occurrence_date := occurrence_date + INTERVAL '1 month';
      WHEN 'YEARLY' THEN 
        occurrence_date := occurrence_date + INTERVAL '1 year';
      ELSE 
        EXIT;
    END CASE;
    
    -- Insert new occurrence
    INSERT INTO calendar_events (
      meeting_id, user_id, organization_id, title, description,
      start_datetime, end_datetime, timezone, all_day,
      event_type, status, visibility, color, category, tags,
      location, virtual_meeting_url, is_recurring, recurrence_rule,
      parent_event_id, created_by
    ) VALUES (
      base_event.meeting_id, base_event.user_id, base_event.organization_id,
      base_event.title, base_event.description,
      occurrence_date, 
      occurrence_date + (base_event.end_datetime - base_event.start_datetime),
      base_event.timezone, base_event.all_day,
      base_event.event_type, base_event.status, base_event.visibility,
      base_event.color, base_event.category, base_event.tags,
      base_event.location, base_event.virtual_meeting_url,
      FALSE, -- Occurrences are not recurring themselves
      base_event.recurrence_rule, base_event_id, base_event.created_by
    );
    
    count := count + 1;
    
    -- Safety limit
    IF count >= 1000 THEN
      EXIT;
    END IF;
  END LOOP;
  
  RETURN count;
END;
$$ LANGUAGE plpgsql;

-- Function to check for scheduling conflicts
CREATE OR REPLACE FUNCTION check_calendar_conflicts(
  p_user_id UUID,
  p_start_datetime TIMESTAMPTZ,
  p_end_datetime TIMESTAMPTZ,
  p_exclude_event_id UUID DEFAULT NULL
) RETURNS TABLE (
  event_id UUID,
  title TEXT,
  start_datetime TIMESTAMPTZ,
  end_datetime TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ce.id,
    ce.title,
    ce.start_datetime,
    ce.end_datetime
  FROM calendar_events ce
  LEFT JOIN calendar_attendees ca ON ce.id = ca.event_id
  WHERE 
    (ce.user_id = p_user_id OR ca.user_id = p_user_id)
    AND ce.status = 'confirmed'
    AND (ca.rsvp_status IS NULL OR ca.rsvp_status IN ('accepted', 'tentative'))
    AND (
      (ce.start_datetime <= p_start_datetime AND ce.end_datetime > p_start_datetime) OR
      (ce.start_datetime < p_end_datetime AND ce.end_datetime >= p_end_datetime) OR
      (ce.start_datetime >= p_start_datetime AND ce.end_datetime <= p_end_datetime)
    )
    AND (p_exclude_event_id IS NULL OR ce.id != p_exclude_event_id);
END;
$$ LANGUAGE plpgsql;

-- Row Level Security (RLS) Policies
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_availability ENABLE ROW LEVEL SECURITY;

-- Calendar Events RLS Policies
CREATE POLICY "Users can view their own events" ON calendar_events
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can view organization events they belong to" ON calendar_events
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
    AND visibility IN ('public', 'organization')
  );

CREATE POLICY "Users can view events they're invited to" ON calendar_events
  FOR SELECT USING (
    id IN (
      SELECT event_id FROM calendar_attendees 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create their own events" ON calendar_events
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own events" ON calendar_events
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own events" ON calendar_events
  FOR DELETE USING (user_id = auth.uid());

-- Calendar Views RLS Policies
CREATE POLICY "Users can manage their own calendar views" ON calendar_views
  FOR ALL USING (user_id = auth.uid());

-- Calendar Reminders RLS Policies
CREATE POLICY "Users can manage reminders for their events" ON calendar_reminders
  FOR ALL USING (
    user_id = auth.uid() OR
    event_id IN (SELECT id FROM calendar_events WHERE user_id = auth.uid())
  );

-- Calendar Attendees RLS Policies
CREATE POLICY "Users can view attendees of events they can see" ON calendar_attendees
  FOR SELECT USING (
    event_id IN (
      SELECT id FROM calendar_events 
      WHERE user_id = auth.uid() 
      OR organization_id IN (
        SELECT organization_id FROM organization_members 
        WHERE user_id = auth.uid() AND status = 'active'
      )
    )
  );

CREATE POLICY "Event organizers can manage attendees" ON calendar_attendees
  FOR ALL USING (
    event_id IN (SELECT id FROM calendar_events WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update their own RSVP" ON calendar_attendees
  FOR UPDATE USING (user_id = auth.uid());

-- Calendar Subscriptions RLS Policies
CREATE POLICY "Users can view their subscriptions" ON calendar_subscriptions
  FOR SELECT USING (subscriber_id = auth.uid() OR calendar_owner_id = auth.uid());

CREATE POLICY "Users can manage their own subscriptions" ON calendar_subscriptions
  FOR ALL USING (subscriber_id = auth.uid());

CREATE POLICY "Calendar owners can manage subscriptions to their calendar" ON calendar_subscriptions
  FOR UPDATE USING (calendar_owner_id = auth.uid());

-- Calendar Availability RLS Policies
CREATE POLICY "Users can manage their own availability" ON calendar_availability
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Organization members can view availability" ON calendar_availability
  FOR SELECT USING (
    user_id IN (
      SELECT user_id FROM organization_members om
      JOIN organization_members requestor ON om.organization_id = requestor.organization_id
      WHERE requestor.user_id = auth.uid() AND requestor.status = 'active'
    )
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

CREATE TRIGGER update_calendar_subscriptions_updated_at
  BEFORE UPDATE ON calendar_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendar_availability_updated_at
  BEFORE UPDATE ON calendar_availability
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Sample data for testing (optional)
-- This creates some sample calendar events for demonstration

DO $$
DECLARE
  sample_user_id UUID;
  sample_org_id UUID;
  event_id UUID;
BEGIN
  -- Get first user and organization for sample data
  SELECT id INTO sample_user_id FROM users LIMIT 1;
  SELECT id INTO sample_org_id FROM organizations LIMIT 1;
  
  IF sample_user_id IS NOT NULL THEN
    -- Create sample calendar view
    INSERT INTO calendar_views (user_id) VALUES (sample_user_id)
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Create sample events
    INSERT INTO calendar_events (
      user_id, organization_id, title, description,
      start_datetime, end_datetime, event_type, color, category
    ) VALUES 
    (sample_user_id, sample_org_id, 'Board Meeting Q4 Review', 
     'Quarterly board meeting to review Q4 performance and strategy',
     NOW() + INTERVAL '1 day', NOW() + INTERVAL '1 day' + INTERVAL '2 hours',
     'meeting', '#DC2626', 'Board Meetings'),
    (sample_user_id, sample_org_id, 'ESG Committee Meeting', 
     'Monthly ESG committee meeting to review sustainability initiatives',
     NOW() + INTERVAL '3 days', NOW() + INTERVAL '3 days' + INTERVAL '1 hour',
     'meeting', '#059669', 'Committee Meetings'),
    (sample_user_id, NULL, 'Annual Report Deadline', 
     'Final deadline for annual report submission',
     NOW() + INTERVAL '7 days', NOW() + INTERVAL '7 days' + INTERVAL '1 hour',
     'deadline', '#DC2626', 'Deadlines')
    RETURNING id INTO event_id;
    
    -- Add reminders for the first event
    INSERT INTO calendar_reminders (event_id, user_id, reminder_type, minutes_before) VALUES
    (event_id, sample_user_id, 'email', 1440), -- 24 hours before
    (event_id, sample_user_id, 'in_app', 60);  -- 1 hour before
  END IF;
END $$;

-- Comments for documentation
COMMENT ON TABLE calendar_events IS 'Core calendar events table that extends meetings functionality';
COMMENT ON TABLE calendar_views IS 'User-specific calendar view preferences and settings';
COMMENT ON TABLE calendar_reminders IS 'Notification reminders for calendar events';
COMMENT ON TABLE calendar_attendees IS 'Event attendees with RSVP tracking';
COMMENT ON TABLE calendar_subscriptions IS 'Shared calendar subscriptions between users';
COMMENT ON TABLE calendar_availability IS 'User availability patterns for scheduling';

COMMENT ON COLUMN calendar_events.recurrence_rule IS 'JSONB field storing RRULE-compatible recurrence patterns';
COMMENT ON COLUMN calendar_events.color IS 'Hex color code for event display (#RRGGBB format)';
COMMENT ON COLUMN calendar_views.work_days IS 'Array of work days (1=Monday, 7=Sunday)';