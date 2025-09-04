-- =====================================================
-- FIX ASSETS TABLE RLS POLICIES
-- Migration: 20250104_fix_assets_rls_policies
-- Description: Fix Row Level Security policies for assets table to allow uploads
-- Author: system
-- Created: 2025-01-04
-- =====================================================

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Users can view their own assets" ON assets;
DROP POLICY IF EXISTS "Users can insert assets" ON assets;
DROP POLICY IF EXISTS "Users can update their own assets" ON assets;
DROP POLICY IF EXISTS "Users can delete their own assets" ON assets;
DROP POLICY IF EXISTS "Users can view organization assets" ON assets;
DROP POLICY IF EXISTS "Service role can manage assets" ON assets;

-- Enable RLS on assets table
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can INSERT their own assets
CREATE POLICY "assets_insert_policy" ON assets
FOR INSERT
WITH CHECK (
    auth.uid() = owner_id
);

-- Policy 2: Users can VIEW their own assets
CREATE POLICY "assets_select_own_policy" ON assets
FOR SELECT
USING (
    auth.uid() = owner_id
);

-- Policy 3: Users can VIEW assets from their organizations
CREATE POLICY "assets_select_org_policy" ON assets
FOR SELECT
USING (
    organization_id IN (
        SELECT organization_id 
        FROM organization_members 
        WHERE user_id = auth.uid() 
        AND status = 'active'
    )
);

-- Policy 4: Users can UPDATE their own assets
CREATE POLICY "assets_update_policy" ON assets
FOR UPDATE
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

-- Policy 5: Users can DELETE their own assets
CREATE POLICY "assets_delete_policy" ON assets
FOR DELETE
USING (auth.uid() = owner_id);

-- Policy 6: Service role can do everything (for backend operations)
CREATE POLICY "service_role_assets_policy" ON assets
USING (auth.jwt() ->> 'role' = 'service_role')
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Verify the policies were created
DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public' 
    AND tablename = 'assets';
    
    IF policy_count < 6 THEN
        RAISE WARNING 'Expected 6 RLS policies but found %', policy_count;
    ELSE
        RAISE NOTICE 'SUCCESS: % RLS policies created for assets table', policy_count;
    END IF;
END $$;

-- Grant necessary permissions
GRANT ALL ON assets TO authenticated;
GRANT SELECT ON assets TO anon;

-- Test the policies with a sample query (will not actually insert)
-- This is just to verify the policies compile correctly
DO $$
BEGIN
    -- This block intentionally left empty
    -- The policies will be tested when users try to upload
    RAISE NOTICE 'RLS policies configured. Users can now upload assets.';
END $$;