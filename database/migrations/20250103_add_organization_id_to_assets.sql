-- =====================================================
-- ADD ORGANIZATION_ID TO ASSETS TABLE
-- Migration: 20250103_add_organization_id_to_assets
-- Description: Add missing organization_id field to assets table
-- Author: system
-- Created: 2025-01-03
-- =====================================================

-- Step 1: Add organization_id column to assets table
ALTER TABLE assets 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Step 2: Add vault_id column if missing
ALTER TABLE assets 
ADD COLUMN IF NOT EXISTS vault_id UUID REFERENCES vaults(id) ON DELETE SET NULL;

-- Step 3: Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_assets_organization_id ON assets(organization_id);
CREATE INDEX IF NOT EXISTS idx_assets_vault_id ON assets(vault_id);
CREATE INDEX IF NOT EXISTS idx_assets_owner_organization ON assets(owner_id, organization_id);

-- Step 4: Update existing assets to have organization_id from their owner's first organization
-- This is a one-time migration to fix existing data
UPDATE assets 
SET organization_id = (
  SELECT om.organization_id 
  FROM organization_members om 
  WHERE om.user_id = assets.owner_id 
  AND om.status = 'active'
  ORDER BY om.joined_at ASC 
  LIMIT 1
)
WHERE organization_id IS NULL 
AND owner_id IS NOT NULL;

-- Step 5: For future inserts, we'll handle organization_id in the application layer
-- But add a check constraint to ensure consistency
ALTER TABLE assets 
ADD CONSTRAINT check_organization_required 
CHECK (organization_id IS NOT NULL OR owner_id IS NULL);

-- Step 6: Update RLS policies to include organization checks
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own assets" ON assets;
DROP POLICY IF EXISTS "Users can create assets" ON assets;
DROP POLICY IF EXISTS "Users can update their own assets" ON assets;
DROP POLICY IF EXISTS "Users can delete their own assets" ON assets;

-- Create new policies with organization context
CREATE POLICY "Users can view assets in their organizations"
ON assets FOR SELECT
USING (
  auth.uid() = owner_id 
  OR 
  EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.user_id = auth.uid()
    AND om.organization_id = assets.organization_id
    AND om.status = 'active'
  )
  OR
  EXISTS (
    SELECT 1 FROM vault_members vm
    WHERE vm.user_id = auth.uid()
    AND vm.vault_id = assets.vault_id
    AND vm.status = 'active'
  )
);

CREATE POLICY "Users can create assets in their organizations"
ON assets FOR INSERT
WITH CHECK (
  auth.uid() = owner_id
  AND
  EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.user_id = auth.uid()
    AND om.organization_id = assets.organization_id
    AND om.status = 'active'
  )
);

CREATE POLICY "Users can update their own assets"
ON assets FOR UPDATE
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own assets"
ON assets FOR DELETE
USING (auth.uid() = owner_id);

-- Step 7: Add comment explaining the schema
COMMENT ON COLUMN assets.organization_id IS 'The organization this asset belongs to. Required for all assets.';
COMMENT ON COLUMN assets.vault_id IS 'Optional vault this asset is associated with. Can be NULL for organization-wide assets.';

-- Step 8: Verify the migration
DO $$
DECLARE
  col_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'assets' 
    AND column_name = 'organization_id'
  ) INTO col_exists;
  
  IF col_exists THEN
    RAISE NOTICE 'SUCCESS: organization_id column added to assets table';
  ELSE
    RAISE EXCEPTION 'ERROR: Failed to add organization_id column';
  END IF;
END $$;