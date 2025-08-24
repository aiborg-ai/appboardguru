-- Enhanced Document Summaries System Migration
-- Supports AI-powered document analysis and summarization

-- Create document_summaries table
CREATE TABLE IF NOT EXISTS document_summaries (
    id VARCHAR(255) PRIMARY KEY,
    document_id VARCHAR(255) REFERENCES assets(id) ON DELETE CASCADE,
    organization_id VARCHAR(255) NOT NULL,
    
    -- Summary Configuration
    summary_type VARCHAR(50) NOT NULL CHECK (summary_type IN ('executive', 'detailed', 'technical', 'action_oriented', 'compliance_focused')),
    document_type VARCHAR(50) DEFAULT 'pdf' CHECK (document_type IN ('pdf', 'text', 'board_pack', 'meeting_minutes', 'financial_report', 'contract')),
    
    -- Core Summary Content
    executive_summary TEXT NOT NULL,
    main_topics TEXT[], -- Array of main topics
    
    -- Analysis Metrics
    reading_time INTEGER DEFAULT 0,
    complexity_score INTEGER DEFAULT 0 CHECK (complexity_score >= 0 AND complexity_score <= 100),
    sentiment_score DECIMAL(3,2) DEFAULT 0.0 CHECK (sentiment_score >= -1.0 AND sentiment_score <= 1.0),
    confidence_score DECIMAL(3,2) DEFAULT 0.0 CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),
    
    -- Structured Data (JSON)
    key_insights JSONB DEFAULT '[]'::jsonb,
    sections JSONB DEFAULT '[]'::jsonb,
    action_items JSONB DEFAULT '[]'::jsonb,
    decisions JSONB DEFAULT '[]'::jsonb,
    risks JSONB DEFAULT '[]'::jsonb,
    financial_highlights JSONB DEFAULT '[]'::jsonb,
    
    -- Processing Metadata
    processing_time_ms INTEGER DEFAULT 0,
    model_used VARCHAR(100) DEFAULT 'anthropic/claude-3.5-sonnet',
    
    -- Audit Trail
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(255) NOT NULL,
    version INTEGER DEFAULT 1
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_document_summaries_document_id ON document_summaries(document_id);
CREATE INDEX IF NOT EXISTS idx_document_summaries_organization ON document_summaries(organization_id);
CREATE INDEX IF NOT EXISTS idx_document_summaries_type ON document_summaries(summary_type);
CREATE INDEX IF NOT EXISTS idx_document_summaries_created_at ON document_summaries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_document_summaries_confidence ON document_summaries(confidence_score DESC);
CREATE INDEX IF NOT EXISTS idx_document_summaries_complexity ON document_summaries(complexity_score DESC);

-- JSON indexes for key insights
CREATE INDEX IF NOT EXISTS idx_document_summaries_insights_category ON document_summaries USING GIN ((key_insights -> 'category'));
CREATE INDEX IF NOT EXISTS idx_document_summaries_action_items ON document_summaries USING GIN (action_items);

-- Create summary analytics view
CREATE OR REPLACE VIEW document_summary_analytics AS
SELECT 
    ds.organization_id,
    COUNT(*) as total_summaries,
    COUNT(DISTINCT ds.document_id) as unique_documents_summarized,
    COUNT(*) FILTER (WHERE ds.summary_type = 'executive') as executive_summaries,
    COUNT(*) FILTER (WHERE ds.summary_type = 'detailed') as detailed_summaries,
    COUNT(*) FILTER (WHERE ds.summary_type = 'action_oriented') as action_oriented_summaries,
    COUNT(*) FILTER (WHERE ds.summary_type = 'compliance_focused') as compliance_summaries,
    COUNT(*) FILTER (WHERE ds.summary_type = 'technical') as technical_summaries,
    
    -- Quality metrics
    AVG(ds.confidence_score) as avg_confidence_score,
    AVG(ds.complexity_score) as avg_complexity_score,
    AVG(ds.sentiment_score) as avg_sentiment_score,
    AVG(ds.reading_time) as avg_reading_time,
    AVG(ds.processing_time_ms) as avg_processing_time_ms,
    
    -- Content analysis
    SUM(jsonb_array_length(ds.key_insights)) as total_insights_extracted,
    SUM(jsonb_array_length(ds.action_items)) as total_action_items_extracted,
    SUM(jsonb_array_length(ds.risks)) as total_risks_identified,
    SUM(jsonb_array_length(ds.financial_highlights)) as total_financial_highlights,
    
    -- Time-based metrics
    DATE_TRUNC('month', ds.created_at) as month_created,
    COUNT(*) FILTER (WHERE ds.created_at >= NOW() - INTERVAL '30 days') as summaries_last_30_days,
    COUNT(*) FILTER (WHERE ds.created_at >= NOW() - INTERVAL '7 days') as summaries_last_7_days
    
FROM document_summaries ds
GROUP BY ds.organization_id, DATE_TRUNC('month', ds.created_at);

-- Create user summary dashboard view
CREATE OR REPLACE VIEW user_summary_dashboard AS
SELECT 
    ds.created_by as user_id,
    ds.organization_id,
    COUNT(*) as total_summaries_created,
    COUNT(DISTINCT ds.document_id) as unique_documents_summarized,
    AVG(ds.confidence_score) as avg_confidence_score,
    MAX(ds.created_at) as last_summary_date,
    
    -- Summary by type
    COUNT(*) FILTER (WHERE ds.summary_type = 'executive') as executive_count,
    COUNT(*) FILTER (WHERE ds.summary_type = 'detailed') as detailed_count,
    COUNT(*) FILTER (WHERE ds.summary_type = 'action_oriented') as action_oriented_count,
    
    -- Recent activity
    COUNT(*) FILTER (WHERE ds.created_at >= NOW() - INTERVAL '7 days') as summaries_this_week,
    COUNT(*) FILTER (WHERE ds.created_at >= NOW() - INTERVAL '30 days') as summaries_this_month
    
FROM document_summaries ds
GROUP BY ds.created_by, ds.organization_id;

-- Create function to update summary updated_at timestamp
CREATE OR REPLACE FUNCTION update_document_summary_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.version = OLD.version + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic updated_at updates
DROP TRIGGER IF EXISTS document_summaries_updated_at_trigger ON document_summaries;
CREATE TRIGGER document_summaries_updated_at_trigger
    BEFORE UPDATE ON document_summaries
    FOR EACH ROW
    EXECUTE FUNCTION update_document_summary_updated_at();

-- Enable RLS
ALTER TABLE document_summaries ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view summaries for documents in their organization
CREATE POLICY "Users can view summaries in their org"
    ON document_summaries
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );

-- Users can create summaries for documents they have access to
CREATE POLICY "Users can create summaries for accessible documents"
    ON document_summaries
    FOR INSERT
    WITH CHECK (
        created_by = auth.uid()::text
        AND document_id IN (
            SELECT a.id
            FROM assets a
            JOIN vaults v ON a.vault_id = v.id
            JOIN organization_members om ON v.organization_id = om.organization_id
            WHERE om.user_id = auth.uid()
        )
    );

-- Users can update summaries they created
CREATE POLICY "Users can update their own summaries"
    ON document_summaries
    FOR UPDATE
    USING (created_by = auth.uid()::text);

-- Organization admins can manage all summaries in their org
CREATE POLICY "Org admins can manage all summaries"
    ON document_summaries
    FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'owner')
        )
    );

-- Grant permissions
GRANT SELECT ON document_summaries TO authenticated;
GRANT SELECT ON document_summary_analytics TO authenticated;
GRANT SELECT ON user_summary_dashboard TO authenticated;

-- Service role needs full access for API operations
GRANT ALL ON document_summaries TO service_role;

-- Add helpful comments
COMMENT ON TABLE document_summaries IS 'AI-generated document summaries with structured insights';
COMMENT ON COLUMN document_summaries.confidence_score IS 'AI confidence score (0-1) for summary accuracy';
COMMENT ON COLUMN document_summaries.complexity_score IS 'Document complexity score (0-100) based on language and structure';
COMMENT ON COLUMN document_summaries.sentiment_score IS 'Document sentiment analysis (-1 to 1, where -1 is negative, 1 is positive)';
COMMENT ON COLUMN document_summaries.key_insights IS 'JSON array of extracted insights with categories and importance levels';
COMMENT ON COLUMN document_summaries.action_items IS 'JSON array of actionable items extracted from document';
COMMENT ON VIEW document_summary_analytics IS 'Organization-level analytics for document summarization usage';
COMMENT ON VIEW user_summary_dashboard IS 'User-specific dashboard metrics for summary creation activity';