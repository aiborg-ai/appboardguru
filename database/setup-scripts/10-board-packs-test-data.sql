-- =====================================================
-- BOARD PACKS TEST DATA
-- Script 10: Populate board_packs table with realistic test data
-- Run this in Supabase SQL Editor after running scripts 01-04
-- =====================================================

-- =====================================================
-- 1. VERIFY PREREQUISITES
-- =====================================================

DO $$
DECLARE
    test_user_id UUID;
    test_org_id UUID;
    admin_user_id UUID;
    member_user_id UUID;
BEGIN
    -- Get test users
    SELECT id INTO test_user_id FROM users WHERE email = 'test.director@appboardguru.com';
    SELECT id INTO admin_user_id FROM users WHERE email = 'admin.user@appboardguru.com';
    SELECT id INTO member_user_id FROM users WHERE email = 'board.member@appboardguru.com';
    
    -- Get test organization
    SELECT id INTO test_org_id FROM organizations WHERE slug = 'test-board-org';
    
    IF test_user_id IS NULL THEN
        RAISE EXCEPTION 'Test user not found. Please run script 02 first.';
    END IF;
    
    IF test_org_id IS NULL THEN
        RAISE EXCEPTION 'Test organization not found. Please run script 02 first.';
    END IF;
    
    RAISE NOTICE 'Prerequisites verified: user %, org %', test_user_id, test_org_id;
END $$;

-- =====================================================
-- 2. CLEAR EXISTING TEST DATA (OPTIONAL)
-- =====================================================

-- Clear existing test board packs to avoid duplicates
DELETE FROM board_packs 
WHERE uploaded_by IN (
    SELECT id FROM users 
    WHERE email IN ('test.director@appboardguru.com', 'admin.user@appboardguru.com', 'board.member@appboardguru.com')
);

-- =====================================================
-- 3. CREATE BOARD PACKS TEST DATA
-- =====================================================

-- Insert realistic board pack data
INSERT INTO board_packs (
    id,
    uploaded_by,
    organization_id,
    title,
    description,
    file_name,
    file_path,
    file_size,
    file_type,
    category,
    tags,
    folder_path,
    status,
    watermark_applied,
    summary,
    key_points,
    insights,
    created_at,
    updated_at
)
SELECT 
    gen_random_uuid(),
    uploader.user_id,
    org.id,
    pack.title,
    pack.description,
    pack.file_name,
    pack.file_path,
    pack.file_size,
    pack.file_type,
    pack.category,
    pack.tags,
    pack.folder_path,
    'ready'::text,
    true,
    pack.summary,
    pack.key_points,
    pack.insights,
    pack.created_at,
    pack.created_at
FROM 
    (SELECT id FROM organizations WHERE slug = 'test-board-org') org,
    (VALUES 
        ((SELECT id FROM users WHERE email = 'test.director@appboardguru.com')),
        ((SELECT id FROM users WHERE email = 'admin.user@appboardguru.com')),
        ((SELECT id FROM users WHERE email = 'board.member@appboardguru.com'))
    ) uploader(user_id),
    (VALUES
        -- Q4 2024 Board Meeting Materials
        (
            'Q4 2024 Board Meeting Package',
            'Complete board meeting materials including financial reports, strategic updates, and committee reports for Q4 2024',
            'Q4_2024_Board_Package.pdf',
            '/board-packs/2024/q4/board_package_complete.pdf',
            8750000, -- 8.75 MB
            'application/pdf',
            'board_meetings',
            ARRAY['q4-2024', 'board-meeting', 'financial', 'strategic'],
            '/2024/Q4',
            'This comprehensive board package covers Q4 2024 performance with revenue growth of 18% YoY, EBITDA margin improvement to 24%, and successful completion of three strategic acquisitions.',
            ARRAY['Revenue exceeded targets by 12%', 'Customer retention at all-time high of 96%', 'Successfully launched in 3 new markets'],
            JSONB '{"financial_health": "strong", "risk_level": "moderate", "recommendation": "proceed with 2025 expansion plan"}',
            NOW() - INTERVAL '5 days'
        ),
        
        -- Financial Statements
        (
            'Q4 2024 Financial Statements - Audited',
            'Audited financial statements including balance sheet, income statement, cash flow, and notes to financials',
            'Q4_2024_Audited_Financials.xlsx',
            '/board-packs/2024/q4/audited_financials.xlsx',
            3250000, -- 3.25 MB
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'financial_reports',
            ARRAY['financial', 'audited', 'q4-2024', 'statements'],
            '/2024/Q4/Financials',
            'Audited financial statements showing strong performance with total revenue of $125M, net income of $22M, and healthy cash position of $45M.',
            ARRAY['Clean audit opinion received', 'No material weaknesses identified', 'Strong working capital position'],
            JSONB '{"audit_status": "clean", "going_concern": "no_issues", "material_changes": "none"}',
            NOW() - INTERVAL '7 days'
        ),
        
        -- Strategic Plan 2025
        (
            'Strategic Plan 2025 - Board Review Draft',
            'Comprehensive strategic planning document for 2025 including market analysis, growth initiatives, and resource allocation',
            'Strategic_Plan_2025_Draft.pdf',
            '/board-packs/strategic/2025_strategic_plan.pdf',
            5600000, -- 5.6 MB
            'application/pdf',
            'strategic_planning',
            ARRAY['strategy', '2025', 'planning', 'growth'],
            '/Strategic',
            'Strategic plan targeting 25% revenue growth through market expansion, product innovation, and strategic partnerships. Key focus on digital transformation and ESG initiatives.',
            ARRAY['Target 25% revenue growth', 'Enter 5 new geographic markets', 'Launch 3 new product lines', 'Achieve carbon neutrality by Q3'],
            JSONB '{"growth_target": "25%", "investment_required": "$15M", "roi_projection": "3.2x", "risk_assessment": "moderate"}',
            NOW() - INTERVAL '3 days'
        ),
        
        -- Risk Assessment Report
        (
            'Enterprise Risk Assessment Q4 2024',
            'Comprehensive risk assessment covering operational, financial, regulatory, and cybersecurity risks',
            'Risk_Assessment_Q4_2024.pdf',
            '/board-packs/2024/q4/risk_assessment.pdf',
            2100000, -- 2.1 MB
            'application/pdf',
            'risk_compliance',
            ARRAY['risk', 'compliance', 'assessment', 'q4-2024'],
            '/2024/Q4/Risk',
            'Risk assessment identifies 12 key risk areas with mitigation strategies. Cybersecurity and supply chain risks elevated to high priority.',
            ARRAY['Cybersecurity risk elevated to high', 'Supply chain diversification needed', 'Regulatory compliance strong'],
            JSONB '{"high_risks": 3, "medium_risks": 5, "low_risks": 4, "mitigation_status": "in_progress"}',
            NOW() - INTERVAL '6 days'
        ),
        
        -- Compensation Committee Report
        (
            'Compensation Committee Report - Executive Review',
            'Annual executive compensation review and recommendations for 2025 compensation packages',
            'Comp_Committee_Report_2024.docx',
            '/board-packs/committees/compensation_report.docx',
            1850000, -- 1.85 MB
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'committee_reports',
            ARRAY['compensation', 'committee', 'executive', 'salary'],
            '/Committees/Compensation',
            'Compensation committee recommends 3% base salary increase for executives, enhanced long-term incentive plan, and revised performance metrics.',
            ARRAY['3% base salary increase', 'New LTIP structure approved', 'ESG metrics added to bonus calculation'],
            JSONB '{"total_comp_increase": "5.2%", "ltip_value": "$8M", "retention_risk": "low"}',
            NOW() - INTERVAL '4 days'
        ),
        
        -- Audit Committee Minutes
        (
            'Audit Committee Meeting Minutes - December 2024',
            'Minutes from the December audit committee meeting covering financial controls, audit findings, and compliance updates',
            'Audit_Committee_Minutes_Dec_2024.pdf',
            '/board-packs/committees/audit_minutes_dec.pdf',
            980000, -- 0.98 MB
            'application/pdf',
            'meeting_minutes',
            ARRAY['audit', 'committee', 'minutes', 'december-2024'],
            '/Committees/Audit/Minutes',
            'Audit committee reviewed Q4 financials, approved 2025 audit plan, and discussed implementation of new accounting standards.',
            ARRAY['Q4 financials approved', '2025 audit plan accepted', 'New revenue recognition standard implemented'],
            JSONB '{"items_discussed": 8, "actions_required": 3, "follow_up_needed": true}',
            NOW() - INTERVAL '8 days'
        ),
        
        -- M&A Analysis
        (
            'M&A Pipeline Analysis - Confidential',
            'Analysis of potential acquisition targets and strategic partnership opportunities',
            'MA_Pipeline_Analysis_Q4.pptx',
            '/board-packs/strategic/ma_pipeline.pptx',
            4200000, -- 4.2 MB
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'strategic_planning',
            ARRAY['m&a', 'acquisition', 'confidential', 'strategic'],
            '/Strategic/M&A',
            'Analysis of 5 potential acquisition targets with combined valuation of $200M. Two targets in due diligence phase.',
            ARRAY['5 targets identified', '2 in due diligence', 'Total investment capacity $250M'],
            JSONB '{"targets_count": 5, "total_valuation": "$200M", "preferred_target": "Company A", "timeline": "Q2 2025"}',
            NOW() - INTERVAL '2 days'
        ),
        
        -- ESG Report
        (
            'Environmental, Social & Governance Report 2024',
            'Annual ESG report covering sustainability initiatives, social impact, and governance improvements',
            'ESG_Report_2024.pdf',
            '/board-packs/esg/annual_report_2024.pdf',
            6500000, -- 6.5 MB
            'application/pdf',
            'esg_sustainability',
            ARRAY['esg', 'sustainability', 'governance', '2024'],
            '/ESG',
            'ESG report shows 22% reduction in carbon emissions, 40% increase in diversity hiring, and improved governance scores.',
            ARRAY['Carbon emissions down 22%', 'Diversity increased to 45%', 'Governance score improved to A+'],
            JSONB '{"carbon_reduction": "22%", "diversity_score": "B+", "governance_score": "A+", "overall_rating": "AA"}',
            NOW() - INTERVAL '10 days'
        ),
        
        -- Cybersecurity Update
        (
            'Cybersecurity Posture Assessment Q4 2024',
            'Quarterly cybersecurity assessment including threat landscape, incident response, and security investments',
            'Cybersecurity_Assessment_Q4.pdf',
            '/board-packs/it/cybersecurity_q4.pdf',
            1750000, -- 1.75 MB
            'application/pdf',
            'technology_it',
            ARRAY['cybersecurity', 'security', 'it', 'risk'],
            '/IT/Security',
            'No major security incidents in Q4. Successfully defended against 3 targeted attacks. Security maturity score improved to 4.2/5.',
            ARRAY['Zero breaches in Q4', 'Security score 4.2/5', '99.9% system uptime maintained'],
            JSONB '{"incidents_count": 0, "attacks_defended": 3, "maturity_score": 4.2, "investment_needed": "$2M"}',
            NOW() - INTERVAL '5 days'
        ),
        
        -- Legal Update
        (
            'Legal & Regulatory Update Q4 2024',
            'Quarterly legal update covering litigation status, regulatory changes, and compliance matters',
            'Legal_Update_Q4_2024.docx',
            '/board-packs/legal/quarterly_update.docx',
            1450000, -- 1.45 MB
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'legal_regulatory',
            ARRAY['legal', 'regulatory', 'compliance', 'q4-2024'],
            '/Legal',
            'No material litigation pending. Successfully resolved 2 minor disputes. New data privacy regulations require attention.',
            ARRAY['No material litigation', '100% regulatory compliance', 'GDPR audit passed'],
            JSONB '{"litigation_count": 0, "compliance_score": "100%", "regulatory_changes": 3}',
            NOW() - INTERVAL '7 days'
        ),
        
        -- HR Dashboard
        (
            'Human Resources Dashboard Q4 2024',
            'Comprehensive HR metrics including headcount, retention, engagement scores, and talent pipeline',
            'HR_Dashboard_Q4_2024.xlsx',
            '/board-packs/hr/dashboard_q4.xlsx',
            2300000, -- 2.3 MB
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'human_resources',
            ARRAY['hr', 'human-resources', 'retention', 'engagement'],
            '/HR',
            'Employee count at 1,250 with 92% retention rate. Engagement score improved to 4.3/5. Strong talent pipeline with 50 open positions.',
            ARRAY['92% retention rate', 'Engagement score 4.3/5', '50 positions open'],
            JSONB '{"headcount": 1250, "retention_rate": "92%", "engagement_score": 4.3, "open_positions": 50}',
            NOW() - INTERVAL '6 days'
        ),
        
        -- Customer Success Report
        (
            'Customer Success Metrics Q4 2024',
            'Customer satisfaction scores, NPS trends, churn analysis, and customer success initiatives',
            'Customer_Success_Q4_2024.pptx',
            '/board-packs/customer/success_metrics.pptx',
            3100000, -- 3.1 MB
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'customer_relations',
            ARRAY['customer', 'nps', 'satisfaction', 'retention'],
            '/Customer',
            'NPS score reached all-time high of 72. Customer retention at 96%. Churn reduced by 15% YoY.',
            ARRAY['NPS score 72', 'Retention 96%', 'Churn down 15%'],
            JSONB '{"nps_score": 72, "retention_rate": "96%", "churn_reduction": "15%", "csat_score": 4.6}',
            NOW() - INTERVAL '4 days'
        ),
        
        -- Product Roadmap
        (
            'Product Roadmap 2025 - Board Presentation',
            'Product development roadmap for 2025 including new features, platform improvements, and innovation initiatives',
            'Product_Roadmap_2025.pdf',
            '/board-packs/product/roadmap_2025.pdf',
            4800000, -- 4.8 MB
            'application/pdf',
            'product_development',
            ARRAY['product', 'roadmap', '2025', 'innovation'],
            '/Product',
            '2025 roadmap includes 3 major product launches, AI integration, and platform modernization. Expected to drive 30% feature adoption.',
            ARRAY['3 new products planned', 'AI features in Q2', 'Platform modernization Q3'],
            JSONB '{"new_products": 3, "ai_features": 12, "modernization_complete": "Q3", "expected_adoption": "30%"}',
            NOW() - INTERVAL '3 days'
        ),
        
        -- Board Resolution Draft
        (
            'Board Resolutions - Q4 2024 Meeting',
            'Draft resolutions for board approval including dividend declaration, executive appointments, and policy changes',
            'Board_Resolutions_Q4_2024.docx',
            '/board-packs/governance/resolutions_q4.docx',
            890000, -- 0.89 MB
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'board_governance',
            ARRAY['resolutions', 'governance', 'board', 'approval'],
            '/Governance',
            'Five resolutions for approval: dividend declaration, CFO appointment, audit firm selection, share buyback program, and policy updates.',
            ARRAY['Dividend $0.50/share', 'New CFO appointment', 'Share buyback $50M'],
            JSONB '{"resolutions_count": 5, "dividend_amount": "$0.50", "buyback_amount": "$50M"}',
            NOW() - INTERVAL '1 day'
        ),
        
        -- Investor Relations Update
        (
            'Investor Relations Update - December 2024',
            'Monthly investor relations update including shareholder composition, analyst coverage, and IR activities',
            'IR_Update_Dec_2024.pdf',
            '/board-packs/investor/ir_update_dec.pdf',
            2650000, -- 2.65 MB
            'application/pdf',
            'investor_relations',
            ARRAY['investor', 'shareholder', 'analyst', 'ir'],
            '/Investor',
            'Institutional ownership at 68%. 12 analysts covering with average price target of $85. Successful investor day with 200+ attendees.',
            ARRAY['68% institutional ownership', '12 analyst coverage', 'Price target $85'],
            JSONB '{"institutional_ownership": "68%", "analyst_count": 12, "price_target": 85, "investor_day_attendance": 200}',
            NOW() - INTERVAL '9 days'
        )
    ) AS pack(title, description, file_name, file_path, file_size, file_type, category, tags, folder_path, summary, key_points, insights, created_at)
WHERE 
    -- Create one board pack per user for first 5 packs, then assign remaining to test.director
    (pack.title = 'Q4 2024 Board Meeting Package' AND uploader.user_id = (SELECT id FROM users WHERE email = 'test.director@appboardguru.com'))
    OR (pack.title = 'Q4 2024 Financial Statements - Audited' AND uploader.user_id = (SELECT id FROM users WHERE email = 'admin.user@appboardguru.com'))
    OR (pack.title = 'Strategic Plan 2025 - Board Review Draft' AND uploader.user_id = (SELECT id FROM users WHERE email = 'board.member@appboardguru.com'))
    OR (pack.title = 'Enterprise Risk Assessment Q4 2024' AND uploader.user_id = (SELECT id FROM users WHERE email = 'test.director@appboardguru.com'))
    OR (pack.title = 'Compensation Committee Report - Executive Review' AND uploader.user_id = (SELECT id FROM users WHERE email = 'admin.user@appboardguru.com'))
    OR (pack.title NOT IN (
        'Q4 2024 Board Meeting Package',
        'Q4 2024 Financial Statements - Audited', 
        'Strategic Plan 2025 - Board Review Draft',
        'Enterprise Risk Assessment Q4 2024',
        'Compensation Committee Report - Executive Review'
    ) AND uploader.user_id = (SELECT id FROM users WHERE email = 'test.director@appboardguru.com'));

-- =====================================================
-- 4. VERIFY DATA CREATION
-- =====================================================

DO $$
DECLARE
    pack_count INTEGER;
    test_user_count INTEGER;
    admin_user_count INTEGER;
    member_user_count INTEGER;
BEGIN
    -- Count total board packs created
    SELECT COUNT(*) INTO pack_count FROM board_packs 
    WHERE organization_id = (SELECT id FROM organizations WHERE slug = 'test-board-org');
    
    -- Count packs by user
    SELECT COUNT(*) INTO test_user_count FROM board_packs 
    WHERE uploaded_by = (SELECT id FROM users WHERE email = 'test.director@appboardguru.com');
    
    SELECT COUNT(*) INTO admin_user_count FROM board_packs 
    WHERE uploaded_by = (SELECT id FROM users WHERE email = 'admin.user@appboardguru.com');
    
    SELECT COUNT(*) INTO member_user_count FROM board_packs 
    WHERE uploaded_by = (SELECT id FROM users WHERE email = 'board.member@appboardguru.com');
    
    RAISE NOTICE 'Board packs created successfully!';
    RAISE NOTICE 'Total packs: %', pack_count;
    RAISE NOTICE 'Test Director packs: %', test_user_count;
    RAISE NOTICE 'Admin User packs: %', admin_user_count;
    RAISE NOTICE 'Board Member packs: %', member_user_count;
    
    IF pack_count < 15 THEN
        RAISE WARNING 'Expected 15 board packs but only % were created', pack_count;
    END IF;
END $$;

-- =====================================================
-- 5. GRANT PERMISSIONS (if needed)
-- =====================================================

-- Ensure RLS policies allow users to access board_packs
-- The existing RLS policies should work, but we can verify

-- Display summary
SELECT 
    'Board Packs Test Data Setup Complete' as status,
    COUNT(*) as total_packs,
    COUNT(DISTINCT uploaded_by) as unique_uploaders,
    COUNT(DISTINCT category) as categories,
    AVG(file_size) as avg_file_size,
    MIN(created_at) as oldest_pack,
    MAX(created_at) as newest_pack
FROM board_packs
WHERE organization_id = (SELECT id FROM organizations WHERE slug = 'test-board-org');

-- Show sample of created data
SELECT 
    title,
    file_name,
    file_type,
    category,
    pg_size_pretty(file_size::bigint) as file_size_formatted,
    created_at
FROM board_packs
WHERE organization_id = (SELECT id FROM organizations WHERE slug = 'test-board-org')
ORDER BY created_at DESC
LIMIT 5;