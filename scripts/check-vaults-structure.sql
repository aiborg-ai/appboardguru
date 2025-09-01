-- Check the vaults table structure and fix any issues

-- 1. Show all columns in the vaults table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'vaults'
ORDER BY ordinal_position;

-- 2. Check if required columns exist
SELECT 
    'organization_id' as required_column,
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vaults' AND column_name = 'organization_id') as exists
UNION ALL
SELECT 
    'created_by',
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vaults' AND column_name = 'created_by')
UNION ALL
SELECT 
    'name',
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vaults' AND column_name = 'name')
UNION ALL
SELECT 
    'description',
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vaults' AND column_name = 'description')
UNION ALL
SELECT 
    'is_public',
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vaults' AND column_name = 'is_public')
UNION ALL
SELECT 
    'metadata',
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vaults' AND column_name = 'metadata');

-- 3. Check RLS status
SELECT 
    relname as table_name,
    relrowsecurity as rls_enabled
FROM pg_class
WHERE relname = 'vaults';

-- 4. Show current policies on vaults table
SELECT 
    policyname,
    cmd as operation,
    permissive
FROM pg_policies
WHERE tablename = 'vaults'
ORDER BY cmd;

-- 5. Check if vault_members table exists
SELECT 
    'vault_members table exists' as check,
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vault_members') as result;