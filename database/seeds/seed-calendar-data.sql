-- =====================================================
-- SYNTHETIC CALENDAR DATA FOR TEST DIRECTOR USER
-- Creates comprehensive calendar events for testing
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create calendar_events table if it doesn't exist
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Event details
  title TEXT NOT NULL CHECK (length(title) >= 1 AND length(title) <= 200),
  description TEXT CHECK (length(description) <= 2000),
  event_type TEXT NOT NULL CHECK (event_type IN ('meeting', 'board-meeting', 'committee-meeting', 'training', 'deadline', 'conference', 'workshop', 'review', 'interview', 'social', 'other')) DEFAULT 'meeting',
  
  -- Timing
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL CHECK (end_time > start_time),
  all_day BOOLEAN DEFAULT false,
  timezone TEXT DEFAULT 'UTC',
  
  -- Recurrence (for recurring events)
  recurrence_rule TEXT, -- RRULE format
  recurrence_until TIMESTAMPTZ,
  is_recurring BOOLEAN DEFAULT false,
  parent_event_id UUID REFERENCES calendar_events(id),
  
  -- Location and meeting details
  location TEXT,
  meeting_room TEXT,
  virtual_meeting_url TEXT,
  meeting_platform TEXT CHECK (meeting_platform IN ('zoom', 'teams', 'webex', 'meet', 'in-person', 'hybrid')),
  
  -- Organization and permissions
  organization_id UUID REFERENCES organizations(id),
  created_by UUID NOT NULL REFERENCES users(id),
  
  -- Attendees and visibility
  visibility TEXT CHECK (visibility IN ('public', 'organization', 'private', 'confidential')) DEFAULT 'organization',
  max_attendees INTEGER CHECK (max_attendees > 0),
  requires_approval BOOLEAN DEFAULT false,
  
  -- Status and tracking
  status TEXT CHECK (status IN ('draft', 'published', 'cancelled', 'completed', 'in-progress')) DEFAULT 'published',
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
  
  -- Additional metadata
  agenda_items TEXT[], -- Array of agenda items
  preparation_materials TEXT[], -- URLs or file paths
  tags TEXT[], -- Searchable tags
  color_code TEXT CHECK (color_code ~ '^#[0-9A-Fa-f]{6}$'), -- Hex color for calendar display
  
  -- Notifications and reminders
  send_reminders BOOLEAN DEFAULT true,
  reminder_times INTEGER[] DEFAULT ARRAY[15, 60], -- Minutes before event
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES users(id)
);

-- Create calendar_event_attendees table
CREATE TABLE IF NOT EXISTS calendar_event_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Attendance details
  invitation_status TEXT CHECK (invitation_status IN ('pending', 'accepted', 'declined', 'tentative', 'no-response')) DEFAULT 'pending',
  attendance_status TEXT CHECK (attendance_status IN ('not-started', 'present', 'absent', 'late', 'left-early')) DEFAULT 'not-started',
  
  -- Role and permissions
  role TEXT CHECK (role IN ('organizer', 'required', 'optional', 'chair', 'presenter')) DEFAULT 'optional',
  can_edit BOOLEAN DEFAULT false,
  can_invite_others BOOLEAN DEFAULT false,
  
  -- Response and notes
  response_notes TEXT CHECK (length(response_notes) <= 500),
  responded_at TIMESTAMPTZ,
  
  -- Timestamps
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  joined_at TIMESTAMPTZ,
  left_at TIMESTAMPTZ,
  
  -- Constraints
  UNIQUE(event_id, user_id)
);

-- Get the test director user ID and existing organization ID
DO $$
DECLARE 
    test_user_id UUID := '12345678-1234-5678-9012-123456789012';
    org_id_1 UUID;
    org_id_2 UUID;
    org_id_3 UUID;
    event_id UUID;
    attendee_ids UUID[] := ARRAY[test_user_id];
    attendee_id UUID;
    i INTEGER;
BEGIN
    -- Get existing organization ID or use the demo org
    SELECT id INTO org_id_1 FROM organizations LIMIT 1;
    org_id_2 := org_id_1;  -- Use same org for simplicity
    org_id_3 := org_id_1;

-- =====================================================
-- BOARD MEETINGS (Strategic, quarterly, monthly)
-- =====================================================

-- 1. Q4 Board Strategy Meeting (Upcoming)
event_id := gen_random_uuid();
INSERT INTO calendar_events (
    id, title, description, event_type, start_time, end_time,
    location, meeting_room, virtual_meeting_url, meeting_platform,
    organization_id, created_by, visibility, status, priority,
    agenda_items, tags, color_code, send_reminders
) VALUES (
    event_id,
    'Q4 2024 Board Strategy Meeting',
    'Comprehensive quarterly board meeting covering strategic initiatives, financial review, and 2025 planning. Board packet includes quarterly financials, strategic initiatives update, competitive analysis, and budget proposals for next year.',
    'board-meeting',
    NOW() + INTERVAL '3 days' + INTERVAL '9 hours', -- 3 days from now at 9 AM
    NOW() + INTERVAL '3 days' + INTERVAL '12 hours', -- 3 hours duration
    'BoardGuru Conference Center, Executive Boardroom A',
    'Boardroom A - Executive Floor',
    'https://zoom.us/j/1234567890?pwd=boardmeeting2024',
    'hybrid',
    org_id_1,
    test_user_id,
    'confidential',
    'published',
    'high',
    ARRAY[
        'Call to Order and Attendance',
        'Review and Approval of Previous Minutes',
        'Q4 Financial Performance Review',
        'Strategic Initiatives Update',
        '2025 Budget Proposal and Discussion',
        'Competitive Market Analysis',
        'ESG and Sustainability Report',
        'Risk Management Dashboard Review',
        'Executive Session - Compensation Committee',
        'Next Steps and Action Items'
    ],
    ARRAY['board', 'strategy', 'quarterly', 'financial', 'planning'],
    '#1e40af', -- Blue
    true
);

-- Add attendees for Q4 Board Meeting
FOR i IN 1..array_length(attendee_ids, 1) LOOP
    INSERT INTO calendar_event_attendees (
        event_id, user_id, invitation_status, role, can_edit
    ) VALUES (
        event_id, 
        attendee_ids[i], 
        CASE i 
            WHEN 1 THEN 'accepted'
            WHEN 2 THEN 'tentative' 
            WHEN 3 THEN 'accepted'
            ELSE 'pending'
        END,
        CASE i 
            WHEN 1 THEN 'chair'
            WHEN 2 THEN 'required'
            ELSE 'required'
        END,
        i <= 2
    );
END LOOP;

-- 2. Monthly Board Review (Recent)
event_id := gen_random_uuid();
INSERT INTO calendar_events (
    id, title, description, event_type, start_time, end_time,
    virtual_meeting_url, meeting_platform,
    organization_id, created_by, visibility, status, priority,
    agenda_items, tags, color_code
) VALUES (
    event_id,
    'November Board Review Meeting',
    'Monthly operational review covering KPIs, recent acquisitions, regulatory updates, and team performance metrics.',
    'board-meeting',
    NOW() - INTERVAL '5 days' + INTERVAL '14 hours', -- 5 days ago at 2 PM
    NOW() - INTERVAL '5 days' + INTERVAL '16 hours', -- 2 hours duration
    'https://teams.microsoft.com/l/meetup-join/boardreview-nov2024',
    'teams',
    org_id_1,
    test_user_id,
    'organization',
    'completed',
    'medium',
    ARRAY[
        'Monthly KPI Dashboard Review',
        'Acquisition Integration Update',
        'Regulatory Compliance Report',
        'Team Performance Metrics',
        'Customer Satisfaction Survey Results',
        'Technology Infrastructure Update',
        'December Planning Discussion'
    ],
    ARRAY['board', 'monthly', 'review', 'kpi', 'operations'],
    '#1e40af'
);

-- =====================================================
-- COMMITTEE MEETINGS (Audit, Compensation, etc.)
-- =====================================================

-- 3. Audit Committee Meeting (Upcoming)
event_id := gen_random_uuid();
INSERT INTO calendar_events (
    id, title, description, event_type, start_time, end_time,
    location, virtual_meeting_url, meeting_platform,
    organization_id, created_by, visibility, priority,
    agenda_items, tags, color_code
) VALUES (
    event_id,
    'Audit Committee - Year-End Review',
    'Year-end audit committee meeting with external auditors. Review of financial statements, internal controls, and audit findings.',
    'committee-meeting',
    NOW() + INTERVAL '1 week' + INTERVAL '10 hours', -- Next week at 10 AM
    NOW() + INTERVAL '1 week' + INTERVAL '12 hours 30 minutes', -- 2.5 hours
    'Corporate Office - Conference Room B',
    'https://webex.com/meet/audit-committee-2024',
    'hybrid',
    org_id_1,
    test_user_id,
    'confidential',
    'high',
    ARRAY[
        'External Auditor Presentation',
        'Financial Statement Review',
        'Internal Controls Assessment',
        'Audit Findings and Recommendations',
        'Management Response to Audit',
        'SOX Compliance Update',
        'Risk Assessment Review'
    ],
    ARRAY['audit', 'committee', 'financial', 'compliance', 'external-auditor'],
    '#dc2626' -- Red
);

-- 4. Compensation Committee (Recent)
event_id := gen_random_uuid();
INSERT INTO calendar_events (
    id, title, description, event_type, start_time, end_time,
    location, organization_id, created_by, visibility, status,
    agenda_items, tags, color_code
) VALUES (
    event_id,
    'Compensation Committee - Executive Review',
    'Annual executive compensation review including CEO performance evaluation, salary benchmarking, and equity compensation planning.',
    'committee-meeting',
    NOW() - INTERVAL '10 days' + INTERVAL '15 hours', -- 10 days ago
    NOW() - INTERVAL '10 days' + INTERVAL '17 hours',
    'Executive Conference Room - Private',
    org_id_1,
    test_user_id,
    'confidential',
    'completed',
    ARRAY[
        'CEO Performance Evaluation',
        'Executive Compensation Benchmarking',
        'Equity Compensation Review',
        '2025 Salary Recommendations',
        'Long-term Incentive Planning',
        'Board Compensation Analysis'
    ],
    ARRAY['compensation', 'committee', 'executive', 'salary', 'performance'],
    '#7c2d12' -- Brown
);

-- =====================================================
-- TRAINING AND DEVELOPMENT EVENTS
-- =====================================================

-- 5. Board Director Training (Upcoming)
event_id := gen_random_uuid();
INSERT INTO calendar_events (
    id, title, description, event_type, start_time, end_time,
    location, virtual_meeting_url, meeting_platform,
    organization_id, created_by, visibility, max_attendees,
    agenda_items, preparation_materials, tags, color_code
) VALUES (
    event_id,
    'Cybersecurity Governance Training for Directors',
    'Comprehensive training on cybersecurity governance, risk management frameworks, and board oversight responsibilities in the digital age.',
    'training',
    NOW() + INTERVAL '2 weeks' + INTERVAL '9 hours', -- Two weeks from now
    NOW() + INTERVAL '2 weeks' + INTERVAL '17 hours', -- Full day training
    'Corporate Training Center - Main Auditorium',
    'https://zoom.us/j/cybersecurity-training-2024',
    'hybrid',
    org_id_1,
    test_user_id,
    'organization',
    25,
    ARRAY[
        'Introduction to Cybersecurity Governance',
        'Understanding Cyber Risk Frameworks',
        'Board Oversight Responsibilities',
        'Incident Response Planning',
        'Third-party Risk Management',
        'Regulatory Requirements and Compliance',
        'Case Studies and Best Practices',
        'Q&A with Security Experts'
    ],
    ARRAY[
        'https://docs.company.com/cybersecurity-governance-guide.pdf',
        'https://docs.company.com/cyber-risk-framework.pdf',
        'https://docs.company.com/incident-response-playbook.pdf'
    ],
    ARRAY['training', 'cybersecurity', 'governance', 'risk', 'compliance'],
    '#059669' -- Green
);

-- 6. ESG Workshop (Recent)
event_id := gen_random_uuid();
INSERT INTO calendar_events (
    id, title, description, event_type, start_time, end_time,
    location, organization_id, created_by, status,
    agenda_items, tags, color_code
) VALUES (
    event_id,
    'ESG Reporting and Sustainability Workshop',
    'Interactive workshop on Environmental, Social, and Governance reporting requirements and sustainability initiatives.',
    'workshop',
    NOW() - INTERVAL '1 week' + INTERVAL '13 hours', -- Last week
    NOW() - INTERVAL '1 week' + INTERVAL '17 hours',
    'Sustainability Center - Innovation Hub',
    org_id_2, -- GreenLeaf Financial
    test_user_id,
    'completed',
    ARRAY[
        'ESG Regulatory Landscape',
        'Sustainability Metrics and KPIs',
        'Stakeholder Engagement Strategies',
        'Climate Risk Assessment',
        'Social Impact Measurement',
        'Governance Best Practices',
        'Reporting Framework Selection'
    ],
    ARRAY['esg', 'sustainability', 'workshop', 'reporting', 'climate'],
    '#059669'
);

-- =====================================================
-- CONFERENCES AND EXTERNAL EVENTS
-- =====================================================

-- 7. Corporate Governance Conference (Upcoming)
event_id := gen_random_uuid();
INSERT INTO calendar_events (
    id, title, description, event_type, start_time, end_time,
    location, virtual_meeting_url, meeting_platform,
    organization_id, created_by, visibility, all_day,
    tags, color_code, preparation_materials
) VALUES (
    event_id,
    'National Corporate Governance Conference 2024',
    'Premier annual conference for board directors and corporate governance professionals. Three-day event featuring keynote speakers, breakout sessions, and networking opportunities.',
    'conference',
    NOW() + INTERVAL '3 weeks', -- Three weeks from now
    NOW() + INTERVAL '3 weeks' + INTERVAL '3 days', -- 3-day event
    'Grand Convention Center, Washington DC',
    'https://governanceconf2024.com/virtual-access',
    'hybrid',
    org_id_1,
    test_user_id,
    'public',
    true,
    ARRAY['conference', 'governance', 'networking', 'professional-development'],
    '#7c3aed', -- Purple
    ARRAY[
        'https://governanceconf2024.com/agenda.pdf',
        'https://governanceconf2024.com/speaker-bios.pdf',
        'https://governanceconf2024.com/networking-guide.pdf'
    ]
);

-- =====================================================
-- INTERVIEWS AND RECRUITMENT
-- =====================================================

-- 8. Board Candidate Interview (Upcoming)
event_id := gen_random_uuid();
INSERT INTO calendar_events (
    id, title, description, event_type, start_time, end_time,
    location, virtual_meeting_url, meeting_platform,
    organization_id, created_by, visibility, priority,
    agenda_items, tags, color_code
) VALUES (
    event_id,
    'Board Candidate Interview - Dr. Sarah Martinez',
    'Final interview with board candidate Dr. Sarah Martinez for independent director position. Background in technology and healthcare innovation.',
    'interview',
    NOW() + INTERVAL '5 days' + INTERVAL '11 hours', -- 5 days from now
    NOW() + INTERVAL '5 days' + INTERVAL '12 hours 30 minutes',
    'Executive Office - Private Conference Room',
    'https://teams.microsoft.com/l/meetup-join/board-interview-martinez',
    'hybrid',
    org_id_3, -- MedCore Healthcare
    test_user_id,
    'confidential',
    'high',
    ARRAY[
        'Candidate Introduction and Background',
        'Experience in Healthcare Innovation',
        'Technology Leadership Discussion',
        'Board Experience and Philosophy',
        'Strategic Vision Alignment',
        'Q&A Session',
        'Next Steps Discussion'
    ],
    ARRAY['interview', 'board-candidate', 'recruitment', 'independent-director'],
    '#ea580c' -- Orange
);

-- =====================================================
-- DEADLINES AND IMPORTANT DATES
-- =====================================================

-- 9. Annual Report Filing Deadline
event_id := gen_random_uuid();
INSERT INTO calendar_events (
    id, title, description, event_type, start_time, end_time,
    organization_id, created_by, priority, all_day,
    tags, color_code, reminder_times
) VALUES (
    event_id,
    'Annual Report Filing Deadline - SEC Form 10-K',
    'Mandatory deadline for filing Annual Report (Form 10-K) with the Securities and Exchange Commission. All required documentation must be submitted by end of business day.',
    'deadline',
    NOW() + INTERVAL '6 weeks', -- 6 weeks from now
    NOW() + INTERVAL '6 weeks' + INTERVAL '23 hours 59 minutes',
    org_id_1,
    test_user_id,
    'urgent',
    true,
    ARRAY['deadline', 'sec', 'filing', 'annual-report', 'regulatory'],
    '#dc2626', -- Red
    ARRAY[10080, 2880, 1440, 60] -- 1 week, 2 days, 1 day, 1 hour before
);

-- 10. Quarterly Earnings Call
event_id := gen_random_uuid();
INSERT INTO calendar_events (
    id, title, description, event_type, start_time, end_time,
    virtual_meeting_url, meeting_platform,
    organization_id, created_by, visibility, priority,
    agenda_items, tags, color_code
) VALUES (
    event_id,
    'Q4 2024 Earnings Call - Investor Relations',
    'Public earnings call to discuss Q4 2024 financial results with investors, analysts, and stakeholders.',
    'meeting',
    NOW() + INTERVAL '4 weeks' + INTERVAL '16 hours', -- 4 weeks from now at 4 PM EST
    NOW() + INTERVAL '4 weeks' + INTERVAL '17 hours 30 minutes',
    'https://ir.company.com/earnings-call-q4-2024',
    'webex',
    org_id_1,
    test_user_id,
    'public',
    'high',
    ARRAY[
        'Opening Remarks - CEO',
        'Q4 Financial Results - CFO',
        'Business Performance Review',
        'Market Outlook and Strategy',
        'Q&A Session with Analysts',
        'Closing Remarks'
    ],
    ARRAY['earnings', 'investors', 'quarterly', 'financial', 'public'],
    '#1d4ed8' -- Blue
);

-- =====================================================
-- RECURRING MEETINGS
-- =====================================================

-- 11. Weekly Executive Team Sync (Recurring)
event_id := gen_random_uuid();
INSERT INTO calendar_events (
    id, title, description, event_type, start_time, end_time,
    virtual_meeting_url, meeting_platform, is_recurring, recurrence_rule,
    organization_id, created_by, visibility,
    agenda_items, tags, color_code
) VALUES (
    event_id,
    'Executive Team Weekly Sync',
    'Weekly synchronization meeting for executive team to review key metrics, discuss priorities, and align on strategic initiatives.',
    'meeting',
    DATE_TRUNC('week', NOW()) + INTERVAL '1 day' + INTERVAL '9 hours', -- Next Monday at 9 AM
    DATE_TRUNC('week', NOW()) + INTERVAL '1 day' + INTERVAL '10 hours', -- 1 hour duration
    'https://zoom.us/j/exec-team-weekly-sync',
    'zoom',
    true,
    'FREQ=WEEKLY;BYDAY=MO;INTERVAL=1', -- Every Monday
    org_id_1,
    test_user_id,
    'organization',
    ARRAY[
        'Weekly KPI Review',
        'Priority Updates from Each Department',
        'Upcoming Week Planning',
        'Issues and Blockers Discussion',
        'Cross-team Coordination',
        'Action Items Review'
    ],
    ARRAY['executive', 'weekly', 'sync', 'recurring', 'operations'],
    '#6366f1' -- Indigo
);

-- =====================================================
-- SOCIAL AND TEAM BUILDING EVENTS
-- =====================================================

-- 12. Annual Board Retreat (Upcoming)
event_id := gen_random_uuid();
INSERT INTO calendar_events (
    id, title, description, event_type, start_time, end_time,
    location, organization_id, created_by, visibility, all_day,
    agenda_items, tags, color_code, preparation_materials
) VALUES (
    event_id,
    'Annual Board Retreat 2025 - Strategic Planning',
    'Two-day annual board retreat combining strategic planning sessions with team building activities. Focus on 2025-2027 strategic roadmap and board effectiveness.',
    'social',
    NOW() + INTERVAL '8 weeks', -- 8 weeks from now
    NOW() + INTERVAL '8 weeks' + INTERVAL '2 days', -- 2-day retreat
    'Mountain View Resort & Conference Center, Colorado',
    org_id_1,
    test_user_id,
    'organization',
    true,
    ARRAY[
        'Welcome Reception and Dinner',
        '2025-2027 Strategic Planning Session',
        'Board Effectiveness Assessment',
        'Governance Best Practices Workshop',
        'Team Building Activities',
        'Executive Sessions',
        'Action Planning and Commitments',
        'Closing Dinner and Reflection'
    ],
    ARRAY['retreat', 'strategic-planning', 'team-building', 'annual'],
    '#059669', -- Green
    ARRAY[
        'https://docs.company.com/board-retreat-2025-agenda.pdf',
        'https://docs.company.com/strategic-planning-framework.pdf'
    ]
);

END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_calendar_events_organization_id ON calendar_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_created_by ON calendar_events(created_by);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_status ON calendar_events(status);
CREATE INDEX IF NOT EXISTS idx_calendar_events_event_type ON calendar_events(event_type);
CREATE INDEX IF NOT EXISTS idx_calendar_event_attendees_user_id ON calendar_event_attendees(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_event_attendees_event_id ON calendar_event_attendees(event_id);

-- Success message
SELECT 'Successfully created comprehensive calendar data for test director user!' as result,
       COUNT(*) as total_events 
FROM calendar_events;