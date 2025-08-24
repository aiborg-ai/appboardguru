-- =============================================
-- Enhanced Cross-Feature Integration Views and Triggers
-- Adds advanced database views, relationships, and triggers
-- for seamless integration between all 4 enterprise features
-- =============================================

BEGIN;

-- =============================================
-- INTEGRATION WORKFLOW TRACKING
-- =============================================

CREATE TABLE IF NOT EXISTS integration_workflows (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN (
        'meeting-ai-compliance-workflow',
        'document-compliance-ai-workflow', 
        'voting-compliance-audit-workflow',
        'collaborative-meeting-workflow',
        'ai-enhanced-document-workflow',
        'cross-feature-analytics-workflow'
    )),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    initiated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    steps JSONB NOT NULL DEFAULT '[]',
    current_step INTEGER NOT NULL DEFAULT 0,
    results JSONB DEFAULT '{}',
    errors JSONB DEFAULT '[]',
    error_message TEXT,
    metadata JSONB NOT NULL DEFAULT '{}',
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Indexes for performance
    INDEX idx_integration_workflows_organization_id (organization_id),
    INDEX idx_integration_workflows_type (type),
    INDEX idx_integration_workflows_status (status),
    INDEX idx_integration_workflows_started_at (started_at DESC)
);

-- =============================================
-- COMPREHENSIVE CROSS-FEATURE VIEWS
-- =============================================

-- View: Meeting with AI Insights and Compliance Status
CREATE OR REPLACE VIEW meeting_ai_compliance_view AS
SELECT 
    m.id as meeting_id,
    m.title,
    m.scheduled_start,
    m.scheduled_end,
    m.status as meeting_status,
    m.organization_id,
    
    -- Meeting workflow data
    mw.id as workflow_id,
    mw.current_stage as workflow_stage,
    mw.status as workflow_status,
    mw.progress_percentage,
    mw.quorum_achieved,
    mw.active_voting_session,
    
    -- AI transcription and insights
    amt.id as transcription_id,
    amt.status as transcription_status,
    amt.summary as ai_summary,
    amt.key_topics,
    amt.action_items as ai_action_items,
    amt.decisions as ai_decisions,
    
    -- Meeting insights
    ami.effectiveness_score,
    ami.engagement_metrics,
    ami.productivity_metrics,
    
    -- Action items with compliance tracking
    (
        SELECT json_agg(json_build_object(
            'id', ma.id,
            'title', ma.title,
            'status', ma.status,
            'assigned_to', ma.assigned_to,
            'due_date', ma.due_date,
            'compliance_record_id', ma.compliance_record_id,
            'ai_insights_id', ma.ai_insights_id,
            'integration_status', ma.integration_status
        ))
        FROM meeting_actionables ma
        WHERE ma.meeting_id = m.id
    ) as actionables,
    
    -- Voting sessions and compliance
    (
        SELECT json_agg(json_build_object(
            'id', mvs.id,
            'session_name', mvs.session_name,
            'status', mvs.status,
            'voting_method', mvs.voting_method,
            'quorum_achieved', mvs.quorum_achieved,
            'session_passed', mvs.session_passed,
            'votes_for', mvs.votes_for,
            'votes_against', mvs.votes_against,
            'votes_abstain', mvs.votes_abstain
        ))
        FROM meeting_voting_sessions mvs
        WHERE mvs.meeting_id = m.id
    ) as voting_sessions,
    
    -- Compliance assessments
    (
        SELECT json_agg(json_build_object(
            'id', ca.id,
            'status', ca.status,
            'overall_score', ca.overall_score,
            'findings_count', ca.findings_count,
            'critical_findings', ca.critical_findings
        ))
        FROM compliance_assessments ca
        WHERE ca.organization_id = m.organization_id
        AND ca.created_at >= m.scheduled_start - INTERVAL '1 day'
        AND ca.created_at <= COALESCE(m.scheduled_end, NOW()) + INTERVAL '1 day'
    ) as compliance_assessments,
    
    -- Integration events
    (
        SELECT COUNT(*)
        FROM integration_events ie
        WHERE ie.organization_id = m.organization_id
        AND ie.data::text LIKE '%' || m.id || '%'
    ) as integration_events_count,
    
    m.created_at,
    m.updated_at
FROM meetings m
LEFT JOIN meeting_workflows mw ON m.id = mw.meeting_id
LEFT JOIN ai_meeting_transcriptions amt ON m.id = amt.meeting_id
LEFT JOIN ai_meeting_insights ami ON amt.id = ami.transcription_id;

-- View: Document Collaboration with Compliance and AI Analysis
CREATE OR REPLACE VIEW document_collaboration_compliance_view AS
SELECT 
    a.id as document_id,
    a.name as document_name,
    a.category,
    a.organization_id,
    
    -- Collaboration session data
    dcs.id as session_id,
    dcs.session_type,
    dcs.is_active,
    dcs.max_participants,
    dcs.ai_enabled,
    dcs.quality_gate_enabled,
    dcs.last_activity,
    
    -- Current participants and presence
    (
        SELECT COUNT(*)
        FROM document_presence dp
        WHERE dp.session_id = dcs.id
        AND dp.left_at IS NULL
    ) as active_participants,
    
    -- Operations and changes
    (
        SELECT COUNT(*)
        FROM document_operations do_count
        WHERE do_count.session_id = dcs.id
    ) as total_operations,
    
    (
        SELECT COUNT(*)
        FROM document_operations do_recent
        WHERE do_recent.session_id = dcs.id
        AND do_recent.created_at >= NOW() - INTERVAL '1 hour'
    ) as recent_operations,
    
    -- Comments and collaboration
    (
        SELECT COUNT(*)
        FROM collaborative_comments cc
        WHERE cc.session_id = dcs.id
        AND cc.status = 'open'
    ) as open_comments,
    
    -- Suggestions and track changes
    (
        SELECT COUNT(*)
        FROM document_suggestions ds
        WHERE ds.session_id = dcs.id
        AND ds.status = 'pending'
    ) as pending_suggestions,
    
    -- Version control and branching
    (
        SELECT json_agg(json_build_object(
            'id', db.id,
            'name', db.name,
            'status', db.status,
            'is_protected', db.is_protected,
            'last_commit_id', db.last_commit_id
        ))
        FROM document_branches db
        WHERE db.document_id = a.id
    ) as branches,
    
    -- Compliance integration
    (
        SELECT json_build_object(
            'total_operations', COUNT(*),
            'compliance_relevant_operations', COUNT(*) FILTER (WHERE dci.compliance_impact != 'none'),
            'compliance_passed', COUNT(*) FILTER (WHERE dci.compliance_check_status = 'passed'),
            'compliance_failed', COUNT(*) FILTER (WHERE dci.compliance_check_status = 'failed'),
            'ai_analysis_requested', COUNT(*) FILTER (WHERE dci.ai_analysis_requested = TRUE),
            'overall_status', CASE 
                WHEN COUNT(*) FILTER (WHERE dci.compliance_check_status = 'failed') > 0 THEN 'non_compliant'
                WHEN COUNT(*) FILTER (WHERE dci.compliance_check_status = 'pending') > 0 THEN 'review_required'
                WHEN COUNT(*) FILTER (WHERE dci.compliance_impact != 'none') = 0 THEN 'not_applicable'
                ELSE 'compliant'
            END
        )
        FROM document_collaboration_integration dci
        WHERE dci.session_id = dcs.id::text
    ) as compliance_status,
    
    -- AI insights
    (
        SELECT json_agg(json_build_object(
            'id', aii.id,
            'analysis_type', aii.analysis_type,
            'status', aii.status,
            'confidence_score', aii.confidence_score,
            'insights', aii.insights,
            'recommendations', aii.recommendations
        ))
        FROM ai_insights_integration aii
        WHERE aii.source_resource_id = a.id::text
        AND aii.analysis_type = 'document_analysis'
    ) as ai_insights,
    
    dcs.created_at,
    dcs.updated_at
FROM assets a
LEFT JOIN document_collaboration_sessions dcs ON a.id::text = dcs.document_id
WHERE a.category IN ('document', 'pdf', 'text');

-- View: Voting Sessions with Compliance and Audit Trail
CREATE OR REPLACE VIEW voting_compliance_audit_view AS
SELECT 
    mvs.id as voting_session_id,
    mvs.session_name,
    mvs.meeting_id,
    mvs.status,
    mvs.voting_method,
    mvs.anonymity_level,
    
    -- Voting results
    mvs.votes_for,
    mvs.votes_against,
    mvs.votes_abstain,
    mvs.total_votes,
    mvs.quorum_achieved,
    mvs.session_passed,
    mvs.pass_threshold,
    mvs.actual_pass_percentage,
    
    -- Participation metrics
    mvs.eligible_voters_count,
    mvs.actual_voters_count,
    mvs.proxy_votes_count,
    
    -- Individual votes with proxy information
    (
        SELECT json_agg(json_build_object(
            'id', mv.id,
            'voter_user_id', mv.voter_user_id,
            'vote_choice', mv.vote_choice,
            'vote_weight', mv.vote_weight,
            'anonymity_level', mv.anonymity_level,
            'proxy_id', mv.proxy_id,
            'voting_as_proxy_for', mv.voting_as_proxy_for,
            'vote_timestamp', mv.vote_timestamp
        ))
        FROM meeting_votes mv
        WHERE mv.meeting_id = mvs.meeting_id
    ) as individual_votes,
    
    -- Proxy information
    (
        SELECT json_agg(json_build_object(
            'id', mp.id,
            'grantor_user_id', mp.grantor_user_id,
            'proxy_holder_user_id', mp.proxy_holder_user_id,
            'proxy_type', mp.proxy_type,
            'status', mp.status,
            'voting_weight', mp.voting_weight,
            'effective_from', mp.effective_from,
            'effective_until', mp.effective_until
        ))
        FROM meeting_proxies mp
        WHERE mp.meeting_id = mvs.meeting_id
        AND mp.status = 'active'
    ) as active_proxies,
    
    -- Compliance records
    (
        SELECT json_agg(json_build_object(
            'id', cir.id,
            'type', cir.type,
            'status', cir.status,
            'validation_results', cir.validation_results,
            'remediation_actions', cir.remediation_actions,
            'validated_at', cir.validated_at
        ))
        FROM compliance_integration_records cir
        WHERE cir.source_resource_id = mvs.id::text
        AND cir.type = 'meeting_voting'
    ) as compliance_records,
    
    -- Audit logs
    (
        SELECT COUNT(*)
        FROM audit_logs al
        WHERE al.resource_type = 'meeting_votes'
        AND al.metadata::text LIKE '%' || mvs.id || '%'
    ) as audit_entries_count,
    
    -- Meeting context
    m.title as meeting_title,
    m.organization_id,
    m.scheduled_start as meeting_start,
    
    mvs.created_at,
    mvs.updated_at
FROM meeting_voting_sessions mvs
JOIN meetings m ON mvs.meeting_id = m.id;

-- View: AI Insights Cross-Feature Impact (Enhanced)
CREATE OR REPLACE VIEW ai_insights_cross_feature_impact_enhanced AS
SELECT 
    aii.id as insights_id,
    aii.organization_id,
    aii.analysis_type,
    aii.source_feature,
    aii.source_resource_id,
    aii.target_features,
    aii.status,
    aii.confidence_score,
    aii.insights,
    aii.action_items,
    aii.recommendations,
    
    -- Meeting actionables created from insights
    (
        SELECT json_agg(json_build_object(
            'id', ma.id,
            'title', ma.title,
            'status', ma.status,
            'assigned_to', ma.assigned_to,
            'due_date', ma.due_date
        ))
        FROM meeting_actionables ma
        WHERE ma.ai_insights_id = aii.id
    ) as created_actionables,
    
    -- Compliance records triggered
    (
        SELECT json_agg(json_build_object(
            'id', cir.id,
            'type', cir.type,
            'status', cir.status,
            'validation_results', cir.validation_results
        ))
        FROM compliance_integration_records cir
        WHERE cir.source_feature = 'ai'
        AND cir.source_resource_id = aii.id
    ) as compliance_records,
    
    -- Document reviews initiated
    (
        SELECT COUNT(*)
        FROM document_collaboration_integration dci
        WHERE dci.ai_analysis_requested = TRUE
        AND dci.metadata::text LIKE '%' || aii.id || '%'
    ) as document_reviews_initiated,
    
    -- Cross-feature relationships
    (
        SELECT json_agg(json_build_object(
            'target_feature', cfr.target_feature,
            'target_resource_id', cfr.target_resource_id,
            'relationship_type', cfr.relationship_type,
            'strength', cfr.strength,
            'metadata', cfr.metadata
        ))
        FROM cross_feature_relationships cfr
        WHERE cfr.source_feature = 'ai'
        AND cfr.source_resource_id = aii.id
    ) as feature_relationships,
    
    -- Integration events
    (
        SELECT COUNT(*)
        FROM integration_events ie
        WHERE ie.data::text LIKE '%' || aii.id || '%'
        AND ie.status = 'completed'
    ) as integration_events_count,
    
    aii.created_at,
    aii.completed_at,
    aii.processing_started_at
FROM ai_insights_integration aii;

-- =============================================
-- MATERIALIZED VIEWS FOR PERFORMANCE
-- =============================================

-- Materialized View: Organization Cross-Feature Dashboard
CREATE MATERIALIZED VIEW IF NOT EXISTS organization_cross_feature_dashboard AS
SELECT 
    o.id as organization_id,
    o.name as organization_name,
    
    -- Meeting metrics
    (
        SELECT json_build_object(
            'total_meetings', COUNT(*),
            'active_meetings', COUNT(*) FILTER (WHERE m.status = 'in_progress'),
            'completed_meetings', COUNT(*) FILTER (WHERE m.status = 'completed'),
            'meetings_with_ai', COUNT(*) FILTER (WHERE EXISTS (
                SELECT 1 FROM ai_meeting_transcriptions amt WHERE amt.meeting_id = m.id
            )),
            'meetings_with_voting', COUNT(*) FILTER (WHERE EXISTS (
                SELECT 1 FROM meeting_voting_sessions mvs WHERE mvs.meeting_id = m.id
            ))
        )
        FROM meetings m
        WHERE m.organization_id = o.id
        AND m.created_at >= NOW() - INTERVAL '30 days'
    ) as meeting_metrics,
    
    -- Document collaboration metrics
    (
        SELECT json_build_object(
            'total_documents', COUNT(*),
            'active_sessions', COUNT(*) FILTER (WHERE dcs.is_active = true),
            'collaborative_documents', COUNT(*) FILTER (WHERE dcs.id IS NOT NULL),
            'compliance_checks', COUNT(*) FILTER (WHERE EXISTS (
                SELECT 1 FROM document_collaboration_integration dci 
                WHERE dci.document_id = a.id::text
            ))
        )
        FROM assets a
        LEFT JOIN document_collaboration_sessions dcs ON a.id::text = dcs.document_id
        WHERE a.organization_id = o.id
        AND a.category IN ('document', 'pdf', 'text')
    ) as document_metrics,
    
    -- Compliance metrics
    (
        SELECT json_build_object(
            'total_assessments', COUNT(*),
            'completed_assessments', COUNT(*) FILTER (WHERE ca.status = 'completed'),
            'compliance_violations', COUNT(*) FILTER (WHERE EXISTS (
                SELECT 1 FROM compliance_assessment_findings caf 
                WHERE caf.assessment_id = ca.id AND caf.severity IN ('high', 'critical')
            )),
            'average_compliance_score', COALESCE(AVG(ca.overall_score), 0)
        )
        FROM compliance_assessments ca
        WHERE ca.organization_id = o.id
        AND ca.created_at >= NOW() - INTERVAL '30 days'
    ) as compliance_metrics,
    
    -- AI insights metrics
    (
        SELECT json_build_object(
            'total_insights', COUNT(*),
            'completed_insights', COUNT(*) FILTER (WHERE aii.status = 'completed'),
            'average_confidence', COALESCE(AVG(aii.confidence_score), 0),
            'actionables_created', COALESCE(SUM((
                SELECT COUNT(*) FROM meeting_actionables ma 
                WHERE ma.ai_insights_id = aii.id
            )), 0)
        )
        FROM ai_insights_integration aii
        WHERE aii.organization_id = o.id
        AND aii.created_at >= NOW() - INTERVAL '30 days'
    ) as ai_metrics,
    
    -- Integration metrics
    (
        SELECT json_build_object(
            'total_events', COUNT(*),
            'successful_events', COUNT(*) FILTER (WHERE ie.status = 'completed'),
            'failed_events', COUNT(*) FILTER (WHERE ie.status = 'failed'),
            'active_workflows', (
                SELECT COUNT(*) FROM integration_workflows iw 
                WHERE iw.organization_id = o.id AND iw.status IN ('pending', 'running')
            )
        )
        FROM integration_events ie
        WHERE ie.organization_id = o.id
        AND ie.created_at >= NOW() - INTERVAL '7 days'
    ) as integration_metrics,
    
    NOW() as last_updated
FROM organizations o;

-- Create indexes on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_org_cross_feature_dashboard_org_id 
    ON organization_cross_feature_dashboard(organization_id);

-- =============================================
-- ADVANCED TRIGGERS FOR CROSS-FEATURE SYNC
-- =============================================

-- Trigger: Auto-create integration events for meeting actionable changes
CREATE OR REPLACE FUNCTION handle_meeting_actionable_cross_feature_sync()
RETURNS TRIGGER AS $$
DECLARE
    integration_event_id TEXT;
    org_id UUID;
BEGIN
    -- Get organization ID
    SELECT organization_id INTO org_id 
    FROM meetings 
    WHERE id = NEW.meeting_id;
    
    -- Create integration event for significant changes
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status != NEW.status) THEN
        integration_event_id := 'actionable_sync_' || NEW.id || '_' || EXTRACT(EPOCH FROM NOW());
        
        INSERT INTO integration_events (
            id, type, source_feature, target_feature, organization_id,
            user_id, data, metadata, status
        ) VALUES (
            integration_event_id,
            'cross-feature-sync',
            'meetings',
            'ai',
            org_id,
            NEW.updated_by,
            jsonb_build_object(
                'actionable_id', NEW.id,
                'meeting_id', NEW.meeting_id,
                'status', NEW.status,
                'operation', TG_OP
            ),
            jsonb_build_object(
                'auto_generated', true,
                'trigger_source', 'meeting_actionables'
            ),
            'active'
        );
        
        -- Update cross-feature relationships
        INSERT INTO cross_feature_relationships (
            organization_id, source_feature, source_resource_id,
            target_feature, target_resource_id, relationship_type, strength
        ) VALUES (
            org_id,
            'meetings',
            NEW.id::text,
            'ai',
            COALESCE(NEW.ai_insights_id, 'pending'),
            'generates',
            0.8
        ) ON CONFLICT (organization_id, source_feature, source_resource_id, target_feature, target_resource_id, relationship_type) 
        DO UPDATE SET strength = EXCLUDED.strength, updated_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_meeting_actionable_cross_feature_sync ON meeting_actionables;
CREATE TRIGGER trigger_meeting_actionable_cross_feature_sync
    AFTER INSERT OR UPDATE ON meeting_actionables
    FOR EACH ROW EXECUTE FUNCTION handle_meeting_actionable_cross_feature_sync();

-- Trigger: Auto-create compliance records for voting sessions
CREATE OR REPLACE FUNCTION handle_voting_session_compliance_sync()
RETURNS TRIGGER AS $$
DECLARE
    integration_event_id TEXT;
    compliance_record_id TEXT;
BEGIN
    -- Create compliance integration record when voting session completes
    IF TG_OP = 'UPDATE' AND OLD.status != 'completed' AND NEW.status = 'completed' THEN
        
        compliance_record_id := 'voting_compliance_' || NEW.id || '_' || EXTRACT(EPOCH FROM NOW());
        
        -- Create compliance record
        INSERT INTO compliance_integration_records (
            id, organization_id, type, source_feature, source_resource_id,
            status, validation_results, audit_trail
        ) VALUES (
            compliance_record_id,
            (SELECT organization_id FROM meetings WHERE id = NEW.meeting_id),
            'meeting_voting',
            'meetings',
            NEW.id::text,
            CASE 
                WHEN NEW.quorum_achieved AND NEW.session_passed THEN 'compliant'
                WHEN NOT NEW.quorum_achieved THEN 'non_compliant'
                ELSE 'review_required'
            END,
            jsonb_build_object(
                'quorum_achieved', NEW.quorum_achieved,
                'session_passed', NEW.session_passed,
                'total_votes', NEW.total_votes,
                'pass_percentage', NEW.actual_pass_percentage,
                'proxy_votes', NEW.proxy_votes_count
            ),
            jsonb_build_array(
                jsonb_build_object(
                    'timestamp', NOW(),
                    'action', 'voting_session_completed',
                    'details', jsonb_build_object(
                        'session_id', NEW.id,
                        'result', CASE WHEN NEW.session_passed THEN 'passed' ELSE 'failed' END
                    )
                )
            )
        );
        
        -- Create integration event
        integration_event_id := 'voting_compliance_sync_' || NEW.id || '_' || EXTRACT(EPOCH FROM NOW());
        
        INSERT INTO integration_events (
            id, type, source_feature, target_feature, organization_id,
            data, metadata, status
        ) VALUES (
            integration_event_id,
            'voting-to-compliance',
            'meetings',
            'compliance',
            (SELECT organization_id FROM meetings WHERE id = NEW.meeting_id),
            jsonb_build_object(
                'voting_session_id', NEW.id,
                'compliance_record_id', compliance_record_id,
                'quorum_achieved', NEW.quorum_achieved,
                'session_passed', NEW.session_passed
            ),
            jsonb_build_object(
                'auto_generated', true,
                'priority', 'critical'
            ),
            'active'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_voting_session_compliance_sync ON meeting_voting_sessions;
CREATE TRIGGER trigger_voting_session_compliance_sync
    AFTER UPDATE ON meeting_voting_sessions
    FOR EACH ROW EXECUTE FUNCTION handle_voting_session_compliance_sync();

-- Trigger: Auto-update AI insights when transcriptions complete
CREATE OR REPLACE FUNCTION handle_ai_transcription_insights_sync()
RETURNS TRIGGER AS $$
DECLARE
    integration_event_id TEXT;
    insights_id TEXT;
BEGIN
    -- Create AI insights integration when transcription completes
    IF TG_OP = 'UPDATE' AND OLD.status != 'completed' AND NEW.status = 'completed' THEN
        
        insights_id := 'meeting_insights_' || NEW.id || '_' || EXTRACT(EPOCH FROM NOW());
        
        -- Create AI insights record
        INSERT INTO ai_insights_integration (
            id, organization_id, analysis_type, source_feature, source_resource_id,
            target_features, status, insights, action_items, recommendations, confidence_score
        ) VALUES (
            insights_id,
            NEW.organization_id,
            'meeting_analysis',
            'ai',
            NEW.id,
            ARRAY['meetings', 'compliance'],
            'completed',
            jsonb_build_object(
                'summary', NEW.summary,
                'key_topics', NEW.key_topics,
                'speaker_analysis', COALESCE(NEW.speakers, '[]'::jsonb)
            ),
            NEW.action_items,
            jsonb_build_array(
                jsonb_build_object(
                    'type', 'follow_up_meeting',
                    'description', 'Schedule follow-up for unresolved action items',
                    'confidence', 0.75
                )
            ),
            0.85
        );
        
        -- Create integration event
        integration_event_id := 'ai_insights_ready_' || NEW.id || '_' || EXTRACT(EPOCH FROM NOW());
        
        INSERT INTO integration_events (
            id, type, source_feature, target_feature, organization_id,
            data, metadata, status
        ) VALUES (
            integration_event_id,
            'ai-to-meeting',
            'ai',
            'meetings',
            NEW.organization_id,
            jsonb_build_object(
                'transcription_id', NEW.id,
                'insights_id', insights_id,
                'meeting_id', NEW.meeting_id,
                'action_items_count', jsonb_array_length(COALESCE(NEW.action_items, '[]'::jsonb))
            ),
            jsonb_build_object(
                'auto_generated', true,
                'priority', 'medium'
            ),
            'active'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_ai_transcription_insights_sync ON ai_meeting_transcriptions;
CREATE TRIGGER trigger_ai_transcription_insights_sync
    AFTER UPDATE ON ai_meeting_transcriptions
    FOR EACH ROW EXECUTE FUNCTION handle_ai_transcription_insights_sync();

-- =============================================
-- FUNCTIONS FOR MATERIALIZED VIEW REFRESH
-- =============================================

-- Function to refresh all cross-feature materialized views
CREATE OR REPLACE FUNCTION refresh_cross_feature_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY organization_cross_feature_dashboard;
    
    -- Log refresh
    INSERT INTO integration_events (
        id, type, source_feature, target_feature, organization_id,
        data, metadata, status
    ) VALUES (
        'view_refresh_' || EXTRACT(EPOCH FROM NOW()),
        'cross-feature-sync',
        'system',
        'system',
        (SELECT id FROM organizations LIMIT 1), -- Default org for system events
        jsonb_build_object(
            'action', 'materialized_view_refresh',
            'views', ARRAY['organization_cross_feature_dashboard']
        ),
        jsonb_build_object(
            'auto_generated', true,
            'system_maintenance', true
        ),
        'completed'
    );
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- PERFORMANCE MONITORING FUNCTIONS
-- =============================================

-- Function to get cross-feature integration metrics
CREATE OR REPLACE FUNCTION get_cross_feature_integration_metrics(org_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'organization_id', org_id,
        'timestamp', NOW(),
        'integration_events', (
            SELECT json_build_object(
                'total', COUNT(*),
                'completed', COUNT(*) FILTER (WHERE status = 'completed'),
                'failed', COUNT(*) FILTER (WHERE status = 'failed'),
                'active', COUNT(*) FILTER (WHERE status = 'active'),
                'by_type', json_object_agg(type, type_count)
            )
            FROM (
                SELECT type, COUNT(*) as type_count
                FROM integration_events
                WHERE organization_id = org_id
                AND created_at >= NOW() - INTERVAL '24 hours'
                GROUP BY type
            ) type_counts
            CROSS JOIN integration_events
            WHERE integration_events.organization_id = org_id
            AND integration_events.created_at >= NOW() - INTERVAL '24 hours'
        ),
        'cross_feature_relationships', (
            SELECT json_build_object(
                'total', COUNT(*),
                'by_relationship_type', json_object_agg(relationship_type, rel_count)
            )
            FROM (
                SELECT relationship_type, COUNT(*) as rel_count
                FROM cross_feature_relationships
                WHERE organization_id = org_id
                GROUP BY relationship_type
            ) rel_counts
            CROSS JOIN cross_feature_relationships
            WHERE cross_feature_relationships.organization_id = org_id
        ),
        'active_workflows', (
            SELECT json_build_object(
                'total', COUNT(*),
                'by_type', json_object_agg(type, workflow_count),
                'average_completion_time', AVG(
                    EXTRACT(EPOCH FROM (completed_at - started_at))
                ) FILTER (WHERE completed_at IS NOT NULL AND status = 'completed')
            )
            FROM (
                SELECT type, COUNT(*) as workflow_count
                FROM integration_workflows
                WHERE organization_id = org_id
                AND started_at >= NOW() - INTERVAL '24 hours'
                GROUP BY type
            ) workflow_counts
            CROSS JOIN integration_workflows
            WHERE integration_workflows.organization_id = org_id
            AND integration_workflows.started_at >= NOW() - INTERVAL '24 hours'
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- CLEANUP AND MAINTENANCE
-- =============================================

-- Function to cleanup old integration data
CREATE OR REPLACE FUNCTION cleanup_cross_feature_integration_data(retention_days INTEGER DEFAULT 30)
RETURNS JSON AS $$
DECLARE
    deleted_events INTEGER;
    archived_workflows INTEGER;
    cleaned_relationships INTEGER;
    result JSON;
BEGIN
    -- Delete old completed integration events
    DELETE FROM integration_events 
    WHERE status = 'completed' 
    AND created_at < NOW() - (retention_days || ' days')::INTERVAL;
    GET DIAGNOSTICS deleted_events = ROW_COUNT;
    
    -- Archive old completed workflows
    WITH archived_workflow_ids AS (
        DELETE FROM integration_workflows
        WHERE status IN ('completed', 'failed')
        AND completed_at < NOW() - (retention_days || ' days')::INTERVAL
        RETURNING id
    )
    SELECT COUNT(*) INTO archived_workflows FROM archived_workflow_ids;
    
    -- Clean up stale cross-feature relationships
    DELETE FROM cross_feature_relationships
    WHERE updated_at < NOW() - (retention_days * 2 || ' days')::INTERVAL
    AND relationship_type NOT IN ('depends_on', 'validates'); -- Keep critical relationships
    GET DIAGNOSTICS cleaned_relationships = ROW_COUNT;
    
    -- Refresh materialized views after cleanup
    PERFORM refresh_cross_feature_views();
    
    SELECT json_build_object(
        'deleted_events', deleted_events,
        'archived_workflows', archived_workflows,
        'cleaned_relationships', cleaned_relationships,
        'cleanup_completed_at', NOW()
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- INITIAL DATA AND INDEXES
-- =============================================

-- Create additional performance indexes
CREATE INDEX IF NOT EXISTS idx_integration_workflows_org_status_type 
    ON integration_workflows(organization_id, status, type);

CREATE INDEX IF NOT EXISTS idx_integration_events_created_at_status 
    ON integration_events(created_at DESC, status) 
    WHERE status IN ('active', 'failed');

CREATE INDEX IF NOT EXISTS idx_cross_feature_relationships_strength
    ON cross_feature_relationships(strength DESC, updated_at DESC);

-- Insert system configuration for cross-feature integration
INSERT INTO app_settings (organization_id, category, key, value, description, metadata) 
VALUES 
    (NULL, 'integration', 'auto_workflow_enabled', 'true', 'Enable automatic cross-feature workflows', '{"system": true}'),
    (NULL, 'integration', 'materialized_view_refresh_interval', '300', 'Materialized view refresh interval in seconds', '{"system": true}'),
    (NULL, 'integration', 'integration_event_retention_days', '30', 'Days to retain integration events', '{"system": true}'),
    (NULL, 'integration', 'workflow_timeout_minutes', '60', 'Maximum workflow execution time in minutes', '{"system": true}'),
    (NULL, 'integration', 'performance_monitoring_enabled', 'true', 'Enable integration performance monitoring', '{"system": true}')
ON CONFLICT (organization_id, category, key) DO UPDATE SET
    value = EXCLUDED.value,
    updated_at = NOW();

COMMIT;

-- =============================================
-- VERIFICATION AND SUCCESS MESSAGE
-- =============================================

DO $$
BEGIN
    -- Verify all views were created
    IF NOT EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'meeting_ai_compliance_view') THEN
        RAISE EXCEPTION 'meeting_ai_compliance_view was not created';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'document_collaboration_compliance_view') THEN
        RAISE EXCEPTION 'document_collaboration_compliance_view was not created';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'organization_cross_feature_dashboard') THEN
        RAISE EXCEPTION 'organization_cross_feature_dashboard materialized view was not created';
    END IF;
    
    RAISE NOTICE '✓ Enhanced cross-feature integration views and triggers created successfully';
    RAISE NOTICE '✓ Automatic sync triggers enabled for all 4 enterprise features';
    RAISE NOTICE '✓ Performance monitoring and cleanup functions installed';
    RAISE NOTICE '✓ Materialized views created for dashboard performance';
END $$;