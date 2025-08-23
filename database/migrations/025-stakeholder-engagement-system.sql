-- ============================================================================
-- STAKEHOLDER ENGAGEMENT PORTAL SYSTEM
-- ============================================================================
-- This migration creates a comprehensive stakeholder engagement system
-- including investor relations, voting, ESG reporting, sentiment analysis,
-- and communication management.

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================================
-- STAKEHOLDER INVESTORS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS stakeholder_investors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    type TEXT NOT NULL CHECK (type IN ('individual', 'institutional', 'strategic')),
    investment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    investment_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    shareholding_percentage DECIMAL(5,2) NOT NULL DEFAULT 0 CHECK (shareholding_percentage >= 0 AND shareholding_percentage <= 100),
    access_level TEXT NOT NULL DEFAULT 'basic' CHECK (access_level IN ('basic', 'premium', 'vip')),
    contact_preferences JSONB NOT NULL DEFAULT '{"email": true, "phone": false, "meetings": false, "reports": true}'::jsonb,
    last_engagement TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for stakeholder_investors
CREATE INDEX IF NOT EXISTS idx_stakeholder_investors_organization_id ON stakeholder_investors(organization_id);
CREATE INDEX IF NOT EXISTS idx_stakeholder_investors_type ON stakeholder_investors(type);
CREATE INDEX IF NOT EXISTS idx_stakeholder_investors_status ON stakeholder_investors(status);
CREATE INDEX IF NOT EXISTS idx_stakeholder_investors_access_level ON stakeholder_investors(access_level);
CREATE INDEX IF NOT EXISTS idx_stakeholder_investors_last_engagement ON stakeholder_investors(last_engagement);

-- ============================================================================
-- STAKEHOLDER VOTES TABLE (Shareholder Voting Platform)
-- ============================================================================

CREATE TABLE IF NOT EXISTS stakeholder_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    meeting_id UUID NOT NULL,
    proposal_id UUID NOT NULL,
    voter_id UUID NOT NULL REFERENCES stakeholder_investors(id) ON DELETE CASCADE,
    vote_type TEXT NOT NULL CHECK (vote_type IN ('for', 'against', 'abstain')),
    shares_voted DECIMAL(15,2) NOT NULL DEFAULT 0,
    is_proxy BOOLEAN NOT NULL DEFAULT FALSE,
    proxy_holder TEXT,
    vote_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
    audit_trail JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Ensure one vote per proposal per voter
    UNIQUE(proposal_id, voter_id)
);

-- Create indexes for stakeholder_votes
CREATE INDEX IF NOT EXISTS idx_stakeholder_votes_organization_id ON stakeholder_votes(organization_id);
CREATE INDEX IF NOT EXISTS idx_stakeholder_votes_meeting_id ON stakeholder_votes(meeting_id);
CREATE INDEX IF NOT EXISTS idx_stakeholder_votes_proposal_id ON stakeholder_votes(proposal_id);
CREATE INDEX IF NOT EXISTS idx_stakeholder_votes_voter_id ON stakeholder_votes(voter_id);
CREATE INDEX IF NOT EXISTS idx_stakeholder_votes_timestamp ON stakeholder_votes(vote_timestamp);

-- ============================================================================
-- STAKEHOLDER PROPOSALS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS stakeholder_proposals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    meeting_id UUID NOT NULL,
    proposal_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('board_election', 'compensation', 'merger_acquisition', 'strategic_initiative', 'governance', 'other')),
    proposed_by TEXT NOT NULL,
    voting_deadline TIMESTAMPTZ NOT NULL,
    required_majority DECIMAL(5,2) NOT NULL DEFAULT 50.0,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'passed', 'rejected')),
    supporting_documents JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(organization_id, meeting_id, proposal_number)
);

-- Create indexes for stakeholder_proposals
CREATE INDEX IF NOT EXISTS idx_stakeholder_proposals_organization_id ON stakeholder_proposals(organization_id);
CREATE INDEX IF NOT EXISTS idx_stakeholder_proposals_meeting_id ON stakeholder_proposals(meeting_id);
CREATE INDEX IF NOT EXISTS idx_stakeholder_proposals_status ON stakeholder_proposals(status);
CREATE INDEX IF NOT EXISTS idx_stakeholder_proposals_deadline ON stakeholder_proposals(voting_deadline);

-- ============================================================================
-- STAKEHOLDER ESG METRICS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS stakeholder_esg_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN ('environmental', 'social', 'governance')),
    metric_name TEXT NOT NULL,
    value DECIMAL(15,4) NOT NULL,
    unit TEXT NOT NULL,
    reporting_period TEXT NOT NULL,
    benchmark_value DECIMAL(15,4),
    improvement_target DECIMAL(15,4),
    data_source TEXT NOT NULL,
    verification_status TEXT NOT NULL DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'internal', 'third_party')),
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for stakeholder_esg_metrics
CREATE INDEX IF NOT EXISTS idx_stakeholder_esg_metrics_organization_id ON stakeholder_esg_metrics(organization_id);
CREATE INDEX IF NOT EXISTS idx_stakeholder_esg_metrics_category ON stakeholder_esg_metrics(category);
CREATE INDEX IF NOT EXISTS idx_stakeholder_esg_metrics_reporting_period ON stakeholder_esg_metrics(reporting_period);
CREATE INDEX IF NOT EXISTS idx_stakeholder_esg_metrics_last_updated ON stakeholder_esg_metrics(last_updated);

-- ============================================================================
-- STAKEHOLDER SENTIMENT ANALYSIS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS stakeholder_sentiment_analysis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    source TEXT NOT NULL CHECK (source IN ('social_media', 'news', 'analyst_reports', 'earnings_calls')),
    content TEXT NOT NULL,
    sentiment_score DECIMAL(5,4) NOT NULL CHECK (sentiment_score >= -1 AND sentiment_score <= 1),
    confidence DECIMAL(5,4) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    keywords TEXT[] NOT NULL DEFAULT '{}',
    stakeholder_type TEXT NOT NULL,
    analyzed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    platform TEXT,
    author TEXT,
    reach INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for stakeholder_sentiment_analysis
CREATE INDEX IF NOT EXISTS idx_stakeholder_sentiment_organization_id ON stakeholder_sentiment_analysis(organization_id);
CREATE INDEX IF NOT EXISTS idx_stakeholder_sentiment_source ON stakeholder_sentiment_analysis(source);
CREATE INDEX IF NOT EXISTS idx_stakeholder_sentiment_analyzed_at ON stakeholder_sentiment_analysis(analyzed_at);
CREATE INDEX IF NOT EXISTS idx_stakeholder_sentiment_stakeholder_type ON stakeholder_sentiment_analysis(stakeholder_type);
CREATE INDEX IF NOT EXISTS idx_stakeholder_sentiment_keywords ON stakeholder_sentiment_analysis USING GIN(keywords);

-- ============================================================================
-- STAKEHOLDER COMMUNICATION TEMPLATES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS stakeholder_communication_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('earnings_report', 'investor_update', 'esg_report', 'crisis_communication', 'regulatory_filing')),
    subject TEXT NOT NULL,
    content TEXT NOT NULL,
    variables TEXT[] NOT NULL DEFAULT '{}',
    approval_required BOOLEAN NOT NULL DEFAULT FALSE,
    compliance_reviewed BOOLEAN NOT NULL DEFAULT FALSE,
    target_audience TEXT[] NOT NULL DEFAULT '{}',
    channels TEXT[] NOT NULL DEFAULT '{}',
    created_by UUID NOT NULL REFERENCES users(id),
    last_modified TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for stakeholder_communication_templates
CREATE INDEX IF NOT EXISTS idx_stakeholder_templates_organization_id ON stakeholder_communication_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_stakeholder_templates_type ON stakeholder_communication_templates(type);
CREATE INDEX IF NOT EXISTS idx_stakeholder_templates_created_by ON stakeholder_communication_templates(created_by);

-- ============================================================================
-- STAKEHOLDER COMMUNICATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS stakeholder_communications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    template_id UUID REFERENCES stakeholder_communication_templates(id) ON DELETE SET NULL,
    sender_id UUID NOT NULL REFERENCES users(id),
    audience_segment TEXT[] NOT NULL DEFAULT '{}',
    channels_used TEXT[] NOT NULL DEFAULT '{}',
    recipient_count INTEGER NOT NULL DEFAULT 0,
    variables JSONB DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'failed')),
    scheduled_date TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    delivery_status JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for stakeholder_communications
CREATE INDEX IF NOT EXISTS idx_stakeholder_communications_organization_id ON stakeholder_communications(organization_id);
CREATE INDEX IF NOT EXISTS idx_stakeholder_communications_template_id ON stakeholder_communications(template_id);
CREATE INDEX IF NOT EXISTS idx_stakeholder_communications_status ON stakeholder_communications(status);
CREATE INDEX IF NOT EXISTS idx_stakeholder_communications_sent_at ON stakeholder_communications(sent_at);

-- ============================================================================
-- STAKEHOLDER ENGAGEMENT LOGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS stakeholder_engagement_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    stakeholder_id UUID NOT NULL,
    stakeholder_type TEXT NOT NULL CHECK (stakeholder_type IN ('investor', 'analyst', 'regulator', 'media', 'other')),
    engagement_type TEXT NOT NULL,
    engagement_details JSONB NOT NULL DEFAULT '{}'::jsonb,
    engaged_by UUID NOT NULL REFERENCES users(id),
    engagement_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for stakeholder_engagement_logs
CREATE INDEX IF NOT EXISTS idx_stakeholder_logs_organization_id ON stakeholder_engagement_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_stakeholder_logs_stakeholder_id ON stakeholder_engagement_logs(stakeholder_id);
CREATE INDEX IF NOT EXISTS idx_stakeholder_logs_type ON stakeholder_engagement_logs(stakeholder_type);
CREATE INDEX IF NOT EXISTS idx_stakeholder_logs_timestamp ON stakeholder_engagement_logs(engagement_timestamp);

-- ============================================================================
-- STAKEHOLDER REGULATORY DISCLOSURES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS stakeholder_regulatory_disclosures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    disclosure_type TEXT NOT NULL,
    content TEXT NOT NULL,
    due_date TIMESTAMPTZ NOT NULL,
    compliance_status TEXT NOT NULL DEFAULT 'pending' CHECK (compliance_status IN ('pending', 'compliant', 'warning', 'overdue')),
    filed_at TIMESTAMPTZ,
    filing_reference TEXT,
    stakeholder_notifications_sent BOOLEAN NOT NULL DEFAULT FALSE,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for stakeholder_regulatory_disclosures
CREATE INDEX IF NOT EXISTS idx_stakeholder_disclosures_organization_id ON stakeholder_regulatory_disclosures(organization_id);
CREATE INDEX IF NOT EXISTS idx_stakeholder_disclosures_type ON stakeholder_regulatory_disclosures(disclosure_type);
CREATE INDEX IF NOT EXISTS idx_stakeholder_disclosures_status ON stakeholder_regulatory_disclosures(compliance_status);
CREATE INDEX IF NOT EXISTS idx_stakeholder_disclosures_due_date ON stakeholder_regulatory_disclosures(due_date);

-- ============================================================================
-- ANALYST BRIEFING SYSTEM TABLES
-- ============================================================================

-- Analyst Profiles Table
CREATE TABLE IF NOT EXISTS analyst_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    firm TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    specialization TEXT[] NOT NULL DEFAULT '{}',
    coverage_sectors TEXT[] NOT NULL DEFAULT '{}',
    rating TEXT NOT NULL CHECK (rating IN ('buy', 'hold', 'sell', 'neutral')),
    target_price DECIMAL(10,2),
    price_updated TIMESTAMPTZ DEFAULT NOW(),
    relationship_status TEXT NOT NULL DEFAULT 'prospective' CHECK (relationship_status IN ('active', 'inactive', 'prospective')),
    last_interaction TIMESTAMPTZ DEFAULT NOW(),
    preference_profile JSONB NOT NULL DEFAULT '{
        "communication_style": "formal",
        "preferred_meeting_length": 60,
        "preferred_channels": ["email", "phone"],
        "information_focus": ["financial", "strategic"]
    }'::jsonb,
    influence_score INTEGER NOT NULL DEFAULT 50 CHECK (influence_score >= 0 AND influence_score <= 100),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for analyst_profiles
CREATE INDEX IF NOT EXISTS idx_analyst_profiles_organization_id ON analyst_profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_analyst_profiles_firm ON analyst_profiles(firm);
CREATE INDEX IF NOT EXISTS idx_analyst_profiles_rating ON analyst_profiles(rating);
CREATE INDEX IF NOT EXISTS idx_analyst_profiles_relationship_status ON analyst_profiles(relationship_status);
CREATE INDEX IF NOT EXISTS idx_analyst_profiles_influence_score ON analyst_profiles(influence_score DESC);

-- Analyst Briefing Sessions Table
CREATE TABLE IF NOT EXISTS analyst_briefing_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('earnings', 'strategy', 'product', 'market_update', 'crisis', 'ipo', 'merger')),
    scheduled_date TIMESTAMPTZ NOT NULL,
    duration INTEGER NOT NULL DEFAULT 60,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
    participants JSONB NOT NULL DEFAULT '{
        "internal": [],
        "analysts": []
    }'::jsonb,
    agenda JSONB NOT NULL DEFAULT '[]'::jsonb,
    materials JSONB NOT NULL DEFAULT '[]'::jsonb,
    q_and_a JSONB NOT NULL DEFAULT '[]'::jsonb,
    performance_expectations JSONB NOT NULL DEFAULT '[]'::jsonb,
    recording_url TEXT,
    transcript TEXT,
    summary TEXT,
    follow_up_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for analyst_briefing_sessions
CREATE INDEX IF NOT EXISTS idx_analyst_sessions_organization_id ON analyst_briefing_sessions(organization_id);
CREATE INDEX IF NOT EXISTS idx_analyst_sessions_type ON analyst_briefing_sessions(type);
CREATE INDEX IF NOT EXISTS idx_analyst_sessions_status ON analyst_briefing_sessions(status);
CREATE INDEX IF NOT EXISTS idx_analyst_sessions_scheduled_date ON analyst_briefing_sessions(scheduled_date);

-- Analyst Questions Table
CREATE TABLE IF NOT EXISTS analyst_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    session_id UUID REFERENCES analyst_briefing_sessions(id) ON DELETE CASCADE,
    analyst_id UUID REFERENCES analyst_profiles(id) ON DELETE SET NULL,
    question TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('financial', 'strategic', 'operational', 'market', 'regulatory')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('answered', 'pending', 'follow_up_required')),
    answer TEXT,
    answered_by UUID REFERENCES users(id),
    answered_at TIMESTAMPTZ,
    sources TEXT[] DEFAULT '{}',
    confidence_level INTEGER CHECK (confidence_level >= 0 AND confidence_level <= 100),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for analyst_questions
CREATE INDEX IF NOT EXISTS idx_analyst_questions_organization_id ON analyst_questions(organization_id);
CREATE INDEX IF NOT EXISTS idx_analyst_questions_session_id ON analyst_questions(session_id);
CREATE INDEX IF NOT EXISTS idx_analyst_questions_category ON analyst_questions(category);
CREATE INDEX IF NOT EXISTS idx_analyst_questions_status ON analyst_questions(status);
CREATE INDEX IF NOT EXISTS idx_analyst_questions_priority ON analyst_questions(priority);

-- Analyst Performance Expectations Table
CREATE TABLE IF NOT EXISTS analyst_performance_expectations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    analyst_id UUID REFERENCES analyst_profiles(id) ON DELETE CASCADE,
    metric TEXT NOT NULL,
    period TEXT NOT NULL,
    analyst_estimate DECIMAL(15,4) NOT NULL,
    company_guidance DECIMAL(15,4),
    consensus_estimate DECIMAL(15,4),
    actual_result DECIMAL(15,4),
    variance DECIMAL(15,4),
    confidence_level INTEGER NOT NULL DEFAULT 100 CHECK (confidence_level >= 0 AND confidence_level <= 100),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for analyst_performance_expectations
CREATE INDEX IF NOT EXISTS idx_analyst_expectations_organization_id ON analyst_performance_expectations(organization_id);
CREATE INDEX IF NOT EXISTS idx_analyst_expectations_analyst_id ON analyst_performance_expectations(analyst_id);
CREATE INDEX IF NOT EXISTS idx_analyst_expectations_metric ON analyst_performance_expectations(metric);
CREATE INDEX IF NOT EXISTS idx_analyst_expectations_period ON analyst_performance_expectations(period);

-- Analyst Market Sentiment Table
CREATE TABLE IF NOT EXISTS analyst_market_sentiment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    source TEXT NOT NULL CHECK (source IN ('analyst_note', 'rating_change', 'price_target', 'earnings_estimate')),
    analyst_id UUID NOT NULL REFERENCES analyst_profiles(id) ON DELETE CASCADE,
    sentiment TEXT NOT NULL CHECK (sentiment IN ('very_positive', 'positive', 'neutral', 'negative', 'very_negative')),
    impact_score INTEGER NOT NULL CHECK (impact_score >= 0 AND impact_score <= 100),
    content_summary TEXT NOT NULL,
    key_factors TEXT[] DEFAULT '{}',
    price_impact DECIMAL(10,4),
    publication_date TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for analyst_market_sentiment
CREATE INDEX IF NOT EXISTS idx_analyst_sentiment_organization_id ON analyst_market_sentiment(organization_id);
CREATE INDEX IF NOT EXISTS idx_analyst_sentiment_analyst_id ON analyst_market_sentiment(analyst_id);
CREATE INDEX IF NOT EXISTS idx_analyst_sentiment_source ON analyst_market_sentiment(source);
CREATE INDEX IF NOT EXISTS idx_analyst_sentiment_publication_date ON analyst_market_sentiment(publication_date);

-- Analyst Follow-up Actions Table
CREATE TABLE IF NOT EXISTS analyst_follow_up_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    session_id UUID REFERENCES analyst_briefing_sessions(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    assigned_to TEXT NOT NULL,
    due_date TIMESTAMPTZ NOT NULL,
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'overdue')),
    completion_notes TEXT,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for analyst_follow_up_actions
CREATE INDEX IF NOT EXISTS idx_analyst_follow_up_organization_id ON analyst_follow_up_actions(organization_id);
CREATE INDEX IF NOT EXISTS idx_analyst_follow_up_session_id ON analyst_follow_up_actions(session_id);
CREATE INDEX IF NOT EXISTS idx_analyst_follow_up_status ON analyst_follow_up_actions(status);
CREATE INDEX IF NOT EXISTS idx_analyst_follow_up_due_date ON analyst_follow_up_actions(due_date);

-- Analyst Invitations Table
CREATE TABLE IF NOT EXISTS analyst_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES analyst_briefing_sessions(id) ON DELETE CASCADE,
    analyst_id UUID NOT NULL REFERENCES analyst_profiles(id) ON DELETE CASCADE,
    invitation_status TEXT NOT NULL DEFAULT 'sent' CHECK (invitation_status IN ('sent', 'accepted', 'declined', 'no_response')),
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    responded_at TIMESTAMPTZ,
    response_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for analyst_invitations
CREATE INDEX IF NOT EXISTS idx_analyst_invitations_organization_id ON analyst_invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_analyst_invitations_session_id ON analyst_invitations(session_id);
CREATE INDEX IF NOT EXISTS idx_analyst_invitations_analyst_id ON analyst_invitations(analyst_id);
CREATE INDEX IF NOT EXISTS idx_analyst_invitations_status ON analyst_invitations(invitation_status);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE stakeholder_investors ENABLE ROW LEVEL SECURITY;
ALTER TABLE stakeholder_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE stakeholder_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE stakeholder_esg_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE stakeholder_sentiment_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE stakeholder_communication_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE stakeholder_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE stakeholder_engagement_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE stakeholder_regulatory_disclosures ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyst_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyst_briefing_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyst_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyst_performance_expectations ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyst_market_sentiment ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyst_follow_up_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyst_invitations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for organization-based access
-- Users can only access data from their organization

-- Stakeholder Investors Policies
CREATE POLICY stakeholder_investors_org_policy ON stakeholder_investors
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

-- Stakeholder Votes Policies
CREATE POLICY stakeholder_votes_org_policy ON stakeholder_votes
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

-- ESG Metrics Policies
CREATE POLICY stakeholder_esg_metrics_org_policy ON stakeholder_esg_metrics
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

-- Sentiment Analysis Policies
CREATE POLICY stakeholder_sentiment_org_policy ON stakeholder_sentiment_analysis
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

-- Communication Templates Policies
CREATE POLICY stakeholder_templates_org_policy ON stakeholder_communication_templates
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

-- Analyst Profiles Policies
CREATE POLICY analyst_profiles_org_policy ON analyst_profiles
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

-- Analyst Briefing Sessions Policies
CREATE POLICY analyst_sessions_org_policy ON analyst_briefing_sessions
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

-- Similar policies for all other tables
CREATE POLICY stakeholder_proposals_org_policy ON stakeholder_proposals FOR ALL USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND status = 'active'));
CREATE POLICY stakeholder_communications_org_policy ON stakeholder_communications FOR ALL USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND status = 'active'));
CREATE POLICY stakeholder_logs_org_policy ON stakeholder_engagement_logs FOR ALL USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND status = 'active'));
CREATE POLICY stakeholder_disclosures_org_policy ON stakeholder_regulatory_disclosures FOR ALL USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND status = 'active'));
CREATE POLICY analyst_questions_org_policy ON analyst_questions FOR ALL USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND status = 'active'));
CREATE POLICY analyst_expectations_org_policy ON analyst_performance_expectations FOR ALL USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND status = 'active'));
CREATE POLICY analyst_sentiment_org_policy ON analyst_market_sentiment FOR ALL USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND status = 'active'));
CREATE POLICY analyst_follow_up_org_policy ON analyst_follow_up_actions FOR ALL USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND status = 'active'));
CREATE POLICY analyst_invitations_org_policy ON analyst_invitations FOR ALL USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND status = 'active'));

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at columns
CREATE TRIGGER update_stakeholder_investors_updated_at
    BEFORE UPDATE ON stakeholder_investors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_analyst_profiles_updated_at
    BEFORE UPDATE ON analyst_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_analyst_sessions_updated_at
    BEFORE UPDATE ON analyst_briefing_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate ESG composite score
CREATE OR REPLACE FUNCTION calculate_esg_composite_score(org_id UUID, period TEXT)
RETURNS DECIMAL AS $$
DECLARE
    environmental_score DECIMAL DEFAULT 0;
    social_score DECIMAL DEFAULT 0;
    governance_score DECIMAL DEFAULT 0;
    composite_score DECIMAL DEFAULT 0;
BEGIN
    -- Calculate average scores for each category
    SELECT COALESCE(AVG(value), 0) INTO environmental_score
    FROM stakeholder_esg_metrics
    WHERE organization_id = org_id 
    AND reporting_period = period 
    AND category = 'environmental';

    SELECT COALESCE(AVG(value), 0) INTO social_score
    FROM stakeholder_esg_metrics
    WHERE organization_id = org_id 
    AND reporting_period = period 
    AND category = 'social';

    SELECT COALESCE(AVG(value), 0) INTO governance_score
    FROM stakeholder_esg_metrics
    WHERE organization_id = org_id 
    AND reporting_period = period 
    AND category = 'governance';

    -- Calculate weighted composite (equal weights for demo)
    composite_score := (environmental_score + social_score + governance_score) / 3;

    RETURN composite_score;
END;
$$ LANGUAGE plpgsql;

-- Function to get sentiment trend
CREATE OR REPLACE FUNCTION get_sentiment_trend(org_id UUID, days INTEGER DEFAULT 30)
RETURNS TABLE(
    date_bucket DATE,
    avg_sentiment DECIMAL,
    sentiment_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        DATE(analyzed_at) as date_bucket,
        AVG(sentiment_score) as avg_sentiment,
        COUNT(*)::INTEGER as sentiment_count
    FROM stakeholder_sentiment_analysis
    WHERE organization_id = org_id 
    AND analyzed_at >= NOW() - INTERVAL '1 day' * days
    GROUP BY DATE(analyzed_at)
    ORDER BY date_bucket;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate voting results
CREATE OR REPLACE FUNCTION calculate_voting_results(prop_id UUID)
RETURNS TABLE(
    total_votes INTEGER,
    votes_for INTEGER,
    votes_against INTEGER,
    abstentions INTEGER,
    total_shares DECIMAL,
    shares_for DECIMAL,
    shares_against DECIMAL,
    shares_abstained DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_votes,
        COUNT(CASE WHEN vote_type = 'for' THEN 1 END)::INTEGER as votes_for,
        COUNT(CASE WHEN vote_type = 'against' THEN 1 END)::INTEGER as votes_against,
        COUNT(CASE WHEN vote_type = 'abstain' THEN 1 END)::INTEGER as abstentions,
        COALESCE(SUM(shares_voted), 0) as total_shares,
        COALESCE(SUM(CASE WHEN vote_type = 'for' THEN shares_voted ELSE 0 END), 0) as shares_for,
        COALESCE(SUM(CASE WHEN vote_type = 'against' THEN shares_voted ELSE 0 END), 0) as shares_against,
        COALESCE(SUM(CASE WHEN vote_type = 'abstain' THEN shares_voted ELSE 0 END), 0) as shares_abstained
    FROM stakeholder_votes
    WHERE proposal_id = prop_id
    AND verification_status = 'verified';
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SAMPLE DATA FOR TESTING
-- ============================================================================

-- Insert sample stakeholder investors (only if organizations exist)
INSERT INTO stakeholder_investors (
    organization_id, name, email, type, investment_amount, 
    shareholding_percentage, access_level, status
)
SELECT 
    o.id,
    'Institutional Investor ' || generate_series,
    'investor' || generate_series || '@example.com',
    CASE generate_series % 3 
        WHEN 0 THEN 'institutional'
        WHEN 1 THEN 'individual'
        ELSE 'strategic'
    END,
    (random() * 10000000)::decimal(15,2),
    (random() * 20)::decimal(5,2),
    CASE generate_series % 3 
        WHEN 0 THEN 'basic'
        WHEN 1 THEN 'premium'
        ELSE 'vip'
    END,
    'active'
FROM organizations o
CROSS JOIN generate_series(1, 5)
WHERE o.id IN (SELECT id FROM organizations LIMIT 3)
ON CONFLICT DO NOTHING;

-- Insert sample analyst profiles (only if organizations exist)
INSERT INTO analyst_profiles (
    organization_id, name, firm, email, specialization, 
    coverage_sectors, rating, influence_score
)
SELECT 
    o.id,
    'Analyst ' || generate_series,
    'Research Firm ' || (generate_series % 3 + 1),
    'analyst' || generate_series || '@researchfirm.com',
    ARRAY['financial_analysis', 'market_research'],
    ARRAY['technology', 'healthcare'],
    CASE generate_series % 4
        WHEN 0 THEN 'buy'
        WHEN 1 THEN 'hold' 
        WHEN 2 THEN 'sell'
        ELSE 'neutral'
    END,
    (random() * 50 + 50)::integer
FROM organizations o
CROSS JOIN generate_series(1, 3)
WHERE o.id IN (SELECT id FROM organizations LIMIT 3)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant permissions to authenticated users
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Grant permissions to service role
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE stakeholder_investors IS 'Comprehensive investor profiles with access levels and engagement tracking';
COMMENT ON TABLE stakeholder_votes IS 'Digital voting system for shareholder proposals with audit trails';
COMMENT ON TABLE stakeholder_esg_metrics IS 'ESG metrics tracking with benchmarking and verification status';
COMMENT ON TABLE stakeholder_sentiment_analysis IS 'AI-powered sentiment analysis from various stakeholder sources';
COMMENT ON TABLE stakeholder_communication_templates IS 'Template management for multi-channel stakeholder communications';
COMMENT ON TABLE analyst_profiles IS 'Detailed analyst profiles with relationship and influence tracking';
COMMENT ON TABLE analyst_briefing_sessions IS 'Comprehensive briefing session management with Q&A and follow-ups';

COMMENT ON FUNCTION calculate_esg_composite_score IS 'Calculates weighted ESG composite score for reporting period';
COMMENT ON FUNCTION get_sentiment_trend IS 'Returns daily sentiment trends for specified time period';
COMMENT ON FUNCTION calculate_voting_results IS 'Calculates comprehensive voting results for proposals';

-- Migration completed successfully
SELECT 'Stakeholder Engagement Portal System migration completed successfully' as result;