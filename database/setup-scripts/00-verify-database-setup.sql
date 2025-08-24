-- =====================================================
-- DATABASE SETUP VERIFICATION SCRIPT
-- Run this script to verify all required tables exist for vault creation
-- =====================================================

-- Check if required tables exist
DO $$
DECLARE
    missing_tables TEXT[] := '{}';
    table_name TEXT;
    table_exists BOOLEAN;
BEGIN
    -- List of required tables for vault functionality
    FOR table_name IN 
        SELECT unnest(ARRAY[
            'users', 'organizations', 'organization_members', 'organization_features',
            'vaults', 'vault_members', 'assets', 'asset_shares', 'asset_annotations'
        ])
    LOOP
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = table_name
        ) INTO table_exists;
        
        IF NOT table_exists THEN
            missing_tables := array_append(missing_tables, table_name);
        END IF;
    END LOOP;
    
    IF array_length(missing_tables, 1) > 0 THEN
        RAISE NOTICE '❌ MISSING TABLES: %', array_to_string(missing_tables, ', ');
        RAISE NOTICE 'Please run the database setup scripts in order:';
        RAISE NOTICE '1. 01-core-tables-email-assets.sql';
        RAISE NOTICE '2. 02-test-user-setup.sql';
        RAISE NOTICE '3. 03-create-assets-and-vaults-tables.sql';
        RAISE NOTICE '4. 04-synthetic-test-data.sql';
    ELSE
        RAISE NOTICE '✅ All required tables exist!';
    END IF;
END $$;

-- Check if test user exists
DO $$
DECLARE
    test_user_exists BOOLEAN;
    test_user_id UUID;
    test_org_exists BOOLEAN;
    test_org_id UUID;
BEGIN
    -- Check auth.users table
    SELECT EXISTS (
        SELECT 1 FROM auth.users 
        WHERE email = 'test.director@appboardguru.com'
    ) INTO test_user_exists;
    
    IF NOT test_user_exists THEN
        RAISE NOTICE '❌ Test user not found in auth.users';
        RAISE NOTICE 'Please create test.director@appboardguru.com in Supabase Auth first';
    ELSE
        RAISE NOTICE '✅ Test user exists in auth.users';
        
        -- Get the user ID
        SELECT id INTO test_user_id 
        FROM auth.users 
        WHERE email = 'test.director@appboardguru.com';
        
        -- Check public.users table
        IF EXISTS (SELECT 1 FROM public.users WHERE id = test_user_id) THEN
            RAISE NOTICE '✅ Test user profile exists in public.users';
        ELSE
            RAISE NOTICE '❌ Test user profile missing in public.users';
        END IF;
    END IF;
    
    -- Check test organization
    SELECT EXISTS (
        SELECT 1 FROM organizations 
        WHERE slug = 'test-board-org'
    ) INTO test_org_exists;
    
    IF test_org_exists THEN
        RAISE NOTICE '✅ Test organization exists';
        
        SELECT id INTO test_org_id FROM organizations WHERE slug = 'test-board-org';
        
        -- Check organization membership
        IF test_user_exists AND EXISTS (
            SELECT 1 FROM organization_members 
            WHERE organization_id = test_org_id 
            AND user_id = test_user_id
        ) THEN
            RAISE NOTICE '✅ Test user is member of test organization';
        ELSE
            RAISE NOTICE '❌ Test user is not a member of test organization';
        END IF;
    ELSE
        RAISE NOTICE '❌ Test organization does not exist';
    END IF;
END $$;

-- Check RLS policies
DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename IN ('users', 'organizations', 'organization_members', 'vaults', 'assets');
    
    IF policy_count > 0 THEN
        RAISE NOTICE '✅ RLS policies found: % policies', policy_count;
    ELSE
        RAISE NOTICE '❌ No RLS policies found - this may cause authorization issues';
    END IF;
END $$;

-- Show current user info (if any)
SELECT 
    'Current database users:' as info,
    COUNT(*) as user_count
FROM users;

SELECT 
    email,
    full_name,
    role,
    status,
    created_at
FROM users 
WHERE email LIKE '%appboardguru.com'
ORDER BY created_at DESC
LIMIT 5;

-- Show organizations
SELECT 
    'Organizations:' as info,
    COUNT(*) as org_count
FROM organizations;

SELECT 
    name,
    slug,
    created_by,
    created_at,
    is_active
FROM organizations 
ORDER BY created_at DESC
LIMIT 5;

-- Final summary
DO $$
DECLARE
    users_count INTEGER;
    orgs_count INTEGER;
    vaults_count INTEGER;
    assets_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO users_count FROM users;
    SELECT COUNT(*) INTO orgs_count FROM organizations;
    SELECT COUNT(*) INTO vaults_count FROM vaults;
    SELECT COUNT(*) INTO assets_count FROM assets WHERE is_deleted = false;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== DATABASE STATUS SUMMARY ===';
    RAISE NOTICE 'Users: %', users_count;
    RAISE NOTICE 'Organizations: %', orgs_count;
    RAISE NOTICE 'Vaults: %', vaults_count;
    RAISE NOTICE 'Assets: %', assets_count;
    RAISE NOTICE '===============================';
    
    IF users_count = 0 OR orgs_count = 0 THEN
        RAISE NOTICE '';
        RAISE NOTICE '⚠️  WARNING: Limited test data available';
        RAISE NOTICE 'Consider running the synthetic test data scripts for better testing';
    END IF;
END $$;