-- =====================================================
-- DIRECT FIX FOR USER PROFILE
-- =====================================================

-- Step 1: Check if the test user exists in auth.users
SELECT 
    id,
    email,
    created_at,
    email_confirmed_at
FROM auth.users 
WHERE email = 'test.director@appboardguru.com';

-- If the above query returns a result, copy the ID and use it below
-- If not, you need to create the user in Supabase Dashboard first

-- Step 2: Get the user ID and create profile
-- This uses a subquery to get the ID automatically
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

-- Step 3: Verify the profile was created
SELECT * FROM public.users WHERE email = 'test.director@appboardguru.com';

-- Step 4: If you have organizations table, create test org and membership
DO $$
DECLARE
    user_id UUID;
    org_id UUID;
BEGIN
    -- Get user ID
    SELECT id INTO user_id FROM auth.users WHERE email = 'test.director@appboardguru.com';
    
    IF user_id IS NOT NULL THEN
        -- Create organization if table exists
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations') THEN
            INSERT INTO organizations (name, slug, created_by, is_active)
            VALUES ('Test Board Organization', 'test-board-org', user_id, true)
            ON CONFLICT (slug) DO UPDATE SET is_active = true
            RETURNING id INTO org_id;
            
            -- Get org ID if it already existed
            IF org_id IS NULL THEN
                SELECT id INTO org_id FROM organizations WHERE slug = 'test-board-org';
            END IF;
            
            -- Add membership if table exists
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organization_members') THEN
                INSERT INTO organization_members (organization_id, user_id, role, status, is_primary)
                VALUES (org_id, user_id, 'owner', 'active', true)
                ON CONFLICT (organization_id, user_id) DO UPDATE SET 
                    role = 'owner', 
                    status = 'active',
                    is_primary = true;
            END IF;
        END IF;
    END IF;
END $$;

-- Step 5: Final verification
SELECT 
    'Verification Results:' as status,
    (SELECT COUNT(*) FROM auth.users WHERE email = 'test.director@appboardguru.com') as "Auth Users Count",
    (SELECT COUNT(*) FROM public.users WHERE email = 'test.director@appboardguru.com') as "Public Users Count";

-- Show the user profile details
SELECT 
    u.id,
    u.email,
    u.full_name,
    u.role,
    u.status,
    u.password_set
FROM public.users u
WHERE u.email = 'test.director@appboardguru.com';