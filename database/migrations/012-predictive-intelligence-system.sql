-- Predictive Intelligence & Board Intelligence System
-- Migration: 012-predictive-intelligence-system.sql
-- Description: Add tables for ML-powered predictive notifications and board intelligence

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: notification_patterns
-- Stores detected patterns in user notification behavior and ML model data
CREATE TABLE IF NOT EXISTS notification_patterns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pattern_id VARCHAR(100) UNIQUE NOT NULL,
    pattern_type VARCHAR(50) NOT NULL, -- 'timing', 'engagement', 'content', 'frequency'
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    pattern_data JSONB NOT NULL, -- ML model coefficients, thresholds, etc.
    confidence_score DECIMAL(5,4) NOT NULL DEFAULT 0.0, -- 0.0 to 1.0
    frequency_detected INTEGER DEFAULT 0,
    last_detected_at TIMESTAMPTZ,
    conditions JSONB, -- Pattern trigger conditions
    outcomes JSONB, -- Historical outcomes of this pattern
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: user_behavior_metrics
-- Detailed tracking of user interaction patterns for ML analysis
CREATE TABLE IF NOT EXISTS user_behavior_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    action_type VARCHAR(100) NOT NULL, -- 'notification_open', 'click', 'dismiss', 'delay'
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    context JSONB NOT NULL, -- Device, location, time of day, notification type, etc.
    response_time_ms INTEGER, -- Time to respond to notification
    engagement_score DECIMAL(3,2), -- Calculated engagement score
    session_id UUID, -- Group actions by session
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: board_benchmarks
-- Industry benchmark data for comparative intelligence
CREATE TABLE IF NOT EXISTS board_benchmarks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_type VARCHAR(100) NOT NULL, -- 'meeting_frequency', 'document_volume', 'response_time'
    industry VARCHAR(100) NOT NULL,
    organization_size VARCHAR(50) NOT NULL, -- 'startup', 'small', 'medium', 'large', 'enterprise'
    region VARCHAR(100) DEFAULT 'global',
    percentile_data JSONB NOT NULL, -- {p10: value, p25: value, p50: value, p75: value, p90: value}
    sample_size INTEGER NOT NULL,
    data_source VARCHAR(100) NOT NULL,
    confidence_interval JSONB, -- {lower: value, upper: value, confidence: 95}
    effective_date DATE NOT NULL,
    expires_date DATE,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: predicted_notifications
-- ML-generated notification predictions and their outcomes
CREATE TABLE IF NOT EXISTS predicted_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prediction_id VARCHAR(100) UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    pattern_id UUID REFERENCES notification_patterns(id) ON DELETE SET NULL,
    predicted_type VARCHAR(100) NOT NULL, -- Type of notification predicted
    predicted_time TIMESTAMPTZ NOT NULL, -- When to send the notification
    confidence_score DECIMAL(5,4) NOT NULL, -- ML model confidence
    priority_score DECIMAL(3,2) NOT NULL DEFAULT 0.5, -- Calculated priority
    prediction_data JSONB NOT NULL, -- Content, timing, context data
    model_version VARCHAR(50) NOT NULL, -- Which model version made prediction
    actual_sent_at TIMESTAMPTZ, -- When actually sent (if sent)
    actual_outcome VARCHAR(50), -- 'opened', 'clicked', 'dismissed', 'ignored'
    actual_response_time_ms INTEGER, -- Actual response time
    prediction_accuracy DECIMAL(5,4), -- How accurate was the prediction
    feedback_score INTEGER CHECK (feedback_score >= -2 AND feedback_score <= 2), -- User feedback
    is_sent BOOLEAN DEFAULT false,
    is_successful BOOLEAN, -- Whether prediction was successful
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: intelligence_sources
-- Configuration for external data sources
CREATE TABLE IF NOT EXISTS intelligence_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_name VARCHAR(100) NOT NULL UNIQUE,
    source_type VARCHAR(50) NOT NULL, -- 'market_data', 'news', 'regulatory', 'economic'
    api_endpoint TEXT,
    api_key_encrypted TEXT, -- Encrypted API key
    update_frequency_hours INTEGER DEFAULT 24,
    last_updated_at TIMESTAMPTZ,
    next_update_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    rate_limit_per_hour INTEGER DEFAULT 1000,
    current_usage_count INTEGER DEFAULT 0,
    configuration JSONB, -- Source-specific config
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: anomaly_detections
-- Detected anomalies in board activities and user behavior
CREATE TABLE IF NOT EXISTS anomaly_detections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    anomaly_id VARCHAR(100) UNIQUE NOT NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    anomaly_type VARCHAR(100) NOT NULL, -- 'unusual_activity', 'timing_deviation', 'volume_spike'
    severity VARCHAR(20) NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    anomaly_score DECIMAL(5,4) NOT NULL, -- Statistical anomaly score
    detection_method VARCHAR(100) NOT NULL, -- Algorithm used for detection
    baseline_data JSONB NOT NULL, -- Normal behavior baseline
    anomalous_data JSONB NOT NULL, -- The anomalous behavior data
    affected_metrics JSONB, -- Which metrics were anomalous
    recommended_actions JSONB, -- Suggested responses
    investigation_status VARCHAR(50) DEFAULT 'new', -- 'new', 'investigating', 'resolved', 'false_positive'
    investigated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    investigated_at TIMESTAMPTZ,
    resolution_notes TEXT,
    is_resolved BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: prediction_accuracy_logs
-- Track ML model performance over time
CREATE TABLE IF NOT EXISTS prediction_accuracy_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    model_name VARCHAR(100) NOT NULL,
    model_version VARCHAR(50) NOT NULL,
    evaluation_date DATE NOT NULL,
    metric_name VARCHAR(100) NOT NULL, -- 'precision', 'recall', 'f1_score', 'accuracy'
    metric_value DECIMAL(5,4) NOT NULL,
    sample_size INTEGER NOT NULL,
    test_set_description TEXT,
    model_parameters JSONB,
    performance_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: intelligence_insights
-- Store generated insights from external intelligence sources
CREATE TABLE IF NOT EXISTS intelligence_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    insight_id VARCHAR(100) UNIQUE NOT NULL,
    source_id UUID REFERENCES intelligence_sources(id) ON DELETE CASCADE,
    insight_type VARCHAR(100) NOT NULL, -- 'market_alert', 'regulatory_change', 'risk_factor'
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    relevance_score DECIMAL(3,2) NOT NULL DEFAULT 0.5,
    impact_level VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    affected_organizations UUID[], -- Array of organization IDs
    tags VARCHAR(100)[],
    external_references JSONB, -- URLs, document references
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_notification_patterns_user_id ON notification_patterns(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_patterns_org_id ON notification_patterns(organization_id);
CREATE INDEX IF NOT EXISTS idx_notification_patterns_type ON notification_patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_notification_patterns_active ON notification_patterns(is_active);

CREATE INDEX IF NOT EXISTS idx_user_behavior_metrics_user_id ON user_behavior_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_user_behavior_metrics_timestamp ON user_behavior_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_user_behavior_metrics_action_type ON user_behavior_metrics(action_type);
CREATE INDEX IF NOT EXISTS idx_user_behavior_metrics_org_id ON user_behavior_metrics(organization_id);

CREATE INDEX IF NOT EXISTS idx_board_benchmarks_industry ON board_benchmarks(industry);
CREATE INDEX IF NOT EXISTS idx_board_benchmarks_metric_type ON board_benchmarks(metric_type);
CREATE INDEX IF NOT EXISTS idx_board_benchmarks_org_size ON board_benchmarks(organization_size);
CREATE INDEX IF NOT EXISTS idx_board_benchmarks_active ON board_benchmarks(is_active);

CREATE INDEX IF NOT EXISTS idx_predicted_notifications_user_id ON predicted_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_predicted_notifications_predicted_time ON predicted_notifications(predicted_time);
CREATE INDEX IF NOT EXISTS idx_predicted_notifications_is_sent ON predicted_notifications(is_sent);
CREATE INDEX IF NOT EXISTS idx_predicted_notifications_confidence ON predicted_notifications(confidence_score);

CREATE INDEX IF NOT EXISTS idx_anomaly_detections_org_id ON anomaly_detections(organization_id);
CREATE INDEX IF NOT EXISTS idx_anomaly_detections_severity ON anomaly_detections(severity);
CREATE INDEX IF NOT EXISTS idx_anomaly_detections_status ON anomaly_detections(investigation_status);
CREATE INDEX IF NOT EXISTS idx_anomaly_detections_created_at ON anomaly_detections(created_at);

CREATE INDEX IF NOT EXISTS idx_intelligence_sources_active ON intelligence_sources(is_active);
CREATE INDEX IF NOT EXISTS idx_intelligence_sources_type ON intelligence_sources(source_type);
CREATE INDEX IF NOT EXISTS idx_intelligence_sources_next_update ON intelligence_sources(next_update_at);

CREATE INDEX IF NOT EXISTS idx_intelligence_insights_type ON intelligence_insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_intelligence_insights_relevance ON intelligence_insights(relevance_score);
CREATE INDEX IF NOT EXISTS idx_intelligence_insights_active ON intelligence_insights(is_active);
CREATE INDEX IF NOT EXISTS idx_intelligence_insights_expires ON intelligence_insights(expires_at);

CREATE INDEX IF NOT EXISTS idx_prediction_accuracy_model ON prediction_accuracy_logs(model_name, model_version);
CREATE INDEX IF NOT EXISTS idx_prediction_accuracy_date ON prediction_accuracy_logs(evaluation_date);

-- Add functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_notification_patterns_updated_at BEFORE UPDATE ON notification_patterns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_board_benchmarks_updated_at BEFORE UPDATE ON board_benchmarks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_predicted_notifications_updated_at BEFORE UPDATE ON predicted_notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_intelligence_sources_updated_at BEFORE UPDATE ON intelligence_sources FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_anomaly_detections_updated_at BEFORE UPDATE ON anomaly_detections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_intelligence_insights_updated_at BEFORE UPDATE ON intelligence_insights FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert initial intelligence sources configuration
INSERT INTO intelligence_sources (source_name, source_type, update_frequency_hours, configuration) VALUES
('Alpha Vantage', 'market_data', 6, '{"endpoints": ["GLOBAL_QUOTE", "OVERVIEW", "EARNINGS"], "free_tier_limit": 5}'),
('NewsAPI', 'news', 2, '{"categories": ["business", "technology"], "language": "en", "pageSize": 100}'),
('SEC Edgar', 'regulatory', 24, '{"forms": ["10-K", "10-Q", "8-K"], "cik_lookup": true}'),
('Federal Reserve Economic Data', 'economic', 24, '{"series": ["GDP", "INFLATION", "INTEREST_RATES"], "frequency": "monthly"}')
ON CONFLICT (source_name) DO NOTHING;

-- Insert sample benchmark data for common industries
INSERT INTO board_benchmarks (metric_type, industry, organization_size, percentile_data, sample_size, data_source, effective_date) VALUES
('meeting_frequency_annual', 'technology', 'large', '{"p10": 8, "p25": 10, "p50": 12, "p75": 16, "p90": 20}', 150, 'industry_survey_2024', CURRENT_DATE),
('document_volume_monthly', 'financial_services', 'large', '{"p10": 25, "p25": 40, "p50": 60, "p75": 85, "p90": 120}', 200, 'board_governance_study', CURRENT_DATE),
('response_time_hours', 'healthcare', 'medium', '{"p10": 2, "p25": 4, "p50": 8, "p75": 24, "p90": 48}', 100, 'governance_metrics_2024', CURRENT_DATE),
('board_member_attendance_rate', 'manufacturing', 'large', '{"p10": 0.75, "p25": 0.85, "p50": 0.92, "p75": 0.96, "p90": 0.98}', 175, 'attendance_analysis', CURRENT_DATE)
ON CONFLICT DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE notification_patterns IS 'Machine learning patterns detected in user notification behavior';
COMMENT ON TABLE user_behavior_metrics IS 'Detailed user interaction tracking for ML analysis and personalization';
COMMENT ON TABLE board_benchmarks IS 'Industry benchmark data for comparative board governance intelligence';
COMMENT ON TABLE predicted_notifications IS 'ML-generated notification predictions with outcome tracking';
COMMENT ON TABLE intelligence_sources IS 'Configuration for external data sources and APIs';
COMMENT ON TABLE anomaly_detections IS 'Detected anomalies in user behavior and board activities';
COMMENT ON TABLE prediction_accuracy_logs IS 'ML model performance tracking and evaluation metrics';
COMMENT ON TABLE intelligence_insights IS 'Generated insights from external intelligence sources';

-- Grant permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_role;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_role;