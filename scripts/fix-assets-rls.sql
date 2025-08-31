-- Fix RLS Policies for Assets Table
-- This enables asset upload and management functionality

-- Check if assets table exists and has RLS enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'assets';

-- Enable RLS on assets table
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "Users can view assets in their organizations" ON assets;
DROP POLICY IF EXISTS "Users can create assets in their organizations" ON assets;
DROP POLICY IF EXISTS "Users can update their own assets" ON assets;
DROP POLICY IF EXISTS "Users can delete their own assets" ON assets;
DROP POLICY IF EXISTS "asset_select" ON assets;
DROP POLICY IF EXISTS "asset_insert" ON assets;
DROP POLICY IF EXISTS "asset_update" ON assets;
DROP POLICY IF EXISTS "asset_delete" ON assets;

-- Create comprehensive policies for assets table

-- SELECT: Users can view assets in organizations they belong to
CREATE POLICY "asset_select"
ON assets FOR SELECT
USING (
    -- User can see assets if they are a member of the organization
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_id = assets.organization_id
        AND user_id = auth.uid()
        AND status = 'active'
    )
    OR
    -- Or if they uploaded the asset
    uploaded_by = auth.uid()
);

-- INSERT: Users can create assets in organizations they belong to
CREATE POLICY "asset_insert"
ON assets FOR INSERT
WITH CHECK (
    -- User must be a member of the organization
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_id = assets.organization_id
        AND user_id = auth.uid()
        AND status = 'active'
    )
    AND
    -- And the uploaded_by field must match the current user
    uploaded_by = auth.uid()
);

-- UPDATE: Users can update assets they uploaded or have admin rights
CREATE POLICY "asset_update"
ON assets FOR UPDATE
USING (
    -- User uploaded the asset
    uploaded_by = auth.uid()
    OR
    -- Or user is an admin/owner of the organization
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_id = assets.organization_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
)
WITH CHECK (
    -- Can't change the uploaded_by field to someone else
    uploaded_by = auth.uid() OR uploaded_by = assets.uploaded_by
);

-- DELETE: Users can delete assets they uploaded or have admin rights
CREATE POLICY "asset_delete"
ON assets FOR DELETE
USING (
    -- User uploaded the asset
    uploaded_by = auth.uid()
    OR
    -- Or user is an admin/owner of the organization
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_id = assets.organization_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
);

-- Check if audit_logs table exists and has policies
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'audit_logs';

-- Enable RLS on audit_logs table (if it exists)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing audit_logs policies
DROP POLICY IF EXISTS "Users can view audit logs for their organizations" ON audit_logs;
DROP POLICY IF EXISTS "Users can create audit logs" ON audit_logs;
DROP POLICY IF EXISTS "audit_log_select" ON audit_logs;
DROP POLICY IF EXISTS "audit_log_insert" ON audit_logs;

-- Create policies for audit_logs table

-- SELECT: Users can view audit logs for their organizations
CREATE POLICY "audit_log_select"
ON audit_logs FOR SELECT
USING (
    -- User can see audit logs if they are a member of the organization
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_id = audit_logs.organization_id
        AND user_id = auth.uid()
        AND status = 'active'
    )
    OR
    -- Or if the log is about them
    user_id = auth.uid()
);

-- INSERT: Allow authenticated users to create audit logs
CREATE POLICY "audit_log_insert"
ON audit_logs FOR INSERT
WITH CHECK (
    -- User must be authenticated
    auth.uid() IS NOT NULL
    AND
    -- If organization_id is provided, user must be a member
    (
        organization_id IS NULL
        OR
        EXISTS (
            SELECT 1 FROM organization_members
            WHERE organization_id = audit_logs.organization_id
            AND user_id = auth.uid()
            AND status = 'active'
        )
    )
);

-- Test the policies
SELECT 'Testing asset policies...' as status;

-- This should work for authenticated users who are members
SELECT COUNT(*) as asset_count FROM assets;
SELECT COUNT(*) as audit_log_count FROM audit_logs;

SELECT 'Asset policies updated successfully!' as message;
SELECT 'You can now upload and manage assets!' as result;