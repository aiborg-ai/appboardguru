-- =====================================================
-- SIMPLE TEST USER SETUP (Works with Supabase constraints)
-- This approach works within Supabase's auth system limitations
-- =====================================================

-- Step 1: Check if user exists in auth.users and show current state
DO $$
DECLARE
    user_count INTEGER;
    test_user_id UUID;
BEGIN
    SELECT COUNT(*), MIN(id) INTO user_count, test_user_id 
    FROM auth.users 
    WHERE email = 'test.director@appboardguru.com';
    
    IF user_count = 0 THEN
        RAISE NOTICE '❌ Test user does NOT exist in auth.users';
        RAISE NOTICE 'Please create the user manually in Supabase Auth Dashboard first';
        RAISE NOTICE 'Go to: Supabase Dashboard > Authentication > Users > Invite User';
        RAISE NOTICE 'Email: test.director@appboardguru.com';
    ELSE
        RAISE NOTICE '✅ Test user EXISTS in auth.users with ID: %', test_user_id;
        
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
            updated_at = NOW();
            
        RAISE NOTICE '✅ User profile updated in public.users';
    END IF;
END $$;

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
) 
SELECT 
    gen_random_uuid(),
    'Test Board Organization',
    'test-board-org',
    'Test organization for vault creation',
    u.id,
    true,
    NOW(),
    NOW()
FROM auth.users u
WHERE u.email = 'test.director@appboardguru.com'
AND NOT EXISTS (SELECT 1 FROM organizations WHERE slug = 'test-board-org');

-- Step 3: Add user to organization
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
    u.id, 
    'owner', 
    'active', 
    true, 
    NOW()
FROM organizations o, auth.users u
WHERE o.slug = 'test-board-org' 
AND u.email = 'test.director@appboardguru.com'
ON CONFLICT (organization_id, user_id) DO UPDATE SET
    role = 'owner',
    status = 'active',
    is_primary = true;

-- Step 4: Show current status
SELECT 
    'Current setup status:' as info,
    (SELECT COUNT(*) FROM auth.users WHERE email = 'test.director@appboardguru.com') as auth_user_exists,
    (SELECT COUNT(*) FROM public.users WHERE email = 'test.director@appboardguru.com') as profile_exists,
    (SELECT COUNT(*) FROM organizations WHERE slug = 'test-board-org') as org_exists;

-- Step 5: Show user details if they exist
SELECT 
    au.email,
    au.email_confirmed_at IS NOT NULL as email_confirmed,
    pu.full_name,
    pu.role,
    pu.status,
    pu.password_set
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE au.email = 'test.director@appboardguru.com';

-- Final instructions
DO $$
DECLARE
    user_exists BOOLEAN;
BEGIN
    SELECT EXISTS(SELECT 1 FROM auth.users WHERE email = 'test.director@appboardguru.com') INTO user_exists;
    
    IF user_exists THEN
        RAISE NOTICE '';
        RAISE NOTICE '=== NEXT STEPS ===';
        RAISE NOTICE '1. Go to /auth/signin';
        RAISE NOTICE '2. Enter: test.director@appboardguru.com';
        RAISE NOTICE '3. If you know the password, enter it';
        RAISE NOTICE '4. If not, click "Get Password Setup Link"';
        RAISE NOTICE '5. Check email and set password';
        RAISE NOTICE '6. Then try vault creation';
        RAISE NOTICE '==================';
    ELSE
        RAISE NOTICE '';
        RAISE NOTICE '=== ACTION REQUIRED ===';
        RAISE NOTICE 'User does not exist in Supabase Auth!';
        RAISE NOTICE 'Go to Supabase Dashboard:';
        RAISE NOTICE '1. Authentication > Users';
        RAISE NOTICE '2. Click "Invite User"';  
        RAISE NOTICE '3. Email: test.director@appboardguru.com';
        RAISE NOTICE '4. Then run this script again';
        RAISE NOTICE '=======================';
    END IF;
END $$;