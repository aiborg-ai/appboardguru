-- Migration: Dashboard Statistics System
-- Description: Creates user dashboard metrics, activity tracking, and recommendations system

-- UP MIGRATION

-- Daily snapshots for tracking changes over time
CREATE TABLE IF NOT EXISTS user_dashboard_snapshots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Core metrics
    board_packs_count INTEGER NOT NULL DEFAULT 0,
    accessible_files_count INTEGER NOT NULL DEFAULT 0,
    ai_insights_count INTEGER NOT NULL DEFAULT 0,
    
    -- Organization context
    org_active_users_count INTEGER NOT NULL DEFAULT 0,
    org_total_members INTEGER NOT NULL DEFAULT 0,
    
    -- Engagement metrics
    user_actions_count INTEGER NOT NULL DEFAULT 0,
    documents_viewed INTEGER NOT NULL DEFAULT 0,
    searches_performed INTEGER NOT NULL DEFAULT 0,
    
    -- AI/ML metrics (cached expensive calculations)
    governance_alerts_count INTEGER NOT NULL DEFAULT 0,
    compliance_score DECIMAL(5,2),
    risk_assessment_score DECIMAL(5,2),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(user_id, organization_id, snapshot_date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_dashboard_snapshots_user_date ON user_dashboard_snapshots(user_id, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_dashboard_snapshots_org_date ON user_dashboard_snapshots(organization_id, snapshot_date DESC);

-- Activity tracking for recent activity feed
CREATE TABLE IF NOT EXISTS user_activity_feed (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Activity details
    activity_type VARCHAR(50) NOT NULL, -- 'search', 'upload', 'view', 'generate_report', etc.
    activity_title VARCHAR(200) NOT NULL,
    activity_description TEXT,
    
    -- Context
    resource_type VARCHAR(50), -- 'board_pack', 'document', 'report', etc.
    resource_id UUID,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Index for performance (partition-ready)
    CONSTRAINT activity_feed_created_at_check CHECK (created_at >= '2025-01-01')
);

-- Indexes for activity feed
CREATE INDEX IF NOT EXISTS idx_activity_feed_user_time ON user_activity_feed(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_feed_org_time ON user_activity_feed(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_feed_type ON user_activity_feed(activity_type, created_at DESC);

-- User recommendations cache
CREATE TABLE IF NOT EXISTS user_recommendations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Recommendation details
    recommendation_type VARCHAR(50) NOT NULL, -- 'feature', 'content', 'action', etc.
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    action_url VARCHAR(500),
    
    -- Prioritization
    priority INTEGER NOT NULL DEFAULT 5, -- 1-10 scale
    relevance_score DECIMAL(5,3) DEFAULT 0.000,
    
    -- State management
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_dismissed BOOLEAN NOT NULL DEFAULT false,
    dismissed_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for recommendations
CREATE INDEX IF NOT EXISTS idx_recommendations_user_active ON user_recommendations(user_id, is_active, priority DESC) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_recommendations_relevance ON user_recommendations(relevance_score DESC, created_at DESC) WHERE is_active = true;

-- =============================================
-- Database Functions for Real-time Calculations
-- =============================================

-- Function to get current user dashboard metrics
CREATE OR REPLACE FUNCTION get_user_dashboard_metrics(input_user_id UUID, input_org_id UUID DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
    result JSONB := '{}';
    org_id UUID;
    board_packs_count INTEGER;
    files_count INTEGER;
    active_users_count INTEGER;
    ai_insights_count INTEGER;
BEGIN
    -- Get organization context
    IF input_org_id IS NULL THEN
        SELECT organization_id INTO org_id 
        FROM organization_members 
        WHERE user_id = input_user_id 
        AND status = 'active' 
        AND is_primary = true 
        LIMIT 1;
    ELSE
        org_id := input_org_id;
    END IF;

    -- Board Packs count (accessible to user)
    SELECT COUNT(*) INTO board_packs_count
    FROM board_packs bp
    LEFT JOIN board_pack_permissions bpp ON bp.id = bpp.board_pack_id
    WHERE (
        bp.uploaded_by = input_user_id 
        OR bp.organization_id = org_id
        OR (bpp.granted_to_user_id = input_user_id AND bpp.can_view = true)
        OR (bpp.organization_id = org_id AND bpp.granted_to_role IS NOT NULL)
    )
    AND bp.archived_at IS NULL;

    -- Files count (from board packs + direct file access)
    SELECT COUNT(*) INTO files_count
    FROM board_packs bp
    LEFT JOIN board_pack_permissions bpp ON bp.id = bpp.board_pack_id
    WHERE (
        bp.uploaded_by = input_user_id 
        OR bp.organization_id = org_id
        OR (bpp.granted_to_user_id = input_user_id AND bpp.can_view = true)
        OR (bpp.organization_id = org_id AND bpp.granted_to_role IS NOT NULL)
    )
    AND bp.archived_at IS NULL
    AND bp.status = 'ready';

    -- Active users in organization (last 7 days)
    SELECT COUNT(DISTINCT om.user_id) INTO active_users_count
    FROM organization_members om
    WHERE om.organization_id = org_id
    AND om.status = 'active'
    AND om.last_accessed >= NOW() - INTERVAL '7 days';

    -- AI Insights count (placeholder - adjust based on your AI features)
    SELECT COUNT(*) INTO ai_insights_count
    FROM audit_logs al
    WHERE al.user_id = input_user_id
    AND al.event_category LIKE '%ai%'
    AND al.created_at >= NOW() - INTERVAL '30 days';

    -- Build result JSON
    result := jsonb_build_object(
        'board_packs_count', board_packs_count,
        'files_count', files_count,
        'active_users_count', active_users_count,
        'ai_insights_count', ai_insights_count,
        'organization_id', org_id,
        'calculated_at', NOW()
    );

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get dashboard changes (vs previous period)
CREATE OR REPLACE FUNCTION get_user_dashboard_changes(input_user_id UUID, input_org_id UUID DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
    current_snapshot RECORD;
    previous_snapshot RECORD;
    result JSONB := '{}';
    org_id UUID;
BEGIN
    -- Get organization context
    IF input_org_id IS NULL THEN
        SELECT organization_id INTO org_id 
        FROM organization_members 
        WHERE user_id = input_user_id 
        AND status = 'active' 
        AND is_primary = true 
        LIMIT 1;
    ELSE
        org_id := input_org_id;
    END IF;

    -- Get today's snapshot
    SELECT * INTO current_snapshot
    FROM user_dashboard_snapshots
    WHERE user_id = input_user_id
    AND organization_id = org_id
    AND snapshot_date = CURRENT_DATE;

    -- Get previous snapshot (yesterday or latest available)
    SELECT * INTO previous_snapshot
    FROM user_dashboard_snapshots
    WHERE user_id = input_user_id
    AND organization_id = org_id
    AND snapshot_date < CURRENT_DATE
    ORDER BY snapshot_date DESC
    LIMIT 1;

    -- Calculate changes
    IF current_snapshot IS NOT NULL AND previous_snapshot IS NOT NULL THEN
        result := jsonb_build_object(
            'board_packs_change', current_snapshot.board_packs_count - previous_snapshot.board_packs_count,
            'files_change', current_snapshot.accessible_files_count - previous_snapshot.accessible_files_count,
            'ai_insights_change', current_snapshot.ai_insights_count - previous_snapshot.ai_insights_count,
            'active_users_change', current_snapshot.org_active_users_count - previous_snapshot.org_active_users_count,
            'period', 'daily'
        );
    ELSE
        result := jsonb_build_object(
            'board_packs_change', 0,
            'files_change', 0,
            'ai_insights_change', 0,
            'active_users_change', 0,
            'period', 'no_data'
        );
    END IF;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Trigger Functions for Auto-Updates
-- =============================================

-- Function to log user activity
CREATE OR REPLACE FUNCTION log_user_activity(
    p_user_id UUID,
    p_organization_id UUID,
    p_activity_type VARCHAR(50),
    p_activity_title VARCHAR(200),
    p_activity_description TEXT DEFAULT NULL,
    p_resource_type VARCHAR(50) DEFAULT NULL,
    p_resource_id UUID DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
    activity_id UUID;
BEGIN
    INSERT INTO user_activity_feed (
        user_id, organization_id, activity_type, activity_title, 
        activity_description, resource_type, resource_id, metadata
    ) VALUES (
        p_user_id, p_organization_id, p_activity_type, p_activity_title,
        p_activity_description, p_resource_type, p_resource_id, p_metadata
    ) RETURNING id INTO activity_id;

    RETURN activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update daily snapshots
CREATE OR REPLACE FUNCTION update_user_dashboard_snapshot(input_user_id UUID, input_org_id UUID)
RETURNS VOID AS $$
DECLARE
    current_metrics JSONB;
BEGIN
    -- Get current metrics
    current_metrics := get_user_dashboard_metrics(input_user_id, input_org_id);

    -- Insert or update today's snapshot
    INSERT INTO user_dashboard_snapshots (
        user_id, organization_id, snapshot_date,
        board_packs_count, accessible_files_count, ai_insights_count,
        org_active_users_count, updated_at
    ) VALUES (
        input_user_id, input_org_id, CURRENT_DATE,
        (current_metrics->>'board_packs_count')::INTEGER,
        (current_metrics->>'files_count')::INTEGER,
        (current_metrics->>'ai_insights_count')::INTEGER,
        (current_metrics->>'active_users_count')::INTEGER,
        NOW()
    )
    ON CONFLICT (user_id, organization_id, snapshot_date)
    DO UPDATE SET
        board_packs_count = EXCLUDED.board_packs_count,
        accessible_files_count = EXCLUDED.accessible_files_count,
        ai_insights_count = EXCLUDED.ai_insights_count,
        org_active_users_count = EXCLUDED.org_active_users_count,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Row Level Security (RLS)
-- =============================================

-- Enable RLS on all dashboard tables
ALTER TABLE user_dashboard_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_recommendations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for dashboard snapshots
CREATE POLICY "Users can view own dashboard snapshots" ON user_dashboard_snapshots
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own dashboard snapshots" ON user_dashboard_snapshots
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own dashboard snapshots" ON user_dashboard_snapshots
    FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for activity feed
CREATE POLICY "Users can view own activity feed" ON user_activity_feed
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activity" ON user_activity_feed
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for recommendations
CREATE POLICY "Users can view own recommendations" ON user_recommendations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own recommendations" ON user_recommendations
    FOR UPDATE USING (auth.uid() = user_id);

-- =============================================
-- Sample Data and Initial Setup
-- =============================================

-- Add some sample recommendations
INSERT INTO user_recommendations (user_id, organization_id, recommendation_type, title, description, action_url, priority)
SELECT 
    u.id,
    om.organization_id,
    'feature',
    'Try AI Board Pack Generator',
    'Generate board materials 10x faster',
    '/features/ai-generator',
    9
FROM users u
JOIN organization_members om ON u.id = om.user_id
WHERE u.status = 'approved'
ON CONFLICT DO NOTHING;

INSERT INTO user_recommendations (user_id, organization_id, recommendation_type, title, description, action_url, priority)
SELECT 
    u.id,
    om.organization_id,
    'feature',
    'Explore New ESG Features',
    '7 new sustainability datasets available',
    '/features/esg',
    7
FROM users u
JOIN organization_members om ON u.id = om.user_id
WHERE u.status = 'approved'
ON CONFLICT DO NOTHING;

-- DOWN MIGRATION

-- Drop sample data
DELETE FROM user_recommendations WHERE recommendation_type IN ('feature');

-- Drop functions
DROP FUNCTION IF EXISTS update_user_dashboard_snapshot(UUID, UUID);
DROP FUNCTION IF EXISTS log_user_activity(UUID, UUID, VARCHAR(50), VARCHAR(200), TEXT, VARCHAR(50), UUID, JSONB);
DROP FUNCTION IF EXISTS get_user_dashboard_changes(UUID, UUID);
DROP FUNCTION IF EXISTS get_user_dashboard_metrics(UUID, UUID);

-- Drop policies
DROP POLICY IF EXISTS "Users can update own recommendations" ON user_recommendations;
DROP POLICY IF EXISTS "Users can view own recommendations" ON user_recommendations;
DROP POLICY IF EXISTS "Users can insert own activity" ON user_activity_feed;
DROP POLICY IF EXISTS "Users can view own activity feed" ON user_activity_feed;
DROP POLICY IF EXISTS "Users can update own dashboard snapshots" ON user_dashboard_snapshots;
DROP POLICY IF EXISTS "Users can insert own dashboard snapshots" ON user_dashboard_snapshots;
DROP POLICY IF EXISTS "Users can view own dashboard snapshots" ON user_dashboard_snapshots;

-- Drop tables
DROP TABLE IF EXISTS user_recommendations;
DROP TABLE IF EXISTS user_activity_feed;
DROP TABLE IF EXISTS user_dashboard_snapshots;