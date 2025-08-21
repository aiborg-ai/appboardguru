/**
 * Voice Biometric Database Schema Types
 * Database table definitions for voice biometric security and personalization features
 */

export interface VoiceBiometricDatabase {
  public: {
    Tables: {
      voice_biometric_profiles: {
        Row: {
          id: string;
          user_id: string;
          organization_id: string;
          profile_name: string | null;
          voiceprint_template: string; // Encrypted biometric template
          security_hash: string;
          encryption_method: string;
          template_version: string;
          enrollment_complete: boolean;
          quality_score: number;
          security_settings: any; // JSON of BiometricSecuritySettings
          personalization_settings: any; // JSON of VoicePersonalizationProfile
          is_active: boolean;
          created_at: string;
          updated_at: string;
          last_used: string | null;
          expires_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          organization_id: string;
          profile_name?: string | null;
          voiceprint_template: string;
          security_hash: string;
          encryption_method?: string;
          template_version?: string;
          enrollment_complete?: boolean;
          quality_score?: number;
          security_settings?: any;
          personalization_settings?: any;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          last_used?: string | null;
          expires_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          organization_id?: string;
          profile_name?: string | null;
          voiceprint_template?: string;
          security_hash?: string;
          encryption_method?: string;
          template_version?: string;
          enrollment_complete?: boolean;
          quality_score?: number;
          security_settings?: any;
          personalization_settings?: any;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          last_used?: string | null;
          expires_at?: string | null;
        };
      };

      voice_authentication_logs: {
        Row: {
          id: string;
          user_id: string;
          organization_id: string;
          session_id: string | null;
          authentication_type: 'login' | 'verification' | 'continuous';
          success: boolean;
          confidence: number;
          duration: number; // milliseconds
          attempts: number;
          fallback_used: string | null;
          risk_level: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
          device_info: any; // JSON of DeviceInfo
          location: any | null; // JSON of GeolocationInfo
          contextual_info: any; // JSON of ContextualInfo
          security_flags: any; // JSON array of SecurityFlag
          biometric_quality: any; // JSON of BiometricQualityMetrics
          emotional_state: string | null;
          stress_level: number | null;
          fraud_indicators: any | null; // JSON array of FraudIndicator
          timestamp: string;
          error_code: string | null;
          error_message: string | null;
          ip_address: string | null;
          user_agent: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          organization_id: string;
          session_id?: string | null;
          authentication_type: 'login' | 'verification' | 'continuous';
          success: boolean;
          confidence: number;
          duration: number;
          attempts?: number;
          fallback_used?: string | null;
          risk_level: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
          device_info?: any;
          location?: any | null;
          contextual_info?: any;
          security_flags?: any;
          biometric_quality?: any;
          emotional_state?: string | null;
          stress_level?: number | null;
          fraud_indicators?: any | null;
          timestamp?: string;
          error_code?: string | null;
          error_message?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          organization_id?: string;
          session_id?: string | null;
          authentication_type?: 'login' | 'verification' | 'continuous';
          success?: boolean;
          confidence?: number;
          duration?: number;
          attempts?: number;
          fallback_used?: string | null;
          risk_level?: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
          device_info?: any;
          location?: any | null;
          contextual_info?: any;
          security_flags?: any;
          biometric_quality?: any;
          emotional_state?: string | null;
          stress_level?: number | null;
          fraud_indicators?: any | null;
          timestamp?: string;
          error_code?: string | null;
          error_message?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
        };
      };

      voice_auth_sessions: {
        Row: {
          id: string;
          user_id: string;
          organization_id: string;
          session_token: string;
          authentication_method: 'voice_primary' | 'voice_secondary' | 'voice_continuous';
          risk_assessment: any; // JSON of SecurityAssessment
          device_fingerprint: string;
          ip_address: string;
          location_data: any | null; // JSON of GeolocationInfo
          expires_at: string;
          created_at: string;
          last_activity: string;
          is_active: boolean;
          revoked_at: string | null;
          revoked_reason: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          organization_id: string;
          session_token: string;
          authentication_method: 'voice_primary' | 'voice_secondary' | 'voice_continuous';
          risk_assessment?: any;
          device_fingerprint: string;
          ip_address: string;
          location_data?: any | null;
          expires_at: string;
          created_at?: string;
          last_activity?: string;
          is_active?: boolean;
          revoked_at?: string | null;
          revoked_reason?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          organization_id?: string;
          session_token?: string;
          authentication_method?: 'voice_primary' | 'voice_secondary' | 'voice_continuous';
          risk_assessment?: any;
          device_fingerprint?: string;
          ip_address?: string;
          location_data?: any | null;
          expires_at?: string;
          created_at?: string;
          last_activity?: string;
          is_active?: boolean;
          revoked_at?: string | null;
          revoked_reason?: string | null;
        };
      };

      emotion_history: {
        Row: {
          id: string;
          user_id: string;
          organization_id: string;
          session_id: string | null;
          emotion_data: any; // JSON of EmotionAnalysisResult
          analysis_type: 'basic' | 'comprehensive' | 'fraud_detection';
          context_tags: string[]; // Array of context strings
          dominant_emotion: string;
          emotion_intensity: number;
          stress_level: number;
          urgency_level: number;
          escalation_triggered: boolean;
          escalation_type: string | null;
          follow_up_required: boolean;
          reviewed_by: string | null;
          reviewed_at: string | null;
          review_notes: string | null;
          created_at: string;
          expires_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          organization_id: string;
          session_id?: string | null;
          emotion_data: any;
          analysis_type: 'basic' | 'comprehensive' | 'fraud_detection';
          context_tags?: string[];
          dominant_emotion: string;
          emotion_intensity: number;
          stress_level: number;
          urgency_level: number;
          escalation_triggered?: boolean;
          escalation_type?: string | null;
          follow_up_required?: boolean;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          review_notes?: string | null;
          created_at?: string;
          expires_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          organization_id?: string;
          session_id?: string | null;
          emotion_data?: any;
          analysis_type?: 'basic' | 'comprehensive' | 'fraud_detection';
          context_tags?: string[];
          dominant_emotion?: string;
          emotion_intensity?: number;
          stress_level?: number;
          urgency_level?: number;
          escalation_triggered?: boolean;
          escalation_type?: string | null;
          follow_up_required?: boolean;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          review_notes?: string | null;
          created_at?: string;
          expires_at?: string | null;
        };
      };

      voice_personalization_profiles: {
        Row: {
          id: string;
          user_id: string;
          organization_id: string;
          profile_data: any; // JSON of VoicePersonalizationProfile
          communication_style: any; // JSON of CommunicationStyle
          interaction_modes: string[]; // Array of InteractionMode
          adaptive_settings: any; // JSON of AdaptiveSettings
          voice_shortcuts: any; // JSON array of VoiceShortcut
          learning_history: any; // JSON of LearningHistory
          privacy_settings: any; // JSON of PersonalizationPreferences
          learning_enabled: boolean;
          data_retention_days: number;
          last_adapted: string | null;
          adaptation_count: number;
          created_at: string;
          updated_at: string;
          version: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          organization_id: string;
          profile_data: any;
          communication_style?: any;
          interaction_modes?: string[];
          adaptive_settings?: any;
          voice_shortcuts?: any;
          learning_history?: any;
          privacy_settings?: any;
          learning_enabled?: boolean;
          data_retention_days?: number;
          last_adapted?: string | null;
          adaptation_count?: number;
          created_at?: string;
          updated_at?: string;
          version?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          organization_id?: string;
          profile_data?: any;
          communication_style?: any;
          interaction_modes?: string[];
          adaptive_settings?: any;
          voice_shortcuts?: any;
          learning_history?: any;
          privacy_settings?: any;
          learning_enabled?: boolean;
          data_retention_days?: number;
          last_adapted?: string | null;
          adaptation_count?: number;
          created_at?: string;
          updated_at?: string;
          version?: string;
        };
      };

      voice_fraud_detection: {
        Row: {
          id: string;
          user_id: string;
          organization_id: string;
          authentication_log_id: string | null;
          risk_score: number;
          fraud_indicators: any; // JSON array of FraudIndicator
          recommendation: 'approve' | 'review' | 'deny';
          confidence: number;
          detection_methods: string[]; // Array of detection method names
          escalation_required: boolean;
          escalation_triggered: boolean;
          escalated_to: string | null;
          escalated_at: string | null;
          review_status: 'pending' | 'reviewed' | 'resolved' | 'false_positive';
          reviewed_by: string | null;
          reviewed_at: string | null;
          resolution_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          organization_id: string;
          authentication_log_id?: string | null;
          risk_score: number;
          fraud_indicators: any;
          recommendation: 'approve' | 'review' | 'deny';
          confidence: number;
          detection_methods?: string[];
          escalation_required?: boolean;
          escalation_triggered?: boolean;
          escalated_to?: string | null;
          escalated_at?: string | null;
          review_status?: 'pending' | 'reviewed' | 'resolved' | 'false_positive';
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          resolution_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          organization_id?: string;
          authentication_log_id?: string | null;
          risk_score?: number;
          fraud_indicators?: any;
          recommendation?: 'approve' | 'review' | 'deny';
          confidence?: number;
          detection_methods?: string[];
          escalation_required?: boolean;
          escalation_triggered?: boolean;
          escalated_to?: string | null;
          escalated_at?: string | null;
          review_status?: 'pending' | 'reviewed' | 'resolved' | 'false_positive';
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          resolution_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };

      voice_security_events: {
        Row: {
          id: string;
          user_id: string | null;
          organization_id: string;
          event_type: 'spoofing_detected' | 'liveness_failed' | 'threshold_exceeded' | 'anomaly_detected' | 'fraud_suspected';
          severity: 'low' | 'medium' | 'high' | 'critical';
          description: string;
          event_data: any; // JSON of event-specific data
          detection_method: string;
          confidence: number;
          automated_response: string | null;
          requires_manual_review: boolean;
          reviewed_by: string | null;
          reviewed_at: string | null;
          resolution: string | null;
          false_positive: boolean | null;
          created_at: string;
          updated_at: string;
          ip_address: string | null;
          user_agent: string | null;
          session_id: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          organization_id: string;
          event_type: 'spoofing_detected' | 'liveness_failed' | 'threshold_exceeded' | 'anomaly_detected' | 'fraud_suspected';
          severity: 'low' | 'medium' | 'high' | 'critical';
          description: string;
          event_data?: any;
          detection_method: string;
          confidence: number;
          automated_response?: string | null;
          requires_manual_review?: boolean;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          resolution?: string | null;
          false_positive?: boolean | null;
          created_at?: string;
          updated_at?: string;
          ip_address?: string | null;
          user_agent?: string | null;
          session_id?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          organization_id?: string;
          event_type?: 'spoofing_detected' | 'liveness_failed' | 'threshold_exceeded' | 'anomaly_detected' | 'fraud_suspected';
          severity?: 'low' | 'medium' | 'high' | 'critical';
          description?: string;
          event_data?: any;
          detection_method?: string;
          confidence?: number;
          automated_response?: string | null;
          requires_manual_review?: boolean;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          resolution?: string | null;
          false_positive?: boolean | null;
          created_at?: string;
          updated_at?: string;
          ip_address?: string | null;
          user_agent?: string | null;
          session_id?: string | null;
        };
      };

      voice_enrollment_sessions: {
        Row: {
          id: string;
          user_id: string;
          organization_id: string;
          profile_id: string;
          session_number: number;
          recording_duration: number; // seconds
          utterance: string;
          quality_score: number;
          signal_to_noise_ratio: number;
          device_info: any; // JSON of DeviceInfo
          audio_characteristics: any; // JSON of VoiceCharacteristics
          enrollment_complete: boolean;
          created_at: string;
          processed_at: string | null;
          processing_error: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          organization_id: string;
          profile_id: string;
          session_number: number;
          recording_duration: number;
          utterance: string;
          quality_score: number;
          signal_to_noise_ratio: number;
          device_info?: any;
          audio_characteristics?: any;
          enrollment_complete?: boolean;
          created_at?: string;
          processed_at?: string | null;
          processing_error?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          organization_id?: string;
          profile_id?: string;
          session_number?: number;
          recording_duration?: number;
          utterance?: string;
          quality_score?: number;
          signal_to_noise_ratio?: number;
          device_info?: any;
          audio_characteristics?: any;
          enrollment_complete?: boolean;
          created_at?: string;
          processed_at?: string | null;
          processing_error?: string | null;
        };
      };

      voice_system_settings: {
        Row: {
          id: string;
          organization_id: string;
          setting_key: string;
          setting_value: any; // JSON value
          setting_type: 'security' | 'personalization' | 'fraud_detection' | 'general';
          description: string | null;
          is_active: boolean;
          can_override_user: boolean;
          created_by: string;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
          version: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          setting_key: string;
          setting_value: any;
          setting_type: 'security' | 'personalization' | 'fraud_detection' | 'general';
          description?: string | null;
          is_active?: boolean;
          can_override_user?: boolean;
          created_by: string;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
          version?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          setting_key?: string;
          setting_value?: any;
          setting_type?: 'security' | 'personalization' | 'fraud_detection' | 'general';
          description?: string | null;
          is_active?: boolean;
          can_override_user?: boolean;
          created_by?: string;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
          version?: string;
        };
      };
    };

    Views: {
      voice_auth_summary: {
        Row: {
          user_id: string;
          organization_id: string;
          total_authentications: number;
          successful_authentications: number;
          success_rate: number;
          average_confidence: number;
          last_authentication: string | null;
          risk_profile: 'low' | 'medium' | 'high';
          fraud_attempts: number;
          escalations: number;
        };
      };

      voice_security_dashboard: {
        Row: {
          organization_id: string;
          total_users: number;
          enrolled_users: number;
          enrollment_rate: number;
          daily_authentications: number;
          success_rate: number;
          fraud_attempts: number;
          security_events: number;
          average_risk_score: number;
          last_updated: string;
        };
      };
    };

    Functions: {
      calculate_voice_risk_score: {
        Args: {
          user_id: string;
          days_back?: number;
        };
        Returns: {
          risk_score: number;
          contributing_factors: any;
          recommendation: string;
        };
      };

      get_voice_auth_analytics: {
        Args: {
          organization_id: string;
          start_date?: string;
          end_date?: string;
        };
        Returns: {
          total_authentications: number;
          success_rate: number;
          fraud_detection_rate: number;
          average_processing_time: number;
          user_adoption_rate: number;
          security_incidents: number;
        };
      };

      cleanup_expired_voice_data: {
        Args: {
          organization_id?: string;
          retention_days?: number;
        };
        Returns: {
          deleted_records: number;
          processed_tables: string[];
        };
      };
    };
  };
}

// SQL Schema for creating the tables (for reference)
export const VOICE_BIOMETRIC_SCHEMA_SQL = `
-- Voice Biometric Profiles Table
CREATE TABLE IF NOT EXISTS voice_biometric_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  profile_name TEXT,
  voiceprint_template TEXT NOT NULL,
  security_hash TEXT NOT NULL,
  encryption_method TEXT DEFAULT 'aes-256-gcm',
  template_version TEXT DEFAULT '1.0',
  enrollment_complete BOOLEAN DEFAULT FALSE,
  quality_score INTEGER DEFAULT 0 CHECK (quality_score >= 0 AND quality_score <= 100),
  security_settings JSONB DEFAULT '{}',
  personalization_settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_used TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  
  UNIQUE(user_id, organization_id, is_active) WHERE is_active = TRUE
);

-- Voice Authentication Logs Table
CREATE TABLE IF NOT EXISTS voice_authentication_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  session_id TEXT,
  authentication_type TEXT NOT NULL CHECK (authentication_type IN ('login', 'verification', 'continuous')),
  success BOOLEAN NOT NULL,
  confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
  duration INTEGER NOT NULL,
  attempts INTEGER DEFAULT 1,
  fallback_used TEXT,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('very_low', 'low', 'medium', 'high', 'very_high')),
  device_info JSONB DEFAULT '{}',
  location JSONB,
  contextual_info JSONB DEFAULT '{}',
  security_flags JSONB DEFAULT '[]',
  biometric_quality JSONB DEFAULT '{}',
  emotional_state TEXT,
  stress_level INTEGER CHECK (stress_level >= 0 AND stress_level <= 100),
  fraud_indicators JSONB DEFAULT '[]',
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  error_code TEXT,
  error_message TEXT,
  ip_address INET,
  user_agent TEXT
);

-- Voice Auth Sessions Table
CREATE TABLE IF NOT EXISTS voice_auth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  authentication_method TEXT NOT NULL CHECK (authentication_method IN ('voice_primary', 'voice_secondary', 'voice_continuous')),
  risk_assessment JSONB DEFAULT '{}',
  device_fingerprint TEXT NOT NULL,
  ip_address INET NOT NULL,
  location_data JSONB,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  revoked_at TIMESTAMPTZ,
  revoked_reason TEXT
);

-- Emotion History Table
CREATE TABLE IF NOT EXISTS emotion_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  session_id TEXT,
  emotion_data JSONB NOT NULL,
  analysis_type TEXT NOT NULL CHECK (analysis_type IN ('basic', 'comprehensive', 'fraud_detection')),
  context_tags TEXT[] DEFAULT '{}',
  dominant_emotion TEXT NOT NULL,
  emotion_intensity INTEGER NOT NULL CHECK (emotion_intensity >= 0 AND emotion_intensity <= 100),
  stress_level INTEGER NOT NULL CHECK (stress_level >= 0 AND stress_level <= 100),
  urgency_level INTEGER NOT NULL CHECK (urgency_level >= 0 AND urgency_level <= 100),
  escalation_triggered BOOLEAN DEFAULT FALSE,
  escalation_type TEXT,
  follow_up_required BOOLEAN DEFAULT FALSE,
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '90 days')
);

-- Voice Personalization Profiles Table
CREATE TABLE IF NOT EXISTS voice_personalization_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  profile_data JSONB NOT NULL,
  communication_style JSONB DEFAULT '{}',
  interaction_modes TEXT[] DEFAULT '{}',
  adaptive_settings JSONB DEFAULT '{}',
  voice_shortcuts JSONB DEFAULT '[]',
  learning_history JSONB DEFAULT '{}',
  privacy_settings JSONB DEFAULT '{}',
  learning_enabled BOOLEAN DEFAULT TRUE,
  data_retention_days INTEGER DEFAULT 365,
  last_adapted TIMESTAMPTZ,
  adaptation_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  version TEXT DEFAULT '1.0',
  
  UNIQUE(user_id, organization_id)
);

-- Voice Fraud Detection Table
CREATE TABLE IF NOT EXISTS voice_fraud_detection (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  authentication_log_id UUID REFERENCES voice_authentication_logs(id),
  risk_score INTEGER NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
  fraud_indicators JSONB NOT NULL DEFAULT '[]',
  recommendation TEXT NOT NULL CHECK (recommendation IN ('approve', 'review', 'deny')),
  confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
  detection_methods TEXT[] DEFAULT '{}',
  escalation_required BOOLEAN DEFAULT FALSE,
  escalation_triggered BOOLEAN DEFAULT FALSE,
  escalated_to UUID REFERENCES users(id),
  escalated_at TIMESTAMPTZ,
  review_status TEXT DEFAULT 'pending' CHECK (review_status IN ('pending', 'reviewed', 'resolved', 'false_positive')),
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Voice Security Events Table
CREATE TABLE IF NOT EXISTS voice_security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('spoofing_detected', 'liveness_failed', 'threshold_exceeded', 'anomaly_detected', 'fraud_suspected')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  detection_method TEXT NOT NULL,
  confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
  automated_response TEXT,
  requires_manual_review BOOLEAN DEFAULT FALSE,
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  resolution TEXT,
  false_positive BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  session_id TEXT
);

-- Voice Enrollment Sessions Table
CREATE TABLE IF NOT EXISTS voice_enrollment_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES voice_biometric_profiles(id) ON DELETE CASCADE,
  session_number INTEGER NOT NULL,
  recording_duration DECIMAL NOT NULL,
  utterance TEXT NOT NULL,
  quality_score INTEGER NOT NULL CHECK (quality_score >= 0 AND quality_score <= 100),
  signal_to_noise_ratio DECIMAL NOT NULL,
  device_info JSONB DEFAULT '{}',
  audio_characteristics JSONB DEFAULT '{}',
  enrollment_complete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  processing_error TEXT
);

-- Voice System Settings Table
CREATE TABLE IF NOT EXISTS voice_system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  setting_key TEXT NOT NULL,
  setting_value JSONB NOT NULL,
  setting_type TEXT NOT NULL CHECK (setting_type IN ('security', 'personalization', 'fraud_detection', 'general')),
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  can_override_user BOOLEAN DEFAULT TRUE,
  created_by UUID NOT NULL REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  version TEXT DEFAULT '1.0',
  
  UNIQUE(organization_id, setting_key, is_active) WHERE is_active = TRUE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_voice_biometric_profiles_user_org ON voice_biometric_profiles(user_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_voice_biometric_profiles_active ON voice_biometric_profiles(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_voice_auth_logs_user_timestamp ON voice_authentication_logs(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_voice_auth_logs_org_timestamp ON voice_authentication_logs(organization_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_voice_auth_logs_success ON voice_authentication_logs(success, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_voice_auth_sessions_user_active ON voice_auth_sessions(user_id, is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_voice_auth_sessions_token ON voice_auth_sessions(session_token) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_emotion_history_user_created ON emotion_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_emotion_history_escalation ON emotion_history(escalation_triggered, follow_up_required);
CREATE INDEX IF NOT EXISTS idx_voice_personalization_user_org ON voice_personalization_profiles(user_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_voice_fraud_detection_risk ON voice_fraud_detection(risk_score DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_voice_fraud_detection_review ON voice_fraud_detection(review_status, escalation_required);
CREATE INDEX IF NOT EXISTS idx_voice_security_events_severity ON voice_security_events(severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_voice_security_events_org ON voice_security_events(organization_id, created_at DESC);

-- Row Level Security (RLS) Policies
ALTER TABLE voice_biometric_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_authentication_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_auth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE emotion_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_personalization_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_fraud_detection ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_enrollment_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_system_settings ENABLE ROW LEVEL SECURITY;

-- Example RLS policies (would need to be customized based on your auth system)
-- Users can only access their own voice biometric data
CREATE POLICY "Users can access own voice biometric profiles" ON voice_biometric_profiles
  FOR ALL USING (user_id = auth.uid());

-- Organization admins can access organization voice data
CREATE POLICY "Organization admins can access voice data" ON voice_authentication_logs
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );
`;