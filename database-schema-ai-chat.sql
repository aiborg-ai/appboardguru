-- Database schema for AI Chat functionality
-- Add to existing BoardGuru database

-- AI Chat Sessions table
CREATE TABLE ai_chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_name VARCHAR(255),
  scope_type VARCHAR(50) NOT NULL CHECK (scope_type IN ('global', 'organization', 'meeting', 'document', 'team')),
  scope_id VARCHAR(255),
  scope_label VARCHAR(500),
  scope_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_archived BOOLEAN DEFAULT FALSE
);

-- AI Chat Messages table
CREATE TABLE ai_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES ai_chat_sessions(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_web_search BOOLEAN DEFAULT FALSE,
  is_help_query BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  token_usage JSONB DEFAULT '{}'
);

-- AI User Settings table
CREATE TABLE ai_user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  api_key_encrypted TEXT, -- Encrypted OpenRouter API key
  preferred_model VARCHAR(100) DEFAULT 'anthropic/claude-3.5-sonnet',
  temperature DECIMAL(3,2) DEFAULT 0.7 CHECK (temperature >= 0 AND temperature <= 1),
  max_tokens INTEGER DEFAULT 2000 CHECK (max_tokens > 0),
  use_local_llm BOOLEAN DEFAULT FALSE,
  local_llm_endpoint TEXT,
  web_search_enabled BOOLEAN DEFAULT TRUE,
  settings_json JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat Scope References (for linking to actual entities)
CREATE TABLE ai_chat_scope_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_type VARCHAR(50) NOT NULL,
  scope_id VARCHAR(255) NOT NULL,
  reference_table VARCHAR(100), -- e.g., 'board_packs', 'meetings', 'organizations'
  reference_id UUID,
  label VARCHAR(500),
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(scope_type, scope_id)
);

-- Chat Export Logs (track chat exports for compliance)
CREATE TABLE ai_chat_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES ai_chat_sessions(id) ON DELETE SET NULL,
  export_type VARCHAR(50) DEFAULT 'json',
  exported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  file_path TEXT,
  metadata JSONB DEFAULT '{}'
);

-- Indexes for performance
CREATE INDEX idx_ai_chat_sessions_user_id ON ai_chat_sessions(user_id);
CREATE INDEX idx_ai_chat_sessions_scope ON ai_chat_sessions(scope_type, scope_id);
CREATE INDEX idx_ai_chat_sessions_created_at ON ai_chat_sessions(created_at DESC);

CREATE INDEX idx_ai_chat_messages_session_id ON ai_chat_messages(session_id);
CREATE INDEX idx_ai_chat_messages_timestamp ON ai_chat_messages(timestamp DESC);
CREATE INDEX idx_ai_chat_messages_role ON ai_chat_messages(role);

CREATE INDEX idx_ai_user_settings_user_id ON ai_user_settings(user_id);

CREATE INDEX idx_ai_chat_scope_references_scope ON ai_chat_scope_references(scope_type, scope_id);
CREATE INDEX idx_ai_chat_scope_references_reference ON ai_chat_scope_references(reference_table, reference_id);

CREATE INDEX idx_ai_chat_exports_user_id ON ai_chat_exports(user_id);
CREATE INDEX idx_ai_chat_exports_exported_at ON ai_chat_exports(exported_at DESC);

-- RLS (Row Level Security) policies
ALTER TABLE ai_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_scope_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_exports ENABLE ROW LEVEL SECURITY;

-- Policies for ai_chat_sessions
CREATE POLICY "Users can view their own chat sessions" ON ai_chat_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own chat sessions" ON ai_chat_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chat sessions" ON ai_chat_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chat sessions" ON ai_chat_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Policies for ai_chat_messages
CREATE POLICY "Users can view messages from their sessions" ON ai_chat_messages
  FOR SELECT USING (
    session_id IN (
      SELECT id FROM ai_chat_sessions WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages in their sessions" ON ai_chat_messages
  FOR INSERT WITH CHECK (
    session_id IN (
      SELECT id FROM ai_chat_sessions WHERE user_id = auth.uid()
    )
  );

-- Policies for ai_user_settings
CREATE POLICY "Users can view their own AI settings" ON ai_user_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own AI settings" ON ai_user_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own AI settings" ON ai_user_settings
  FOR UPDATE USING (auth.uid() = user_id);

-- Policies for ai_chat_scope_references (can be viewed by all authenticated users)
CREATE POLICY "Authenticated users can view scope references" ON ai_chat_scope_references
  FOR SELECT USING (auth.role() = 'authenticated');

-- Admin users can manage scope references
CREATE POLICY "Admin users can manage scope references" ON ai_chat_scope_references
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policies for ai_chat_exports
CREATE POLICY "Users can view their own chat exports" ON ai_chat_exports
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own chat exports" ON ai_chat_exports
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_ai_chat_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ai_chat_sessions_updated_at
  BEFORE UPDATE ON ai_chat_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_chat_sessions_updated_at();

CREATE OR REPLACE FUNCTION update_ai_user_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ai_user_settings_updated_at
  BEFORE UPDATE ON ai_user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_user_settings_updated_at();

-- Function to create default scope references
CREATE OR REPLACE FUNCTION create_default_ai_scopes()
RETURNS VOID AS $$
BEGIN
  -- Insert default global scope
  INSERT INTO ai_chat_scope_references (scope_type, scope_id, label, description)
  VALUES ('global', 'global', 'Global Knowledge', 'Access to general knowledge and web search')
  ON CONFLICT (scope_type, scope_id) DO NOTHING;
  
  -- Add more default scopes as needed
  INSERT INTO ai_chat_scope_references (scope_type, scope_id, label, description)
  VALUES 
    ('organization', 'boardguru-org', 'BoardGuru Organization', 'All organizational documents and data'),
    ('team', 'executive', 'Executive Team', 'C-suite and senior leadership team scope'),
    ('team', 'board', 'Board Members', 'Board of directors and advisory members')
  ON CONFLICT (scope_type, scope_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Create default scopes
SELECT create_default_ai_scopes();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ai_chat_sessions TO authenticated;
GRANT ALL ON ai_chat_messages TO authenticated;
GRANT ALL ON ai_user_settings TO authenticated;
GRANT SELECT ON ai_chat_scope_references TO authenticated;
GRANT ALL ON ai_chat_exports TO authenticated;