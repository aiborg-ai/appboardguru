-- ISO 27001 Compliance Database Schema
-- Tables for Information Security Management System (ISMS) implementation

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- ENUMS
-- ============================================================================

-- ISMS Policy Status
CREATE TYPE isms_policy_status AS ENUM ('draft', 'active', 'deprecated', 'retired');

-- ISMS Policy Type  
CREATE TYPE isms_policy_type AS ENUM ('organizational', 'technical', 'physical', 'administrative');

-- Security Control Status
CREATE TYPE security_control_status AS ENUM ('not_implemented', 'planned', 'in_progress', 'implemented', 'not_applicable');

-- Security Control Effectiveness Rating
CREATE TYPE control_effectiveness_rating AS ENUM ('ineffective', 'partially_effective', 'largely_effective', 'effective');

-- Security Control Category
CREATE TYPE security_control_category AS ENUM ('organizational', 'people', 'physical', 'technological');

-- Security Control Type
CREATE TYPE security_control_type AS ENUM ('preventive', 'detective', 'corrective', 'deterrent', 'recovery', 'compensating');

-- Compliance Status
CREATE TYPE compliance_status AS ENUM ('compliant', 'non_compliant', 'partially_compliant', 'not_assessed');

-- Risk Assessment Status
CREATE TYPE risk_assessment_status AS ENUM ('planning', 'in_progress', 'review', 'approved', 'completed');

-- Risk Level
CREATE TYPE risk_level AS ENUM ('critical', 'high', 'medium', 'low');

-- Risk Treatment Strategy
CREATE TYPE risk_treatment_strategy AS ENUM ('avoid', 'mitigate', 'transfer', 'accept');

-- Information Asset Classification
CREATE TYPE asset_classification AS ENUM ('public', 'internal', 'confidential', 'restricted', 'top_secret');

-- Information Asset Type
CREATE TYPE asset_type AS ENUM ('data', 'software', 'physical', 'service', 'people', 'intangible');

-- Information Asset Format
CREATE TYPE asset_format AS ENUM ('electronic', 'physical', 'hybrid');

-- Information Asset Status
CREATE TYPE asset_status AS ENUM ('active', 'inactive', 'disposed');

-- Threat Source Type
CREATE TYPE threat_source_type AS ENUM ('human', 'environmental', 'technical', 'organizational');

-- Threat Category
CREATE TYPE threat_category AS ENUM ('deliberate', 'accidental', 'natural');

-- Vulnerability Type
CREATE TYPE vulnerability_type AS ENUM ('technical', 'physical', 'administrative', 'operational');

-- Vulnerability Status
CREATE TYPE vulnerability_status AS ENUM ('open', 'patched', 'mitigated', 'accepted', 'false_positive');

-- Security Finding Type
CREATE TYPE security_finding_type AS ENUM ('gap', 'weakness', 'deficiency', 'observation', 'best_practice');

-- Security Finding Status
CREATE TYPE security_finding_status AS ENUM ('open', 'in_progress', 'closed', 'risk_accepted');

-- Incident Severity
CREATE TYPE incident_severity AS ENUM ('critical', 'high', 'medium', 'low', 'informational');

-- Incident Status
CREATE TYPE incident_status AS ENUM ('new', 'assigned', 'in_progress', 'resolved', 'closed', 'cancelled');

-- ============================================================================
-- CORE ISMS TABLES
-- ============================================================================

-- ISMS Configuration
CREATE TABLE IF NOT EXISTS isms_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    scope TEXT NOT NULL,
    context JSONB NOT NULL DEFAULT '{}',
    risk_criteria JSONB NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'initializing',
    version TEXT NOT NULL DEFAULT '1.0',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- ISMS Policies
CREATE TABLE IF NOT EXISTS isms_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    version TEXT NOT NULL DEFAULT '1.0',
    status isms_policy_status NOT NULL DEFAULT 'draft',
    type isms_policy_type NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    content TEXT NOT NULL,
    owner UUID NOT NULL REFERENCES users(id),
    approver UUID REFERENCES users(id),
    review_frequency_days INTEGER NOT NULL DEFAULT 365,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMP WITH TIME ZONE,
    last_reviewed_at TIMESTAMP WITH TIME ZONE,
    next_review_due TIMESTAMP WITH TIME ZONE NOT NULL,
    tags TEXT[] DEFAULT '{}',
    related_controls TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}'
);

-- Security Controls
CREATE TABLE IF NOT EXISTS security_controls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    control_id TEXT NOT NULL, -- e.g., "A.5.1"
    name TEXT NOT NULL,
    category security_control_category NOT NULL,
    type security_control_type NOT NULL,
    domain TEXT NOT NULL,
    objective TEXT NOT NULL,
    description TEXT NOT NULL,
    implementation_guidance TEXT NOT NULL,
    status security_control_status NOT NULL DEFAULT 'not_implemented',
    effectiveness_rating control_effectiveness_rating NOT NULL DEFAULT 'ineffective',
    implementation_date TIMESTAMP WITH TIME ZONE,
    last_test_date TIMESTAMP WITH TIME ZONE,
    next_test_date TIMESTAMP WITH TIME ZONE,
    owner UUID NOT NULL REFERENCES users(id),
    evidence TEXT[] DEFAULT '{}',
    risks TEXT[] DEFAULT '{}',
    related_controls TEXT[] DEFAULT '{}',
    compliance_status compliance_status NOT NULL DEFAULT 'not_assessed',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id, control_id)
);

-- Security Control Findings
CREATE TABLE IF NOT EXISTS security_control_findings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    control_id UUID NOT NULL REFERENCES security_controls(id) ON DELETE CASCADE,
    finding_type security_finding_type NOT NULL,
    severity incident_severity NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    impact TEXT NOT NULL,
    recommendation TEXT NOT NULL,
    status security_finding_status NOT NULL DEFAULT 'open',
    assigned_to UUID REFERENCES users(id),
    target_date TIMESTAMP WITH TIME ZONE,
    actual_date TIMESTAMP WITH TIME ZONE,
    evidence TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- Risk Assessments
CREATE TABLE IF NOT EXISTS risk_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    scope TEXT NOT NULL,
    methodology TEXT NOT NULL,
    status risk_assessment_status NOT NULL DEFAULT 'planning',
    assessment_date TIMESTAMP WITH TIME ZONE NOT NULL,
    next_assessment_date TIMESTAMP WITH TIME ZONE NOT NULL,
    assessor UUID NOT NULL REFERENCES users(id),
    approver UUID REFERENCES users(id),
    context JSONB NOT NULL DEFAULT '{}',
    risk_criteria JSONB NOT NULL DEFAULT '{}',
    summary JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Identified Risks
CREATE TABLE IF NOT EXISTS identified_risks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL REFERENCES risk_assessments(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    source TEXT NOT NULL,
    threat TEXT NOT NULL,
    vulnerability TEXT NOT NULL,
    asset TEXT NOT NULL,
    asset_value NUMERIC NOT NULL DEFAULT 0,
    likelihood INTEGER NOT NULL CHECK (likelihood >= 1 AND likelihood <= 5),
    impact INTEGER NOT NULL CHECK (impact >= 1 AND impact <= 5),
    inherent_risk NUMERIC NOT NULL,
    risk_level risk_level NOT NULL,
    treatment_strategy risk_treatment_strategy NOT NULL,
    controls TEXT[] DEFAULT '{}',
    residual_likelihood NUMERIC NOT NULL,
    residual_impact NUMERIC NOT NULL,
    residual_risk NUMERIC NOT NULL,
    residual_risk_level risk_level NOT NULL,
    owner UUID NOT NULL REFERENCES users(id),
    review_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL DEFAULT 'identified',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Risk Treatment Plans
CREATE TABLE IF NOT EXISTS risk_treatment_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    risk_id UUID NOT NULL REFERENCES identified_risks(id) ON DELETE CASCADE,
    treatment TEXT NOT NULL,
    justification TEXT NOT NULL,
    actions JSONB NOT NULL DEFAULT '[]',
    cost NUMERIC NOT NULL DEFAULT 0,
    timeline TEXT NOT NULL,
    success_criteria TEXT NOT NULL,
    owner UUID NOT NULL REFERENCES users(id),
    approver UUID REFERENCES users(id),
    status TEXT NOT NULL DEFAULT 'planned',
    effectiveness_review TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Information Assets
CREATE TABLE IF NOT EXISTS information_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    type asset_type NOT NULL,
    category TEXT NOT NULL,
    classification asset_classification NOT NULL,
    owner UUID NOT NULL REFERENCES users(id),
    custodian UUID REFERENCES users(id),
    location TEXT NOT NULL,
    format asset_format NOT NULL,
    confidentiality INTEGER NOT NULL CHECK (confidentiality >= 1 AND confidentiality <= 5),
    integrity INTEGER NOT NULL CHECK (integrity >= 1 AND integrity <= 5),
    availability INTEGER NOT NULL CHECK (availability >= 1 AND availability <= 5),
    asset_value NUMERIC NOT NULL DEFAULT 0,
    dependencies TEXT[] DEFAULT '{}',
    threats TEXT[] DEFAULT '{}',
    vulnerabilities TEXT[] DEFAULT '{}',
    controls TEXT[] DEFAULT '{}',
    last_review_date TIMESTAMP WITH TIME ZONE,
    next_review_date TIMESTAMP WITH TIME ZONE NOT NULL,
    retention_period INTEGER, -- in days
    disposal_method TEXT,
    legal_requirements TEXT[] DEFAULT '{}',
    business_processes TEXT[] DEFAULT '{}',
    status asset_status NOT NULL DEFAULT 'active',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Threat Sources
CREATE TABLE IF NOT EXISTS threat_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type threat_source_type NOT NULL,
    category threat_category NOT NULL,
    description TEXT NOT NULL,
    capabilities TEXT[] DEFAULT '{}',
    motivations TEXT[] DEFAULT '{}',
    likelihood INTEGER NOT NULL CHECK (likelihood >= 1 AND likelihood <= 5),
    threat_vectors TEXT[] DEFAULT '{}',
    indicators TEXT[] DEFAULT '{}',
    historical_incidents INTEGER NOT NULL DEFAULT 0,
    last_observed TIMESTAMP WITH TIME ZONE,
    severity incident_severity NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Vulnerabilities
CREATE TABLE IF NOT EXISTS vulnerabilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    type vulnerability_type NOT NULL,
    category TEXT NOT NULL,
    cve_id TEXT,
    cvss_score NUMERIC CHECK (cvss_score >= 0 AND cvss_score <= 10),
    exploitability TEXT NOT NULL,
    remediation_complexity TEXT NOT NULL,
    discovery_date TIMESTAMP WITH TIME ZONE NOT NULL,
    disclosure_date TIMESTAMP WITH TIME ZONE,
    patch_available BOOLEAN NOT NULL DEFAULT FALSE,
    workaround_available BOOLEAN NOT NULL DEFAULT FALSE,
    affected_assets TEXT[] DEFAULT '{}',
    prerequisites TEXT[] DEFAULT '{}',
    impact_description TEXT NOT NULL,
    remediation_guidance TEXT NOT NULL,
    references TEXT[] DEFAULT '{}',
    status vulnerability_status NOT NULL DEFAULT 'open',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Security Incidents
CREATE TABLE IF NOT EXISTS security_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    incident_number TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    incident_type TEXT NOT NULL,
    severity incident_severity NOT NULL,
    status incident_status NOT NULL DEFAULT 'new',
    reported_by UUID NOT NULL REFERENCES users(id),
    assigned_to UUID REFERENCES users(id),
    affected_assets TEXT[] DEFAULT '{}',
    root_cause TEXT,
    impact_assessment TEXT,
    lessons_learned TEXT,
    corrective_actions TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE,
    closed_at TIMESTAMP WITH TIME ZONE
);

-- Business Continuity Plans
CREATE TABLE IF NOT EXISTS business_continuity_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    process_id TEXT NOT NULL,
    process_name TEXT NOT NULL,
    description TEXT NOT NULL,
    criticality TEXT NOT NULL,
    rto INTEGER NOT NULL, -- Recovery Time Objective (hours)
    rpo INTEGER NOT NULL, -- Recovery Point Objective (hours)
    mao INTEGER NOT NULL, -- Maximum Acceptable Outage (hours)
    dependencies TEXT[] DEFAULT '{}',
    upstream_processes TEXT[] DEFAULT '{}',
    downstream_processes TEXT[] DEFAULT '{}',
    supporting_assets TEXT[] DEFAULT '{}',
    key_personnel TEXT[] DEFAULT '{}',
    peak_operating_times TEXT[] DEFAULT '{}',
    alternative_processes TEXT[] DEFAULT '{}',
    financial_impact JSONB NOT NULL DEFAULT '{}',
    operational_impact JSONB NOT NULL DEFAULT '{}',
    legal_compliance JSONB NOT NULL DEFAULT '{}',
    recovery_strategy TEXT NOT NULL,
    continuity_plan TEXT,
    last_reviewed TIMESTAMP WITH TIME ZONE NOT NULL,
    next_review TIMESTAMP WITH TIME ZONE NOT NULL,
    owner UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id, process_id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- ISMS Configurations
CREATE INDEX IF NOT EXISTS idx_isms_configurations_organization ON isms_configurations(organization_id);
CREATE INDEX IF NOT EXISTS idx_isms_configurations_status ON isms_configurations(status);

-- ISMS Policies
CREATE INDEX IF NOT EXISTS idx_isms_policies_organization ON isms_policies(organization_id);
CREATE INDEX IF NOT EXISTS idx_isms_policies_status ON isms_policies(status);
CREATE INDEX IF NOT EXISTS idx_isms_policies_owner ON isms_policies(owner);
CREATE INDEX IF NOT EXISTS idx_isms_policies_next_review ON isms_policies(next_review_due);
CREATE INDEX IF NOT EXISTS idx_isms_policies_type ON isms_policies(type);

-- Security Controls
CREATE INDEX IF NOT EXISTS idx_security_controls_organization ON security_controls(organization_id);
CREATE INDEX IF NOT EXISTS idx_security_controls_status ON security_controls(status);
CREATE INDEX IF NOT EXISTS idx_security_controls_owner ON security_controls(owner);
CREATE INDEX IF NOT EXISTS idx_security_controls_category ON security_controls(category);
CREATE INDEX IF NOT EXISTS idx_security_controls_compliance ON security_controls(compliance_status);
CREATE INDEX IF NOT EXISTS idx_security_controls_next_test ON security_controls(next_test_date);

-- Security Control Findings
CREATE INDEX IF NOT EXISTS idx_control_findings_control ON security_control_findings(control_id);
CREATE INDEX IF NOT EXISTS idx_control_findings_status ON security_control_findings(status);
CREATE INDEX IF NOT EXISTS idx_control_findings_severity ON security_control_findings(severity);
CREATE INDEX IF NOT EXISTS idx_control_findings_assigned ON security_control_findings(assigned_to);

-- Risk Assessments
CREATE INDEX IF NOT EXISTS idx_risk_assessments_organization ON risk_assessments(organization_id);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_status ON risk_assessments(status);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_assessor ON risk_assessments(assessor);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_next_assessment ON risk_assessments(next_assessment_date);

-- Identified Risks
CREATE INDEX IF NOT EXISTS idx_identified_risks_assessment ON identified_risks(assessment_id);
CREATE INDEX IF NOT EXISTS idx_identified_risks_level ON identified_risks(risk_level);
CREATE INDEX IF NOT EXISTS idx_identified_risks_owner ON identified_risks(owner);
CREATE INDEX IF NOT EXISTS idx_identified_risks_review ON identified_risks(review_date);
CREATE INDEX IF NOT EXISTS idx_identified_risks_status ON identified_risks(status);

-- Risk Treatment Plans
CREATE INDEX IF NOT EXISTS idx_risk_treatment_plans_risk ON risk_treatment_plans(risk_id);
CREATE INDEX IF NOT EXISTS idx_risk_treatment_plans_owner ON risk_treatment_plans(owner);
CREATE INDEX IF NOT EXISTS idx_risk_treatment_plans_status ON risk_treatment_plans(status);

-- Information Assets
CREATE INDEX IF NOT EXISTS idx_information_assets_organization ON information_assets(organization_id);
CREATE INDEX IF NOT EXISTS idx_information_assets_owner ON information_assets(owner);
CREATE INDEX IF NOT EXISTS idx_information_assets_classification ON information_assets(classification);
CREATE INDEX IF NOT EXISTS idx_information_assets_type ON information_assets(type);
CREATE INDEX IF NOT EXISTS idx_information_assets_status ON information_assets(status);
CREATE INDEX IF NOT EXISTS idx_information_assets_next_review ON information_assets(next_review_date);

-- Threat Sources
CREATE INDEX IF NOT EXISTS idx_threat_sources_organization ON threat_sources(organization_id);
CREATE INDEX IF NOT EXISTS idx_threat_sources_type ON threat_sources(type);
CREATE INDEX IF NOT EXISTS idx_threat_sources_severity ON threat_sources(severity);
CREATE INDEX IF NOT EXISTS idx_threat_sources_last_observed ON threat_sources(last_observed);

-- Vulnerabilities
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_organization ON vulnerabilities(organization_id);
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_status ON vulnerabilities(status);
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_severity ON vulnerabilities(cvss_score);
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_cve ON vulnerabilities(cve_id) WHERE cve_id IS NOT NULL;

-- Security Incidents
CREATE INDEX IF NOT EXISTS idx_security_incidents_organization ON security_incidents(organization_id);
CREATE INDEX IF NOT EXISTS idx_security_incidents_status ON security_incidents(status);
CREATE INDEX IF NOT EXISTS idx_security_incidents_severity ON security_incidents(severity);
CREATE INDEX IF NOT EXISTS idx_security_incidents_assigned ON security_incidents(assigned_to);
CREATE INDEX IF NOT EXISTS idx_security_incidents_created ON security_incidents(created_at);

-- Business Continuity Plans
CREATE INDEX IF NOT EXISTS idx_bcp_organization ON business_continuity_plans(organization_id);
CREATE INDEX IF NOT EXISTS idx_bcp_criticality ON business_continuity_plans(criticality);
CREATE INDEX IF NOT EXISTS idx_bcp_owner ON business_continuity_plans(owner);
CREATE INDEX IF NOT EXISTS idx_bcp_next_review ON business_continuity_plans(next_review);

-- ============================================================================
-- RLS (Row Level Security) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE isms_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE isms_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_control_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE identified_risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_treatment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE information_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE threat_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE vulnerabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_continuity_plans ENABLE ROW LEVEL SECURITY;

-- ISMS Configurations - Organization members can access
CREATE POLICY "isms_configurations_organization_access" ON isms_configurations
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );

-- ISMS Policies - Organization members can access
CREATE POLICY "isms_policies_organization_access" ON isms_policies
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );

-- Security Controls - Organization members can access
CREATE POLICY "security_controls_organization_access" ON security_controls
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );

-- Security Control Findings - Organization members can access
CREATE POLICY "control_findings_organization_access" ON security_control_findings
    FOR ALL USING (
        control_id IN (
            SELECT id FROM security_controls 
            WHERE organization_id IN (
                SELECT organization_id FROM organization_members 
                WHERE user_id = auth.uid()
            )
        )
    );

-- Risk Assessments - Organization members can access
CREATE POLICY "risk_assessments_organization_access" ON risk_assessments
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );

-- Identified Risks - Organization members can access via assessment
CREATE POLICY "identified_risks_organization_access" ON identified_risks
    FOR ALL USING (
        assessment_id IN (
            SELECT id FROM risk_assessments 
            WHERE organization_id IN (
                SELECT organization_id FROM organization_members 
                WHERE user_id = auth.uid()
            )
        )
    );

-- Risk Treatment Plans - Organization members can access via risk
CREATE POLICY "risk_treatment_plans_organization_access" ON risk_treatment_plans
    FOR ALL USING (
        risk_id IN (
            SELECT ir.id FROM identified_risks ir
            JOIN risk_assessments ra ON ir.assessment_id = ra.id
            WHERE ra.organization_id IN (
                SELECT organization_id FROM organization_members 
                WHERE user_id = auth.uid()
            )
        )
    );

-- Information Assets - Organization members can access
CREATE POLICY "information_assets_organization_access" ON information_assets
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );

-- Threat Sources - Organization members can access
CREATE POLICY "threat_sources_organization_access" ON threat_sources
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );

-- Vulnerabilities - Organization members can access
CREATE POLICY "vulnerabilities_organization_access" ON vulnerabilities
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );

-- Security Incidents - Organization members can access
CREATE POLICY "security_incidents_organization_access" ON security_incidents
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );

-- Business Continuity Plans - Organization members can access
CREATE POLICY "bcp_organization_access" ON business_continuity_plans
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add update triggers to all tables with updated_at
CREATE TRIGGER update_isms_configurations_updated_at BEFORE UPDATE ON isms_configurations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_isms_policies_updated_at BEFORE UPDATE ON isms_policies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_security_controls_updated_at BEFORE UPDATE ON security_controls FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_control_findings_updated_at BEFORE UPDATE ON security_control_findings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_risk_assessments_updated_at BEFORE UPDATE ON risk_assessments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_identified_risks_updated_at BEFORE UPDATE ON identified_risks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_risk_treatment_plans_updated_at BEFORE UPDATE ON risk_treatment_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_information_assets_updated_at BEFORE UPDATE ON information_assets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_threat_sources_updated_at BEFORE UPDATE ON threat_sources FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vulnerabilities_updated_at BEFORE UPDATE ON vulnerabilities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_security_incidents_updated_at BEFORE UPDATE ON security_incidents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bcp_updated_at BEFORE UPDATE ON business_continuity_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE isms_configurations IS 'ISO 27001 ISMS configurations for organizations';
COMMENT ON TABLE isms_policies IS 'Information security policies and procedures';
COMMENT ON TABLE security_controls IS 'ISO 27001 Annex A security controls implementation';
COMMENT ON TABLE security_control_findings IS 'Audit findings and gaps for security controls';
COMMENT ON TABLE risk_assessments IS 'Risk assessment records following ISO 27005';
COMMENT ON TABLE identified_risks IS 'Individual risks identified during assessments';
COMMENT ON TABLE risk_treatment_plans IS 'Plans for treating identified risks';
COMMENT ON TABLE information_assets IS 'Register of information assets requiring protection';
COMMENT ON TABLE threat_sources IS 'Catalog of threat sources and threat actors';
COMMENT ON TABLE vulnerabilities IS 'Known vulnerabilities affecting the organization';
COMMENT ON TABLE security_incidents IS 'Security incident records and response tracking';
COMMENT ON TABLE business_continuity_plans IS 'Business continuity and disaster recovery plans';