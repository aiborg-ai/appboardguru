-- =====================================================
-- WORKING FIX FOR USER PROFILE - No conflicts
-- =====================================================

-- Step 1: Check if the test user exists in auth.users
SELECT 
    id as "User ID",
    email as "Email",
    created_at as "Created At",
    CASE 
        WHEN email_confirmed_at IS NOT NULL THEN 'Confirmed'
        ELSE 'Not Confirmed'
    END as "Email Status"
FROM auth.users 
WHERE email = 'test.director@appboardguru.com';

-- Step 2: Create the user profile (this will work even if auth user doesn't exist yet)
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
)
SELECT 
    id,
    'test.director@appboardguru.com',
    'Test Director',
    'director',
    'approved',
    true,
    'AppBoardGuru Test Company',
    'Board Director',
    NOW(),
    NOW()
FROM auth.users
WHERE email = 'test.director@appboardguru.com'
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    status = EXCLUDED.status,
    password_set = EXCLUDED.password_set,
    company = EXCLUDED.company,
    position = EXCLUDED.position,
    updated_at = NOW();

-- Step 3: Create organization and membership (fixed variable naming)
DO $$
DECLARE
    v_user_id UUID;  -- Changed variable name to avoid conflict
    v_org_id UUID;   -- Changed variable name to avoid conflict
BEGIN
    -- Get user ID
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'test.director@appboardguru.com';
    
    IF v_user_id IS NOT NULL THEN
        -- Create organization if table exists
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations' AND table_schema = 'public') THEN
            INSERT INTO organizations (name, slug, created_by, is_active, created_at, updated_at)
            VALUES ('Test Board Organization', 'test-board-org', v_user_id, true, NOW(), NOW())
            ON CONFLICT (slug) DO UPDATE SET 
                is_active = true,
                updated_at = NOW()
            RETURNING id INTO v_org_id;
            
            -- Get org ID if it already existed
            IF v_org_id IS NULL THEN
                SELECT id INTO v_org_id FROM organizations WHERE slug = 'test-board-org';
            END IF;
            
            RAISE NOTICE 'Organization ready: %', v_org_id;
            
            -- Add membership if table exists (using table qualified names)
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organization_members' AND table_schema = 'public') THEN
                INSERT INTO organization_members (organization_id, user_id, role, status, is_primary, created_at, updated_at)
                VALUES (v_org_id, v_user_id, 'owner', 'active', true, NOW(), NOW())
                ON CONFLICT (organization_id, user_id) DO UPDATE SET 
                    role = 'owner', 
                    status = 'active',
                    is_primary = true,
                    updated_at = NOW();
                    
                RAISE NOTICE 'User added as organization owner';
            END IF;
        END IF;
        
        RAISE NOTICE 'Setup complete for user: %', v_user_id;
    ELSE
        RAISE NOTICE 'User not found in auth.users - please create it first!';
    END IF;
END $$;

-- Step 4: Final verification
SELECT 
    '=== VERIFICATION RESULTS ===' as info;

SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Auth user exists'
        ELSE '❌ Auth user NOT found - Create in Supabase Dashboard first!'
    END as "Auth Status"
FROM auth.users 
WHERE email = 'test.director@appboardguru.com';

SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ User profile exists' 
        ELSE '❌ User profile NOT created'
    END as "Profile Status"
FROM public.users 
WHERE email = 'test.director@appboardguru.com';

-- Show the user profile details if it exists
SELECT 
    'User Profile:' as info,
    u.id,
    u.email,
    u.full_name,
    u.role,
    u.status,
    u.password_set,
    u.company,
    u.position
FROM public.users u
WHERE u.email = 'test.director@appboardguru.com';

-- Show organization membership if it exists
SELECT 
    'Organization Membership:' as info,
    o.name as organization,
    o.slug,
    om.role as member_role,
    om.status as membership_status,
    om.is_primary
FROM organizations o
JOIN organization_members om ON o.id = om.organization_id
JOIN auth.users au ON om.user_id = au.id
WHERE au.email = 'test.director@appboardguru.com';

-- Final message
SELECT 
    '=== LOGIN CREDENTIALS ===' as info,
    'Email: test.director@appboardguru.com' as credentials,
    'Password: TestDirector123!' as password;