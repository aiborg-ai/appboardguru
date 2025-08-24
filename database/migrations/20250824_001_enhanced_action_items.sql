-- Enhanced Action Items System Migration
-- Supports AI-powered extraction, assignment, and tracking

-- Create enhanced action_items table
CREATE TABLE IF NOT EXISTS action_items (
    id VARCHAR(255) PRIMARY KEY,
    transcription_id VARCHAR(255) REFERENCES meeting_transcriptions(id) ON DELETE CASCADE,
    organization_id VARCHAR(255) NOT NULL,
    
    -- Core action item fields
    title TEXT NOT NULL,
    description TEXT,
    assigned_to VARCHAR(255), -- User ID
    assigned_to_name VARCHAR(255), -- Display name for quick access
    due_date DATE,
    priority VARCHAR(50) DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    category VARCHAR(100) DEFAULT 'operational',
    estimated_hours INTEGER,
    
    -- AI-enhanced fields
    extraction_confidence DECIMAL(3,2) DEFAULT 0.5, -- 0.00 to 1.00
    assignment_confidence DECIMAL(3,2) DEFAULT 0.5,
    due_date_confidence DECIMAL(3,2) DEFAULT 0.5,
    urgency_score INTEGER DEFAULT 50 CHECK (urgency_score >= 0 AND urgency_score <= 100),
    complexity_score INTEGER DEFAULT 50 CHECK (complexity_score >= 0 AND complexity_score <= 100),
    
    -- Context and intelligence
    context_snippet TEXT, -- Original transcript excerpt
    suggested_follow_up TEXT,
    dependencies TEXT[], -- Array of action item IDs
    related_decisions TEXT[], -- Array of decision IDs
    
    -- Source tracking
    extracted_from_segment_id VARCHAR(255),
    extracted_from_timestamp BIGINT,
    extracted_from_speaker VARCHAR(255),
    
    -- Completion tracking
    completed_by VARCHAR(255), -- User ID who completed it
    completed_at TIMESTAMP WITH TIME ZONE,
    actual_hours INTEGER, -- Actual time spent
    completion_notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(255) NOT NULL -- User who created/extracted it
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_action_items_assigned_to ON action_items(assigned_to);
CREATE INDEX IF NOT EXISTS idx_action_items_due_date ON action_items(due_date);
CREATE INDEX IF NOT EXISTS idx_action_items_status ON action_items(status);
CREATE INDEX IF NOT EXISTS idx_action_items_priority ON action_items(priority);
CREATE INDEX IF NOT EXISTS idx_action_items_transcription ON action_items(transcription_id);
CREATE INDEX IF NOT EXISTS idx_action_items_organization ON action_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_action_items_urgency ON action_items(urgency_score DESC);

-- Create action item notifications table
CREATE TABLE IF NOT EXISTS action_item_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_item_id VARCHAR(255) REFERENCES action_items(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL,
    notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN (
        'assigned', 'due_soon', 'overdue', 'completed', 'status_change', 'reminder'
    )),
    
    -- Notification content
    title VARCHAR(255) NOT NULL,
    message TEXT,
    
    -- Delivery settings
    delivery_method VARCHAR(50)[] DEFAULT ARRAY['email'], -- email, sms, push, in_app
    sent_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    is_read BOOLEAN DEFAULT FALSE,
    
    -- Scheduling
    scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    retry_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for notifications
CREATE INDEX IF NOT EXISTS idx_action_item_notifications_user ON action_item_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_action_item_notifications_scheduled ON action_item_notifications(scheduled_for) WHERE sent_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_action_item_notifications_unread ON action_item_notifications(user_id, is_read) WHERE is_read = FALSE;

-- Create action item dependencies table
CREATE TABLE IF NOT EXISTS action_item_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_item_id VARCHAR(255) REFERENCES action_items(id) ON DELETE CASCADE,
    depends_on_id VARCHAR(255) REFERENCES action_items(id) ON DELETE CASCADE,
    dependency_type VARCHAR(50) DEFAULT 'blocks' CHECK (dependency_type IN ('blocks', 'relates_to', 'follows')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(action_item_id, depends_on_id)
);

-- Create action item comments table for collaboration
CREATE TABLE IF NOT EXISTS action_item_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_item_id VARCHAR(255) REFERENCES action_items(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL,
    comment_text TEXT NOT NULL,
    comment_type VARCHAR(50) DEFAULT 'general' CHECK (comment_type IN ('general', 'progress_update', 'blocker', 'question')),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create action item templates table for recurring tasks
CREATE TABLE IF NOT EXISTS action_item_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id VARCHAR(255) NOT NULL,
    template_name VARCHAR(255) NOT NULL,
    
    -- Template fields
    title_template TEXT NOT NULL,
    description_template TEXT,
    default_priority VARCHAR(50) DEFAULT 'medium',
    default_category VARCHAR(100) DEFAULT 'operational',
    estimated_hours INTEGER,
    
    -- Auto-assignment rules
    assignment_rules JSONB, -- Rules for automatic assignment
    
    -- Metadata
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- Add analytics view for action item insights
CREATE OR REPLACE VIEW action_item_analytics AS
SELECT 
    organization_id,
    COUNT(*) as total_items,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_items,
    COUNT(*) FILTER (WHERE status = 'overdue') as overdue_items,
    COUNT(*) FILTER (WHERE priority = 'high') as high_priority_items,
    AVG(urgency_score) as avg_urgency_score,
    AVG(complexity_score) as avg_complexity_score,
    AVG(extraction_confidence) as avg_extraction_confidence,
    COUNT(DISTINCT assigned_to) as unique_assignees,
    AVG(actual_hours) FILTER (WHERE actual_hours IS NOT NULL) as avg_completion_hours,
    
    -- Time-based metrics
    COUNT(*) FILTER (WHERE due_date BETWEEN NOW() AND NOW() + INTERVAL '7 days') as due_this_week,
    COUNT(*) FILTER (WHERE due_date BETWEEN NOW() + INTERVAL '7 days' AND NOW() + INTERVAL '30 days') as due_this_month,
    
    -- By category
    COUNT(*) FILTER (WHERE category = 'financial') as financial_items,
    COUNT(*) FILTER (WHERE category = 'operational') as operational_items,
    COUNT(*) FILTER (WHERE category = 'strategic') as strategic_items,
    COUNT(*) FILTER (WHERE category = 'compliance') as compliance_items
FROM action_items 
GROUP BY organization_id;

-- Add user-specific action item dashboard view
CREATE OR REPLACE VIEW user_action_item_dashboard AS
SELECT 
    ai.assigned_to as user_id,
    ai.organization_id,
    COUNT(*) as total_assigned,
    COUNT(*) FILTER (WHERE ai.status = 'pending') as pending_count,
    COUNT(*) FILTER (WHERE ai.status = 'in_progress') as in_progress_count,
    COUNT(*) FILTER (WHERE ai.status = 'completed') as completed_count,
    COUNT(*) FILTER (WHERE ai.due_date < NOW() AND ai.status != 'completed') as overdue_count,
    COUNT(*) FILTER (WHERE ai.due_date BETWEEN NOW() AND NOW() + INTERVAL '7 days' AND ai.status != 'completed') as due_this_week,
    AVG(ai.urgency_score) as avg_urgency,
    AVG(ai.complexity_score) as avg_complexity,
    
    -- Recent activity
    MAX(ai.created_at) as last_assigned_date,
    MAX(ai.completed_at) as last_completed_date
FROM action_items ai
WHERE ai.assigned_to IS NOT NULL
GROUP BY ai.assigned_to, ai.organization_id;

-- Create function to update action item status automatically
CREATE OR REPLACE FUNCTION update_action_item_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the updated_at timestamp
    NEW.updated_at = NOW();
    
    -- If status changed to completed, set completion timestamp
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        NEW.completed_at = NOW();
    END IF;
    
    -- If status changed from completed, clear completion timestamp
    IF NEW.status != 'completed' AND OLD.status = 'completed' THEN
        NEW.completed_at = NULL;
        NEW.completed_by = NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic status updates
DROP TRIGGER IF EXISTS action_items_status_trigger ON action_items;
CREATE TRIGGER action_items_status_trigger
    BEFORE UPDATE ON action_items
    FOR EACH ROW
    EXECUTE FUNCTION update_action_item_status();

-- Create function to generate automatic notifications
CREATE OR REPLACE FUNCTION create_action_item_notification(
    p_action_item_id VARCHAR(255),
    p_user_id VARCHAR(255),
    p_notification_type VARCHAR(50),
    p_title VARCHAR(255),
    p_message TEXT DEFAULT NULL,
    p_delivery_methods VARCHAR(50)[] DEFAULT ARRAY['email'],
    p_scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS UUID AS $$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO action_item_notifications (
        action_item_id,
        user_id,
        notification_type,
        title,
        message,
        delivery_method,
        scheduled_for
    ) VALUES (
        p_action_item_id,
        p_user_id,
        p_notification_type,
        p_title,
        p_message,
        p_delivery_methods,
        p_scheduled_for
    ) RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql;

-- Create RLS policies for action items
ALTER TABLE action_items ENABLE ROW LEVEL SECURITY;

-- Users can view action items in their organization or assigned to them
CREATE POLICY "Users can view action items in their org or assigned to them"
    ON action_items
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
        )
        OR assigned_to = auth.uid()::text
    );

-- Users can update action items assigned to them
CREATE POLICY "Users can update their assigned action items"
    ON action_items
    FOR UPDATE
    USING (assigned_to = auth.uid()::text);

-- Organization admins can manage all action items
CREATE POLICY "Org admins can manage all action items"
    ON action_items
    FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'owner')
        )
    );

-- Similar policies for related tables
ALTER TABLE action_item_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their notifications"
    ON action_item_notifications
    FOR SELECT
    USING (user_id = auth.uid()::text);

ALTER TABLE action_item_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view comments on accessible action items"
    ON action_item_comments
    FOR SELECT
    USING (
        action_item_id IN (
            SELECT id FROM action_items 
            WHERE organization_id IN (
                SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
            )
            OR assigned_to = auth.uid()::text
        )
    );

-- Add helpful comments
COMMENT ON TABLE action_items IS 'AI-enhanced action items extracted from meeting transcriptions';
COMMENT ON COLUMN action_items.extraction_confidence IS 'AI confidence score (0-1) for how accurately this action item was extracted';
COMMENT ON COLUMN action_items.urgency_score IS 'AI-determined urgency score (0-100) based on language and context';
COMMENT ON COLUMN action_items.complexity_score IS 'AI-determined complexity score (0-100) based on scope and requirements';
COMMENT ON VIEW action_item_analytics IS 'Organization-level analytics for action item performance and trends';
COMMENT ON VIEW user_action_item_dashboard IS 'User-specific dashboard metrics for assigned action items';