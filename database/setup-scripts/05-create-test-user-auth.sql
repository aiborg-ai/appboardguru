-- =====================================================
-- CREATE TEST USER IN SUPABASE AUTH
-- This script creates the test.director user in auth.users if it doesn't exist
-- Run this if the test user is missing from Supabase Auth
-- =====================================================

-- Check if test user exists in auth.users, if not create it
DO $$
DECLARE
    test_user_id UUID;
    existing_user_count INTEGER;
BEGIN
    -- Check if user already exists
    SELECT COUNT(*) INTO existing_user_count 
    FROM auth.users 
    WHERE email = 'test.director@appboardguru.com';
    
    IF existing_user_count > 0 THEN
        RAISE NOTICE 'Test user already exists in auth.users';
        
        -- Get the existing user ID
        SELECT id INTO test_user_id 
        FROM auth.users 
        WHERE email = 'test.director@appboardguru.com';
        
        RAISE NOTICE 'Existing test user ID: %', test_user_id;
    ELSE
        -- Generate a new UUID for the user
        test_user_id := gen_random_uuid();
        
        -- Insert the user into auth.users
        INSERT INTO auth.users (
            id,
            instance_id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            invited_at,
            confirmation_token,
            confirmation_sent_at,
            recovery_token,
            recovery_sent_at,
            email_change_token_new,
            email_change,
            email_change_sent_at,
            last_sign_in_at,
            raw_app_meta_data,
            raw_user_meta_data,
            is_super_admin,
            created_at,
            updated_at,
            phone,
            phone_confirmed_at,
            phone_change,
            phone_change_token,
            phone_change_sent_at,
            confirmed_at,
            email_change_token_current,
            email_change_confirm_status,
            banned_until,
            reauthentication_token,
            reauthentication_sent_at,
            is_sso_user,
            deleted_at
        ) VALUES (
            test_user_id,
            '00000000-0000-0000-0000-000000000000',
            'authenticated',
            'authenticated',
            'test.director@appboardguru.com',
            '$2a$10$J3RUw.T7ZgvZs5gPyBkQ8esZdLNQQ9Q2K3aBgXPzjEOzlHc7yCcwu', -- Default password hash
            NOW(),
            NULL,
            '',
            NULL,
            '',
            NULL,
            '',
            '',
            NULL,
            NOW(),
            '{"provider": "email", "providers": ["email"]}',
            '{"full_name": "Test Director", "email": "test.director@appboardguru.com"}',
            false,
            NOW(),
            NOW(),
            NULL,
            NULL,
            '',
            '',
            NULL,
            NOW(),
            '',
            0,
            NULL,
            '',
            NULL,
            false,
            NULL
        );
        
        RAISE NOTICE 'Created test user in auth.users with ID: %', test_user_id;
    END IF;
    
    -- Ensure user exists in public.users table
    INSERT INTO public.users (
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
    ) VALUES (
        test_user_id,
        'test.director@appboardguru.com',
        'Test Director',
        'director',
        'approved',
        'AppBoardGuru Test Company',
        'Director of Testing',
        test_user_id, -- Self-approved
        NOW(),
        NOW(),
        NOW()
    ) ON CONFLICT (id) DO UPDATE SET
        full_name = 'Test Director',
        role = 'director',
        status = 'approved',
        company = 'AppBoardGuru Test Company',
        position = 'Director of Testing',
        approved_at = COALESCE(users.approved_at, NOW()),
        updated_at = NOW();
    
    RAISE NOTICE 'Test user profile ensured in public.users';
    
    -- Create or verify test organization
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
    ) VALUES (
        gen_random_uuid(),
        'Test Board Organization',
        'test-board-org',
        'A test organization for demonstrating vault functionality',
        'https://test.appboardguru.com',
        'Software',
        'medium',
        test_user_id,
        true,
        NOW(),
        NOW()
    ) ON CONFLICT (slug) DO UPDATE SET
        name = 'Test Board Organization',
        description = 'A test organization for demonstrating vault functionality',
        updated_at = NOW();
    
    -- Add user to test organization as owner
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
        test_user_id,
        'owner',
        test_user_id,
        NOW(),
        NOW(),
        'active',
        true
    FROM organizations orgs
    WHERE orgs.slug = 'test-board-org'
    ON CONFLICT (organization_id, user_id) DO UPDATE SET
        role = 'owner',
        status = 'active',
        is_primary = true,
        last_accessed = NOW();
    
    RAISE NOTICE 'Test user added to test organization as owner';
    
END $$;

-- Verify the setup
SELECT 
    'Verification Results:' as status,
    (SELECT COUNT(*) FROM auth.users WHERE email = 'test.director@appboardguru.com') as auth_users_count,
    (SELECT COUNT(*) FROM public.users WHERE email = 'test.director@appboardguru.com') as public_users_count,
    (SELECT COUNT(*) FROM organizations WHERE slug = 'test-board-org') as organizations_count;

-- Show user details
SELECT 
    au.id as auth_id,
    au.email as auth_email,
    au.email_confirmed_at,
    pu.full_name,
    pu.role,
    pu.status
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE au.email = 'test.director@appboardguru.com';

-- Show organization membership
SELECT 
    o.name as organization_name,
    o.slug,
    om.role as member_role,
    om.status as member_status,
    u.email as member_email
FROM organizations o
JOIN organization_members om ON o.id = om.organization_id
JOIN users u ON om.user_id = u.id
WHERE o.slug = 'test-board-org';

RAISE NOTICE '';
RAISE NOTICE '=== TEST USER SETUP COMPLETE ===';
RAISE NOTICE 'Email: test.director@appboardguru.com';
RAISE NOTICE 'Organization: Test Board Organization (test-board-org)';
RAISE NOTICE 'Role: Director/Owner';
RAISE NOTICE 'Status: Approved and Active';
RAISE NOTICE '';
RAISE NOTICE 'You can now test vault creation with this user!';
RAISE NOTICE '=================================';