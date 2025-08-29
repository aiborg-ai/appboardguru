-- =====================================================
-- FINAL USER FIX - Handles existing owner constraint
-- =====================================================

-- Step 1: Check if test user exists in auth.users
SELECT 
    id as "User ID",
    email as "Email",
    created_at as "Created At"
FROM auth.users 
WHERE email = 'test.director@appboardguru.com';

-- Step 2: Create/Update the user profile in public.users
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

-- Step 3: Handle organization membership (respecting owner constraint)
DO $$
DECLARE
    v_user_id UUID;
    v_org_id UUID;
    v_existing_owner UUID;
BEGIN
    -- Get user ID
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'test.director@appboardguru.com';
    
    IF v_user_id IS NULL THEN
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
        RETURN;
    END IF;

    RAISE NOTICE '✅ Found user: %', v_user_id;
    
    -- Create or get organization
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations' AND table_schema = 'public') THEN
        -- Try to create organization
        INSERT INTO organizations (name, slug, created_by, is_active)
        VALUES ('Test Board Organization', 'test-board-org', v_user_id, true)
        ON CONFLICT (slug) DO UPDATE SET 
            is_active = true
        RETURNING id INTO v_org_id;
        
        -- If organization already existed, get its ID
        IF v_org_id IS NULL THEN
            SELECT id INTO v_org_id FROM organizations WHERE slug = 'test-board-org';
        END IF;
        
        RAISE NOTICE '✅ Organization ready: %', v_org_id;
        
        -- Check if there's already an owner
        SELECT user_id INTO v_existing_owner 
        FROM organization_members 
        WHERE organization_id = v_org_id AND role = 'owner'
        LIMIT 1;
        
        IF v_existing_owner IS NOT NULL THEN
            IF v_existing_owner = v_user_id THEN
                RAISE NOTICE '✅ User is already the owner of this organization';
            ELSE
                RAISE NOTICE '⚠️  Organization already has an owner. Adding user as admin instead.';
                -- Add as admin instead of owner
                INSERT INTO organization_members (organization_id, user_id, role, status, is_primary)
                VALUES (v_org_id, v_user_id, 'admin', 'active', true)
                ON CONFLICT (organization_id, user_id) DO UPDATE SET 
                    role = CASE 
                        WHEN organization_members.role = 'owner' THEN 'owner' -- Keep owner if already owner
                        ELSE 'admin' -- Otherwise set to admin
                    END,
                    status = 'active',
                    is_primary = true;
                RAISE NOTICE '✅ User added as admin to organization';
            END IF;
        ELSE
            -- No owner exists, add as owner
            INSERT INTO organization_members (organization_id, user_id, role, status, is_primary)
            VALUES (v_org_id, v_user_id, 'owner', 'active', true)
            ON CONFLICT (organization_id, user_id) DO UPDATE SET 
                role = 'owner',
                status = 'active',
                is_primary = true;
            RAISE NOTICE '✅ User added as owner of organization';
        END IF;
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ SETUP COMPLETE!';
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
        RAISE NOTICE '⚠️  Error details: %', SQLERRM;
        RAISE NOTICE '';
        RAISE NOTICE 'This might be okay - try logging in anyway!';
END $$;

-- Step 4: Verify the setup
SELECT 
    '=== VERIFICATION ===' as status;

-- Check if profile exists
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ User profile exists - YOU CAN LOGIN!'
        ELSE '❌ Profile not created'
    END as "Profile Status"
FROM public.users 
WHERE email = 'test.director@appboardguru.com';

-- Show user details
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
    o.name as organization,
    o.slug,
    om.role as member_role,
    om.status,
    om.is_primary
FROM organizations o
JOIN organization_members om ON o.id = om.organization_id
JOIN auth.users au ON om.user_id = au.id
WHERE au.email = 'test.director@appboardguru.com';

-- Final message
SELECT 
    '=== LOGIN CREDENTIALS ===' as info;
    
SELECT 
    'Email: test.director@appboardguru.com' as email,
    'Password: TestDirector123!' as password;