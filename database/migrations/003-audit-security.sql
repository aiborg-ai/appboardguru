-- =====================================================
-- AUDIT & SECURITY SYSTEM - MIGRATION 003
-- Phase 3: Comprehensive Audit Logging and Security Features
-- =====================================================

-- =====================================================
-- 1. ENHANCED AUDIT LOGGING SYSTEM
-- =====================================================

-- Drop existing simple audit_logs and create comprehensive version
DROP TABLE IF EXISTS audit_logs CASCADE;

CREATE TYPE audit_event_type AS ENUM (
  'authentication', 'authorization', 'data_access', 'data_modification',
  'system_admin', 'security_event', 'compliance', 'user_action'
);

CREATE TYPE audit_severity AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE audit_outcome AS ENUM ('success', 'failure', 'error', 'blocked');

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Core Identity & Context
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id TEXT,
  
  -- Event Classification
  event_type audit_event_type NOT NULL,
  event_category TEXT NOT NULL, -- More specific categorization
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  
  -- Event Details
  event_description TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  
  -- Security Context
  severity audit_severity DEFAULT 'low',
  outcome audit_outcome NOT NULL,
  risk_score INTEGER CHECK (risk_score >= 0 AND risk_score <= 100),
  
  -- Technical Context
  ip_address INET,
  user_agent TEXT,
  device_fingerprint TEXT,
  geolocation JSONB, -- { country, region, city, lat, lng }
  
  -- Request Context
  http_method TEXT,
  endpoint TEXT,
  request_headers JSONB,
  response_status INTEGER,
  response_time_ms INTEGER,
  
  -- Data Changes (for modification events)
  old_values JSONB,
  new_values JSONB,
  affected_rows INTEGER,
  
  -- Timing & Correlation
  created_at TIMESTAMPTZ DEFAULT NOW(),
  correlation_id UUID, -- Link related events
  parent_event_id UUID REFERENCES audit_logs(id),
  
  -- Compliance & Legal
  retention_period INTERVAL DEFAULT INTERVAL '7 years',
  compliance_tags TEXT[] DEFAULT '{}',
  legal_hold BOOLEAN DEFAULT false,
  
  -- Investigation Support
  investigation_status TEXT CHECK (investigation_status IN ('none', 'pending', 'in_progress', 'resolved', 'closed')),
  assigned_investigator UUID REFERENCES users(id),
  investigation_notes TEXT,
  resolved_at TIMESTAMPTZ
);

-- =====================================================
-- 2. SECURITY MONITORING & THREAT DETECTION
-- =====================================================

CREATE TYPE threat_type AS ENUM (
  'brute_force', 'anomalous_access', 'data_exfiltration', 'privilege_escalation',
  'suspicious_location', 'impossible_travel', 'malicious_file', 'social_engineering'
);

CREATE TYPE threat_status AS ENUM ('detected', 'investigating', 'confirmed', 'false_positive', 'mitigated');

CREATE TABLE security_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Incident Identification
  incident_number TEXT UNIQUE NOT NULL DEFAULT 'INC-' || to_char(NOW(), 'YYYYMMDD') || '-' || LPAD((EXTRACT(epoch FROM NOW()) % 86400)::TEXT, 5, '0'),
  title TEXT NOT NULL,
  description TEXT,
  
  -- Threat Classification
  threat_type threat_type NOT NULL,
  severity audit_severity NOT NULL,
  confidence_score INTEGER CHECK (confidence_score >= 0 AND confidence_score <= 100),
  
  -- Affected Resources
  organization_id UUID REFERENCES organizations(id),
  affected_users UUID[] DEFAULT '{}',
  affected_resources JSONB DEFAULT '{}',
  
  -- Detection & Response
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  detected_by TEXT, -- System, user, or external source
  status threat_status DEFAULT 'detected',
  
  -- Investigation
  assigned_to UUID REFERENCES users(id),
  investigation_started_at TIMESTAMPTZ,
  investigation_notes TEXT,
  evidence JSONB DEFAULT '{}',
  
  -- Resolution
  resolved_at TIMESTAMPTZ,
  resolution_summary TEXT,
  lessons_learned TEXT,
  
  -- Impact Assessment
  business_impact TEXT,
  data_compromised BOOLEAN DEFAULT false,
  estimated_affected_records INTEGER,
  
  -- Compliance Reporting
  requires_external_reporting BOOLEAN DEFAULT false,
  reported_to_authorities_at TIMESTAMPTZ,
  compliance_violations TEXT[],
  
  -- Related Events
  related_audit_log_ids UUID[] DEFAULT '{}',
  parent_incident_id UUID REFERENCES security_incidents(id),
  
  -- Timing Constraints
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 3. ACCESS CONTROL & SESSION MANAGEMENT
-- =====================================================

CREATE TYPE session_status AS ENUM ('active', 'expired', 'terminated', 'suspicious');

CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Core Identity
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Session Data
  session_token TEXT UNIQUE NOT NULL,
  refresh_token TEXT UNIQUE,
  
  -- Device & Location
  device_id TEXT,
  device_name TEXT,
  device_type TEXT,
  os_info TEXT,
  browser_info TEXT,
  ip_address INET NOT NULL,
  
  -- Geographic Data
  country_code CHAR(2),
  region TEXT,
  city TEXT,
  timezone TEXT,
  
  -- Session Lifecycle
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  
  -- Security Features
  status session_status DEFAULT 'active',
  is_trusted_device BOOLEAN DEFAULT false,
  requires_2fa BOOLEAN DEFAULT false,
  mfa_verified_at TIMESTAMPTZ,
  
  -- Security Monitoring
  login_attempts INTEGER DEFAULT 1,
  suspicious_activity_count INTEGER DEFAULT 0,
  risk_score INTEGER DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
  
  -- Activity Tracking
  pages_visited INTEGER DEFAULT 0,
  actions_performed INTEGER DEFAULT 0,
  data_accessed JSONB DEFAULT '{}',
  
  -- Termination
  terminated_at TIMESTAMPTZ,
  termination_reason TEXT,
  terminated_by UUID REFERENCES users(id)
);

-- =====================================================
-- 4. RATE LIMITING & ABUSE PREVENTION
-- =====================================================

CREATE TABLE rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Rate Limit Identity
  identifier TEXT NOT NULL, -- IP, user_id, or combination
  identifier_type TEXT NOT NULL CHECK (identifier_type IN ('ip', 'user', 'api_key', 'organization')),
  
  -- Rate Limit Configuration
  endpoint_pattern TEXT NOT NULL,
  http_method TEXT,
  
  -- Limits & Windows
  max_requests INTEGER NOT NULL,
  window_seconds INTEGER NOT NULL,
  current_requests INTEGER DEFAULT 0,
  
  -- Timing
  window_start TIMESTAMPTZ DEFAULT NOW(),
  last_request_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Status & Actions
  is_blocked BOOLEAN DEFAULT false,
  blocked_until TIMESTAMPTZ,
  block_reason TEXT,
  
  -- Escalation
  consecutive_limit_hits INTEGER DEFAULT 0,
  escalation_level INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(identifier, endpoint_pattern, http_method)
);

-- =====================================================
-- 5. DATA PROTECTION & ENCRYPTION
-- =====================================================

CREATE TABLE encryption_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Key Identity
  key_id TEXT UNIQUE NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Key Properties
  key_type TEXT NOT NULL CHECK (key_type IN ('data_encryption', 'signing', 'backup')),
  algorithm TEXT NOT NULL,
  key_size INTEGER NOT NULL,
  
  -- Key Lifecycle
  created_at TIMESTAMPTZ DEFAULT NOW(),
  activated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  rotated_at TIMESTAMPTZ,
  
  -- Status & Management
  status TEXT DEFAULT 'active' CHECK (status IN ('pending', 'active', 'rotated', 'expired', 'revoked')),
  created_by UUID NOT NULL REFERENCES users(id),
  
  -- Usage Tracking
  encryption_count BIGINT DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  
  -- Security
  checksum TEXT NOT NULL,
  backup_created BOOLEAN DEFAULT false,
  hardware_protected BOOLEAN DEFAULT false
);

-- =====================================================
-- 6. COMPLIANCE & GDPR SUPPORT
-- =====================================================

CREATE TYPE data_processing_basis AS ENUM (
  'consent', 'contract', 'legal_obligation', 'vital_interests', 
  'public_task', 'legitimate_interests'
);

CREATE TABLE data_processing_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Data Subject
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Processing Details
  processing_purpose TEXT NOT NULL,
  legal_basis data_processing_basis NOT NULL,
  data_categories TEXT[] NOT NULL, -- e.g., ['personal_identity', 'contact_info', 'usage_data']
  
  -- Data Sources & Recipients
  data_sources TEXT[] DEFAULT '{}',
  data_recipients TEXT[] DEFAULT '{}',
  third_country_transfers BOOLEAN DEFAULT false,
  transfer_safeguards TEXT,
  
  -- Retention & Deletion
  retention_period INTERVAL NOT NULL,
  retention_justification TEXT,
  scheduled_deletion_date DATE,
  actual_deletion_date DATE,
  
  -- Consent Management
  consent_obtained_at TIMESTAMPTZ,
  consent_withdrawn_at TIMESTAMPTZ,
  consent_method TEXT,
  
  -- Audit Trail
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES users(id),
  last_reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES users(id)
);

-- =====================================================
-- 7. PERFORMANCE INDEXES
-- =====================================================

-- Audit Logs
CREATE INDEX idx_audit_logs_organization_time ON audit_logs(organization_id, created_at DESC);
CREATE INDEX idx_audit_logs_user_time ON audit_logs(user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX idx_audit_logs_event_type ON audit_logs(event_type, severity, created_at DESC);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_outcome ON audit_logs(outcome, severity) WHERE outcome != 'success';
CREATE INDEX idx_audit_logs_correlation ON audit_logs(correlation_id) WHERE correlation_id IS NOT NULL;
CREATE INDEX idx_audit_logs_investigation ON audit_logs(investigation_status) WHERE investigation_status != 'none';

-- Security Incidents
CREATE INDEX idx_security_incidents_organization ON security_incidents(organization_id, detected_at DESC);
CREATE INDEX idx_security_incidents_status ON security_incidents(status, severity, detected_at DESC);
CREATE INDEX idx_security_incidents_type ON security_incidents(threat_type, detected_at DESC);
CREATE INDEX idx_security_incidents_assigned ON security_incidents(assigned_to, status);

-- User Sessions
CREATE INDEX idx_user_sessions_user ON user_sessions(user_id, status, last_activity_at DESC);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token) WHERE status = 'active';
CREATE INDEX idx_user_sessions_device ON user_sessions(device_id, user_id) WHERE device_id IS NOT NULL;
CREATE INDEX idx_user_sessions_ip ON user_sessions(ip_address, created_at DESC);
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at) WHERE status = 'active';

-- Rate Limits
CREATE INDEX idx_rate_limits_identifier ON rate_limits(identifier, endpoint_pattern);
CREATE INDEX idx_rate_limits_blocked ON rate_limits(identifier_type, is_blocked, blocked_until);
CREATE INDEX idx_rate_limits_window ON rate_limits(window_start, window_seconds);

-- =====================================================
-- 8. AUTOMATED SECURITY FUNCTIONS
-- =====================================================

-- Function to create audit log entry
CREATE OR REPLACE FUNCTION create_audit_log(
  p_organization_id UUID,
  p_user_id UUID,
  p_event_type audit_event_type,
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id TEXT DEFAULT NULL,
  p_details JSONB DEFAULT '{}',
  p_outcome audit_outcome DEFAULT 'success',
  p_severity audit_severity DEFAULT 'low'
)
RETURNS UUID AS $$
DECLARE
  v_audit_id UUID;
BEGIN
  INSERT INTO audit_logs (
    organization_id, user_id, event_type, event_category, action, 
    resource_type, resource_id, event_description, details, 
    outcome, severity
  ) VALUES (
    p_organization_id, p_user_id, p_event_type, p_event_type::text, p_action,
    p_resource_type, p_resource_id, 
    format('%s %s on %s %s', p_outcome, p_action, p_resource_type, COALESCE(p_resource_id, '')),
    p_details, p_outcome, p_severity
  ) RETURNING id INTO v_audit_id;
  
  RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to detect suspicious activity
CREATE OR REPLACE FUNCTION detect_suspicious_activity()
RETURNS TRIGGER AS $$
DECLARE
  v_recent_failures INTEGER;
  v_risk_score INTEGER := 0;
BEGIN
  -- Check for multiple failed login attempts
  IF NEW.outcome = 'failure' AND NEW.action = 'login' THEN
    SELECT COUNT(*) INTO v_recent_failures
    FROM audit_logs
    WHERE user_id = NEW.user_id
      AND action = 'login'
      AND outcome = 'failure'
      AND created_at > NOW() - INTERVAL '1 hour';
    
    IF v_recent_failures >= 5 THEN
      v_risk_score := 80;
      
      -- Create security incident
      INSERT INTO security_incidents (
        title, description, threat_type, severity, confidence_score,
        organization_id, affected_users, detected_by, evidence
      ) VALUES (
        'Multiple Failed Login Attempts',
        format('User %s has %s failed login attempts in the last hour', NEW.user_id, v_recent_failures),
        'brute_force', 'high', 90,
        NEW.organization_id, ARRAY[NEW.user_id], 'system',
        jsonb_build_object('failed_attempts', v_recent_failures, 'time_window', '1 hour')
      );
    END IF;
  END IF;
  
  -- Update risk score
  NEW.risk_score := v_risk_score;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_detect_suspicious_activity
  BEFORE INSERT ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION detect_suspicious_activity();

-- Function to cleanup expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
  v_cleaned_count INTEGER;
BEGIN
  UPDATE user_sessions 
  SET status = 'expired', terminated_at = NOW(), termination_reason = 'expired'
  WHERE status = 'active' AND expires_at < NOW();
  
  GET DIAGNOSTICS v_cleaned_count = ROW_COUNT;
  
  -- Log cleanup activity
  IF v_cleaned_count > 0 THEN
    PERFORM create_audit_log(
      NULL, NULL, 'system_admin', 'session_cleanup', 'user_sessions', NULL,
      jsonb_build_object('cleaned_sessions', v_cleaned_count),
      'success', 'low'
    );
  END IF;
  
  RETURN v_cleaned_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 9. AUTOMATED COMPLIANCE FUNCTIONS
-- =====================================================

-- Function to schedule data deletion for GDPR compliance
CREATE OR REPLACE FUNCTION schedule_gdpr_deletion(
  p_user_id UUID,
  p_organization_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_processing_record RECORD;
BEGIN
  -- Update all processing records to schedule deletion
  FOR v_processing_record IN 
    SELECT * FROM data_processing_records 
    WHERE user_id = p_user_id AND organization_id = p_organization_id
      AND actual_deletion_date IS NULL
  LOOP
    UPDATE data_processing_records
    SET scheduled_deletion_date = CURRENT_DATE + v_processing_record.retention_period
    WHERE id = v_processing_record.id;
  END LOOP;
  
  -- Create audit log
  PERFORM create_audit_log(
    p_organization_id, p_user_id, 'compliance', 'gdpr_deletion_scheduled', 
    'data_processing_records', p_user_id::text,
    jsonb_build_object('action', 'gdpr_right_to_be_forgotten'),
    'success', 'medium'
  );
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 10. MIGRATION TRACKING
-- =====================================================

INSERT INTO _migrations (name, executed_at) 
VALUES ('003-audit-security', NOW())
ON CONFLICT (name) DO NOTHING;