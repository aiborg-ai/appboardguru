-- =============================================
-- Cross-Feature Integration Database Schema
-- Adds views, relationships, and triggers for seamless integration
-- between meetings, compliance, documents, and AI features
-- =============================================

BEGIN;

-- =============================================
-- INTEGRATION EVENT TRACKING
-- =============================================

CREATE TABLE IF NOT EXISTS integration_events (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN (
        'meeting-to-ai',
        'meeting-to-compliance', 
        'document-to-compliance',
        'ai-to-meeting',
        'voting-to-compliance',
        'collaboration-to-ai',
        'compliance-to-meeting',
        'cross-feature-sync'
    )),
    source_feature TEXT NOT NULL CHECK (source_feature IN ('meetings', 'compliance', 'documents', 'ai', 'system')),
    target_feature TEXT NOT NULL CHECK (target_feature IN ('meetings', 'compliance', 'documents', 'ai', 'system')),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed', 'retrying')),
    data JSONB NOT NULL DEFAULT '{}',
    metadata JSONB NOT NULL DEFAULT '{}',
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Indexes for performance
    INDEX idx_integration_events_organization_id (organization_id),
    INDEX idx_integration_events_type (type),
    INDEX idx_integration_events_status (status),
    INDEX idx_integration_events_created_at (created_at),
    INDEX idx_integration_events_source_target (source_feature, target_feature)
);

-- =============================================
-- CROSS-FEATURE RELATIONSHIPS
-- =============================================

CREATE TABLE IF NOT EXISTS cross_feature_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    source_feature TEXT NOT NULL,
    source_resource_id TEXT NOT NULL,
    target_feature TEXT NOT NULL,
    target_resource_id TEXT NOT NULL,
    relationship_type TEXT NOT NULL CHECK (relationship_type IN (
        'triggers',
        'depends_on',
        'enhances',
        'validates',
        'generates',
        'syncs_with'
    )),
    strength DECIMAL(3,2) NOT NULL DEFAULT 1.0 CHECK (strength BETWEEN 0.0 AND 1.0),
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Ensure unique relationships
    UNIQUE(organization_id, source_feature, source_resource_id, target_feature, target_resource_id, relationship_type),
    
    -- Indexes
    INDEX idx_cross_feature_relationships_org_id (organization_id),
    INDEX idx_cross_feature_relationships_source (source_feature, source_resource_id),
    INDEX idx_cross_feature_relationships_target (target_feature, target_resource_id),
    INDEX idx_cross_feature_relationships_type (relationship_type)
);

-- =============================================
-- MEETING ACTIONABLES ENHANCEMENTS
-- =============================================

-- Add compliance and AI integration columns to meeting actionables
ALTER TABLE meeting_actionables 
ADD COLUMN IF NOT EXISTS compliance_record_id TEXT,
ADD COLUMN IF NOT EXISTS ai_insights_id TEXT,
ADD COLUMN IF NOT EXISTS integration_status TEXT DEFAULT 'none' CHECK (integration_status IN ('none', 'pending', 'synced', 'failed')),
ADD COLUMN IF NOT EXISTS cross_feature_metadata JSONB DEFAULT '{}';

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_meeting_actionables_compliance_record_id ON meeting_actionables(compliance_record_id);
CREATE INDEX IF NOT EXISTS idx_meeting_actionables_ai_insights_id ON meeting_actionables(ai_insights_id);
CREATE INDEX IF NOT EXISTS idx_meeting_actionables_integration_status ON meeting_actionables(integration_status);

-- =============================================
-- COMPLIANCE INTEGRATION TABLES
-- =============================================

CREATE TABLE IF NOT EXISTS compliance_integration_records (
    id TEXT PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('meeting_voting', 'document_review', 'actionable_compliance', 'audit_trail')),
    source_feature TEXT NOT NULL,
    source_resource_id TEXT NOT NULL,
    compliance_framework_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'compliant', 'non_compliant', 'review_required')),
    validation_results JSONB DEFAULT '{}',
    remediation_actions JSONB DEFAULT '[]',
    audit_trail JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    validated_at TIMESTAMP WITH TIME ZONE,
    
    -- Indexes
    INDEX idx_compliance_integration_records_org_id (organization_id),
    INDEX idx_compliance_integration_records_type (type),
    INDEX idx_compliance_integration_records_status (status),
    INDEX idx_compliance_integration_records_source (source_feature, source_resource_id)
);

-- =============================================
-- DOCUMENT COLLABORATION INTEGRATION
-- =============================================

CREATE TABLE IF NOT EXISTS document_collaboration_integration (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL,
    document_id TEXT NOT NULL,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    operation_id TEXT NOT NULL,
    operation_type TEXT NOT NULL CHECK (operation_type IN ('insert', 'delete', 'format', 'attribute')),
    compliance_impact TEXT NOT NULL DEFAULT 'none' CHECK (compliance_impact IN ('none', 'minor', 'significant', 'critical')),
    ai_analysis_requested BOOLEAN DEFAULT FALSE,
    ai_analysis_completed_at TIMESTAMP WITH TIME ZONE,
    compliance_check_status TEXT DEFAULT 'not_required' CHECK (compliance_check_status IN ('not_required', 'pending', 'passed', 'failed')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Indexes
    INDEX idx_document_collaboration_integration_session_id (session_id),
    INDEX idx_document_collaboration_integration_document_id (document_id),
    INDEX idx_document_collaboration_integration_org_id (organization_id),
    INDEX idx_document_collaboration_integration_compliance_impact (compliance_impact),
    INDEX idx_document_collaboration_integration_ai_analysis_requested (ai_analysis_requested)
);

-- =============================================
-- AI INSIGHTS INTEGRATION
-- =============================================

CREATE TABLE IF NOT EXISTS ai_insights_integration (
    id TEXT PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    analysis_type TEXT NOT NULL CHECK (analysis_type IN ('meeting_analysis', 'document_analysis', 'compliance_analysis', 'cross_feature_analysis')),
    source_feature TEXT NOT NULL,
    source_resource_id TEXT NOT NULL,
    target_features TEXT[] NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    insights JSONB DEFAULT '{}',
    action_items JSONB DEFAULT '[]',
    recommendations JSONB DEFAULT '[]',
    confidence_score DECIMAL(3,2) CHECK (confidence_score BETWEEN 0.0 AND 1.0),
    processing_started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Indexes
    INDEX idx_ai_insights_integration_org_id (organization_id),
    INDEX idx_ai_insights_integration_analysis_type (analysis_type),
    INDEX idx_ai_insights_integration_source (source_feature, source_resource_id),
    INDEX idx_ai_insights_integration_status (status),
    INDEX idx_ai_insights_integration_target_features USING GIN (target_features)
);

-- =============================================
-- CROSS-FEATURE VIEWS
-- =============================================

-- View: Integrated Meeting Data
CREATE OR REPLACE VIEW integrated_meeting_data AS
SELECT 
    ma.id as actionable_id,
    ma.meeting_id,
    ma.title,
    ma.status,
    ma.assigned_to,
    ma.due_date,
    ma.priority,
    ma.category,
    ma.compliance_record_id,
    ma.ai_insights_id,
    ma.integration_status,
    
    -- Compliance data
    cir.status as compliance_status,
    cir.validation_results as compliance_validation,
    cir.remediation_actions as compliance_remediation,
    
    -- AI insights data
    aii.insights as ai_insights,
    aii.action_items as ai_action_items,
    aii.recommendations as ai_recommendations,
    aii.confidence_score as ai_confidence,
    
    -- Cross-feature relationships
    (
        SELECT json_agg(json_build_object(
            'target_feature', cfr.target_feature,
            'target_resource_id', cfr.target_resource_id,
            'relationship_type', cfr.relationship_type,
            'strength', cfr.strength
        ))
        FROM cross_feature_relationships cfr
        WHERE cfr.source_feature = 'meetings' 
        AND cfr.source_resource_id = ma.id::text
    ) as related_features,
    
    ma.created_at,
    ma.updated_at
FROM meeting_actionables ma
LEFT JOIN compliance_integration_records cir ON ma.compliance_record_id = cir.id
LEFT JOIN ai_insights_integration aii ON ma.ai_insights_id = aii.id;

-- View: Document Compliance Integration Status
CREATE OR REPLACE VIEW document_compliance_status AS
SELECT 
    dci.session_id,
    dci.document_id,
    dci.organization_id,
    COUNT(*) as total_operations,
    COUNT(*) FILTER (WHERE dci.compliance_impact != 'none') as compliance_relevant_operations,
    COUNT(*) FILTER (WHERE dci.compliance_check_status = 'passed') as compliance_passed,
    COUNT(*) FILTER (WHERE dci.compliance_check_status = 'failed') as compliance_failed,
    COUNT(*) FILTER (WHERE dci.ai_analysis_requested = TRUE) as ai_analysis_requested,
    COUNT(*) FILTER (WHERE dci.ai_analysis_completed_at IS NOT NULL) as ai_analysis_completed,
    MAX(dci.created_at) as latest_operation,
    
    -- Overall compliance status
    CASE 
        WHEN COUNT(*) FILTER (WHERE dci.compliance_check_status = 'failed') > 0 THEN 'non_compliant'
        WHEN COUNT(*) FILTER (WHERE dci.compliance_check_status = 'pending') > 0 THEN 'review_required'
        WHEN COUNT(*) FILTER (WHERE dci.compliance_impact != 'none') = 0 THEN 'not_applicable'
        ELSE 'compliant'
    END as overall_compliance_status
FROM document_collaboration_integration dci
GROUP BY dci.session_id, dci.document_id, dci.organization_id;

-- View: AI Insights Cross-Feature Impact
CREATE OR REPLACE VIEW ai_insights_cross_feature_impact AS
SELECT 
    aii.id as insights_id,
    aii.organization_id,
    aii.analysis_type,
    aii.source_feature,
    aii.source_resource_id,
    aii.target_features,
    aii.status,
    aii.confidence_score,
    
    -- Meeting actionables created from insights
    (
        SELECT COUNT(*)
        FROM meeting_actionables ma
        WHERE ma.ai_insights_id = aii.id
    ) as actionables_created,
    
    -- Compliance records triggered
    (
        SELECT COUNT(*)
        FROM compliance_integration_records cir
        WHERE cir.source_feature = 'ai'
        AND cir.source_resource_id = aii.id
    ) as compliance_records_triggered,
    
    -- Document reviews initiated
    (
        SELECT COUNT(*)
        FROM document_collaboration_integration dci
        WHERE dci.ai_analysis_requested = TRUE
        AND dci.metadata::text LIKE '%' || aii.id || '%'
    ) as document_reviews_initiated,
    
    aii.created_at,
    aii.completed_at
FROM ai_insights_integration aii;

-- View: Cross-Feature Integration Metrics
CREATE OR REPLACE VIEW cross_feature_integration_metrics AS
SELECT 
    organization_id,
    
    -- Event metrics by type
    COUNT(*) FILTER (WHERE type = 'meeting-to-ai') as meeting_to_ai_events,
    COUNT(*) FILTER (WHERE type = 'meeting-to-compliance') as meeting_to_compliance_events,
    COUNT(*) FILTER (WHERE type = 'document-to-compliance') as document_to_compliance_events,
    COUNT(*) FILTER (WHERE type = 'voting-to-compliance') as voting_to_compliance_events,
    
    -- Success rates
    ROUND(
        COUNT(*) FILTER (WHERE status = 'completed')::DECIMAL / NULLIF(COUNT(*), 0) * 100, 2
    ) as success_rate_percent,
    
    -- Processing times
    AVG(
        EXTRACT(EPOCH FROM (completed_at - created_at))
    ) FILTER (WHERE completed_at IS NOT NULL AND status = 'completed') as avg_processing_time_seconds,
    
    -- Recent activity
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') as events_last_24_hours,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as events_last_7_days,
    
    -- Current status
    COUNT(*) FILTER (WHERE status = 'active') as active_events,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_events,
    
    MAX(created_at) as latest_event
FROM integration_events
GROUP BY organization_id;

-- =============================================
-- TRIGGERS FOR AUTOMATIC INTEGRATION
-- =============================================

-- Function: Handle meeting actionable changes
CREATE OR REPLACE FUNCTION handle_meeting_actionable_integration()
RETURNS TRIGGER AS $$
BEGIN
    -- Create integration event for actionable updates
    IF TG_OP = 'UPDATE' THEN
        -- Check if status changed to completed
        IF OLD.status != NEW.status AND NEW.status = 'completed' THEN
            -- Trigger AI analysis for completed actionables
            INSERT INTO integration_events (
                id, type, source_feature, target_feature, organization_id, user_id,
                data, metadata
            ) VALUES (
                'meeting_actionable_completed_' || NEW.id || '_' || EXTRACT(EPOCH FROM NOW()),
                'meeting-to-ai',
                'meetings',
                'ai',
                (SELECT organization_id FROM meetings WHERE id = NEW.meeting_id),
                NEW.updated_by,
                jsonb_build_object(
                    'actionable_id', NEW.id,
                    'meeting_id', NEW.meeting_id,
                    'status', NEW.status,
                    'completion_notes', NEW.completion_notes
                ),
                jsonb_build_object(
                    'priority', 'medium',
                    'auto_triggered', true,
                    'trigger_event', 'actionable_completed'
                )
            );
            
            -- Create compliance record if not exists
            IF NEW.compliance_record_id IS NULL THEN
                INSERT INTO compliance_integration_records (
                    id, organization_id, type, source_feature, source_resource_id,
                    status, validation_results
                ) VALUES (
                    'compliance_actionable_' || NEW.id || '_' || EXTRACT(EPOCH FROM NOW()),
                    (SELECT organization_id FROM meetings WHERE id = NEW.meeting_id),
                    'actionable_compliance',
                    'meetings',
                    NEW.id::text,
                    'pending',
                    jsonb_build_object('auto_created', true)
                ) RETURNING id INTO NEW.compliance_record_id;
            END IF;
        END IF;
        
        -- Update integration status
        IF OLD.status != NEW.status OR OLD.assigned_to != NEW.assigned_to OR OLD.due_date != NEW.due_date THEN
            NEW.integration_status = 'pending';
            NEW.cross_feature_metadata = NEW.cross_feature_metadata || jsonb_build_object(
                'last_sync_trigger', NOW(),
                'sync_reason', 'field_change'
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Meeting actionables integration
DROP TRIGGER IF EXISTS trigger_meeting_actionable_integration ON meeting_actionables;
CREATE TRIGGER trigger_meeting_actionable_integration
    BEFORE UPDATE ON meeting_actionables
    FOR EACH ROW EXECUTE FUNCTION handle_meeting_actionable_integration();

-- Function: Handle document collaboration integration
CREATE OR REPLACE FUNCTION handle_document_collaboration_integration()
RETURNS TRIGGER AS $$
DECLARE
    compliance_impact_level TEXT := 'none';
    requires_ai_analysis BOOLEAN := FALSE;
BEGIN
    -- Determine compliance impact based on operation type
    CASE NEW.operation_type
        WHEN 'delete' THEN 
            compliance_impact_level := 'significant';
            requires_ai_analysis := TRUE;
        WHEN 'insert' THEN
            -- Check content size - large insertions may need review
            IF (NEW.metadata->>'content_length')::INTEGER > 1000 THEN
                compliance_impact_level := 'minor';
                requires_ai_analysis := TRUE;
            END IF;
        WHEN 'format' THEN
            compliance_impact_level := 'minor';
    END CASE;
    
    -- Insert integration record
    INSERT INTO document_collaboration_integration (
        session_id, document_id, organization_id, operation_id, operation_type,
        compliance_impact, ai_analysis_requested, metadata
    ) VALUES (
        NEW.session_id,
        NEW.document_id,
        NEW.organization_id,
        NEW.id::text,
        NEW.operation_type,
        compliance_impact_level,
        requires_ai_analysis,
        jsonb_build_object(
            'operation_timestamp', NOW(),
            'auto_created', true,
            'compliance_rules_applied', true
        )
    );
    
    -- Create integration event if significant impact
    IF compliance_impact_level IN ('significant', 'critical') THEN
        INSERT INTO integration_events (
            id, type, source_feature, target_feature, organization_id,
            data, metadata
        ) VALUES (
            'document_collaboration_' || NEW.id || '_' || EXTRACT(EPOCH FROM NOW()),
            'document-to-compliance',
            'documents',
            'compliance',
            NEW.organization_id,
            jsonb_build_object(
                'session_id', NEW.session_id,
                'document_id', NEW.document_id,
                'operation_type', NEW.operation_type,
                'compliance_impact', compliance_impact_level
            ),
            jsonb_build_object(
                'priority', CASE 
                    WHEN compliance_impact_level = 'critical' THEN 'critical'
                    WHEN compliance_impact_level = 'significant' THEN 'high'
                    ELSE 'medium'
                END,
                'auto_triggered', true
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: This trigger would be applied to a document operations table
-- For now, we'll create a placeholder comment as the exact table structure may vary
-- CREATE TRIGGER trigger_document_collaboration_integration
--     AFTER INSERT ON document_operations
--     FOR EACH ROW EXECUTE FUNCTION handle_document_collaboration_integration();

-- Function: Handle AI insights integration
CREATE OR REPLACE FUNCTION handle_ai_insights_integration()
RETURNS TRIGGER AS $$
BEGIN
    -- When AI insights are completed, create integration events for target features
    IF TG_OP = 'UPDATE' AND OLD.status != 'completed' AND NEW.status = 'completed' THEN
        -- Create integration events for each target feature
        INSERT INTO integration_events (
            id, type, source_feature, target_feature, organization_id,
            data, metadata
        )
        SELECT 
            'ai_insights_ready_' || NEW.id || '_' || target_feature || '_' || EXTRACT(EPOCH FROM NOW()),
            'ai-to-' || target_feature,
            'ai',
            target_feature,
            NEW.organization_id,
            jsonb_build_object(
                'insights_id', NEW.id,
                'analysis_type', NEW.analysis_type,
                'source_resource_id', NEW.source_resource_id,
                'confidence_score', NEW.confidence_score,
                'insights', NEW.insights,
                'action_items', NEW.action_items,
                'recommendations', NEW.recommendations
            ),
            jsonb_build_object(
                'priority', CASE 
                    WHEN NEW.confidence_score >= 0.8 THEN 'high'
                    WHEN NEW.confidence_score >= 0.6 THEN 'medium'
                    ELSE 'low'
                END,
                'auto_triggered', true,
                'trigger_event', 'insights_completed'
            )
        FROM unnest(NEW.target_features) AS target_feature
        WHERE target_feature != NEW.source_feature;
        
        -- Create actionables from high-confidence AI recommendations
        IF NEW.confidence_score >= 0.7 AND jsonb_array_length(NEW.action_items) > 0 THEN
            INSERT INTO cross_feature_relationships (
                organization_id, source_feature, source_resource_id,
                target_feature, target_resource_id, relationship_type, strength
            ) VALUES (
                NEW.organization_id,
                'ai',
                NEW.id,
                'meetings', 
                'pending_actionables',
                'generates',
                NEW.confidence_score
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: AI insights integration
DROP TRIGGER IF EXISTS trigger_ai_insights_integration ON ai_insights_integration;
CREATE TRIGGER trigger_ai_insights_integration
    AFTER UPDATE ON ai_insights_integration
    FOR EACH ROW EXECUTE FUNCTION handle_ai_insights_integration();

-- =============================================
-- PERFORMANCE OPTIMIZATION INDEXES
-- =============================================

-- Composite indexes for common cross-feature queries
CREATE INDEX IF NOT EXISTS idx_integration_events_org_status_type 
ON integration_events(organization_id, status, type);

CREATE INDEX IF NOT EXISTS idx_integration_events_created_at_status 
ON integration_events(created_at DESC, status) 
WHERE status IN ('active', 'failed');

CREATE INDEX IF NOT EXISTS idx_cross_feature_relationships_composite
ON cross_feature_relationships(organization_id, source_feature, target_feature, relationship_type);

CREATE INDEX IF NOT EXISTS idx_compliance_integration_records_composite
ON compliance_integration_records(organization_id, type, status, created_at DESC);

-- Partial indexes for active/pending records
CREATE INDEX IF NOT EXISTS idx_integration_events_active
ON integration_events(organization_id, created_at DESC)
WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_ai_insights_processing
ON ai_insights_integration(organization_id, analysis_type, created_at DESC)
WHERE status IN ('pending', 'processing');

-- =============================================
-- DATA CLEANUP PROCEDURES
-- =============================================

-- Function: Clean up old integration events
CREATE OR REPLACE FUNCTION cleanup_integration_events(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete completed integration events older than retention period
    DELETE FROM integration_events 
    WHERE status = 'completed' 
    AND created_at < NOW() - (retention_days || ' days')::INTERVAL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function: Archive old cross-feature relationships
CREATE OR REPLACE FUNCTION archive_old_relationships(archive_days INTEGER DEFAULT 180)
RETURNS INTEGER AS $$
DECLARE
    archived_count INTEGER;
BEGIN
    -- Create archive table if it doesn't exist
    CREATE TABLE IF NOT EXISTS cross_feature_relationships_archive (
        LIKE cross_feature_relationships INCLUDING ALL
    );
    
    -- Move old relationships to archive
    WITH archived_relationships AS (
        DELETE FROM cross_feature_relationships
        WHERE updated_at < NOW() - (archive_days || ' days')::INTERVAL
        AND relationship_type NOT IN ('depends_on', 'validates') -- Keep critical relationships
        RETURNING *
    )
    INSERT INTO cross_feature_relationships_archive 
    SELECT * FROM archived_relationships;
    
    GET DIAGNOSTICS archived_count = ROW_COUNT;
    
    RETURN archived_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- INITIAL DATA AND CONFIGURATION
-- =============================================

-- Insert default cross-feature relationship types configuration
INSERT INTO app_settings (organization_id, category, key, value, description) 
VALUES 
    (NULL, 'integration', 'auto_sync_enabled', 'true', 'Enable automatic cross-feature synchronization'),
    (NULL, 'integration', 'max_retry_attempts', '3', 'Maximum retry attempts for failed integrations'),
    (NULL, 'integration', 'sync_batch_size', '50', 'Maximum events to process in a single batch'),
    (NULL, 'integration', 'ai_confidence_threshold', '0.7', 'Minimum confidence score for AI-triggered actions'),
    (NULL, 'integration', 'cleanup_retention_days', '90', 'Days to retain completed integration events')
ON CONFLICT (organization_id, category, key) DO NOTHING;

COMMIT;

-- =============================================
-- VERIFICATION QUERIES
-- =============================================

-- Verify tables were created
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'integration_events') THEN
        RAISE EXCEPTION 'integration_events table was not created';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cross_feature_relationships') THEN
        RAISE EXCEPTION 'cross_feature_relationships table was not created';
    END IF;
    
    RAISE NOTICE 'Cross-feature integration schema created successfully';
END $$;