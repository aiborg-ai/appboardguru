-- Check the structure of the assets table
-- This will show us what columns actually exist

-- Get all columns in the assets table
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'assets'
ORDER BY ordinal_position;

-- Check if there's a vault_id or similar column
SELECT column_name 
FROM information_schema.columns
WHERE table_name = 'assets'
AND column_name LIKE '%vault%' OR column_name LIKE '%org%';

-- Check existing policies on assets
SELECT 
    tablename,
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'assets';

-- Check if vaults table exists and its structure
SELECT 
    column_name
FROM information_schema.columns
WHERE table_name = 'vaults'
AND column_name IN ('id', 'organization_id', 'created_by')
ORDER BY ordinal_position;