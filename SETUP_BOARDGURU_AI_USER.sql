-- =====================================================
-- Setup for test.director@boardguru.ai account
-- =====================================================

-- Step 1: Check if this user exists in auth.users
SELECT 
    id as "User ID",
    email as "Email",
    created_at as "Created At",
    email_confirmed_at as "Email Confirmed"
FROM auth.users 
WHERE email = 'test.director@boardguru.ai';

-- Step 2: Create/Update the user profile in public.users
INSERT INTO public.users (
    id,
    email,
    full_name,
    role,
    status,
    password_set,
    company,
    position
)
SELECT 
    id,
    'test.director@boardguru.ai',
    'Test Director',
    'director',
    'approved',
    true,
    'BoardGuru AI Company',
    'Board Director'
FROM auth.users
WHERE email = 'test.director@boardguru.ai'
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(users.full_name, EXCLUDED.full_name),
    role = EXCLUDED.role,
    status = EXCLUDED.status,
    password_set = EXCLUDED.password_set,
    company = COALESCE(users.company, EXCLUDED.company),
    position = COALESCE(users.position, EXCLUDED.position);

-- Step 3: Handle organization membership
DO $$
DECLARE
    v_user_id UUID;
    v_org_id UUID;
    v_existing_member BOOLEAN;
BEGIN
    -- Get user ID
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'test.director@boardguru.ai';
    
    IF v_user_id IS NULL THEN
        RAISE NOTICE '';
        RAISE NOTICE '================================================';
        RAISE NOTICE '❌ USER NOT FOUND IN AUTH.USERS!';
        RAISE NOTICE '================================================';
        RAISE NOTICE '';
        RAISE NOTICE 'This user does not exist in Supabase Auth.';
        RAISE NOTICE 'Please check:';
        RAISE NOTICE '1. Is the email correct? test.director@boardguru.ai';
        RAISE NOTICE '2. Has this user been created in Supabase?';
        RAISE NOTICE '3. Try logging in first to create the auth user';
        RAISE NOTICE '';
        RAISE NOTICE '================================================';
        RETURN;
    END IF;

    RAISE NOTICE '✅ Found user: %', v_user_id;
    
    -- Check if user already has an organization membership
    SELECT EXISTS(
        SELECT 1 FROM organization_members 
        WHERE user_id = v_user_id
    ) INTO v_existing_member;
    
    IF v_existing_member THEN
        RAISE NOTICE '✅ User already has organization membership';
        
        -- Show their current organizations
        RAISE NOTICE '';
        RAISE NOTICE 'Current organizations:';
        FOR v_org_id IN 
            SELECT om.organization_id 
            FROM organization_members om 
            WHERE om.user_id = v_user_id
        LOOP
            RAISE NOTICE '  - Organization ID: %', v_org_id;
        END LOOP;
    ELSE
        -- Create or get the default organization
        INSERT INTO organizations (name, slug, created_by, is_active)
        VALUES ('BoardGuru AI Organization', 'boardguru-ai-org', v_user_id, true)
        ON CONFLICT (slug) DO UPDATE SET 
            is_active = true
        RETURNING id INTO v_org_id;
        
        -- If organization already existed, get its ID
        IF v_org_id IS NULL THEN
            SELECT id INTO v_org_id FROM organizations WHERE slug = 'boardguru-ai-org';
        END IF;
        
        RAISE NOTICE '✅ Organization ready: %', v_org_id;
        
        -- Add user to organization (check for existing owner first)
        IF EXISTS(SELECT 1 FROM organization_members WHERE organization_id = v_org_id AND role = 'owner') THEN
            -- Add as admin if owner exists
            INSERT INTO organization_members (organization_id, user_id, role, status, is_primary)
            VALUES (v_org_id, v_user_id, 'admin', 'active', true)
            ON CONFLICT (organization_id, user_id) DO UPDATE SET 
                status = 'active',
                is_primary = true;
            RAISE NOTICE '✅ User added as admin (organization already has owner)';
        ELSE
            -- Add as owner
            INSERT INTO organization_members (organization_id, user_id, role, status, is_primary)
            VALUES (v_org_id, v_user_id, 'owner', 'active', true)
            ON CONFLICT (organization_id, user_id) DO UPDATE SET 
                role = 'owner',
                status = 'active',
                is_primary = true;
            RAISE NOTICE '✅ User added as owner';
        END IF;
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ SETUP COMPLETE!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'You can now login with:';
    RAISE NOTICE '';
    RAISE NOTICE 'Email: test.director@boardguru.ai';
    RAISE NOTICE 'Password: TestDir123!@#';
    RAISE NOTICE '';
    RAISE NOTICE '========================================';

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '';
        RAISE NOTICE '⚠️  Error: %', SQLERRM;
        RAISE NOTICE '';
        RAISE NOTICE 'The user profile may still have been created.';
        RAISE NOTICE 'Try logging in anyway!';
END $$;

-- Step 4: Verify the setup
SELECT 
    '=== VERIFICATION ===' as status;

-- Check both test accounts
SELECT 
    'Test Accounts Status:' as info;

SELECT 
    email,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Exists in auth.users'
        ELSE '❌ Not in auth.users'
    END as auth_status
FROM auth.users 
WHERE email IN ('test.director@boardguru.ai', 'test.director@appboardguru.com')
GROUP BY email;

-- Check profiles
SELECT 
    email,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Profile exists'
        ELSE '❌ No profile'
    END as profile_status
FROM public.users 
WHERE email IN ('test.director@boardguru.ai', 'test.director@appboardguru.com')
GROUP BY email;

-- Show user details for boardguru.ai account
SELECT 
    'BoardGuru AI User Details:' as info;
    
SELECT 
    u.id,
    u.email,
    u.full_name,
    u.role,
    u.status,
    u.password_set,
    u.company,
    u.position
FROM public.users u
WHERE u.email = 'test.director@boardguru.ai';

-- Show organization membership
SELECT 
    'Organization Membership:' as info;

SELECT 
    o.name as organization,
    o.slug,
    om.role as member_role,
    om.status,
    om.is_primary
FROM organizations o
JOIN organization_members om ON o.id = om.organization_id
JOIN auth.users au ON om.user_id = au.id
WHERE au.email = 'test.director@boardguru.ai';

-- Show both test accounts summary
SELECT 
    '=== ALL TEST ACCOUNTS ===' as info;

SELECT 
    u.email,
    u.full_name,
    u.role,
    u.status,
    CASE 
        WHEN om.organization_id IS NOT NULL THEN '✅ Has Organization'
        ELSE '❌ No Organization'
    END as org_status
FROM public.users u
LEFT JOIN organization_members om ON u.id = om.user_id
WHERE u.email IN ('test.director@boardguru.ai', 'test.director@appboardguru.com');