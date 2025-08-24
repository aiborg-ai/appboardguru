-- =====================================================
-- WORKING TEST USER SETUP (Fixed SQL functions)
-- This version works with all Supabase constraints
-- =====================================================

-- Step 1: Check if user exists and get details
DO $$
DECLARE
    user_count INTEGER;
    test_user_id UUID;
    user_email TEXT;
BEGIN
    -- Get user count and ID separately
    SELECT COUNT(*) INTO user_count FROM auth.users WHERE email = 'test.director@appboardguru.com';
    
    IF user_count = 0 THEN
        RAISE NOTICE '❌ Test user does NOT exist in auth.users';
        RAISE NOTICE '';
        RAISE NOTICE '=== ACTION REQUIRED ===';
        RAISE NOTICE 'Create user in Supabase Dashboard:';
        RAISE NOTICE '1. Go to Supabase Dashboard > Authentication > Users';
        RAISE NOTICE '2. Click "Invite User" or "Create User"';
        RAISE NOTICE '3. Email: test.director@appboardguru.com';
        RAISE NOTICE '4. Password: password123 (or let them set via email)';
        RAISE NOTICE '5. Then run this script again';
        RAISE NOTICE '=======================';
    ELSE
        -- Get the user ID
        SELECT id INTO test_user_id FROM auth.users WHERE email = 'test.director@appboardguru.com' LIMIT 1;
        
        RAISE NOTICE '✅ Test user EXISTS in auth.users';
        RAISE NOTICE 'User ID: %', test_user_id;
        
        -- Make sure user profile exists in public.users
        INSERT INTO public.users (
            id,
            email,
            full_name,
            role,
            status,
            password_set,
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
            true,
            'AppBoardGuru Test Company',
            'Director of Testing',
            test_user_id,
            NOW(),
            NOW(),
            NOW()
        ) ON CONFLICT (id) DO UPDATE SET
            status = 'approved',
            password_set = true,
            role = 'director',
            full_name = 'Test Director',
            updated_at = NOW();
            
        RAISE NOTICE '✅ User profile updated in public.users';
        
        -- Step 2: Ensure test organization exists
        INSERT INTO organizations (
            id,
            name,
            slug,
            description,
            created_by,
            is_active,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            'Test Board Organization',
            'test-board-org',
            'Test organization for vault creation',
            test_user_id,
            true,
            NOW(),
            NOW()
        ) ON CONFLICT (slug) DO UPDATE SET
            name = 'Test Board Organization',
            updated_at = NOW();
        
        RAISE NOTICE '✅ Test organization ensured';
        
        -- Step 3: Add user to organization as owner
        INSERT INTO organization_members (
            organization_id,
            user_id,
            role,
            status,
            is_primary,
            joined_at
        )
        SELECT 
            o.id, 
            test_user_id, 
            'owner', 
            'active', 
            true, 
            NOW()
        FROM organizations o
        WHERE o.slug = 'test-board-org'
        ON CONFLICT (organization_id, user_id) DO UPDATE SET
            role = 'owner',
            status = 'active',
            is_primary = true;
            
        RAISE NOTICE '✅ User added to organization as owner';
        
        -- Show success message
        RAISE NOTICE '';
        RAISE NOTICE '=== SETUP COMPLETE ===';
        RAISE NOTICE 'Now you can login:';
        RAISE NOTICE '1. Go to /auth/signin';
        RAISE NOTICE '2. Email: test.director@appboardguru.com';
        RAISE NOTICE '3. Use the password you set in Supabase';
        RAISE NOTICE '4. Then try vault creation!';
        RAISE NOTICE '======================';
    END IF;
END $$;

-- Show current status regardless
SELECT 
    'Database Status:' as info,
    (SELECT COUNT(*) FROM auth.users WHERE email = 'test.director@appboardguru.com') as auth_users_count,
    (SELECT COUNT(*) FROM public.users WHERE email = 'test.director@appboardguru.com') as public_users_count,
    (SELECT COUNT(*) FROM organizations WHERE slug = 'test-board-org') as organizations_count;

-- Show user details if they exist
SELECT 
    au.email,
    au.email_confirmed_at IS NOT NULL as email_confirmed,
    au.created_at as auth_created,
    pu.full_name,
    pu.role,
    pu.status,
    pu.password_set
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE au.email = 'test.director@appboardguru.com';

-- Show organization membership
SELECT 
    o.name as org_name,
    o.slug as org_slug,
    om.role as user_role,
    om.status as membership_status
FROM organizations o
JOIN organization_members om ON o.id = om.organization_id
JOIN auth.users au ON om.user_id = au.id
WHERE au.email = 'test.director@appboardguru.com';