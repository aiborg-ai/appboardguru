-- Fix assets table to match application expectations
-- Add missing columns and make schema more flexible

-- Add uploaded_by column if it doesn't exist
ALTER TABLE assets 
ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add user_id column if it doesn't exist
ALTER TABLE assets 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add organization_id column if it doesn't exist
ALTER TABLE assets 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Add vault_id column if it doesn't exist
ALTER TABLE assets 
ADD COLUMN IF NOT EXISTS vault_id UUID REFERENCES vaults(id) ON DELETE CASCADE;

-- Make original_file_name nullable since we don't always have it
ALTER TABLE assets 
ALTER COLUMN original_file_name DROP NOT NULL;

-- Make mime_type nullable since we might not always have it
ALTER TABLE assets 
ALTER COLUMN mime_type DROP NOT NULL;

-- Update existing rows to have sensible defaults
UPDATE assets 
SET 
  uploaded_by = COALESCE(uploaded_by, owner_id),
  user_id = COALESCE(user_id, owner_id),
  original_file_name = COALESCE(original_file_name, file_name),
  mime_type = COALESCE(mime_type, file_type)
WHERE uploaded_by IS NULL OR user_id IS NULL OR original_file_name IS NULL;

-- Enable RLS if not already enabled
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

-- SELECT: Users can view assets they have access to
CREATE POLICY "asset_select"
ON assets FOR SELECT
USING (
    -- User owns the asset
    owner_id = auth.uid()
    OR user_id = auth.uid()
    OR uploaded_by = auth.uid()
    OR
    -- User is in the same organization
    (organization_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_id = assets.organization_id
        AND user_id = auth.uid()
        AND status = 'active'
    ))
    OR
    -- User has access to the vault
    (vault_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM vault_members
        WHERE vault_id = assets.vault_id
        AND user_id = auth.uid()
        AND status = 'active'
    ))
);

-- INSERT: Users can create assets
CREATE POLICY "asset_insert"
ON assets FOR INSERT
WITH CHECK (
    -- User must be the uploader
    (uploaded_by = auth.uid() OR uploaded_by IS NULL)
    AND (user_id = auth.uid() OR user_id IS NULL)
    AND
    -- If organization_id is provided, user must be a member
    (
        organization_id IS NULL
        OR EXISTS (
            SELECT 1 FROM organization_members
            WHERE organization_id = assets.organization_id
            AND user_id = auth.uid()
            AND status = 'active'
        )
    )
);

-- UPDATE: Users can update their own assets
CREATE POLICY "asset_update"
ON assets FOR UPDATE
USING (
    -- User owns the asset
    owner_id = auth.uid()
    OR user_id = auth.uid()
    OR uploaded_by = auth.uid()
    OR
    -- User is an admin in the organization
    (organization_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_id = assets.organization_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND status = 'active'
    ))
);

-- DELETE: Users can delete their own assets
CREATE POLICY "asset_delete"
ON assets FOR DELETE
USING (
    -- User owns the asset
    owner_id = auth.uid()
    OR user_id = auth.uid()
    OR uploaded_by = auth.uid()
    OR
    -- User is an admin in the organization
    (organization_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_id = assets.organization_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND status = 'active'
    ))
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_assets_uploaded_by ON assets(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_assets_user_id ON assets(user_id);
CREATE INDEX IF NOT EXISTS idx_assets_organization_id ON assets(organization_id);
CREATE INDEX IF NOT EXISTS idx_assets_vault_id ON assets(vault_id);
CREATE INDEX IF NOT EXISTS idx_assets_created_at ON assets(created_at DESC);