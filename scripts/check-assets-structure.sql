-- Check the actual structure of the assets table
-- This will help us understand what columns exist and what's missing
-- Last updated: Force Vercel rebuild

-- 1. Show all columns in the assets table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'assets'
ORDER BY ordinal_position;

-- 2. Check if any of the expected columns exist
SELECT 
    'owner_id' as expected_column,
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assets' AND column_name = 'owner_id') as exists
UNION ALL
SELECT 
    'user_id',
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assets' AND column_name = 'user_id')
UNION ALL
SELECT 
    'uploaded_by',
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assets' AND column_name = 'uploaded_by')
UNION ALL
SELECT 
    'organization_id',
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assets' AND column_name = 'organization_id')
UNION ALL
SELECT 
    'vault_id',
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assets' AND column_name = 'vault_id');

-- 3. Check RLS status
SELECT 
    relname as table_name,
    relrowsecurity as rls_enabled
FROM pg_class
WHERE relname = 'assets';

-- 4. Show current policies on assets table
SELECT 
    policyname,
    cmd,
    permissive
FROM pg_policies
WHERE tablename = 'assets';