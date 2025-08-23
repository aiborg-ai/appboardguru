-- =====================================================
-- SYNTHETIC TEST DATA FOR UPLOAD FUNCTIONALITY
-- Script 4: Create 10+ assets and test vaults for test.director user
-- Run this after 01-core-tables, 02-test-user-setup, and 03-create-assets-and-vaults-tables
-- =====================================================

-- =====================================================
-- 1. CREATE TEST VAULTS
-- =====================================================

-- Get test user and organization IDs for reference
DO $$
DECLARE
    test_user_id UUID;
    test_org_id UUID;
    vault1_id UUID;
    vault2_id UUID;
    vault3_id UUID;
BEGIN
    -- Get test user and organization
    SELECT u.id INTO test_user_id FROM users u WHERE u.email = 'test.director@appboardguru.com';
    SELECT o.id INTO test_org_id FROM organizations o WHERE o.slug = 'test-board-org';
    
    IF test_user_id IS NULL OR test_org_id IS NULL THEN
        RAISE EXCEPTION 'Test user or organization not found. Please run setup scripts 01 and 02 first.';
    END IF;
    
    -- Create test vaults
    INSERT INTO vaults (id, name, description, organization_id, created_by, is_public, created_at, updated_at)
    VALUES 
        (gen_random_uuid(), 'Board Documents', 'Official board meeting documents and materials', test_org_id, test_user_id, false, NOW() - INTERVAL '30 days', NOW() - INTERVAL '5 days'),
        (gen_random_uuid(), 'Financial Reports', 'Quarterly and annual financial reports', test_org_id, test_user_id, false, NOW() - INTERVAL '25 days', NOW() - INTERVAL '3 days'),
        (gen_random_uuid(), 'Legal & Compliance', 'Legal documents, contracts, and compliance materials', test_org_id, test_user_id, true, NOW() - INTERVAL '20 days', NOW() - INTERVAL '1 day')
    ON CONFLICT (organization_id, name) DO UPDATE SET
        description = EXCLUDED.description,
        updated_at = NOW();
    
    RAISE NOTICE 'Created 3 test vaults for organization: %', test_org_id;
END $$;

-- =====================================================
-- 2. CREATE SYNTHETIC ASSETS
-- =====================================================

-- Create 15 realistic test assets with various file types and metadata
DO $$
DECLARE
    test_user_id UUID;
    test_org_id UUID;
    board_vault_id UUID;
    financial_vault_id UUID;
    legal_vault_id UUID;
    admin_user_id UUID;
    member_user_id UUID;
    asset_counter INTEGER := 1;
BEGIN
    -- Get user and organization IDs
    SELECT u.id INTO test_user_id FROM users u WHERE u.email = 'test.director@appboardguru.com';
    SELECT u.id INTO admin_user_id FROM users u WHERE u.email = 'admin.user@appboardguru.com';
    SELECT u.id INTO member_user_id FROM users u WHERE u.email = 'board.member@appboardguru.com';
    SELECT o.id INTO test_org_id FROM organizations o WHERE o.slug = 'test-board-org';
    
    -- Get vault IDs
    SELECT id INTO board_vault_id FROM vaults WHERE name = 'Board Documents' AND organization_id = test_org_id;
    SELECT id INTO financial_vault_id FROM vaults WHERE name = 'Financial Reports' AND organization_id = test_org_id;
    SELECT id INTO legal_vault_id FROM vaults WHERE name = 'Legal & Compliance' AND organization_id = test_org_id;
    
    -- Insert synthetic assets
    INSERT INTO assets (
        id, owner_id, uploaded_by, organization_id, vault_id, title, description, 
        file_name, original_file_name, file_path, file_size, file_type, mime_type,
        category, tags, folder_path, processing_status, version, 
        view_count, download_count, created_at, updated_at, last_accessed_at,
        metadata, is_deleted
    ) VALUES
    -- Board Documents Vault Assets (5 assets)
    (
        gen_random_uuid(), test_user_id, test_user_id, test_org_id, board_vault_id,
        'Q3 2024 Board Meeting Agenda',
        'Comprehensive agenda for the quarterly board meeting including strategic initiatives and financial review.',
        'board-meeting-agenda-q3-2024.pdf', 'Board Meeting Agenda Q3 2024.pdf',
        'board-documents/meetings/2024/q3/agenda.pdf', 2456789, 'pdf', 'application/pdf',
        'board-documents', ARRAY['meeting', 'agenda', 'q3', 'strategic'], '/meetings/2024/q3',
        'completed', 1, 45, 12, NOW() - INTERVAL '15 days', NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day',
        '{"pages": 8, "contains_financial_data": true, "confidential": true, "approval_required": false}', false
    ),
    (
        gen_random_uuid(), test_user_id, test_user_id, test_org_id, board_vault_id,
        'Q3 2024 Board Meeting Minutes',
        'Official minutes from the Q3 board meeting with resolutions and action items.',
        'board-meeting-minutes-q3-2024.pdf', 'Board Meeting Minutes Q3 2024.pdf',
        'board-documents/meetings/2024/q3/minutes.pdf', 1876432, 'pdf', 'application/pdf',
        'meeting-materials', ARRAY['minutes', 'meeting', 'q3', 'official'], '/meetings/2024/q3',
        'completed', 2, 38, 8, NOW() - INTERVAL '12 days', NOW() - INTERVAL '1 day', NOW() - INTERVAL '6 hours',
        '{"pages": 12, "contains_resolutions": true, "action_items_count": 7}', false
    ),
    (
        gen_random_uuid(), admin_user_id, admin_user_id, test_org_id, board_vault_id,
        'Strategic Plan 2025-2027',
        'Three-year strategic plan outlining company vision, goals, and key initiatives.',
        'strategic-plan-2025-2027.docx', 'Strategic Plan 2025-2027.docx',
        'board-documents/strategic/strategic-plan-2025-2027.docx', 5678901, 'docx', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'presentations', ARRAY['strategic', 'planning', 'future', 'vision'], '/strategic',
        'completed', 1, 62, 15, NOW() - INTERVAL '20 days', NOW() - INTERVAL '3 days', NOW() - INTERVAL '12 hours',
        '{"word_count": 8542, "contains_financial_projections": true, "last_reviewed": "2024-08-15"}', false
    ),
    (
        gen_random_uuid(), member_user_id, member_user_id, test_org_id, board_vault_id,
        'Risk Assessment Matrix 2024',
        'Comprehensive risk assessment including operational, financial, and strategic risks.',
        'risk-assessment-matrix-2024.xlsx', 'Risk Assessment Matrix 2024.xlsx',
        'board-documents/risk/risk-assessment-2024.xlsx', 987654, 'xlsx',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'financial', ARRAY['risk', 'assessment', 'matrix', 'analysis'], '/risk',
        'completed', 3, 29, 7, NOW() - INTERVAL '18 days', NOW() - INTERVAL '4 days', NOW() - INTERVAL '2 days',
        '{"worksheets": 5, "risk_categories": 12, "high_priority_risks": 3}', false
    ),
    (
        gen_random_uuid(), test_user_id, test_user_id, test_org_id, board_vault_id,
        'Governance Policies Update',
        'Updated corporate governance policies and procedures for 2024.',
        'governance-policies-update-2024.pdf', 'Governance Policies Update 2024.pdf',
        'board-documents/policies/governance-policies-2024.pdf', 3456789, 'pdf', 'application/pdf',
        'policies', ARRAY['governance', 'policies', 'update', 'compliance'], '/policies',
        'completed', 1, 33, 9, NOW() - INTERVAL '25 days', NOW() - INTERVAL '5 days', NOW() - INTERVAL '3 days',
        '{"pages": 24, "policy_sections": 8, "effective_date": "2024-01-01"}', false
    ),
    
    -- Financial Reports Vault Assets (5 assets)
    (
        gen_random_uuid(), test_user_id, test_user_id, test_org_id, financial_vault_id,
        'Q3 2024 Financial Statements',
        'Comprehensive financial statements including P&L, Balance Sheet, and Cash Flow.',
        'q3-2024-financial-statements.pdf', 'Q3 2024 Financial Statements.pdf',
        'financial/quarterly/2024/q3/statements.pdf', 4567890, 'pdf', 'application/pdf',
        'financial', ARRAY['financial', 'statements', 'q3', 'quarterly'], '/quarterly/2024/q3',
        'completed', 1, 89, 23, NOW() - INTERVAL '10 days', NOW() - INTERVAL '1 day', NOW() - INTERVAL '4 hours',
        '{"pages": 32, "includes_notes": true, "audited": false, "currency": "USD"}', false
    ),
    (
        gen_random_uuid(), admin_user_id, admin_user_id, test_org_id, financial_vault_id,
        'Budget vs Actual Analysis Q3',
        'Detailed analysis comparing budgeted vs actual performance for Q3 2024.',
        'budget-vs-actual-q3-2024.xlsx', 'Budget vs Actual Analysis Q3 2024.xlsx',
        'financial/analysis/2024/q3/budget-variance.xlsx', 2345678, 'xlsx',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'financial', ARRAY['budget', 'analysis', 'variance', 'performance'], '/analysis/2024/q3',
        'completed', 2, 56, 14, NOW() - INTERVAL '8 days', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '30 minutes',
        '{"worksheets": 8, "variance_categories": 15, "significant_variances": 4}', false
    ),
    (
        gen_random_uuid(), test_user_id, test_user_id, test_org_id, financial_vault_id,
        '2023 Annual Report',
        'Complete annual report including financial performance, achievements, and outlook.',
        '2023-annual-report.pdf', '2023 Annual Report.pdf',
        'financial/annual/2023/annual-report.pdf', 8901234, 'pdf', 'application/pdf',
        'financial', ARRAY['annual', 'report', '2023', 'comprehensive'], '/annual/2023',
        'completed', 1, 156, 45, NOW() - INTERVAL '60 days', NOW() - INTERVAL '10 days', NOW() - INTERVAL '5 days',
        '{"pages": 68, "sections": 12, "includes_sustainability": true, "public_version": true}', false
    ),
    (
        gen_random_uuid(), member_user_id, member_user_id, test_org_id, financial_vault_id,
        'Cash Flow Projection 2024-2025',
        'Rolling 18-month cash flow projection with scenario analysis.',
        'cash-flow-projection-2024-2025.xlsx', 'Cash Flow Projection 2024-2025.xlsx',
        'financial/projections/cash-flow-2024-2025.xlsx', 1654321, 'xlsx',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'financial', ARRAY['cashflow', 'projection', 'forecast', 'scenarios'], '/projections',
        'completed', 4, 42, 11, NOW() - INTERVAL '14 days', NOW() - INTERVAL '1 day', NOW() - INTERVAL '8 hours',
        '{"months_projected": 18, "scenarios": 3, "confidence_level": "high"}', false
    ),
    (
        gen_random_uuid(), admin_user_id, admin_user_id, test_org_id, financial_vault_id,
        'Audit Management Letter',
        'External auditor management letter with recommendations and responses.',
        'audit-management-letter-2023.pdf', 'Audit Management Letter 2023.pdf',
        'financial/audit/2023/management-letter.pdf', 876543, 'pdf', 'application/pdf',
        'financial', ARRAY['audit', 'management', 'letter', 'recommendations'], '/audit/2023',
        'completed', 1, 27, 6, NOW() - INTERVAL '40 days', NOW() - INTERVAL '7 days', NOW() - INTERVAL '2 days',
        '{"recommendations_count": 5, "priority_high": 1, "priority_medium": 4}', false
    ),
    
    -- Legal & Compliance Vault Assets (5 assets)
    (
        gen_random_uuid(), test_user_id, test_user_id, test_org_id, legal_vault_id,
        'Data Privacy Policy 2024',
        'Updated data privacy policy compliant with GDPR, CCPA, and other regulations.',
        'data-privacy-policy-2024.pdf', 'Data Privacy Policy 2024.pdf',
        'legal/policies/data-privacy-policy-2024.pdf', 1234567, 'pdf', 'application/pdf',
        'legal', ARRAY['privacy', 'policy', 'gdpr', 'ccpa', 'compliance'], '/policies',
        'completed', 2, 78, 19, NOW() - INTERVAL '22 days', NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 day',
        '{"pages": 16, "last_updated": "2024-08-01", "approval_status": "approved"}', false
    ),
    (
        gen_random_uuid(), admin_user_id, admin_user_id, test_org_id, legal_vault_id,
        'Vendor Master Agreement Template',
        'Standard vendor agreement template with terms and conditions.',
        'vendor-master-agreement-template.docx', 'Vendor Master Agreement Template.docx',
        'legal/contracts/vendor-master-agreement-template.docx', 654321, 'docx',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'contracts', ARRAY['vendor', 'agreement', 'template', 'contract'], '/contracts',
        'completed', 3, 35, 8, NOW() - INTERVAL '16 days', NOW() - INTERVAL '2 days', NOW() - INTERVAL '6 hours',
        '{"word_count": 3456, "clauses": 24, "last_legal_review": "2024-08-10"}', false
    ),
    (
        gen_random_uuid(), member_user_id, member_user_id, test_org_id, legal_vault_id,
        'Compliance Training Materials',
        'Annual compliance training presentation and materials for all employees.',
        'compliance-training-2024.pptx', 'Compliance Training 2024.pptx',
        'legal/training/compliance-training-2024.pptx', 3456789, 'pptx',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'compliance', ARRAY['training', 'compliance', 'employees', 'annual'], '/training',
        'completed', 1, 124, 35, NOW() - INTERVAL '28 days', NOW() - INTERVAL '4 days', NOW() - INTERVAL '12 hours',
        '{"slides": 45, "modules": 6, "completion_tracking": true}', false
    ),
    (
        gen_random_uuid(), test_user_id, test_user_id, test_org_id, legal_vault_id,
        'Insurance Policy Schedule',
        'Comprehensive schedule of all corporate insurance policies and coverage.',
        'insurance-policy-schedule-2024.xlsx', 'Insurance Policy Schedule 2024.xlsx',
        'legal/insurance/insurance-schedule-2024.xlsx', 789012, 'xlsx',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'legal', ARRAY['insurance', 'policies', 'schedule', 'coverage'], '/insurance',
        'completed', 2, 18, 4, NOW() - INTERVAL '35 days', NOW() - INTERVAL '6 days', NOW() - INTERVAL '3 days',
        '{"policies_count": 12, "total_coverage": 50000000, "renewal_dates_tracked": true}', false
    ),
    (
        gen_random_uuid(), admin_user_id, admin_user_id, test_org_id, legal_vault_id,
        'Intellectual Property Audit',
        'Comprehensive audit of company intellectual property including patents and trademarks.',
        'ip-audit-report-2024.pdf', 'Intellectual Property Audit Report 2024.pdf',
        'legal/ip/ip-audit-report-2024.pdf', 2109876, 'pdf', 'application/pdf',
        'legal', ARRAY['ip', 'intellectual', 'property', 'audit', 'patents'], '/ip',
        'completed', 1, 41, 10, NOW() - INTERVAL '32 days', NOW() - INTERVAL '5 days', NOW() - INTERVAL '2 days',
        '{"patents": 8, "trademarks": 15, "pending_applications": 3, "recommendations": 7}', false
    );
    
    RAISE NOTICE 'Created 15 synthetic assets across 3 vaults';
END $$;

-- =====================================================
-- 3. CREATE ASSET SHARES (some assets shared between users)
-- =====================================================

DO $$
DECLARE
    test_user_id UUID;
    admin_user_id UUID;
    member_user_id UUID;
    sample_asset_id UUID;
BEGIN
    -- Get user IDs
    SELECT u.id INTO test_user_id FROM users u WHERE u.email = 'test.director@appboardguru.com';
    SELECT u.id INTO admin_user_id FROM users u WHERE u.email = 'admin.user@appboardguru.com';
    SELECT u.id INTO member_user_id FROM users u WHERE u.email = 'board.member@appboardguru.com';
    
    -- Create some asset shares between users
    -- Share Strategic Plan with admin user
    SELECT a.id INTO sample_asset_id FROM assets a WHERE a.title = 'Strategic Plan 2025-2027' LIMIT 1;
    IF sample_asset_id IS NOT NULL THEN
        INSERT INTO asset_shares (asset_id, shared_by_user_id, shared_with_user_id, permission_level, share_message, created_at)
        VALUES (sample_asset_id, test_user_id, admin_user_id, 'download', 'Please review and provide feedback on the strategic initiatives.', NOW() - INTERVAL '5 days');
    END IF;
    
    -- Share Financial Statements with member
    SELECT a.id INTO sample_asset_id FROM assets a WHERE a.title = 'Q3 2024 Financial Statements' LIMIT 1;
    IF sample_asset_id IS NOT NULL THEN
        INSERT INTO asset_shares (asset_id, shared_by_user_id, shared_with_user_id, permission_level, share_message, created_at)
        VALUES (sample_asset_id, test_user_id, member_user_id, 'view', 'FYI - Q3 financial results for your review.', NOW() - INTERVAL '3 days');
    END IF;
    
    -- Share Data Privacy Policy with both users
    SELECT a.id INTO sample_asset_id FROM assets a WHERE a.title = 'Data Privacy Policy 2024' LIMIT 1;
    IF sample_asset_id IS NOT NULL THEN
        INSERT INTO asset_shares (asset_id, shared_by_user_id, shared_with_user_id, permission_level, share_message, created_at)
        VALUES 
            (sample_asset_id, test_user_id, admin_user_id, 'download', 'Updated privacy policy - please ensure team compliance.', NOW() - INTERVAL '2 days'),
            (sample_asset_id, test_user_id, member_user_id, 'view', 'New privacy policy for your awareness.', NOW() - INTERVAL '2 days');
    END IF;
    
    RAISE NOTICE 'Created asset sharing relationships between users';
END $$;

-- =====================================================
-- 4. CREATE ASSET ANNOTATIONS (comments and notes)
-- =====================================================

DO $$
DECLARE
    test_user_id UUID;
    admin_user_id UUID;
    member_user_id UUID;
    strategic_plan_id UUID;
    financial_statements_id UUID;
    risk_assessment_id UUID;
BEGIN
    -- Get user IDs
    SELECT u.id INTO test_user_id FROM users u WHERE u.email = 'test.director@appboardguru.com';
    SELECT u.id INTO admin_user_id FROM users u WHERE u.email = 'admin.user@appboardguru.com';
    SELECT u.id INTO member_user_id FROM users u WHERE u.email = 'board.member@appboardguru.com';
    
    -- Get some asset IDs for annotations
    SELECT a.id INTO strategic_plan_id FROM assets a WHERE a.title = 'Strategic Plan 2025-2027' LIMIT 1;
    SELECT a.id INTO financial_statements_id FROM assets a WHERE a.title = 'Q3 2024 Financial Statements' LIMIT 1;
    SELECT a.id INTO risk_assessment_id FROM assets a WHERE a.title = 'Risk Assessment Matrix 2024' LIMIT 1;
    
    -- Add annotations to Strategic Plan
    IF strategic_plan_id IS NOT NULL THEN
        INSERT INTO asset_annotations (asset_id, user_id, content, annotation_type, position_data, created_at)
        VALUES 
            (strategic_plan_id, test_user_id, 'Excellent work on the market analysis section. Very thorough.', 'comment', '{"page": 5, "section": "market_analysis"}', NOW() - INTERVAL '4 days'),
            (strategic_plan_id, admin_user_id, 'Should we include more details on the technology roadmap?', 'note', '{"page": 12, "section": "technology"}', NOW() - INTERVAL '3 days'),
            (strategic_plan_id, member_user_id, 'The financial projections look conservative but realistic.', 'review', '{"page": 18, "section": "financial_projections"}', NOW() - INTERVAL '2 days');
    END IF;
    
    -- Add annotations to Financial Statements
    IF financial_statements_id IS NOT NULL THEN
        INSERT INTO asset_annotations (asset_id, user_id, content, annotation_type, position_data, created_at)
        VALUES 
            (financial_statements_id, test_user_id, 'Strong performance in Q3. Revenue exceeded expectations.', 'comment', '{"page": 3, "section": "revenue"}', NOW() - INTERVAL '1 day'),
            (financial_statements_id, admin_user_id, 'Need to discuss the increase in operational expenses.', 'highlight', '{"page": 8, "line_item": "operational_expenses"}', NOW() - INTERVAL '6 hours');
    END IF;
    
    -- Add annotations to Risk Assessment
    IF risk_assessment_id IS NOT NULL THEN
        INSERT INTO asset_annotations (asset_id, user_id, content, annotation_type, position_data, created_at)
        VALUES 
            (risk_assessment_id, member_user_id, 'Cybersecurity risk should be elevated to high priority given recent incidents.', 'comment', '{"worksheet": "operational_risks", "row": 15}', NOW() - INTERVAL '5 days'),
            (risk_assessment_id, test_user_id, 'Agreed. Let''s schedule a security review meeting.', 'comment', '{"worksheet": "operational_risks", "row": 15, "reply_to": "previous"}', NOW() - INTERVAL '4 days');
    END IF;
    
    RAISE NOTICE 'Created annotations and comments on assets';
END $$;

-- =====================================================
-- 5. UPDATE ASSET ACCESS STATISTICS
-- =====================================================

-- Simulate realistic access patterns by updating view counts, download counts, and last accessed dates
UPDATE assets SET 
    view_count = view_count + (RANDOM() * 50)::INTEGER,
    download_count = download_count + (RANDOM() * 20)::INTEGER,
    last_accessed_at = NOW() - (RANDOM() * INTERVAL '7 days')
WHERE organization_id IN (SELECT id FROM organizations WHERE slug = 'test-board-org');

-- =====================================================
-- 6. VERIFICATION QUERIES
-- =====================================================

-- Display summary of created test data
DO $$
DECLARE
    vault_count INTEGER;
    asset_count INTEGER;
    share_count INTEGER;
    annotation_count INTEGER;
    test_org_id UUID;
BEGIN
    SELECT id INTO test_org_id FROM organizations WHERE slug = 'test-board-org';
    
    SELECT COUNT(*) INTO vault_count FROM vaults WHERE organization_id = test_org_id;
    SELECT COUNT(*) INTO asset_count FROM assets WHERE organization_id = test_org_id;
    SELECT COUNT(*) INTO share_count FROM asset_shares WHERE asset_id IN (SELECT id FROM assets WHERE organization_id = test_org_id);
    SELECT COUNT(*) INTO annotation_count FROM asset_annotations WHERE asset_id IN (SELECT id FROM assets WHERE organization_id = test_org_id);
    
    RAISE NOTICE '=== SYNTHETIC TEST DATA SUMMARY ===';
    RAISE NOTICE 'Organization: Test Board Organization (%)' , test_org_id;
    RAISE NOTICE 'Vaults created: %', vault_count;
    RAISE NOTICE 'Assets created: %', asset_count;
    RAISE NOTICE 'Asset shares created: %', share_count;
    RAISE NOTICE 'Annotations created: %', annotation_count;
    RAISE NOTICE '====================================';
END $$;

-- Show vault summary
SELECT 
    v.name as vault_name,
    v.description,
    COUNT(a.id) as asset_count,
    SUM(a.file_size) as total_size_bytes,
    ROUND(SUM(a.file_size)::NUMERIC / 1024 / 1024, 2) as total_size_mb,
    v.created_at
FROM vaults v
LEFT JOIN assets a ON v.id = a.vault_id AND a.is_deleted = false
WHERE v.organization_id = (SELECT id FROM organizations WHERE slug = 'test-board-org')
GROUP BY v.id, v.name, v.description, v.created_at
ORDER BY v.created_at;

-- Show asset summary by category
SELECT 
    a.category,
    COUNT(*) as asset_count,
    ROUND(AVG(a.view_count), 1) as avg_views,
    ROUND(AVG(a.download_count), 1) as avg_downloads,
    STRING_AGG(DISTINCT a.file_type, ', ' ORDER BY a.file_type) as file_types
FROM assets a
WHERE a.organization_id = (SELECT id FROM organizations WHERE slug = 'test-board-org')
    AND a.is_deleted = false
GROUP BY a.category
ORDER BY asset_count DESC;

-- Show most accessed assets
SELECT 
    a.title,
    a.category,
    v.name as vault_name,
    a.view_count,
    a.download_count,
    a.last_accessed_at,
    u.full_name as owner_name
FROM assets a
LEFT JOIN vaults v ON a.vault_id = v.id
LEFT JOIN users u ON a.owner_id = u.id
WHERE a.organization_id = (SELECT id FROM organizations WHERE slug = 'test-board-org')
    AND a.is_deleted = false
ORDER BY (a.view_count + a.download_count * 2) DESC
LIMIT 5;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$ 
BEGIN 
    RAISE NOTICE '';
    RAISE NOTICE '=== SYNTHETIC TEST DATA SETUP COMPLETE ===';
    RAISE NOTICE 'Created comprehensive test data for upload functionality testing:';
    RAISE NOTICE '- 3 vaults (Board Documents, Financial Reports, Legal & Compliance)';
    RAISE NOTICE '- 15 realistic assets with various file types';
    RAISE NOTICE '- Asset sharing relationships between users';
    RAISE NOTICE '- Comments and annotations on assets';
    RAISE NOTICE '- Realistic access statistics and metadata';
    RAISE NOTICE '';
    RAISE NOTICE 'Test user: test.director@appboardguru.com';
    RAISE NOTICE 'Additional users: admin.user@appboardguru.com, board.member@appboardguru.com';
    RAISE NOTICE 'Organization: Test Board Organization';
    RAISE NOTICE '';
    RAISE NOTICE 'You can now test the upload functionality with existing data!';
END $$;