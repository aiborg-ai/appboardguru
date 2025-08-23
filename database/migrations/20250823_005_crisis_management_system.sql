-- Crisis Management System Database Schema
-- Migration: 20250823_005_crisis_management_system.sql
-- Description: Comprehensive crisis management and command center system

-- Crisis Incidents Table
CREATE TABLE IF NOT EXISTS crisis_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('operational', 'financial', 'regulatory', 'reputational', 'cybersecurity', 'legal', 'environmental', 'strategic')),
  level VARCHAR(20) NOT NULL CHECK (level IN ('low', 'medium', 'high', 'critical')),
  status VARCHAR(30) NOT NULL DEFAULT 'active' CHECK (status IN ('monitoring', 'active', 'escalated', 'resolving', 'resolved', 'post_incident')),
  source VARCHAR(100) NOT NULL,
  impact_assessment JSONB DEFAULT '{}',
  timeline JSONB DEFAULT '[]',
  assigned_team TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'
);

-- Emergency Board Meetings Table
CREATE TABLE IF NOT EXISTS emergency_board_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID REFERENCES crisis_incidents(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  urgency VARCHAR(20) NOT NULL CHECK (urgency IN ('immediate', 'urgent', 'high', 'standard')),
  format VARCHAR(30) NOT NULL CHECK (format IN ('video_conference', 'conference_call', 'in_person', 'hybrid')),
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 90,
  timezone VARCHAR(50) DEFAULT 'UTC',
  meeting_link TEXT,
  dial_in_info JSONB,
  physical_location JSONB,
  agenda JSONB DEFAULT '[]',
  attendees JSONB DEFAULT '[]',
  quorum_required INTEGER DEFAULT 0,
  quorum_achieved BOOLEAN DEFAULT false,
  status VARCHAR(20) NOT NULL DEFAULT 'scheduling' CHECK (status IN ('scheduling', 'confirmed', 'in_progress', 'completed', 'cancelled', 'rescheduled')),
  meeting_materials JSONB DEFAULT '[]',
  decisions JSONB DEFAULT '[]',
  action_items JSONB DEFAULT '[]',
  recording_info JSONB,
  security_settings JSONB NOT NULL DEFAULT '{"waiting_room_enabled": true, "password_required": true, "recording_restricted": true, "chat_disabled": false}',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  meeting_notes TEXT,
  follow_up_required BOOLEAN DEFAULT false
);

-- Communication Templates Table
CREATE TABLE IF NOT EXISTS communication_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('operational', 'financial', 'regulatory', 'reputational', 'cybersecurity', 'legal', 'environmental', 'strategic')),
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  communication_type VARCHAR(50) NOT NULL CHECK (communication_type IN ('internal_alert', 'stakeholder_update', 'customer_notification', 'media_statement', 'regulatory_filing', 'investor_alert', 'employee_announcement', 'board_notification', 'vendor_alert', 'community_notice')),
  channel VARCHAR(30) NOT NULL CHECK (channel IN ('email', 'sms', 'push_notification', 'slack', 'teams', 'social_media', 'press_release', 'website_banner', 'phone_call', 'emergency_broadcast')),
  subject_template TEXT NOT NULL,
  content_template TEXT NOT NULL,
  variables JSONB DEFAULT '[]',
  approval_workflow JSONB DEFAULT '[]',
  legal_requirements JSONB DEFAULT '[]',
  compliance_tags TEXT[] DEFAULT '{}',
  audience_segments JSONB DEFAULT '[]',
  timing_constraints JSONB DEFAULT '[]',
  personalization_options JSONB DEFAULT '[]',
  translation_available BOOLEAN DEFAULT false,
  supported_languages TEXT[] DEFAULT ARRAY['en'],
  template_version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_used TIMESTAMP WITH TIME ZONE,
  usage_count INTEGER DEFAULT 0
);

-- Communication Messages Table
CREATE TABLE IF NOT EXISTS communication_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID REFERENCES crisis_incidents(id) ON DELETE SET NULL,
  template_id UUID REFERENCES communication_templates(id) ON DELETE SET NULL,
  communication_type VARCHAR(50) NOT NULL CHECK (communication_type IN ('internal_alert', 'stakeholder_update', 'customer_notification', 'media_statement', 'regulatory_filing', 'investor_alert', 'employee_announcement', 'board_notification', 'vendor_alert', 'community_notice')),
  channel VARCHAR(30) NOT NULL CHECK (channel IN ('email', 'sms', 'push_notification', 'slack', 'teams', 'social_media', 'press_release', 'website_banner', 'phone_call', 'emergency_broadcast')),
  priority VARCHAR(20) NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent', 'critical')),
  subject VARCHAR(300) NOT NULL,
  content TEXT NOT NULL,
  variables_used JSONB DEFAULT '{}',
  target_audiences TEXT[] NOT NULL,
  recipient_count INTEGER DEFAULT 0,
  approval_status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (approval_status IN ('draft', 'pending_review', 'legal_review', 'executive_approval', 'approved', 'rejected', 'sent', 'failed', 'cancelled')),
  approval_history JSONB DEFAULT '[]',
  scheduled_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  delivery_status JSONB DEFAULT '{"total_recipients": 0, "sent": 0, "delivered": 0, "failed": 0, "bounced": 0, "delivery_details": []}',
  analytics JSONB DEFAULT '{"engagement_score": 0}',
  metadata JSONB DEFAULT '{}',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Distribution Lists Table
CREATE TABLE IF NOT EXISTS distribution_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  list_type VARCHAR(20) NOT NULL CHECK (list_type IN ('static', 'dynamic', 'role_based', 'emergency')),
  criteria JSONB NOT NULL DEFAULT '{}',
  contacts JSONB DEFAULT '[]',
  auto_update BOOLEAN DEFAULT false,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Communication Workflows Table
CREATE TABLE IF NOT EXISTS communication_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  trigger_conditions JSONB NOT NULL DEFAULT '{}',
  workflow_steps JSONB DEFAULT '[]',
  escalation_rules JSONB DEFAULT '[]',
  success_criteria TEXT[],
  failure_conditions TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Monitoring Configurations Table
CREATE TABLE IF NOT EXISTS monitoring_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  source VARCHAR(50) NOT NULL CHECK (source IN ('news_feeds', 'social_media', 'market_data', 'regulatory_feeds', 'internal_systems', 'competitor_monitoring', 'sentiment_analysis', 'risk_indicators', 'operational_metrics', 'financial_indicators')),
  category VARCHAR(50) NOT NULL CHECK (category IN ('operational', 'financial', 'regulatory', 'reputational', 'cybersecurity', 'legal', 'environmental', 'strategic')),
  keywords TEXT[] NOT NULL,
  negative_keywords TEXT[] DEFAULT '{}',
  geographic_filters TEXT[],
  language_filters TEXT[] NOT NULL DEFAULT ARRAY['en'],
  sources_whitelist TEXT[],
  sources_blacklist TEXT[],
  sentiment_threshold DECIMAL(3,2) DEFAULT 0.5,
  volume_threshold INTEGER DEFAULT 100,
  velocity_threshold INTEGER DEFAULT 10,
  scoring_weights JSONB DEFAULT '{"relevance": 0.3, "sentiment": 0.2, "volume": 0.2, "source_credibility": 0.2, "temporal_urgency": 0.1}',
  alert_conditions JSONB DEFAULT '[]',
  active BOOLEAN DEFAULT true,
  scan_frequency_minutes INTEGER DEFAULT 15,
  retention_days INTEGER DEFAULT 30,
  last_scan TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Situation Alerts Table
CREATE TABLE IF NOT EXISTS situation_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  configuration_id UUID REFERENCES monitoring_configurations(id) ON DELETE CASCADE,
  alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN ('keyword_match', 'sentiment_spike', 'volume_surge', 'anomaly_detection', 'correlation_found')),
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('info', 'low', 'medium', 'high', 'critical', 'emergency')),
  status VARCHAR(30) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'investigating', 'resolved', 'false_positive', 'escalated')),
  title VARCHAR(300) NOT NULL,
  description TEXT NOT NULL,
  source_data JSONB NOT NULL DEFAULT '{}',
  analysis JSONB NOT NULL DEFAULT '{}',
  geographic_context JSONB,
  temporal_context JSONB NOT NULL DEFAULT '{}',
  correlation_data JSONB,
  actions_taken JSONB DEFAULT '[]',
  assigned_to UUID REFERENCES auth.users(id),
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  escalated_to VARCHAR(100),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Monitoring Dashboards Table
CREATE TABLE IF NOT EXISTS monitoring_dashboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  layout JSONB NOT NULL DEFAULT '{"columns": 12, "rows": 8, "grid_size": "medium"}',
  widgets JSONB DEFAULT '[]',
  filters JSONB DEFAULT '[]',
  refresh_interval_seconds INTEGER DEFAULT 300,
  alert_settings JSONB DEFAULT '{"show_all_alerts": true, "severity_filter": [], "source_filter": [], "auto_acknowledge_low": false}',
  sharing_settings JSONB DEFAULT '{"is_public": false, "shared_with_roles": [], "external_sharing_enabled": false}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Workflow Rules Table
CREATE TABLE IF NOT EXISTS workflow_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  trigger_conditions JSONB NOT NULL DEFAULT '{}',
  actions JSONB DEFAULT '[]',
  escalation_path JSONB DEFAULT '[]',
  enabled BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Workflow Executions Table
CREATE TABLE IF NOT EXISTS workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES crisis_incidents(id) ON DELETE CASCADE,
  workflow_rule_id UUID NOT NULL REFERENCES workflow_rules(id),
  playbook_id UUID,
  current_stage VARCHAR(50) NOT NULL CHECK (current_stage IN ('detection', 'assessment', 'classification', 'escalation', 'response', 'monitoring', 'resolution', 'post_incident')),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  estimated_completion TIMESTAMP WITH TIME ZONE,
  actual_completion TIMESTAMP WITH TIME ZONE,
  stage_history JSONB DEFAULT '[]',
  escalation_history JSONB DEFAULT '[]',
  performance_metrics JSONB DEFAULT '{"response_time": 0, "stages_completed": 0, "actions_executed": 0, "escalations_triggered": 0}',
  status VARCHAR(20) NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'paused', 'completed', 'failed', 'cancelled'))
);

-- Response Playbooks Table
CREATE TABLE IF NOT EXISTS response_playbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('operational', 'financial', 'regulatory', 'reputational', 'cybersecurity', 'legal', 'environmental', 'strategic')),
  level VARCHAR(20) NOT NULL CHECK (level IN ('low', 'medium', 'high', 'critical')),
  stages JSONB DEFAULT '[]',
  estimated_duration_hours INTEGER DEFAULT 4,
  required_roles TEXT[] DEFAULT '{}',
  success_criteria TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Crisis Simulations Table
CREATE TABLE IF NOT EXISTS crisis_simulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  scenario_category VARCHAR(50) NOT NULL CHECK (scenario_category IN ('operational', 'financial', 'regulatory', 'reputational', 'cybersecurity', 'legal', 'environmental', 'strategic')),
  scenario_description TEXT NOT NULL,
  objectives TEXT[] NOT NULL,
  participants TEXT[] NOT NULL,
  duration_minutes INTEGER NOT NULL,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  simulation_data JSONB DEFAULT '{"events": []}',
  performance_metrics JSONB DEFAULT '{"response_time": 0, "decision_quality": 0, "communication_effectiveness": 0, "overall_score": 0}',
  lessons_learned TEXT[] DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Post-Incident Analyses Table
CREATE TABLE IF NOT EXISTS post_incident_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES crisis_incidents(id) ON DELETE CASCADE,
  analysis_type VARCHAR(50) NOT NULL CHECK (analysis_type IN ('hot_wash', 'after_action', 'lessons_learned', 'root_cause', 'timeline_reconstruction', 'stakeholder_impact', 'financial_impact', 'compliance_review')),
  title VARCHAR(300) NOT NULL,
  description TEXT NOT NULL,
  analysis_scope JSONB NOT NULL DEFAULT '{}',
  methodology JSONB DEFAULT '{}',
  timeline_analysis JSONB DEFAULT '{}',
  root_cause_analysis JSONB DEFAULT '{}',
  impact_assessment JSONB DEFAULT '{}',
  response_effectiveness JSONB DEFAULT '{}',
  stakeholder_feedback JSONB DEFAULT '[]',
  key_findings JSONB DEFAULT '[]',
  recommendations JSONB DEFAULT '[]',
  lessons_learned JSONB DEFAULT '[]',
  implementation_plan JSONB DEFAULT '{}',
  metrics_and_kpis JSONB DEFAULT '[]',
  status VARCHAR(30) NOT NULL DEFAULT 'initiated' CHECK (status IN ('initiated', 'data_collection', 'interviewing', 'analysis', 'draft_review', 'stakeholder_review', 'final_review', 'completed', 'published')),
  assigned_analysts UUID[] NOT NULL,
  reviewers JSONB DEFAULT '[]',
  stakeholder_distribution JSONB DEFAULT '{}',
  confidentiality_level VARCHAR(20) NOT NULL DEFAULT 'internal' CHECK (confidentiality_level IN ('public', 'internal', 'confidential', 'restricted')),
  legal_privilege_claimed BOOLEAN DEFAULT false,
  executive_summary TEXT DEFAULT '',
  appendices JSONB DEFAULT '[]',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE,
  published_at TIMESTAMP WITH TIME ZONE
);

-- Meeting Templates Table
CREATE TABLE IF NOT EXISTS meeting_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  urgency VARCHAR(20) NOT NULL CHECK (urgency IN ('immediate', 'urgent', 'high', 'standard')),
  default_duration_minutes INTEGER DEFAULT 90,
  default_format VARCHAR(30) NOT NULL CHECK (default_format IN ('video_conference', 'conference_call', 'in_person', 'hybrid')),
  agenda_template JSONB DEFAULT '[]',
  required_attendee_roles TEXT[] DEFAULT '{}',
  default_materials TEXT[] DEFAULT '{}',
  security_template JSONB NOT NULL DEFAULT '{"waiting_room_enabled": true, "password_required": true, "recording_restricted": true, "chat_disabled": false}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_crisis_incidents_status ON crisis_incidents(status);
CREATE INDEX IF NOT EXISTS idx_crisis_incidents_level ON crisis_incidents(level);
CREATE INDEX IF NOT EXISTS idx_crisis_incidents_category ON crisis_incidents(category);
CREATE INDEX IF NOT EXISTS idx_crisis_incidents_created_at ON crisis_incidents(created_at);

CREATE INDEX IF NOT EXISTS idx_emergency_meetings_incident_id ON emergency_board_meetings(incident_id);
CREATE INDEX IF NOT EXISTS idx_emergency_meetings_scheduled_at ON emergency_board_meetings(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_emergency_meetings_status ON emergency_board_meetings(status);

CREATE INDEX IF NOT EXISTS idx_communication_templates_category ON communication_templates(category);
CREATE INDEX IF NOT EXISTS idx_communication_templates_type ON communication_templates(communication_type);
CREATE INDEX IF NOT EXISTS idx_communication_templates_active ON communication_templates(is_active);

CREATE INDEX IF NOT EXISTS idx_communication_messages_incident_id ON communication_messages(incident_id);
CREATE INDEX IF NOT EXISTS idx_communication_messages_status ON communication_messages(approval_status);
CREATE INDEX IF NOT EXISTS idx_communication_messages_created_at ON communication_messages(created_at);

CREATE INDEX IF NOT EXISTS idx_monitoring_configs_source ON monitoring_configurations(source);
CREATE INDEX IF NOT EXISTS idx_monitoring_configs_category ON monitoring_configurations(category);
CREATE INDEX IF NOT EXISTS idx_monitoring_configs_active ON monitoring_configurations(active);

CREATE INDEX IF NOT EXISTS idx_situation_alerts_config_id ON situation_alerts(configuration_id);
CREATE INDEX IF NOT EXISTS idx_situation_alerts_severity ON situation_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_situation_alerts_status ON situation_alerts(status);
CREATE INDEX IF NOT EXISTS idx_situation_alerts_created_at ON situation_alerts(created_at);

CREATE INDEX IF NOT EXISTS idx_workflow_executions_incident_id ON workflow_executions(incident_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON workflow_executions(status);

CREATE INDEX IF NOT EXISTS idx_post_incident_analyses_incident_id ON post_incident_analyses(incident_id);
CREATE INDEX IF NOT EXISTS idx_post_incident_analyses_status ON post_incident_analyses(status);
CREATE INDEX IF NOT EXISTS idx_post_incident_analyses_type ON post_incident_analyses(analysis_type);

-- Create GIN indexes for JSONB fields that will be queried
CREATE INDEX IF NOT EXISTS idx_crisis_incidents_impact_assessment_gin ON crisis_incidents USING gin(impact_assessment);
CREATE INDEX IF NOT EXISTS idx_situation_alerts_analysis_gin ON situation_alerts USING gin(analysis);
CREATE INDEX IF NOT EXISTS idx_monitoring_configs_alert_conditions_gin ON monitoring_configurations USING gin(alert_conditions);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_crisis_incidents_updated_at BEFORE UPDATE ON crisis_incidents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_emergency_board_meetings_updated_at BEFORE UPDATE ON emergency_board_meetings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_communication_templates_updated_at BEFORE UPDATE ON communication_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_communication_messages_updated_at BEFORE UPDATE ON communication_messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_monitoring_configurations_updated_at BEFORE UPDATE ON monitoring_configurations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_situation_alerts_updated_at BEFORE UPDATE ON situation_alerts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_monitoring_dashboards_updated_at BEFORE UPDATE ON monitoring_dashboards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_workflow_rules_updated_at BEFORE UPDATE ON workflow_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_response_playbooks_updated_at BEFORE UPDATE ON response_playbooks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_post_incident_analyses_updated_at BEFORE UPDATE ON post_incident_analyses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_meeting_templates_updated_at BEFORE UPDATE ON meeting_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_communication_workflows_updated_at BEFORE UPDATE ON communication_workflows FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS) for all tables
ALTER TABLE crisis_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_board_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE distribution_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoring_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE situation_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoring_dashboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE response_playbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE crisis_simulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_incident_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_templates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for crisis management tables
-- Crisis Incidents - accessible by authenticated users in same organization
CREATE POLICY "Users can view crisis incidents in their organization" ON crisis_incidents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY "Crisis managers can manage crisis incidents" ON crisis_incidents
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.user_id = auth.uid()
      AND om.role IN ('admin', 'crisis_manager', 'executive', 'board_member')
    )
  );

-- Emergency Board Meetings - accessible by board members and executives
CREATE POLICY "Board members can access emergency meetings" ON emergency_board_meetings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.user_id = auth.uid()
      AND om.role IN ('admin', 'board_member', 'board_chair', 'executive', 'crisis_manager')
    )
  );

CREATE POLICY "Authorized users can manage emergency meetings" ON emergency_board_meetings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.user_id = auth.uid()
      AND om.role IN ('admin', 'board_chair', 'crisis_manager')
    )
  );

-- Communication Templates - accessible by communication team and executives
CREATE POLICY "Users can view communication templates" ON communication_templates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY "Communication managers can manage templates" ON communication_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.user_id = auth.uid()
      AND om.role IN ('admin', 'communications_manager', 'crisis_manager', 'executive')
    )
  );

-- Monitoring Configurations - accessible by crisis management team
CREATE POLICY "Crisis team can access monitoring configurations" ON monitoring_configurations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.user_id = auth.uid()
      AND om.role IN ('admin', 'crisis_manager', 'security_analyst', 'executive')
    )
  );

CREATE POLICY "Crisis managers can manage monitoring configurations" ON monitoring_configurations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.user_id = auth.uid()
      AND om.role IN ('admin', 'crisis_manager')
    )
  );

-- Situation Alerts - accessible by relevant teams based on severity
CREATE POLICY "Users can view situation alerts" ON situation_alerts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.user_id = auth.uid()
      AND (
        om.role IN ('admin', 'crisis_manager', 'security_analyst', 'executive') OR
        (severity IN ('critical', 'emergency') AND om.role IN ('manager', 'director'))
      )
    )
  );

CREATE POLICY "Crisis team can manage situation alerts" ON situation_alerts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.user_id = auth.uid()
      AND om.role IN ('admin', 'crisis_manager', 'security_analyst')
    )
  );

-- Post-Incident Analyses - restricted access based on confidentiality
CREATE POLICY "Users can view post-incident analyses based on role and confidentiality" ON post_incident_analyses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.user_id = auth.uid()
      AND (
        (confidentiality_level = 'public') OR
        (confidentiality_level = 'internal' AND om.role IS NOT NULL) OR
        (confidentiality_level = 'confidential' AND om.role IN ('admin', 'executive', 'crisis_manager', 'board_member')) OR
        (confidentiality_level = 'restricted' AND om.role IN ('admin', 'board_chair', 'ceo'))
      )
    )
  );

CREATE POLICY "Analysts can manage their assigned analyses" ON post_incident_analyses
  FOR ALL USING (
    auth.uid() = ANY(assigned_analysts) OR
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.user_id = auth.uid()
      AND om.role IN ('admin', 'crisis_manager')
    )
  );

-- Default policies for other tables (organization members can access)
DO $$
DECLARE
    table_name TEXT;
    tables TEXT[] := ARRAY[
        'communication_messages', 'distribution_lists', 'communication_workflows',
        'monitoring_dashboards', 'workflow_rules', 'workflow_executions',
        'response_playbooks', 'crisis_simulations', 'meeting_templates'
    ];
BEGIN
    FOREACH table_name IN ARRAY tables
    LOOP
        EXECUTE format('
            CREATE POLICY "Organization members can access %I" ON %I
              FOR SELECT USING (
                EXISTS (
                  SELECT 1 FROM organization_members om
                  WHERE om.user_id = auth.uid()
                )
              );', table_name, table_name);
        
        EXECUTE format('
            CREATE POLICY "Authorized users can manage %I" ON %I
              FOR ALL USING (
                EXISTS (
                  SELECT 1 FROM organization_members om
                  WHERE om.user_id = auth.uid()
                  AND om.role IN (''admin'', ''crisis_manager'', ''executive'')
                )
              );', table_name, table_name);
    END LOOP;
END
$$;

-- Insert default communication templates
INSERT INTO communication_templates (
  name, description, category, severity, communication_type, channel,
  subject_template, content_template, variables, approval_workflow,
  supported_languages, created_by
) VALUES 
(
  'Critical Incident Alert - Internal',
  'Template for notifying internal stakeholders of critical incidents',
  'operational',
  'critical',
  'internal_alert',
  'email',
  'CRITICAL: {{incident_title}} - Immediate Action Required',
  'We are currently experiencing a critical incident: {{incident_title}}

Incident Details:
- Category: {{incident_category}}
- Severity: {{incident_level}}
- Impact: {{impact_description}}
- Status: {{incident_status}}

Initial Response:
{{initial_response_actions}}

Next Steps:
{{next_steps}}

This is an automated alert from the Crisis Management System. For immediate assistance, contact the crisis management team.',
  '[{"name": "incident_title", "description": "Title of the incident", "type": "text", "required": true}, {"name": "incident_category", "description": "Category of the incident", "type": "text", "required": true}, {"name": "incident_level", "description": "Severity level", "type": "text", "required": true}]',
  '[{"step_order": 1, "approver_role": ["crisis_manager"], "required_approvals": 1, "escalation_timeout_minutes": 15, "can_reject": false, "can_edit": true}]',
  ARRAY['en'],
  (SELECT id FROM auth.users LIMIT 1)
),
(
  'Emergency Board Meeting Notice',
  'Template for emergency board meeting notifications',
  'operational',
  'high',
  'board_notification',
  'email',
  'URGENT: Emergency Board Meeting - {{meeting_date}}',
  'An emergency board meeting has been scheduled to address a critical situation.

Meeting Details:
- Date & Time: {{meeting_date}} at {{meeting_time}}
- Duration: {{meeting_duration}} minutes
- Format: {{meeting_format}}
- Meeting Link: {{meeting_link}}

Agenda:
{{meeting_agenda}}

The situation requires immediate board attention and your participation is essential.

Please confirm your attendance by replying to this email or calling the board secretary.

This meeting is being recorded and all board policies regarding confidentiality apply.',
  '[{"name": "meeting_date", "description": "Meeting date", "type": "date", "required": true}, {"name": "meeting_time", "description": "Meeting time", "type": "text", "required": true}]',
  '[{"step_order": 1, "approver_role": ["board_chair", "ceo"], "required_approvals": 1, "escalation_timeout_minutes": 30, "can_reject": false, "can_edit": true}]',
  ARRAY['en'],
  (SELECT id FROM auth.users LIMIT 1)
),
(
  'Stakeholder Crisis Update',
  'Template for external stakeholder crisis communications',
  'reputational',
  'high',
  'stakeholder_update',
  'email',
  'Important Update: {{organization_name}} Incident Response',
  'Dear {{stakeholder_name}},

We want to inform you of a recent incident that may impact our operations and provide you with an update on our response efforts.

Incident Summary:
{{incident_summary}}

Our Response:
{{response_actions}}

Impact Assessment:
{{impact_assessment}}

Next Steps:
{{next_steps}}

Expected Resolution:
{{expected_resolution}}

We are committed to transparency and will provide regular updates as the situation develops. If you have any questions or concerns, please don''t hesitate to contact us.

Thank you for your continued partnership.

{{organization_name}} Crisis Response Team',
  '[{"name": "stakeholder_name", "description": "Name of stakeholder", "type": "text", "required": true}, {"name": "organization_name", "description": "Organization name", "type": "text", "required": true}]',
  '[{"step_order": 1, "approver_role": ["legal_counsel"], "required_approvals": 1, "escalation_timeout_minutes": 60, "can_reject": true, "can_edit": true}, {"step_order": 2, "approver_role": ["ceo", "communications_manager"], "required_approvals": 1, "escalation_timeout_minutes": 30, "can_reject": true, "can_edit": false}]',
  ARRAY['en'],
  (SELECT id FROM auth.users LIMIT 1)
);

-- Insert default workflow rules
INSERT INTO workflow_rules (
  name, description, trigger_conditions, actions, escalation_path, enabled, priority
) VALUES 
(
  'Critical Incident Auto-Response',
  'Automatic response workflow for critical incidents',
  '{"categories": ["operational", "cybersecurity"], "levels": ["critical"], "impact_threshold": 0.8}',
  '[{"type": "notify", "parameters": {"recipients": ["crisis_team"], "message": "Critical incident detected", "priority": "urgent"}}, {"type": "escalate", "parameters": {"level": "executive_team", "immediate": true}}, {"type": "create_meeting", "parameters": {"meeting_type": "emergency_board", "attendees": ["board_members"], "duration_minutes": 90}}]',
  '[{"level": "team_lead", "trigger_after_minutes": 15, "notify_roles": ["crisis_manager"], "automatic": true, "approval_required": false, "actions": []}, {"level": "executive_team", "trigger_after_minutes": 30, "notify_roles": ["ceo", "coo"], "automatic": true, "approval_required": false, "actions": []}]',
  true,
  100
),
(
  'Financial Impact Escalation',
  'Escalation workflow for incidents with significant financial impact',
  '{"categories": ["financial"], "levels": ["high", "critical"], "impact_threshold": 0.6}',
  '[{"type": "notify", "parameters": {"recipients": ["finance_team", "executive_team"], "message": "Financial impact incident requires attention", "priority": "high"}}, {"type": "send_communication", "parameters": {"communication_type": "investor_alert", "channel": "email", "audience": ["investors"], "template_id": null}}]',
  '[{"level": "department_head", "trigger_after_minutes": 60, "notify_roles": ["cfo"], "automatic": false, "approval_required": true, "actions": []}, {"level": "board_emergency", "trigger_after_minutes": 120, "notify_roles": ["board_chair"], "automatic": false, "approval_required": true, "actions": []}]',
  true,
  80
);

-- Insert default response playbooks
INSERT INTO response_playbooks (
  name, category, level, stages, estimated_duration_hours, required_roles, success_criteria
) VALUES 
(
  'Cybersecurity Incident Response',
  'cybersecurity',
  'critical',
  '[{"name": "Detection and Analysis", "description": "Identify and analyze the security incident", "duration_minutes": 60, "required_actions": [{"title": "Isolate affected systems", "description": "Disconnect compromised systems from network", "type": "technical", "responsible_role": "security_analyst", "estimated_minutes": 30, "checklist": ["Identify affected systems", "Document current state", "Implement isolation"], "dependencies": [], "critical_path": true}], "success_criteria": ["Incident scope identified", "Systems isolated", "Impact assessed"], "dependencies": [], "parallel_execution": false}]',
  6,
  ARRAY['security_analyst', 'it_manager', 'crisis_manager', 'legal_counsel'],
  ARRAY['Incident contained', 'Systems restored', 'Stakeholders notified', 'Documentation complete']
),
(
  'Financial Crisis Response',
  'financial',
  'high',
  '[{"name": "Assessment and Containment", "description": "Assess financial impact and implement containment measures", "duration_minutes": 120, "required_actions": [{"title": "Calculate financial impact", "description": "Determine immediate and projected financial losses", "type": "assessment", "responsible_role": "financial_analyst", "estimated_minutes": 60, "checklist": ["Review affected accounts", "Calculate immediate impact", "Project future impact"], "dependencies": [], "critical_path": true}], "success_criteria": ["Impact quantified", "Containment measures implemented"], "dependencies": [], "parallel_execution": false}]',
  8,
  ARRAY['cfo', 'financial_analyst', 'crisis_manager', 'legal_counsel', 'board_chair'],
  ARRAY['Financial impact assessed', 'Regulatory requirements met', 'Stakeholder communications complete']
);

-- Insert default meeting templates
INSERT INTO meeting_templates (
  name, description, urgency, default_duration_minutes, default_format,
  agenda_template, required_attendee_roles, security_template
) VALUES 
(
  'Emergency Board Meeting - Crisis Response',
  'Template for emergency board meetings during crisis situations',
  'immediate',
  120,
  'video_conference',
  '[{"title": "Crisis Situation Overview", "description": "Briefing on current crisis situation", "presenter": "crisis_manager", "allocated_minutes": 20, "item_type": "presentation", "decision_required": false, "voting_required": false}, {"title": "Impact Assessment", "description": "Review of financial, operational, and reputational impact", "presenter": "executive_team", "allocated_minutes": 30, "item_type": "discussion", "decision_required": false, "voting_required": false}, {"title": "Response Strategy", "description": "Proposed response strategy and resource allocation", "presenter": "crisis_manager", "allocated_minutes": 40, "item_type": "decision", "decision_required": true, "voting_required": true}, {"title": "Communication Plan", "description": "Stakeholder communication strategy and approval", "presenter": "communications_manager", "allocated_minutes": 20, "item_type": "decision", "decision_required": true, "voting_required": false}]',
  ARRAY['board_chair', 'board_member', 'ceo', 'crisis_manager'],
  '{"waiting_room_enabled": true, "password_required": true, "recording_restricted": true, "chat_disabled": false}'
),
(
  'Crisis Team Coordination Meeting',
  'Template for crisis team coordination meetings',
  'urgent',
  60,
  'video_conference',
  '[{"title": "Situation Update", "description": "Current status and developments", "presenter": "crisis_manager", "allocated_minutes": 15, "item_type": "update", "decision_required": false, "voting_required": false}, {"title": "Action Items Review", "description": "Review progress on assigned action items", "presenter": "team_leads", "allocated_minutes": 20, "item_type": "discussion", "decision_required": false, "voting_required": false}, {"title": "Resource Needs", "description": "Identify additional resource requirements", "presenter": "crisis_manager", "allocated_minutes": 15, "item_type": "discussion", "decision_required": true, "voting_required": false}, {"title": "Next Steps", "description": "Define immediate next actions and assignments", "presenter": "crisis_manager", "allocated_minutes": 10, "item_type": "decision", "decision_required": true, "voting_required": false}]',
  ARRAY['crisis_manager', 'department_heads', 'security_analyst', 'communications_manager'],
  '{"waiting_room_enabled": false, "password_required": true, "recording_restricted": false, "chat_disabled": false}'
);

-- Create a view for crisis dashboard summary
CREATE OR REPLACE VIEW crisis_dashboard_summary AS
SELECT 
  COUNT(*) FILTER (WHERE status = 'active') as active_incidents,
  COUNT(*) FILTER (WHERE status = 'critical') as critical_incidents,
  COUNT(*) FILTER (WHERE level = 'critical') as critical_level_incidents,
  COUNT(*) FILTER (WHERE level = 'high') as high_level_incidents,
  COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as incidents_last_week,
  COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as incidents_last_month
FROM crisis_incidents;

-- Grant appropriate permissions
GRANT SELECT ON crisis_dashboard_summary TO authenticated;

-- Insert some sample monitoring configurations for common crisis scenarios
INSERT INTO monitoring_configurations (
  name, description, source, category, keywords, language_filters,
  alert_conditions, created_by
) VALUES 
(
  'Cybersecurity Threat Monitor',
  'Monitor for cybersecurity threats and data breaches',
  'news_feeds',
  'cybersecurity',
  ARRAY['data breach', 'cyber attack', 'ransomware', 'security incident', 'hack', 'malware'],
  ARRAY['en'],
  '[{"id": "high_severity", "name": "High Severity Threat", "condition_type": "threshold", "parameters": {"metric": "relevance_score", "operator": ">=", "value": 0.7}, "severity": "high", "auto_escalate": true, "escalation_delay_minutes": 30}]',
  (SELECT id FROM auth.users LIMIT 1)
),
(
  'Financial Market Monitor',
  'Monitor financial markets and economic indicators',
  'market_data',
  'financial',
  ARRAY['market volatility', 'economic downturn', 'financial crisis', 'recession', 'inflation'],
  ARRAY['en'],
  '[{"id": "market_alert", "name": "Market Impact Alert", "condition_type": "threshold", "parameters": {"metric": "impact_potential", "operator": ">=", "value": 0.6}, "severity": "medium", "auto_escalate": false}]',
  (SELECT id FROM auth.users LIMIT 1)
),
(
  'Regulatory Compliance Monitor',
  'Monitor regulatory announcements and compliance requirements',
  'regulatory_feeds',
  'regulatory',
  ARRAY['regulation', 'compliance', 'regulatory change', 'policy update', 'enforcement action'],
  ARRAY['en'],
  '[{"id": "regulatory_change", "name": "Regulatory Change Alert", "condition_type": "threshold", "parameters": {"metric": "credibility_score", "operator": ">=", "value": 0.8}, "severity": "medium", "auto_escalate": true, "escalation_delay_minutes": 60}]',
  (SELECT id FROM auth.users LIMIT 1)
);

-- Migration completed successfully
COMMENT ON SCHEMA public IS 'Crisis Management System - Migration 20250823_005 - Comprehensive crisis response and command center system';