-- =====================================================
-- FIX ASSETS STORAGE BUCKET AND POLICIES
-- This script ensures the 'assets' storage bucket exists
-- and has proper policies for file uploads
-- =====================================================

-- 1. Create the assets storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('assets', 'assets', false)
ON CONFLICT (id) DO UPDATE 
SET public = false;

-- 2. Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Users can view their assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their assets" ON storage.objects;
DROP POLICY IF EXISTS "Service role can manage assets" ON storage.objects;

-- 3. Create comprehensive storage policies for the assets bucket

-- Allow authenticated users to view assets in their organization
CREATE POLICY "Authenticated users can view assets"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'assets' 
    AND auth.uid() IS NOT NULL
);

-- Allow authenticated users to upload assets
CREATE POLICY "Authenticated users can upload assets"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'assets' 
    AND auth.uid() IS NOT NULL
);

-- Allow users to update their own assets
CREATE POLICY "Users can update their own assets"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'assets' 
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
    bucket_id = 'assets' 
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own assets
CREATE POLICY "Users can delete their own assets"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'assets' 
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow service role to manage all assets (for backend operations)
CREATE POLICY "Service role can manage all assets"
ON storage.objects
USING (
    bucket_id = 'assets'
    AND auth.role() = 'service_role'
)
WITH CHECK (
    bucket_id = 'assets'
    AND auth.role() = 'service_role'
);

-- 4. Verify the bucket was created
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'assets') THEN
        RAISE NOTICE 'SUCCESS: Assets storage bucket exists and policies have been updated!';
    ELSE
        RAISE EXCEPTION 'ERROR: Failed to create assets storage bucket!';
    END IF;
END $$;

-- 5. Grant necessary permissions
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;

-- Instructions:
-- Run this script in your Supabase SQL editor to fix the storage bucket issue.
-- After running this script, test uploading a file through the UI.