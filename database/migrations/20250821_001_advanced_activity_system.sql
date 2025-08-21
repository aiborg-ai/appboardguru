-- Advanced Activity Logging System Database Schema
-- Migration: 20250821_001_advanced_activity_system.sql

-- Create activity analytics table for pre-computed metrics
CREATE TABLE IF NOT EXISTS activity_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  metric_type VARCHAR(50) NOT NULL, -- 'daily_activity', 'weekly_summary', 'engagement_score', etc.
  metric_category VARCHAR(50) NOT NULL, -- 'user', 'organization', 'asset', 'vault', etc.
  time_period TSTZRANGE NOT NULL, -- Time range this metric covers
  metric_data JSONB NOT NULL, -- The actual metric values
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- For automatic cleanup
  tags TEXT[], -- For flexible querying
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for analytics table
CREATE INDEX IF NOT EXISTS idx_activity_analytics_org_user ON activity_analytics(organization_id, user_id);
CREATE INDEX IF NOT EXISTS idx_activity_analytics_type_category ON activity_analytics(metric_type, metric_category);
CREATE INDEX IF NOT EXISTS idx_activity_analytics_time_period ON activity_analytics USING gist(time_period);
CREATE INDEX IF NOT EXISTS idx_activity_analytics_tags ON activity_analytics USING gin(tags);

-- Create saved search templates table
CREATE TABLE IF NOT EXISTS activity_search_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  search_query JSONB NOT NULL, -- Stores complex search parameters
  is_public BOOLEAN DEFAULT false, -- Shared with organization
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create activity alert rules table
CREATE TABLE IF NOT EXISTS activity_alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  rule_name VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  trigger_conditions JSONB NOT NULL, -- Complex conditions for triggering alerts
  alert_actions JSONB NOT NULL, -- What to do when triggered (email, webhook, etc.)
  severity VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  cooldown_minutes INTEGER DEFAULT 60, -- Prevent spam alerts
  last_triggered_at TIMESTAMPTZ,
  trigger_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create activity insights table for ML predictions
CREATE TABLE IF NOT EXISTS activity_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  insight_type VARCHAR(50) NOT NULL, -- 'anomaly', 'prediction', 'recommendation', 'risk_score'
  insight_category VARCHAR(50) NOT NULL, -- 'security', 'engagement', 'compliance', 'productivity'
  title VARCHAR(200) NOT NULL,
  description TEXT,
  confidence_score DECIMAL(3,2), -- 0.00 to 1.00
  risk_level VARCHAR(20), -- 'low', 'medium', 'high', 'critical'
  insight_data JSONB NOT NULL, -- Detailed insight information
  action_required BOOLEAN DEFAULT false,
  action_taken BOOLEAN DEFAULT false,
  action_notes TEXT,
  expires_at TIMESTAMPTZ, -- Some insights may expire
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create session recording table
CREATE TABLE IF NOT EXISTS activity_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  session_start TIMESTAMPTZ DEFAULT NOW(),
  session_end TIMESTAMPTZ,
  duration_seconds INTEGER,
  page_views INTEGER DEFAULT 0,
  interactions_count INTEGER DEFAULT 0,
  events_data JSONB, -- Compressed session events for replay
  device_info JSONB,
  ip_address INET,
  user_agent TEXT,
  recording_enabled BOOLEAN DEFAULT false,
  privacy_level VARCHAR(20) DEFAULT 'standard', -- 'minimal', 'standard', 'detailed'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create activity webhooks table
CREATE TABLE IF NOT EXISTS activity_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  webhook_name VARCHAR(100) NOT NULL,
  endpoint_url TEXT NOT NULL,
  secret_key VARCHAR(255), -- For webhook signature verification
  is_active BOOLEAN DEFAULT true,
  event_types TEXT[] NOT NULL, -- Array of activity types to send
  filters JSONB, -- Additional filtering conditions
  retry_config JSONB DEFAULT '{"max_retries": 3, "backoff_seconds": [1, 5, 15]}',
  last_triggered_at TIMESTAMPTZ,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create activity snapshots for compliance
CREATE TABLE IF NOT EXISTS activity_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  snapshot_type VARCHAR(50) NOT NULL, -- 'daily', 'weekly', 'monthly', 'compliance_period'
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  activity_summary JSONB NOT NULL, -- Aggregated activity data
  compliance_status VARCHAR(20) DEFAULT 'compliant', -- 'compliant', 'warning', 'violation'
  signature_hash VARCHAR(255), -- For tamper detection
  retention_until TIMESTAMPTZ, -- Regulatory retention requirement
  is_locked BOOLEAN DEFAULT false, -- Lock for legal hold
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_activity_search_templates_org ON activity_search_templates(organization_id, is_public);
CREATE INDEX IF NOT EXISTS idx_activity_alert_rules_active ON activity_alert_rules(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_activity_insights_user_type ON activity_insights(user_id, insight_type, action_required);
CREATE INDEX IF NOT EXISTS idx_activity_sessions_user_time ON activity_sessions(user_id, session_start);
CREATE INDEX IF NOT EXISTS idx_activity_webhooks_active ON activity_webhooks(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_activity_snapshots_org_period ON activity_snapshots(organization_id, period_start, period_end);

-- Add RLS policies for security
ALTER TABLE activity_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_search_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS policies (users can only access their organization's data)
CREATE POLICY "activity_analytics_org_access" ON activity_analytics
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "activity_search_templates_access" ON activity_search_templates
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND status = 'active'
    ) OR (is_public = true AND organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND status = 'active'
    ))
  );

CREATE POLICY "activity_alert_rules_access" ON activity_alert_rules
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "activity_insights_access" ON activity_insights
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "activity_sessions_access" ON activity_sessions
  USING (
    user_id = auth.uid() OR 
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND status = 'active' AND role IN ('admin', 'owner')
    )
  );

CREATE POLICY "activity_webhooks_access" ON activity_webhooks
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND status = 'active' AND role IN ('admin', 'owner')
    )
  );

CREATE POLICY "activity_snapshots_access" ON activity_snapshots
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Create functions for analytics calculations
CREATE OR REPLACE FUNCTION calculate_user_engagement_score(
  input_user_id UUID,
  input_org_id UUID,
  days_back INTEGER DEFAULT 30
) RETURNS DECIMAL AS $$
DECLARE
  score DECIMAL := 0;
  activity_count INTEGER;
  unique_days INTEGER;
  asset_interactions INTEGER;
BEGIN
  -- Count total activities
  SELECT COUNT(*) INTO activity_count
  FROM audit_logs
  WHERE user_id = input_user_id 
    AND organization_id = input_org_id
    AND created_at >= NOW() - INTERVAL '1 day' * days_back;
  
  -- Count unique active days
  SELECT COUNT(DISTINCT DATE(created_at)) INTO unique_days
  FROM audit_logs
  WHERE user_id = input_user_id 
    AND organization_id = input_org_id
    AND created_at >= NOW() - INTERVAL '1 day' * days_back;
  
  -- Count asset interactions (higher weight)
  SELECT COUNT(*) INTO asset_interactions
  FROM audit_logs
  WHERE user_id = input_user_id 
    AND organization_id = input_org_id
    AND event_category IN ('assets', 'annotations', 'vaults')
    AND created_at >= NOW() - INTERVAL '1 day' * days_back;
  
  -- Calculate weighted score (0-100)
  score := LEAST(100, 
    (activity_count * 0.5) + 
    (unique_days * 5) + 
    (asset_interactions * 2)
  );
  
  RETURN score;
END;
$$ LANGUAGE plpgsql;

-- Create function for anomaly detection
CREATE OR REPLACE FUNCTION detect_activity_anomalies(
  input_user_id UUID,
  input_org_id UUID
) RETURNS JSONB AS $$
DECLARE
  result JSONB := '{}';
  avg_daily_activity DECIMAL;
  today_activity INTEGER;
  unusual_hours INTEGER;
  bulk_downloads INTEGER;
BEGIN
  -- Calculate average daily activity over past 30 days
  SELECT AVG(daily_count) INTO avg_daily_activity
  FROM (
    SELECT DATE(created_at) as activity_date, COUNT(*) as daily_count
    FROM audit_logs
    WHERE user_id = input_user_id 
      AND organization_id = input_org_id
      AND created_at >= NOW() - INTERVAL '30 days'
    GROUP BY DATE(created_at)
  ) daily_stats;
  
  -- Count today's activity
  SELECT COUNT(*) INTO today_activity
  FROM audit_logs
  WHERE user_id = input_user_id 
    AND organization_id = input_org_id
    AND DATE(created_at) = CURRENT_DATE;
  
  -- Check for unusual hours (outside 8am-6pm)
  SELECT COUNT(*) INTO unusual_hours
  FROM audit_logs
  WHERE user_id = input_user_id 
    AND organization_id = input_org_id
    AND DATE(created_at) = CURRENT_DATE
    AND (EXTRACT(HOUR FROM created_at) < 8 OR EXTRACT(HOUR FROM created_at) > 18);
  
  -- Check for bulk downloads today
  SELECT COUNT(*) INTO bulk_downloads
  FROM audit_logs
  WHERE user_id = input_user_id 
    AND organization_id = input_org_id
    AND DATE(created_at) = CURRENT_DATE
    AND action = 'asset_downloaded';
  
  -- Build result object
  result := jsonb_build_object(
    'high_activity', CASE WHEN today_activity > avg_daily_activity * 3 THEN true ELSE false END,
    'unusual_hours', CASE WHEN unusual_hours > 5 THEN true ELSE false END,
    'bulk_downloads', CASE WHEN bulk_downloads > 10 THEN true ELSE false END,
    'activity_today', today_activity,
    'average_daily', COALESCE(avg_daily_activity, 0),
    'unusual_hours_count', unusual_hours,
    'downloads_today', bulk_downloads
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update analytics
CREATE OR REPLACE FUNCTION update_activity_analytics() RETURNS TRIGGER AS $$
BEGIN
  -- Update daily activity metrics when new audit log is created
  INSERT INTO activity_analytics (
    organization_id,
    user_id,
    metric_type,
    metric_category,
    time_period,
    metric_data
  ) VALUES (
    NEW.organization_id,
    NEW.user_id,
    'realtime_activity',
    'user_action',
    tstzrange(DATE_TRUNC('hour', NOW()), DATE_TRUNC('hour', NOW()) + INTERVAL '1 hour'),
    jsonb_build_object(
      'action', NEW.action,
      'resource_type', NEW.resource_type,
      'timestamp', NEW.created_at
    )
  )
  ON CONFLICT DO NOTHING; -- Ignore duplicates for now
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to audit_logs table
DROP TRIGGER IF EXISTS trigger_update_activity_analytics ON audit_logs;
CREATE TRIGGER trigger_update_activity_analytics
  AFTER INSERT ON audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_activity_analytics();

-- Create materialized view for quick activity summaries
CREATE MATERIALIZED VIEW IF NOT EXISTS daily_activity_summary AS
SELECT 
  organization_id,
  user_id,
  DATE(created_at) as activity_date,
  COUNT(*) as total_activities,
  COUNT(DISTINCT event_category) as unique_categories,
  COUNT(CASE WHEN event_category = 'assets' THEN 1 END) as asset_activities,
  COUNT(CASE WHEN event_category = 'vaults' THEN 1 END) as vault_activities,
  COUNT(CASE WHEN event_category = 'annotations' THEN 1 END) as annotation_activities,
  MIN(created_at) as first_activity,
  MAX(created_at) as last_activity,
  COUNT(DISTINCT ip_address) as unique_ip_addresses
FROM audit_logs
WHERE created_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY organization_id, user_id, DATE(created_at);

-- Create index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_activity_summary_unique
ON daily_activity_summary(organization_id, user_id, activity_date);

-- Create refresh function for materialized view
CREATE OR REPLACE FUNCTION refresh_daily_activity_summary() RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY daily_activity_summary;
END;
$$ LANGUAGE plpgsql;

-- Create compliance snapshot function
CREATE OR REPLACE FUNCTION create_compliance_snapshot(
  input_org_id UUID,
  snapshot_period INTERVAL DEFAULT '1 month'
) RETURNS UUID AS $$
DECLARE
  snapshot_id UUID;
  period_start TIMESTAMPTZ;
  period_end TIMESTAMPTZ;
  summary_data JSONB;
BEGIN
  period_end := NOW();
  period_start := period_end - snapshot_period;
  
  -- Generate comprehensive activity summary
  SELECT jsonb_build_object(
    'total_activities', COUNT(*),
    'unique_users', COUNT(DISTINCT user_id),
    'asset_accesses', COUNT(CASE WHEN event_category = 'assets' THEN 1 END),
    'vault_operations', COUNT(CASE WHEN event_category = 'vaults' THEN 1 END),
    'annotation_activities', COUNT(CASE WHEN event_category = 'annotations' THEN 1 END),
    'security_events', COUNT(CASE WHEN event_type = 'security_event' THEN 1 END),
    'failed_operations', COUNT(CASE WHEN outcome = 'failure' THEN 1 END),
    'high_risk_events', COUNT(CASE WHEN severity = 'high' OR severity = 'critical' THEN 1 END),
    'compliance_period', jsonb_build_object(
      'start', period_start,
      'end', period_end,
      'days', EXTRACT(DAYS FROM snapshot_period)
    )
  ) INTO summary_data
  FROM audit_logs
  WHERE organization_id = input_org_id
    AND created_at BETWEEN period_start AND period_end;
  
  -- Create the snapshot
  INSERT INTO activity_snapshots (
    organization_id,
    snapshot_type,
    period_start,
    period_end,
    activity_summary,
    signature_hash,
    retention_until
  ) VALUES (
    input_org_id,
    'compliance_period',
    period_start,
    period_end,
    summary_data,
    encode(digest(summary_data::text, 'sha256'), 'hex'), -- Tamper detection
    period_end + INTERVAL '7 years' -- Standard compliance retention
  ) RETURNING id INTO snapshot_id;
  
  RETURN snapshot_id;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE activity_analytics IS 'Pre-computed activity metrics for dashboard performance';
COMMENT ON TABLE activity_search_templates IS 'Saved search queries for common activity analysis patterns';
COMMENT ON TABLE activity_alert_rules IS 'Configurable rules for automated activity monitoring and alerting';
COMMENT ON TABLE activity_insights IS 'ML-generated insights, predictions, and anomaly detections';
COMMENT ON TABLE activity_sessions IS 'Session tracking for user behavior analysis and replay';
COMMENT ON TABLE activity_webhooks IS 'Webhook configurations for external system integration';
COMMENT ON TABLE activity_snapshots IS 'Immutable compliance snapshots with tamper detection';

COMMENT ON FUNCTION calculate_user_engagement_score IS 'Calculates a 0-100 engagement score based on activity patterns';
COMMENT ON FUNCTION detect_activity_anomalies IS 'Detects unusual activity patterns for security monitoring';
COMMENT ON FUNCTION create_compliance_snapshot IS 'Creates tamper-proof compliance snapshots for regulatory requirements';