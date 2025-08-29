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
        RAISE NOTICE 'Test user not found. Will try to use any existing user.';
        SELECT id INTO test_user_id FROM users LIMIT 1;
    END IF;
    
    IF test_user_id IS NULL THEN
        RAISE EXCEPTION 'No users found in database. Please create a user first.';
    END IF;
    
    RAISE NOTICE 'Using user ID: %', test_user_id;
    
    IF test_org_id IS NOT NULL THEN
        RAISE NOTICE 'Found organization: %', test_org_id;
    END IF;
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
-- Note: The board_packs table has these columns:
-- id, title, description, file_path, file_name, file_size, file_type,
-- uploaded_by, status, summary, audio_summary_url, watermark_applied, 
-- created_at, updated_at

INSERT INTO board_packs (
    uploaded_by,
    title,
    description,
    file_name,
    file_path,
    file_size,
    file_type,
    status,
    watermark_applied,
    summary,
    created_at,
    updated_at
) VALUES
-- Q4 2024 Board Meeting Package
(
    COALESCE(
        (SELECT id FROM users WHERE email = 'test.director@appboardguru.com'),
        (SELECT id FROM users LIMIT 1)
    ),
    'Q4 2024 Board Meeting Package',
    'Complete board meeting materials including financial reports, strategic updates, and committee reports for Q4 2024',
    'Q4_2024_Board_Package.pdf',
    '/board-packs/2024/q4/board_package_complete.pdf',
    8750000,
    'application/pdf',
    'ready'::pack_status,
    true,
    'This comprehensive board package covers Q4 2024 performance with revenue growth of 18% YoY, EBITDA margin improvement to 24%, and successful completion of three strategic acquisitions. Key highlights include record customer retention at 96% and successful market expansion.',
    NOW() - INTERVAL '5 days',
    NOW() - INTERVAL '5 days'
),

-- Financial Statements
(
    COALESCE(
        (SELECT id FROM users WHERE email = 'test.director@appboardguru.com'),
        (SELECT id FROM users LIMIT 1)
    ),
    'Q4 2024 Financial Statements - Audited',
    'Audited financial statements including balance sheet, income statement, cash flow, and notes to financials',
    'Q4_2024_Audited_Financials.xlsx',
    '/board-packs/2024/q4/audited_financials.xlsx',
    3250000,
    'application/vnd.ms-excel',
    'ready'::pack_status,
    true,
    'Audited financial statements showing strong performance with total revenue of $125M, net income of $22M, and healthy cash position of $45M. Clean audit opinion with no material weaknesses identified.',
    NOW() - INTERVAL '7 days',
    NOW() - INTERVAL '7 days'
),

-- Strategic Plan 2025
(
    COALESCE(
        (SELECT id FROM users WHERE email = 'test.director@appboardguru.com'),
        (SELECT id FROM users LIMIT 1)
    ),
    'Strategic Plan 2025 - Board Review Draft',
    'Comprehensive strategic planning document for 2025 including market analysis, growth initiatives, and resource allocation',
    'Strategic_Plan_2025_Draft.pdf',
    '/board-packs/strategic/2025_strategic_plan.pdf',
    5600000,
    'application/pdf',
    'ready'::pack_status,
    true,
    'Strategic plan targeting 25% revenue growth through market expansion, product innovation, and strategic partnerships. Key focus areas include digital transformation, ESG initiatives, and entering 5 new geographic markets.',
    NOW() - INTERVAL '3 days',
    NOW() - INTERVAL '3 days'
),

-- Risk Assessment Report
(
    COALESCE(
        (SELECT id FROM users WHERE email = 'admin.user@appboardguru.com'),
        (SELECT id FROM users LIMIT 1)
    ),
    'Enterprise Risk Assessment Q4 2024',
    'Comprehensive risk assessment covering operational, financial, regulatory, and cybersecurity risks',
    'Risk_Assessment_Q4_2024.pdf',
    '/board-packs/2024/q4/risk_assessment.pdf',
    2100000,
    'application/pdf',
    'ready'::pack_status,
    true,
    'Risk assessment identifies 12 key risk areas with mitigation strategies. Cybersecurity and supply chain risks elevated to high priority. Regulatory compliance remains strong across all jurisdictions.',
    NOW() - INTERVAL '6 days',
    NOW() - INTERVAL '6 days'
),

-- Compensation Committee Report
(
    COALESCE(
        (SELECT id FROM users WHERE email = 'admin.user@appboardguru.com'),
        (SELECT id FROM users LIMIT 1)
    ),
    'Compensation Committee Report - Executive Review',
    'Annual executive compensation review and recommendations for 2025 compensation packages',
    'Comp_Committee_Report_2024.docx',
    '/board-packs/committees/compensation_report.docx',
    1850000,
    'application/vnd.ms-word',
    'ready'::pack_status,
    true,
    'Compensation committee recommends 3% base salary increase for executives, enhanced long-term incentive plan, and revised performance metrics including ESG targets.',
    NOW() - INTERVAL '4 days',
    NOW() - INTERVAL '4 days'
),

-- Audit Committee Minutes
(
    COALESCE(
        (SELECT id FROM users WHERE email = 'board.member@appboardguru.com'),
        (SELECT id FROM users LIMIT 1)
    ),
    'Audit Committee Meeting Minutes - December 2024',
    'Minutes from the December audit committee meeting covering financial controls, audit findings, and compliance updates',
    'Audit_Committee_Minutes_Dec_2024.pdf',
    '/board-packs/committees/audit_minutes_dec.pdf',
    980000,
    'application/pdf',
    'ready'::pack_status,
    true,
    'Audit committee reviewed Q4 financials, approved 2025 audit plan, and discussed implementation of new accounting standards. No material weaknesses identified.',
    NOW() - INTERVAL '8 days',
    NOW() - INTERVAL '8 days'
),

-- M&A Analysis
(
    COALESCE(
        (SELECT id FROM users WHERE email = 'test.director@appboardguru.com'),
        (SELECT id FROM users LIMIT 1)
    ),
    'M&A Pipeline Analysis - Confidential',
    'Analysis of potential acquisition targets and strategic partnership opportunities',
    'MA_Pipeline_Analysis_Q4.pptx',
    '/board-packs/strategic/ma_pipeline.pptx',
    4200000,
    'application/vnd.ms-powerpoint',
    'ready'::pack_status,
    true,
    'Analysis of 5 potential acquisition targets with combined valuation of $200M. Two targets currently in due diligence phase with expected closure in Q2 2025.',
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '2 days'
),

-- ESG Report
(
    COALESCE(
        (SELECT id FROM users WHERE email = 'test.director@appboardguru.com'),
        (SELECT id FROM users LIMIT 1)
    ),
    'Environmental, Social & Governance Report 2024',
    'Annual ESG report covering sustainability initiatives, social impact, and governance improvements',
    'ESG_Report_2024.pdf',
    '/board-packs/esg/annual_report_2024.pdf',
    6500000,
    'application/pdf',
    'ready'::pack_status,
    true,
    'ESG report shows 22% reduction in carbon emissions, 40% increase in diversity hiring, and improved governance scores. Achieved AA rating from major ESG rating agencies.',
    NOW() - INTERVAL '10 days',
    NOW() - INTERVAL '10 days'
),

-- Cybersecurity Update
(
    COALESCE(
        (SELECT id FROM users WHERE email = 'test.director@appboardguru.com'),
        (SELECT id FROM users LIMIT 1)
    ),
    'Cybersecurity Posture Assessment Q4 2024',
    'Quarterly cybersecurity assessment including threat landscape, incident response, and security investments',
    'Cybersecurity_Assessment_Q4.pdf',
    '/board-packs/it/cybersecurity_q4.pdf',
    1750000,
    'application/pdf',
    'ready'::pack_status,
    true,
    'No major security incidents in Q4. Successfully defended against 3 targeted attacks. Security maturity score improved to 4.2/5 with 99.9% system uptime.',
    NOW() - INTERVAL '5 days',
    NOW() - INTERVAL '5 days'
),

-- Legal Update
(
    COALESCE(
        (SELECT id FROM users WHERE email = 'board.member@appboardguru.com'),
        (SELECT id FROM users LIMIT 1)
    ),
    'Legal & Regulatory Update Q4 2024',
    'Quarterly legal update covering litigation status, regulatory changes, and compliance matters',
    'Legal_Update_Q4_2024.docx',
    '/board-packs/legal/quarterly_update.docx',
    1450000,
    'application/vnd.ms-word',
    'ready'::pack_status,
    true,
    'No material litigation pending. Successfully resolved 2 minor disputes. New data privacy regulations require attention in Q1 2025. Full compliance achieved with GDPR and CCPA.',
    NOW() - INTERVAL '7 days',
    NOW() - INTERVAL '7 days'
),

-- HR Dashboard
(
    COALESCE(
        (SELECT id FROM users WHERE email = 'test.director@appboardguru.com'),
        (SELECT id FROM users LIMIT 1)
    ),
    'Human Resources Dashboard Q4 2024',
    'Comprehensive HR metrics including headcount, retention, engagement scores, and talent pipeline',
    'HR_Dashboard_Q4_2024.xlsx',
    '/board-packs/hr/dashboard_q4.xlsx',
    2300000,
    'application/vnd.ms-excel',
    'ready'::pack_status,
    true,
    'Employee count at 1,250 with 92% retention rate. Engagement score improved to 4.3/5. Strong talent pipeline with 50 open positions across key growth areas.',
    NOW() - INTERVAL '6 days',
    NOW() - INTERVAL '6 days'
),

-- Customer Success Report
(
    COALESCE(
        (SELECT id FROM users WHERE email = 'test.director@appboardguru.com'),
        (SELECT id FROM users LIMIT 1)
    ),
    'Customer Success Metrics Q4 2024',
    'Customer satisfaction scores, NPS trends, churn analysis, and customer success initiatives',
    'Customer_Success_Q4_2024.pptx',
    '/board-packs/customer/success_metrics.pptx',
    3100000,
    'application/vnd.ms-powerpoint',
    'ready'::pack_status,
    true,
    'NPS score reached all-time high of 72. Customer retention at 96%. Churn reduced by 15% YoY. Customer satisfaction score improved to 4.6/5.',
    NOW() - INTERVAL '4 days',
    NOW() - INTERVAL '4 days'
),

-- Product Roadmap
(
    COALESCE(
        (SELECT id FROM users WHERE email = 'test.director@appboardguru.com'),
        (SELECT id FROM users LIMIT 1)
    ),
    'Product Roadmap 2025 - Board Presentation',
    'Product development roadmap for 2025 including new features, platform improvements, and innovation initiatives',
    'Product_Roadmap_2025.pdf',
    '/board-packs/product/roadmap_2025.pdf',
    4800000,
    'application/pdf',
    'ready'::pack_status,
    true,
    '2025 roadmap includes 3 major product launches, AI integration, and platform modernization. Expected to drive 30% increase in feature adoption and user engagement.',
    NOW() - INTERVAL '3 days',
    NOW() - INTERVAL '3 days'
),

-- Board Resolution Draft
(
    COALESCE(
        (SELECT id FROM users WHERE email = 'test.director@appboardguru.com'),
        (SELECT id FROM users LIMIT 1)
    ),
    'Board Resolutions - Q4 2024 Meeting',
    'Draft resolutions for board approval including dividend declaration, executive appointments, and policy changes',
    'Board_Resolutions_Q4_2024.docx',
    '/board-packs/governance/resolutions_q4.docx',
    890000,
    'application/vnd.ms-word',
    'ready'::pack_status,
    true,
    'Five resolutions for approval: dividend declaration of $0.50/share, CFO appointment, audit firm selection, $50M share buyback program, and updated governance policies.',
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '1 day'
),

-- Investor Relations Update
(
    COALESCE(
        (SELECT id FROM users WHERE email = 'test.director@appboardguru.com'),
        (SELECT id FROM users LIMIT 1)
    ),
    'Investor Relations Update - December 2024',
    'Monthly investor relations update including shareholder composition, analyst coverage, and IR activities',
    'IR_Update_Dec_2024.pdf',
    '/board-packs/investor/ir_update_dec.pdf',
    2650000,
    'application/pdf',
    'ready'::pack_status,
    true,
    'Institutional ownership at 68%. 12 analysts covering with average price target of $85. Successful investor day with 200+ attendees. Strong positive sentiment in recent analyst reports.',
    NOW() - INTERVAL '9 days',
    NOW() - INTERVAL '9 days'
);

-- =====================================================
-- 4. VERIFY DATA CREATION
-- =====================================================

DO $$
DECLARE
    pack_count INTEGER;
    test_user_count INTEGER;
BEGIN
    -- Count total board packs created
    SELECT COUNT(*) INTO pack_count FROM board_packs;
    
    -- Count packs by test user
    SELECT COUNT(*) INTO test_user_count FROM board_packs 
    WHERE uploaded_by IN (
        SELECT id FROM users 
        WHERE email = 'test.director@appboardguru.com'
    );
    
    RAISE NOTICE 'Board packs created successfully!';
    RAISE NOTICE 'Total packs in table: %', pack_count;
    RAISE NOTICE 'Test Director packs: %', test_user_count;
    
    IF pack_count < 15 THEN
        RAISE WARNING 'Expected at least 15 board packs but only % exist in table', pack_count;
    END IF;
END $$;

-- =====================================================
-- 5. DISPLAY SUMMARY
-- =====================================================

-- Display summary
SELECT 
    'Board Packs Test Data Setup Complete' as status,
    COUNT(*) as total_packs,
    COUNT(DISTINCT uploaded_by) as unique_uploaders,
    AVG(file_size) as avg_file_size_bytes,
    pg_size_pretty(AVG(file_size)::bigint) as avg_file_size_formatted,
    MIN(created_at) as oldest_pack,
    MAX(created_at) as newest_pack
FROM board_packs
WHERE created_at >= NOW() - INTERVAL '30 days';

-- Show sample of created data
SELECT 
    title,
    file_name,
    file_type,
    pg_size_pretty(file_size::bigint) as file_size_formatted,
    LEFT(summary, 100) || '...' as summary_preview,
    created_at
FROM board_packs
ORDER BY created_at DESC
LIMIT 5;