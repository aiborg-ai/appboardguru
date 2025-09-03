-- =====================================================
-- COMPLETE STORAGE BUCKET SETUP AND FIX
-- Migration: 20250103_fix_storage_bucket_complete
-- Description: Comprehensive setup of assets storage bucket with proper RLS policies
-- Author: system
-- Created: 2025-01-03
-- =====================================================

-- =====================================================
-- STEP 1: Create Storage Bucket
-- =====================================================

-- Create the assets storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'assets', 
  'assets', 
  false,  -- Private bucket
  52428800,  -- 50MB limit
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/markdown',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'video/mp4',
    'video/quicktime',
    'audio/mpeg',
    'audio/wav',
    'application/zip'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE 
SET 
  public = false,
  file_size_limit = 52428800,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- =====================================================
-- STEP 2: Drop All Existing Storage Policies
-- =====================================================

-- Drop all existing policies to start fresh
DO $$ 
DECLARE 
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname LIKE '%asset%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

-- Also drop any generic policies that might conflict
DROP POLICY IF EXISTS "Users can view their assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload assets" ON storage.objects;
DROP POLICY IF EXISTS "Service role can manage assets" ON storage.objects;
DROP POLICY IF EXISTS "Service role can manage all assets" ON storage.objects;

-- =====================================================
-- STEP 3: Create New Comprehensive Storage Policies
-- =====================================================

-- Policy 1: Allow authenticated users to SELECT/VIEW assets
CREATE POLICY "assets_select_authenticated"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'assets' 
    AND auth.uid() IS NOT NULL
);

-- Policy 2: Allow authenticated users to INSERT/UPLOAD assets
CREATE POLICY "assets_insert_authenticated"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'assets' 
    AND auth.uid() IS NOT NULL
);

-- Policy 3: Allow users to UPDATE their own assets
-- The path structure is: userId/organizationId/folder/filename
CREATE POLICY "assets_update_own"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'assets' 
    AND auth.uid() IS NOT NULL
    AND (
        -- User owns the file (first segment of path is user ID)
        (string_to_array(name, '/'))[1] = auth.uid()::text
        OR
        -- Service role can update any file
        auth.jwt()->>'role' = 'service_role'
    )
)
WITH CHECK (
    bucket_id = 'assets' 
    AND auth.uid() IS NOT NULL
);

-- Policy 4: Allow users to DELETE their own assets
CREATE POLICY "assets_delete_own"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'assets' 
    AND auth.uid() IS NOT NULL
    AND (
        -- User owns the file
        (string_to_array(name, '/'))[1] = auth.uid()::text
        OR
        -- Service role can delete any file
        auth.jwt()->>'role' = 'service_role'
    )
);

-- =====================================================
-- STEP 4: Grant Permissions
-- =====================================================

-- Grant necessary permissions to authenticated users
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;
GRANT USAGE ON SCHEMA storage TO authenticated;

-- Grant permissions to anon users (for public access if needed later)
GRANT USAGE ON SCHEMA storage TO anon;
GRANT SELECT ON storage.objects TO anon;
GRANT SELECT ON storage.buckets TO anon;

-- =====================================================
-- STEP 5: Create Helper Functions
-- =====================================================

-- Function to check if user has access to an asset
CREATE OR REPLACE FUNCTION storage.user_can_access_asset(user_id uuid, file_path text)
RETURNS boolean AS $$
BEGIN
  -- Check if user owns the file or has organization access
  RETURN (
    -- User owns the file
    (string_to_array(file_path, '/'))[1] = user_id::text
    OR
    -- User is member of the organization (second segment is org ID)
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.user_id = user_id
      AND om.organization_id = (string_to_array(file_path, '/'))[2]::uuid
      AND om.status = 'active'
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 6: Verify Setup
-- =====================================================

DO $$
DECLARE
  bucket_exists boolean;
  policy_count integer;
BEGIN
  -- Check if bucket exists
  SELECT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'assets'
  ) INTO bucket_exists;
  
  IF NOT bucket_exists THEN
    RAISE EXCEPTION 'ERROR: Assets storage bucket was not created!';
  END IF;
  
  -- Count policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname LIKE 'assets_%';
  
  IF policy_count < 4 THEN
    RAISE WARNING 'WARNING: Expected 4 storage policies but found %', policy_count;
  END IF;
  
  RAISE NOTICE 'SUCCESS: Assets storage bucket configured with % policies', policy_count;
END $$;

-- =====================================================
-- STEP 7: Create Diagnostic View
-- =====================================================

CREATE OR REPLACE VIEW storage.bucket_diagnostics AS
SELECT 
  b.id as bucket_id,
  b.name as bucket_name,
  b.public as is_public,
  b.file_size_limit,
  b.created_at,
  (SELECT COUNT(*) FROM storage.objects WHERE bucket_id = b.id) as file_count,
  (SELECT SUM(metadata->>'size')::bigint FROM storage.objects WHERE bucket_id = b.id) as total_size,
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname LIKE b.name || '_%') as policy_count
FROM storage.buckets b
WHERE b.id = 'assets';

-- Grant access to the diagnostic view
GRANT SELECT ON storage.bucket_diagnostics TO authenticated;

-- =====================================================
-- Instructions for Manual Verification
-- =====================================================
COMMENT ON TABLE storage.buckets IS '
After running this migration, verify the setup:

1. Check bucket exists:
   SELECT * FROM storage.buckets WHERE id = ''assets'';

2. Check policies:
   SELECT * FROM pg_policies WHERE schemaname = ''storage'' AND tablename = ''objects'' AND policyname LIKE ''assets_%'';

3. Check diagnostics:
   SELECT * FROM storage.bucket_diagnostics;

4. Test upload:
   Try uploading a file through the application UI

If upload still fails:
1. Check Supabase Dashboard > Storage > Policies
2. Ensure RLS is enabled but policies allow access
3. Check service role key is properly configured
4. Review browser console for specific error messages
';

-- =====================================================
-- DOWN MIGRATION (for rollback if needed)
-- =====================================================
-- To rollback this migration, run:
-- DROP POLICY IF EXISTS "assets_select_authenticated" ON storage.objects;
-- DROP POLICY IF EXISTS "assets_insert_authenticated" ON storage.objects;
-- DROP POLICY IF EXISTS "assets_update_own" ON storage.objects;
-- DROP POLICY IF EXISTS "assets_delete_own" ON storage.objects;
-- DROP FUNCTION IF EXISTS storage.user_can_access_asset;
-- DROP VIEW IF EXISTS storage.bucket_diagnostics;
-- DELETE FROM storage.buckets WHERE id = 'assets';