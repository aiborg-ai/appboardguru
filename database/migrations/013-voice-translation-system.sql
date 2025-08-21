-- Voice Translation & Transcription System Migration
-- This migration adds comprehensive voice translation and meeting transcription capabilities

-- Voice Translation Sessions
CREATE TABLE IF NOT EXISTS voice_translation_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  session_name TEXT,
  source_language TEXT NOT NULL DEFAULT 'auto',
  target_languages TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  session_type TEXT NOT NULL DEFAULT 'realtime' CHECK (session_type IN ('realtime', 'meeting', 'presentation')),
  participants JSONB DEFAULT '[]',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE
);

-- Voice Translation Entries
CREATE TABLE IF NOT EXISTS voice_translations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES voice_translation_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  original_text TEXT NOT NULL,
  original_language TEXT NOT NULL,
  translations JSONB NOT NULL DEFAULT '{}', -- {"es": "Hola", "fr": "Bonjour", ...}
  confidence_scores JSONB DEFAULT '{}', -- {"original": 0.95, "es": 0.89, ...}
  speaker_id TEXT,
  speaker_name TEXT,
  timestamp_offset INTEGER DEFAULT 0, -- milliseconds from session start
  audio_data BYTEA, -- Optional: store audio segment
  is_corrected BOOLEAN DEFAULT false,
  corrections JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Meeting Transcriptions
CREATE TABLE IF NOT EXISTS meeting_transcriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID, -- References external meeting system
  session_id UUID REFERENCES voice_translation_sessions(id) ON DELETE SET NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  participants JSONB NOT NULL DEFAULT '[]',
  transcript_data JSONB NOT NULL DEFAULT '{}', -- Full transcript with timestamps
  speaker_mapping JSONB DEFAULT '{}', -- Speaker identification data
  summary TEXT,
  action_items JSONB DEFAULT '[]',
  decisions JSONB DEFAULT '[]',
  next_meeting_date TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'archived')),
  language_stats JSONB DEFAULT '{}', -- Languages detected and usage stats
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Language Preferences per User
CREATE TABLE IF NOT EXISTS user_language_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  primary_language TEXT NOT NULL DEFAULT 'en',
  secondary_languages TEXT[] DEFAULT '{}',
  accent_profile TEXT,
  dialect_region TEXT,
  voice_patterns JSONB DEFAULT '{}', -- Learning data for voice recognition
  terminology_dictionary JSONB DEFAULT '{}', -- Custom terms and translations
  translation_quality_preference TEXT DEFAULT 'balanced' CHECK (
    translation_quality_preference IN ('speed', 'balanced', 'accuracy')
  ),
  auto_translate BOOLEAN DEFAULT false,
  preferred_translators TEXT[] DEFAULT '{}', -- Preferred translation services
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, organization_id)
);

-- Translation History and Metrics
CREATE TABLE IF NOT EXISTS translation_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  session_id UUID REFERENCES voice_translation_sessions(id) ON DELETE CASCADE,
  source_language TEXT NOT NULL,
  target_language TEXT NOT NULL,
  total_words INTEGER DEFAULT 0,
  total_phrases INTEGER DEFAULT 0,
  accuracy_score DECIMAL(3,2), -- 0.00 to 1.00
  latency_ms INTEGER, -- Translation latency in milliseconds
  confidence_avg DECIMAL(3,2), -- Average confidence score
  corrections_count INTEGER DEFAULT 0,
  user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
  feedback_notes TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Voice Pattern Learning Data (for improved recognition)
CREATE TABLE IF NOT EXISTS voice_learning_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  audio_fingerprint TEXT NOT NULL, -- Hashed audio characteristics
  phoneme_patterns JSONB DEFAULT '{}',
  accent_markers JSONB DEFAULT '{}',
  speaking_rate_patterns JSONB DEFAULT '{}',
  vocabulary_frequency JSONB DEFAULT '{}', -- Frequently used terms
  error_patterns JSONB DEFAULT '{}', -- Common recognition errors for learning
  improvement_suggestions JSONB DEFAULT '{}',
  confidence_trends JSONB DEFAULT '{}',
  last_training_session TIMESTAMP WITH TIME ZONE,
  training_iterations INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, organization_id)
);

-- Custom Terminology Dictionary
CREATE TABLE IF NOT EXISTS custom_terminology (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  term TEXT NOT NULL,
  context_category TEXT DEFAULT 'general' CHECK (
    context_category IN ('general', 'board_governance', 'financial', 'legal', 'technical', 'industry_specific')
  ),
  translations JSONB NOT NULL DEFAULT '{}', -- {"es": "término", "fr": "terme", ...}
  pronunciation_guide TEXT,
  usage_frequency INTEGER DEFAULT 0,
  confidence_override DECIMAL(3,2), -- Override confidence for this term
  is_organization_wide BOOLEAN DEFAULT false, -- Available to all org members
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(organization_id, term, context_category)
);

-- Real-time Translation WebSocket Sessions
CREATE TABLE IF NOT EXISTS websocket_translation_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES voice_translation_sessions(id) ON DELETE CASCADE,
  connection_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'connected' CHECK (status IN ('connected', 'disconnected', 'error')),
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  connection_quality JSONB DEFAULT '{}', -- Latency, packet loss, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(session_id, connection_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_voice_translation_sessions_user_org 
  ON voice_translation_sessions(user_id, organization_id, is_active);

CREATE INDEX IF NOT EXISTS idx_voice_translations_session_timestamp 
  ON voice_translations(session_id, timestamp_offset);

CREATE INDEX IF NOT EXISTS idx_voice_translations_search 
  ON voice_translations USING GIN(to_tsvector('english', original_text));

CREATE INDEX IF NOT EXISTS idx_meeting_transcriptions_org_status 
  ON meeting_transcriptions(organization_id, status, created_at);

CREATE INDEX IF NOT EXISTS idx_user_language_preferences_lookup 
  ON user_language_preferences(user_id, organization_id);

CREATE INDEX IF NOT EXISTS idx_translation_metrics_user_date 
  ON translation_metrics(user_id, date, source_language, target_language);

CREATE INDEX IF NOT EXISTS idx_custom_terminology_org_search 
  ON custom_terminology(organization_id, context_category) 
  WHERE is_organization_wide = true;

CREATE INDEX IF NOT EXISTS idx_voice_learning_patterns 
  ON voice_learning_data(user_id, organization_id, last_training_session);

-- Row Level Security Policies
ALTER TABLE voice_translation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_transcriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_language_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE translation_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_learning_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_terminology ENABLE ROW LEVEL SECURITY;
ALTER TABLE websocket_translation_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for voice_translation_sessions
CREATE POLICY voice_translation_sessions_user_access ON voice_translation_sessions
  FOR ALL USING (
    user_id = auth.uid() OR 
    organization_id IN (
      SELECT organization_id FROM organization_memberships 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- RLS Policies for voice_translations
CREATE POLICY voice_translations_session_access ON voice_translations
  FOR ALL USING (
    user_id = auth.uid() OR 
    session_id IN (
      SELECT id FROM voice_translation_sessions 
      WHERE user_id = auth.uid() OR organization_id IN (
        SELECT organization_id FROM organization_memberships 
        WHERE user_id = auth.uid() AND status = 'active'
      )
    )
  );

-- RLS Policies for meeting_transcriptions
CREATE POLICY meeting_transcriptions_org_access ON meeting_transcriptions
  FOR ALL USING (
    created_by = auth.uid() OR 
    organization_id IN (
      SELECT organization_id FROM organization_memberships 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- RLS Policies for user_language_preferences
CREATE POLICY user_language_preferences_owner_access ON user_language_preferences
  FOR ALL USING (user_id = auth.uid());

-- RLS Policies for translation_metrics
CREATE POLICY translation_metrics_user_access ON translation_metrics
  FOR ALL USING (
    user_id = auth.uid() OR 
    organization_id IN (
      SELECT organization_id FROM organization_memberships 
      WHERE user_id = auth.uid() AND status = 'active' AND role IN ('admin', 'director')
    )
  );

-- RLS Policies for voice_learning_data
CREATE POLICY voice_learning_data_owner_access ON voice_learning_data
  FOR ALL USING (user_id = auth.uid());

-- RLS Policies for custom_terminology
CREATE POLICY custom_terminology_access ON custom_terminology
  FOR ALL USING (
    created_by = auth.uid() OR
    (is_organization_wide = true AND organization_id IN (
      SELECT organization_id FROM organization_memberships 
      WHERE user_id = auth.uid() AND status = 'active'
    ))
  );

-- RLS Policies for websocket_translation_sessions
CREATE POLICY websocket_translation_sessions_user_access ON websocket_translation_sessions
  FOR ALL USING (user_id = auth.uid());

-- Functions for automated cleanup and maintenance
CREATE OR REPLACE FUNCTION cleanup_expired_translation_sessions()
RETURNS void AS $$
BEGIN
  -- End sessions that have been inactive for more than 24 hours
  UPDATE voice_translation_sessions 
  SET is_active = false, ended_at = NOW()
  WHERE is_active = true 
    AND updated_at < NOW() - INTERVAL '24 hours'
    AND ended_at IS NULL;
  
  -- Clean up old websocket connections
  DELETE FROM websocket_translation_sessions 
  WHERE last_activity < NOW() - INTERVAL '1 hour'
    AND status = 'disconnected';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update voice learning patterns
CREATE OR REPLACE FUNCTION update_voice_learning_patterns(
  p_user_id UUID,
  p_org_id UUID,
  p_patterns JSONB
)
RETURNS void AS $$
BEGIN
  INSERT INTO voice_learning_data (
    user_id, 
    organization_id, 
    phoneme_patterns, 
    last_training_session,
    training_iterations
  ) VALUES (
    p_user_id, 
    p_org_id, 
    p_patterns, 
    NOW(),
    1
  )
  ON CONFLICT (user_id, organization_id) 
  DO UPDATE SET
    phoneme_patterns = voice_learning_data.phoneme_patterns || p_patterns,
    last_training_session = NOW(),
    training_iterations = voice_learning_data.training_iterations + 1,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically update session timestamps
CREATE OR REPLACE FUNCTION update_translation_session_timestamp()
RETURNS trigger AS $$
BEGIN
  UPDATE voice_translation_sessions 
  SET updated_at = NOW() 
  WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_session_on_translation
  AFTER INSERT ON voice_translations
  FOR EACH ROW EXECUTE FUNCTION update_translation_session_timestamp();

-- Insert supported languages configuration
INSERT INTO custom_terminology (
  organization_id, 
  term, 
  context_category, 
  translations, 
  is_organization_wide, 
  created_by
) 
SELECT 
  o.id as organization_id,
  'supported_languages' as term,
  'technical' as context_category,
  '{
    "en": "English", "es": "Spanish", "fr": "French", "de": "German", 
    "it": "Italian", "pt": "Portuguese", "ru": "Russian", "zh": "Chinese",
    "ja": "Japanese", "ko": "Korean", "ar": "Arabic", "hi": "Hindi",
    "th": "Thai", "vi": "Vietnamese", "id": "Indonesian", "ms": "Malay",
    "tl": "Filipino", "nl": "Dutch", "sv": "Swedish", "da": "Danish",
    "no": "Norwegian", "fi": "Finnish", "pl": "Polish", "cs": "Czech",
    "hu": "Hungarian", "ro": "Romanian", "bg": "Bulgarian", "hr": "Croatian"
  }'::jsonb as translations,
  true as is_organization_wide,
  o.created_by as created_by
FROM organizations o
ON CONFLICT (organization_id, term, context_category) DO NOTHING;

-- Add audit logging for voice translation activities
INSERT INTO audit_logs (
  user_id,
  organization_id,
  event_type,
  event_category,
  action,
  resource_type,
  event_description,
  outcome
)
SELECT 
  '00000000-0000-0000-0000-000000000000'::uuid,
  o.id,
  'system',
  'voice_translation',
  'schema_migration',
  'database_schema',
  'Voice translation and transcription system schema created',
  'success'
FROM organizations o;

COMMENT ON TABLE voice_translation_sessions IS 'Real-time voice translation sessions with multi-language support';
COMMENT ON TABLE voice_translations IS 'Individual translation entries within sessions with confidence scores';
COMMENT ON TABLE meeting_transcriptions IS 'Meeting transcription data with speaker identification and summaries';
COMMENT ON TABLE user_language_preferences IS 'User language preferences and voice recognition patterns';
COMMENT ON TABLE translation_metrics IS 'Translation quality metrics and performance analytics';
COMMENT ON TABLE voice_learning_data IS 'Machine learning data for improving voice recognition accuracy';
COMMENT ON TABLE custom_terminology IS 'Organization and user-specific terminology dictionaries';
COMMENT ON TABLE websocket_translation_sessions IS 'Real-time WebSocket connection management for live translation';