# 🗄️ **Database Setup Instructions for New Features**

This guide will help you set up the required database tables, RLS policies, and synthetic data for the new voice collaboration, audit logging, and smart sharing features.

## 📋 **Prerequisites**

1. Access to Supabase SQL Editor
2. Admin privileges on your Supabase project
3. Current database schema understanding

## 🚀 **Step-by-Step Setup**

### **Step 1: Create Voice Collaboration Tables**

Run these SQL queries in Supabase SQL Editor:

```sql
-- =============================================
-- VOICE COLLABORATION TABLES
-- =============================================

-- Voice Sessions Table
CREATE TABLE IF NOT EXISTS voice_sessions (
    id TEXT PRIMARY KEY,
    host_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    collaboration_type TEXT NOT NULL CHECK (collaboration_type IN ('brainstorming', 'presentation', 'discussion', 'review')),
    spatial_audio_config JSONB NOT NULL DEFAULT '{}',
    permissions JSONB NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'ended', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Voice Participants Table
CREATE TABLE IF NOT EXISTS voice_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL REFERENCES voice_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'participant' CHECK (role IN ('host', 'presenter', 'participant')),
    spatial_position JSONB,
    audio_settings JSONB NOT NULL DEFAULT '{"muted": false, "volume": 100, "spatial_audio_enabled": true}',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    left_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(session_id, user_id)
);

-- Voice Session Analytics Table
CREATE TABLE IF NOT EXISTS voice_session_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL REFERENCES voice_sessions(id) ON DELETE CASCADE,
    total_duration INTEGER, -- in minutes
    participant_count INTEGER,
    peak_participants INTEGER,
    engagement_metrics JSONB,
    technical_metrics JSONB,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### **Step 2: Create Audit Logging Tables**

```sql
-- =============================================
-- AUDIT LOGGING TABLES
-- =============================================

-- Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    old_values JSONB,
    new_values JSONB,
    metadata JSONB,
    ip_address INET,
    user_agent TEXT,
    severity TEXT NOT NULL DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    category TEXT NOT NULL DEFAULT 'data' CHECK (category IN ('auth', 'data', 'system', 'security', 'compliance')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_organization_id ON audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON audit_logs(severity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_category ON audit_logs(category);
```

### **Step 3: Create Smart Sharing Tables**

```sql
-- =============================================
-- SMART SHARING TABLES  
-- =============================================

-- Smart Sharing Rules Table
CREATE TABLE IF NOT EXISTS smart_sharing_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    conditions JSONB NOT NULL DEFAULT '{}',
    actions JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    priority INTEGER NOT NULL DEFAULT 1,
    trigger_count INTEGER NOT NULL DEFAULT 0,
    last_triggered TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Smart Sharing Rule Executions (for tracking)
CREATE TABLE IF NOT EXISTS smart_sharing_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID NOT NULL REFERENCES smart_sharing_rules(id) ON DELETE CASCADE,
    asset_id UUID, -- Reference to asset that triggered the rule
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    execution_result JSONB,
    success BOOLEAN NOT NULL DEFAULT false
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_smart_sharing_rules_user_id ON smart_sharing_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_smart_sharing_rules_organization_id ON smart_sharing_rules(organization_id);
CREATE INDEX IF NOT EXISTS idx_smart_sharing_rules_is_active ON smart_sharing_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_smart_sharing_rules_priority ON smart_sharing_rules(priority);
```

### **Step 4: Create Enhanced Calendar Tables**

```sql
-- =============================================
-- ENHANCED CALENDAR TABLES
-- =============================================

-- Enhanced Calendar Events (if not exists)
CREATE TABLE IF NOT EXISTS calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    location TEXT,
    event_type TEXT NOT NULL DEFAULT 'meeting' CHECK (event_type IN ('meeting', 'deadline', 'reminder', 'holiday', 'conference')),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'tentative', 'cancelled')),
    is_all_day BOOLEAN NOT NULL DEFAULT false,
    is_recurring BOOLEAN NOT NULL DEFAULT false,
    recurrence_pattern JSONB,
    timezone TEXT DEFAULT 'UTC',
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Calendar Event Attendees
CREATE TABLE IF NOT EXISTS calendar_event_attendees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'maybe')),
    response_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    UNIQUE(event_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_end_time ON calendar_events(end_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_organization_id ON calendar_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_created_by ON calendar_events(created_by);
```

### **Step 5: Create Compliance Workflow Tables**

```sql
-- =============================================
-- COMPLIANCE WORKFLOW TABLES
-- =============================================

-- Compliance Workflows
CREATE TABLE IF NOT EXISTS compliance_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    template_id TEXT,
    assignee_id UUID REFERENCES users(id) ON DELETE SET NULL,
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    due_date TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    context JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Compliance Workflow Steps
CREATE TABLE IF NOT EXISTS compliance_workflow_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES compliance_workflows(id) ON DELETE CASCADE,
    step_id TEXT NOT NULL, -- Internal step identifier
    name TEXT NOT NULL,
    description TEXT,
    required BOOLEAN NOT NULL DEFAULT true,
    assignee_id UUID REFERENCES users(id) ON DELETE SET NULL,
    estimated_duration_minutes INTEGER,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
    completed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    completion_notes TEXT,
    attachments JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(workflow_id, step_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_compliance_workflows_organization_id ON compliance_workflows(organization_id);
CREATE INDEX IF NOT EXISTS idx_compliance_workflows_status ON compliance_workflows(status);
CREATE INDEX IF NOT EXISTS idx_compliance_workflow_steps_workflow_id ON compliance_workflow_steps(workflow_id);
```

### **Step 6: Create Row Level Security (RLS) Policies**

```sql
-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE voice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_session_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE smart_sharing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE smart_sharing_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_event_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_workflow_steps ENABLE ROW LEVEL SECURITY;

-- Voice Sessions Policies
CREATE POLICY "Users can view their own voice sessions" ON voice_sessions
    FOR SELECT USING (host_user_id = auth.uid() OR id IN (
        SELECT session_id FROM voice_participants WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can create voice sessions" ON voice_sessions
    FOR INSERT WITH CHECK (host_user_id = auth.uid());

CREATE POLICY "Host can update their sessions" ON voice_sessions
    FOR UPDATE USING (host_user_id = auth.uid());

-- Voice Participants Policies
CREATE POLICY "Users can view participants of their sessions" ON voice_participants
    FOR SELECT USING (session_id IN (
        SELECT id FROM voice_sessions 
        WHERE host_user_id = auth.uid() OR id IN (
            SELECT session_id FROM voice_participants WHERE user_id = auth.uid()
        )
    ));

CREATE POLICY "Host can manage participants" ON voice_participants
    FOR ALL USING (session_id IN (
        SELECT id FROM voice_sessions WHERE host_user_id = auth.uid()
    ));

-- Audit Logs Policies (Users can only see their own actions)
CREATE POLICY "Users can view their own audit logs" ON audit_logs
    FOR SELECT USING (user_id = auth.uid());

-- Smart Sharing Rules Policies
CREATE POLICY "Users can manage their own sharing rules" ON smart_sharing_rules
    FOR ALL USING (user_id = auth.uid());

-- Calendar Events Policies
CREATE POLICY "Users can view events they created or are attending" ON calendar_events
    FOR SELECT USING (
        created_by = auth.uid() OR 
        id IN (SELECT event_id FROM calendar_event_attendees WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can create calendar events" ON calendar_events
    FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Event creators can update their events" ON calendar_events
    FOR UPDATE USING (created_by = auth.uid());

-- Calendar Event Attendees Policies
CREATE POLICY "Users can view attendees of their events" ON calendar_event_attendees
    FOR SELECT USING (
        user_id = auth.uid() OR 
        event_id IN (SELECT id FROM calendar_events WHERE created_by = auth.uid())
    );

-- Compliance Workflow Policies
CREATE POLICY "Organization members can view workflows" ON compliance_workflows
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Assignees can update workflow steps" ON compliance_workflow_steps
    FOR UPDATE USING (assignee_id = auth.uid());
```

### **Step 7: Create Test User Account**

```sql
-- =============================================
-- CREATE TEST USER ACCOUNT
-- =============================================

-- Insert test user (if not exists)
-- Note: You'll need to create this user through Supabase Auth first,
-- then update the profile information

-- First, get the user ID for test.director (assuming it exists in auth.users)
-- Replace 'USER_ID_HERE' with the actual UUID from auth.users table

-- Update or insert user profile
INSERT INTO users (id, email, first_name, last_name, designation, created_at, updated_at, is_active, email_verified)
VALUES (
    'USER_ID_HERE', -- Replace with actual user ID from auth.users
    'test.director@boardguru.com',
    'Test',
    'Director', 
    'Board Director',
    NOW(),
    NOW(),
    true,
    true
) ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    designation = EXCLUDED.designation,
    updated_at = NOW();

-- Create test organization
INSERT INTO organizations (id, name, slug, description, created_at, updated_at)
VALUES (
    'test-org-12345678-1234-1234-1234-123456789012',
    'Test Board Organization',
    'test-board-org',
    'Organization for testing new features',
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;
```

### **Step 8: Generate Synthetic Data**

```sql
-- =============================================
-- SYNTHETIC TEST DATA GENERATION
-- =============================================

-- Voice Sessions Test Data
INSERT INTO voice_sessions (id, host_user_id, name, description, collaboration_type, spatial_audio_config, permissions, status, created_at) VALUES
('vs_test_001', 'USER_ID_HERE', 'Q4 Board Meeting Voice Session', 'Voice collaboration for quarterly board meeting', 'presentation', '{"enabled": true, "room_size": "large", "acoustics": "conference"}', '{"allow_screen_share": true, "allow_file_share": true, "allow_recording": true, "participant_limit": 15}', 'ended', NOW() - INTERVAL '2 days'),
('vs_test_002', 'USER_ID_HERE', 'Strategic Planning Brainstorm', 'Collaborative brainstorming session for 2025 strategy', 'brainstorming', '{"enabled": true, "room_size": "medium", "acoustics": "open_space"}', '{"allow_screen_share": true, "allow_file_share": false, "allow_recording": false, "participant_limit": 8}', 'active', NOW() - INTERVAL '1 hour'),
('vs_test_003', 'USER_ID_HERE', 'Budget Review Discussion', 'Discussion of proposed budget allocations', 'discussion', '{"enabled": false, "room_size": "small", "acoustics": "studio"}', '{"allow_screen_share": false, "allow_file_share": true, "allow_recording": true, "participant_limit": 5}', 'scheduled', NOW() + INTERVAL '2 days'),
('vs_test_004', 'USER_ID_HERE', 'Compliance Review Meeting', 'Review of compliance documentation', 'review', '{"enabled": true, "room_size": "medium", "acoustics": "conference"}', '{"allow_screen_share": true, "allow_file_share": true, "allow_recording": true, "participant_limit": 10}', 'ended', NOW() - INTERVAL '1 week'),
('vs_test_005', 'USER_ID_HERE', 'Innovation Workshop', 'Workshop on innovation initiatives', 'brainstorming', '{"enabled": true, "room_size": "large", "acoustics": "open_space"}', '{"allow_screen_share": true, "allow_file_share": false, "allow_recording": false, "participant_limit": 20}', 'cancelled', NOW() - INTERVAL '3 days');

-- Voice Participants Test Data
INSERT INTO voice_participants (session_id, user_id, role, spatial_position, audio_settings, joined_at, left_at) VALUES
('vs_test_001', 'USER_ID_HERE', 'host', '{"x": 0, "y": 0, "z": 0}', '{"muted": false, "volume": 100, "spatial_audio_enabled": true}', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '2 hours'),
('vs_test_002', 'USER_ID_HERE', 'host', '{"x": 0, "y": 0, "z": 0}', '{"muted": false, "volume": 90, "spatial_audio_enabled": true}', NOW() - INTERVAL '1 hour', NULL),
('vs_test_004', 'USER_ID_HERE', 'presenter', '{"x": 5, "y": 0, "z": 1}', '{"muted": false, "volume": 95, "spatial_audio_enabled": true}', NOW() - INTERVAL '1 week', NOW() - INTERVAL '1 week' + INTERVAL '90 minutes');

-- Audit Logs Test Data  
INSERT INTO audit_logs (user_id, organization_id, action, resource_type, resource_id, metadata, severity, category, created_at) VALUES
('USER_ID_HERE', 'test-org-12345678-1234-1234-1234-123456789012', 'CREATE_VOICE_SESSION', 'voice_session', 'vs_test_001', '{"session_type": "presentation", "participant_limit": 15}', 'medium', 'system', NOW() - INTERVAL '2 days'),
('USER_ID_HERE', 'test-org-12345678-1234-1234-1234-123456789012', 'LOGIN_SUCCESS', 'user', 'USER_ID_HERE', '{"ip_address": "192.168.1.100", "device": "desktop"}', 'low', 'auth', NOW() - INTERVAL '1 day'),
('USER_ID_HERE', 'test-org-12345678-1234-1234-1234-123456789012', 'CREATE_SMART_SHARING_RULE', 'smart_sharing_rule', 'rule_test_001', '{"rule_name": "Board Document Auto-Share", "priority": 10}', 'medium', 'data', NOW() - INTERVAL '3 hours'),
('USER_ID_HERE', 'test-org-12345678-1234-1234-1234-123456789012', 'UPLOAD_ASSET', 'asset', 'asset_test_001', '{"file_type": "pdf", "file_size": 2048576, "security_level": "confidential"}', 'high', 'data', NOW() - INTERVAL '5 hours'),
('USER_ID_HERE', 'test-org-12345678-1234-1234-1234-123456789012', 'END_VOICE_SESSION', 'voice_session', 'vs_test_004', '{"duration_minutes": 90, "participants": 3}', 'low', 'system', NOW() - INTERVAL '1 week'),
('USER_ID_HERE', 'test-org-12345678-1234-1234-1234-123456789012', 'CREATE_CALENDAR_EVENT', 'calendar_event', 'event_test_001', '{"event_type": "board_meeting", "attendees": 5}', 'medium', 'data', NOW() - INTERVAL '2 hours'),
('USER_ID_HERE', 'test-org-12345678-1234-1234-1234-123456789012', 'COMPLETE_COMPLIANCE_STEP', 'compliance_step', 'step_test_001', '{"workflow_id": "workflow_001", "step_name": "Document Review"}', 'medium', 'compliance', NOW() - INTERVAL '6 hours'),
('USER_ID_HERE', 'test-org-12345678-1234-1234-1234-123456789012', 'TRIGGER_SMART_SHARING', 'smart_sharing_execution', 'exec_test_001', '{"rule_id": "rule_test_001", "shared_with": ["board@test.com"]}', 'low', 'system', NOW() - INTERVAL '4 hours'),
('USER_ID_HERE', 'test-org-12345678-1234-1234-1234-123456789012', 'UPDATE_USER_PREFERENCES', 'user', 'USER_ID_HERE', '{"theme": "dark", "notifications_enabled": true}', 'low', 'data', NOW() - INTERVAL '8 hours'),
('USER_ID_HERE', 'test-org-12345678-1234-1234-1234-123456789012', 'GENERATE_ANALYTICS', 'voice_session_analytics', 'analytics_001', '{"session_id": "vs_test_001", "engagement_score": 85}', 'low', 'system', NOW() - INTERVAL '1 day');

-- Smart Sharing Rules Test Data
INSERT INTO smart_sharing_rules (user_id, organization_id, name, description, conditions, actions, is_active, priority, trigger_count, last_triggered, created_at) VALUES
('USER_ID_HERE', 'test-org-12345678-1234-1234-1234-123456789012', 'Board Document Auto-Share', 'Automatically share board meeting documents with all board members', '{"file_types": ["pdf", "docx", "xlsx"], "content_keywords": ["board", "meeting", "quarterly"], "security_classification": ["confidential"], "file_size_limit": 10485760}', '{"auto_share_with": ["board@test.com", "directors@test.com"], "notification_recipients": ["secretary@test.com"], "apply_tags": ["board-meeting", "auto-shared"], "set_permissions": {"can_view": true, "can_download": false, "can_share": false}}', true, 10, 15, NOW() - INTERVAL '4 hours', NOW() - INTERVAL '1 week'),
('USER_ID_HERE', 'test-org-12345678-1234-1234-1234-123456789012', 'Financial Reports Distribution', 'Auto-distribute financial reports to audit committee', '{"file_types": ["xlsx", "pdf"], "content_keywords": ["financial", "budget", "revenue"], "author_patterns": ["finance@*"]}', '{"auto_share_with": ["audit-committee@test.com"], "apply_tags": ["financial", "audit"], "set_permissions": {"can_view": true, "can_download": true, "can_share": false}}', true, 8, 7, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 weeks'),
('USER_ID_HERE', 'test-org-12345678-1234-1234-1234-123456789012', 'Legal Document Review', 'Route legal documents for review', '{"file_types": ["pdf", "docx"], "content_keywords": ["legal", "contract", "agreement"]}', '{"auto_share_with": ["legal@test.com"], "notification_recipients": ["legal@test.com"], "apply_tags": ["legal", "review-required"]}', true, 9, 3, NOW() - INTERVAL '1 day', NOW() - INTERVAL '10 days'),
('USER_ID_HERE', 'test-org-12345678-1234-1234-1234-123456789012', 'Compliance Documentation', 'Ensure compliance docs reach compliance team', '{"file_types": ["pdf"], "content_keywords": ["compliance", "regulatory", "audit"], "security_classification": ["internal", "confidential"]}', '{"auto_share_with": ["compliance@test.com"], "apply_tags": ["compliance", "regulatory"]}', true, 7, 12, NOW() - INTERVAL '6 hours', NOW() - INTERVAL '5 days'),
('USER_ID_HERE', 'test-org-12345678-1234-1234-1234-123456789012', 'Meeting Minutes Distribution', 'Distribute meeting minutes to attendees', '{"file_types": ["pdf", "docx"], "content_keywords": ["minutes", "meeting"], "file_size_limit": 5242880}', '{"auto_share_with": ["attendees"], "apply_tags": ["meeting-minutes", "distributed"]}', false, 5, 0, NULL, NOW() - INTERVAL '3 days');

-- Calendar Events Test Data
INSERT INTO calendar_events (title, description, start_time, end_time, location, event_type, organization_id, created_by, status, metadata, created_at) VALUES
('Q4 2024 Board Meeting', 'Quarterly board meeting to review financials and strategic initiatives', NOW() + INTERVAL '1 week', NOW() + INTERVAL '1 week' + INTERVAL '4 hours', 'Board Room A / Virtual Hybrid', 'meeting', 'test-org-12345678-1234-1234-1234-123456789012', 'USER_ID_HERE', 'confirmed', '{"meeting_type": "board_meeting", "requires_quorum": true, "voting_items": ["budget_approval"]}', NOW() - INTERVAL '2 weeks'),
('Strategic Planning Workshop', 'Annual strategic planning workshop for 2025', NOW() + INTERVAL '2 weeks', NOW() + INTERVAL '2 weeks' + INTERVAL '6 hours', 'Conference Center', 'meeting', 'test-org-12345678-1234-1234-1234-123456789012', 'USER_ID_HERE', 'confirmed', '{"workshop_type": "strategic_planning", "facilitator": "external"}', NOW() - INTERVAL '10 days'),
('Audit Committee Meeting', 'Monthly audit committee meeting', NOW() + INTERVAL '3 days', NOW() + INTERVAL '3 days' + INTERVAL '2 hours', 'Virtual', 'meeting', 'test-org-12345678-1234-1234-1234-123456789012', 'USER_ID_HERE', 'confirmed', '{"committee": "audit", "confidential": true}', NOW() - INTERVAL '1 week'),
('Budget Deadline', 'Deadline for department budget submissions', NOW() + INTERVAL '5 days', NOW() + INTERVAL '5 days' + INTERVAL '1 hour', null, 'deadline', 'test-org-12345678-1234-1234-1234-123456789012', 'USER_ID_HERE', 'confirmed', '{"deadline_type": "budget_submission"}', NOW() - INTERVAL '1 month'),
('Compliance Training', 'Mandatory compliance training for board members', NOW() + INTERVAL '10 days', NOW() + INTERVAL '10 days' + INTERVAL '3 hours', 'Training Room B', 'meeting', 'test-org-12345678-1234-1234-1234-123456789012', 'USER_ID_HERE', 'tentative', '{"training_type": "compliance", "mandatory": true}', NOW() - INTERVAL '5 days');

-- Calendar Event Attendees Test Data
INSERT INTO calendar_event_attendees (event_id, user_id, status, response_at) VALUES
((SELECT id FROM calendar_events WHERE title = 'Q4 2024 Board Meeting'), 'USER_ID_HERE', 'accepted', NOW() - INTERVAL '1 week'),
((SELECT id FROM calendar_events WHERE title = 'Strategic Planning Workshop'), 'USER_ID_HERE', 'accepted', NOW() - INTERVAL '8 days'),
((SELECT id FROM calendar_events WHERE title = 'Audit Committee Meeting'), 'USER_ID_HERE', 'accepted', NOW() - INTERVAL '5 days'),
((SELECT id FROM calendar_events WHERE title = 'Budget Deadline'), 'USER_ID_HERE', 'accepted', NOW() - INTERVAL '3 weeks'),
((SELECT id FROM calendar_events WHERE title = 'Compliance Training'), 'USER_ID_HERE', 'maybe', NULL);

-- Compliance Workflows Test Data
INSERT INTO compliance_workflows (name, description, organization_id, assignee_id, priority, status, due_date, context, created_at) VALUES
('Board Meeting Compliance Checklist', 'Ensure all regulatory requirements for board meetings', 'test-org-12345678-1234-1234-1234-123456789012', 'USER_ID_HERE', 'high', 'active', NOW() + INTERVAL '5 days', '{"meeting_id": "board_meeting_001", "regulations": ["SOX", "SEC"]}', NOW() - INTERVAL '2 days'),
('Document Retention Review', 'Annual review of document retention policies', 'test-org-12345678-1234-1234-1234-123456789012', 'USER_ID_HERE', 'medium', 'completed', NOW() - INTERVAL '1 week', '{"review_year": 2024}', NOW() - INTERVAL '1 month'),
('Financial Audit Preparation', 'Prepare materials for external audit', 'test-org-12345678-1234-1234-1234-123456789012', 'USER_ID_HERE', 'critical', 'active', NOW() + INTERVAL '2 weeks', '{"auditor": "External Audit Firm", "scope": "financial"}', NOW() - INTERVAL '3 days'),
('Privacy Policy Update', 'Update privacy policy for new regulations', 'test-org-12345678-1234-1234-1234-123456789012', 'USER_ID_HERE', 'medium', 'active', NOW() + INTERVAL '1 month', '{"regulations": ["GDPR", "CCPA"]}', NOW() - INTERVAL '1 week'),
('Risk Assessment Review', 'Quarterly risk assessment review', 'test-org-12345678-1234-1234-1234-123456789012', 'USER_ID_HERE', 'high', 'completed', NOW() - INTERVAL '2 weeks', '{"quarter": "Q4_2024"}', NOW() - INTERVAL '1 month');

-- Compliance Workflow Steps Test Data
INSERT INTO compliance_workflow_steps (workflow_id, step_id, name, description, assignee_id, estimated_duration_minutes, status, completed_by, completed_at, completion_notes) VALUES
((SELECT id FROM compliance_workflows WHERE name = 'Board Meeting Compliance Checklist'), 'step_1', 'Verify Quorum Requirements', 'Confirm minimum board member attendance', 'USER_ID_HERE', 15, 'completed', 'USER_ID_HERE', NOW() - INTERVAL '1 day', 'Quorum requirements verified - 7 of 9 board members confirmed'),
((SELECT id FROM compliance_workflows WHERE name = 'Board Meeting Compliance Checklist'), 'step_2', 'Review Document Distribution', 'Ensure all required documents distributed 48h in advance', 'USER_ID_HERE', 30, 'completed', 'USER_ID_HERE', NOW() - INTERVAL '1 day', 'All board pack documents distributed on schedule'),
((SELECT id FROM compliance_workflows WHERE name = 'Board Meeting Compliance Checklist'), 'step_3', 'Prepare Meeting Minutes Template', 'Set up official meeting minutes template', 'USER_ID_HERE', 20, 'in_progress', NULL, NULL, NULL),
((SELECT id FROM compliance_workflows WHERE name = 'Financial Audit Preparation'), 'audit_1', 'Gather Financial Statements', 'Collect Q1-Q4 financial statements', 'USER_ID_HERE', 60, 'completed', 'USER_ID_HERE', NOW() - INTERVAL '2 days', 'All quarterly statements collected and reviewed'),
((SELECT id FROM compliance_workflows WHERE name = 'Financial Audit Preparation'), 'audit_2', 'Prepare Supporting Documentation', 'Organize supporting financial documentation', 'USER_ID_HERE', 120, 'pending', NULL, NULL, NULL);

-- Voice Session Analytics Test Data
INSERT INTO voice_session_analytics (session_id, total_duration, participant_count, peak_participants, engagement_metrics, technical_metrics) VALUES
('vs_test_001', 120, 3, 3, '{"speaking_time_distribution": {"USER_ID_HERE": 45, "participant_2": 35, "participant_3": 40}, "interruption_count": 2, "silence_periods": 5, "active_participation_rate": 0.85}', '{"average_audio_quality": 95, "connection_stability": 98, "spatial_audio_usage": true}'),
('vs_test_004', 90, 3, 3, '{"speaking_time_distribution": {"USER_ID_HERE": 30, "participant_2": 35, "participant_3": 25}, "interruption_count": 1, "silence_periods": 3, "active_participation_rate": 0.78}', '{"average_audio_quality": 92, "connection_stability": 96, "spatial_audio_usage": true}');
```

### **Step 9: Update User ID References**

**IMPORTANT:** Before running the synthetic data queries, you need to:

1. Go to Supabase Dashboard → Authentication → Users
2. Find the user with email `test.director@boardguru.com` (or create it if it doesn't exist)
3. Copy the User ID (UUID)
4. Replace all instances of `'USER_ID_HERE'` in the synthetic data queries with the actual UUID

### **Step 10: Verify Setup**

Run this verification query to confirm everything is set up correctly:

```sql
-- =============================================
-- VERIFICATION QUERIES
-- =============================================

-- Check tables exist
SELECT 
    schemaname,
    tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN (
        'voice_sessions', 
        'voice_participants', 
        'audit_logs', 
        'smart_sharing_rules', 
        'calendar_events',
        'compliance_workflows'
    );

-- Check test data counts
SELECT 
    'voice_sessions' as table_name, 
    count(*) as record_count 
FROM voice_sessions
UNION ALL
SELECT 'voice_participants', count(*) FROM voice_participants
UNION ALL  
SELECT 'audit_logs', count(*) FROM audit_logs
UNION ALL
SELECT 'smart_sharing_rules', count(*) FROM smart_sharing_rules
UNION ALL
SELECT 'calendar_events', count(*) FROM calendar_events
UNION ALL
SELECT 'compliance_workflows', count(*) FROM compliance_workflows;

-- Verify test user data
SELECT 
    vs.name,
    vs.collaboration_type,
    vs.status,
    count(vp.id) as participant_count
FROM voice_sessions vs
LEFT JOIN voice_participants vp ON vs.id = vp.session_id
WHERE vs.host_user_id = 'USER_ID_HERE' -- Replace with actual user ID
GROUP BY vs.id, vs.name, vs.collaboration_type, vs.status;
```

## 🎯 **Expected Results**

After completing all steps, you should have:

✅ **5 Voice Sessions** with different collaboration types  
✅ **10 Audit Log entries** covering various actions  
✅ **5 Smart Sharing Rules** with different priorities  
✅ **5 Calendar Events** including meetings and deadlines  
✅ **5 Compliance Workflows** in various states  
✅ **Proper RLS policies** for security  
✅ **Performance indexes** for optimal queries  

## 🔧 **Next Steps**

1. **Run the SQL queries** in the order provided
2. **Replace USER_ID_HERE** with actual test user UUID
3. **Verify the setup** using the verification queries
4. **Test the APIs** using the new test scripts:
   ```bash
   npm run test:new-features:comprehensive
   ```

This will give you a fully functional database setup with realistic test data for validating all the new features!