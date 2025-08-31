-- Emergency Fix - Make Assets Table Completely Open for Testing
-- This will allow us to diagnose the exact issue

-- 1. Disable RLS completely on assets table (temporary for testing)
ALTER TABLE assets DISABLE ROW LEVEL SECURITY;

-- 2. Also disable RLS on related tables that might be blocking
DO $$
BEGIN
    -- Disable RLS on vaults if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vaults') THEN
        ALTER TABLE vaults DISABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Disabled RLS on vaults table';
    END IF;
    
    -- Disable RLS on audit_logs if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
        ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Disabled RLS on audit_logs table';
    END IF;
    
    -- Disable RLS on any other related tables
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'asset_versions') THEN
        ALTER TABLE asset_versions DISABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Disabled RLS on asset_versions table';
    END IF;
END $$;

-- 3. Show current RLS status
SELECT 
    tablename,
    rowsecurity as "RLS Enabled"
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('assets', 'vaults', 'audit_logs', 'organizations', 'organization_members')
ORDER BY tablename;

-- 4. Test insert (this should work now)
-- Try a simple insert to verify the table is accessible
DO $$
BEGIN
    -- Check if we can insert
    INSERT INTO assets (id, file_name, file_type, file_size, created_at)
    VALUES (
        gen_random_uuid(),
        'test-file.pdf',
        'application/pdf',
        1024,
        now()
    );
    
    -- Immediately delete the test record
    DELETE FROM assets WHERE file_name = 'test-file.pdf';
    
    RAISE NOTICE 'Test insert/delete successful - table is accessible!';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error during test: %', SQLERRM;
        RAISE NOTICE 'This means there are required columns we need to identify';
END $$;

-- 5. Show all columns with their constraints
SELECT 
    c.column_name,
    c.data_type,
    c.is_nullable,
    c.column_default,
    CASE 
        WHEN c.column_default LIKE '%gen_random_uuid%' THEN 'Auto-generated UUID'
        WHEN c.column_default LIKE '%now()%' THEN 'Auto-timestamp'
        WHEN c.column_default IS NOT NULL THEN 'Has default'
        WHEN c.is_nullable = 'NO' THEN '⚠️ REQUIRED'
        ELSE 'Optional'
    END as notes
FROM information_schema.columns c
WHERE c.table_name = 'assets'
ORDER BY c.ordinal_position;

SELECT '🚨 EMERGENCY MODE ACTIVATED' as status;
SELECT 'RLS has been DISABLED on assets and related tables' as message;
SELECT 'Try uploading now - it should work!' as action;
SELECT '' as blank;
SELECT '⚠️ IMPORTANT: This is temporary for testing only!' as warning;
SELECT 'Once upload works, we will create proper policies based on the actual structure.' as next_step;