-- URGENT: Apply this migration to fix the document upload issue
-- Date: 2025-09-06
-- 
-- INSTRUCTIONS:
-- 1. Go to your Supabase Dashboard
-- 2. Navigate to SQL Editor
-- 3. Copy and paste this entire script
-- 4. Click "Run" to execute
--
-- This fixes the RLS policies that are blocking uploads

-- 1. Drop existing problematic policies
DROP POLICY IF EXISTS "asset_insert" ON assets;
DROP POLICY IF EXISTS "asset_select" ON assets;
DROP POLICY IF EXISTS "asset_update" ON assets;
DROP POLICY IF EXISTS "asset_delete" ON assets;
DROP POLICY IF EXISTS "assets_insert_policy" ON assets;
DROP POLICY IF EXISTS "assets_select_policy" ON assets;
DROP POLICY IF EXISTS "assets_update_policy" ON assets;
DROP POLICY IF EXISTS "assets_delete_policy" ON assets;

-- 2. Create new, working INSERT policy
CREATE POLICY "assets_insert_policy"
ON assets FOR INSERT
WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
        -- Allow if user_id matches authenticated user
        user_id = auth.uid()
        OR 
        -- Allow if uploaded_by matches authenticated user
        uploaded_by = auth.uid()
        OR
        -- Allow if owner_id matches authenticated user
        owner_id = auth.uid()
    )
);

-- 3. Create SELECT policy
CREATE POLICY "assets_select_policy"
ON assets FOR SELECT
USING (
    auth.uid() IS NOT NULL
    AND (
        -- User owns the asset
        user_id = auth.uid()
        OR uploaded_by = auth.uid()
        OR owner_id = auth.uid()
        -- Or user belongs to the organization
        OR (
            organization_id IS NOT NULL
            AND organization_id IN (
                SELECT organization_id 
                FROM organization_members 
                WHERE user_id = auth.uid() 
                AND status = 'active'
            )
        )
        -- Or asset is shared with user
        OR id IN (
            SELECT asset_id 
            FROM asset_shares 
            WHERE user_id = auth.uid()
        )
    )
);

-- 4. Create UPDATE policy
CREATE POLICY "assets_update_policy"
ON assets FOR UPDATE
USING (
    auth.uid() IS NOT NULL
    AND (
        user_id = auth.uid()
        OR uploaded_by = auth.uid()
        OR owner_id = auth.uid()
    )
);

-- 5. Create DELETE policy
CREATE POLICY "assets_delete_policy"
ON assets FOR DELETE
USING (
    auth.uid() IS NOT NULL
    AND (
        user_id = auth.uid()
        OR uploaded_by = auth.uid()
        OR owner_id = auth.uid()
    )
);

-- 6. Add missing indexes for better performance
CREATE INDEX IF NOT EXISTS idx_assets_user_id ON assets(user_id);
CREATE INDEX IF NOT EXISTS idx_assets_uploaded_by ON assets(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_assets_owner_id ON assets(owner_id);
CREATE INDEX IF NOT EXISTS idx_assets_organization_id ON assets(organization_id);
CREATE INDEX IF NOT EXISTS idx_assets_created_at ON assets(created_at DESC);

-- 7. Set default values for user fields
ALTER TABLE assets 
ALTER COLUMN uploaded_by SET DEFAULT auth.uid();

ALTER TABLE assets 
ALTER COLUMN user_id SET DEFAULT auth.uid();

ALTER TABLE assets 
ALTER COLUMN owner_id SET DEFAULT auth.uid();

-- Verify the policies were created
SELECT tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'assets'
ORDER BY policyname;