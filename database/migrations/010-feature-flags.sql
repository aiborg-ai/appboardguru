-- Feature flags table for managing gradual rollouts
CREATE TABLE IF NOT EXISTS feature_flags (
  flag_name TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT false,
  rollout_percentage INTEGER DEFAULT 0 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  enabled_for_users TEXT[] DEFAULT '{}',
  enabled_for_organizations TEXT[] DEFAULT '{}',
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_feature_flags_enabled ON feature_flags (enabled);
CREATE INDEX IF NOT EXISTS idx_feature_flags_rollout ON feature_flags (rollout_percentage) WHERE enabled = true;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_feature_flags_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER feature_flags_updated_at
  BEFORE UPDATE ON feature_flags
  FOR EACH ROW
  EXECUTE FUNCTION update_feature_flags_updated_at();

-- Insert default feature flags
INSERT INTO feature_flags (flag_name, enabled, description) VALUES
  ('USE_NEW_API_LAYER', false, 'Use the new unified API layer'),
  ('USE_UNIFIED_ERROR_HANDLING', true, 'Use unified error handling across the app'),
  ('USE_API_RATE_LIMITING', true, 'Enable API rate limiting'),
  ('USE_API_CACHING', true, 'Enable API response caching'),
  ('USE_REPOSITORY_PATTERN', false, 'Use repository pattern for data access'),
  ('USE_QUERY_OPTIMIZATION', true, 'Enable query optimization features'),
  ('USE_CONNECTION_POOLING', true, 'Use database connection pooling'),
  ('USE_COMPONENT_SYSTEM_V2', false, 'Use the new component system'),
  ('USE_NEW_DASHBOARD_LAYOUT', false, 'Use the new dashboard layout'),
  ('USE_ENHANCED_FORMS', false, 'Use enhanced form components'),
  ('USE_LAZY_LOADING', true, 'Enable lazy loading for components'),
  ('USE_VIRTUAL_SCROLLING', false, 'Enable virtual scrolling for large lists'),
  ('USE_IMAGE_OPTIMIZATION', true, 'Enable image optimization'),
  ('USE_NEW_ORGANIZATION_WORKFLOW', false, 'Use the new organization creation workflow'),
  ('USE_ENHANCED_PERMISSIONS', false, 'Use enhanced permission system'),
  ('USE_ADVANCED_SEARCH', false, 'Enable advanced search features'),
  ('USE_PERFORMANCE_MONITORING', true, 'Enable performance monitoring'),
  ('USE_ERROR_TRACKING', true, 'Enable error tracking'),
  ('USE_ANALYTICS', false, 'Enable analytics tracking'),
  ('ENABLE_AI_SUGGESTIONS', false, 'Enable AI-powered suggestions'),
  ('ENABLE_REAL_TIME_COLLABORATION', false, 'Enable real-time collaboration features'),
  ('ENABLE_OFFLINE_MODE', false, 'Enable offline mode support')
ON CONFLICT (flag_name) DO NOTHING;

-- RLS policies for feature flags
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read feature flags
CREATE POLICY "Anyone can read feature flags" ON feature_flags
  FOR SELECT USING (auth.role() = 'authenticated');

-- Only admins can modify feature flags
CREATE POLICY "Only admins can modify feature flags" ON feature_flags
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'director')
      AND users.status = 'approved'
    )
  );

-- Comments for documentation
COMMENT ON TABLE feature_flags IS 'Feature flags for gradual rollout and A/B testing';
COMMENT ON COLUMN feature_flags.flag_name IS 'Unique identifier for the feature flag';
COMMENT ON COLUMN feature_flags.enabled IS 'Whether the feature is globally enabled';
COMMENT ON COLUMN feature_flags.rollout_percentage IS 'Percentage of users to enable the feature for (0-100)';
COMMENT ON COLUMN feature_flags.enabled_for_users IS 'Array of user IDs to explicitly enable the feature for';
COMMENT ON COLUMN feature_flags.enabled_for_organizations IS 'Array of organization IDs to enable the feature for';
COMMENT ON COLUMN feature_flags.start_date IS 'When the feature should start being available';
COMMENT ON COLUMN feature_flags.end_date IS 'When the feature should stop being available';