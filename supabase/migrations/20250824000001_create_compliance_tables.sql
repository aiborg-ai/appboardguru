-- Compliance Tracker Database Schema
-- Creates tables for comprehensive compliance management

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Compliance Frameworks table
CREATE TABLE compliance_frameworks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    version VARCHAR(50) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    regulatory_body VARCHAR(255),
    effective_date DATE,
    requirements JSONB NOT NULL DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Compliance Assessments table
CREATE TABLE compliance_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    framework_id UUID NOT NULL REFERENCES compliance_frameworks(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('internal', 'external', 'self-assessment', 'audit')),
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in-progress', 'under-review', 'completed', 'approved')),
    scope TEXT[] NOT NULL DEFAULT '{}',
    assessor_id UUID REFERENCES auth.users(id),
    scheduled_start_date DATE,
    actual_start_date DATE,
    scheduled_completion_date DATE,
    actual_completion_date DATE,
    overall_rating VARCHAR(20) CHECK (overall_rating IN ('compliant', 'partially-compliant', 'non-compliant', 'not-assessed')),
    summary TEXT,
    methodology TEXT,
    evidence_collected JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Compliance Findings table
CREATE TABLE compliance_findings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id UUID NOT NULL REFERENCES compliance_assessments(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    requirement_id VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (severity IN ('critical', 'high', 'medium', 'low')),
    status VARCHAR(50) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in-remediation', 'resolved', 'accepted-risk', 'false-positive')),
    deficiencies TEXT[] DEFAULT '{}',
    recommendations TEXT[] DEFAULT '{}',
    evidence JSONB DEFAULT '[]',
    assigned_to UUID REFERENCES auth.users(id),
    due_date DATE,
    remediation_notes TEXT,
    risk_rating VARCHAR(20) CHECK (risk_rating IN ('critical', 'high', 'medium', 'low')),
    business_impact TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Remediation Plans table
CREATE TABLE remediation_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    finding_id UUID NOT NULL REFERENCES compliance_findings(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'completed', 'overdue', 'cancelled')),
    priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
    assigned_to UUID REFERENCES auth.users(id),
    target_date DATE NOT NULL,
    actual_completion_date DATE,
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    action_items JSONB DEFAULT '[]',
    resources_required TEXT,
    estimated_cost DECIMAL(10,2),
    actual_cost DECIMAL(10,2),
    success_criteria TEXT,
    verification_method TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Compliance Policies table
CREATE TABLE compliance_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'under-review', 'approved', 'archived')),
    version VARCHAR(50) NOT NULL DEFAULT '1.0',
    effective_date DATE,
    review_date DATE,
    owner_id UUID REFERENCES auth.users(id),
    approver_id UUID REFERENCES auth.users(id),
    content TEXT,
    related_frameworks UUID[] DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    document_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Compliance Alerts table
CREATE TABLE compliance_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
    type VARCHAR(50) NOT NULL CHECK (type IN ('deadline-approaching', 'overdue-task', 'assessment-due', 'policy-review', 'finding-escalation', 'compliance-gap')),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'dismissed', 'resolved')),
    related_entity_type VARCHAR(50) NOT NULL CHECK (related_entity_type IN ('assessment', 'finding', 'remediation', 'policy')),
    related_entity_id UUID NOT NULL,
    assigned_to UUID REFERENCES auth.users(id),
    due_date DATE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Compliance Reports table
CREATE TABLE compliance_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('executive-summary', 'detailed-assessment', 'remediation-status', 'policy-compliance', 'audit-trail')),
    status VARCHAR(50) NOT NULL DEFAULT 'generating' CHECK (status IN ('generating', 'completed', 'failed', 'cancelled')),
    format VARCHAR(20) NOT NULL DEFAULT 'pdf' CHECK (format IN ('pdf', 'excel', 'csv', 'json')),
    scope JSONB DEFAULT '{}',
    parameters JSONB DEFAULT '{}',
    generated_by UUID NOT NULL REFERENCES auth.users(id),
    file_url TEXT,
    file_size INTEGER,
    generation_started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    generation_completed_at TIMESTAMP WITH TIME ZONE,
    download_count INTEGER DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activity Log for compliance actions
CREATE TABLE compliance_activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL CHECK (action_type IN ('assessment', 'finding', 'remediation', 'policy', 'alert', 'report')),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_compliance_assessments_org_id ON compliance_assessments(organization_id);
CREATE INDEX idx_compliance_assessments_framework_id ON compliance_assessments(framework_id);
CREATE INDEX idx_compliance_assessments_status ON compliance_assessments(status);
CREATE INDEX idx_compliance_assessments_dates ON compliance_assessments(scheduled_completion_date, actual_completion_date);

CREATE INDEX idx_compliance_findings_assessment_id ON compliance_findings(assessment_id);
CREATE INDEX idx_compliance_findings_org_id ON compliance_findings(organization_id);
CREATE INDEX idx_compliance_findings_status ON compliance_findings(status);
CREATE INDEX idx_compliance_findings_severity ON compliance_findings(severity);
CREATE INDEX idx_compliance_findings_due_date ON compliance_findings(due_date);

CREATE INDEX idx_remediation_plans_finding_id ON remediation_plans(finding_id);
CREATE INDEX idx_remediation_plans_org_id ON remediation_plans(organization_id);
CREATE INDEX idx_remediation_plans_status ON remediation_plans(status);
CREATE INDEX idx_remediation_plans_priority ON remediation_plans(priority);
CREATE INDEX idx_remediation_plans_target_date ON remediation_plans(target_date);

CREATE INDEX idx_compliance_policies_org_id ON compliance_policies(organization_id);
CREATE INDEX idx_compliance_policies_category ON compliance_policies(category);
CREATE INDEX idx_compliance_policies_status ON compliance_policies(status);

CREATE INDEX idx_compliance_alerts_org_id ON compliance_alerts(organization_id);
CREATE INDEX idx_compliance_alerts_priority ON compliance_alerts(priority);
CREATE INDEX idx_compliance_alerts_status ON compliance_alerts(status);
CREATE INDEX idx_compliance_alerts_type ON compliance_alerts(type);
CREATE INDEX idx_compliance_alerts_due_date ON compliance_alerts(due_date);

CREATE INDEX idx_compliance_reports_org_id ON compliance_reports(organization_id);
CREATE INDEX idx_compliance_reports_type ON compliance_reports(type);
CREATE INDEX idx_compliance_reports_status ON compliance_reports(status);

CREATE INDEX idx_compliance_activity_log_org_id ON compliance_activity_log(organization_id);
CREATE INDEX idx_compliance_activity_log_user_id ON compliance_activity_log(user_id);
CREATE INDEX idx_compliance_activity_log_action_type ON compliance_activity_log(action_type);
CREATE INDEX idx_compliance_activity_log_created_at ON compliance_activity_log(created_at DESC);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_compliance_frameworks_updated_at BEFORE UPDATE ON compliance_frameworks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_compliance_assessments_updated_at BEFORE UPDATE ON compliance_assessments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_compliance_findings_updated_at BEFORE UPDATE ON compliance_findings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_remediation_plans_updated_at BEFORE UPDATE ON remediation_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_compliance_policies_updated_at BEFORE UPDATE ON compliance_policies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_compliance_alerts_updated_at BEFORE UPDATE ON compliance_alerts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_compliance_reports_updated_at BEFORE UPDATE ON compliance_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE compliance_frameworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE remediation_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_activity_log ENABLE ROW LEVEL SECURITY;

-- Frameworks are public (can be read by authenticated users)
CREATE POLICY "Frameworks are viewable by authenticated users" ON compliance_frameworks FOR SELECT USING (auth.role() = 'authenticated');

-- Organization-based RLS policies
CREATE POLICY "Users can view their organization's assessments" ON compliance_assessments FOR SELECT USING (
    organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert assessments for their organization" ON compliance_assessments FOR INSERT WITH CHECK (
    organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can update their organization's assessments" ON compliance_assessments FOR UPDATE USING (
    organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
);

-- Similar RLS policies for other tables
CREATE POLICY "Users can view their organization's findings" ON compliance_findings FOR SELECT USING (
    organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can manage their organization's findings" ON compliance_findings FOR ALL USING (
    organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can view their organization's remediation plans" ON remediation_plans FOR SELECT USING (
    organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can manage their organization's remediation plans" ON remediation_plans FOR ALL USING (
    organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can view their organization's policies" ON compliance_policies FOR SELECT USING (
    organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can manage their organization's policies" ON compliance_policies FOR ALL USING (
    organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can view their organization's alerts" ON compliance_alerts FOR SELECT USING (
    organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can manage their organization's alerts" ON compliance_alerts FOR ALL USING (
    organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can view their organization's reports" ON compliance_reports FOR SELECT USING (
    organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can manage their organization's reports" ON compliance_reports FOR ALL USING (
    organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can view their organization's activity log" ON compliance_activity_log FOR SELECT USING (
    organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert activity logs for their organization" ON compliance_activity_log FOR INSERT WITH CHECK (
    organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
);

-- Add comments for documentation
COMMENT ON TABLE compliance_frameworks IS 'Compliance frameworks like SOC2, ISO27001, GDPR, etc.';
COMMENT ON TABLE compliance_assessments IS 'Compliance assessments and audits against frameworks';
COMMENT ON TABLE compliance_findings IS 'Issues and gaps found during assessments';
COMMENT ON TABLE remediation_plans IS 'Action plans to address compliance findings';
COMMENT ON TABLE compliance_policies IS 'Organization policies related to compliance';
COMMENT ON TABLE compliance_alerts IS 'Automated alerts for compliance issues and deadlines';
COMMENT ON TABLE compliance_reports IS 'Generated compliance reports and exports';
COMMENT ON TABLE compliance_activity_log IS 'Audit trail of all compliance-related activities';