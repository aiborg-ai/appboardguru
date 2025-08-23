-- =====================================================
-- EMAIL-TO-ASSET SYNTHETIC EMAIL PROCESSING LOGS
-- Script 3: Create realistic email processing test data
-- Run this third in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. GET TEST USER AND ORGANIZATION IDs
-- =====================================================

DO $$
DECLARE
    test_user_id UUID;
    test_org_id UUID;
    admin_user_id UUID;
    member_user_id UUID;
BEGIN
    -- Get user IDs
    SELECT id INTO test_user_id FROM users WHERE email = 'test.director@appboardguru.com';
    SELECT id INTO admin_user_id FROM users WHERE email = 'admin.user@appboardguru.com';
    SELECT id INTO member_user_id FROM users WHERE email = 'board.member@appboardguru.com';
    SELECT id INTO test_org_id FROM organizations WHERE slug = 'test-board-org';
    
    IF test_user_id IS NULL OR test_org_id IS NULL THEN
        RAISE EXCEPTION 'Test user or organization not found. Please run script 02 first.';
    END IF;
    
    RAISE NOTICE 'Found test user: %', test_user_id;
    RAISE NOTICE 'Found test organization: %', test_org_id;
END $$;

-- =====================================================
-- 2. CREATE SYNTHETIC EMAIL PROCESSING LOGS
-- =====================================================

-- Clear existing email processing logs for test users (optional)
DELETE FROM email_processing_logs 
WHERE user_id IN (
    SELECT id FROM users 
    WHERE email IN ('test.director@appboardguru.com', 'admin.user@appboardguru.com', 'board.member@appboardguru.com')
);

-- Insert comprehensive email processing logs with realistic data
INSERT INTO email_processing_logs (
    id,
    message_id,
    from_email,
    to_email,
    subject,
    status,
    user_id,
    organization_id,
    assets_created,
    error_message,
    processing_time_ms,
    created_at,
    updated_at
)
SELECT 
    gen_random_uuid(),
    message_id,
    from_email,
    to_email,
    subject,
    status::email_processing_status,
    user_id,
    org_id,
    assets_created::UUID[],
    error_message,
    processing_time_ms,
    created_at,
    updated_at
FROM (
    SELECT 
        users.id as user_id,
        orgs.id as org_id,
        data.*
    FROM (VALUES
        -- Successful email processing logs
        (
            'msg_' || generate_random_uuid()::text,
            'test.director@appboardguru.com',
            'assets@appboardguru.com',
            'Asset:: Q4 Board Meeting Minutes 2024',
            'completed',
            ARRAY[gen_random_uuid(), gen_random_uuid()]::text[],
            NULL,
            1245,
            NOW() - INTERVAL '2 hours',
            NOW() - INTERVAL '2 hours'
        ),
        (
            'msg_' || generate_random_uuid()::text,
            'test.director@appboardguru.com',
            'assets@appboardguru.com',
            'Asset:: Financial Report - December 2024',
            'completed',
            ARRAY[gen_random_uuid()]::text[],
            NULL,
            2100,
            NOW() - INTERVAL '1 day',
            NOW() - INTERVAL '1 day'
        ),
        (
            'msg_' || generate_random_uuid()::text,
            'test.director@appboardguru.com',
            'assets@appboardguru.com',
            'Asset:: Compliance Documentation Update',
            'completed',
            ARRAY[gen_random_uuid(), gen_random_uuid(), gen_random_uuid()]::text[],
            NULL,
            3250,
            NOW() - INTERVAL '3 days',
            NOW() - INTERVAL '3 days'
        ),
        (
            'msg_' || generate_random_uuid()::text,
            'admin.user@appboardguru.com',
            'assets@appboardguru.com',
            'Asset:: Strategic Planning Documents',
            'completed',
            ARRAY[gen_random_uuid()]::text[],
            NULL,
            1800,
            NOW() - INTERVAL '5 days',
            NOW() - INTERVAL '5 days'
        ),
        (
            'msg_' || generate_random_uuid()::text,
            'board.member@appboardguru.com',
            'assets@appboardguru.com',
            'Asset:: Risk Assessment Report',
            'completed',
            ARRAY[gen_random_uuid(), gen_random_uuid()]::text[],
            NULL,
            2750,
            NOW() - INTERVAL '1 week',
            NOW() - INTERVAL '1 week'
        ),
        
        -- Currently processing emails
        (
            'msg_' || generate_random_uuid()::text,
            'test.director@appboardguru.com',
            'assets@appboardguru.com',
            'Asset:: Budget Proposal 2025',
            'processing',
            ARRAY[]::text[],
            NULL,
            0,
            NOW() - INTERVAL '5 minutes',
            NOW() - INTERVAL '5 minutes'
        ),
        (
            'msg_' || generate_random_uuid()::text,
            'admin.user@appboardguru.com',
            'assets@appboardguru.com',
            'Asset:: Legal Review Documents',
            'processing',
            ARRAY[]::text[],
            NULL,
            0,
            NOW() - INTERVAL '10 minutes',
            NOW() - INTERVAL '2 minutes'
        ),
        
        -- Failed processing emails (with errors)
        (
            'msg_' || generate_random_uuid()::text,
            'test.director@appboardguru.com',
            'assets@appboardguru.com',
            'Asset:: Large Presentation Files',
            'failed',
            ARRAY[]::text[],
            'File size exceeded maximum limit of 50MB (attachment: presentation.pptx - 75MB)',
            0,
            NOW() - INTERVAL '2 days',
            NOW() - INTERVAL '2 days'
        ),
        (
            'msg_' || generate_random_uuid()::text,
            'admin.user@appboardguru.com',
            'assets@appboardguru.com',
            'Asset:: Corrupted Document Upload',
            'failed',
            ARRAY[]::text[],
            'File processing failed: Unable to read document format (attachment: corrupted.docx)',
            450,
            NOW() - INTERVAL '4 days',
            NOW() - INTERVAL '4 days'
        ),
        
        -- Rejected emails (validation failures)
        (
            'msg_' || generate_random_uuid()::text,
            'unknown.sender@external.com',
            'assets@appboardguru.com',
            'Asset:: Attempted External Upload',
            'rejected',
            ARRAY[]::text[],
            'Sender email not found in registered users',
            150,
            NOW() - INTERVAL '6 days',
            NOW() - INTERVAL '6 days'
        ),
        (
            'msg_' || generate_random_uuid()::text,
            'test.director@appboardguru.com',
            'assets@appboardguru.com',
            'Wrong Subject Format - Missing Asset Prefix',
            'rejected',
            ARRAY[]::text[],
            'Subject must start with "Asset::"',
            75,
            NOW() - INTERVAL '1 week',
            NOW() - INTERVAL '1 week'
        ),
        (
            'msg_' || generate_random_uuid()::text,
            'board.member@appboardguru.com',
            'assets@appboardguru.com',
            'Asset:: Executable File Upload Attempt',
            'rejected',
            ARRAY[]::text[],
            'File type not allowed: application/octet-stream (malware.exe)',
            200,
            NOW() - INTERVAL '2 weeks',
            NOW() - INTERVAL '2 weeks'
        ),
        
        -- Recently received emails
        (
            'msg_' || generate_random_uuid()::text,
            'test.director@appboardguru.com',
            'assets@appboardguru.com',
            'Asset:: Committee Meeting Notes',
            'received',
            ARRAY[]::text[],
            NULL,
            0,
            NOW() - INTERVAL '30 seconds',
            NOW() - INTERVAL '30 seconds'
        ),
        (
            'msg_' || generate_random_uuid()::text,
            'admin.user@appboardguru.com',
            'assets@appboardguru.com',
            'Asset:: Annual Report Draft',
            'received',
            ARRAY[]::text[],
            NULL,
            0,
            NOW() - INTERVAL '2 minutes',
            NOW() - INTERVAL '2 minutes'
        )
    ) AS data(message_id, from_email, to_email, subject, status, assets_created, error_message, processing_time_ms, created_at, updated_at)
    CROSS JOIN (
        SELECT 
            u.id,
            o.id as org_id
        FROM users u
        CROSS JOIN organizations o
        WHERE u.email IN ('test.director@appboardguru.com', 'admin.user@appboardguru.com', 'board.member@appboardguru.com')
        AND o.slug = 'test-board-org'
        AND u.email = data.from_email
    ) AS users(id, org_id)
);

-- =====================================================
-- 3. CREATE ADDITIONAL HISTORICAL DATA
-- =====================================================

-- Add some historical email processing data to show trends
INSERT INTO email_processing_logs (
    message_id,
    from_email,
    to_email,
    subject,
    status,
    user_id,
    organization_id,
    assets_created,
    processing_time_ms,
    created_at,
    updated_at
)
SELECT 
    'msg_hist_' || generate_random_uuid()::text,
    users.email,
    'assets@appboardguru.com',
    'Asset:: ' || subjects.subject,
    statuses.status::email_processing_status,
    users.id,
    org.id,
    CASE 
        WHEN statuses.status = 'completed' THEN ARRAY[gen_random_uuid()]::UUID[]
        ELSE ARRAY[]::UUID[]
    END,
    CASE 
        WHEN statuses.status = 'completed' THEN (random() * 3000 + 500)::integer
        WHEN statuses.status = 'failed' THEN (random() * 1000 + 100)::integer
        ELSE 0
    END,
    NOW() - (random() * INTERVAL '30 days'),
    NOW() - (random() * INTERVAL '30 days')
FROM (
    SELECT id, email FROM users 
    WHERE email IN ('test.director@appboardguru.com', 'admin.user@appboardguru.com', 'board.member@appboardguru.com')
) users
CROSS JOIN (
    SELECT id FROM organizations WHERE slug = 'test-board-org'
) org
CROSS JOIN (VALUES
    ('Monthly Financial Summary'),
    ('Board Resolution Documents'),
    ('Audit Trail Report'),
    ('Stakeholder Communications'),
    ('Policy Update Documentation'),
    ('Meeting Agenda Items'),
    ('Action Item Tracking'),
    ('Quarterly Review Materials'),
    ('Compliance Checklist'),
    ('Executive Summary')
) AS subjects(subject)
CROSS JOIN (VALUES
    ('completed', 0.7),  -- 70% success rate
    ('failed', 0.15),    -- 15% failure rate
    ('rejected', 0.15)   -- 15% rejection rate
) AS statuses(status, weight)
WHERE random() < statuses.weight
LIMIT 25; -- Create 25 additional historical records

-- =====================================================
-- 4. UPDATE SOME LOGS TO SHOW RATE LIMITING
-- =====================================================

-- Add some rate-limited examples (realistic scenario)
INSERT INTO email_processing_logs (
    message_id,
    from_email,
    to_email,
    subject,
    status,
    user_id,
    organization_id,
    error_message,
    processing_time_ms,
    created_at,
    updated_at
)
SELECT 
    'msg_rate_limit_' || i,
    'test.director@appboardguru.com',
    'assets@appboardguru.com',
    'Asset:: Bulk Upload Attempt ' || i,
    'rejected'::email_processing_status,
    u.id,
    o.id,
    'Rate limit exceeded: 10 emails per hour maximum',
    50,
    NOW() - INTERVAL '1 hour' - (i * INTERVAL '2 minutes'),
    NOW() - INTERVAL '1 hour' - (i * INTERVAL '2 minutes')
FROM generate_series(11, 15) AS i
CROSS JOIN (
    SELECT u.id, o.id 
    FROM users u, organizations o 
    WHERE u.email = 'test.director@appboardguru.com' 
    AND o.slug = 'test-board-org'
) AS ids(u.id, o.id);

-- =====================================================
-- 5. VERIFY EMAIL PROCESSING LOGS
-- =====================================================

-- Display summary of created logs
DO $$
DECLARE
    total_logs INTEGER;
    completed_logs INTEGER;
    failed_logs INTEGER;
    rejected_logs INTEGER;
    processing_logs INTEGER;
    received_logs INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_logs FROM email_processing_logs;
    SELECT COUNT(*) INTO completed_logs FROM email_processing_logs WHERE status = 'completed';
    SELECT COUNT(*) INTO failed_logs FROM email_processing_logs WHERE status = 'failed';
    SELECT COUNT(*) INTO rejected_logs FROM email_processing_logs WHERE status = 'rejected';
    SELECT COUNT(*) INTO processing_logs FROM email_processing_logs WHERE status = 'processing';
    SELECT COUNT(*) INTO received_logs FROM email_processing_logs WHERE status = 'received';
    
    RAISE NOTICE '=== EMAIL PROCESSING LOGS SUMMARY ===';
    RAISE NOTICE 'Total logs created: %', total_logs;
    RAISE NOTICE 'Completed: % (%.1f%%)', completed_logs, (completed_logs::float / total_logs * 100);
    RAISE NOTICE 'Failed: % (%.1f%%)', failed_logs, (failed_logs::float / total_logs * 100);
    RAISE NOTICE 'Rejected: % (%.1f%%)', rejected_logs, (rejected_logs::float / total_logs * 100);
    RAISE NOTICE 'Processing: %', processing_logs;
    RAISE NOTICE 'Received: %', received_logs;
END $$;

-- Display sample of logs by user
SELECT 
    u.email as user_email,
    epl.subject,
    epl.status,
    epl.processing_time_ms,
    CASE 
        WHEN epl.error_message IS NOT NULL THEN LEFT(epl.error_message, 50) || '...'
        ELSE 'Success'
    END as result,
    epl.created_at
FROM email_processing_logs epl
JOIN users u ON epl.user_id = u.id
ORDER BY epl.created_at DESC
LIMIT 15;

-- Display processing statistics by user
SELECT 
    u.email as user_email,
    u.full_name,
    COUNT(*) as total_emails,
    COUNT(CASE WHEN epl.status = 'completed' THEN 1 END) as successful_emails,
    COUNT(CASE WHEN epl.status = 'failed' THEN 1 END) as failed_emails,
    COUNT(CASE WHEN epl.status = 'rejected' THEN 1 END) as rejected_emails,
    ROUND(AVG(epl.processing_time_ms)) as avg_processing_time_ms,
    SUM(array_length(epl.assets_created, 1)) as total_assets_created
FROM email_processing_logs epl
JOIN users u ON epl.user_id = u.id
GROUP BY u.id, u.email, u.full_name
ORDER BY total_emails DESC;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$ 
BEGIN 
    RAISE NOTICE '';
    RAISE NOTICE '=== EMAIL PROCESSING LOGS CREATED ===';
    RAISE NOTICE 'Created comprehensive email processing test data including:';
    RAISE NOTICE '- Successful processing examples';
    RAISE NOTICE '- Failed processing with realistic errors';
    RAISE NOTICE '- Rejected emails (validation failures)';
    RAISE NOTICE '- Currently processing emails';
    RAISE NOTICE '- Historical data for trends';
    RAISE NOTICE '- Rate limiting examples';
    RAISE NOTICE '';
    RAISE NOTICE 'Next: Run script 04-synthetic-assets.sql to create linked asset data';
END $$;