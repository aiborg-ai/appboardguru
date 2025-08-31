-- =====================================================
-- VERIFY STORAGE SETUP FOR ASSETS
-- Run this in Supabase SQL Editor to check everything is configured correctly
-- =====================================================

-- 1. Check if assets bucket exists
SELECT 
    id,
    name,
    public,
    created_at,
    updated_at
FROM storage.buckets 
WHERE id = 'assets';

-- 2. Check storage policies for assets bucket
SELECT 
    name,
    action,
    definition
FROM storage.policies
WHERE bucket_id = 'assets'
ORDER BY action;

-- 3. Check if there are any objects in the bucket
SELECT 
    COUNT(*) as total_files,
    SUM(metadata->>'size')::bigint as total_size_bytes
FROM storage.objects
WHERE bucket_id = 'assets';

-- 4. Check recent upload attempts (if any)
SELECT 
    id,
    name,
    metadata,
    created_at
FROM storage.objects
WHERE bucket_id = 'assets'
ORDER BY created_at DESC
LIMIT 5;

-- 5. Verify RLS is enabled on storage.objects
SELECT 
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'storage' 
AND tablename = 'objects';

-- Expected results:
-- 1. Should show 1 row with assets bucket
-- 2. Should show at least 2-4 policies (SELECT, INSERT, UPDATE, DELETE)
-- 3. Will show count of existing files
-- 4. Will show recent uploads if any
-- 5. Should show rowsecurity = true