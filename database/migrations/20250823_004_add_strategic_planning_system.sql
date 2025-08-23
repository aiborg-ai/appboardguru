-- =====================================================
-- STRATEGIC PLANNING & OKR MANAGEMENT SYSTEM
-- Database Schema Migration
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- STRATEGIC INITIATIVES TABLES
-- =====================================================

-- Strategic Initiatives
CREATE TABLE IF NOT EXISTS strategic_initiatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Basic Information
  name VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL CHECK (category IN ('growth', 'operational', 'innovation', 'risk', 'sustainability')),
  priority VARCHAR(20) NOT NULL CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  status VARCHAR(20) NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'on_hold', 'completed', 'cancelled')),
  
  -- Timeline
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  
  -- Budget & Resources
  budget_allocated DECIMAL(15,2) NOT NULL DEFAULT 0,
  budget_used DECIMAL(15,2) NOT NULL DEFAULT 0,
  
  -- Progress Tracking
  progress_percentage INTEGER NOT NULL DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  health_score INTEGER NOT NULL DEFAULT 5 CHECK (health_score >= 1 AND health_score <= 10),
  risk_score INTEGER NOT NULL DEFAULT 3 CHECK (risk_score >= 1 AND risk_score <= 10),
  
  -- Relationships
  dependencies JSONB DEFAULT '[]',
  linked_okrs JSONB DEFAULT '[]',
  
  -- Ownership
  owner_id UUID NOT NULL REFERENCES users(id),
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_dates CHECK (end_date > start_date),
  CONSTRAINT valid_budget CHECK (budget_used <= budget_allocated)
);

-- Initiative Milestones
CREATE TABLE IF NOT EXISTS initiative_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initiative_id UUID NOT NULL REFERENCES strategic_initiatives(id) ON DELETE CASCADE,
  
  name VARCHAR(200) NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ NOT NULL,
  completion_date TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'delayed')),
  
  deliverables JSONB DEFAULT '[]',
  success_criteria JSONB DEFAULT '[]',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Initiative Resource Requirements
CREATE TABLE IF NOT EXISTS initiative_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initiative_id UUID NOT NULL REFERENCES strategic_initiatives(id) ON DELETE CASCADE,
  
  resource_type VARCHAR(20) NOT NULL CHECK (resource_type IN ('human', 'financial', 'technical', 'external')),
  name VARCHAR(200) NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  cost_per_unit DECIMAL(10,2) NOT NULL,
  availability_status VARCHAR(20) NOT NULL DEFAULT 'available' CHECK (availability_status IN ('available', 'limited', 'unavailable')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Initiative Dependencies
CREATE TABLE IF NOT EXISTS initiative_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initiative_id UUID NOT NULL REFERENCES strategic_initiatives(id) ON DELETE CASCADE,
  depends_on_initiative_id UUID NOT NULL REFERENCES strategic_initiatives(id) ON DELETE CASCADE,
  dependency_type VARCHAR(50) NOT NULL DEFAULT 'blocks',
  description TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(initiative_id, depends_on_initiative_id),
  CONSTRAINT no_self_dependency CHECK (initiative_id != depends_on_initiative_id)
);

-- =====================================================
-- OKR SYSTEM TABLES
-- =====================================================

-- OKRs
CREATE TABLE IF NOT EXISTS okrs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  parent_okr_id UUID REFERENCES okrs(id) ON DELETE SET NULL,
  
  -- Hierarchy
  level VARCHAR(20) NOT NULL CHECK (level IN ('board', 'executive', 'department', 'team', 'individual')),
  
  -- Objective
  objective TEXT NOT NULL CHECK (length(objective) >= 10),
  objective_description TEXT,
  objective_category VARCHAR(20) NOT NULL CHECK (objective_category IN ('growth', 'customer', 'operational', 'learning', 'financial')),
  
  -- Timeline
  period_type VARCHAR(20) NOT NULL CHECK (period_type IN ('annual', 'quarterly', 'monthly')),
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  
  -- Progress & Scoring
  overall_progress DECIMAL(5,2) NOT NULL DEFAULT 0 CHECK (overall_progress >= 0 AND overall_progress <= 100),
  confidence_level INTEGER NOT NULL DEFAULT 5 CHECK (confidence_level >= 1 AND confidence_level <= 10),
  health_status VARCHAR(20) NOT NULL DEFAULT 'on_track' CHECK (health_status IN ('on_track', 'at_risk', 'off_track')),
  
  -- Alignment
  cascade_alignment_score DECIMAL(4,2) NOT NULL DEFAULT 0 CHECK (cascade_alignment_score >= 0 AND cascade_alignment_score <= 10),
  
  -- Ownership
  owner_id UUID NOT NULL REFERENCES users(id),
  contributors JSONB DEFAULT '[]',
  
  -- Metadata
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_okr_dates CHECK (end_date > start_date)
);

-- OKR Key Results
CREATE TABLE IF NOT EXISTS okr_key_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  okr_id UUID NOT NULL REFERENCES okrs(id) ON DELETE CASCADE,
  
  description TEXT NOT NULL,
  metric_type VARCHAR(20) NOT NULL CHECK (metric_type IN ('number', 'percentage', 'boolean', 'currency')),
  baseline_value DECIMAL(15,4) NOT NULL DEFAULT 0,
  target_value DECIMAL(15,4) NOT NULL,
  current_value DECIMAL(15,4) NOT NULL DEFAULT 0,
  unit VARCHAR(50),
  
  measurement_frequency VARCHAR(20) NOT NULL DEFAULT 'weekly' CHECK (measurement_frequency IN ('daily', 'weekly', 'monthly')),
  automated_tracking BOOLEAN DEFAULT FALSE,
  data_source VARCHAR(200),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Key Result Progress Updates
CREATE TABLE IF NOT EXISTS key_result_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_result_id UUID NOT NULL REFERENCES okr_key_results(id) ON DELETE CASCADE,
  
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  value DECIMAL(15,4) NOT NULL,
  confidence INTEGER NOT NULL DEFAULT 5 CHECK (confidence >= 1 AND confidence <= 10),
  notes TEXT,
  updated_by UUID NOT NULL REFERENCES users(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- OKR Initiative Links
CREATE TABLE IF NOT EXISTS okr_initiative_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  okr_id UUID NOT NULL REFERENCES okrs(id) ON DELETE CASCADE,
  initiative_id UUID NOT NULL REFERENCES strategic_initiatives(id) ON DELETE CASCADE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(okr_id, initiative_id)
);

-- =====================================================
-- SCENARIO PLANNING TABLES
-- =====================================================

-- Scenario Plans
CREATE TABLE IF NOT EXISTS scenario_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  name VARCHAR(200) NOT NULL,
  description TEXT,
  scenario_type VARCHAR(20) NOT NULL CHECK (scenario_type IN ('optimistic', 'realistic', 'pessimistic', 'stress_test')),
  
  -- Analysis Configuration
  monte_carlo_runs INTEGER NOT NULL DEFAULT 10000 CHECK (monte_carlo_runs >= 1000 AND monte_carlo_runs <= 50000),
  
  -- Results
  projected_outcomes JSONB DEFAULT '[]',
  risk_assessments JSONB DEFAULT '[]',
  confidence_intervals JSONB DEFAULT '[]',
  sensitivity_analysis JSONB DEFAULT '[]',
  
  -- Metadata
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scenario Variables
CREATE TABLE IF NOT EXISTS scenario_variables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_plan_id UUID NOT NULL REFERENCES scenario_plans(id) ON DELETE CASCADE,
  
  name VARCHAR(200) NOT NULL,
  variable_type VARCHAR(20) NOT NULL CHECK (variable_type IN ('market_size', 'growth_rate', 'competition', 'regulation', 'technology')),
  min_value DECIMAL(15,4) NOT NULL,
  max_value DECIMAL(15,4) NOT NULL,
  most_likely_value DECIMAL(15,4) NOT NULL,
  distribution VARCHAR(20) NOT NULL DEFAULT 'normal' CHECK (distribution IN ('normal', 'uniform', 'triangular', 'beta')),
  correlation_factors JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_variable_range CHECK (min_value <= most_likely_value AND most_likely_value <= max_value)
);

-- Market Assumptions
CREATE TABLE IF NOT EXISTS market_assumptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_plan_id UUID NOT NULL REFERENCES scenario_plans(id) ON DELETE CASCADE,
  
  category VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  probability DECIMAL(5,4) NOT NULL CHECK (probability >= 0 AND probability <= 1),
  impact_score INTEGER NOT NULL CHECK (impact_score >= 1 AND impact_score <= 10),
  confidence_level INTEGER NOT NULL CHECK (confidence_level >= 1 AND confidence_level <= 10),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Internal Assumptions
CREATE TABLE IF NOT EXISTS internal_assumptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_plan_id UUID NOT NULL REFERENCES scenario_plans(id) ON DELETE CASCADE,
  
  department VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  feasibility_score INTEGER NOT NULL CHECK (feasibility_score >= 1 AND feasibility_score <= 10),
  resource_impact INTEGER NOT NULL CHECK (resource_impact >= 1 AND resource_impact <= 10),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PERFORMANCE SCORECARD TABLES
-- =====================================================

-- Performance Scorecards
CREATE TABLE IF NOT EXISTS performance_scorecards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  name VARCHAR(200) NOT NULL,
  scorecard_type VARCHAR(20) NOT NULL CHECK (scorecard_type IN ('balanced', 'custom', 'kpi_dashboard', 'executive')),
  
  -- Performance
  overall_score DECIMAL(4,2) NOT NULL DEFAULT 0 CHECK (overall_score >= 0 AND overall_score <= 10),
  
  -- Settings
  refresh_frequency VARCHAR(20) NOT NULL DEFAULT 'daily' CHECK (refresh_frequency IN ('real_time', 'daily', 'weekly', 'monthly')),
  auto_alerts JSONB DEFAULT '[]',
  
  -- Access Control
  visibility VARCHAR(20) NOT NULL DEFAULT 'executives' CHECK (visibility IN ('board', 'executives', 'all_managers', 'organization')),
  
  -- Metadata
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scorecard Perspectives
CREATE TABLE IF NOT EXISTS scorecard_perspectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scorecard_id UUID NOT NULL REFERENCES performance_scorecards(id) ON DELETE CASCADE,
  
  name VARCHAR(100) NOT NULL,
  weight DECIMAL(4,3) NOT NULL CHECK (weight > 0 AND weight <= 1),
  color VARCHAR(20) NOT NULL DEFAULT '#3b82f6',
  icon VARCHAR(50) NOT NULL DEFAULT 'target',
  display_order INTEGER NOT NULL DEFAULT 1,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scorecard Metrics
CREATE TABLE IF NOT EXISTS scorecard_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  perspective_id UUID NOT NULL REFERENCES scorecard_perspectives(id) ON DELETE CASCADE,
  
  name VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  
  -- Values
  current_value DECIMAL(15,4) NOT NULL DEFAULT 0,
  target_value DECIMAL(15,4) NOT NULL,
  baseline_value DECIMAL(15,4) NOT NULL DEFAULT 0,
  
  -- Display Configuration
  unit VARCHAR(50),
  format VARCHAR(20) NOT NULL DEFAULT 'number' CHECK (format IN ('number', 'percentage', 'currency', 'ratio')),
  direction VARCHAR(20) NOT NULL DEFAULT 'higher_is_better' CHECK (direction IN ('higher_is_better', 'lower_is_better', 'target_is_best')),
  
  -- Thresholds
  green_threshold DECIMAL(15,4) NOT NULL,
  yellow_threshold DECIMAL(15,4) NOT NULL,
  red_threshold DECIMAL(15,4) NOT NULL,
  
  -- Performance Tracking
  performance_score DECIMAL(4,2) NOT NULL DEFAULT 0 CHECK (performance_score >= 0 AND performance_score <= 10),
  trend VARCHAR(20) NOT NULL DEFAULT 'stable' CHECK (trend IN ('improving', 'declining', 'stable')),
  variance_from_target DECIMAL(8,4) NOT NULL DEFAULT 0,
  
  -- Data Source
  data_source VARCHAR(200),
  calculation_method TEXT,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scorecard Access Permissions
CREATE TABLE IF NOT EXISTS scorecard_access_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scorecard_id UUID NOT NULL REFERENCES performance_scorecards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  permission_level VARCHAR(20) NOT NULL CHECK (permission_level IN ('view', 'edit', 'admin')),
  perspective_restrictions JSONB DEFAULT '[]',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(scorecard_id, user_id)
);

-- =====================================================
-- FINANCIAL INTEGRATION TABLES
-- =====================================================

-- Budget Optimizations
CREATE TABLE IF NOT EXISTS budget_optimizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  total_budget DECIMAL(15,2) NOT NULL,
  optimization_method VARCHAR(50) NOT NULL,
  optimization_results JSONB NOT NULL,
  optimization_score DECIMAL(4,2) NOT NULL CHECK (optimization_score >= 0 AND optimization_score <= 10),
  
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Initiative Financial Metrics
CREATE TABLE IF NOT EXISTS initiative_financial_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initiative_id UUID NOT NULL REFERENCES strategic_initiatives(id) ON DELETE CASCADE,
  
  metric_type VARCHAR(20) NOT NULL CHECK (metric_type IN ('investment', 'return', 'cost_savings', 'revenue_increase')),
  value DECIMAL(15,2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  confidence_level INTEGER NOT NULL DEFAULT 5 CHECK (confidence_level >= 1 AND confidence_level <= 10),
  source VARCHAR(200),
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_financial_period CHECK (period_end > period_start)
);

-- ROI Snapshots
CREATE TABLE IF NOT EXISTS roi_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initiative_id UUID NOT NULL REFERENCES strategic_initiatives(id) ON DELETE CASCADE,
  
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  roi_analysis JSONB NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_roi_period CHECK (period_end > period_start)
);

-- Initiative Outcomes
CREATE TABLE IF NOT EXISTS initiative_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initiative_id UUID NOT NULL REFERENCES strategic_initiatives(id) ON DELETE CASCADE,
  
  outcome_type VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  quantitative_value DECIMAL(15,4),
  qualitative_impact TEXT,
  measurement_date TIMESTAMPTZ NOT NULL,
  confidence_level INTEGER NOT NULL DEFAULT 5 CHECK (confidence_level >= 1 AND confidence_level <= 10),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PREDICTIVE ANALYTICS TABLES
-- =====================================================

-- Strategic Forecasts
CREATE TABLE IF NOT EXISTS strategic_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  forecast_type VARCHAR(20) NOT NULL CHECK (forecast_type IN ('performance', 'risk', 'opportunity', 'resource_demand')),
  time_horizon INTEGER NOT NULL CHECK (time_horizon > 0), -- months
  
  forecast_data JSONB NOT NULL,
  confidence_score DECIMAL(4,3) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  model_version VARCHAR(50),
  model_accuracy DECIMAL(4,3),
  
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- WORKFLOW & PLANNING TABLES
-- =====================================================

-- Planning Cycles
CREATE TABLE IF NOT EXISTS planning_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  cycle_type VARCHAR(20) NOT NULL CHECK (cycle_type IN ('annual', 'quarterly', 'monthly')),
  name VARCHAR(200) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'review', 'active', 'completed')),
  
  -- Timeline
  planning_start TIMESTAMPTZ NOT NULL,
  planning_end TIMESTAMPTZ NOT NULL,
  execution_start TIMESTAMPTZ NOT NULL,
  execution_end TIMESTAMPTZ NOT NULL,
  
  -- Content
  strategic_themes JSONB DEFAULT '[]',
  objectives JSONB DEFAULT '[]',
  success_metrics JSONB DEFAULT '[]',
  
  -- Metadata
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_planning_dates CHECK (planning_end > planning_start AND execution_start > planning_end AND execution_end > execution_start)
);

-- Planning Phases
CREATE TABLE IF NOT EXISTS planning_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planning_cycle_id UUID NOT NULL REFERENCES planning_cycles(id) ON DELETE CASCADE,
  
  name VARCHAR(200) NOT NULL,
  description TEXT,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'skipped')),
  phase_order INTEGER NOT NULL DEFAULT 1,
  
  required_inputs JSONB DEFAULT '[]',
  deliverables JSONB DEFAULT '[]',
  responsible_parties JSONB DEFAULT '[]',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_phase_dates CHECK (end_date > start_date)
);

-- Planning Stakeholders
CREATE TABLE IF NOT EXISTS planning_stakeholders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planning_cycle_id UUID NOT NULL REFERENCES planning_cycles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  role VARCHAR(20) NOT NULL CHECK (role IN ('sponsor', 'owner', 'contributor', 'reviewer')),
  permissions JSONB DEFAULT '[]',
  notification_preferences JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(planning_cycle_id, user_id)
);

-- =====================================================
-- ALERT & NOTIFICATION TABLES
-- =====================================================

-- Strategic Planning Alerts
CREATE TABLE IF NOT EXISTS strategic_planning_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  alert_type VARCHAR(20) NOT NULL CHECK (alert_type IN ('performance', 'threshold', 'trend', 'alignment', 'budget')),
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  
  -- Context
  related_entity_type VARCHAR(20) NOT NULL CHECK (related_entity_type IN ('initiative', 'okr', 'scorecard', 'forecast')),
  related_entity_id UUID NOT NULL,
  metric VARCHAR(100),
  current_value DECIMAL(15,4),
  threshold_value DECIMAL(15,4),
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved')),
  acknowledged_by UUID REFERENCES users(id),
  acknowledged_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Strategic Planning Recommendations
CREATE TABLE IF NOT EXISTS strategic_planning_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  category VARCHAR(20) NOT NULL CHECK (category IN ('performance', 'optimization', 'risk', 'alignment', 'resource')),
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  
  -- Scoring
  impact_score INTEGER NOT NULL CHECK (impact_score >= 1 AND impact_score <= 10),
  effort_score INTEGER NOT NULL CHECK (effort_score >= 1 AND effort_score <= 10),
  confidence_score INTEGER NOT NULL CHECK (confidence_score >= 1 AND confidence_score <= 10),
  priority VARCHAR(20) NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  
  -- Actions
  actions JSONB DEFAULT '[]',
  related_entities JSONB DEFAULT '[]',
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'implemented')),
  
  -- Metadata
  generated_by VARCHAR(20) NOT NULL DEFAULT 'system' CHECK (generated_by IN ('system', 'ai', 'user')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- =====================================================
-- CONFIGURATION TABLES
-- =====================================================

-- Strategic Planning Configuration
CREATE TABLE IF NOT EXISTS strategic_planning_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Planning Calendar
  planning_calendar JSONB DEFAULT '{
    "annual_planning_month": 10,
    "quarterly_reviews": [1, 4, 7, 10],
    "monthly_updates": true
  }',
  
  -- OKR Settings
  okr_settings JSONB DEFAULT '{
    "max_key_results_per_okr": 5,
    "default_confidence_threshold": 7,
    "auto_cascade_enabled": true,
    "scoring_method": "linear"
  }',
  
  -- Scorecard Settings
  scorecard_settings JSONB DEFAULT '{
    "default_perspectives": ["Financial", "Customer", "Internal Process", "Learning & Growth"],
    "benchmark_sources": [],
    "alert_thresholds": {}
  }',
  
  -- Integration Settings
  integrations JSONB DEFAULT '{}',
  
  -- Notification Preferences
  notifications JSONB DEFAULT '{
    "milestone_reminders": true,
    "progress_updates": true,
    "risk_alerts": true,
    "budget_warnings": true
  }',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(organization_id)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Strategic Initiatives Indexes
CREATE INDEX IF NOT EXISTS idx_strategic_initiatives_org_id ON strategic_initiatives(organization_id);
CREATE INDEX IF NOT EXISTS idx_strategic_initiatives_status ON strategic_initiatives(status);
CREATE INDEX IF NOT EXISTS idx_strategic_initiatives_owner ON strategic_initiatives(owner_id);
CREATE INDEX IF NOT EXISTS idx_strategic_initiatives_dates ON strategic_initiatives(start_date, end_date);

-- OKR Indexes
CREATE INDEX IF NOT EXISTS idx_okrs_org_id ON okrs(organization_id);
CREATE INDEX IF NOT EXISTS idx_okrs_parent_id ON okrs(parent_okr_id);
CREATE INDEX IF NOT EXISTS idx_okrs_level ON okrs(level);
CREATE INDEX IF NOT EXISTS idx_okrs_owner ON okrs(owner_id);
CREATE INDEX IF NOT EXISTS idx_okrs_dates ON okrs(start_date, end_date);

-- Key Results Indexes
CREATE INDEX IF NOT EXISTS idx_key_results_okr_id ON okr_key_results(okr_id);
CREATE INDEX IF NOT EXISTS idx_key_result_progress_kr_id ON key_result_progress(key_result_id);
CREATE INDEX IF NOT EXISTS idx_key_result_progress_date ON key_result_progress(date);

-- Scenario Planning Indexes
CREATE INDEX IF NOT EXISTS idx_scenario_plans_org_id ON scenario_plans(organization_id);
CREATE INDEX IF NOT EXISTS idx_scenario_variables_plan_id ON scenario_variables(scenario_plan_id);

-- Scorecard Indexes
CREATE INDEX IF NOT EXISTS idx_scorecards_org_id ON performance_scorecards(organization_id);
CREATE INDEX IF NOT EXISTS idx_scorecard_perspectives_scorecard_id ON scorecard_perspectives(scorecard_id);
CREATE INDEX IF NOT EXISTS idx_scorecard_metrics_perspective_id ON scorecard_metrics(perspective_id);

-- Financial Indexes
CREATE INDEX IF NOT EXISTS idx_financial_metrics_initiative_id ON initiative_financial_metrics(initiative_id);
CREATE INDEX IF NOT EXISTS idx_roi_snapshots_initiative_id ON roi_snapshots(initiative_id);
CREATE INDEX IF NOT EXISTS idx_budget_optimizations_org_id ON budget_optimizations(organization_id);

-- Planning Workflow Indexes
CREATE INDEX IF NOT EXISTS idx_planning_cycles_org_id ON planning_cycles(organization_id);
CREATE INDEX IF NOT EXISTS idx_planning_phases_cycle_id ON planning_phases(planning_cycle_id);
CREATE INDEX IF NOT EXISTS idx_planning_stakeholders_cycle_id ON planning_stakeholders(planning_cycle_id);

-- Alert Indexes
CREATE INDEX IF NOT EXISTS idx_alerts_org_id ON strategic_planning_alerts(organization_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON strategic_planning_alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_entity ON strategic_planning_alerts(related_entity_type, related_entity_id);

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_strategic_initiatives_updated_at BEFORE UPDATE ON strategic_initiatives
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_okrs_updated_at BEFORE UPDATE ON okrs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scenario_plans_updated_at BEFORE UPDATE ON scenario_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scorecards_updated_at BEFORE UPDATE ON performance_scorecards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_planning_cycles_updated_at BEFORE UPDATE ON planning_cycles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate OKR progress from key results
CREATE OR REPLACE FUNCTION calculate_okr_progress(okr_uuid UUID)
RETURNS DECIMAL(5,2) AS $$
DECLARE
    total_progress DECIMAL(10,4) := 0;
    kr_count INTEGER := 0;
    kr_record RECORD;
BEGIN
    FOR kr_record IN 
        SELECT target_value, current_value 
        FROM okr_key_results 
        WHERE okr_id = okr_uuid 
    LOOP
        kr_count := kr_count + 1;
        IF kr_record.target_value > 0 THEN
            total_progress := total_progress + LEAST(100, GREATEST(0, (kr_record.current_value / kr_record.target_value) * 100));
        END IF;
    END LOOP;
    
    IF kr_count > 0 THEN
        RETURN total_progress / kr_count;
    ELSE
        RETURN 0;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to update OKR progress when key results change
CREATE OR REPLACE FUNCTION update_okr_progress()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE okrs 
    SET overall_progress = calculate_okr_progress(NEW.okr_id),
        updated_at = NOW()
    WHERE id = NEW.okr_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update OKR progress when key results change
CREATE TRIGGER update_okr_progress_on_kr_change 
    AFTER INSERT OR UPDATE ON okr_key_results
    FOR EACH ROW EXECUTE FUNCTION update_okr_progress();

-- Function to calculate scorecard metric performance
CREATE OR REPLACE FUNCTION calculate_metric_performance(
    current_val DECIMAL(15,4),
    target_val DECIMAL(15,4),
    baseline_val DECIMAL(15,4),
    direction VARCHAR(20)
) RETURNS DECIMAL(4,2) AS $$
DECLARE
    performance_score DECIMAL(4,2);
BEGIN
    CASE direction
        WHEN 'higher_is_better' THEN
            IF target_val > baseline_val THEN
                performance_score := LEAST(10, GREATEST(0, 10 * (current_val - baseline_val) / (target_val - baseline_val)));
            ELSE
                performance_score := 5;
            END IF;
        WHEN 'lower_is_better' THEN
            IF baseline_val > target_val THEN
                performance_score := LEAST(10, GREATEST(0, 10 * (baseline_val - current_val) / (baseline_val - target_val)));
            ELSE
                performance_score := 5;
            END IF;
        WHEN 'target_is_best' THEN
            IF target_val != 0 THEN
                performance_score := LEAST(10, GREATEST(0, 10 * (1 - ABS(current_val - target_val) / ABS(target_val))));
            ELSE
                performance_score := 5;
            END IF;
        ELSE
            performance_score := 5;
    END CASE;
    
    RETURN performance_score;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-calculate performance scores for metrics
CREATE OR REPLACE FUNCTION update_metric_performance()
RETURNS TRIGGER AS $$
BEGIN
    NEW.performance_score := calculate_metric_performance(
        NEW.current_value,
        NEW.target_value,
        NEW.baseline_value,
        NEW.direction
    );
    
    NEW.variance_from_target := CASE 
        WHEN NEW.target_value != 0 THEN ((NEW.current_value - NEW.target_value) / NEW.target_value) * 100
        ELSE 0
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_scorecard_metric_performance 
    BEFORE INSERT OR UPDATE ON scorecard_metrics
    FOR EACH ROW EXECUTE FUNCTION update_metric_performance();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE strategic_initiatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE initiative_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE initiative_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE initiative_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE okrs ENABLE ROW LEVEL SECURITY;
ALTER TABLE okr_key_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE key_result_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenario_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenario_variables ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_scorecards ENABLE ROW LEVEL SECURITY;
ALTER TABLE scorecard_perspectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE scorecard_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategic_planning_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategic_planning_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE planning_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE planning_phases ENABLE ROW LEVEL SECURITY;

-- Organization-based access policies
CREATE POLICY "strategic_initiatives_organization_access" ON strategic_initiatives
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

CREATE POLICY "okrs_organization_access" ON okrs
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

CREATE POLICY "scorecards_organization_access" ON performance_scorecards
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

-- Add similar policies for all other tables...

-- =====================================================
-- INITIAL DATA SEEDING
-- =====================================================

-- Insert default strategic planning configuration
INSERT INTO strategic_planning_config (organization_id)
SELECT id FROM organizations
ON CONFLICT (organization_id) DO NOTHING;

-- =====================================================
-- COMMENTS AND DOCUMENTATION
-- =====================================================

COMMENT ON TABLE strategic_initiatives IS 'Core strategic initiatives with budget tracking and progress monitoring';
COMMENT ON TABLE okrs IS 'Objectives and Key Results with hierarchical cascading support';
COMMENT ON TABLE scenario_plans IS 'Monte Carlo simulation scenarios for strategic planning';
COMMENT ON TABLE performance_scorecards IS 'Balanced scorecard implementation with real-time KPI tracking';
COMMENT ON TABLE planning_cycles IS 'Annual planning cycle management with workflow support';

COMMENT ON FUNCTION calculate_okr_progress(UUID) IS 'Calculates OKR progress based on key result completion rates';
COMMENT ON FUNCTION calculate_metric_performance(DECIMAL, DECIMAL, DECIMAL, VARCHAR) IS 'Calculates performance score for scorecard metrics based on direction and thresholds';