-- =====================================================
-- SYNTHETIC CALENDAR DATA FOR TEST DIRECTOR USER
-- Creates comprehensive calendar events for testing
-- Fixed version using explicit UUIDs from existing seed data
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
  color_code TEXT DEFAULT '#3b82f6', -- UI color representation
  
  -- Reminders and notifications
  send_reminders BOOLEAN DEFAULT true,
  reminder_times INTEGER[] DEFAULT ARRAY[1440, 60], -- Minutes before (1 day, 1 hour)
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Create calendar_event_attendees table if it doesn't exist
CREATE TABLE IF NOT EXISTS calendar_event_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Attendance details
  attendance_status TEXT CHECK (attendance_status IN ('pending', 'accepted', 'declined', 'maybe', 'no_response')) DEFAULT 'pending',
  role TEXT CHECK (role IN ('organizer', 'attendee', 'optional', 'presenter', 'observer')) DEFAULT 'attendee',
  
  -- RSVPs and responses
  responded_at TIMESTAMPTZ,
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(event_id, user_id)
);

-- =====================================================
-- INSERT CALENDAR DATA
-- Using actual UUIDs from current database:
-- Test User ID: 12345678-1234-5678-9012-123456789012 (Demo User)
-- Organization ID: 057be307-34fd-4f9a-89f0-b52e9f4d9d48 (Demo Organization)
-- =====================================================

-- 1. Q4 Board Strategy Meeting (Upcoming)
INSERT INTO calendar_events (
    id, title, description, event_type,
    start_time, end_time,
    location, virtual_meeting_url, meeting_platform,
    organization_id, created_by, visibility, status, priority,
    agenda_items, tags, color_code, send_reminders
) VALUES (
    gen_random_uuid(),
    'Q4 2024 Board Strategy Meeting',
    'Comprehensive quarterly board meeting covering strategic initiatives, financial review, and 2025 planning. Board packet includes quarterly financials, strategic initiatives update, competitive analysis, and budget proposals for next year.',
    'board-meeting',
    NOW() + INTERVAL '3 days' + INTERVAL '9 hours', -- 3 days from now at 9 AM
    NOW() + INTERVAL '3 days' + INTERVAL '12 hours', -- 3 hours duration
    'BoardGuru Conference Center, Executive Boardroom A',
    'https://teams.microsoft.com/l/meetup-join/q4-strategy-2024',
    'teams',
    '057be307-34fd-4f9a-89f0-b52e9f4d9d48', -- Demo Organization
    '12345678-1234-5678-9012-123456789012', -- Test User
    'organization',
    'published',
    'high',
    ARRAY[
        'Opening and Welcome - CEO Introduction',
        'Q3 Performance Review and Financial Results',
        'Market Analysis and Competitive Landscape',
        '2025 Strategic Initiatives Overview',
        'Technology Investment Roadmap',
        'Risk Management and Compliance Update',
        'Budget Proposals for 2025',
        'Board Governance and Committee Updates',
        'Executive Session - Performance Reviews',
        'Action Items and Next Steps'
    ],
    ARRAY['board', 'strategy', 'quarterly', 'planning', 'high-priority'],
    '#dc2626', -- Red for high priority
    true
);

-- 2. November Board Review Meeting (Past event)
INSERT INTO calendar_events (
    id, title, description, event_type,
    start_time, end_time,
    virtual_meeting_url, meeting_platform,
    organization_id, created_by, visibility, status, priority,
    agenda_items, tags, color_code
) VALUES (
    gen_random_uuid(),
    'November Board Review Meeting',
    'Monthly operational review covering KPIs, recent acquisitions, regulatory updates, and team performance metrics.',
    'board-meeting',
    NOW() - INTERVAL '5 days' + INTERVAL '14 hours', -- 5 days ago at 2 PM
    NOW() - INTERVAL '5 days' + INTERVAL '16 hours', -- 2 hours duration
    'https://teams.microsoft.com/l/meetup-join/boardreview-nov2024',
    'teams',
    '057be307-34fd-4f9a-89f0-b52e9f4d9d48',
    '12345678-1234-5678-9012-123456789012',
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
    ARRAY['board', 'monthly', 'review', 'kpis', 'completed'],
    '#059669' -- Green for completed
);

-- 3. Audit Committee - Year-End Review
INSERT INTO calendar_events (
    id, title, description, event_type,
    start_time, end_time,
    location, virtual_meeting_url, meeting_platform,
    organization_id, created_by, visibility, priority,
    agenda_items, tags, color_code
) VALUES (
    gen_random_uuid(),
    'Audit Committee - Year-End Review',
    'Year-end audit committee meeting with external auditors. Review of financial statements, internal controls, and audit findings.',
    'committee-meeting',
    NOW() + INTERVAL '1 week' + INTERVAL '10 hours', -- Next week at 10 AM
    NOW() + INTERVAL '1 week' + INTERVAL '12 hours 30 minutes', -- 2.5 hours
    'Corporate Office - Conference Room B',
    'https://webex.com/meet/audit-committee-2024',
    'webex',
    '057be307-34fd-4f9a-89f0-b52e9f4d9d48',
    '12345678-1234-5678-9012-123456789012',
    'organization',
    'high',
    ARRAY[
        'External Auditor Presentation',
        'Financial Statements Review',
        'Internal Controls Assessment',
        'Audit Findings and Management Response',
        'Risk Management Framework Update',
        'Compliance and Regulatory Updates',
        'Next Year Audit Planning'
    ],
    ARRAY['audit', 'committee', 'year-end', 'compliance'],
    '#dc2626' -- Red for high priority
);

-- 4. Cybersecurity Training for Directors
INSERT INTO calendar_events (
    id, title, description, event_type,
    start_time, end_time,
    location, virtual_meeting_url, meeting_platform,
    organization_id, created_by, visibility, max_attendees,
    agenda_items, preparation_materials, tags, color_code
) VALUES (
    gen_random_uuid(),
    'Cybersecurity Governance Training for Directors',
    'Comprehensive training on cybersecurity governance, risk management frameworks, and board oversight responsibilities in the digital age.',
    'training',
    NOW() + INTERVAL '2 weeks' + INTERVAL '9 hours', -- Two weeks from now
    NOW() + INTERVAL '2 weeks' + INTERVAL '17 hours', -- Full day training
    'Corporate Training Center - Main Auditorium',
    'https://zoom.us/j/cybersecurity-training-2024',
    'zoom',
    '057be307-34fd-4f9a-89f0-b52e9f4d9d48',
    '12345678-1234-5678-9012-123456789012',
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
        'https://training.cybersecurity.gov/governance-framework.pdf',
        'https://nist.gov/cybersecurity/risk-management-framework',
        'https://boardtrainingcenter.com/cyber-governance-guide'
    ],
    ARRAY['training', 'cybersecurity', 'governance', 'full-day'],
    '#7c3aed' -- Purple for training
);

-- 5. National Corporate Governance Conference 2024
INSERT INTO calendar_events (
    id, title, description, event_type,
    start_time, end_time,
    location, virtual_meeting_url, meeting_platform,
    organization_id, created_by, visibility, all_day,
    tags, color_code, preparation_materials
) VALUES (
    gen_random_uuid(),
    'National Corporate Governance Conference 2024',
    'Premier annual conference for board directors and corporate governance professionals. Three-day event featuring keynote speakers, breakout sessions, and networking opportunities.',
    'conference',
    NOW() + INTERVAL '3 weeks', -- Three weeks from now
    NOW() + INTERVAL '3 weeks' + INTERVAL '3 days', -- 3-day event
    'Grand Convention Center, Washington DC',
    'https://governanceconf2024.com/virtual-access',
    'hybrid',
    '057be307-34fd-4f9a-89f0-b52e9f4d9d48',
    '12345678-1234-5678-9012-123456789012',
    'organization',
    true,
    ARRAY['conference', 'governance', 'networking', 'external', '3-day'],
    '#f59e0b', -- Amber for conferences
    ARRAY[
        'https://governanceconf2024.com/agenda',
        'https://governanceconf2024.com/speakers',
        'https://governanceconf2024.com/networking-guide'
    ]
);

-- 6. Annual Report Filing Deadline
INSERT INTO calendar_events (
    id, title, description, event_type,
    start_time, end_time,
    organization_id, created_by, priority, all_day,
    tags, color_code, reminder_times
) VALUES (
    gen_random_uuid(),
    'Annual Report Filing Deadline - SEC Form 10-K',
    'Mandatory deadline for filing Annual Report (Form 10-K) with the Securities and Exchange Commission. All required documentation must be submitted by end of business day.',
    'deadline',
    NOW() + INTERVAL '6 weeks', -- 6 weeks from now
    NOW() + INTERVAL '6 weeks' + INTERVAL '23 hours 59 minutes',
    '057be307-34fd-4f9a-89f0-b52e9f4d9d48',
    '12345678-1234-5678-9012-123456789012',
    'urgent',
    true,
    ARRAY['deadline', 'sec', 'filing', 'annual-report', 'urgent'],
    '#dc2626', -- Red for urgent deadline
    ARRAY[10080, 2880, 1440, 360, 60] -- 1 week, 2 days, 1 day, 6 hours, 1 hour before
);

-- 7. Executive Team Weekly Sync (Recurring)
INSERT INTO calendar_events (
    id, title, description, event_type,
    start_time, end_time,
    virtual_meeting_url, meeting_platform,
    organization_id, created_by, visibility,
    agenda_items, tags, color_code
) VALUES (
    gen_random_uuid(),
    'Executive Team Weekly Sync',
    'Weekly synchronization meeting for executive team to review key metrics, discuss priorities, and align on strategic initiatives.',
    'meeting',
    DATE_TRUNC('week', NOW()) + INTERVAL '1 day' + INTERVAL '9 hours', -- Next Monday at 9 AM
    DATE_TRUNC('week', NOW()) + INTERVAL '1 day' + INTERVAL '10 hours', -- 1 hour duration
    'https://zoom.us/j/exec-team-weekly-sync',
    'zoom',
    '057be307-34fd-4f9a-89f0-b52e9f4d9d48',
    '12345678-1234-5678-9012-123456789012',
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

-- 8. Annual Board Retreat 2025
INSERT INTO calendar_events (
    id, title, description, event_type,
    start_time, end_time,
    location, organization_id, created_by, visibility, all_day,
    agenda_items, tags, color_code, preparation_materials
) VALUES (
    gen_random_uuid(),
    'Annual Board Retreat 2025 - Strategic Planning',
    'Two-day annual board retreat combining strategic planning sessions with team building activities. Focus on 2025-2027 strategic roadmap and board effectiveness.',
    'social',
    NOW() + INTERVAL '8 weeks', -- 8 weeks from now
    NOW() + INTERVAL '8 weeks' + INTERVAL '2 days', -- 2-day retreat
    'Mountain View Resort & Conference Center, Colorado',
    '057be307-34fd-4f9a-89f0-b52e9f4d9d48',
    '12345678-1234-5678-9012-123456789012',
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
    ARRAY['retreat', 'strategic-planning', 'team-building', 'annual', '2-day'],
    '#10b981', -- Emerald for social/retreat events
    ARRAY[
        'https://mountainviewresort.com/board-retreat-package',
        'https://boardeffectiveness.com/assessment-2025',
        'https://strategicplanning.com/board-retreat-guide'
    ]
);

-- Create indexes for better performance
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
FROM calendar_events 
WHERE created_by = '12345678-1234-5678-9012-123456789012';