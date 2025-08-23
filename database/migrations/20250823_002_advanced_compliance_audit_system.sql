-- Advanced Compliance and Audit System Migration
-- Version: 2.0
-- Description: Enterprise-grade compliance reporting with comprehensive audit trails

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gin";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =============================================
-- COMPLIANCE FRAMEWORK TABLES
-- =============================================

-- Regulatory frameworks table (SOX, GDPR, SEC, etc.)
CREATE TABLE IF NOT EXISTS compliance_frameworks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    acronym VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    version VARCHAR(50) NOT NULL DEFAULT '1.0',
    jurisdiction VARCHAR(100), -- US, EU, Global, etc.
    industry VARCHAR(100), -- Finance, Healthcare, General, etc.
    effective_date DATE NOT NULL,
    review_cycle_months INTEGER DEFAULT 12,
    is_active BOOLEAN DEFAULT true,
    authority_body VARCHAR(255), -- SEC, ICO, etc.
    reference_url TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Framework requirements table
CREATE TABLE IF NOT EXISTS compliance_framework_requirements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    framework_id UUID NOT NULL REFERENCES compliance_frameworks(id) ON DELETE CASCADE,
    requirement_code VARCHAR(100) NOT NULL, -- SOX-404, GDPR-25, etc.
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100) NOT NULL, -- controls, documentation, monitoring, etc.
    subcategory VARCHAR(100),
    priority VARCHAR(20) CHECK (priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
    compliance_type VARCHAR(50) NOT NULL, -- mandatory, recommended, optional
    evidence_requirements JSONB DEFAULT '[]', -- Types of evidence needed
    testing_frequency VARCHAR(50), -- annual, quarterly, monthly, continuous
    control_type VARCHAR(50), -- preventive, detective, corrective
    automation_level VARCHAR(50), -- manual, semi-automated, fully-automated
    penalty_severity VARCHAR(50), -- minor, major, critical
    related_requirements UUID[], -- Array of related requirement IDs
    implementation_guidance TEXT,
    testing_procedures TEXT,
    success_criteria TEXT,
    failure_indicators TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(framework_id, requirement_code)
);

-- Compliance policies table (versioned)
CREATE TABLE IF NOT EXISTS compliance_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    framework_id UUID NOT NULL REFERENCES compliance_frameworks(id),
    title VARCHAR(500) NOT NULL,
    policy_code VARCHAR(100) NOT NULL,
    version VARCHAR(50) NOT NULL DEFAULT '1.0',
    status VARCHAR(50) CHECK (status IN ('draft', 'review', 'approved', 'active', 'deprecated', 'archived')) DEFAULT 'draft',
    effective_date DATE,
    expiry_date DATE,
    review_date DATE,
    content TEXT NOT NULL,
    summary TEXT,
    scope TEXT,
    roles_responsibilities JSONB DEFAULT '{}', -- Role-based responsibilities
    implementation_steps JSONB DEFAULT '[]',
    monitoring_procedures JSONB DEFAULT '{}',
    violation_procedures JSONB DEFAULT '{}',
    training_requirements JSONB DEFAULT '{}',
    approval_chain UUID[], -- Array of user IDs who must approve
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    created_by UUID NOT NULL REFERENCES users(id),
    parent_policy_id UUID REFERENCES compliance_policies(id), -- For versioning
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id, policy_code, version)
);

-- Compliance assessments table
CREATE TABLE IF NOT EXISTS compliance_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    framework_id UUID NOT NULL REFERENCES compliance_frameworks(id),
    title VARCHAR(500) NOT NULL,
    assessment_type VARCHAR(50) CHECK (assessment_type IN ('self', 'internal_audit', 'external_audit', 'regulatory_exam', 'continuous')) NOT NULL,
    status VARCHAR(50) CHECK (status IN ('planned', 'in_progress', 'under_review', 'completed', 'failed', 'cancelled')) DEFAULT 'planned',
    priority VARCHAR(20) CHECK (priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
    scope_description TEXT,
    assessment_period_start DATE NOT NULL,
    assessment_period_end DATE NOT NULL,
    planned_start_date DATE NOT NULL,
    planned_end_date DATE NOT NULL,
    actual_start_date DATE,
    actual_end_date DATE,
    lead_assessor_id UUID REFERENCES users(id),
    assessment_team UUID[] DEFAULT '{}', -- Array of user IDs
    external_assessor_info JSONB DEFAULT '{}', -- External assessor details
    requirements_tested UUID[] DEFAULT '{}', -- Array of requirement IDs
    overall_score DECIMAL(5,2), -- Overall compliance score
    findings_count INTEGER DEFAULT 0,
    critical_findings INTEGER DEFAULT 0,
    high_findings INTEGER DEFAULT 0,
    medium_findings INTEGER DEFAULT 0,
    low_findings INTEGER DEFAULT 0,
    recommendations_count INTEGER DEFAULT 0,
    action_items_count INTEGER DEFAULT 0,
    executive_summary TEXT,
    methodology TEXT,
    testing_approach TEXT,
    limitations TEXT,
    next_assessment_date DATE,
    certificate_issued BOOLEAN DEFAULT false,
    certificate_expiry DATE,
    cost_estimate DECIMAL(15,2),
    actual_cost DECIMAL(15,2),
    vendor_info JSONB DEFAULT '{}',
    created_by UUID NOT NULL REFERENCES users(id),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Assessment findings table
CREATE TABLE IF NOT EXISTS compliance_assessment_findings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id UUID NOT NULL REFERENCES compliance_assessments(id) ON DELETE CASCADE,
    requirement_id UUID REFERENCES compliance_framework_requirements(id),
    finding_type VARCHAR(50) CHECK (finding_type IN ('violation', 'deficiency', 'weakness', 'observation', 'best_practice')) NOT NULL,
    severity VARCHAR(20) CHECK (severity IN ('low', 'medium', 'high', 'critical')) NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    evidence TEXT,
    impact_assessment TEXT,
    root_cause_analysis TEXT,
    recommendation TEXT NOT NULL,
    management_response TEXT,
    remediation_plan TEXT,
    responsible_party UUID REFERENCES users(id),
    target_completion_date DATE,
    actual_completion_date DATE,
    verification_method VARCHAR(100),
    verification_date DATE,
    verified_by UUID REFERENCES users(id),
    status VARCHAR(50) CHECK (status IN ('open', 'in_progress', 'resolved', 'verified', 'closed', 'deferred')) DEFAULT 'open',
    business_impact TEXT,
    regulatory_impact TEXT,
    financial_impact DECIMAL(15,2),
    likelihood VARCHAR(20) CHECK (likelihood IN ('low', 'medium', 'high', 'very_high')),
    related_findings UUID[] DEFAULT '{}',
    attachments JSONB DEFAULT '[]',
    follow_up_required BOOLEAN DEFAULT true,
    escalation_required BOOLEAN DEFAULT false,
    external_reporting_required BOOLEAN DEFAULT false,
    created_by UUID NOT NULL REFERENCES users(id),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- ENHANCED AUDIT SYSTEM
-- =============================================

-- Extend existing audit_logs table with advanced fields
DO $$
BEGIN
    -- Add new columns to audit_logs if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'compliance_framework_id') THEN
        ALTER TABLE audit_logs ADD COLUMN compliance_framework_id UUID REFERENCES compliance_frameworks(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'risk_level') THEN
        ALTER TABLE audit_logs ADD COLUMN risk_level VARCHAR(20) CHECK (risk_level IN ('low', 'medium', 'high', 'critical')) DEFAULT 'low';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'business_impact') THEN
        ALTER TABLE audit_logs ADD COLUMN business_impact TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'regulatory_significance') THEN
        ALTER TABLE audit_logs ADD COLUMN regulatory_significance BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'retention_period_years') THEN
        ALTER TABLE audit_logs ADD COLUMN retention_period_years INTEGER DEFAULT 7;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'correlation_id') THEN
        ALTER TABLE audit_logs ADD COLUMN correlation_id UUID; -- For linking related events
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'session_id') THEN
        ALTER TABLE audit_logs ADD COLUMN session_id UUID; -- User session tracking
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'geographic_location') THEN
        ALTER TABLE audit_logs ADD COLUMN geographic_location VARCHAR(100); -- Geographic context
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'data_classification') THEN
        ALTER TABLE audit_logs ADD COLUMN data_classification VARCHAR(50) CHECK (data_classification IN ('public', 'internal', 'confidential', 'restricted'));
    END IF;
END $$;

-- Audit evidence table
CREATE TABLE IF NOT EXISTS audit_evidence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    audit_log_id UUID REFERENCES audit_logs(id) ON DELETE CASCADE,
    assessment_id UUID REFERENCES compliance_assessments(id) ON DELETE CASCADE,
    evidence_type VARCHAR(50) CHECK (evidence_type IN ('document', 'screenshot', 'log_file', 'video', 'witness_statement', 'system_output', 'configuration', 'code_review')) NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    file_path TEXT,
    file_hash VARCHAR(256), -- SHA-256 hash for integrity
    file_size_bytes BIGINT,
    mime_type VARCHAR(100),
    collection_method VARCHAR(100),
    collected_by UUID NOT NULL REFERENCES users(id),
    collection_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    chain_of_custody JSONB DEFAULT '[]', -- Track who handled the evidence
    verification_status VARCHAR(50) CHECK (verification_status IN ('unverified', 'verified', 'failed', 'corrupted')) DEFAULT 'unverified',
    verification_timestamp TIMESTAMP WITH TIME ZONE,
    verified_by UUID REFERENCES users(id),
    retention_date DATE, -- When evidence can be deleted
    legal_hold BOOLEAN DEFAULT false, -- Prevent deletion for legal reasons
    confidentiality_level VARCHAR(50) CHECK (confidentiality_level IN ('public', 'internal', 'confidential', 'restricted')) DEFAULT 'internal',
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit reports table
CREATE TABLE IF NOT EXISTS audit_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    report_type VARCHAR(50) CHECK (report_type IN ('compliance', 'security', 'operational', 'financial', 'regulatory_filing', 'executive_summary', 'trend_analysis')) NOT NULL,
    framework_ids UUID[] DEFAULT '{}', -- Array of framework IDs covered
    reporting_period_start DATE NOT NULL,
    reporting_period_end DATE NOT NULL,
    status VARCHAR(50) CHECK (status IN ('draft', 'under_review', 'approved', 'published', 'archived')) DEFAULT 'draft',
    executive_summary TEXT,
    methodology TEXT,
    scope TEXT,
    limitations TEXT,
    key_findings TEXT,
    recommendations TEXT,
    management_response TEXT,
    action_plan TEXT,
    overall_assessment VARCHAR(50) CHECK (overall_assessment IN ('compliant', 'substantially_compliant', 'partially_compliant', 'non_compliant')),
    confidence_level VARCHAR(20) CHECK (confidence_level IN ('low', 'medium', 'high', 'very_high')) DEFAULT 'high',
    risk_rating VARCHAR(20) CHECK (risk_rating IN ('low', 'medium', 'high', 'critical')),
    total_events_analyzed BIGINT DEFAULT 0,
    critical_issues INTEGER DEFAULT 0,
    high_issues INTEGER DEFAULT 0,
    medium_issues INTEGER DEFAULT 0,
    low_issues INTEGER DEFAULT 0,
    resolved_issues INTEGER DEFAULT 0,
    open_issues INTEGER DEFAULT 0,
    compliance_score DECIMAL(5,2), -- Overall compliance percentage
    trend_direction VARCHAR(20) CHECK (trend_direction IN ('improving', 'stable', 'declining', 'critical')),
    previous_report_id UUID REFERENCES audit_reports(id),
    next_review_date DATE,
    distribution_list UUID[] DEFAULT '{}', -- User IDs who should receive report
    published_at TIMESTAMP WITH TIME ZONE,
    published_by UUID REFERENCES users(id),
    report_data JSONB DEFAULT '{}', -- Store charts, tables, metrics
    attachments JSONB DEFAULT '[]',
    digital_signature TEXT, -- For report integrity
    created_by UUID NOT NULL REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Compliance violations tracking
CREATE TABLE IF NOT EXISTS compliance_violations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    framework_id UUID REFERENCES compliance_frameworks(id),
    requirement_id UUID REFERENCES compliance_framework_requirements(id),
    policy_id UUID REFERENCES compliance_policies(id),
    violation_code VARCHAR(100) NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    severity VARCHAR(20) CHECK (severity IN ('low', 'medium', 'high', 'critical')) NOT NULL,
    category VARCHAR(100) NOT NULL, -- data_breach, unauthorized_access, policy_violation, etc.
    subcategory VARCHAR(100),
    detected_date DATE NOT NULL,
    detection_method VARCHAR(100), -- automated_monitoring, audit, self_reported, external_report
    detected_by UUID REFERENCES users(id),
    incident_date DATE,
    incident_duration_hours INTEGER,
    affected_systems TEXT[],
    affected_users INTEGER DEFAULT 0,
    affected_records INTEGER DEFAULT 0,
    data_types_affected TEXT[],
    root_cause TEXT,
    contributing_factors TEXT,
    immediate_actions TEXT,
    containment_actions TEXT,
    remediation_plan TEXT NOT NULL,
    prevention_measures TEXT,
    lessons_learned TEXT,
    responsible_party UUID REFERENCES users(id),
    target_resolution_date DATE,
    actual_resolution_date DATE,
    resolution_summary TEXT,
    status VARCHAR(50) CHECK (status IN ('identified', 'investigating', 'remediating', 'resolved', 'closed')) DEFAULT 'identified',
    business_impact TEXT,
    financial_impact DECIMAL(15,2),
    regulatory_reporting_required BOOLEAN DEFAULT false,
    regulatory_notifications JSONB DEFAULT '[]', -- Notifications sent to regulators
    legal_review_required BOOLEAN DEFAULT false,
    legal_review_status VARCHAR(50),
    insurance_claim_filed BOOLEAN DEFAULT false,
    insurance_claim_amount DECIMAL(15,2),
    customer_notification_required BOOLEAN DEFAULT false,
    customers_notified INTEGER DEFAULT 0,
    media_attention BOOLEAN DEFAULT false,
    recurrence_prevention JSONB DEFAULT '{}',
    follow_up_actions JSONB DEFAULT '[]',
    related_violations UUID[] DEFAULT '{}',
    evidence_ids UUID[] DEFAULT '{}',
    created_by UUID NOT NULL REFERENCES users(id),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Compliance training and certifications
CREATE TABLE IF NOT EXISTS compliance_training (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    framework_id UUID REFERENCES compliance_frameworks(id),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    training_type VARCHAR(50) CHECK (training_type IN ('mandatory', 'recommended', 'optional', 'certification')) NOT NULL,
    delivery_method VARCHAR(50) CHECK (delivery_method IN ('online', 'instructor_led', 'blended', 'self_study')) NOT NULL,
    duration_minutes INTEGER NOT NULL,
    validity_months INTEGER DEFAULT 12,
    prerequisites TEXT[],
    learning_objectives TEXT[],
    content_url TEXT,
    assessment_required BOOLEAN DEFAULT true,
    passing_score INTEGER DEFAULT 80,
    max_attempts INTEGER DEFAULT 3,
    target_roles TEXT[] DEFAULT '{}',
    target_departments TEXT[] DEFAULT '{}',
    mandatory_for_roles TEXT[] DEFAULT '{}',
    created_by UUID NOT NULL REFERENCES users(id),
    is_active BOOLEAN DEFAULT true,
    version VARCHAR(50) DEFAULT '1.0',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User training records
CREATE TABLE IF NOT EXISTS user_compliance_training (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    training_id UUID NOT NULL REFERENCES compliance_training(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    assigned_date DATE NOT NULL,
    due_date DATE NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) CHECK (status IN ('assigned', 'in_progress', 'completed', 'failed', 'expired', 'waived')) DEFAULT 'assigned',
    progress_percentage INTEGER DEFAULT 0,
    time_spent_minutes INTEGER DEFAULT 0,
    attempts INTEGER DEFAULT 0,
    best_score INTEGER,
    latest_score INTEGER,
    passed BOOLEAN DEFAULT false,
    certificate_issued BOOLEAN DEFAULT false,
    certificate_expiry_date DATE,
    assigned_by UUID REFERENCES users(id),
    waived_by UUID REFERENCES users(id),
    waived_reason TEXT,
    notes TEXT,
    reminder_sent_count INTEGER DEFAULT 0,
    last_reminder_sent TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, training_id, assigned_date)
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Compliance framework indexes
CREATE INDEX IF NOT EXISTS idx_compliance_frameworks_acronym ON compliance_frameworks(acronym);
CREATE INDEX IF NOT EXISTS idx_compliance_frameworks_jurisdiction ON compliance_frameworks(jurisdiction);
CREATE INDEX IF NOT EXISTS idx_compliance_frameworks_industry ON compliance_frameworks(industry);
CREATE INDEX IF NOT EXISTS idx_compliance_frameworks_active ON compliance_frameworks(is_active) WHERE is_active = true;

-- Framework requirements indexes
CREATE INDEX IF NOT EXISTS idx_framework_requirements_framework ON compliance_framework_requirements(framework_id);
CREATE INDEX IF NOT EXISTS idx_framework_requirements_category ON compliance_framework_requirements(category);
CREATE INDEX IF NOT EXISTS idx_framework_requirements_priority ON compliance_framework_requirements(priority);
CREATE INDEX IF NOT EXISTS idx_framework_requirements_active ON compliance_framework_requirements(is_active) WHERE is_active = true;

-- Policy indexes
CREATE INDEX IF NOT EXISTS idx_compliance_policies_org ON compliance_policies(organization_id);
CREATE INDEX IF NOT EXISTS idx_compliance_policies_framework ON compliance_policies(framework_id);
CREATE INDEX IF NOT EXISTS idx_compliance_policies_status ON compliance_policies(status);
CREATE INDEX IF NOT EXISTS idx_compliance_policies_effective_date ON compliance_policies(effective_date);

-- Assessment indexes
CREATE INDEX IF NOT EXISTS idx_compliance_assessments_org ON compliance_assessments(organization_id);
CREATE INDEX IF NOT EXISTS idx_compliance_assessments_framework ON compliance_assessments(framework_id);
CREATE INDEX IF NOT EXISTS idx_compliance_assessments_status ON compliance_assessments(status);
CREATE INDEX IF NOT EXISTS idx_compliance_assessments_dates ON compliance_assessments(assessment_period_start, assessment_period_end);
CREATE INDEX IF NOT EXISTS idx_compliance_assessments_lead ON compliance_assessments(lead_assessor_id);

-- Assessment findings indexes
CREATE INDEX IF NOT EXISTS idx_assessment_findings_assessment ON compliance_assessment_findings(assessment_id);
CREATE INDEX IF NOT EXISTS idx_assessment_findings_requirement ON compliance_assessment_findings(requirement_id);
CREATE INDEX IF NOT EXISTS idx_assessment_findings_severity ON compliance_assessment_findings(severity);
CREATE INDEX IF NOT EXISTS idx_assessment_findings_status ON compliance_assessment_findings(status);

-- Enhanced audit log indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_compliance_framework ON audit_logs(compliance_framework_id) WHERE compliance_framework_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_risk_level ON audit_logs(risk_level);
CREATE INDEX IF NOT EXISTS idx_audit_logs_regulatory ON audit_logs(regulatory_significance) WHERE regulatory_significance = true;
CREATE INDEX IF NOT EXISTS idx_audit_logs_correlation ON audit_logs(correlation_id) WHERE correlation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_session ON audit_logs(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_classification ON audit_logs(data_classification);

-- Audit evidence indexes
CREATE INDEX IF NOT EXISTS idx_audit_evidence_log ON audit_evidence(audit_log_id);
CREATE INDEX IF NOT EXISTS idx_audit_evidence_assessment ON audit_evidence(assessment_id);
CREATE INDEX IF NOT EXISTS idx_audit_evidence_type ON audit_evidence(evidence_type);
CREATE INDEX IF NOT EXISTS idx_audit_evidence_collected_by ON audit_evidence(collected_by);
CREATE INDEX IF NOT EXISTS idx_audit_evidence_verification ON audit_evidence(verification_status);
CREATE INDEX IF NOT EXISTS idx_audit_evidence_legal_hold ON audit_evidence(legal_hold) WHERE legal_hold = true;

-- Audit reports indexes
CREATE INDEX IF NOT EXISTS idx_audit_reports_org ON audit_reports(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_reports_type ON audit_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_audit_reports_status ON audit_reports(status);
CREATE INDEX IF NOT EXISTS idx_audit_reports_period ON audit_reports(reporting_period_start, reporting_period_end);
CREATE INDEX IF NOT EXISTS idx_audit_reports_published ON audit_reports(published_at) WHERE published_at IS NOT NULL;

-- Violations indexes
CREATE INDEX IF NOT EXISTS idx_compliance_violations_org ON compliance_violations(organization_id);
CREATE INDEX IF NOT EXISTS idx_compliance_violations_framework ON compliance_violations(framework_id);
CREATE INDEX IF NOT EXISTS idx_compliance_violations_severity ON compliance_violations(severity);
CREATE INDEX IF NOT EXISTS idx_compliance_violations_status ON compliance_violations(status);
CREATE INDEX IF NOT EXISTS idx_compliance_violations_detected_date ON compliance_violations(detected_date);

-- Training indexes
CREATE INDEX IF NOT EXISTS idx_compliance_training_org ON compliance_training(organization_id);
CREATE INDEX IF NOT EXISTS idx_compliance_training_framework ON compliance_training(framework_id);
CREATE INDEX IF NOT EXISTS idx_compliance_training_active ON compliance_training(is_active) WHERE is_active = true;

-- User training indexes
CREATE INDEX IF NOT EXISTS idx_user_training_user ON user_compliance_training(user_id);
CREATE INDEX IF NOT EXISTS idx_user_training_training ON user_compliance_training(training_id);
CREATE INDEX IF NOT EXISTS idx_user_training_org ON user_compliance_training(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_training_status ON user_compliance_training(status);
CREATE INDEX IF NOT EXISTS idx_user_training_due ON user_compliance_training(due_date);

-- =============================================
-- FULL TEXT SEARCH INDEXES
-- =============================================

-- Enable full text search on key fields
CREATE INDEX IF NOT EXISTS idx_compliance_frameworks_fts ON compliance_frameworks USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));
CREATE INDEX IF NOT EXISTS idx_framework_requirements_fts ON compliance_framework_requirements USING gin(to_tsvector('english', title || ' ' || description));
CREATE INDEX IF NOT EXISTS idx_compliance_policies_fts ON compliance_policies USING gin(to_tsvector('english', title || ' ' || COALESCE(content, '')));
CREATE INDEX IF NOT EXISTS idx_assessment_findings_fts ON compliance_assessment_findings USING gin(to_tsvector('english', title || ' ' || description));
CREATE INDEX IF NOT EXISTS idx_compliance_violations_fts ON compliance_violations USING gin(to_tsvector('english', title || ' ' || description));

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE compliance_frameworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_framework_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_assessment_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_training ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_compliance_training ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (basic organization-based access)
-- Frameworks are globally readable but only manageable by system admins
CREATE POLICY compliance_frameworks_read ON compliance_frameworks FOR SELECT USING (true);
CREATE POLICY compliance_frameworks_manage ON compliance_frameworks FOR ALL USING (
    EXISTS (
        SELECT 1 FROM users u 
        WHERE u.id = auth.uid() 
        AND u.role IN ('admin', 'super_admin')
    )
);

-- Framework requirements follow framework access
CREATE POLICY framework_requirements_read ON compliance_framework_requirements FOR SELECT USING (true);
CREATE POLICY framework_requirements_manage ON compliance_framework_requirements FOR ALL USING (
    EXISTS (
        SELECT 1 FROM users u 
        WHERE u.id = auth.uid() 
        AND u.role IN ('admin', 'super_admin')
    )
);

-- Organization-based policies for other tables
CREATE POLICY compliance_policies_access ON compliance_policies FOR ALL USING (
    EXISTS (
        SELECT 1 FROM users u 
        JOIN user_organizations uo ON u.id = uo.user_id
        WHERE u.id = auth.uid() 
        AND uo.organization_id = compliance_policies.organization_id
        AND uo.role IN ('admin', 'member')
    )
);

CREATE POLICY compliance_assessments_access ON compliance_assessments FOR ALL USING (
    EXISTS (
        SELECT 1 FROM users u 
        JOIN user_organizations uo ON u.id = uo.user_id
        WHERE u.id = auth.uid() 
        AND uo.organization_id = compliance_assessments.organization_id
        AND uo.role IN ('admin', 'member')
    )
);

CREATE POLICY assessment_findings_access ON compliance_assessment_findings FOR ALL USING (
    EXISTS (
        SELECT 1 FROM compliance_assessments ca
        JOIN users u ON u.id = auth.uid()
        JOIN user_organizations uo ON u.id = uo.user_id
        WHERE ca.id = compliance_assessment_findings.assessment_id
        AND uo.organization_id = ca.organization_id
        AND uo.role IN ('admin', 'member')
    )
);

CREATE POLICY audit_evidence_access ON audit_evidence FOR ALL USING (
    CASE 
        WHEN assessment_id IS NOT NULL THEN
            EXISTS (
                SELECT 1 FROM compliance_assessments ca
                JOIN users u ON u.id = auth.uid()
                JOIN user_organizations uo ON u.id = uo.user_id
                WHERE ca.id = audit_evidence.assessment_id
                AND uo.organization_id = ca.organization_id
                AND uo.role IN ('admin', 'member')
            )
        ELSE true  -- For audit_log_id based evidence, rely on audit log access
    END
);

CREATE POLICY audit_reports_access ON audit_reports FOR ALL USING (
    EXISTS (
        SELECT 1 FROM users u 
        JOIN user_organizations uo ON u.id = uo.user_id
        WHERE u.id = auth.uid() 
        AND uo.organization_id = audit_reports.organization_id
        AND uo.role IN ('admin', 'member')
    )
);

CREATE POLICY compliance_violations_access ON compliance_violations FOR ALL USING (
    EXISTS (
        SELECT 1 FROM users u 
        JOIN user_organizations uo ON u.id = uo.user_id
        WHERE u.id = auth.uid() 
        AND uo.organization_id = compliance_violations.organization_id
        AND uo.role IN ('admin', 'member')
    )
);

CREATE POLICY compliance_training_access ON compliance_training FOR ALL USING (
    EXISTS (
        SELECT 1 FROM users u 
        JOIN user_organizations uo ON u.id = uo.user_id
        WHERE u.id = auth.uid() 
        AND uo.organization_id = compliance_training.organization_id
        AND uo.role IN ('admin', 'member')
    )
);

CREATE POLICY user_training_access ON user_compliance_training FOR ALL USING (
    user_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM users u 
        JOIN user_organizations uo ON u.id = uo.user_id
        WHERE u.id = auth.uid() 
        AND uo.organization_id = user_compliance_training.organization_id
        AND uo.role IN ('admin', 'member')
    )
);

-- =============================================
-- TRIGGERS FOR AUDITING AND AUTOMATION
-- =============================================

-- Update timestamps trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add update triggers to all tables
CREATE TRIGGER update_compliance_frameworks_updated_at BEFORE UPDATE ON compliance_frameworks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_framework_requirements_updated_at BEFORE UPDATE ON compliance_framework_requirements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_compliance_policies_updated_at BEFORE UPDATE ON compliance_policies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_compliance_assessments_updated_at BEFORE UPDATE ON compliance_assessments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_assessment_findings_updated_at BEFORE UPDATE ON compliance_assessment_findings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_audit_evidence_updated_at BEFORE UPDATE ON audit_evidence FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_audit_reports_updated_at BEFORE UPDATE ON audit_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_compliance_violations_updated_at BEFORE UPDATE ON compliance_violations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_compliance_training_updated_at BEFORE UPDATE ON compliance_training FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_training_updated_at BEFORE UPDATE ON user_compliance_training FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Audit trigger function to log changes
CREATE OR REPLACE FUNCTION audit_table_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Log the change to audit_logs
    INSERT INTO audit_logs (
        action,
        resource_type,
        resource_id,
        old_values,
        new_values,
        severity,
        category,
        regulatory_significance
    ) VALUES (
        TG_OP,
        TG_TABLE_NAME,
        CASE 
            WHEN TG_OP = 'DELETE' THEN OLD.id::text
            ELSE NEW.id::text
        END,
        CASE 
            WHEN TG_OP = 'DELETE' THEN row_to_json(OLD)
            WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD)
            ELSE NULL
        END,
        CASE 
            WHEN TG_OP = 'DELETE' THEN NULL
            ELSE row_to_json(NEW)
        END,
        'medium',
        'compliance',
        true
    );
    
    RETURN CASE 
        WHEN TG_OP = 'DELETE' THEN OLD
        ELSE NEW
    END;
END;
$$ language 'plpgsql';

-- Add audit triggers to key compliance tables
CREATE TRIGGER audit_compliance_policies_changes AFTER INSERT OR UPDATE OR DELETE ON compliance_policies FOR EACH ROW EXECUTE FUNCTION audit_table_changes();
CREATE TRIGGER audit_compliance_assessments_changes AFTER INSERT OR UPDATE OR DELETE ON compliance_assessments FOR EACH ROW EXECUTE FUNCTION audit_table_changes();
CREATE TRIGGER audit_compliance_violations_changes AFTER INSERT OR UPDATE OR DELETE ON compliance_violations FOR EACH ROW EXECUTE FUNCTION audit_table_changes();

-- =============================================
-- SAMPLE DATA FOR TESTING
-- =============================================

-- Insert common regulatory frameworks
INSERT INTO compliance_frameworks (name, acronym, description, version, jurisdiction, industry, effective_date, authority_body, reference_url) VALUES
('Sarbanes-Oxley Act', 'SOX', 'Corporate governance and financial disclosure requirements for public companies', '2.0', 'US', 'Finance', '2002-07-30', 'SEC', 'https://www.sec.gov/about/laws/soa2002.pdf'),
('General Data Protection Regulation', 'GDPR', 'Data protection and privacy regulation for individuals within the European Union', '1.0', 'EU', 'General', '2018-05-25', 'European Commission', 'https://gdpr.eu/'),
('Payment Card Industry Data Security Standard', 'PCI DSS', 'Security standards for organizations that handle credit card information', '4.0', 'Global', 'Finance', '2022-03-31', 'PCI Security Standards Council', 'https://www.pcisecuritystandards.org/'),
('Health Insurance Portability and Accountability Act', 'HIPAA', 'Privacy and security requirements for protected health information', '1.0', 'US', 'Healthcare', '1996-08-21', 'HHS', 'https://www.hhs.gov/hipaa/'),
('ISO 27001', 'ISO27001', 'International standard for information security management systems', '2022', 'Global', 'General', '2022-10-25', 'ISO', 'https://www.iso.org/standard/27001')
ON CONFLICT (acronym) DO NOTHING;

-- Create basic framework requirements (sample for SOX)
INSERT INTO compliance_framework_requirements (framework_id, requirement_code, title, description, category, priority, compliance_type, evidence_requirements, testing_frequency, control_type) 
SELECT 
    f.id,
    'SOX-302',
    'CEO and CFO Certification',
    'Principal executive and financial officers must certify the accuracy of financial statements',
    'Financial Reporting',
    'critical',
    'mandatory',
    '["certification_documents", "financial_statements", "supporting_documentation"]'::jsonb,
    'quarterly',
    'preventive'
FROM compliance_frameworks f WHERE f.acronym = 'SOX'
ON CONFLICT (framework_id, requirement_code) DO NOTHING;

INSERT INTO compliance_framework_requirements (framework_id, requirement_code, title, description, category, priority, compliance_type, evidence_requirements, testing_frequency, control_type) 
SELECT 
    f.id,
    'SOX-404',
    'Management Assessment of Internal Controls',
    'Management must assess and report on the effectiveness of internal controls over financial reporting',
    'Internal Controls',
    'critical',
    'mandatory',
    '["control_documentation", "testing_results", "management_assessment"]'::jsonb,
    'annual',
    'detective'
FROM compliance_frameworks f WHERE f.acronym = 'SOX'
ON CONFLICT (framework_id, requirement_code) DO NOTHING;

-- Sample GDPR requirements
INSERT INTO compliance_framework_requirements (framework_id, requirement_code, title, description, category, priority, compliance_type, evidence_requirements, testing_frequency, control_type) 
SELECT 
    f.id,
    'GDPR-25',
    'Data Protection by Design and by Default',
    'Technical and organisational measures must be implemented to protect personal data',
    'Data Protection',
    'high',
    'mandatory',
    '["privacy_impact_assessments", "technical_documentation", "policy_documents"]'::jsonb,
    'annual',
    'preventive'
FROM compliance_frameworks f WHERE f.acronym = 'GDPR'
ON CONFLICT (framework_id, requirement_code) DO NOTHING;

INSERT INTO compliance_framework_requirements (framework_id, requirement_code, title, description, category, priority, compliance_type, evidence_requirements, testing_frequency, control_type) 
SELECT 
    f.id,
    'GDPR-32',
    'Security of Processing',
    'Appropriate technical and organisational measures to ensure a level of security appropriate to the risk',
    'Security',
    'high',
    'mandatory',
    '["security_policies", "risk_assessments", "incident_reports"]'::jsonb,
    'continuous',
    'preventive'
FROM compliance_frameworks f WHERE f.acronym = 'GDPR'
ON CONFLICT (framework_id, requirement_code) DO NOTHING;

-- Add sample compliance training
INSERT INTO compliance_training (organization_id, framework_id, title, description, training_type, delivery_method, duration_minutes, validity_months, learning_objectives, target_roles, created_by)
SELECT 
    o.id,
    f.id,
    'GDPR Fundamentals Training',
    'Essential training on GDPR requirements, data protection principles, and individual rights',
    'mandatory',
    'online',
    120,
    12,
    '["Understand GDPR principles", "Identify personal data", "Know individual rights", "Recognize data breaches"]'::text[],
    '["all_employees"]'::text[],
    u.id
FROM organizations o
CROSS JOIN compliance_frameworks f
CROSS JOIN users u
WHERE f.acronym = 'GDPR' 
AND u.role IN ('admin', 'super_admin')
LIMIT 1
ON CONFLICT DO NOTHING;

-- =============================================
-- ANALYTICS AND REPORTING VIEWS
-- =============================================

-- Compliance dashboard view
CREATE OR REPLACE VIEW compliance_dashboard_metrics AS
SELECT 
    ca.organization_id,
    cf.acronym as framework,
    COUNT(DISTINCT ca.id) as total_assessments,
    COUNT(DISTINCT CASE WHEN ca.status = 'completed' THEN ca.id END) as completed_assessments,
    COUNT(DISTINCT CASE WHEN ca.status IN ('in_progress', 'under_review') THEN ca.id END) as active_assessments,
    COUNT(DISTINCT caf.id) as total_findings,
    COUNT(DISTINCT CASE WHEN caf.severity = 'critical' THEN caf.id END) as critical_findings,
    COUNT(DISTINCT CASE WHEN caf.severity = 'high' THEN caf.id END) as high_findings,
    COUNT(DISTINCT CASE WHEN caf.status = 'open' THEN caf.id END) as open_findings,
    AVG(ca.overall_score) as avg_compliance_score,
    COUNT(DISTINCT cv.id) as total_violations,
    COUNT(DISTINCT CASE WHEN cv.status = 'resolved' THEN cv.id END) as resolved_violations,
    MAX(ca.actual_end_date) as last_assessment_date,
    MIN(CASE WHEN ca.next_assessment_date > CURRENT_DATE THEN ca.next_assessment_date END) as next_assessment_date
FROM compliance_assessments ca
JOIN compliance_frameworks cf ON ca.framework_id = cf.id
LEFT JOIN compliance_assessment_findings caf ON ca.id = caf.assessment_id
LEFT JOIN compliance_violations cv ON ca.organization_id = cv.organization_id AND ca.framework_id = cv.framework_id
WHERE ca.created_at >= CURRENT_DATE - INTERVAL '2 years'
GROUP BY ca.organization_id, cf.acronym, cf.name;

-- Audit activity summary view
CREATE OR REPLACE VIEW audit_activity_summary AS
SELECT 
    al.organization_id,
    DATE_TRUNC('day', al.created_at) as activity_date,
    al.category,
    al.severity,
    COUNT(*) as event_count,
    COUNT(DISTINCT al.user_id) as unique_users,
    COUNT(DISTINCT al.resource_type) as unique_resource_types,
    COUNT(CASE WHEN al.regulatory_significance = true THEN 1 END) as regulatory_significant_events,
    COUNT(CASE WHEN al.risk_level = 'critical' THEN 1 END) as critical_risk_events
FROM audit_logs al
WHERE al.created_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY al.organization_id, DATE_TRUNC('day', al.created_at), al.category, al.severity;

-- Training compliance view
CREATE OR REPLACE VIEW training_compliance_status AS
SELECT 
    uct.organization_id,
    ct.framework_id,
    cf.acronym as framework,
    ct.title as training_title,
    COUNT(DISTINCT uct.user_id) as total_assigned,
    COUNT(DISTINCT CASE WHEN uct.status = 'completed' THEN uct.user_id END) as completed_users,
    COUNT(DISTINCT CASE WHEN uct.status = 'assigned' AND uct.due_date < CURRENT_DATE THEN uct.user_id END) as overdue_users,
    COUNT(DISTINCT CASE WHEN uct.status = 'assigned' AND uct.due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days' THEN uct.user_id END) as due_soon_users,
    ROUND(
        (COUNT(DISTINCT CASE WHEN uct.status = 'completed' THEN uct.user_id END)::decimal / 
         NULLIF(COUNT(DISTINCT uct.user_id), 0)) * 100, 2
    ) as completion_percentage
FROM user_compliance_training uct
JOIN compliance_training ct ON uct.training_id = ct.id
JOIN compliance_frameworks cf ON ct.framework_id = cf.id
GROUP BY uct.organization_id, ct.framework_id, cf.acronym, ct.title;

-- Create materialized views for better performance on large datasets
CREATE MATERIALIZED VIEW IF NOT EXISTS compliance_metrics_mv AS SELECT * FROM compliance_dashboard_metrics;
CREATE MATERIALIZED VIEW IF NOT EXISTS audit_summary_mv AS SELECT * FROM audit_activity_summary;
CREATE MATERIALIZED VIEW IF NOT EXISTS training_status_mv AS SELECT * FROM training_compliance_status;

-- Create indexes on materialized views
CREATE INDEX IF NOT EXISTS idx_compliance_metrics_mv_org ON compliance_metrics_mv(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_summary_mv_org_date ON audit_summary_mv(organization_id, activity_date);
CREATE INDEX IF NOT EXISTS idx_training_status_mv_org ON training_status_mv(organization_id);

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_compliance_analytics()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY compliance_metrics_mv;
    REFRESH MATERIALIZED VIEW CONCURRENTLY audit_summary_mv;
    REFRESH MATERIALIZED VIEW CONCURRENTLY training_status_mv;
END;
$$ LANGUAGE plpgsql;

COMMIT;