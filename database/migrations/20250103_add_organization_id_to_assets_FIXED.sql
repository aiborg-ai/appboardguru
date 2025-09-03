-- =====================================================
-- ADD ORGANIZATION_ID TO ASSETS TABLE (FIXED VERSION)
-- Migration: 20250103_add_organization_id_to_assets_FIXED
-- Description: Add missing organization_id field to assets table - handles existing data
-- Author: system
-- Created: 2025-01-03
-- =====================================================

-- Step 1: Add organization_id column to assets table (nullable first)
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
-- This will set organization_id for all existing assets that have an owner
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

-- Step 5: For any remaining assets without organization_id, try to set from any organization
-- This handles edge cases where owner might not be in organization_members
UPDATE assets 
SET organization_id = (
  SELECT id 
  FROM organizations 
  WHERE created_by = assets.owner_id
  OR EXISTS (
    SELECT 1 FROM organization_members om 
    WHERE om.organization_id = organizations.id 
    AND om.user_id = assets.owner_id
  )
  ORDER BY created_at ASC 
  LIMIT 1
)
WHERE organization_id IS NULL 
AND owner_id IS NOT NULL;

-- Step 6: If there are still assets without organization_id, set to a default org
-- First, check if we have any organizations at all
DO $$
DECLARE
  default_org_id UUID;
  assets_without_org INTEGER;
BEGIN
  -- Count assets still without organization_id
  SELECT COUNT(*) INTO assets_without_org
  FROM assets 
  WHERE organization_id IS NULL;
  
  IF assets_without_org > 0 THEN
    -- Try to find a default organization (first one created)
    SELECT id INTO default_org_id
    FROM organizations 
    ORDER BY created_at ASC 
    LIMIT 1;
    
    IF default_org_id IS NOT NULL THEN
      -- Update remaining assets to use the default organization
      UPDATE assets 
      SET organization_id = default_org_id
      WHERE organization_id IS NULL;
      
      RAISE NOTICE 'Updated % assets with default organization %', assets_without_org, default_org_id;
    ELSE
      RAISE NOTICE 'No organizations found. Assets without organization_id will remain NULL';
    END IF;
  END IF;
END $$;

-- Step 7: DO NOT add the constraint that requires organization_id
-- This allows flexibility for assets that might not have an organization
-- The application will ensure new assets have organization_id

-- Step 8: Update RLS policies to include organization checks
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own assets" ON assets;
DROP POLICY IF EXISTS "Users can create assets" ON assets;
DROP POLICY IF EXISTS "Users can update their own assets" ON assets;
DROP POLICY IF EXISTS "Users can delete their own assets" ON assets;
DROP POLICY IF EXISTS "Users can view assets in their organizations" ON assets;
DROP POLICY IF EXISTS "Users can create assets in their organizations" ON assets;

-- Create new policies with organization context (but allow NULL organization_id)
CREATE POLICY "Users can view assets in their organizations"
ON assets FOR SELECT
USING (
  auth.uid() = owner_id 
  OR 
  (
    organization_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.user_id = auth.uid()
      AND om.organization_id = assets.organization_id
      AND om.status = 'active'
    )
  )
  OR
  (
    vault_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM vault_members vm
      WHERE vm.user_id = auth.uid()
      AND vm.vault_id = assets.vault_id
      AND vm.status = 'active'
    )
  )
);

CREATE POLICY "Users can create assets in their organizations"
ON assets FOR INSERT
WITH CHECK (
  auth.uid() = owner_id
  AND
  (
    organization_id IS NULL  -- Allow NULL for backward compatibility
    OR
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.user_id = auth.uid()
      AND om.organization_id = assets.organization_id
      AND om.status = 'active'
    )
  )
);

CREATE POLICY "Users can update their own assets"
ON assets FOR UPDATE
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own assets"
ON assets FOR DELETE
USING (auth.uid() = owner_id);

-- Step 9: Add comment explaining the schema
COMMENT ON COLUMN assets.organization_id IS 'The organization this asset belongs to. Can be NULL for legacy assets.';
COMMENT ON COLUMN assets.vault_id IS 'Optional vault this asset is associated with. Can be NULL for organization-wide assets.';

-- Step 10: Verify the migration
DO $$
DECLARE
  col_exists boolean;
  assets_with_org INTEGER;
  assets_total INTEGER;
BEGIN
  -- Check if column exists
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'assets' 
    AND column_name = 'organization_id'
  ) INTO col_exists;
  
  IF col_exists THEN
    -- Count assets with and without organization_id
    SELECT COUNT(*) INTO assets_total FROM assets;
    SELECT COUNT(*) INTO assets_with_org FROM assets WHERE organization_id IS NOT NULL;
    
    RAISE NOTICE 'SUCCESS: organization_id column added to assets table';
    RAISE NOTICE 'Total assets: %, Assets with organization: %, Assets without: %', 
                 assets_total, assets_with_org, (assets_total - assets_with_org);
  ELSE
    RAISE EXCEPTION 'ERROR: Failed to add organization_id column';
  END IF;
END $$;