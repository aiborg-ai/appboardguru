-- =====================================================
-- EMAIL-TO-ASSET TEST USER SETUP
-- Script 2: Create test.director user and test organization
-- Run this second in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. CREATE TEST USER IN AUTH.USERS
-- =====================================================

-- Insert test user into Supabase auth.users table
-- This simulates a user that has signed up via Supabase Auth
INSERT INTO auth.users (
    id,
    aud,
    role,
    email,
    email_confirmed_at,
    phone,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(), -- This will be our test user ID
    'authenticated',
    'authenticated',
    'test.director@appboardguru.com',
    NOW(),
    NULL,
    '',
    '',
    '',
    '',
    NOW(),
    '{"provider": "email", "providers": ["email"]}',
    '{"full_name": "Test Director", "email": "test.director@appboardguru.com"}',
    false,
    NOW(),
    NOW()
)
ON CONFLICT (email) DO UPDATE SET
    raw_user_meta_data = '{"full_name": "Test Director", "email": "test.director@appboardguru.com"}',
    email_confirmed_at = COALESCE(auth.users.email_confirmed_at, NOW()),
    last_sign_in_at = NOW(),
    updated_at = NOW();

-- Get the test user ID for later use
DO $$
DECLARE
    test_user_id UUID;
BEGIN
    -- Get the test user ID
    SELECT id INTO test_user_id 
    FROM auth.users 
    WHERE email = 'test.director@appboardguru.com';
    
    RAISE NOTICE 'Test user ID: %', test_user_id;
END $$;

-- =====================================================
-- 2. UPDATE/CREATE USER PROFILE
-- =====================================================

-- Insert or update the user profile in our users table
INSERT INTO users (
    id,
    email,
    full_name,
    role,
    status,
    company,
    position,
    approved_by,
    approved_at,
    created_at,
    updated_at
)
SELECT 
    auth.users.id,
    'test.director@appboardguru.com',
    'Test Director',
    'director'::user_role,
    'approved'::user_status,
    'AppBoardGuru Test Company',
    'Director of Testing',
    auth.users.id, -- Self-approved for testing
    NOW(),
    NOW(),
    NOW()
FROM auth.users 
WHERE email = 'test.director@appboardguru.com'
ON CONFLICT (id) DO UPDATE SET
    full_name = 'Test Director',
    role = 'director'::user_role,
    status = 'approved'::user_status,
    company = 'AppBoardGuru Test Company',
    position = 'Director of Testing',
    approved_at = COALESCE(users.approved_at, NOW()),
    updated_at = NOW();

-- =====================================================
-- 3. CREATE TEST ORGANIZATION
-- =====================================================

-- Create a test organization
INSERT INTO organizations (
    id,
    name,
    slug,
    description,
    website,
    industry,
    organization_size,
    created_by,
    is_active,
    created_at,
    updated_at
)
SELECT 
    gen_random_uuid(),
    'Test Board Organization',
    'test-board-org',
    'A test organization for demonstrating email-to-asset functionality',
    'https://test.appboardguru.com',
    'Software',
    'medium',
    auth.users.id,
    true,
    NOW(),
    NOW()
FROM auth.users 
WHERE email = 'test.director@appboardguru.com'
ON CONFLICT (slug) DO UPDATE SET
    name = 'Test Board Organization',
    description = 'A test organization for demonstrating email-to-asset functionality',
    updated_at = NOW();

-- =====================================================
-- 4. ADD TEST USER TO ORGANIZATION
-- =====================================================

-- Add the test user as owner of the test organization
INSERT INTO organization_members (
    organization_id,
    user_id,
    role,
    invited_by,
    joined_at,
    last_accessed,
    status,
    is_primary
)
SELECT 
    orgs.id,
    users.id,
    'owner'::organization_role,
    users.id,
    NOW(),
    NOW(),
    'active'::membership_status,
    true
FROM organizations orgs, users
WHERE orgs.slug = 'test-board-org' 
AND users.email = 'test.director@appboardguru.com'
ON CONFLICT (organization_id, user_id) DO UPDATE SET
    role = 'owner'::organization_role,
    status = 'active'::membership_status,
    is_primary = true,
    last_accessed = NOW();

-- =====================================================
-- 5. CREATE ADDITIONAL TEST USERS FOR REALISM
-- =====================================================

-- Create a few more test users for a realistic organization
INSERT INTO auth.users (
    id,
    aud,
    role,
    email,
    email_confirmed_at,
    phone,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at
) VALUES 
    (
        gen_random_uuid(),
        'authenticated',
        'authenticated',
        'board.member@appboardguru.com',
        NOW() - INTERVAL '5 days',
        NULL, '', '', '', '',
        NOW() - INTERVAL '1 day',
        '{"provider": "email", "providers": ["email"]}',
        '{"full_name": "Board Member", "email": "board.member@appboardguru.com"}',
        false,
        NOW() - INTERVAL '30 days',
        NOW() - INTERVAL '1 day'
    ),
    (
        gen_random_uuid(),
        'authenticated',
        'authenticated',
        'admin.user@appboardguru.com',
        NOW() - INTERVAL '10 days',
        NULL, '', '', '', '',
        NOW() - INTERVAL '2 hours',
        '{"provider": "email", "providers": ["email"]}',
        '{"full_name": "Admin User", "email": "admin.user@appboardguru.com"}',
        false,
        NOW() - INTERVAL '45 days',
        NOW() - INTERVAL '2 hours'
    )
ON CONFLICT (email) DO NOTHING;

-- Create corresponding user profiles
INSERT INTO users (id, email, full_name, role, status, company, position, created_at, updated_at)
SELECT 
    au.id,
    au.email,
    au.raw_user_meta_data->>'full_name',
    CASE 
        WHEN au.email LIKE '%admin%' THEN 'admin'::user_role
        ELSE 'member'::user_role
    END,
    'approved'::user_status,
    'AppBoardGuru Test Company',
    CASE 
        WHEN au.email LIKE '%admin%' THEN 'Administrator'
        WHEN au.email LIKE '%member%' THEN 'Board Member'
        ELSE 'Team Member'
    END,
    au.created_at,
    au.updated_at
FROM auth.users au
WHERE au.email IN ('board.member@appboardguru.com', 'admin.user@appboardguru.com')
ON CONFLICT (id) DO NOTHING;

-- Add these users to the test organization
INSERT INTO organization_members (organization_id, user_id, role, invited_by, joined_at, last_accessed, status)
SELECT 
    orgs.id,
    users.id,
    CASE 
        WHEN users.email LIKE '%admin%' THEN 'admin'::organization_role
        ELSE 'member'::organization_role
    END,
    director.id,
    users.created_at + INTERVAL '1 day',
    NOW() - INTERVAL '1 day',
    'active'::membership_status
FROM organizations orgs, users, users director
WHERE orgs.slug = 'test-board-org' 
AND users.email IN ('board.member@appboardguru.com', 'admin.user@appboardguru.com')
AND director.email = 'test.director@appboardguru.com'
ON CONFLICT (organization_id, user_id) DO NOTHING;

-- =====================================================
-- 6. VERIFY SETUP
-- =====================================================

-- Display verification information
DO $$
DECLARE
    test_user_id UUID;
    test_org_id UUID;
    member_count INTEGER;
BEGIN
    -- Get test user and organization IDs
    SELECT u.id INTO test_user_id 
    FROM users u 
    WHERE u.email = 'test.director@appboardguru.com';
    
    SELECT o.id INTO test_org_id 
    FROM organizations o 
    WHERE o.slug = 'test-board-org';
    
    SELECT COUNT(*) INTO member_count
    FROM organization_members om
    WHERE om.organization_id = test_org_id;
    
    RAISE NOTICE '=== TEST USER SETUP VERIFICATION ===';
    RAISE NOTICE 'Test User ID: %', test_user_id;
    RAISE NOTICE 'Test Organization ID: %', test_org_id;
    RAISE NOTICE 'Organization Members Count: %', member_count;
    
    IF test_user_id IS NOT NULL AND test_org_id IS NOT NULL THEN
        RAISE NOTICE 'SUCCESS: Test user and organization created successfully!';
    ELSE
        RAISE NOTICE 'WARNING: Setup may not be complete. Check the logs above.';
    END IF;
END $$;

-- Display user details for verification
SELECT 
    u.id,
    u.email,
    u.full_name,
    u.role,
    u.status,
    u.company,
    u.position
FROM users u
WHERE u.email IN (
    'test.director@appboardguru.com',
    'board.member@appboardguru.com', 
    'admin.user@appboardguru.com'
)
ORDER BY u.email;

-- Display organization details
SELECT 
    o.id,
    o.name,
    o.slug,
    o.description,
    o.created_by
FROM organizations o
WHERE o.slug = 'test-board-org';

-- Display organization membership
SELECT 
    om.id,
    u.email as member_email,
    u.full_name as member_name,
    om.role as member_role,
    om.status as member_status,
    om.is_primary
FROM organization_members om
JOIN users u ON om.user_id = u.id
JOIN organizations o ON om.organization_id = o.id
WHERE o.slug = 'test-board-org'
ORDER BY om.role DESC, u.email;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$ 
BEGIN 
    RAISE NOTICE '';
    RAISE NOTICE '=== SETUP COMPLETE ===';
    RAISE NOTICE 'Test user: test.director@appboardguru.com (Director, Approved)';
    RAISE NOTICE 'Test organization: Test Board Organization (test-board-org)';
    RAISE NOTICE 'Additional users: board.member@appboardguru.com, admin.user@appboardguru.com';
    RAISE NOTICE '';
    RAISE NOTICE 'Next: Run script 03-synthetic-email-logs.sql to create email processing test data';
END $$;