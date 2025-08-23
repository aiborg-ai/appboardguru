-- =====================================================
-- FEEDBACK SYSTEM SYNTHETIC DATA
-- Creates 10+ realistic feedback submissions for test.director user
-- Run AFTER feedback-system-setup.sql
-- =====================================================

-- =====================================================
-- STEP 1: VERIFY TEST USER EXISTS
-- =====================================================

-- Check if test.director user exists
DO $$
DECLARE
    test_user_id UUID;
    test_org_id UUID;
BEGIN
    -- Get test user ID
    SELECT id INTO test_user_id 
    FROM users 
    WHERE email = 'test.director@appboardguru.com';
    
    -- Get test organization ID
    SELECT id INTO test_org_id 
    FROM organizations 
    WHERE slug = 'test-board-org';
    
    IF test_user_id IS NULL THEN
        RAISE EXCEPTION 'Test user test.director@appboardguru.com not found. Please run 02-test-user-setup.sql first.';
    END IF;
    
    IF test_org_id IS NULL THEN
        RAISE NOTICE 'WARNING: Test organization not found. Feedback will be created without organization_id.';
    END IF;
    
    RAISE NOTICE 'Test User ID: %', test_user_id;
    RAISE NOTICE 'Test Organization ID: %', COALESCE(test_org_id::text, 'Not found');
END $$;

-- =====================================================
-- STEP 2: CREATE SYNTHETIC FEEDBACK DATA
-- =====================================================

-- Insert realistic feedback submissions for test.director user
INSERT INTO feedback_submissions (
    reference_id,
    user_id,
    user_email,
    organization_id,
    type,
    title,
    description,
    screenshot_included,
    user_agent,
    page_url,
    admin_email_sent,
    user_email_sent,
    status,
    priority,
    admin_notes,
    resolution_notes,
    assigned_to,
    created_at,
    updated_at,
    resolved_at
)
SELECT 
    feedback_data.reference_id,
    test_user.id as user_id,
    test_user.email as user_email,
    test_org.id as organization_id,
    feedback_data.type,
    feedback_data.title,
    feedback_data.description,
    feedback_data.screenshot_included,
    feedback_data.user_agent,
    feedback_data.page_url,
    feedback_data.admin_email_sent,
    feedback_data.user_email_sent,
    feedback_data.status,
    feedback_data.priority,
    feedback_data.admin_notes,
    feedback_data.resolution_notes,
    CASE 
        WHEN feedback_data.status IN ('resolved', 'closed') THEN admin_user.id
        ELSE NULL 
    END as assigned_to,
    feedback_data.created_at,
    feedback_data.updated_at,
    feedback_data.resolved_at
FROM 
    users test_user
    LEFT JOIN organizations test_org ON test_org.slug = 'test-board-org'
    LEFT JOIN users admin_user ON admin_user.email = 'admin.user@appboardguru.com'
    CROSS JOIN (
        VALUES 
        -- Recent bug reports
        (
            'FB-' || UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 10)),
            'bug'::TEXT,
            'Login Page Not Responding'::TEXT,
            'When I try to log in to the dashboard, the page becomes unresponsive after clicking the login button. This happens consistently across different browsers (Chrome, Firefox, Safari). I have to refresh the page multiple times to get it working. This is very frustrating and impacts my daily workflow.'::TEXT,
            true::BOOLEAN,
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'::TEXT,
            '/auth/signin'::TEXT,
            true::BOOLEAN,
            true::BOOLEAN,
            'new'::TEXT,
            'high'::TEXT,
            NULL::TEXT,
            NULL::TEXT,
            NOW() - INTERVAL '2 hours',
            NOW() - INTERVAL '2 hours',
            NULL::TIMESTAMP
        ),
        (
            'FB-' || UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 10)),
            'bug'::TEXT,
            'File Upload Fails for Large PDFs'::TEXT,
            'Cannot upload PDF files larger than 10MB to the vault. The upload progress bar reaches 100% but then shows an error message "Upload failed - please try again". Smaller files (under 5MB) work fine. This is blocking our board meeting preparation as we need to upload our annual report.'::TEXT,
            true::BOOLEAN,
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'::TEXT,
            '/dashboard/vaults/upload'::TEXT,
            true::BOOLEAN,
            true::BOOLEAN,
            'in_review'::TEXT,
            'high'::TEXT,
            'Investigating file size limits and server configuration.'::TEXT,
            NULL::TEXT,
            NOW() - INTERVAL '1 day',
            NOW() - INTERVAL '4 hours',
            NULL::TIMESTAMP
        ),
        (
            'FB-' || UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 10)),
            'bug'::TEXT,
            'Dashboard Loading Very Slowly'::TEXT,
            'The main dashboard takes 15-20 seconds to load completely. All the widgets appear one by one very slowly. My internet connection is fine (100Mbps) and other websites load normally. This started happening about a week ago.'::TEXT,
            false::BOOLEAN,
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1.2 Safari/605.1.15'::TEXT,
            '/dashboard'::TEXT,
            true::BOOLEAN,
            true::BOOLEAN,
            'resolved'::TEXT,
            'medium'::TEXT,
            'Performance issue identified and fixed in latest deployment.'::TEXT,
            'Optimized database queries and implemented caching. Dashboard now loads in under 3 seconds.'::TEXT,
            NOW() - INTERVAL '3 days',
            NOW() - INTERVAL '1 day',
            NOW() - INTERVAL '1 day'
        ),
        -- Feature requests
        (
            'FB-' || UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 10)),
            'feature'::TEXT,
            'Add Dark Mode Theme'::TEXT,
            'It would be great to have a dark mode option for the application. I often work late evenings and the bright white interface causes eye strain. A toggle in the settings to switch between light and dark themes would be very helpful. Many modern applications have this feature.'::TEXT,
            false::BOOLEAN,
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'::TEXT,
            '/dashboard/settings'::TEXT,
            true::BOOLEAN,
            true::BOOLEAN,
            'new'::TEXT,
            'medium'::TEXT,
            NULL::TEXT,
            NULL::TEXT,
            NOW() - INTERVAL '5 days',
            NOW() - INTERVAL '5 days',
            NULL::TIMESTAMP
        ),
        (
            'FB-' || UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 10)),
            'feature'::TEXT,
            'Mobile App Support'::TEXT,
            'Please consider developing a mobile app for iOS and Android. It would be very convenient to review documents and participate in discussions while traveling. Basic features like viewing meeting agendas, reading documents, and receiving notifications would be sufficient for the mobile version.'::TEXT,
            false::BOOLEAN,
            'Mozilla/5.0 (iPad; CPU OS 17_1_2 like Mac OS X) AppleWebKit/605.1.15'::TEXT,
            '/dashboard/meetings'::TEXT,
            true::BOOLEAN,
            true::BOOLEAN,
            'new'::TEXT,
            'low'::TEXT,
            NULL::TEXT,
            NULL::TEXT,
            NOW() - INTERVAL '1 week',
            NOW() - INTERVAL '1 week',
            NULL::TIMESTAMP
        ),
        (
            'FB-' || UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 10)),
            'feature'::TEXT,
            'Email Notifications for Comments'::TEXT,
            'Could you add email notifications when someone comments on a document or discussion that I''m involved in? Currently I have to manually check for new comments. An email summary of activity would help me stay updated without constantly checking the platform.'::TEXT,
            false::BOOLEAN,
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'::TEXT,
            '/dashboard/documents'::TEXT,
            true::BOOLEAN,
            true::BOOLEAN,
            'in_review'::TEXT,
            'medium'::TEXT,
            'Feature request under consideration for Q2 roadmap.'::TEXT,
            NULL::TEXT,
            NOW() - INTERVAL '4 days',
            NOW() - INTERVAL '2 days',
            NULL::TIMESTAMP
        ),
        -- Improvements
        (
            'FB-' || UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 10)),
            'improvement'::TEXT,
            'Improve Search Functionality'::TEXT,
            'The current search feature could be enhanced. It would be helpful if it could search inside document content, not just titles. Also, filters for date range, document type, and author would make finding specific information much easier. Sometimes I spend too much time looking for old meeting minutes.'::TEXT,
            true::BOOLEAN,
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0'::TEXT,
            '/dashboard/search'::TEXT,
            true::BOOLEAN,
            true::BOOLEAN,
            'resolved'::TEXT,
            'medium'::TEXT,
            'Search improvements implemented with full-text search capability.'::TEXT,
            'Added full-text search, date filters, and author filtering. Search now indexes document content and provides more relevant results.'::TEXT,
            NOW() - INTERVAL '2 weeks',
            NOW() - INTERVAL '3 days',
            NOW() - INTERVAL '3 days'
        ),
        (
            'FB-' || UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 10)),
            'improvement'::TEXT,
            'Better Meeting Schedule Display'::TEXT,
            'The meeting calendar could show more information at a glance. Maybe include the meeting type (board meeting, committee meeting, etc.) and participant count directly on the calendar view. Currently I have to click on each meeting to see basic details.'::TEXT,
            false::BOOLEAN,
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'::TEXT,
            '/dashboard/calendar'::TEXT,
            true::BOOLEAN,
            true::BOOLEAN,
            'new'::TEXT,
            'low'::TEXT,
            NULL::TEXT,
            NULL::TEXT,
            NOW() - INTERVAL '6 days',
            NOW() - INTERVAL '6 days',
            NULL::TIMESTAMP
        ),
        -- General feedback
        (
            'FB-' || UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 10)),
            'other'::TEXT,
            'Overall Platform Experience'::TEXT,
            'I wanted to share some general feedback about the platform. Overall, I''m very satisfied with the functionality and ease of use. The document management features are particularly helpful for our board meetings. The interface is intuitive and my colleagues adapted to it quickly. Thank you for building such a useful tool for governance!'::TEXT,
            false::BOOLEAN,
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'::TEXT,
            '/dashboard'::TEXT,
            true::BOOLEAN,
            true::BOOLEAN,
            'closed'::TEXT,
            NULL::TEXT,
            'Thank you for the positive feedback! We appreciate users like you.'::TEXT,
            'Feedback acknowledged and shared with the development team for motivation.'::TEXT,
            NOW() - INTERVAL '10 days',
            NOW() - INTERVAL '8 days',
            NOW() - INTERVAL '8 days'
        ),
        (
            'FB-' || UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 10)),
            'other'::TEXT,
            'Suggestion for User Onboarding'::TEXT,
            'New board members might benefit from a guided tour or tutorial when they first access the platform. While the interface is user-friendly, there are many features and it can be overwhelming initially. A step-by-step walkthrough of key features would be valuable.'::TEXT,
            false::BOOLEAN,
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'::TEXT,
            '/dashboard/settings'::TEXT,
            true::BOOLEAN,
            true::BOOLEAN,
            'new'::TEXT,
            'medium'::TEXT,
            NULL::TEXT,
            NULL::TEXT,
            NOW() - INTERVAL '8 days',
            NOW() - INTERVAL '8 days',
            NULL::TIMESTAMP
        ),
        -- Additional recent feedback
        (
            'FB-' || UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 10)),
            'bug'::TEXT,
            'Notification Bell Not Updating'::TEXT,
            'The notification bell icon in the header doesn''t update to show new notifications. I have to refresh the page to see if there are new items. The red notification badge should appear automatically when new activities occur.'::TEXT,
            true::BOOLEAN,
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'::TEXT,
            '/dashboard'::TEXT,
            true::BOOLEAN,
            true::BOOLEAN,
            'in_review'::TEXT,
            'medium'::TEXT,
            'Investigating real-time notification updates.'::TEXT,
            NULL::TEXT,
            NOW() - INTERVAL '12 hours',
            NOW() - INTERVAL '6 hours',
            NULL::TIMESTAMP
        ),
        (
            'FB-' || UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 10)),
            'improvement'::TEXT,
            'Export Meeting Minutes to PDF'::TEXT,
            'It would be helpful to have an export function for meeting minutes in PDF format. Currently we can view them online, but for archival purposes and sharing with external parties, a PDF export would be very useful. The exported PDF should maintain formatting and include attachments if possible.'::TEXT,
            false::BOOLEAN,
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'::TEXT,
            '/dashboard/meetings'::TEXT,
            true::BOOLEAN,
            true::BOOLEAN,
            'new'::TEXT,
            'medium'::TEXT,
            NULL::TEXT,
            NULL::TEXT,
            NOW() - INTERVAL '18 hours',
            NOW() - INTERVAL '18 hours',
            NULL::TIMESTAMP
        )
    ) AS feedback_data(
        reference_id, type, title, description, screenshot_included, 
        user_agent, page_url, admin_email_sent, user_email_sent, 
        status, priority, admin_notes, resolution_notes, 
        created_at, updated_at, resolved_at
    )
WHERE test_user.email = 'test.director@appboardguru.com';

-- =====================================================
-- STEP 3: CREATE ADDITIONAL FEEDBACK FROM OTHER USERS
-- =====================================================

-- Add some feedback from other test users for more realistic data
INSERT INTO feedback_submissions (
    reference_id,
    user_id,
    user_email,
    organization_id,
    type,
    title,
    description,
    screenshot_included,
    user_agent,
    page_url,
    admin_email_sent,
    user_email_sent,
    status,
    priority,
    created_at,
    updated_at
)
SELECT 
    'FB-' || UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 10)),
    other_users.id,
    other_users.email,
    test_org.id,
    feedback_data.type,
    feedback_data.title,
    feedback_data.description,
    feedback_data.screenshot_included,
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    feedback_data.page_url,
    true,
    true,
    feedback_data.status,
    feedback_data.priority,
    feedback_data.created_at,
    feedback_data.created_at
FROM 
    users other_users
    LEFT JOIN organizations test_org ON test_org.slug = 'test-board-org'
    CROSS JOIN (
        VALUES 
        (
            'feature'::TEXT,
            'Two-Factor Authentication'::TEXT,
            'For security purposes, it would be great to have two-factor authentication available for all users. This would add an extra layer of security to protect sensitive board information.'::TEXT,
            false::BOOLEAN,
            '/dashboard/settings'::TEXT,
            'new'::TEXT,
            'high'::TEXT,
            NOW() - INTERVAL '3 days'
        ),
        (
            'bug'::TEXT,
            'Calendar Event Timezone Issues'::TEXT,
            'Meeting times are showing in the wrong timezone. I''m in EST but meetings are displaying in PST. This is causing confusion about actual meeting start times.'::TEXT,
            false::BOOLEAN,
            '/dashboard/calendar'::TEXT,
            'in_review'::TEXT,
            'high'::TEXT,
            NOW() - INTERVAL '1 day'
        )
    ) AS feedback_data(type, title, description, screenshot_included, page_url, status, priority, created_at)
WHERE other_users.email IN ('board.member@appboardguru.com', 'admin.user@appboardguru.com');

-- =====================================================
-- STEP 4: VERIFY DATA CREATION
-- =====================================================

-- Count total feedback by user
SELECT 
    u.email,
    u.full_name,
    COUNT(fs.id) as feedback_count,
    COUNT(CASE WHEN fs.type = 'bug' THEN 1 END) as bugs,
    COUNT(CASE WHEN fs.type = 'feature' THEN 1 END) as features,
    COUNT(CASE WHEN fs.type = 'improvement' THEN 1 END) as improvements,
    COUNT(CASE WHEN fs.type = 'other' THEN 1 END) as other
FROM users u
LEFT JOIN feedback_submissions fs ON u.id = fs.user_id
WHERE u.email IN (
    'test.director@appboardguru.com',
    'board.member@appboardguru.com',
    'admin.user@appboardguru.com'
)
GROUP BY u.id, u.email, u.full_name
ORDER BY feedback_count DESC;

-- Display feedback statistics
SELECT 
    'Total Feedback' as metric,
    COUNT(*) as count
FROM feedback_submissions
UNION ALL
SELECT 
    'By Status - New',
    COUNT(*) 
FROM feedback_submissions 
WHERE status = 'new'
UNION ALL
SELECT 
    'By Status - In Review',
    COUNT(*) 
FROM feedback_submissions 
WHERE status = 'in_review'
UNION ALL
SELECT 
    'By Status - Resolved',
    COUNT(*) 
FROM feedback_submissions 
WHERE status = 'resolved'
UNION ALL
SELECT 
    'By Type - Bugs',
    COUNT(*) 
FROM feedback_submissions 
WHERE type = 'bug'
UNION ALL
SELECT 
    'By Type - Features',
    COUNT(*) 
FROM feedback_submissions 
WHERE type = 'feature'
UNION ALL
SELECT 
    'With Screenshots',
    COUNT(*) 
FROM feedback_submissions 
WHERE screenshot_included = true;

-- Show recent feedback for test.director
SELECT 
    fs.reference_id,
    fs.type,
    fs.title,
    fs.status,
    fs.priority,
    fs.created_at,
    LENGTH(fs.description) as description_length
FROM feedback_submissions fs
JOIN users u ON fs.user_id = u.id
WHERE u.email = 'test.director@appboardguru.com'
ORDER BY fs.created_at DESC
LIMIT 10;

-- Test the statistics view
SELECT * FROM feedback_statistics;

-- Success message
DO $$ 
DECLARE
    total_feedback INTEGER;
    test_director_feedback INTEGER;
BEGIN 
    SELECT COUNT(*) INTO total_feedback FROM feedback_submissions;
    
    SELECT COUNT(*) INTO test_director_feedback 
    FROM feedback_submissions fs
    JOIN users u ON fs.user_id = u.id
    WHERE u.email = 'test.director@appboardguru.com';
    
    RAISE NOTICE '';
    RAISE NOTICE '=== FEEDBACK SYNTHETIC DATA CREATED ===';
    RAISE NOTICE 'Total feedback submissions: %', total_feedback;
    RAISE NOTICE 'Feedback from test.director: %', test_director_feedback;
    RAISE NOTICE 'Feedback includes: bugs, features, improvements, and general feedback';
    RAISE NOTICE 'Various statuses: new, in_review, resolved, closed';
    RAISE NOTICE 'Realistic content and metadata included';
    RAISE NOTICE '';
    RAISE NOTICE 'You can now test the feedback system at: /dashboard/feedback';
    RAISE NOTICE 'Test user credentials: test.director@appboardguru.com';
END $$;