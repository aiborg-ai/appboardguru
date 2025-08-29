-- =====================================================
-- SIMPLE USER FIX - Works with your existing tables
-- =====================================================

-- Step 1: Check if test user exists in auth.users
SELECT 
    id as "User ID",
    email as "Email",
    created_at as "Created At"
FROM auth.users 
WHERE email = 'test.director@appboardguru.com';

-- Step 2: Create the user profile in public.users
INSERT INTO public.users (
    id,
    email,
    full_name,
    role,
    status,
    password_set
)
SELECT 
    id,
    'test.director@appboardguru.com',
    'Test Director',
    'director',
    'approved',
    true
FROM auth.users
WHERE email = 'test.director@appboardguru.com'
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    status = EXCLUDED.status,
    password_set = EXCLUDED.password_set;

-- Step 3: Create organization and membership (minimal fields only)
DO $$
DECLARE
    v_user_id UUID;
    v_org_id UUID;
BEGIN
    -- Get user ID
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'test.director@appboardguru.com';
    
    IF v_user_id IS NOT NULL THEN
        RAISE NOTICE 'Found user: %', v_user_id;
        
        -- Create organization (only required fields)
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations' AND table_schema = 'public') THEN
            INSERT INTO organizations (name, slug, created_by, is_active)
            VALUES ('Test Board Organization', 'test-board-org', v_user_id, true)
            ON CONFLICT (slug) DO UPDATE SET 
                is_active = true
            RETURNING id INTO v_org_id;
            
            -- Get org ID if it already existed
            IF v_org_id IS NULL THEN
                SELECT id INTO v_org_id FROM organizations WHERE slug = 'test-board-org';
            END IF;
            
            RAISE NOTICE 'Organization ready: %', v_org_id;
            
            -- Add membership (only fields that exist)
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organization_members' AND table_schema = 'public') THEN
                INSERT INTO organization_members (organization_id, user_id, role, status, is_primary)
                VALUES (v_org_id, v_user_id, 'owner', 'active', true)
                ON CONFLICT (organization_id, user_id) DO UPDATE SET 
                    role = 'owner', 
                    status = 'active',
                    is_primary = true;
                    
                RAISE NOTICE 'User added as organization owner';
            END IF;
        END IF;
        
        RAISE NOTICE 'Setup complete!';
    ELSE
        RAISE NOTICE '';
        RAISE NOTICE '================================================';
        RAISE NOTICE '❌ USER NOT FOUND IN AUTH.USERS!';
        RAISE NOTICE '================================================';
        RAISE NOTICE '';
        RAISE NOTICE 'Please create the user first:';
        RAISE NOTICE '1. Go to Supabase Dashboard';
        RAISE NOTICE '2. Click Authentication > Users';
        RAISE NOTICE '3. Click "Invite User"';
        RAISE NOTICE '4. Email: test.director@appboardguru.com';
        RAISE NOTICE '5. Password: TestDirector123!';
        RAISE NOTICE '';
        RAISE NOTICE '================================================';
    END IF;
END $$;

-- Step 4: Verify everything worked
SELECT 
    '=== FINAL CHECK ===' as status;

-- Check auth user
SELECT 
    COUNT(*) as auth_user_count,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Auth user exists'
        ELSE '❌ No auth user - Create in Supabase first!'
    END as status
FROM auth.users 
WHERE email = 'test.director@appboardguru.com';

-- Check profile
SELECT 
    COUNT(*) as profile_count,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Profile exists - YOU CAN NOW LOGIN!'
        ELSE '❌ Profile not created'
    END as status
FROM public.users 
WHERE email = 'test.director@appboardguru.com';

-- Show the profile
SELECT 
    '=== USER PROFILE ===' as info;
    
SELECT 
    id,
    email,
    full_name,
    role,
    status,
    password_set
FROM public.users
WHERE email = 'test.director@appboardguru.com';

-- Show organization membership
SELECT 
    '=== ORGANIZATION ===' as info;

SELECT 
    o.name as organization,
    o.slug,
    om.role as member_role,
    om.status,
    om.is_primary
FROM organizations o
JOIN organization_members om ON o.id = om.organization_id
JOIN auth.users au ON om.user_id = au.id
WHERE au.email = 'test.director@appboardguru.com';

-- Login info
SELECT 
    '=== YOU CAN NOW LOGIN WITH ===' as info;
    
SELECT 
    'Email: test.director@appboardguru.com' as email,
    'Password: TestDirector123!' as password;