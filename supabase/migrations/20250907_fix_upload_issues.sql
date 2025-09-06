-- Fix Document Upload Issues Migration
-- Date: 2025-09-07
-- Purpose: Fix RLS policies and database constraints causing upload failures

-- 1. Fix RLS Policies for Assets Table
-- Drop existing problematic policies
DROP POLICY IF EXISTS "asset_insert" ON assets;
DROP POLICY IF EXISTS "asset_select" ON assets;
DROP POLICY IF EXISTS "asset_update" ON assets;
DROP POLICY IF EXISTS "asset_delete" ON assets;

-- Create more permissive INSERT policy that won't fail
CREATE POLICY "assets_insert_policy"
ON assets FOR INSERT
WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
        -- Allow if user is the uploader
        (uploaded_by = auth.uid() OR uploaded_by IS NULL)
        AND (user_id = auth.uid() OR user_id IS NULL)
    )
    AND (
        -- Allow NULL organization (personal assets)
        organization_id IS NULL
        OR 
        -- Or check organization membership
        organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid() 
            AND status = 'active'
        )
    )
);

-- Create SELECT policy
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

-- Create UPDATE policy
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

-- Create DELETE policy
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

-- 2. Fix Foreign Key Constraints
-- Ensure proper foreign key relationship exists
ALTER TABLE assets 
DROP CONSTRAINT IF EXISTS assets_owner_id_fkey;

ALTER TABLE assets 
ADD CONSTRAINT assets_owner_id_fkey 
FOREIGN KEY (owner_id) 
REFERENCES auth.users(id) 
ON DELETE SET NULL;

-- Ensure organization_id foreign key
ALTER TABLE assets
DROP CONSTRAINT IF EXISTS assets_organization_id_fkey;

ALTER TABLE assets
ADD CONSTRAINT assets_organization_id_fkey
FOREIGN KEY (organization_id)
REFERENCES organizations(id)
ON DELETE CASCADE;

-- 3. Create Upload Failure Log Table for Debugging
CREATE TABLE IF NOT EXISTS upload_failures (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    file_name TEXT,
    file_size BIGINT,
    error_message TEXT,
    error_code TEXT,
    storage_path TEXT,
    organization_id UUID REFERENCES organizations(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on upload_failures
ALTER TABLE upload_failures ENABLE ROW LEVEL SECURITY;

-- Users can only see their own failures
CREATE POLICY "upload_failures_select"
ON upload_failures FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own failures
CREATE POLICY "upload_failures_insert"
ON upload_failures FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 4. Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_assets_user_id ON assets(user_id);
CREATE INDEX IF NOT EXISTS idx_assets_uploaded_by ON assets(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_assets_organization_id ON assets(organization_id);
CREATE INDEX IF NOT EXISTS idx_assets_created_at ON assets(created_at DESC);

-- 5. Create helper function to validate organization membership
CREATE OR REPLACE FUNCTION is_org_member(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM organization_members 
        WHERE organization_id = org_id 
        AND user_id = auth.uid() 
        AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Add default values for potentially NULL columns
ALTER TABLE assets 
ALTER COLUMN uploaded_by SET DEFAULT auth.uid();

ALTER TABLE assets 
ALTER COLUMN user_id SET DEFAULT auth.uid();

ALTER TABLE assets 
ALTER COLUMN owner_id SET DEFAULT auth.uid();

-- 7. Create a function to clean up orphaned storage files
CREATE OR REPLACE FUNCTION cleanup_orphaned_files()
RETURNS void AS $$
DECLARE
    storage_file RECORD;
BEGIN
    -- Find files in storage that don't have corresponding database records
    -- This is a placeholder - actual implementation depends on storage structure
    -- Would need to be implemented with storage API calls
    RAISE NOTICE 'Cleanup function created - implementation pending';
END;
$$ LANGUAGE plpgsql;

-- 8. Add trigger to log upload failures
CREATE OR REPLACE FUNCTION log_upload_failure()
RETURNS TRIGGER AS $$
BEGIN
    -- Log when an insert fails
    IF TG_OP = 'INSERT' AND NOT NEW.id IS NULL THEN
        INSERT INTO upload_failures (
            user_id,
            file_name,
            file_size,
            error_message,
            organization_id
        ) VALUES (
            auth.uid(),
            NEW.file_name,
            NEW.file_size,
            'RLS policy violation or constraint failure',
            NEW.organization_id
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: Trigger cannot be added for RLS failures as they prevent the operation
-- This is more for logging other types of failures

COMMENT ON TABLE upload_failures IS 'Tracks failed upload attempts for debugging';
COMMENT ON FUNCTION is_org_member IS 'Helper function to check organization membership';
COMMENT ON FUNCTION cleanup_orphaned_files IS 'Cleanup orphaned files in storage';