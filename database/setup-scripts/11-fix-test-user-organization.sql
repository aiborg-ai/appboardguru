-- =====================================================
-- FIX TEST USER ORGANIZATION MEMBERSHIP
-- Script 11: Ensure test.director has organization and can see board_packs
-- Run this in Supabase SQL Editor after script 10
-- =====================================================

-- =====================================================
-- 1. CHECK AND CREATE TEST ORGANIZATION IF NEEDED
-- =====================================================

DO $$
DECLARE
    test_user_id UUID;
    test_org_id UUID;
    member_count INTEGER;
BEGIN
    -- Get test user ID
    SELECT id INTO test_user_id 
    FROM users 
    WHERE email = 'test.director@appboardguru.com';
    
    IF test_user_id IS NULL THEN
        RAISE NOTICE 'Test user not found. Creating user profile...';
        
        -- Get user from auth.users
        SELECT id INTO test_user_id
        FROM auth.users
        WHERE email = 'test.director@appboardguru.com';
        
        IF test_user_id IS NOT NULL THEN
            -- Create user profile if auth user exists
            INSERT INTO users (id, email, full_name, role, status, company, position, created_at, updated_at)
            VALUES (
                test_user_id,
                'test.director@appboardguru.com',
                'Test Director',
                'director',
                'approved',
                'AppBoardGuru Test Company',
                'Director of Testing',
                NOW(),
                NOW()
            )
            ON CONFLICT (id) DO UPDATE SET
                full_name = 'Test Director',
                role = 'director',
                status = 'approved',
                updated_at = NOW();
                
            RAISE NOTICE 'Created/updated user profile for test.director';
        ELSE
            RAISE EXCEPTION 'test.director@appboardguru.com not found in auth.users. Please create the user first.';
        END IF;
    END IF;
    
    -- Check if test organization exists
    SELECT id INTO test_org_id 
    FROM organizations 
    WHERE slug = 'test-board-org';
    
    IF test_org_id IS NULL THEN
        RAISE NOTICE 'Test organization not found. Creating...';
        
        -- Create test organization
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
            'Test organization for AppBoardGuru testing',
            'https://test.appboardguru.com',
            'Technology',
            'medium',
            test_user_id,
            true,
            NOW(),
            NOW()
        );
        
        SELECT id INTO test_org_id 
        FROM organizations 
        WHERE slug = 'test-board-org';
        
        RAISE NOTICE 'Created test organization with ID: %', test_org_id;
    ELSE
        RAISE NOTICE 'Test organization exists with ID: %', test_org_id;
    END IF;
    
    -- Check if user is member of organization
    SELECT COUNT(*) INTO member_count
    FROM organization_members
    WHERE organization_id = test_org_id
    AND user_id = test_user_id;
    
    IF member_count = 0 THEN
        RAISE NOTICE 'User is not a member. Adding to organization...';
        
        -- Add user as owner of organization
        INSERT INTO organization_members (
            organization_id,
            user_id,
            role,
            status,
            invited_by,
            joined_at,
            last_accessed,
            is_primary
        ) VALUES (
            test_org_id,
            test_user_id,
            'owner',
            'active',
            test_user_id,
            NOW(),
            NOW(),
            true
        );
        
        RAISE NOTICE 'Added user as owner of organization';
    ELSE
        -- Update to ensure user is owner and active
        UPDATE organization_members
        SET 
            role = 'owner',
            status = 'active',
            is_primary = true,
            last_accessed = NOW()
        WHERE organization_id = test_org_id
        AND user_id = test_user_id;
        
        RAISE NOTICE 'Updated user membership to owner status';
    END IF;
    
END $$;

-- =====================================================
-- 2. UPDATE BOARD PACKS TO MATCH TEST USER
-- =====================================================

-- Update any board_packs that don't have the correct uploaded_by
UPDATE board_packs
SET uploaded_by = (
    SELECT id FROM users WHERE email = 'test.director@appboardguru.com'
)
WHERE uploaded_by NOT IN (
    SELECT id FROM users
) OR uploaded_by IS NULL;

-- =====================================================
-- 3. VERIFY SETUP
-- =====================================================

-- Check user and organization
SELECT 
    u.email,
    u.full_name,
    u.role as user_role,
    o.name as organization_name,
    o.slug as organization_slug,
    om.role as org_role,
    om.status as membership_status,
    om.is_primary
FROM users u
LEFT JOIN organization_members om ON u.id = om.user_id
LEFT JOIN organizations o ON om.organization_id = o.id
WHERE u.email = 'test.director@appboardguru.com';

-- Count board packs accessible to test user
SELECT 
    COUNT(*) as total_board_packs,
    COUNT(CASE WHEN uploaded_by = (SELECT id FROM users WHERE email = 'test.director@appboardguru.com') THEN 1 END) as uploaded_by_test_user
FROM board_packs;

-- Show sample of board packs
SELECT 
    bp.title,
    bp.file_name,
    u.email as uploaded_by_email,
    bp.created_at
FROM board_packs bp
LEFT JOIN users u ON bp.uploaded_by = u.id
ORDER BY bp.created_at DESC
LIMIT 5;

-- =====================================================
-- 4. CREATE RLS POLICY FOR BOARD_PACKS (if needed)
-- =====================================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their own board packs" ON board_packs;
DROP POLICY IF EXISTS "Users can view all board packs" ON board_packs;
DROP POLICY IF EXISTS "Authenticated users can view board packs" ON board_packs;

-- Create a simple policy that allows authenticated users to view all board packs
-- In production, you'd want more restrictive policies
CREATE POLICY "Authenticated users can view board packs"
ON board_packs
FOR SELECT
TO authenticated
USING (true);

-- Enable RLS on board_packs if not already enabled
ALTER TABLE board_packs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 5. FINAL STATUS
-- =====================================================

DO $$
DECLARE
    test_user_id UUID;
    org_count INTEGER;
    pack_count INTEGER;
BEGIN
    SELECT id INTO test_user_id FROM users WHERE email = 'test.director@appboardguru.com';
    
    SELECT COUNT(*) INTO org_count
    FROM organization_members om
    JOIN organizations o ON om.organization_id = o.id
    WHERE om.user_id = test_user_id
    AND om.status = 'active';
    
    SELECT COUNT(*) INTO pack_count FROM board_packs;
    
    RAISE NOTICE '';
    RAISE NOTICE '===== SETUP COMPLETE =====';
    RAISE NOTICE 'Test user has % active organization(s)', org_count;
    RAISE NOTICE 'Total board packs available: %', pack_count;
    RAISE NOTICE '';
    RAISE NOTICE 'The test.director@appboardguru.com user should now:';
    RAISE NOTICE '1. Be able to login';
    RAISE NOTICE '2. Have an organization (Test Board Organization)';
    RAISE NOTICE '3. See board packs on the assets page';
    RAISE NOTICE '==========================';
END $$;