-- =====================================================
-- ADD MISSING ORGANIZATION_ID COLUMN TO ASSET_ANNOTATIONS
-- Migration: 20250904_add_organization_id_column
-- Description: Add organization_id column if missing
-- =====================================================

-- Step 1: Add organization_id column if it doesn't exist
ALTER TABLE asset_annotations 
ADD COLUMN IF NOT EXISTS organization_id UUID;

-- Step 2: Populate organization_id from user's organization membership
DO $$
DECLARE
    v_default_org_id UUID;
BEGIN
    -- Check if organization_id column has any non-null values
    IF NOT EXISTS (
        SELECT 1 FROM asset_annotations WHERE organization_id IS NOT NULL LIMIT 1
    ) THEN
        -- Try to find a default organization
        SELECT id INTO v_default_org_id
        FROM organizations
        LIMIT 1;
        
        -- If we have a default org, update all null organization_id values
        IF v_default_org_id IS NOT NULL THEN
            -- Try to update with user's actual organization
            UPDATE asset_annotations aa
            SET organization_id = COALESCE(
                (
                    SELECT om.organization_id 
                    FROM organization_members om 
                    WHERE om.user_id = aa.created_by 
                    AND om.status = 'active'
                    LIMIT 1
                ),
                v_default_org_id
            )
            WHERE aa.organization_id IS NULL
            AND aa.created_by IS NOT NULL;
            
            -- For any remaining nulls, use the default
            UPDATE asset_annotations
            SET organization_id = v_default_org_id
            WHERE organization_id IS NULL;
            
            RAISE NOTICE 'Updated organization_id column';
        END IF;
    END IF;
END$$;

-- Step 3: Add foreign key constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_type = 'FOREIGN KEY'
        AND table_name = 'asset_annotations'
        AND constraint_name = 'asset_annotations_organization_id_fkey'
    ) THEN
        -- Only add foreign key if we have an organizations table
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'organizations'
        ) THEN
            ALTER TABLE asset_annotations
            ADD CONSTRAINT asset_annotations_organization_id_fkey
            FOREIGN KEY (organization_id) REFERENCES organizations(id)
            ON DELETE CASCADE;
            
            RAISE NOTICE 'Added foreign key constraint to organization_id column';
        END IF;
    ELSE
        RAISE NOTICE 'Foreign key constraint already exists';
    END IF;
END$$;

-- Step 4: Create index on organization_id for better query performance
CREATE INDEX IF NOT EXISTS idx_asset_annotations_organization_id 
ON asset_annotations(organization_id);

-- Success message
SELECT 'Successfully added organization_id column!' as message;