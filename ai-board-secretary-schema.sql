-- AI Board Secretary Database Schema Extensions
-- This file contains the database schema for the AI Board Secretary system

-- Board Meetings table
CREATE TABLE board_meetings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    meeting_title VARCHAR(255) NOT NULL,
    meeting_type VARCHAR(50) DEFAULT 'regular' CHECK (meeting_type IN ('regular', 'special', 'annual', 'emergency')),
    scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
    actual_start_time TIMESTAMP WITH TIME ZONE,
    actual_end_time TIMESTAMP WITH TIME ZONE,
    location TEXT,
    is_virtual BOOLEAN DEFAULT false,
    virtual_meeting_url TEXT,
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'postponed')),
    agenda_id UUID,
    minutes_id UUID,
    recording_url TEXT,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Meeting Agendas table
CREATE TABLE meeting_agendas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    meeting_id UUID NOT NULL REFERENCES board_meetings(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    agenda_items JSONB NOT NULL DEFAULT '[]'::jsonb,
    time_allocations JSONB DEFAULT '{}'::jsonb,
    ai_generated BOOLEAN DEFAULT false,
    ai_generation_metadata JSONB,
    template_used VARCHAR(100),
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'published', 'archived')),
    approved_by UUID,
    approved_at TIMESTAMP WITH TIME ZONE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Meeting Minutes table
CREATE TABLE meeting_minutes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    meeting_id UUID NOT NULL REFERENCES board_meetings(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content JSONB NOT NULL DEFAULT '{}'::jsonb,
    attendees JSONB DEFAULT '[]'::jsonb,
    absentees JSONB DEFAULT '[]'::jsonb,
    decisions JSONB DEFAULT '[]'::jsonb,
    voting_records JSONB DEFAULT '[]'::jsonb,
    resolutions JSONB DEFAULT '[]'::jsonb,
    ai_generated BOOLEAN DEFAULT false,
    ai_processing_metadata JSONB,
    transcription_id UUID,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved', 'published', 'archived')),
    approved_by UUID,
    approved_at TIMESTAMP WITH TIME ZONE,
    secretary_notes TEXT,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Meeting Transcriptions table
CREATE TABLE meeting_transcriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    meeting_id UUID NOT NULL REFERENCES board_meetings(id) ON DELETE CASCADE,
    audio_file_url TEXT,
    video_file_url TEXT,
    transcription_text TEXT,
    speakers JSONB DEFAULT '[]'::jsonb,
    diarization_data JSONB,
    processing_status VARCHAR(20) DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed', 'queued')),
    ai_service_used VARCHAR(50),
    processing_duration_seconds INTEGER,
    error_message TEXT,
    confidence_score DECIMAL(3,2),
    language VARCHAR(10) DEFAULT 'en',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Action Items table
CREATE TABLE action_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    meeting_id UUID REFERENCES board_meetings(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    assigned_to UUID REFERENCES boardmate_profiles(id),
    assigned_by UUID,
    due_date DATE,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'overdue')),
    completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
    ai_extracted BOOLEAN DEFAULT false,
    ai_confidence_score DECIMAL(3,2),
    context_reference TEXT,
    dependencies JSONB DEFAULT '[]'::jsonb,
    progress_notes JSONB DEFAULT '[]'::jsonb,
    completion_date TIMESTAMP WITH TIME ZONE,
    escalation_level INTEGER DEFAULT 0,
    reminders_sent INTEGER DEFAULT 0,
    tags JSONB DEFAULT '[]'::jsonb,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Compliance Requirements table
CREATE TABLE compliance_requirements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    requirement_name VARCHAR(255) NOT NULL,
    requirement_type VARCHAR(50) NOT NULL CHECK (requirement_type IN ('filing', 'meeting', 'reporting', 'governance', 'regulatory')),
    description TEXT,
    regulatory_body VARCHAR(100),
    frequency VARCHAR(50) CHECK (frequency IN ('daily', 'weekly', 'monthly', 'quarterly', 'semi_annually', 'annually', 'one_time')),
    next_due_date DATE,
    days_notice_required INTEGER DEFAULT 30,
    responsible_party UUID REFERENCES boardmate_profiles(id),
    is_mandatory BOOLEAN DEFAULT true,
    penalty_description TEXT,
    reference_documents JSONB DEFAULT '[]'::jsonb,
    last_completed DATE,
    completion_status VARCHAR(20) DEFAULT 'pending' CHECK (completion_status IN ('pending', 'in_progress', 'completed', 'overdue', 'waived')),
    ai_monitored BOOLEAN DEFAULT true,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Compliance Alerts table
CREATE TABLE compliance_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    compliance_requirement_id UUID NOT NULL REFERENCES compliance_requirements(id) ON DELETE CASCADE,
    alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN ('upcoming_deadline', 'overdue', 'regulatory_change', 'frequency_violation', 'director_qualification')),
    alert_title VARCHAR(255) NOT NULL,
    alert_message TEXT NOT NULL,
    severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    target_audience JSONB DEFAULT '[]'::jsonb, -- Array of user IDs or roles
    alert_date TIMESTAMP WITH TIME ZONE NOT NULL,
    is_read BOOLEAN DEFAULT false,
    is_dismissed BOOLEAN DEFAULT false,
    action_required BOOLEAN DEFAULT true,
    auto_generated BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb,
    read_by JSONB DEFAULT '[]'::jsonb,
    dismissed_by UUID,
    dismissed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Meeting Templates table
CREATE TABLE meeting_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
    template_name VARCHAR(255) NOT NULL,
    template_type VARCHAR(50) NOT NULL CHECK (template_type IN ('agenda', 'minutes', 'resolution', 'notice')),
    template_content JSONB NOT NULL,
    default_time_allocations JSONB DEFAULT '{}'::jsonb,
    is_default BOOLEAN DEFAULT false,
    usage_count INTEGER DEFAULT 0,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI Processing Jobs table
CREATE TABLE ai_processing_jobs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_type VARCHAR(50) NOT NULL CHECK (job_type IN ('transcription', 'minutes_generation', 'action_extraction', 'agenda_generation', 'compliance_check')),
    status VARCHAR(20) DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')),
    reference_id UUID NOT NULL, -- Could reference meeting, transcription, etc.
    reference_type VARCHAR(50) NOT NULL,
    ai_service_used VARCHAR(50),
    input_data JSONB,
    output_data JSONB,
    processing_metadata JSONB DEFAULT '{}'::jsonb,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    priority INTEGER DEFAULT 5, -- 1 = highest, 10 = lowest
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Board Secretary Settings table
CREATE TABLE board_secretary_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    ai_transcription_enabled BOOLEAN DEFAULT true,
    auto_agenda_generation BOOLEAN DEFAULT true,
    auto_minutes_generation BOOLEAN DEFAULT true,
    auto_action_extraction BOOLEAN DEFAULT true,
    compliance_monitoring_enabled BOOLEAN DEFAULT true,
    notification_preferences JSONB DEFAULT '{}'::jsonb,
    ai_model_preferences JSONB DEFAULT '{}'::jsonb,
    language_preference VARCHAR(10) DEFAULT 'en',
    timezone VARCHAR(50) DEFAULT 'UTC',
    secretary_signature TEXT,
    document_templates JSONB DEFAULT '{}'::jsonb,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(board_id)
);

-- Indexes for performance
CREATE INDEX idx_board_meetings_board_id ON board_meetings(board_id);
CREATE INDEX idx_board_meetings_scheduled_date ON board_meetings(scheduled_date);
CREATE INDEX idx_board_meetings_status ON board_meetings(status);

CREATE INDEX idx_meeting_agendas_meeting_id ON meeting_agendas(meeting_id);
CREATE INDEX idx_meeting_agendas_status ON meeting_agendas(status);

CREATE INDEX idx_meeting_minutes_meeting_id ON meeting_minutes(meeting_id);
CREATE INDEX idx_meeting_minutes_status ON meeting_minutes(status);

CREATE INDEX idx_meeting_transcriptions_meeting_id ON meeting_transcriptions(meeting_id);
CREATE INDEX idx_meeting_transcriptions_status ON meeting_transcriptions(processing_status);

CREATE INDEX idx_action_items_meeting_id ON action_items(meeting_id);
CREATE INDEX idx_action_items_assigned_to ON action_items(assigned_to);
CREATE INDEX idx_action_items_status ON action_items(status);
CREATE INDEX idx_action_items_due_date ON action_items(due_date);

CREATE INDEX idx_compliance_requirements_board_id ON compliance_requirements(board_id);
CREATE INDEX idx_compliance_requirements_due_date ON compliance_requirements(next_due_date);
CREATE INDEX idx_compliance_requirements_status ON compliance_requirements(completion_status);

CREATE INDEX idx_compliance_alerts_requirement_id ON compliance_alerts(compliance_requirement_id);
CREATE INDEX idx_compliance_alerts_alert_date ON compliance_alerts(alert_date);
CREATE INDEX idx_compliance_alerts_severity ON compliance_alerts(severity);
CREATE INDEX idx_compliance_alerts_read ON compliance_alerts(is_read);

CREATE INDEX idx_ai_processing_jobs_status ON ai_processing_jobs(status);
CREATE INDEX idx_ai_processing_jobs_type ON ai_processing_jobs(job_type);
CREATE INDEX idx_ai_processing_jobs_reference ON ai_processing_jobs(reference_id, reference_type);
CREATE INDEX idx_ai_processing_jobs_priority ON ai_processing_jobs(priority);

-- Add foreign key constraints for user references (assuming users table exists)
-- These will need to be adjusted based on your actual user table structure
ALTER TABLE board_meetings ADD CONSTRAINT fk_board_meetings_created_by 
    FOREIGN KEY (created_by) REFERENCES auth.users(id);

ALTER TABLE meeting_agendas ADD CONSTRAINT fk_meeting_agendas_created_by 
    FOREIGN KEY (created_by) REFERENCES auth.users(id);

ALTER TABLE meeting_agendas ADD CONSTRAINT fk_meeting_agendas_approved_by 
    FOREIGN KEY (approved_by) REFERENCES auth.users(id);

ALTER TABLE meeting_minutes ADD CONSTRAINT fk_meeting_minutes_created_by 
    FOREIGN KEY (created_by) REFERENCES auth.users(id);

ALTER TABLE meeting_minutes ADD CONSTRAINT fk_meeting_minutes_approved_by 
    FOREIGN KEY (approved_by) REFERENCES auth.users(id);

ALTER TABLE action_items ADD CONSTRAINT fk_action_items_created_by 
    FOREIGN KEY (created_by) REFERENCES auth.users(id);

ALTER TABLE action_items ADD CONSTRAINT fk_action_items_assigned_by 
    FOREIGN KEY (assigned_by) REFERENCES auth.users(id);

ALTER TABLE compliance_requirements ADD CONSTRAINT fk_compliance_requirements_created_by 
    FOREIGN KEY (created_by) REFERENCES auth.users(id);

ALTER TABLE compliance_alerts ADD CONSTRAINT fk_compliance_alerts_dismissed_by 
    FOREIGN KEY (dismissed_by) REFERENCES auth.users(id);

ALTER TABLE meeting_templates ADD CONSTRAINT fk_meeting_templates_created_by 
    FOREIGN KEY (created_by) REFERENCES auth.users(id);

ALTER TABLE ai_processing_jobs ADD CONSTRAINT fk_ai_processing_jobs_created_by 
    FOREIGN KEY (created_by) REFERENCES auth.users(id);

ALTER TABLE board_secretary_settings ADD CONSTRAINT fk_board_secretary_settings_created_by 
    FOREIGN KEY (created_by) REFERENCES auth.users(id);

-- Set up foreign key reference from agendas to meetings
ALTER TABLE meeting_agendas ADD CONSTRAINT fk_meeting_agendas_meeting_id 
    FOREIGN KEY (meeting_id) REFERENCES board_meetings(id) ON DELETE CASCADE;

-- Set up cross-reference from meetings to agendas and minutes
ALTER TABLE board_meetings ADD CONSTRAINT fk_board_meetings_agenda_id 
    FOREIGN KEY (agenda_id) REFERENCES meeting_agendas(id);

ALTER TABLE board_meetings ADD CONSTRAINT fk_board_meetings_minutes_id 
    FOREIGN KEY (minutes_id) REFERENCES meeting_minutes(id);

-- Set up reference from minutes to transcription
ALTER TABLE meeting_minutes ADD CONSTRAINT fk_meeting_minutes_transcription_id 
    FOREIGN KEY (transcription_id) REFERENCES meeting_transcriptions(id);