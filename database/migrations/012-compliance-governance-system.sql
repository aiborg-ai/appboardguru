-- Migration: Compliance & Governance Automation Engine
-- Description: Creates comprehensive compliance workflow system with automated notifications and audit trails

-- UP MIGRATION

-- =============================================
-- COMPLIANCE TEMPLATES SYSTEM
-- =============================================

-- Compliance templates (regulatory frameworks like SOX, GDPR, etc.)
CREATE TABLE IF NOT EXISTS compliance_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Template metadata
    name VARCHAR(255) NOT NULL,
    description TEXT,
    regulation_type VARCHAR(100) NOT NULL, -- 'SOX', 'GDPR', 'BOARD_GOVERNANCE', 'AUDIT', 'RISK_MANAGEMENT', etc.
    category VARCHAR(100) NOT NULL DEFAULT 'general', -- 'financial', 'privacy', 'governance', 'audit', 'risk'
    
    -- Template configuration
    frequency VARCHAR(50) NOT NULL DEFAULT 'annual', -- 'daily', 'weekly', 'monthly', 'quarterly', 'annual', 'ad_hoc'
    priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    
    -- Workflow definition
    workflow_steps JSONB NOT NULL DEFAULT '[]', -- Array of step definitions
    requirements TEXT[], -- Array of requirements/checklist items
    required_roles TEXT[] DEFAULT '{}', -- Roles required to complete this template
    
    -- Notification settings
    reminder_schedule JSONB DEFAULT '{}', -- When to send reminders (days before deadline)
    escalation_rules JSONB DEFAULT '{}', -- Escalation matrix if tasks are overdue
    
    -- Template status
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_system_template BOOLEAN NOT NULL DEFAULT false, -- System-provided vs custom templates
    version INTEGER NOT NULL DEFAULT 1,
    
    -- Audit fields
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(organization_id, name, version)
);

-- Compliance calendar for regulatory deadlines and recurring tasks
CREATE TABLE IF NOT EXISTS compliance_calendar (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    template_id UUID REFERENCES compliance_templates(id) ON DELETE CASCADE,
    
    -- Calendar entry details
    title VARCHAR(255) NOT NULL,
    description TEXT,
    regulation_type VARCHAR(100) NOT NULL,
    category VARCHAR(100) NOT NULL DEFAULT 'general',
    
    -- Deadline information
    due_date DATE NOT NULL,
    start_date DATE, -- When work should begin
    business_days_notice INTEGER DEFAULT 30, -- How many business days before due date to start notifications
    
    -- Recurrence settings
    is_recurring BOOLEAN NOT NULL DEFAULT false,
    recurrence_pattern JSONB, -- Cron-like pattern for recurring deadlines
    next_occurrence DATE, -- Next scheduled occurrence
    
    -- Priority and urgency
    priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    is_mandatory BOOLEAN NOT NULL DEFAULT true,
    regulatory_authority VARCHAR(255), -- Which regulatory body this applies to
    
    -- Status tracking
    status VARCHAR(50) NOT NULL DEFAULT 'scheduled' CHECK (
        status IN ('scheduled', 'active', 'in_progress', 'completed', 'overdue', 'cancelled', 'postponed')
    ),
    completion_date DATE,
    postponed_until DATE,
    
    -- Metadata
    tags TEXT[] DEFAULT '{}',
    external_reference VARCHAR(255), -- Reference to external regulatory requirement
    metadata JSONB DEFAULT '{}',
    
    -- Audit fields
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes for performance
    CHECK (due_date >= CURRENT_DATE OR status IN ('completed', 'cancelled'))
);

-- Notification workflows for multi-step compliance processes
CREATE TABLE IF NOT EXISTS notification_workflows (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    template_id UUID REFERENCES compliance_templates(id) ON DELETE SET NULL,
    calendar_entry_id UUID REFERENCES compliance_calendar(id) ON DELETE CASCADE,
    
    -- Workflow metadata
    name VARCHAR(255) NOT NULL,
    description TEXT,
    workflow_type VARCHAR(50) NOT NULL DEFAULT 'compliance', -- 'compliance', 'governance', 'audit', 'risk'
    
    -- Workflow definition
    steps JSONB NOT NULL DEFAULT '[]', -- Array of workflow steps with conditions
    current_step INTEGER NOT NULL DEFAULT 0, -- Current step index (0-based)
    total_steps INTEGER NOT NULL DEFAULT 1,
    
    -- Status tracking
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'in_progress', 'waiting_approval', 'completed', 'failed', 'cancelled', 'on_hold')
    ),
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    
    -- Timeline
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    due_date TIMESTAMP WITH TIME ZONE,
    estimated_completion_date TIMESTAMP WITH TIME ZONE,
    
    -- Assignment and ownership
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Primary assignee
    assigned_role VARCHAR(100), -- Role-based assignment
    escalated_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    escalation_level INTEGER DEFAULT 0, -- How many times it's been escalated
    
    -- Workflow configuration
    auto_advance_steps BOOLEAN DEFAULT true, -- Automatically move to next step when current completes
    require_all_participants BOOLEAN DEFAULT false, -- All participants must complete vs any participant
    allow_parallel_execution BOOLEAN DEFAULT false, -- Can steps run in parallel
    
    -- Notification settings
    send_reminders BOOLEAN DEFAULT true,
    reminder_frequency_hours INTEGER DEFAULT 24, -- How often to send reminders for overdue tasks
    
    -- Audit and compliance
    compliance_notes TEXT,
    risk_level VARCHAR(20) DEFAULT 'medium' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    
    -- Audit fields
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Participants in compliance workflows
CREATE TABLE IF NOT EXISTS compliance_participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workflow_id UUID NOT NULL REFERENCES notification_workflows(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Participation details
    participant_type VARCHAR(50) NOT NULL DEFAULT 'assignee' CHECK (
        participant_type IN ('assignee', 'approver', 'reviewer', 'observer', 'escalation_contact')
    ),
    role_in_workflow VARCHAR(100), -- Specific role within this workflow
    
    -- Assignment details
    step_number INTEGER, -- Which step this participant is involved in (null = all steps)
    is_required BOOLEAN DEFAULT true, -- Is this participant required for completion
    can_delegate BOOLEAN DEFAULT false, -- Can this participant delegate to others
    
    -- Status tracking
    status VARCHAR(50) NOT NULL DEFAULT 'assigned' CHECK (
        status IN ('assigned', 'in_progress', 'completed', 'declined', 'escalated', 'delegated', 'removed')
    ),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    declined_at TIMESTAMP WITH TIME ZONE,
    
    -- Completion tracking
    completion_notes TEXT,
    completion_evidence_url VARCHAR(500), -- Link to uploaded evidence/documentation
    requires_evidence BOOLEAN DEFAULT false,
    
    -- Delegation
    delegated_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    delegated_at TIMESTAMP WITH TIME ZONE,
    delegation_reason TEXT,
    
    -- Notifications
    last_notified_at TIMESTAMP WITH TIME ZONE,
    notification_count INTEGER DEFAULT 0,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(workflow_id, user_id, step_number)
);

-- Comprehensive audit log for all compliance and notification activities
CREATE TABLE IF NOT EXISTS notification_audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Event identification
    event_type VARCHAR(100) NOT NULL, -- 'workflow_created', 'step_completed', 'notification_sent', 'deadline_missed', etc.
    event_category VARCHAR(50) NOT NULL DEFAULT 'compliance', -- 'compliance', 'governance', 'notification', 'workflow'
    action VARCHAR(100) NOT NULL, -- Specific action taken
    
    -- Related entities
    workflow_id UUID REFERENCES notification_workflows(id) ON DELETE SET NULL,
    notification_id UUID REFERENCES notifications(id) ON DELETE SET NULL,
    template_id UUID REFERENCES compliance_templates(id) ON DELETE SET NULL,
    calendar_entry_id UUID REFERENCES compliance_calendar(id) ON DELETE SET NULL,
    
    -- Actor and target
    actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Who performed the action
    target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Who was affected by the action
    
    -- Event details
    event_description TEXT NOT NULL,
    event_data JSONB DEFAULT '{}', -- Detailed event data
    previous_state JSONB, -- State before the action
    new_state JSONB, -- State after the action
    
    -- Context and metadata
    ip_address INET,
    user_agent TEXT,
    session_id UUID,
    request_id UUID, -- For tracing requests across services
    
    -- Compliance and legal
    retention_required_until DATE, -- Legal retention requirements
    is_legally_significant BOOLEAN DEFAULT false,
    regulatory_context TEXT, -- Which regulation this event relates to
    
    -- Performance tracking
    processing_time_ms INTEGER, -- How long the action took to process
    
    -- Status and outcome
    outcome VARCHAR(50) NOT NULL DEFAULT 'success' CHECK (
        outcome IN ('success', 'failure', 'warning', 'partial_success', 'timeout', 'cancelled')
    ),
    error_message TEXT, -- If outcome was not successful
    error_code VARCHAR(50),
    
    -- Timestamp
    event_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexing hints
    search_vector tsvector -- For full-text search of audit logs
);

-- =============================================
-- EXTEND EXISTING NOTIFICATIONS TABLE
-- =============================================

-- Add compliance-specific columns to existing notifications table
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS workflow_id UUID REFERENCES notification_workflows(id) ON DELETE CASCADE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS compliance_type VARCHAR(100); -- Type of compliance notification
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS deadline_type VARCHAR(50); -- 'soft', 'hard', 'regulatory'
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS requires_acknowledgment BOOLEAN DEFAULT false;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS acknowledgment_method VARCHAR(50); -- 'click', 'digital_signature', 'email_reply'
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS escalation_level INTEGER DEFAULT 0;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS compliance_evidence_url VARCHAR(500);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS regulatory_reference VARCHAR(255);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Compliance templates indexes
CREATE INDEX IF NOT EXISTS idx_compliance_templates_org_type ON compliance_templates(organization_id, regulation_type, is_active);
CREATE INDEX IF NOT EXISTS idx_compliance_templates_category ON compliance_templates(category, is_active);

-- Compliance calendar indexes
CREATE INDEX IF NOT EXISTS idx_compliance_calendar_org_due ON compliance_calendar(organization_id, due_date);
CREATE INDEX IF NOT EXISTS idx_compliance_calendar_status ON compliance_calendar(status, due_date);
CREATE INDEX IF NOT EXISTS idx_compliance_calendar_recurring ON compliance_calendar(is_recurring, next_occurrence) WHERE is_recurring = true;
CREATE INDEX IF NOT EXISTS idx_compliance_calendar_type ON compliance_calendar(regulation_type, due_date);

-- Workflow indexes
CREATE INDEX IF NOT EXISTS idx_notification_workflows_org_status ON notification_workflows(organization_id, status, due_date);
CREATE INDEX IF NOT EXISTS idx_notification_workflows_assigned ON notification_workflows(assigned_to, status) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notification_workflows_template ON notification_workflows(template_id, status);

-- Participants indexes
CREATE INDEX IF NOT EXISTS idx_compliance_participants_workflow ON compliance_participants(workflow_id, status);
CREATE INDEX IF NOT EXISTS idx_compliance_participants_user ON compliance_participants(user_id, status);
CREATE INDEX IF NOT EXISTS idx_compliance_participants_step ON compliance_participants(workflow_id, step_number, status);

-- Audit log indexes
CREATE INDEX IF NOT EXISTS idx_notification_audit_org_time ON notification_audit_log(organization_id, event_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_notification_audit_workflow ON notification_audit_log(workflow_id, event_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_notification_audit_event_type ON notification_audit_log(event_type, event_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_notification_audit_actor ON notification_audit_log(actor_user_id, event_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_notification_audit_search ON notification_audit_log USING gin(search_vector);

-- Enhanced notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_workflow ON notifications(workflow_id, status) WHERE workflow_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_compliance_type ON notifications(compliance_type, priority, created_at) WHERE compliance_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_acknowledgment ON notifications(requires_acknowledgment, acknowledged_at) WHERE requires_acknowledgment = true;

-- =============================================
-- FUNCTIONS FOR COMPLIANCE OPERATIONS
-- =============================================

-- Function to create a compliance workflow from a template
CREATE OR REPLACE FUNCTION create_compliance_workflow(
    p_organization_id UUID,
    p_template_id UUID,
    p_calendar_entry_id UUID DEFAULT NULL,
    p_assigned_to UUID DEFAULT NULL,
    p_due_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_created_by UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    workflow_id UUID;
    template_data RECORD;
    step_data JSONB;
    participant_data JSONB;
    i INTEGER;
BEGIN
    -- Get template information
    SELECT * INTO template_data
    FROM compliance_templates
    WHERE id = p_template_id AND organization_id = p_organization_id AND is_active = true;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Template not found or inactive';
    END IF;

    -- Create the workflow
    INSERT INTO notification_workflows (
        organization_id,
        template_id,
        calendar_entry_id,
        name,
        description,
        workflow_type,
        steps,
        total_steps,
        assigned_to,
        due_date,
        created_by
    ) VALUES (
        p_organization_id,
        p_template_id,
        p_calendar_entry_id,
        template_data.name || ' - ' || COALESCE(TO_CHAR(p_due_date, 'YYYY-MM-DD'), 'Ad Hoc'),
        template_data.description,
        'compliance',
        template_data.workflow_steps,
        jsonb_array_length(template_data.workflow_steps),
        p_assigned_to,
        COALESCE(p_due_date, NOW() + INTERVAL '30 days'),
        COALESCE(p_created_by, p_assigned_to)
    ) RETURNING id INTO workflow_id;

    -- Create participants based on template requirements
    FOR i IN 0..jsonb_array_length(template_data.workflow_steps) - 1 LOOP
        step_data := template_data.workflow_steps->i;
        
        -- If step has participant requirements, create participant records
        IF step_data ? 'participants' THEN
            FOR participant_data IN SELECT * FROM jsonb_array_elements(step_data->'participants') LOOP
                INSERT INTO compliance_participants (
                    workflow_id,
                    user_id,
                    participant_type,
                    role_in_workflow,
                    step_number,
                    is_required,
                    can_delegate,
                    requires_evidence
                ) VALUES (
                    workflow_id,
                    COALESCE((participant_data->>'user_id')::UUID, p_assigned_to),
                    COALESCE(participant_data->>'type', 'assignee'),
                    participant_data->>'role',
                    i,
                    COALESCE((participant_data->>'required')::BOOLEAN, true),
                    COALESCE((participant_data->>'can_delegate')::BOOLEAN, false),
                    COALESCE((participant_data->>'requires_evidence')::BOOLEAN, false)
                );
            END LOOP;
        ELSE
            -- Default participant (main assignee)
            INSERT INTO compliance_participants (
                workflow_id,
                user_id,
                participant_type,
                step_number,
                is_required
            ) VALUES (
                workflow_id,
                COALESCE(p_assigned_to, p_created_by),
                'assignee',
                i,
                true
            );
        END IF;
    END LOOP;

    -- Log workflow creation
    INSERT INTO notification_audit_log (
        organization_id,
        event_type,
        event_category,
        action,
        workflow_id,
        template_id,
        calendar_entry_id,
        actor_user_id,
        event_description,
        event_data,
        outcome
    ) VALUES (
        p_organization_id,
        'workflow_created',
        'compliance',
        'create_compliance_workflow',
        workflow_id,
        p_template_id,
        p_calendar_entry_id,
        COALESCE(p_created_by, p_assigned_to),
        'Compliance workflow created from template: ' || template_data.name,
        jsonb_build_object(
            'template_name', template_data.name,
            'regulation_type', template_data.regulation_type,
            'total_steps', jsonb_array_length(template_data.workflow_steps),
            'due_date', p_due_date
        ),
        'success'
    );

    RETURN workflow_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to advance workflow to next step
CREATE OR REPLACE FUNCTION advance_workflow_step(
    p_workflow_id UUID,
    p_user_id UUID,
    p_completion_notes TEXT DEFAULT NULL,
    p_evidence_url VARCHAR(500) DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    workflow_data RECORD;
    current_step_data JSONB;
    next_step_data JSONB;
    participant_count INTEGER;
    completed_participant_count INTEGER;
    should_advance BOOLEAN := false;
BEGIN
    -- Get workflow information
    SELECT * INTO workflow_data
    FROM notification_workflows
    WHERE id = p_workflow_id AND status IN ('pending', 'in_progress');

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Workflow not found or already completed';
    END IF;

    -- Mark participant as completed for current step
    UPDATE compliance_participants
    SET 
        status = 'completed',
        completed_at = NOW(),
        completion_notes = p_completion_notes,
        completion_evidence_url = p_evidence_url,
        updated_at = NOW()
    WHERE workflow_id = p_workflow_id
    AND user_id = p_user_id
    AND step_number = workflow_data.current_step
    AND status = 'in_progress';

    -- Check if current step is complete
    SELECT COUNT(*) INTO participant_count
    FROM compliance_participants
    WHERE workflow_id = p_workflow_id
    AND step_number = workflow_data.current_step
    AND is_required = true;

    SELECT COUNT(*) INTO completed_participant_count
    FROM compliance_participants
    WHERE workflow_id = p_workflow_id
    AND step_number = workflow_data.current_step
    AND is_required = true
    AND status = 'completed';

    -- Determine if we should advance
    IF workflow_data.require_all_participants THEN
        should_advance := (completed_participant_count = participant_count);
    ELSE
        should_advance := (completed_participant_count > 0);
    END IF;

    -- Advance to next step if current step is complete
    IF should_advance AND workflow_data.auto_advance_steps THEN
        IF workflow_data.current_step + 1 >= workflow_data.total_steps THEN
            -- Workflow is complete
            UPDATE notification_workflows
            SET 
                status = 'completed',
                completed_at = NOW(),
                progress_percentage = 100,
                updated_at = NOW()
            WHERE id = p_workflow_id;

            -- Log completion
            INSERT INTO notification_audit_log (
                organization_id,
                event_type,
                event_category,
                action,
                workflow_id,
                actor_user_id,
                event_description,
                outcome
            ) VALUES (
                workflow_data.organization_id,
                'workflow_completed',
                'compliance',
                'complete_workflow',
                p_workflow_id,
                p_user_id,
                'Compliance workflow completed: ' || workflow_data.name,
                'success'
            );
        ELSE
            -- Move to next step
            UPDATE notification_workflows
            SET 
                current_step = current_step + 1,
                status = 'in_progress',
                progress_percentage = ROUND((current_step + 1.0) / total_steps * 100),
                updated_at = NOW()
            WHERE id = p_workflow_id;

            -- Activate participants for next step
            UPDATE compliance_participants
            SET 
                status = 'in_progress',
                started_at = NOW(),
                updated_at = NOW()
            WHERE workflow_id = p_workflow_id
            AND step_number = workflow_data.current_step + 1
            AND status = 'assigned';

            -- Log step advancement
            INSERT INTO notification_audit_log (
                organization_id,
                event_type,
                event_category,
                action,
                workflow_id,
                actor_user_id,
                event_description,
                event_data,
                outcome
            ) VALUES (
                workflow_data.organization_id,
                'workflow_step_advanced',
                'compliance',
                'advance_workflow_step',
                p_workflow_id,
                p_user_id,
                'Workflow advanced to step ' || (workflow_data.current_step + 2),
                jsonb_build_object(
                    'from_step', workflow_data.current_step,
                    'to_step', workflow_data.current_step + 1,
                    'progress_percentage', ROUND((workflow_data.current_step + 2.0) / workflow_data.total_steps * 100)
                ),
                'success'
            );
        END IF;
    END IF;

    RETURN should_advance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate compliance notifications based on calendar
CREATE OR REPLACE FUNCTION generate_compliance_notifications()
RETURNS INTEGER AS $$
DECLARE
    calendar_entry RECORD;
    notification_count INTEGER := 0;
    days_until_due INTEGER;
    notification_title TEXT;
    notification_message TEXT;
    priority_level VARCHAR(20);
BEGIN
    -- Process calendar entries that need notifications
    FOR calendar_entry IN 
        SELECT *
        FROM compliance_calendar
        WHERE status IN ('scheduled', 'active', 'in_progress')
        AND due_date >= CURRENT_DATE
        AND due_date <= CURRENT_DATE + INTERVAL '90 days' -- Look ahead 90 days
    LOOP
        days_until_due := calendar_entry.due_date - CURRENT_DATE;
        
        -- Skip if we've already sent recent notifications for this entry
        IF EXISTS (
            SELECT 1 FROM notifications
            WHERE resource_type = 'compliance_calendar'
            AND resource_id = calendar_entry.id::TEXT
            AND created_at > NOW() - INTERVAL '24 hours'
        ) THEN
            CONTINUE;
        END IF;

        -- Determine notification timing and priority based on business days notice
        IF days_until_due <= 1 THEN
            priority_level := 'critical';
            notification_title := 'URGENT: ' || calendar_entry.title || ' Due Tomorrow';
        ELSIF days_until_due <= 3 THEN
            priority_level := 'high';
            notification_title := 'Important: ' || calendar_entry.title || ' Due Soon';
        ELSIF days_until_due <= calendar_entry.business_days_notice THEN
            priority_level := 'medium';
            notification_title := calendar_entry.title || ' Deadline Approaching';
        ELSE
            CONTINUE; -- Too early to notify
        END IF;

        -- Create notification message
        notification_message := format(
            'Compliance deadline for %s (%s) is due on %s. This is a %s priority %s requirement.',
            calendar_entry.title,
            calendar_entry.regulation_type,
            TO_CHAR(calendar_entry.due_date, 'Mon DD, YYYY'),
            calendar_entry.priority,
            CASE WHEN calendar_entry.is_mandatory THEN 'mandatory' ELSE 'recommended' END
        );

        -- Create notifications for relevant users (board members, compliance officers)
        INSERT INTO notifications (
            user_id,
            organization_id,
            type,
            category,
            title,
            message,
            priority,
            action_url,
            action_text,
            resource_type,
            resource_id,
            compliance_type,
            deadline_type,
            requires_acknowledgment,
            regulatory_reference,
            expires_at
        )
        SELECT 
            om.user_id,
            calendar_entry.organization_id,
            'reminder',
            'compliance_deadline',
            notification_title,
            notification_message,
            priority_level,
            '/dashboard/compliance/calendar/' || calendar_entry.id,
            'View Compliance Details',
            'compliance_calendar',
            calendar_entry.id::TEXT,
            calendar_entry.regulation_type,
            CASE WHEN calendar_entry.is_mandatory THEN 'regulatory' ELSE 'internal' END,
            calendar_entry.is_mandatory,
            calendar_entry.external_reference,
            calendar_entry.due_date + INTERVAL '7 days'
        FROM organization_members om
        JOIN users u ON om.user_id = u.id
        WHERE om.organization_id = calendar_entry.organization_id
        AND om.status = 'active'
        AND om.role IN ('owner', 'admin')
        AND u.status = 'approved';

        notification_count := notification_count + 1;

        -- Log notification generation
        INSERT INTO notification_audit_log (
            organization_id,
            event_type,
            event_category,
            action,
            calendar_entry_id,
            event_description,
            event_data,
            outcome
        ) VALUES (
            calendar_entry.organization_id,
            'compliance_notification_generated',
            'notification',
            'generate_compliance_notifications',
            calendar_entry.id,
            'Generated compliance notifications for: ' || calendar_entry.title,
            jsonb_build_object(
                'days_until_due', days_until_due,
                'priority', priority_level,
                'regulation_type', calendar_entry.regulation_type,
                'is_mandatory', calendar_entry.is_mandatory
            ),
            'success'
        );
    END LOOP;

    RETURN notification_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update full-text search vector for audit logs
CREATE OR REPLACE FUNCTION update_audit_log_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('english', COALESCE(NEW.event_type, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.action, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.event_description, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(NEW.event_data::text, '')), 'D');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

-- Enable RLS on all compliance tables
ALTER TABLE compliance_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for compliance templates
CREATE POLICY "Users can view templates in their organization" ON compliance_templates
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

CREATE POLICY "Organization admins can manage templates" ON compliance_templates
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid() 
            AND role IN ('owner', 'admin')
            AND status = 'active'
        )
    );

-- RLS Policies for compliance calendar
CREATE POLICY "Users can view calendar in their organization" ON compliance_calendar
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

CREATE POLICY "Organization admins can manage calendar" ON compliance_calendar
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid() 
            AND role IN ('owner', 'admin')
            AND status = 'active'
        )
    );

-- RLS Policies for notification workflows
CREATE POLICY "Users can view workflows they participate in" ON notification_workflows
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid() AND status = 'active'
        )
        OR assigned_to = auth.uid()
        OR id IN (
            SELECT workflow_id 
            FROM compliance_participants 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Organization admins and assignees can update workflows" ON notification_workflows
    FOR UPDATE USING (
        assigned_to = auth.uid()
        OR organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid() 
            AND role IN ('owner', 'admin')
            AND status = 'active'
        )
    );

-- RLS Policies for compliance participants
CREATE POLICY "Users can view their participation records" ON compliance_participants
    FOR SELECT USING (
        user_id = auth.uid()
        OR workflow_id IN (
            SELECT id FROM notification_workflows 
            WHERE assigned_to = auth.uid()
            OR organization_id IN (
                SELECT organization_id 
                FROM organization_members 
                WHERE user_id = auth.uid() 
                AND role IN ('owner', 'admin')
                AND status = 'active'
            )
        )
    );

CREATE POLICY "Users can update their own participation" ON compliance_participants
    FOR UPDATE USING (user_id = auth.uid());

-- RLS Policies for audit log
CREATE POLICY "Users can view audit logs for their organization" ON notification_audit_log
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid() 
            AND status = 'active'
        )
    );

-- =============================================
-- TRIGGERS
-- =============================================

-- Update search vector on audit log insert/update
CREATE TRIGGER update_audit_log_search_vector_trigger
    BEFORE INSERT OR UPDATE ON notification_audit_log
    FOR EACH ROW
    EXECUTE FUNCTION update_audit_log_search_vector();

-- Auto-update compliance calendar recurring entries
CREATE OR REPLACE FUNCTION update_recurring_calendar_entries()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_recurring AND NEW.status = 'completed' AND NEW.recurrence_pattern IS NOT NULL THEN
        -- Calculate next occurrence based on recurrence pattern
        -- This is a simplified version - in practice, you'd want more sophisticated date calculation
        CASE 
            WHEN NEW.recurrence_pattern->>'frequency' = 'monthly' THEN
                NEW.next_occurrence := NEW.due_date + INTERVAL '1 month';
            WHEN NEW.recurrence_pattern->>'frequency' = 'quarterly' THEN
                NEW.next_occurrence := NEW.due_date + INTERVAL '3 months';
            WHEN NEW.recurrence_pattern->>'frequency' = 'annually' THEN
                NEW.next_occurrence := NEW.due_date + INTERVAL '1 year';
        END CASE;
        
        -- Create new calendar entry for next occurrence
        IF NEW.next_occurrence IS NOT NULL THEN
            INSERT INTO compliance_calendar (
                organization_id,
                template_id,
                title,
                description,
                regulation_type,
                category,
                due_date,
                start_date,
                business_days_notice,
                is_recurring,
                recurrence_pattern,
                priority,
                is_mandatory,
                regulatory_authority,
                tags,
                external_reference,
                metadata,
                created_by
            ) VALUES (
                NEW.organization_id,
                NEW.template_id,
                NEW.title,
                NEW.description,
                NEW.regulation_type,
                NEW.category,
                NEW.next_occurrence,
                NEW.next_occurrence - (NEW.due_date - NEW.start_date),
                NEW.business_days_notice,
                NEW.is_recurring,
                NEW.recurrence_pattern,
                NEW.priority,
                NEW.is_mandatory,
                NEW.regulatory_authority,
                NEW.tags,
                NEW.external_reference,
                NEW.metadata,
                NEW.created_by
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_recurring_calendar_entries_trigger
    AFTER UPDATE OF status ON compliance_calendar
    FOR EACH ROW
    WHEN (OLD.status != NEW.status AND NEW.status = 'completed')
    EXECUTE FUNCTION update_recurring_calendar_entries();

-- =============================================
-- SAMPLE DATA
-- =============================================

-- Insert sample compliance templates for common regulations
INSERT INTO compliance_templates (
    organization_id,
    name,
    description,
    regulation_type,
    category,
    frequency,
    priority,
    workflow_steps,
    requirements,
    required_roles,
    reminder_schedule,
    escalation_rules,
    is_system_template,
    created_by
)
SELECT 
    o.id,
    'SOX Section 404 Compliance',
    'Sarbanes-Oxley Section 404 internal controls assessment and certification',
    'SOX',
    'financial',
    'annual',
    'critical',
    '[
        {
            "step": 0,
            "name": "Internal Controls Assessment",
            "description": "Assess effectiveness of internal controls over financial reporting",
            "estimated_days": 30,
            "participants": [{"type": "assignee", "role": "CFO"}, {"type": "reviewer", "role": "Audit Committee Chair"}],
            "deliverables": ["Controls assessment report", "Deficiencies documentation"]
        },
        {
            "step": 1,
            "name": "Management Certification",
            "description": "Management certifies the effectiveness of internal controls",
            "estimated_days": 5,
            "participants": [{"type": "approver", "role": "CEO"}, {"type": "approver", "role": "CFO"}],
            "deliverables": ["Management certification letter"]
        },
        {
            "step": 2,
            "name": "External Auditor Review",
            "description": "External auditor reviews and attests to management assessment",
            "estimated_days": 15,
            "participants": [{"type": "observer", "role": "External Auditor"}],
            "deliverables": ["Auditor attestation report"]
        }
    ]'::jsonb,
    ARRAY['Internal controls documentation', 'Management assessment', 'External auditor attestation'],
    ARRAY['CFO', 'CEO', 'Audit Committee Chair'],
    '{"30_days": true, "14_days": true, "7_days": true, "1_day": true}'::jsonb,
    '{"overdue_1_day": {"escalate_to": "CEO"}, "overdue_7_days": {"escalate_to": "Board Chair"}}'::jsonb,
    true,
    om.user_id
FROM organizations o
JOIN organization_members om ON o.id = om.organization_id
WHERE om.role = 'owner'
AND NOT EXISTS (
    SELECT 1 FROM compliance_templates 
    WHERE name = 'SOX Section 404 Compliance' AND organization_id = o.id
)
LIMIT 1;

-- Insert GDPR compliance template
INSERT INTO compliance_templates (
    organization_id,
    name,
    description,
    regulation_type,
    category,
    frequency,
    priority,
    workflow_steps,
    requirements,
    required_roles,
    reminder_schedule,
    is_system_template,
    created_by
)
SELECT 
    o.id,
    'GDPR Data Protection Assessment',
    'General Data Protection Regulation compliance review and documentation',
    'GDPR',
    'privacy',
    'annual',
    'high',
    '[
        {
            "step": 0,
            "name": "Data Processing Inventory",
            "description": "Document all data processing activities and legal bases",
            "estimated_days": 20,
            "participants": [{"type": "assignee", "role": "Data Protection Officer"}],
            "deliverables": ["Data processing register", "Privacy notices review"]
        },
        {
            "step": 1,
            "name": "Privacy Impact Assessment",
            "description": "Conduct privacy impact assessments for high-risk processing",
            "estimated_days": 15,
            "participants": [{"type": "assignee", "role": "Data Protection Officer"}, {"type": "reviewer", "role": "Legal Counsel"}],
            "deliverables": ["Privacy impact assessments", "Risk mitigation plans"]
        },
        {
            "step": 2,
            "name": "Compliance Documentation Review",
            "description": "Review and update all GDPR compliance documentation",
            "estimated_days": 10,
            "participants": [{"type": "approver", "role": "Chief Legal Officer"}],
            "deliverables": ["Updated compliance documentation", "Training materials"]
        }
    ]'::jsonb,
    ARRAY['Data processing register', 'Privacy notices', 'Consent mechanisms', 'Data breach procedures'],
    ARRAY['Data Protection Officer', 'Legal Counsel', 'Chief Legal Officer'],
    '{"45_days": true, "21_days": true, "7_days": true}'::jsonb,
    true,
    om.user_id
FROM organizations o
JOIN organization_members om ON o.id = om.organization_id
WHERE om.role = 'owner'
AND NOT EXISTS (
    SELECT 1 FROM compliance_templates 
    WHERE name = 'GDPR Data Protection Assessment' AND organization_id = o.id
)
LIMIT 1;

-- Insert Board Governance template
INSERT INTO compliance_templates (
    organization_id,
    name,
    description,
    regulation_type,
    category,
    frequency,
    priority,
    workflow_steps,
    requirements,
    required_roles,
    reminder_schedule,
    is_system_template,
    created_by
)
SELECT 
    o.id,
    'Annual Board Effectiveness Review',
    'Annual assessment of board effectiveness and governance practices',
    'BOARD_GOVERNANCE',
    'governance',
    'annual',
    'medium',
    '[
        {
            "step": 0,
            "name": "Board Self-Assessment Survey",
            "description": "All board members complete effectiveness self-assessment",
            "estimated_days": 14,
            "participants": [{"type": "assignee", "role": "All Board Members"}],
            "deliverables": ["Completed assessment surveys"]
        },
        {
            "step": 1,
            "name": "Results Analysis and Report",
            "description": "Analyze survey results and prepare improvement recommendations",
            "estimated_days": 7,
            "participants": [{"type": "assignee", "role": "Board Secretary"}, {"type": "reviewer", "role": "Board Chair"}],
            "deliverables": ["Effectiveness report", "Improvement action plan"]
        },
        {
            "step": 2,
            "name": "Board Discussion and Action Planning",
            "description": "Board reviews results and agrees on improvement actions",
            "estimated_days": 1,
            "participants": [{"type": "approver", "role": "Full Board"}],
            "deliverables": ["Meeting minutes", "Approved action plan"]
        }
    ]'::jsonb,
    ARRAY['Board effectiveness survey', 'Skills matrix review', 'Committee effectiveness review', 'Action plan implementation'],
    ARRAY['Board Chair', 'Board Secretary', 'All Board Members'],
    '{"30_days": true, "14_days": true}'::jsonb,
    true,
    om.user_id
FROM organizations o
JOIN organization_members om ON o.id = om.organization_id
WHERE om.role = 'owner'
AND NOT EXISTS (
    SELECT 1 FROM compliance_templates 
    WHERE name = 'Annual Board Effectiveness Review' AND organization_id = o.id
)
LIMIT 1;

-- Grant necessary permissions
GRANT ALL ON compliance_templates TO authenticated;
GRANT ALL ON compliance_calendar TO authenticated;
GRANT ALL ON notification_workflows TO authenticated;
GRANT ALL ON compliance_participants TO authenticated;
GRANT ALL ON notification_audit_log TO authenticated;

GRANT ALL ON compliance_templates TO service_role;
GRANT ALL ON compliance_calendar TO service_role;
GRANT ALL ON notification_workflows TO service_role;
GRANT ALL ON compliance_participants TO service_role;
GRANT ALL ON notification_audit_log TO service_role;