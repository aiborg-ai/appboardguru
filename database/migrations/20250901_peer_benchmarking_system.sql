-- ============================================================================
-- PEER BENCHMARKING INTELLIGENCE SYSTEM
-- Premium board governance benchmarking and comparative analytics
-- ============================================================================

-- Peer organizations registry
CREATE TABLE IF NOT EXISTS peer_organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    peer_organization_id UUID NOT NULL,
    peer_name VARCHAR(255) NOT NULL,
    peer_ticker VARCHAR(10),
    peer_industry VARCHAR(100),
    peer_sub_industry VARCHAR(100),
    peer_country VARCHAR(100),
    peer_region VARCHAR(100),
    
    -- Peer characteristics for matching
    market_cap_usd DECIMAL(20,2),
    revenue_usd DECIMAL(20,2),
    employee_count INTEGER,
    complexity_score DECIMAL(5,2), -- 0-100 scale
    
    -- Peer relevance and quality
    relevance_score DECIMAL(5,2) DEFAULT 0, -- 0-100, AI-calculated
    data_quality_score DECIMAL(5,2) DEFAULT 0, -- 0-100
    last_data_update TIMESTAMP WITH TIME ZONE,
    
    -- Peer relationship metadata
    relationship_type VARCHAR(50) DEFAULT 'competitor', -- 'competitor', 'industry_peer', 'size_peer', 'custom'
    is_primary_peer BOOLEAN DEFAULT false,
    is_aspirational_peer BOOLEAN DEFAULT false,
    added_by UUID REFERENCES auth.users(id),
    added_reason TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(organization_id, peer_organization_id)
);

-- Custom peer groups for targeted comparison
CREATE TABLE IF NOT EXISTS peer_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Group metadata
    group_name VARCHAR(255) NOT NULL,
    group_description TEXT,
    group_type VARCHAR(50) NOT NULL DEFAULT 'custom', -- 'industry', 'size', 'geographic', 'custom', 'ai_suggested'
    
    -- Group configuration
    selection_criteria JSONB DEFAULT '{}', -- Criteria used for peer selection
    min_peers INTEGER DEFAULT 5,
    max_peers INTEGER DEFAULT 20,
    auto_update BOOLEAN DEFAULT false, -- Automatically update based on criteria
    
    -- Group quality
    group_quality_score DECIMAL(5,2), -- Overall quality of peer group
    last_refreshed TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    created_by UUID NOT NULL REFERENCES auth.users(id),
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(organization_id, group_name)
);

-- Peer group members
CREATE TABLE IF NOT EXISTS peer_group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    peer_group_id UUID NOT NULL REFERENCES peer_groups(id) ON DELETE CASCADE,
    peer_organization_id UUID NOT NULL REFERENCES peer_organizations(id) ON DELETE CASCADE,
    
    -- Member metadata
    inclusion_reason TEXT,
    relevance_score DECIMAL(5,2),
    weight DECIMAL(5,4) DEFAULT 1.0, -- Weight in group calculations
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(peer_group_id, peer_organization_id)
);

-- Benchmarking metrics repository
CREATE TABLE IF NOT EXISTS benchmarking_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    peer_organization_id UUID REFERENCES peer_organizations(id),
    
    -- Metric identification
    metric_category VARCHAR(100) NOT NULL, -- 'governance', 'compensation', 'esg', 'financial', 'operational', 'board'
    metric_subcategory VARCHAR(100),
    metric_name VARCHAR(255) NOT NULL,
    metric_code VARCHAR(100), -- Standardized code for the metric
    
    -- Metric values
    metric_value DECIMAL(20,4),
    metric_value_text TEXT, -- For non-numeric metrics
    metric_unit VARCHAR(50), -- 'percentage', 'usd', 'days', 'score', etc.
    
    -- Comparative analysis
    percentile_rank DECIMAL(5,2), -- Position in peer group (0-100)
    quartile INTEGER CHECK (quartile IN (1,2,3,4)),
    deviation_from_median DECIMAL(10,2), -- Percentage deviation
    z_score DECIMAL(10,4), -- Statistical z-score
    
    -- Time period
    period_type VARCHAR(50) NOT NULL DEFAULT 'annual', -- 'daily', 'monthly', 'quarterly', 'annual', 'ltm'
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- Data quality
    data_source VARCHAR(255),
    confidence_level DECIMAL(5,2) DEFAULT 100, -- 0-100
    is_estimated BOOLEAN DEFAULT false,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    INDEX idx_benchmarking_metrics_lookup (organization_id, metric_category, period_end),
    INDEX idx_benchmarking_metrics_peer (peer_organization_id, metric_category)
);

-- Executive compensation benchmarking
CREATE TABLE IF NOT EXISTS compensation_benchmarking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    peer_organization_id UUID REFERENCES peer_organizations(id),
    
    -- Position and person
    position_title VARCHAR(255) NOT NULL, -- 'CEO', 'CFO', 'Board Chair', etc.
    executive_name VARCHAR(255),
    
    -- Compensation components (all in USD)
    base_salary DECIMAL(15,2),
    cash_bonus DECIMAL(15,2),
    stock_awards DECIMAL(15,2),
    option_awards DECIMAL(15,2),
    non_equity_incentive DECIMAL(15,2),
    pension_value DECIMAL(15,2),
    other_compensation DECIMAL(15,2),
    total_compensation DECIMAL(15,2),
    
    -- Performance metrics
    tsr_alignment_score DECIMAL(5,2), -- Total shareholder return alignment
    pay_ratio DECIMAL(10,2), -- CEO pay ratio
    
    -- ESG-linked compensation
    esg_linked_percentage DECIMAL(5,2),
    esg_metrics_achieved DECIMAL(5,2),
    
    -- Peer comparison
    percentile_base_salary DECIMAL(5,2),
    percentile_total_comp DECIMAL(5,2),
    percentile_pay_ratio DECIMAL(5,2),
    
    -- Time period
    fiscal_year INTEGER NOT NULL,
    
    -- Data quality
    data_source VARCHAR(255),
    filing_date DATE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    INDEX idx_comp_benchmark_lookup (organization_id, position_title, fiscal_year),
    UNIQUE(organization_id, position_title, fiscal_year)
);

-- Board composition benchmarking
CREATE TABLE IF NOT EXISTS board_composition_benchmarking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    peer_organization_id UUID REFERENCES peer_organizations(id),
    
    -- Board size and structure
    board_size INTEGER,
    independent_directors INTEGER,
    non_independent_directors INTEGER,
    independence_percentage DECIMAL(5,2),
    
    -- Diversity metrics
    gender_diversity_percentage DECIMAL(5,2),
    ethnic_diversity_percentage DECIMAL(5,2),
    international_diversity_percentage DECIMAL(5,2),
    age_diversity_index DECIMAL(5,2), -- Calculated diversity score
    
    -- Expertise and tenure
    average_tenure_years DECIMAL(5,2),
    average_age DECIMAL(5,2),
    financial_experts_count INTEGER,
    industry_experts_count INTEGER,
    technology_experts_count INTEGER,
    
    -- Board leadership
    separate_chair_ceo BOOLEAN,
    lead_independent_director BOOLEAN,
    
    -- Committee structure
    audit_committee_size INTEGER,
    compensation_committee_size INTEGER,
    nominating_committee_size INTEGER,
    risk_committee_exists BOOLEAN,
    
    -- Board effectiveness
    meetings_per_year INTEGER,
    average_attendance_rate DECIMAL(5,2),
    director_education_hours DECIMAL(10,2),
    
    -- Overboarding
    average_other_boards DECIMAL(5,2),
    overboarded_directors INTEGER,
    
    -- Peer comparison
    percentile_independence DECIMAL(5,2),
    percentile_diversity DECIMAL(5,2),
    percentile_attendance DECIMAL(5,2),
    
    -- Time period
    as_of_date DATE NOT NULL,
    fiscal_year INTEGER,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(organization_id, as_of_date)
);

-- ESG performance benchmarking
CREATE TABLE IF NOT EXISTS esg_benchmarking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    peer_organization_id UUID REFERENCES peer_organizations(id),
    
    -- Overall ESG scores
    esg_total_score DECIMAL(5,2), -- 0-100
    environmental_score DECIMAL(5,2),
    social_score DECIMAL(5,2),
    governance_score DECIMAL(5,2),
    
    -- Environmental metrics
    carbon_intensity DECIMAL(15,4),
    renewable_energy_percentage DECIMAL(5,2),
    water_intensity DECIMAL(15,4),
    waste_recycling_percentage DECIMAL(5,2),
    
    -- Social metrics
    employee_satisfaction_score DECIMAL(5,2),
    safety_incident_rate DECIMAL(10,4),
    community_investment_percentage DECIMAL(5,2),
    supplier_diversity_percentage DECIMAL(5,2),
    
    -- Governance metrics (beyond board)
    ethics_violations_count INTEGER,
    data_breaches_count INTEGER,
    regulatory_fines_usd DECIMAL(15,2),
    
    -- Peer comparison
    percentile_esg_total DECIMAL(5,2),
    percentile_environmental DECIMAL(5,2),
    percentile_social DECIMAL(5,2),
    percentile_governance DECIMAL(5,2),
    
    -- Time period
    reporting_year INTEGER NOT NULL,
    reporting_period VARCHAR(50),
    
    -- Data quality
    data_provider VARCHAR(255),
    methodology_version VARCHAR(50),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(organization_id, reporting_year)
);

-- Industry benchmark standards
CREATE TABLE IF NOT EXISTS industry_benchmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Industry identification
    industry_code VARCHAR(50) NOT NULL,
    industry_name VARCHAR(255) NOT NULL,
    sub_industry_code VARCHAR(50),
    sub_industry_name VARCHAR(255),
    
    -- Metric identification
    metric_category VARCHAR(100) NOT NULL,
    metric_name VARCHAR(255) NOT NULL,
    metric_code VARCHAR(100),
    
    -- Benchmark values
    p10_value DECIMAL(20,4), -- 10th percentile
    p25_value DECIMAL(20,4), -- 25th percentile
    p50_value DECIMAL(20,4), -- 50th percentile (median)
    p75_value DECIMAL(20,4), -- 75th percentile
    p90_value DECIMAL(20,4), -- 90th percentile
    mean_value DECIMAL(20,4),
    std_deviation DECIMAL(20,4),
    
    -- Sample information
    sample_size INTEGER,
    data_coverage_percentage DECIMAL(5,2),
    
    -- Time period
    benchmark_year INTEGER NOT NULL,
    last_updated DATE NOT NULL,
    
    -- Metadata
    data_source VARCHAR(255),
    methodology_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(industry_code, metric_code, benchmark_year)
);

-- Benchmarking insights and recommendations
CREATE TABLE IF NOT EXISTS benchmarking_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Insight details
    insight_type VARCHAR(100) NOT NULL, -- 'gap', 'opportunity', 'risk', 'best_practice', 'trend'
    insight_category VARCHAR(100) NOT NULL,
    insight_title VARCHAR(500) NOT NULL,
    insight_description TEXT NOT NULL,
    
    -- Quantitative impact
    current_percentile DECIMAL(5,2),
    target_percentile DECIMAL(5,2),
    potential_improvement DECIMAL(10,2), -- Percentage or absolute
    
    -- Recommendations
    recommendations TEXT[],
    best_practice_examples TEXT[],
    implementation_complexity VARCHAR(50), -- 'low', 'medium', 'high'
    estimated_timeline_days INTEGER,
    
    -- Priority and status
    priority_score DECIMAL(5,2), -- 0-100, AI-calculated
    confidence_level DECIMAL(5,2), -- 0-100
    status VARCHAR(50) DEFAULT 'new', -- 'new', 'acknowledged', 'in_progress', 'completed', 'dismissed'
    
    -- User interaction
    acknowledged_by UUID REFERENCES auth.users(id),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    dismissed_reason TEXT,
    
    -- Metadata
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    INDEX idx_insights_priority (organization_id, priority_score DESC)
);

-- Create indexes for performance
CREATE INDEX idx_peer_orgs_lookup ON peer_organizations(organization_id, is_active);
CREATE INDEX idx_peer_orgs_matching ON peer_organizations(peer_industry, market_cap_usd, revenue_usd);
CREATE INDEX idx_benchmarking_metrics_category ON benchmarking_metrics(metric_category, metric_name, period_end);
CREATE INDEX idx_compensation_position ON compensation_benchmarking(position_title, fiscal_year);
CREATE INDEX idx_board_composition_date ON board_composition_benchmarking(as_of_date);
CREATE INDEX idx_esg_scores ON esg_benchmarking(esg_total_score, reporting_year);

-- Enable Row Level Security
ALTER TABLE peer_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE peer_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE peer_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE benchmarking_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE compensation_benchmarking ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_composition_benchmarking ENABLE ROW LEVEL SECURITY;
ALTER TABLE esg_benchmarking ENABLE ROW LEVEL SECURITY;
ALTER TABLE benchmarking_insights ENABLE ROW LEVEL SECURITY;

-- RLS Policies (organization members can view their benchmarking data)
CREATE POLICY "Organization members can view peer benchmarking"
ON peer_organizations FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_id = peer_organizations.organization_id
        AND user_id = auth.uid()
        AND status = 'active'
    )
);

-- Similar policies for other tables...