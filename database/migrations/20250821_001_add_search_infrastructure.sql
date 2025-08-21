-- Migration: Add Search Infrastructure for AI Reference System
-- Date: 2025-08-21
-- Description: Adds full-text search and semantic search capabilities for asset discovery

-- =====================================================
-- 1. ENABLE REQUIRED EXTENSIONS
-- =====================================================

-- Enable full-text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gin;

-- Enable vector search (if available - fallback gracefully)
-- Note: pgvector extension may not be available in all environments
-- CREATE EXTENSION IF NOT EXISTS vector;

-- =====================================================
-- 2. ASSET SEARCH METADATA TABLE
-- =====================================================

CREATE TABLE asset_search_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  
  -- AI-generated content for better search
  ai_summary TEXT,
  ai_key_topics TEXT[] DEFAULT '{}',
  ai_categories TEXT[] DEFAULT '{}',
  
  -- Search vectors for full-text search
  search_vector tsvector,
  title_vector tsvector,
  content_vector tsvector,
  
  -- Vector embeddings (stored as JSONB until pgvector is available)
  title_embedding JSONB,
  content_embedding JSONB,
  
  -- Computed relevance metrics
  relevance_score FLOAT DEFAULT 0.0,
  popularity_score FLOAT DEFAULT 0.0,
  recency_score FLOAT DEFAULT 0.0,
  
  -- Content analysis
  document_type VARCHAR(50),
  estimated_read_time INTEGER, -- in minutes
  complexity_level VARCHAR(20) DEFAULT 'medium', -- low, medium, high
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_indexed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 3. SEARCH QUERY TRACKING
-- =====================================================

CREATE TABLE search_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  
  -- Query details
  query_text TEXT NOT NULL,
  query_type VARCHAR(50) DEFAULT 'chat', -- chat, manual, auto-suggest
  context_scope VARCHAR(50), -- general, boardguru, organization, vault, asset
  context_id UUID, -- ID of the context (org, vault, asset)
  
  -- Results and interactions
  results_count INTEGER DEFAULT 0,
  results_asset_ids UUID[] DEFAULT '{}',
  clicked_asset_ids UUID[] DEFAULT '{}',
  
  -- Performance metrics
  search_duration_ms INTEGER,
  ai_response_duration_ms INTEGER,
  
  -- User satisfaction (optional feedback)
  user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
  user_feedback TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. REFERENCE TRACKING
-- =====================================================

CREATE TABLE ai_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_message_id UUID, -- Link to chat session if available
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Reference details
  reference_type VARCHAR(50) NOT NULL, -- asset, website, report, dashboard
  reference_id UUID, -- Asset ID, report ID, etc.
  reference_url TEXT,
  reference_title TEXT NOT NULL,
  reference_description TEXT,
  
  -- AI-generated metadata
  relevance_score FLOAT DEFAULT 0.0,
  confidence_score FLOAT DEFAULT 0.0,
  citation_text TEXT, -- How it was cited in the AI response
  
  -- User interactions
  viewed BOOLEAN DEFAULT FALSE,
  clicked BOOLEAN DEFAULT FALSE,
  downloaded BOOLEAN DEFAULT FALSE,
  shared BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_interacted_at TIMESTAMP WITH TIME ZONE
);

-- =====================================================
-- 5. ASSET ACCESS ANALYTICS
-- =====================================================

CREATE TABLE asset_access_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  
  -- Access details
  access_type VARCHAR(50) NOT NULL, -- view, download, search_result, ai_reference
  access_source VARCHAR(50), -- chat, search, direct, recommendation
  context_data JSONB, -- Additional context about the access
  
  -- Session information
  session_id UUID,
  user_agent TEXT,
  ip_address INET,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 6. INDEXES FOR PERFORMANCE
-- =====================================================

-- Full-text search indexes
CREATE INDEX idx_asset_search_metadata_search_vector 
  ON asset_search_metadata USING GIN(search_vector);

CREATE INDEX idx_asset_search_metadata_title_vector 
  ON asset_search_metadata USING GIN(title_vector);

CREATE INDEX idx_asset_search_metadata_content_vector 
  ON asset_search_metadata USING GIN(content_vector);

-- Asset lookup indexes
CREATE INDEX idx_asset_search_metadata_asset_id 
  ON asset_search_metadata(asset_id);

CREATE INDEX idx_asset_search_metadata_relevance 
  ON asset_search_metadata(relevance_score DESC);

-- Search query indexes
CREATE INDEX idx_search_queries_user_id 
  ON search_queries(user_id);

CREATE INDEX idx_search_queries_created_at 
  ON search_queries(created_at DESC);

CREATE INDEX idx_search_queries_context 
  ON search_queries(context_scope, context_id);

-- Reference tracking indexes
CREATE INDEX idx_ai_references_user_id 
  ON ai_references(user_id);

CREATE INDEX idx_ai_references_type_id 
  ON ai_references(reference_type, reference_id);

CREATE INDEX idx_ai_references_created_at 
  ON ai_references(created_at DESC);

-- Analytics indexes
CREATE INDEX idx_asset_access_analytics_asset_id 
  ON asset_access_analytics(asset_id);

CREATE INDEX idx_asset_access_analytics_user_id 
  ON asset_access_analytics(user_id);

CREATE INDEX idx_asset_access_analytics_created_at 
  ON asset_access_analytics(created_at DESC);

-- =====================================================
-- 7. FUNCTIONS FOR SEARCH VECTOR UPDATES
-- =====================================================

-- Function to update search vectors
CREATE OR REPLACE FUNCTION update_asset_search_vectors()
RETURNS TRIGGER AS $$
BEGIN
  -- Update search vectors when asset metadata changes
  UPDATE asset_search_metadata 
  SET 
    search_vector = setweight(to_tsvector('english', COALESCE(NEW.ai_summary, '')), 'A') ||
                   setweight(to_tsvector('english', array_to_string(NEW.ai_key_topics, ' ')), 'B') ||
                   setweight(to_tsvector('english', array_to_string(NEW.ai_categories, ' ')), 'C'),
    title_vector = to_tsvector('english', (
      SELECT COALESCE(title, '') FROM assets WHERE id = NEW.asset_id
    )),
    content_vector = to_tsvector('english', COALESCE(NEW.ai_summary, '')),
    updated_at = NOW()
  WHERE asset_id = NEW.asset_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update relevance scores
CREATE OR REPLACE FUNCTION update_asset_relevance_score(asset_uuid UUID)
RETURNS VOID AS $$
DECLARE
  view_count INTEGER := 0;
  download_count INTEGER := 0;
  reference_count INTEGER := 0;
  days_since_created INTEGER := 0;
  new_relevance_score FLOAT := 0.0;
BEGIN
  -- Get asset statistics
  SELECT 
    COALESCE(a.view_count, 0),
    COALESCE(a.download_count, 0),
    COALESCE(EXTRACT(DAYS FROM NOW() - a.created_at), 0)
  INTO view_count, download_count, days_since_created
  FROM assets a
  WHERE a.id = asset_uuid;
  
  -- Count AI references
  SELECT COUNT(*)
  INTO reference_count
  FROM ai_references
  WHERE reference_type = 'asset' AND reference_id = asset_uuid;
  
  -- Calculate relevance score (weighted combination)
  new_relevance_score := 
    (view_count * 0.3) +
    (download_count * 0.4) +
    (reference_count * 0.2) +
    (GREATEST(0, 30 - days_since_created) * 0.1); -- Recency bonus
  
  -- Update the relevance score
  UPDATE asset_search_metadata
  SET 
    relevance_score = new_relevance_score,
    popularity_score = (view_count + download_count),
    recency_score = GREATEST(0, 30 - days_since_created),
    updated_at = NOW()
  WHERE asset_id = asset_uuid;
  
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 8. TRIGGERS
-- =====================================================

-- Trigger to update search vectors when metadata changes
CREATE TRIGGER trigger_update_asset_search_vectors
  AFTER INSERT OR UPDATE ON asset_search_metadata
  FOR EACH ROW EXECUTE FUNCTION update_asset_search_vectors();

-- =====================================================
-- 9. INITIAL DATA POPULATION
-- =====================================================

-- Create search metadata entries for existing assets
INSERT INTO asset_search_metadata (asset_id, ai_summary, ai_key_topics)
SELECT 
  id,
  COALESCE(description, title) as ai_summary,
  CASE 
    WHEN tags IS NOT NULL AND array_length(tags, 1) > 0 THEN tags
    ELSE ARRAY[category]
  END as ai_key_topics
FROM assets
WHERE NOT EXISTS (
  SELECT 1 FROM asset_search_metadata WHERE asset_id = assets.id
);

-- =====================================================
-- 10. GRANTS AND PERMISSIONS
-- =====================================================

-- Grant permissions for the authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON asset_search_metadata TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON search_queries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ai_references TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON asset_access_analytics TO authenticated;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Create RLS policies
ALTER TABLE asset_search_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_access_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can access search metadata for assets they have access to
CREATE POLICY "Users can access search metadata for accessible assets" ON asset_search_metadata
  FOR ALL USING (
    asset_id IN (
      SELECT a.id FROM assets a
      LEFT JOIN vault_assets va ON a.id = va.asset_id
      LEFT JOIN vault_members vm ON va.vault_id = vm.vault_id
      WHERE 
        a.owner_id = auth.uid() OR
        vm.user_id = auth.uid() OR
        a.visibility = 'public'
    )
  );

-- RLS Policy: Users can access their own search queries
CREATE POLICY "Users can access their own search queries" ON search_queries
  FOR ALL USING (user_id = auth.uid());

-- RLS Policy: Users can access their own AI references
CREATE POLICY "Users can access their own AI references" ON ai_references
  FOR ALL USING (user_id = auth.uid());

-- RLS Policy: Users can access analytics for assets they have access to
CREATE POLICY "Users can access analytics for accessible assets" ON asset_access_analytics
  FOR ALL USING (
    asset_id IN (
      SELECT a.id FROM assets a
      LEFT JOIN vault_assets va ON a.id = va.asset_id
      LEFT JOIN vault_members vm ON va.vault_id = vm.vault_id
      WHERE 
        a.owner_id = auth.uid() OR
        vm.user_id = auth.uid() OR
        a.visibility = 'public'
    )
  );

-- =====================================================
-- COMPLETION NOTICE
-- =====================================================

COMMENT ON TABLE asset_search_metadata IS 'Enhanced search metadata for assets with AI-generated summaries and vector embeddings';
COMMENT ON TABLE search_queries IS 'Tracking user search queries for analytics and learning';
COMMENT ON TABLE ai_references IS 'Tracking AI-generated references and user interactions';
COMMENT ON TABLE asset_access_analytics IS 'Detailed analytics for asset access patterns';