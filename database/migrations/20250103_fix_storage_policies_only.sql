-- =====================================================
-- FIX STORAGE POLICIES FOR EXISTING ASSETS BUCKET
-- Migration: 20250103_fix_storage_policies_only
-- Description: Fix RLS policies for the existing assets storage bucket
-- Author: system
-- Created: 2025-01-03
-- =====================================================

-- NOTE: This script assumes the 'assets' bucket already exists
-- It only updates the RLS policies for storage access

-- =====================================================
-- STEP 1: Drop existing problematic policies
-- =====================================================

-- Drop any existing policies that might be blocking access
DO $$ 
BEGIN
    -- Try to drop policies if they exist (won't error if they don't)
    DROP POLICY IF EXISTS "Users can view their assets" ON storage.objects;
    DROP POLICY IF EXISTS "Users can upload assets" ON storage.objects;
    DROP POLICY IF EXISTS "Users can update their assets" ON storage.objects;
    DROP POLICY IF EXISTS "Users can delete their assets" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated users can view assets" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated users can upload assets" ON storage.objects;
    DROP POLICY IF EXISTS "Service role can manage assets" ON storage.objects;
    DROP POLICY IF EXISTS "Service role can manage all assets" ON storage.objects;
    DROP POLICY IF EXISTS "assets_select_authenticated" ON storage.objects;
    DROP POLICY IF EXISTS "assets_insert_authenticated" ON storage.objects;
    DROP POLICY IF EXISTS "assets_update_own" ON storage.objects;
    DROP POLICY IF EXISTS "assets_delete_own" ON storage.objects;
    
    RAISE NOTICE 'Dropped existing policies (if any existed)';
EXCEPTION
    WHEN insufficient_privilege THEN
        RAISE NOTICE 'Cannot drop policies - insufficient privileges. This is normal.';
    WHEN OTHERS THEN
        RAISE NOTICE 'Error dropping policies: %', SQLERRM;
END $$;

-- =====================================================
-- STEP 2: Create new permissive policies
-- =====================================================

-- Create very permissive policies for authenticated users
-- These can be tightened later once uploads are working

DO $$
BEGIN
    -- Policy 1: Allow all authenticated users to SELECT from assets bucket
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Allow authenticated to view assets'
    ) THEN
        CREATE POLICY "Allow authenticated to view assets"
        ON storage.objects FOR SELECT
        USING (
            bucket_id = 'assets' AND 
            auth.role() = 'authenticated'
        );
        RAISE NOTICE 'Created SELECT policy';
    END IF;

    -- Policy 2: Allow all authenticated users to INSERT into assets bucket
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Allow authenticated to upload assets'
    ) THEN
        CREATE POLICY "Allow authenticated to upload assets"
        ON storage.objects FOR INSERT
        WITH CHECK (
            bucket_id = 'assets' AND 
            auth.role() = 'authenticated'
        );
        RAISE NOTICE 'Created INSERT policy';
    END IF;

    -- Policy 3: Allow users to UPDATE their own files
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Allow users to update own assets'
    ) THEN
        CREATE POLICY "Allow users to update own assets"
        ON storage.objects FOR UPDATE
        USING (
            bucket_id = 'assets' AND 
            auth.role() = 'authenticated' AND
            (storage.foldername(name))[1] = auth.uid()::text
        )
        WITH CHECK (
            bucket_id = 'assets' AND 
            auth.role() = 'authenticated'
        );
        RAISE NOTICE 'Created UPDATE policy';
    END IF;

    -- Policy 4: Allow users to DELETE their own files
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Allow users to delete own assets'
    ) THEN
        CREATE POLICY "Allow users to delete own assets"
        ON storage.objects FOR DELETE
        USING (
            bucket_id = 'assets' AND 
            auth.role() = 'authenticated' AND
            (storage.foldername(name))[1] = auth.uid()::text
        );
        RAISE NOTICE 'Created DELETE policy';
    END IF;

EXCEPTION
    WHEN insufficient_privilege THEN
        RAISE EXCEPTION 'Cannot create storage policies. You need to set these up in the Supabase Dashboard under Storage > Policies';
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error creating policies: %', SQLERRM;
END $$;

-- =====================================================
-- STEP 3: Verify the policies
-- =====================================================

DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'storage' 
    AND tablename = 'objects'
    AND policyname LIKE '%assets%';
    
    IF policy_count >= 4 THEN
        RAISE NOTICE 'SUCCESS: Found % policies for assets storage', policy_count;
    ELSE
        RAISE WARNING 'Warning: Only % policies found. Expected at least 4.', policy_count;
        RAISE NOTICE 'You may need to add policies manually in Supabase Dashboard.';
    END IF;
END $$;

-- =====================================================
-- Alternative: If SQL doesn't work, use Dashboard
-- =====================================================

/*
If this SQL script fails due to permissions, please:

1. Go to Supabase Dashboard > Storage
2. Click on the 'assets' bucket
3. Go to Policies tab
4. Add these policies:

POLICY 1 - View:
- Name: "Allow authenticated to view assets"
- Allowed operation: SELECT
- Target roles: authenticated
- USING expression: true

POLICY 2 - Upload:
- Name: "Allow authenticated to upload assets" 
- Allowed operation: INSERT
- Target roles: authenticated
- WITH CHECK expression: true

POLICY 3 - Update:
- Name: "Allow users to update own assets"
- Allowed operation: UPDATE
- Target roles: authenticated
- USING expression: (storage.foldername(name))[1] = auth.uid()::text

POLICY 4 - Delete:
- Name: "Allow users to delete own assets"
- Allowed operation: DELETE
- Target roles: authenticated
- USING expression: (storage.foldername(name))[1] = auth.uid()::text

After adding these policies, test file upload again.
*/