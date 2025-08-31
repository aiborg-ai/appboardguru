-- =====================================================
-- COMPLETE FIX FOR ASSETS STORAGE BUCKET AND POLICIES
-- This script ensures everything is properly configured
-- =====================================================

-- 1. Ensure the assets storage bucket exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES (
  'assets', 
  'assets', 
  false,
  52428800, -- 50MB limit
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp'
  ]
)
ON CONFLICT (id) DO UPDATE 
SET 
  public = false,
  file_size_limit = 52428800,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Drop ALL existing policies to start fresh
DO $$
BEGIN
  -- Drop all policies for storage.objects related to assets bucket
  FOR r IN (
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname LIKE '%assets%'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', r.policyname);
  END LOOP;
END $$;

-- Also drop these specific policies if they exist
DROP POLICY IF EXISTS "Users can view their assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own assets" ON storage.objects;
DROP POLICY IF EXISTS "Service role can manage all assets" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload to assets bucket" ON storage.objects;

-- 3. Create new comprehensive policies

-- Policy 1: Allow authenticated users to upload files to assets bucket
CREATE POLICY "Auth users can upload to assets bucket"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'assets'
);

-- Policy 2: Allow authenticated users to view all files in assets bucket
-- (You may want to restrict this based on organization membership)
CREATE POLICY "Auth users can view assets"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'assets'
);

-- Policy 3: Allow users to update their own uploaded files
CREATE POLICY "Users can update own assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'assets' 
    AND owner = auth.uid()
)
WITH CHECK (
    bucket_id = 'assets'
    AND owner = auth.uid()
);

-- Policy 4: Allow users to delete their own uploaded files
CREATE POLICY "Users can delete own assets"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'assets'
    AND owner = auth.uid()
);

-- Policy 5: Allow service role full access (for backend operations)
CREATE POLICY "Service role full access to assets"
ON storage.objects
TO service_role
USING (bucket_id = 'assets')
WITH CHECK (bucket_id = 'assets');

-- 4. Ensure RLS is enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

-- 5. Create bucket policy if needed
DROP POLICY IF EXISTS "Public Access" ON storage.buckets;
CREATE POLICY "Authenticated users can see assets bucket"
ON storage.buckets FOR SELECT
TO authenticated
USING (id = 'assets');

-- 6. Verify the setup
DO $$
DECLARE
  bucket_exists BOOLEAN;
  policy_count INTEGER;
BEGIN
  -- Check if bucket exists
  SELECT EXISTS(SELECT 1 FROM storage.buckets WHERE id = 'assets') INTO bucket_exists;
  
  IF NOT bucket_exists THEN
    RAISE EXCEPTION 'Assets bucket was not created!';
  END IF;
  
  -- Count policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE '%assets%';
  
  RAISE NOTICE 'SUCCESS: Assets bucket exists with % policies configured', policy_count;
  RAISE NOTICE 'Bucket configuration complete!';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Test upload through the UI';
  RAISE NOTICE '2. Check server logs for any remaining errors';
  RAISE NOTICE '3. If still failing, check browser console for details';
END $$;

-- Show current policies for verification
SELECT 
  policyname,
  cmd as action,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'storage'
AND tablename = 'objects'
AND policyname LIKE '%assets%'
ORDER BY policyname;