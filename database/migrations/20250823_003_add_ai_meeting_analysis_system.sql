-- ===================================================================
-- AI-Powered Meeting Summarization & Insights System Database Schema
-- Enterprise-grade AI meeting analysis with comprehensive features
-- ===================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ===================================================================
-- CORE AI MEETING TRANSCRIPTION TABLES
-- ===================================================================

-- Enhanced meeting transcriptions with AI analysis support
CREATE TABLE IF NOT EXISTS ai_meeting_transcriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'initializing' CHECK (
        status IN ('initializing', 'recording', 'processing', 'analyzing', 'completed', 'failed', 'archived')
    ),
    
    -- Audio configuration
    audio_config JSONB DEFAULT '{
        "sampleRate": 44100,
        "channels": 2,
        "bitDepth": 16,
        "format": "wav",
        "noiseReduction": true,
        "echoCancellation": true,
        "autoGainControl": true
    }',
    
    -- Transcription data
    segments JSONB DEFAULT '[]',
    speakers JSONB DEFAULT '[]',
    
    -- Processing metadata
    metadata JSONB DEFAULT '{}',
    quality_metrics JSONB DEFAULT '{}',
    
    -- AI analysis results
    summary TEXT,
    key_topics JSONB DEFAULT '[]',
    action_items JSONB DEFAULT '[]',
    decisions JSONB DEFAULT '[]',
    compliance_flags JSONB DEFAULT '[]',
    
    -- Audit fields
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT valid_audio_config CHECK (jsonb_typeof(audio_config) = 'object'),
    CONSTRAINT valid_metadata CHECK (jsonb_typeof(metadata) = 'object')
);

-- Transcription segments with AI enhancements
CREATE TABLE IF NOT EXISTS ai_transcription_segments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transcription_id UUID REFERENCES ai_meeting_transcriptions(id) ON DELETE CASCADE,
    
    -- Segment content
    text TEXT NOT NULL,
    original_audio_hash VARCHAR(64),
    start_time BIGINT NOT NULL, -- milliseconds
    end_time BIGINT NOT NULL,   -- milliseconds
    
    -- Speaker identification
    speaker_id UUID,
    confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),
    
    -- Language and translation
    language VARCHAR(10) DEFAULT 'en',
    translations JSONB DEFAULT '{}',
    
    -- AI analysis results
    sentiment JSONB,
    topics TEXT[],
    keywords TEXT[],
    action_items TEXT[],
    decisions TEXT[],
    
    -- Processing status
    processing_status JSONB DEFAULT '{
        "transcribed": true,
        "speakerIdentified": false,
        "sentimentAnalyzed": false,
        "topicExtracted": false,
        "actionItemsExtracted": false,
        "decisionsExtracted": false
    }',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_time_range CHECK (end_time > start_time),
    CONSTRAINT valid_processing_status CHECK (jsonb_typeof(processing_status) = 'object')
);

-- Speaker profiles and voice identification
CREATE TABLE IF NOT EXISTS ai_speaker_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transcription_id UUID REFERENCES ai_meeting_transcriptions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id), -- nullable for unknown speakers
    
    -- Speaker details
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    role VARCHAR(100),
    voice_fingerprint TEXT, -- encrypted voice pattern data
    confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),
    
    -- Speaking analytics
    speaking_metrics JSONB DEFAULT '{}',
    engagement_score DECIMAL(5,2) DEFAULT 0,
    contribution_analysis JSONB DEFAULT '{}',
    
    -- Timeline
    first_appearance BIGINT, -- milliseconds
    last_appearance BIGINT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_speaking_metrics CHECK (jsonb_typeof(speaking_metrics) = 'object'),
    CONSTRAINT valid_contribution_analysis CHECK (jsonb_typeof(contribution_analysis) = 'object')
);

-- ===================================================================
-- AI ANALYSIS AND INSIGHTS TABLES
-- ===================================================================

-- Comprehensive meeting summaries with AI insights
CREATE TABLE IF NOT EXISTS ai_meeting_summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transcription_id UUID REFERENCES ai_meeting_transcriptions(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Summary content
    executive_summary TEXT NOT NULL,
    key_topics JSONB DEFAULT '[]',
    major_decisions JSONB DEFAULT '[]',
    action_items_summary JSONB DEFAULT '{}',
    participant_insights JSONB DEFAULT '[]',
    
    -- Effectiveness metrics
    meeting_effectiveness JSONB DEFAULT '{}',
    compliance_flags JSONB DEFAULT '[]',
    follow_up_recommendations JSONB DEFAULT '[]',
    
    -- AI model information
    model_info JSONB DEFAULT '{}',
    confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),
    
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_key_topics CHECK (jsonb_typeof(key_topics) = 'array'),
    CONSTRAINT valid_major_decisions CHECK (jsonb_typeof(major_decisions) = 'array')
);

-- AI-extracted action items
CREATE TABLE IF NOT EXISTS ai_action_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transcription_id UUID REFERENCES ai_meeting_transcriptions(id) ON DELETE CASCADE,
    segment_id UUID REFERENCES ai_transcription_segments(id),
    
    -- Action item content
    extracted_text TEXT NOT NULL,
    processed_description TEXT NOT NULL,
    
    -- Assignment details
    assignee_speaker_id UUID REFERENCES ai_speaker_profiles(id),
    assignee_user_id UUID REFERENCES users(id),
    assignee_name VARCHAR(255),
    assignment_confidence DECIMAL(3,2),
    
    -- Timeline
    due_date DATE,
    due_date_confidence DECIMAL(3,2),
    due_date_source VARCHAR(20) CHECK (due_date_source IN ('explicit', 'inferred', 'default')),
    
    -- Priority and complexity
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
    priority_confidence DECIMAL(3,2),
    priority_reasoning TEXT[],
    
    complexity_score JSONB DEFAULT '{}',
    category VARCHAR(100),
    dependencies TEXT[],
    estimated_hours INTEGER,
    risk_factors TEXT[],
    compliance_relevant BOOLEAN DEFAULT FALSE,
    
    -- Status tracking
    status VARCHAR(20) DEFAULT 'extracted' CHECK (
        status IN ('extracted', 'validated', 'assigned', 'in-progress', 'completed', 'cancelled', 'overdue')
    ),
    
    extracted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_analyzed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_complexity_score CHECK (jsonb_typeof(complexity_score) = 'object')
);

-- AI-powered decision tracking
CREATE TABLE IF NOT EXISTS ai_decision_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transcription_id UUID REFERENCES ai_meeting_transcriptions(id) ON DELETE CASCADE,
    
    -- Decision content
    title VARCHAR(255) NOT NULL,
    context TEXT NOT NULL,
    discussion_summary TEXT,
    
    -- Stakeholder analysis
    stakeholders JSONB DEFAULT '[]',
    voting_analysis JSONB,
    consensus_analysis JSONB DEFAULT '{}',
    
    -- Implementation
    implementation_plan JSONB DEFAULT '[]',
    risk_assessment JSONB DEFAULT '{}',
    compliance_implications JSONB DEFAULT '[]',
    
    follow_up_required BOOLEAN DEFAULT FALSE,
    confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),
    
    extracted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_stakeholders CHECK (jsonb_typeof(stakeholders) = 'array'),
    CONSTRAINT valid_consensus_analysis CHECK (jsonb_typeof(consensus_analysis) = 'object')
);

-- ===================================================================
-- ADVANCED ANALYTICS TABLES
-- ===================================================================

-- Sentiment analysis with granular insights
CREATE TABLE IF NOT EXISTS ai_sentiment_analysis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transcription_id UUID REFERENCES ai_meeting_transcriptions(id) ON DELETE CASCADE,
    
    -- Overall sentiment
    overall_sentiment JSONB NOT NULL,
    speaker_sentiments JSONB DEFAULT '{}',
    topic_sentiments JSONB DEFAULT '{}',
    
    -- Timeline analysis
    sentiment_evolution JSONB DEFAULT '[]',
    emotional_highlights JSONB DEFAULT '[]',
    conflict_detection JSONB DEFAULT '[]',
    engagement_indicators JSONB DEFAULT '[]',
    
    analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_overall_sentiment CHECK (jsonb_typeof(overall_sentiment) = 'object')
);

-- Meeting insights and effectiveness metrics
CREATE TABLE IF NOT EXISTS ai_meeting_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transcription_id UUID REFERENCES ai_meeting_transcriptions(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Core metrics
    effectiveness_score JSONB DEFAULT '{}',
    engagement_metrics JSONB DEFAULT '{}',
    productivity_metrics JSONB DEFAULT '{}',
    
    -- Analysis results
    communication_patterns JSONB DEFAULT '[]',
    improvement_recommendations JSONB DEFAULT '[]',
    benchmark_comparison JSONB DEFAULT '{}',
    trend_analysis JSONB DEFAULT '{}',
    predictive_insights JSONB DEFAULT '[]',
    
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_effectiveness_score CHECK (jsonb_typeof(effectiveness_score) = 'object'),
    CONSTRAINT valid_engagement_metrics CHECK (jsonb_typeof(engagement_metrics) = 'object')
);

-- ===================================================================
-- PREDICTIVE ANALYTICS TABLES
-- ===================================================================

-- Meeting pattern analysis and predictions
CREATE TABLE IF NOT EXISTS ai_meeting_patterns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Analysis window
    analysis_start DATE NOT NULL,
    analysis_end DATE NOT NULL,
    
    -- Pattern detection
    patterns JSONB DEFAULT '[]',
    trends JSONB DEFAULT '[]',
    anomalies JSONB DEFAULT '[]',
    predictions JSONB DEFAULT '[]',
    
    -- Recommendations
    recommended_actions JSONB DEFAULT '[]',
    
    -- Model accuracy
    model_accuracy JSONB DEFAULT '{}',
    
    analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_date_range CHECK (analysis_end >= analysis_start),
    CONSTRAINT valid_patterns CHECK (jsonb_typeof(patterns) = 'array')
);

-- Smart agenda generation and recommendations
CREATE TABLE IF NOT EXISTS ai_smart_agendas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    meeting_id UUID REFERENCES meetings(id),
    
    -- Generated agenda
    agenda_items JSONB DEFAULT '[]',
    estimated_duration INTEGER, -- minutes
    
    -- Recommendations
    topic_priorities JSONB DEFAULT '[]',
    participant_suggestions JSONB DEFAULT '[]',
    resource_requirements JSONB DEFAULT '[]',
    
    -- Historical analysis
    similar_meetings JSONB DEFAULT '[]',
    success_predictors JSONB DEFAULT '[]',
    
    -- Generation metadata
    confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),
    model_version VARCHAR(50),
    
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_agenda_items CHECK (jsonb_typeof(agenda_items) = 'array')
);

-- Follow-up recommendations and conflict predictions
CREATE TABLE IF NOT EXISTS ai_followup_recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transcription_id UUID REFERENCES ai_meeting_transcriptions(id) ON DELETE CASCADE,
    
    -- Recommendation details
    type VARCHAR(50) NOT NULL CHECK (type IN ('meeting', 'action', 'decision', 'communication')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('urgent', 'high', 'medium', 'low')),
    description TEXT NOT NULL,
    suggested_timeframe VARCHAR(100),
    
    -- Participants
    suggested_participants JSONB DEFAULT '[]',
    
    -- Implementation
    implementation_steps JSONB DEFAULT '[]',
    success_metrics JSONB DEFAULT '[]',
    
    -- Conflict prediction
    conflict_likelihood DECIMAL(3,2),
    conflict_factors TEXT[],
    mitigation_strategies TEXT[],
    
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_suggested_participants CHECK (jsonb_typeof(suggested_participants) = 'array')
);

-- ===================================================================
-- AI MODEL MANAGEMENT TABLES
-- ===================================================================

-- AI model configurations and management
CREATE TABLE IF NOT EXISTS ai_model_configurations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    version VARCHAR(50) NOT NULL,
    provider VARCHAR(50) NOT NULL CHECK (
        provider IN ('openai', 'anthropic', 'google', 'huggingface', 'openrouter', 'azure-openai', 'aws-bedrock')
    ),
    
    -- Capabilities
    capabilities TEXT[] NOT NULL,
    
    -- Configuration
    config JSONB DEFAULT '{}',
    
    -- Performance metrics
    performance_metrics JSONB DEFAULT '{}',
    usage_stats JSONB DEFAULT '{}',
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT unique_provider_name_version UNIQUE (provider, name, version),
    CONSTRAINT valid_config CHECK (jsonb_typeof(config) = 'object'),
    CONSTRAINT valid_performance_metrics CHECK (jsonb_typeof(performance_metrics) = 'object')
);

-- ML pipeline execution tracking
CREATE TABLE IF NOT EXISTS ai_ml_pipelines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transcription_id UUID REFERENCES ai_meeting_transcriptions(id) ON DELETE CASCADE,
    
    -- Pipeline details
    pipeline_name VARCHAR(255) NOT NULL,
    pipeline_version VARCHAR(50) NOT NULL,
    stage VARCHAR(100) NOT NULL,
    
    -- Execution
    status VARCHAR(50) DEFAULT 'pending' CHECK (
        status IN ('pending', 'running', 'completed', 'failed', 'cancelled')
    ),
    
    -- Input/Output
    input_data JSONB,
    output_data JSONB,
    error_details JSONB,
    
    -- Performance
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    processing_time INTEGER, -- milliseconds
    
    -- Resources
    model_config_id UUID REFERENCES ai_model_configurations(id),
    resource_usage JSONB DEFAULT '{}',
    
    CONSTRAINT valid_input_data CHECK (jsonb_typeof(input_data) = 'object' OR input_data IS NULL),
    CONSTRAINT valid_output_data CHECK (jsonb_typeof(output_data) = 'object' OR output_data IS NULL)
);

-- Speaker analytics aggregation
CREATE TABLE IF NOT EXISTS ai_speaker_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    
    -- Analysis period
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- Aggregated metrics
    total_meetings INTEGER DEFAULT 0,
    total_speaking_time BIGINT DEFAULT 0, -- milliseconds
    average_participation DECIMAL(5,2) DEFAULT 0,
    
    -- Communication patterns
    communication_style JSONB DEFAULT '{}',
    topic_expertise JSONB DEFAULT '{}',
    influence_metrics JSONB DEFAULT '{}',
    
    -- Trends
    participation_trend DECIMAL(5,2), -- percentage change
    engagement_trend DECIMAL(5,2),
    leadership_trend DECIMAL(5,2),
    
    -- Benchmarks
    peer_comparison JSONB DEFAULT '{}',
    
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_period CHECK (period_end >= period_start),
    CONSTRAINT unique_user_period UNIQUE (user_id, period_start, period_end),
    CONSTRAINT valid_communication_style CHECK (jsonb_typeof(communication_style) = 'object')
);

-- ===================================================================
-- INDEXES FOR PERFORMANCE
-- ===================================================================

-- Core transcription indexes
CREATE INDEX IF NOT EXISTS idx_ai_meeting_transcriptions_meeting_id ON ai_meeting_transcriptions(meeting_id);
CREATE INDEX IF NOT EXISTS idx_ai_meeting_transcriptions_organization_id ON ai_meeting_transcriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_meeting_transcriptions_status ON ai_meeting_transcriptions(status);
CREATE INDEX IF NOT EXISTS idx_ai_meeting_transcriptions_created_at ON ai_meeting_transcriptions(created_at);

-- Segment indexes
CREATE INDEX IF NOT EXISTS idx_ai_transcription_segments_transcription_id ON ai_transcription_segments(transcription_id);
CREATE INDEX IF NOT EXISTS idx_ai_transcription_segments_speaker_id ON ai_transcription_segments(speaker_id);
CREATE INDEX IF NOT EXISTS idx_ai_transcription_segments_start_time ON ai_transcription_segments(start_time);

-- Speaker indexes
CREATE INDEX IF NOT EXISTS idx_ai_speaker_profiles_transcription_id ON ai_speaker_profiles(transcription_id);
CREATE INDEX IF NOT EXISTS idx_ai_speaker_profiles_user_id ON ai_speaker_profiles(user_id);

-- Analysis indexes
CREATE INDEX IF NOT EXISTS idx_ai_meeting_summaries_transcription_id ON ai_meeting_summaries(transcription_id);
CREATE INDEX IF NOT EXISTS idx_ai_action_items_transcription_id ON ai_action_items(transcription_id);
CREATE INDEX IF NOT EXISTS idx_ai_action_items_status ON ai_action_items(status);
CREATE INDEX IF NOT EXISTS idx_ai_action_items_due_date ON ai_action_items(due_date);

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_ai_meeting_insights_organization_id ON ai_meeting_insights(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_meeting_patterns_organization_id ON ai_meeting_patterns(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_speaker_analytics_user_id ON ai_speaker_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_speaker_analytics_period ON ai_speaker_analytics(period_start, period_end);

-- Model management indexes
CREATE INDEX IF NOT EXISTS idx_ai_model_configurations_provider ON ai_model_configurations(provider);
CREATE INDEX IF NOT EXISTS idx_ai_model_configurations_active ON ai_model_configurations(is_active);
CREATE INDEX IF NOT EXISTS idx_ai_ml_pipelines_transcription_id ON ai_ml_pipelines(transcription_id);
CREATE INDEX IF NOT EXISTS idx_ai_ml_pipelines_status ON ai_ml_pipelines(status);

-- ===================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ===================================================================

-- Enable RLS on all tables
ALTER TABLE ai_meeting_transcriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_transcription_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_speaker_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_meeting_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_action_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_decision_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_sentiment_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_meeting_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_meeting_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_smart_agendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_followup_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_model_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_ml_pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_speaker_analytics ENABLE ROW LEVEL SECURITY;

-- Organization-based access policies
CREATE POLICY "ai_transcriptions_org_access" ON ai_meeting_transcriptions
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

CREATE POLICY "ai_segments_org_access" ON ai_transcription_segments
    FOR ALL USING (
        transcription_id IN (
            SELECT id FROM ai_meeting_transcriptions
            WHERE organization_id IN (
                SELECT organization_id FROM organization_members 
                WHERE user_id = auth.uid() AND status = 'active'
            )
        )
    );

CREATE POLICY "ai_speakers_org_access" ON ai_speaker_profiles
    FOR ALL USING (
        transcription_id IN (
            SELECT id FROM ai_meeting_transcriptions
            WHERE organization_id IN (
                SELECT organization_id FROM organization_members 
                WHERE user_id = auth.uid() AND status = 'active'
            )
        )
    );

CREATE POLICY "ai_summaries_org_access" ON ai_meeting_summaries
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

CREATE POLICY "ai_action_items_org_access" ON ai_action_items
    FOR ALL USING (
        transcription_id IN (
            SELECT id FROM ai_meeting_transcriptions
            WHERE organization_id IN (
                SELECT organization_id FROM organization_members 
                WHERE user_id = auth.uid() AND status = 'active'
            )
        )
    );

CREATE POLICY "ai_decisions_org_access" ON ai_decision_tracking
    FOR ALL USING (
        transcription_id IN (
            SELECT id FROM ai_meeting_transcriptions
            WHERE organization_id IN (
                SELECT organization_id FROM organization_members 
                WHERE user_id = auth.uid() AND status = 'active'
            )
        )
    );

CREATE POLICY "ai_sentiment_org_access" ON ai_sentiment_analysis
    FOR ALL USING (
        transcription_id IN (
            SELECT id FROM ai_meeting_transcriptions
            WHERE organization_id IN (
                SELECT organization_id FROM organization_members 
                WHERE user_id = auth.uid() AND status = 'active'
            )
        )
    );

CREATE POLICY "ai_insights_org_access" ON ai_meeting_insights
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

CREATE POLICY "ai_patterns_org_access" ON ai_meeting_patterns
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

CREATE POLICY "ai_agendas_org_access" ON ai_smart_agendas
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

CREATE POLICY "ai_followups_org_access" ON ai_followup_recommendations
    FOR ALL USING (
        transcription_id IN (
            SELECT id FROM ai_meeting_transcriptions
            WHERE organization_id IN (
                SELECT organization_id FROM organization_members 
                WHERE user_id = auth.uid() AND status = 'active'
            )
        )
    );

-- Global read access for model configurations (admin-managed)
CREATE POLICY "ai_models_read_access" ON ai_model_configurations
    FOR SELECT USING (is_active = true);

-- Restricted write access for model configurations (admin only)
CREATE POLICY "ai_models_write_access" ON ai_model_configurations
    FOR ALL USING (
        auth.uid() IN (
            SELECT user_id FROM organization_members 
            WHERE role IN ('owner', 'admin') AND status = 'active'
        )
    );

CREATE POLICY "ai_pipelines_org_access" ON ai_ml_pipelines
    FOR ALL USING (
        transcription_id IN (
            SELECT id FROM ai_meeting_transcriptions
            WHERE organization_id IN (
                SELECT organization_id FROM organization_members 
                WHERE user_id = auth.uid() AND status = 'active'
            )
        )
    );

CREATE POLICY "ai_speaker_analytics_org_access" ON ai_speaker_analytics
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

-- ===================================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ===================================================================

-- Update timestamps trigger function
CREATE OR REPLACE FUNCTION update_ai_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at fields
CREATE TRIGGER update_ai_meeting_transcriptions_updated_at
    BEFORE UPDATE ON ai_meeting_transcriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_ai_updated_at();

CREATE TRIGGER update_ai_speaker_profiles_updated_at
    BEFORE UPDATE ON ai_speaker_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_ai_updated_at();

CREATE TRIGGER update_ai_model_configurations_updated_at
    BEFORE UPDATE ON ai_model_configurations
    FOR EACH ROW
    EXECUTE FUNCTION update_ai_updated_at();

-- ===================================================================
-- DEFAULT AI MODEL CONFIGURATIONS
-- ===================================================================

-- Insert default AI model configurations
INSERT INTO ai_model_configurations (
    name,
    version,
    provider,
    capabilities,
    config,
    performance_metrics,
    is_active,
    is_default
) VALUES 
(
    'Claude 3.5 Sonnet',
    '20241022',
    'anthropic',
    ARRAY['transcription', 'sentiment-analysis', 'topic-extraction', 'action-item-extraction', 'decision-tracking', 'meeting-summarization'],
    '{
        "temperature": 0.3,
        "maxTokens": 4000,
        "topP": 1.0,
        "frequencyPenalty": 0.0,
        "presencePenalty": 0.0,
        "customInstructions": "You are an expert meeting analyst. Analyze meeting transcripts with focus on actionable insights, decision tracking, and governance compliance."
    }',
    '{
        "accuracy": 0.92,
        "latency": 850,
        "throughput": 45,
        "errorRate": 0.02,
        "costPerRequest": 0.015,
        "qualityScore": 0.94
    }',
    true,
    true
),
(
    'GPT-4 Turbo',
    '2024-04-09',
    'openai',
    ARRAY['sentiment-analysis', 'topic-extraction', 'action-item-extraction', 'meeting-summarization', 'predictive-analysis'],
    '{
        "temperature": 0.2,
        "maxTokens": 3000,
        "topP": 1.0,
        "frequencyPenalty": 0.1,
        "presencePenalty": 0.1,
        "customInstructions": "Focus on extracting concrete action items and decision points from meeting discussions."
    }',
    '{
        "accuracy": 0.89,
        "latency": 1200,
        "throughput": 35,
        "errorRate": 0.04,
        "costPerRequest": 0.025,
        "qualityScore": 0.90
    }',
    true,
    false
),
(
    'Whisper Large v3',
    'v3',
    'openai',
    ARRAY['transcription', 'speaker-identification'],
    '{
        "temperature": 0.0,
        "language": "auto",
        "task": "transcribe",
        "response_format": "verbose_json"
    }',
    '{
        "accuracy": 0.96,
        "latency": 500,
        "throughput": 60,
        "errorRate": 0.01,
        "costPerRequest": 0.006,
        "qualityScore": 0.97
    }',
    true,
    true
)
ON CONFLICT (provider, name, version) DO NOTHING;

-- ===================================================================
-- SAMPLE DATA FOR TESTING (Optional)
-- ===================================================================

-- Create a sample AI meeting transcription for testing
-- (Uncomment below if you want sample data)

/*
INSERT INTO ai_meeting_transcriptions (
    id,
    meeting_id,
    organization_id,
    title,
    status,
    segments,
    speakers,
    created_by
) VALUES (
    'sample-ai-transcription-001',
    (SELECT id FROM meetings LIMIT 1),
    (SELECT id FROM organizations WHERE name ILIKE '%test%' LIMIT 1),
    'AI-Enhanced Board Meeting - Q4 Review',
    'completed',
    '[
        {
            "id": "segment-001",
            "text": "Good morning everyone. Let us begin today''s board meeting with a review of our Q4 performance.",
            "startTime": 0,
            "endTime": 5000,
            "speakerId": "speaker-001",
            "confidence": 0.95,
            "sentiment": {"polarity": 0.2, "category": "neutral"},
            "topics": ["meeting-opening", "Q4-review"]
        }
    ]',
    '[
        {
            "id": "speaker-001",
            "name": "Board Chair",
            "role": "Chairperson",
            "speakingMetrics": {
                "totalSpeakingTime": 180000,
                "wordsPerMinute": 150
            }
        }
    ]',
    (SELECT id FROM users WHERE email ILIKE '%test%' LIMIT 1)
);
*/

-- ===================================================================
-- MATERIALIZED VIEWS FOR PERFORMANCE
-- ===================================================================

-- Meeting effectiveness summary view
CREATE MATERIALIZED VIEW IF NOT EXISTS ai_meeting_effectiveness_summary AS
SELECT 
    amt.organization_id,
    DATE_TRUNC('month', amt.created_at) as month,
    COUNT(*) as total_meetings,
    AVG((ami.effectiveness_score->>'overall')::numeric) as avg_effectiveness,
    AVG((ami.engagement_metrics->>'averageEngagement')::numeric) as avg_engagement,
    SUM(COALESCE((ams.action_items_summary->>'total')::integer, 0)) as total_action_items,
    SUM(COALESCE((ams.major_decisions->0->>'total')::integer, 0)) as total_decisions
FROM ai_meeting_transcriptions amt
LEFT JOIN ai_meeting_insights ami ON amt.id = ami.transcription_id  
LEFT JOIN ai_meeting_summaries ams ON amt.id = ams.transcription_id
WHERE amt.status = 'completed'
GROUP BY amt.organization_id, DATE_TRUNC('month', amt.created_at);

-- Speaker performance summary view  
CREATE MATERIALIZED VIEW IF NOT EXISTS ai_speaker_performance_summary AS
SELECT 
    asp.user_id,
    asp.transcription_id,
    amt.organization_id,
    asp.name,
    asp.engagement_score,
    (asp.speaking_metrics->>'totalSpeakingTime')::bigint as total_speaking_time,
    (asp.speaking_metrics->>'wordsPerMinute')::numeric as words_per_minute,
    (asp.contribution_analysis->>'participationPercentage')::numeric as participation_percentage,
    amt.created_at
FROM ai_speaker_profiles asp
JOIN ai_meeting_transcriptions amt ON asp.transcription_id = amt.id
WHERE amt.status = 'completed';

-- Create indexes on materialized views
CREATE INDEX IF NOT EXISTS idx_meeting_effectiveness_org_month 
    ON ai_meeting_effectiveness_summary(organization_id, month);
    
CREATE INDEX IF NOT EXISTS idx_speaker_performance_user_org 
    ON ai_speaker_performance_summary(user_id, organization_id);

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_ai_analytics_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY ai_meeting_effectiveness_summary;
    REFRESH MATERIALIZED VIEW CONCURRENTLY ai_speaker_performance_summary;
END;
$$ LANGUAGE plpgsql;

-- ===================================================================
-- COMPLETION MESSAGE
-- ===================================================================

DO $$
BEGIN
    RAISE NOTICE 'AI-Powered Meeting Summarization & Insights System database schema installed successfully!';
    RAISE NOTICE 'Created tables:';
    RAISE NOTICE '  - ai_meeting_transcriptions (Enhanced transcriptions with AI analysis)';
    RAISE NOTICE '  - ai_transcription_segments (Segment-level AI insights)';  
    RAISE NOTICE '  - ai_speaker_profiles (Voice identification and analytics)';
    RAISE NOTICE '  - ai_meeting_summaries (Comprehensive AI summaries)';
    RAISE NOTICE '  - ai_action_items (AI-extracted action items)';
    RAISE NOTICE '  - ai_decision_tracking (AI-powered decision analysis)';
    RAISE NOTICE '  - ai_sentiment_analysis (Granular sentiment insights)';
    RAISE NOTICE '  - ai_meeting_insights (Effectiveness and engagement metrics)';
    RAISE NOTICE '  - ai_meeting_patterns (Pattern recognition and predictions)';
    RAISE NOTICE '  - ai_smart_agendas (AI-generated meeting agendas)';
    RAISE NOTICE '  - ai_followup_recommendations (Smart follow-up suggestions)';
    RAISE NOTICE '  - ai_model_configurations (AI model management)';
    RAISE NOTICE '  - ai_ml_pipelines (ML pipeline execution tracking)';
    RAISE NOTICE '  - ai_speaker_analytics (Aggregated speaker analytics)';
    RAISE NOTICE '';
    RAISE NOTICE 'Features enabled:';
    RAISE NOTICE '  ✓ Real-time meeting transcription with AI analysis';
    RAISE NOTICE '  ✓ Speaker identification and voice analytics';
    RAISE NOTICE '  ✓ Intelligent action item extraction';  
    RAISE NOTICE '  ✓ Decision tracking and consensus analysis';
    RAISE NOTICE '  ✓ Sentiment analysis and conflict detection';
    RAISE NOTICE '  ✓ Meeting effectiveness scoring';
    RAISE NOTICE '  ✓ Predictive insights and pattern recognition';
    RAISE NOTICE '  ✓ Smart agenda generation';
    RAISE NOTICE '  ✓ AI model management and monitoring';
    RAISE NOTICE '  ✓ Comprehensive analytics and reporting';
    RAISE NOTICE '';
    RAISE NOTICE 'Security: Row Level Security enabled on all tables';
    RAISE NOTICE 'Performance: Optimized indexes and materialized views created';
    RAISE NOTICE 'Models: Default AI configurations installed (Claude 3.5, GPT-4, Whisper)';
END $$;