-- =====================================================
-- SIMPLE FIX FOR TEST.DIRECTOR ORGANIZATION ACCESS
-- Script 12: Quick fix to ensure test.director can see board_packs
-- =====================================================

-- This is a simplified script that:
-- 1. Ensures test.director has an organization
-- 2. Updates board_packs to be visible to all authenticated users (for testing)
-- 3. Creates simple RLS policy for board_packs access

-- =====================================================
-- STEP 1: Get test.director user ID
-- =====================================================
DO $$
DECLARE
    test_user_id UUID;
    test_org_id UUID;
BEGIN
    -- Get test.director from auth.users
    SELECT id INTO test_user_id
    FROM auth.users
    WHERE email = 'test.director@appboardguru.com';
    
    IF test_user_id IS NULL THEN
        RAISE NOTICE 'test.director@appboardguru.com not found in auth.users';
        RAISE NOTICE 'Please create the user in Supabase Auth first';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Found test.director with ID: %', test_user_id;
    
    -- =====================================================
    -- STEP 2: Create or find an organization
    -- =====================================================
    
    -- Try to find any existing organization
    SELECT id INTO test_org_id
    FROM organizations
    LIMIT 1;
    
    IF test_org_id IS NULL THEN
        -- Create a simple organization
        INSERT INTO organizations (
            id,
            name,
            slug,
            created_by,
            is_active,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            'Default Organization',
            'default-org',
            test_user_id,
            true,
            NOW(),
            NOW()
        )
        RETURNING id INTO test_org_id;
        
        RAISE NOTICE 'Created Default Organization with ID: %', test_org_id;
    ELSE
        RAISE NOTICE 'Using existing organization with ID: %', test_org_id;
    END IF;
    
    -- =====================================================
    -- STEP 3: Create organization membership
    -- =====================================================
    
    -- Check if membership exists
    IF NOT EXISTS (
        SELECT 1 FROM organization_members
        WHERE user_id = test_user_id
    ) THEN
        INSERT INTO organization_members (
            organization_id,
            user_id,
            role,
            status,
            joined_at,
            is_primary
        ) VALUES (
            test_org_id,
            test_user_id,
            'owner',
            'active',
            NOW(),
            true
        )
        ON CONFLICT (organization_id, user_id) DO UPDATE
        SET role = 'owner',
            status = 'active',
            is_primary = true;
            
        RAISE NOTICE 'Created/updated organization membership';
    ELSE
        -- Update existing membership to ensure it's active
        UPDATE organization_members
        SET status = 'active',
            role = 'owner',
            is_primary = true
        WHERE user_id = test_user_id;
        
        RAISE NOTICE 'Updated existing membership to active owner status';
    END IF;
    
    -- =====================================================
    -- STEP 4: Create user profile if missing
    -- =====================================================
    
    INSERT INTO users (
        id,
        email,
        full_name,
        role,
        status,
        created_at,
        updated_at
    ) VALUES (
        test_user_id,
        'test.director@appboardguru.com',
        'Test Director',
        'director',
        'approved',
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE
    SET status = 'approved',
        role = 'director',
        updated_at = NOW();
        
    RAISE NOTICE 'Ensured user profile exists and is approved';
    
END $$;

-- =====================================================
-- STEP 5: Simplify RLS policies for board_packs
-- =====================================================

-- Drop existing complex policies
DROP POLICY IF EXISTS "Users can view their own board packs" ON board_packs;
DROP POLICY IF EXISTS "Users can view all board packs" ON board_packs;
DROP POLICY IF EXISTS "Authenticated users can view board packs" ON board_packs;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON board_packs;

-- Create a simple policy that allows ALL authenticated users to view ALL board packs
-- This is for testing purposes only
CREATE POLICY "Allow authenticated users to view all board packs"
ON board_packs
FOR SELECT
TO authenticated
USING (true);

-- Enable RLS on board_packs
ALTER TABLE board_packs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 6: Update board_packs uploaded_by if needed
-- =====================================================

-- If there are board_packs with NULL or invalid uploaded_by, update them
UPDATE board_packs
SET uploaded_by = (
    SELECT id FROM users WHERE email = 'test.director@appboardguru.com'
)
WHERE uploaded_by IS NULL
   OR uploaded_by NOT IN (SELECT id FROM users);

-- =====================================================
-- STEP 7: Verify the setup
-- =====================================================

-- Check test.director's organization membership
SELECT 
    u.email,
    u.full_name,
    u.status as user_status,
    o.name as org_name,
    om.role as org_role,
    om.status as membership_status
FROM users u
LEFT JOIN organization_members om ON u.id = om.user_id
LEFT JOIN organizations o ON om.organization_id = o.id
WHERE u.email = 'test.director@appboardguru.com';

-- Count board_packs
SELECT 
    COUNT(*) as total_board_packs,
    COUNT(CASE WHEN uploaded_by = (SELECT id FROM users WHERE email = 'test.director@appboardguru.com') THEN 1 END) as uploaded_by_test_director
FROM board_packs;

-- Show sample board_packs
SELECT 
    id,
    title,
    file_name,
    created_at
FROM board_packs
ORDER BY created_at DESC
LIMIT 5;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ SETUP COMPLETE!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'test.director@appboardguru.com should now:';
    RAISE NOTICE '1. Have an organization membership';
    RAISE NOTICE '2. Be able to see ALL board_packs (testing mode)';
    RAISE NOTICE '3. Have a valid user profile';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Refresh your browser';
    RAISE NOTICE '2. Sign in as test.director@appboardguru.com';
    RAISE NOTICE '3. Navigate to Assets page';
    RAISE NOTICE '4. Board packs should now be visible';
    RAISE NOTICE '========================================';
END $$;