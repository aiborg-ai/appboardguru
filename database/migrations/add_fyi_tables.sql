-- FYI Insights Database Schema
-- This migration adds tables for caching external insights and user preferences

-- Table: fyi_insights_cache
-- Stores cached insights from external APIs to reduce API calls
CREATE TABLE IF NOT EXISTS fyi_insights_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    insight_id VARCHAR(255) NOT NULL UNIQUE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('news', 'competitor', 'industry', 'regulation', 'market')),
    title TEXT NOT NULL,
    summary TEXT,
    source VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    relevance_score DECIMAL(3,2) DEFAULT 0.50,
    context_entity VARCHAR(255),
    published_at TIMESTAMPTZ NOT NULL,
    tags TEXT[] DEFAULT '{}',
    raw_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT valid_relevance_score CHECK (relevance_score >= 0 AND relevance_score <= 1)
);

-- Table: fyi_user_preferences
-- Stores user preferences for FYI functionality
CREATE TABLE IF NOT EXISTS fyi_user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    enabled BOOLEAN DEFAULT true,
    default_relevance_threshold DECIMAL(3,2) DEFAULT 0.60,
    preferred_sources TEXT[] DEFAULT '{}',
    blocked_sources TEXT[] DEFAULT '{}',
    notification_enabled BOOLEAN DEFAULT true,
    auto_refresh_enabled BOOLEAN DEFAULT true,
    refresh_interval_minutes INTEGER DEFAULT 30,
    max_insights_displayed INTEGER DEFAULT 20,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, organization_id),
    CONSTRAINT valid_threshold CHECK (default_relevance_threshold >= 0 AND default_relevance_threshold <= 1),
    CONSTRAINT valid_refresh_interval CHECK (refresh_interval_minutes >= 5 AND refresh_interval_minutes <= 1440),
    CONSTRAINT valid_max_insights CHECK (max_insights_displayed >= 1 AND max_insights_displayed <= 100)
);

-- Table: fyi_user_interactions
-- Tracks user interactions with insights for improving relevance
CREATE TABLE IF NOT EXISTS fyi_user_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    insight_id VARCHAR(255) NOT NULL,
    action VARCHAR(50) NOT NULL CHECK (action IN ('view', 'click', 'share', 'dismiss', 'bookmark', 'report')),
    context_at_time TEXT,
    entities_at_time TEXT[],
    relevance_feedback DECIMAL(3,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_relevance_feedback CHECK (relevance_feedback IS NULL OR (relevance_feedback >= 0 AND relevance_feedback <= 1))
);

-- Table: fyi_context_history
-- Stores user's context history for better insight targeting
CREATE TABLE IF NOT EXISTS fyi_context_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    context_text TEXT NOT NULL,
    extracted_entities TEXT[] DEFAULT '{}',
    context_type VARCHAR(50) CHECK (context_type IN ('organization', 'person', 'project', 'industry', 'general')),
    confidence_score DECIMAL(3,2) DEFAULT 0.50,
    page_url TEXT,
    session_id VARCHAR(255),
    duration_seconds INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_confidence CHECK (confidence_score >= 0 AND confidence_score <= 1)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_fyi_insights_cache_type ON fyi_insights_cache(type);
CREATE INDEX IF NOT EXISTS idx_fyi_insights_cache_context_entity ON fyi_insights_cache(context_entity);
CREATE INDEX IF NOT EXISTS idx_fyi_insights_cache_expires_at ON fyi_insights_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_fyi_insights_cache_published_at ON fyi_insights_cache(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_fyi_insights_cache_relevance ON fyi_insights_cache(relevance_score DESC);

CREATE INDEX IF NOT EXISTS idx_fyi_user_preferences_user_id ON fyi_user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_fyi_user_preferences_org_id ON fyi_user_preferences(organization_id);

CREATE INDEX IF NOT EXISTS idx_fyi_user_interactions_user_id ON fyi_user_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_fyi_user_interactions_insight_id ON fyi_user_interactions(insight_id);
CREATE INDEX IF NOT EXISTS idx_fyi_user_interactions_action ON fyi_user_interactions(action);
CREATE INDEX IF NOT EXISTS idx_fyi_user_interactions_created_at ON fyi_user_interactions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_fyi_context_history_user_id ON fyi_context_history(user_id);
CREATE INDEX IF NOT EXISTS idx_fyi_context_history_context_type ON fyi_context_history(context_type);
CREATE INDEX IF NOT EXISTS idx_fyi_context_history_created_at ON fyi_context_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fyi_context_history_entities ON fyi_context_history USING GIN(extracted_entities);

-- RLS (Row Level Security) Policies
ALTER TABLE fyi_user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE fyi_user_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE fyi_context_history ENABLE ROW LEVEL SECURITY;

-- Users can only access their own preferences
CREATE POLICY fyi_user_preferences_policy ON fyi_user_preferences
    FOR ALL USING (auth.uid() = user_id);

-- Users can only access their own interactions
CREATE POLICY fyi_user_interactions_policy ON fyi_user_interactions
    FOR ALL USING (auth.uid() = user_id);

-- Users can only access their own context history
CREATE POLICY fyi_context_history_policy ON fyi_context_history
    FOR ALL USING (auth.uid() = user_id);

-- Function to clean up expired insights cache
CREATE OR REPLACE FUNCTION cleanup_expired_fyi_insights()
RETURNS void AS $$
BEGIN
    DELETE FROM fyi_insights_cache WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user preferences updated_at timestamp
CREATE OR REPLACE FUNCTION update_fyi_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER fyi_preferences_updated_at
    BEFORE UPDATE ON fyi_user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_fyi_preferences_updated_at();

-- Function to get user's FYI preferences with defaults
CREATE OR REPLACE FUNCTION get_user_fyi_preferences(p_user_id UUID, p_org_id UUID DEFAULT NULL)
RETURNS TABLE(
    enabled BOOLEAN,
    default_relevance_threshold DECIMAL(3,2),
    preferred_sources TEXT[],
    blocked_sources TEXT[],
    notification_enabled BOOLEAN,
    auto_refresh_enabled BOOLEAN,
    refresh_interval_minutes INTEGER,
    max_insights_displayed INTEGER,
    preferences JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(fp.enabled, true),
        COALESCE(fp.default_relevance_threshold, 0.60::DECIMAL(3,2)),
        COALESCE(fp.preferred_sources, '{}'),
        COALESCE(fp.blocked_sources, '{}'),
        COALESCE(fp.notification_enabled, true),
        COALESCE(fp.auto_refresh_enabled, true),
        COALESCE(fp.refresh_interval_minutes, 30),
        COALESCE(fp.max_insights_displayed, 20),
        COALESCE(fp.preferences, '{}'::JSONB)
    FROM fyi_user_preferences fp
    WHERE fp.user_id = p_user_id 
    AND (p_org_id IS NULL OR fp.organization_id = p_org_id)
    LIMIT 1;
    
    -- Return defaults if no preferences found
    IF NOT FOUND THEN
        RETURN QUERY SELECT 
            true::BOOLEAN,
            0.60::DECIMAL(3,2),
            '{}'::TEXT[],
            '{}'::TEXT[],
            true::BOOLEAN,
            true::BOOLEAN,
            30::INTEGER,
            20::INTEGER,
            '{}'::JSONB;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a scheduled job to clean up expired insights (if pg_cron is available)
-- This should be run manually if pg_cron is not available:
-- SELECT cleanup_expired_fyi_insights();

COMMENT ON TABLE fyi_insights_cache IS 'Caches external insights to reduce API calls and improve performance';
COMMENT ON TABLE fyi_user_preferences IS 'Stores user preferences for FYI functionality';
COMMENT ON TABLE fyi_user_interactions IS 'Tracks user interactions with insights for improving relevance scoring';
COMMENT ON TABLE fyi_context_history IS 'Stores user context history for better insight targeting';
COMMENT ON FUNCTION cleanup_expired_fyi_insights() IS 'Removes expired insights from cache';
COMMENT ON FUNCTION get_user_fyi_preferences(UUID, UUID) IS 'Returns user FYI preferences with fallback to defaults';