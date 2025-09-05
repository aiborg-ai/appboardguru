-- =====================================================
-- FIX ANNOTATION TABLE - ADD MISSING COLUMNS
-- Run this in Supabase SQL editor to fix annotation saving
-- =====================================================

-- Step 1: Add created_by column if missing
ALTER TABLE asset_annotations 
ADD COLUMN IF NOT EXISTS created_by UUID;

-- Step 2: Add organization_id column if missing
ALTER TABLE asset_annotations 
ADD COLUMN IF NOT EXISTS organization_id UUID;

-- Step 3: Populate created_by with a default user if needed
DO $$
DECLARE
    v_default_user_id UUID;
BEGIN
    -- Get the test user or any user
    SELECT id INTO v_default_user_id
    FROM auth.users
    WHERE email = 'test.director@appboardguru.com'
    LIMIT 1;
    
    IF v_default_user_id IS NULL THEN
        SELECT id INTO v_default_user_id
        FROM auth.users
        LIMIT 1;
    END IF;
    
    -- Update any null created_by values
    IF v_default_user_id IS NOT NULL THEN
        UPDATE asset_annotations 
        SET created_by = v_default_user_id
        WHERE created_by IS NULL;
        
        RAISE NOTICE 'Updated created_by with user: %', v_default_user_id;
    END IF;
END$$;

-- Step 4: Populate organization_id
DO $$
DECLARE
    v_default_org_id UUID;
BEGIN
    -- Get any organization
    SELECT id INTO v_default_org_id
    FROM organizations
    LIMIT 1;
    
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
        
        RAISE NOTICE 'Updated organization_id';
    END IF;
END$$;

-- Step 5: Add NOT NULL constraint to created_by if all values are filled
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM asset_annotations WHERE created_by IS NULL LIMIT 1
    ) THEN
        ALTER TABLE asset_annotations 
        ALTER COLUMN created_by SET NOT NULL;
        RAISE NOTICE 'Added NOT NULL constraint to created_by';
    END IF;
END$$;

-- Step 6: Add foreign key constraints if they don't exist
DO $$
BEGIN
    -- Add foreign key to users table
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_type = 'FOREIGN KEY'
        AND table_name = 'asset_annotations'
        AND constraint_name = 'asset_annotations_created_by_fkey'
    ) THEN
        ALTER TABLE asset_annotations
        ADD CONSTRAINT asset_annotations_created_by_fkey
        FOREIGN KEY (created_by) REFERENCES auth.users(id)
        ON DELETE CASCADE;
        
        RAISE NOTICE 'Added foreign key for created_by';
    END IF;
    
    -- Add foreign key to organizations table if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'organizations'
    ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_type = 'FOREIGN KEY'
        AND table_name = 'asset_annotations'
        AND constraint_name = 'asset_annotations_organization_id_fkey'
    ) THEN
        ALTER TABLE asset_annotations
        ADD CONSTRAINT asset_annotations_organization_id_fkey
        FOREIGN KEY (organization_id) REFERENCES organizations(id)
        ON DELETE CASCADE;
        
        RAISE NOTICE 'Added foreign key for organization_id';
    END IF;
END$$;

-- Step 7: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_asset_annotations_created_by 
ON asset_annotations(created_by);

CREATE INDEX IF NOT EXISTS idx_asset_annotations_organization_id 
ON asset_annotations(organization_id);

-- Step 8: Update RLS policies
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view shared annotations" ON asset_annotations;
DROP POLICY IF EXISTS "Users can create their own annotations" ON asset_annotations;
DROP POLICY IF EXISTS "Users can update their own annotations" ON asset_annotations;
DROP POLICY IF EXISTS "Users can delete their own annotations" ON asset_annotations;
DROP POLICY IF EXISTS "Users can view annotations" ON asset_annotations;
DROP POLICY IF EXISTS "Users can create annotations" ON asset_annotations;
DROP POLICY IF EXISTS "Users can update own annotations" ON asset_annotations;
DROP POLICY IF EXISTS "Users can delete own annotations" ON asset_annotations;

-- Create comprehensive RLS policies
CREATE POLICY "Enable read for users" ON asset_annotations
    FOR SELECT USING (
        auth.uid() = created_by OR
        NOT is_private OR
        auth.uid() = ANY(shared_with)
    );

CREATE POLICY "Enable insert for authenticated users" ON asset_annotations
    FOR INSERT WITH CHECK (
        auth.uid() = created_by
    );

CREATE POLICY "Enable update for owners" ON asset_annotations
    FOR UPDATE USING (
        auth.uid() = created_by
    );

CREATE POLICY "Enable delete for owners" ON asset_annotations
    FOR DELETE USING (
        auth.uid() = created_by
    );

-- Step 9: Grant permissions
GRANT ALL ON asset_annotations TO authenticated;
GRANT ALL ON asset_annotations TO service_role;

-- Step 10: Verify the structure
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'asset_annotations'
AND column_name IN ('created_by', 'organization_id')
ORDER BY ordinal_position;

-- Success!
SELECT 'Migration complete! Columns added and constraints established.' as status;