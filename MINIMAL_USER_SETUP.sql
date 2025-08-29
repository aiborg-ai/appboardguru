-- =====================================================
-- MINIMAL USER SETUP - Just fix the login issue
-- =====================================================

-- This script ONLY creates the test user profile
-- It doesn't modify tables or create policies

DO $$
DECLARE
    test_user_id UUID;
    test_org_id UUID;
BEGIN
    -- Get the test user ID from auth.users
    SELECT id INTO test_user_id 
    FROM auth.users 
    WHERE email = 'test.director@appboardguru.com'
    LIMIT 1;

    IF test_user_id IS NULL THEN
        RAISE NOTICE '';
        RAISE NOTICE '================================================';
        RAISE NOTICE '❌ TEST USER NOT FOUND!';
        RAISE NOTICE '================================================';
        RAISE NOTICE '';
        RAISE NOTICE 'Please create the user first:';
        RAISE NOTICE '';
        RAISE NOTICE '1. Go to Supabase Dashboard';
        RAISE NOTICE '2. Click Authentication > Users';
        RAISE NOTICE '3. Click "Invite User"';
        RAISE NOTICE '4. Enter: test.director@appboardguru.com';
        RAISE NOTICE '5. Password: TestDirector123!';
        RAISE NOTICE '6. Run this script again';
        RAISE NOTICE '';
        RAISE NOTICE '================================================';
        RETURN;
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '✅ Found test user in auth.users';
    RAISE NOTICE 'User ID: %', test_user_id;

    -- Create or update user profile in public.users
    INSERT INTO public.users (
        id, 
        email, 
        full_name, 
        role, 
        status, 
        password_set,
        company, 
        position, 
        created_at, 
        updated_at
    ) VALUES (
        test_user_id,
        'test.director@appboardguru.com',
        'Test Director',
        'director',
        'approved',
        true,
        'AppBoardGuru Test Company',
        'Board Director',
        NOW(),
        NOW()
    ) ON CONFLICT (id) DO UPDATE SET
        email = 'test.director@appboardguru.com',
        full_name = COALESCE(users.full_name, 'Test Director'),
        role = 'director',
        status = 'approved',
        password_set = true,
        company = COALESCE(users.company, 'AppBoardGuru Test Company'),
        position = COALESCE(users.position, 'Board Director'),
        updated_at = NOW();

    RAISE NOTICE '✅ User profile created/updated in public.users';

    -- Try to create a test organization if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations') THEN
        -- Create test organization
        INSERT INTO organizations (
            name, 
            slug, 
            description, 
            created_by, 
            is_active,
            created_at,
            updated_at
        ) VALUES (
            'Test Board Organization',
            'test-board-org',
            'Primary test organization for AppBoardGuru',
            test_user_id,
            true,
            NOW(),
            NOW()
        ) ON CONFLICT (slug) DO UPDATE SET
            name = 'Test Board Organization',
            is_active = true,
            updated_at = NOW()
        RETURNING id INTO test_org_id;

        -- If organization already existed, get its ID
        IF test_org_id IS NULL THEN
            SELECT id INTO test_org_id 
            FROM organizations 
            WHERE slug = 'test-board-org';
        END IF;

        RAISE NOTICE '✅ Test organization ready';

        -- Add user to organization if organization_members table exists
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organization_members') THEN
            INSERT INTO organization_members (
                organization_id, 
                user_id, 
                role, 
                status, 
                is_primary,
                joined_at,
                created_at,
                updated_at
            ) VALUES (
                test_org_id,
                test_user_id,
                'owner',
                'active',
                true,
                NOW(),
                NOW(),
                NOW()
            ) ON CONFLICT (organization_id, user_id) DO UPDATE SET
                role = 'owner',
                status = 'active',
                is_primary = true,
                updated_at = NOW();

            RAISE NOTICE '✅ User added as organization owner';
        END IF;
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ USER SETUP COMPLETE!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'You can now login with:';
    RAISE NOTICE '';
    RAISE NOTICE 'Email: test.director@appboardguru.com';
    RAISE NOTICE 'Password: TestDirector123!';
    RAISE NOTICE '';
    RAISE NOTICE '========================================';

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '';
        RAISE NOTICE '⚠️  Non-critical error: %', SQLERRM;
        RAISE NOTICE 'The user profile may still have been created.';
        RAISE NOTICE 'Try logging in!';
END $$;

-- =====================================================
-- Verification Queries
-- =====================================================

-- Check if user exists in auth
SELECT 
    CASE 
        WHEN EXISTS(SELECT 1 FROM auth.users WHERE email = 'test.director@appboardguru.com')
        THEN '✅ User exists in auth.users'
        ELSE '❌ User NOT found in auth.users - Create in Supabase Dashboard first!'
    END as auth_status;

-- Check if profile exists
SELECT 
    CASE 
        WHEN EXISTS(SELECT 1 FROM public.users WHERE email = 'test.director@appboardguru.com')
        THEN '✅ User profile exists in public.users'
        ELSE '❌ User profile NOT found in public.users'
    END as profile_status;

-- Show user details if they exist
SELECT 
    'User Profile Details:' as info,
    u.id,
    u.email,
    u.full_name,
    u.role,
    u.status,
    u.password_set,
    u.company
FROM public.users u
WHERE u.email = 'test.director@appboardguru.com';

-- Check organization membership if tables exist
SELECT 
    'Organization Membership:' as info,
    o.name as organization,
    o.slug,
    om.role as member_role,
    om.status as membership_status
FROM organizations o
JOIN organization_members om ON o.id = om.organization_id
JOIN public.users u ON om.user_id = u.id
WHERE u.email = 'test.director@appboardguru.com';