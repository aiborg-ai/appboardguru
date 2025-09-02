-- Enterprise LLM Configuration Tables
-- Supports multiple providers, encrypted API keys, and usage tracking

-- LLM Provider Configurations
CREATE TABLE IF NOT EXISTS llm_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Provider details
  provider_type VARCHAR(50) NOT NULL CHECK (provider_type IN ('local', 'openrouter', 'openai', 'anthropic', 'boardguru', 'custom')),
  config_name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Encrypted configuration (API keys, endpoints, etc.)
  encrypted_config JSONB NOT NULL,
  
  -- Status and priority
  is_active BOOLEAN DEFAULT true,
  is_primary BOOLEAN DEFAULT false,
  priority INTEGER DEFAULT 0,
  
  -- Usage limits and quotas
  monthly_token_limit BIGINT,
  monthly_cost_limit DECIMAL(10,2),
  rate_limit_rpm INTEGER, -- Requests per minute
  
  -- Metadata
  last_used_at TIMESTAMPTZ,
  last_tested_at TIMESTAMPTZ,
  last_error TEXT,
  
  -- Audit fields
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_primary_per_org UNIQUE(organization_id, is_primary) WHERE is_primary = true,
  CONSTRAINT unique_config_name_per_org UNIQUE(organization_id, config_name)
);

-- Create indexes for better query performance
CREATE INDEX idx_llm_config_org_active ON llm_configurations(organization_id, is_active);
CREATE INDEX idx_llm_config_priority ON llm_configurations(organization_id, priority DESC);
CREATE INDEX idx_llm_config_provider_type ON llm_configurations(provider_type);

-- LLM Usage Tracking
CREATE TABLE IF NOT EXISTS llm_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  configuration_id UUID NOT NULL REFERENCES llm_configurations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- Request details
  request_id VARCHAR(255) UNIQUE,
  provider_type VARCHAR(50) NOT NULL,
  model_name VARCHAR(255) NOT NULL,
  
  -- Token usage
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  
  -- Cost tracking
  input_cost DECIMAL(10,6) DEFAULT 0,
  output_cost DECIMAL(10,6) DEFAULT 0,
  total_cost DECIMAL(10,6) DEFAULT 0,
  
  -- Performance metrics
  latency_ms INTEGER,
  status VARCHAR(50) NOT NULL CHECK (status IN ('success', 'error', 'timeout', 'rate_limited')),
  error_message TEXT,
  
  -- Context
  feature_name VARCHAR(255), -- Which feature used the LLM
  session_id VARCHAR(255),
  
  -- Request/Response samples (for debugging)
  request_sample TEXT, -- First 500 chars of request
  response_sample TEXT, -- First 500 chars of response
  
  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for usage analytics
CREATE INDEX idx_llm_usage_org_time ON llm_usage(organization_id, created_at DESC);
CREATE INDEX idx_llm_usage_config ON llm_usage(configuration_id, created_at DESC);
CREATE INDEX idx_llm_usage_user ON llm_usage(user_id, created_at DESC);
CREATE INDEX idx_llm_usage_model ON llm_usage(model_name, created_at DESC);
CREATE INDEX idx_llm_usage_status ON llm_usage(status);
CREATE INDEX idx_llm_usage_feature ON llm_usage(feature_name);

-- API Key Rotation History
CREATE TABLE IF NOT EXISTS llm_key_rotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  configuration_id UUID NOT NULL REFERENCES llm_configurations(id) ON DELETE CASCADE,
  
  -- Rotation details
  rotated_by UUID NOT NULL REFERENCES auth.users(id),
  rotation_reason TEXT,
  rotation_type VARCHAR(50) CHECK (rotation_type IN ('manual', 'scheduled', 'security', 'expired')),
  
  -- Old key hash (for audit)
  old_key_hash VARCHAR(64), -- SHA-256 hash of old key
  
  -- Metadata
  ip_address INET,
  user_agent TEXT,
  
  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_key_rotation_config ON llm_key_rotations(configuration_id, created_at DESC);

-- LLM Model Cache (for available models per provider)
CREATE TABLE IF NOT EXISTS llm_model_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_type VARCHAR(50) NOT NULL,
  
  -- Model details
  model_id VARCHAR(255) NOT NULL,
  model_name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Capabilities
  context_length INTEGER,
  max_output_tokens INTEGER,
  supports_streaming BOOLEAN DEFAULT false,
  supports_functions BOOLEAN DEFAULT false,
  supports_vision BOOLEAN DEFAULT false,
  
  -- Pricing (per 1K tokens)
  input_cost_per_1k DECIMAL(10,6),
  output_cost_per_1k DECIMAL(10,6),
  
  -- Status
  is_available BOOLEAN DEFAULT true,
  deprecation_date DATE,
  
  -- Metadata
  capabilities JSONB DEFAULT '{}',
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_model_per_provider UNIQUE(provider_type, model_id)
);

CREATE INDEX idx_model_cache_provider ON llm_model_cache(provider_type, is_available);

-- LLM Fallback Configurations
CREATE TABLE IF NOT EXISTS llm_fallback_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Fallback chain
  primary_config_id UUID REFERENCES llm_configurations(id) ON DELETE SET NULL,
  fallback_config_ids UUID[] DEFAULT '{}', -- Ordered list of fallback configs
  
  -- Conditions
  enable_on_error BOOLEAN DEFAULT true,
  enable_on_timeout BOOLEAN DEFAULT true,
  enable_on_rate_limit BOOLEAN DEFAULT true,
  enable_on_quota_exceeded BOOLEAN DEFAULT true,
  
  -- Settings
  max_retries INTEGER DEFAULT 3,
  retry_delay_ms INTEGER DEFAULT 1000,
  timeout_ms INTEGER DEFAULT 30000,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_fallback_org ON llm_fallback_rules(organization_id);

-- Usage Alerts Configuration
CREATE TABLE IF NOT EXISTS llm_usage_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Alert thresholds
  daily_token_threshold BIGINT,
  daily_cost_threshold DECIMAL(10,2),
  hourly_request_threshold INTEGER,
  
  -- Alert settings
  alert_email VARCHAR(255),
  alert_webhook_url TEXT,
  alert_enabled BOOLEAN DEFAULT true,
  
  -- Last alert sent
  last_alert_sent_at TIMESTAMPTZ,
  last_alert_type VARCHAR(50),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_usage_alerts_org ON llm_usage_alerts(organization_id);

-- Enable Row Level Security
ALTER TABLE llm_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE llm_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE llm_key_rotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE llm_fallback_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE llm_usage_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for llm_configurations
CREATE POLICY "Users can view their organization's LLM configs" ON llm_configurations
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid() 
      AND status = 'active'
    )
  );

CREATE POLICY "Admins can manage LLM configs" ON llm_configurations
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
      AND status = 'active'
    )
  );

-- RLS Policies for llm_usage
CREATE POLICY "Users can view their organization's LLM usage" ON llm_usage
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid() 
      AND status = 'active'
    )
  );

CREATE POLICY "System can insert LLM usage" ON llm_usage
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_llm_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_llm_configurations_updated_at
  BEFORE UPDATE ON llm_configurations
  FOR EACH ROW
  EXECUTE FUNCTION update_llm_updated_at();

CREATE TRIGGER update_llm_fallback_rules_updated_at
  BEFORE UPDATE ON llm_fallback_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_llm_updated_at();

CREATE TRIGGER update_llm_usage_alerts_updated_at
  BEFORE UPDATE ON llm_usage_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_llm_updated_at();

-- Function to enforce single primary config per organization
CREATE OR REPLACE FUNCTION enforce_single_primary_llm()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_primary = true THEN
    UPDATE llm_configurations 
    SET is_primary = false 
    WHERE organization_id = NEW.organization_id 
    AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_single_primary_llm_trigger
  BEFORE INSERT OR UPDATE ON llm_configurations
  FOR EACH ROW
  WHEN (NEW.is_primary = true)
  EXECUTE FUNCTION enforce_single_primary_llm();

-- Sample data for model cache (common models)
INSERT INTO llm_model_cache (provider_type, model_id, model_name, description, context_length, input_cost_per_1k, output_cost_per_1k, supports_streaming) VALUES
-- OpenRouter models
('openrouter', 'anthropic/claude-3-opus', 'Claude 3 Opus', 'Most capable Claude model', 200000, 0.015, 0.075, true),
('openrouter', 'openai/gpt-4-turbo', 'GPT-4 Turbo', 'Latest GPT-4 with 128k context', 128000, 0.01, 0.03, true),
('openrouter', 'meta-llama/llama-3-70b', 'Llama 3 70B', 'Open source large model', 8192, 0.0007, 0.0009, true),

-- Local models (Ollama)
('local', 'llama3:latest', 'Llama 3', 'Local Llama 3 model', 8192, 0, 0, true),
('local', 'mistral:latest', 'Mistral', 'Local Mistral model', 8192, 0, 0, true),
('local', 'codellama:latest', 'Code Llama', 'Local code-focused model', 16384, 0, 0, true),

-- OpenAI direct
('openai', 'gpt-4-turbo-preview', 'GPT-4 Turbo', 'Latest GPT-4', 128000, 0.01, 0.03, true),
('openai', 'gpt-3.5-turbo', 'GPT-3.5 Turbo', 'Fast and efficient', 16385, 0.0005, 0.0015, true),

-- Anthropic direct
('anthropic', 'claude-3-opus-20240229', 'Claude 3 Opus', 'Most capable', 200000, 0.015, 0.075, true),
('anthropic', 'claude-3-sonnet-20240229', 'Claude 3 Sonnet', 'Balanced performance', 200000, 0.003, 0.015, true)
ON CONFLICT (provider_type, model_id) DO NOTHING;