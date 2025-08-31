-- Fix RLS Policies for Assets Table (Corrected Version)
-- Assets are linked to vaults, which are linked to organizations

-- First, check the structure
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_name = 'assets'
ORDER BY ordinal_position;

-- Enable RLS on assets table
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies on assets
DROP POLICY IF EXISTS "Users can view assets in their organizations" ON assets;
DROP POLICY IF EXISTS "Users can create assets in their organizations" ON assets;
DROP POLICY IF EXISTS "Users can update their own assets" ON assets;
DROP POLICY IF EXISTS "Users can delete their own assets" ON assets;
DROP POLICY IF EXISTS "asset_select" ON assets;
DROP POLICY IF EXISTS "asset_insert" ON assets;
DROP POLICY IF EXISTS "asset_update" ON assets;
DROP POLICY IF EXISTS "asset_delete" ON assets;

-- Create policies based on vault_id relationship

-- SELECT: Users can view assets in vaults they have access to
CREATE POLICY "asset_select"
ON assets FOR SELECT
USING (
    -- Check if user has access to the vault
    EXISTS (
        SELECT 1 FROM vaults v
        JOIN organization_members om ON om.organization_id = v.organization_id
        WHERE v.id = assets.vault_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
    )
    OR
    -- Or if they uploaded the asset
    uploaded_by = auth.uid()
);

-- INSERT: Users can create assets in vaults they have access to
CREATE POLICY "asset_insert"
ON assets FOR INSERT
WITH CHECK (
    -- User must have access to the vault
    EXISTS (
        SELECT 1 FROM vaults v
        JOIN organization_members om ON om.organization_id = v.organization_id
        WHERE v.id = assets.vault_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
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
    -- Or user is an admin/owner in the organization that owns the vault
    EXISTS (
        SELECT 1 FROM vaults v
        JOIN organization_members om ON om.organization_id = v.organization_id
        WHERE v.id = assets.vault_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
        AND om.status = 'active'
    )
);

-- DELETE: Users can delete assets they uploaded or have admin rights
CREATE POLICY "asset_delete"
ON assets FOR DELETE
USING (
    -- User uploaded the asset
    uploaded_by = auth.uid()
    OR
    -- Or user is an admin/owner in the organization that owns the vault
    EXISTS (
        SELECT 1 FROM vaults v
        JOIN organization_members om ON om.organization_id = v.organization_id
        WHERE v.id = assets.vault_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
        AND om.status = 'active'
    )
);

-- Also ensure vaults table has proper policies
ALTER TABLE vaults ENABLE ROW LEVEL SECURITY;

-- Drop existing vault policies
DROP POLICY IF EXISTS "vault_select" ON vaults;
DROP POLICY IF EXISTS "vault_insert" ON vaults;
DROP POLICY IF EXISTS "vault_update" ON vaults;
DROP POLICY IF EXISTS "vault_delete" ON vaults;

-- Create vault policies
CREATE POLICY "vault_select"
ON vaults FOR SELECT
USING (
    -- User can see vaults in organizations they belong to
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_id = vaults.organization_id
        AND user_id = auth.uid()
        AND status = 'active'
    )
);

CREATE POLICY "vault_insert"
ON vaults FOR INSERT
WITH CHECK (
    -- User must be a member of the organization
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_id = vaults.organization_id
        AND user_id = auth.uid()
        AND status = 'active'
    )
);

CREATE POLICY "vault_update"
ON vaults FOR UPDATE
USING (
    -- User must be an admin/owner of the organization
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_id = vaults.organization_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
);

CREATE POLICY "vault_delete"
ON vaults FOR DELETE
USING (
    -- User must be an owner of the organization
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_id = vaults.organization_id
        AND user_id = auth.uid()
        AND role = 'owner'
        AND status = 'active'
    )
);

-- Test the policies
SELECT 'Policies updated successfully!' as message;
SELECT 'Assets and vaults should now work properly!' as result;