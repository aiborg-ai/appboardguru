-- =====================================================
-- EMAIL-TO-ASSET SYNTHETIC ASSETS DATA
-- Script 4: Create realistic asset data linked to email processing
-- Run this fourth in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. VERIFY PREREQUISITES
-- =====================================================

DO $$
DECLARE
    test_user_id UUID;
    test_org_id UUID;
    email_logs_count INTEGER;
BEGIN
    -- Verify test user and organization exist
    SELECT id INTO test_user_id FROM users WHERE email = 'test.director@appboardguru.com';
    SELECT id INTO test_org_id FROM organizations WHERE slug = 'test-board-org';
    SELECT COUNT(*) INTO email_logs_count FROM email_processing_logs;
    
    IF test_user_id IS NULL THEN
        RAISE EXCEPTION 'Test user not found. Please run script 02 first.';
    END IF;
    
    IF test_org_id IS NULL THEN
        RAISE EXCEPTION 'Test organization not found. Please run script 02 first.';
    END IF;
    
    IF email_logs_count = 0 THEN
        RAISE EXCEPTION 'No email processing logs found. Please run script 03 first.';
    END IF;
    
    RAISE NOTICE 'Prerequisites verified: user %, org %, % email logs', test_user_id, test_org_id, email_logs_count;
END $$;

-- =====================================================
-- 2. CREATE ASSETS LINKED TO COMPLETED EMAIL PROCESSING LOGS
-- =====================================================

-- Clear existing test assets (optional)
DELETE FROM assets 
WHERE owner_id IN (
    SELECT id FROM users 
    WHERE email IN ('test.director@appboardguru.com', 'admin.user@appboardguru.com', 'board.member@appboardguru.com')
)
AND source_type = 'email';

-- Create assets for completed email processing logs
INSERT INTO assets (
    id,
    owner_id,
    organization_id,
    title,
    description,
    file_name,
    original_file_name,
    file_path,
    file_size,
    file_type,
    mime_type,
    storage_bucket,
    category,
    tags,
    folder_path,
    thumbnail_url,
    preview_url,
    is_processed,
    processing_status,
    visibility,
    download_count,
    view_count,
    source_type,
    email_message_id,
    source_email,
    created_at,
    updated_at,
    last_accessed_at
)
SELECT 
    asset_id,
    epl.user_id,
    epl.organization_id,
    asset_data.title,
    asset_data.description,
    asset_data.file_name,
    asset_data.original_file_name,
    asset_data.file_path,
    asset_data.file_size,
    asset_data.file_type,
    asset_data.mime_type,
    'email-assets',
    asset_data.category,
    asset_data.tags,
    '/email-assets',
    asset_data.thumbnail_url,
    asset_data.preview_url,
    true,
    'completed',
    'private',
    random() * 5,  -- Random download count 0-5
    random() * 20, -- Random view count 0-20
    'email',
    epl.message_id,
    epl.from_email,
    epl.created_at + INTERVAL '30 seconds', -- Asset created shortly after email
    epl.updated_at + INTERVAL '30 seconds',
    CASE WHEN random() > 0.5 THEN epl.created_at + (random() * INTERVAL '7 days') ELSE NULL END
FROM email_processing_logs epl
CROSS JOIN LATERAL (
    -- Generate realistic asset data for each asset in assets_created array
    SELECT 
        asset_id,
        asset_data.*
    FROM unnest(epl.assets_created) AS asset_id
    CROSS JOIN LATERAL (
        SELECT 
            title,
            description,
            file_name,
            original_file_name,
            file_path,
            file_size,
            file_type,
            mime_type,
            category,
            tags,
            thumbnail_url,
            preview_url
        FROM (VALUES
            -- Board meeting documents
            (
                'Board Meeting Minutes - ' || to_char(epl.created_at, 'Month YYYY'),
                'Comprehensive board meeting minutes with action items and decisions from ' || to_char(epl.created_at, 'Month DD, YYYY'),
                'board_minutes_' || extract(year from epl.created_at) || '_' || extract(month from epl.created_at) || '.pdf',
                'Board Meeting Minutes - ' || to_char(epl.created_at, 'Mon YYYY') || '.pdf',
                '/email-assets/board_minutes/' || asset_id::text || '.pdf',
                (2.5 + random() * 5) * 1024 * 1024, -- 2.5-7.5 MB
                'pdf',
                'application/pdf',
                'meeting_minutes',
                ARRAY['board', 'meeting', 'minutes', to_char(epl.created_at, 'YYYY')],
                '/thumbnails/pdf_thumb_' || asset_id::text || '.png',
                '/previews/pdf_preview_' || asset_id::text || '.pdf'
            ),
            -- Financial reports
            (
                'Financial Report - ' || to_char(epl.created_at, 'FMMonth YYYY'),
                'Detailed financial analysis including revenue, expenses, and projections for ' || to_char(epl.created_at, 'FMMonth YYYY'),
                'financial_report_' || to_char(epl.created_at, 'YYYY_MM') || '.xlsx',
                'Q' || extract(quarter from epl.created_at) || ' Financial Report.xlsx',
                '/email-assets/financial/' || asset_id::text || '.xlsx',
                (1.8 + random() * 3) * 1024 * 1024, -- 1.8-4.8 MB
                'xlsx',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'financial',
                ARRAY['finance', 'report', 'quarterly', 'budget'],
                '/thumbnails/excel_thumb_' || asset_id::text || '.png',
                '/previews/excel_preview_' || asset_id::text || '.html'
            ),
            -- Compliance documents
            (
                'Compliance Documentation Update',
                'Updated compliance procedures and regulatory requirements documentation',
                'compliance_update_' || extract(epoch from epl.created_at) || '.docx',
                'Compliance Update - ' || to_char(epl.created_at, 'MM/DD/YYYY') || '.docx',
                '/email-assets/compliance/' || asset_id::text || '.docx',
                (0.8 + random() * 2) * 1024 * 1024, -- 0.8-2.8 MB
                'docx',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'compliance',
                ARRAY['compliance', 'legal', 'documentation', 'update'],
                '/thumbnails/word_thumb_' || asset_id::text || '.png',
                '/previews/word_preview_' || asset_id::text || '.html'
            ),
            -- Strategic planning
            (
                'Strategic Planning Documents',
                'Strategic planning materials and long-term growth initiatives',
                'strategic_plan_' || extract(year from epl.created_at) || '.pptx',
                'Strategic Planning Presentation.pptx',
                '/email-assets/strategy/' || asset_id::text || '.pptx',
                (8.5 + random() * 10) * 1024 * 1024, -- 8.5-18.5 MB
                'pptx',
                'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                'strategy',
                ARRAY['strategy', 'planning', 'presentation', 'growth'],
                '/thumbnails/ppt_thumb_' || asset_id::text || '.png',
                '/previews/ppt_preview_' || asset_id::text || '.html'
            ),
            -- Risk assessment
            (
                'Risk Assessment Report',
                'Comprehensive risk analysis and mitigation strategies for operational and financial risks',
                'risk_assessment_' || to_char(epl.created_at, 'YYYY_MM_DD') || '.pdf',
                'Risk Assessment - ' || to_char(epl.created_at, 'Month YYYY') || '.pdf',
                '/email-assets/risk/' || asset_id::text || '.pdf',
                (3.2 + random() * 4) * 1024 * 1024, -- 3.2-7.2 MB
                'pdf',
                'application/pdf',
                'risk_management',
                ARRAY['risk', 'assessment', 'analysis', 'mitigation'],
                '/thumbnails/pdf_thumb_' || asset_id::text || '.png',
                '/previews/pdf_preview_' || asset_id::text || '.pdf'
            ),
            -- Policy documents
            (
                'Policy Update Documentation',
                'Updated corporate policies and procedures effective ' || to_char(epl.created_at + INTERVAL '1 month', 'Month DD, YYYY'),
                'policy_update_' || extract(epoch from epl.created_at) || '.pdf',
                'Corporate Policy Update.pdf',
                '/email-assets/policies/' || asset_id::text || '.pdf',
                (1.5 + random() * 2.5) * 1024 * 1024, -- 1.5-4 MB
                'pdf',
                'application/pdf',
                'policy',
                ARRAY['policy', 'procedures', 'corporate', 'update'],
                '/thumbnails/pdf_thumb_' || asset_id::text || '.png',
                '/previews/pdf_preview_' || asset_id::text || '.pdf'
            )
        ) AS asset_types(title, description, file_name, original_file_name, file_path, file_size, file_type, mime_type, category, tags, thumbnail_url, preview_url)
        ORDER BY random()
        LIMIT 1
    ) AS asset_data
) AS asset_data
WHERE epl.status = 'completed'
AND array_length(epl.assets_created, 1) > 0;

-- =====================================================
-- 3. UPDATE EMAIL PROCESSING LOGS WITH CREATED ASSET IDs
-- =====================================================

-- This step ensures referential integrity between email logs and assets
UPDATE email_processing_logs 
SET assets_created = ARRAY(
    SELECT a.id::text
    FROM assets a 
    WHERE a.email_message_id = email_processing_logs.message_id
    AND a.source_type = 'email'
)::UUID[]
WHERE status = 'completed';

-- =====================================================
-- 4. CREATE ADDITIONAL REGULAR (NON-EMAIL) ASSETS FOR COMPARISON
-- =====================================================

-- Create some regular uploaded assets to show the difference
INSERT INTO assets (
    owner_id,
    organization_id,
    title,
    description,
    file_name,
    original_file_name,
    file_path,
    file_size,
    file_type,
    mime_type,
    storage_bucket,
    category,
    tags,
    folder_path,
    is_processed,
    processing_status,
    visibility,
    download_count,
    view_count,
    source_type,
    created_at,
    updated_at
)
SELECT 
    users.id,
    org.id,
    regular_assets.title,
    regular_assets.description,
    regular_assets.file_name,
    regular_assets.original_file_name,
    regular_assets.file_path,
    regular_assets.file_size,
    regular_assets.file_type,
    regular_assets.mime_type,
    'assets',
    regular_assets.category,
    regular_assets.tags,
    '/uploads',
    true,
    'completed',
    'private',
    random() * 10,
    random() * 25,
    'upload',
    NOW() - (random() * INTERVAL '14 days'),
    NOW() - (random() * INTERVAL '14 days')
FROM (
    SELECT id FROM users 
    WHERE email IN ('test.director@appboardguru.com', 'admin.user@appboardguru.com', 'board.member@appboardguru.com')
    ORDER BY random()
    LIMIT 3
) users
CROSS JOIN (
    SELECT id FROM organizations WHERE slug = 'test-board-org'
) org
CROSS JOIN (VALUES
    (
        'Annual Report 2024',
        'Complete annual report with financial statements and performance metrics',
        'annual_report_2024.pdf',
        'Annual Report 2024.pdf',
        '/uploads/annual_report_2024.pdf',
        15728640, -- 15MB
        'pdf',
        'application/pdf',
        'annual_report',
        ARRAY['annual', 'report', '2024', 'financial']
    ),
    (
        'Executive Summary Presentation',
        'High-level executive summary for stakeholder presentation',
        'exec_summary_2024.pptx',
        'Executive Summary Q4.pptx',
        '/uploads/exec_summary_2024.pptx',
        12582912, -- 12MB
        'pptx',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'presentation',
        ARRAY['executive', 'summary', 'presentation', 'stakeholders']
    ),
    (
        'Budget Spreadsheet 2025',
        'Detailed budget breakdown for fiscal year 2025',
        'budget_2025.xlsx',
        'FY2025 Budget Planning.xlsx',
        '/uploads/budget_2025.xlsx',
        3145728, -- 3MB
        'xlsx',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'financial',
        ARRAY['budget', '2025', 'planning', 'financial']
    ),
    (
        'Corporate Governance Guidelines',
        'Updated corporate governance policies and best practices',
        'governance_guidelines.docx',
        'Corporate Governance Guidelines.docx',
        '/uploads/governance_guidelines.docx',
        2097152, -- 2MB
        'docx',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'governance',
        ARRAY['governance', 'corporate', 'guidelines', 'policy']
    ),
    (
        'Audit Report Q4 2024',
        'External audit findings and recommendations for Q4 2024',
        'audit_report_q4_2024.pdf',
        'Q4 2024 Audit Report.pdf',
        '/uploads/audit_report_q4_2024.pdf',
        5242880, -- 5MB
        'pdf',
        'application/pdf',
        'audit',
        ARRAY['audit', 'Q4', '2024', 'external', 'findings']
    )
) AS regular_assets(title, description, file_name, original_file_name, file_path, file_size, file_type, mime_type, category, tags);

-- =====================================================
-- 5. CREATE ASSET SHARE RELATIONSHIPS
-- =====================================================

-- Create some asset sharing examples between users
INSERT INTO asset_shares (
    asset_id,
    shared_by_user_id,
    shared_with_user_id,
    permission_level,
    share_message,
    expires_at,
    is_active,
    accessed_at,
    download_count,
    created_at,
    updated_at
)
SELECT 
    a.id,
    a.owner_id,
    shared_with.id,
    permissions.level,
    'Shared via email-to-asset processing system',
    CASE 
        WHEN random() > 0.7 THEN NOW() + INTERVAL '30 days' 
        ELSE NULL 
    END,
    true,
    CASE 
        WHEN random() > 0.5 THEN NOW() - (random() * INTERVAL '5 days')
        ELSE NULL 
    END,
    (random() * 3)::integer,
    NOW() - (random() * INTERVAL '7 days'),
    NOW() - (random() * INTERVAL '7 days')
FROM assets a
JOIN users owner ON a.owner_id = owner.id
CROSS JOIN (
    SELECT id FROM users 
    WHERE email IN ('test.director@appboardguru.com', 'admin.user@appboardguru.com', 'board.member@appboardguru.com')
) shared_with
CROSS JOIN (VALUES
    ('view'),
    ('download'),
    ('edit')
) AS permissions(level)
WHERE a.source_type = 'email'
AND a.owner_id != shared_with.id
AND random() > 0.6 -- Only share 40% of assets
LIMIT 15; -- Limit to prevent too many shares

-- =====================================================
-- 6. VERIFICATION AND REPORTING
-- =====================================================

-- Display comprehensive summary
DO $$
DECLARE
    total_assets INTEGER;
    email_assets INTEGER;
    upload_assets INTEGER;
    total_shares INTEGER;
    avg_file_size_mb NUMERIC;
BEGIN
    SELECT COUNT(*) INTO total_assets FROM assets;
    SELECT COUNT(*) INTO email_assets FROM assets WHERE source_type = 'email';
    SELECT COUNT(*) INTO upload_assets FROM assets WHERE source_type = 'upload';
    SELECT COUNT(*) INTO total_shares FROM asset_shares;
    SELECT ROUND(AVG(file_size / 1024.0 / 1024.0), 2) INTO avg_file_size_mb FROM assets;
    
    RAISE NOTICE '=== ASSETS CREATION SUMMARY ===';
    RAISE NOTICE 'Total assets created: %', total_assets;
    RAISE NOTICE 'Email-sourced assets: %', email_assets;
    RAISE NOTICE 'Upload-sourced assets: %', upload_assets;
    RAISE NOTICE 'Asset shares created: %', total_shares;
    RAISE NOTICE 'Average file size: % MB', avg_file_size_mb;
END $$;

-- Display assets by user and source
SELECT 
    u.email as owner_email,
    u.full_name as owner_name,
    a.source_type,
    COUNT(*) as asset_count,
    ROUND(AVG(a.file_size / 1024.0 / 1024.0), 2) as avg_size_mb,
    SUM(a.download_count) as total_downloads,
    SUM(a.view_count) as total_views
FROM assets a
JOIN users u ON a.owner_id = u.id
WHERE u.email IN ('test.director@appboardguru.com', 'admin.user@appboardguru.com', 'board.member@appboardguru.com')
GROUP BY u.id, u.email, u.full_name, a.source_type
ORDER BY u.email, a.source_type;

-- Display sample of email-sourced assets
SELECT 
    a.title,
    a.category,
    a.file_type,
    ROUND(a.file_size / 1024.0 / 1024.0, 2) as size_mb,
    a.source_email,
    epl.subject as original_email_subject,
    a.created_at
FROM assets a
LEFT JOIN email_processing_logs epl ON a.email_message_id = epl.message_id
WHERE a.source_type = 'email'
ORDER BY a.created_at DESC
LIMIT 10;

-- Display asset categories breakdown
SELECT 
    category,
    COUNT(*) as asset_count,
    ROUND(AVG(file_size / 1024.0 / 1024.0), 2) as avg_size_mb,
    source_type
FROM assets
WHERE owner_id IN (
    SELECT id FROM users 
    WHERE email IN ('test.director@appboardguru.com', 'admin.user@appboardguru.com', 'board.member@appboardguru.com')
)
GROUP BY category, source_type
ORDER BY asset_count DESC;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$ 
BEGIN 
    RAISE NOTICE '';
    RAISE NOTICE '=== SYNTHETIC ASSETS CREATED SUCCESSFULLY ===';
    RAISE NOTICE 'Created realistic asset data including:';
    RAISE NOTICE '- Assets linked to completed email processing logs';
    RAISE NOTICE '- Various file types (PDF, DOCX, XLSX, PPTX)';
    RAISE NOTICE '- Realistic file sizes and metadata';
    RAISE NOTICE '- Asset sharing relationships';
    RAISE NOTICE '- Regular uploaded assets for comparison';
    RAISE NOTICE '- Proper categorization and tagging';
    RAISE NOTICE '';
    RAISE NOTICE 'Database setup complete! You can now:';
    RAISE NOTICE '1. Test login with test.director@appboardguru.com';
    RAISE NOTICE '2. View assets in the dashboard';
    RAISE NOTICE '3. See email processing history';
    RAISE NOTICE '4. Test the email-to-asset functionality';
END $$;