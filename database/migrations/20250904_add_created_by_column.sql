-- =====================================================
-- ADD MISSING CREATED_BY COLUMN TO ASSET_ANNOTATIONS
-- Migration: 20250904_add_created_by_column
-- Description: Add created_by column and establish foreign key relationship with users table
-- =====================================================

-- Step 1: Add created_by column if it doesn't exist
ALTER TABLE asset_annotations 
ADD COLUMN IF NOT EXISTS created_by UUID;

-- Step 2: If column was just added, populate it with existing data
-- Try to get user_id from other sources or use a default
DO $$
DECLARE
    v_default_user_id UUID;
BEGIN
    -- Check if created_by column has any non-null values
    IF NOT EXISTS (
        SELECT 1 FROM asset_annotations WHERE created_by IS NOT NULL LIMIT 1
    ) THEN
        -- Try to find a default user (first admin or first user)
        SELECT id INTO v_default_user_id
        FROM users
        WHERE email = 'test.director@appboardguru.com'
        LIMIT 1;
        
        -- If no test user, get any user
        IF v_default_user_id IS NULL THEN
            SELECT id INTO v_default_user_id
            FROM users
            LIMIT 1;
        END IF;
        
        -- Update all null created_by values
        IF v_default_user_id IS NOT NULL THEN
            UPDATE asset_annotations 
            SET created_by = v_default_user_id
            WHERE created_by IS NULL;
            
            RAISE NOTICE 'Updated created_by column with default user: %', v_default_user_id;
        END IF;
    END IF;
END$$;

-- Step 3: Make created_by NOT NULL (only if we have values)
DO $$
BEGIN
    -- Only add NOT NULL constraint if all rows have created_by
    IF NOT EXISTS (
        SELECT 1 FROM asset_annotations WHERE created_by IS NULL LIMIT 1
    ) THEN
        ALTER TABLE asset_annotations 
        ALTER COLUMN created_by SET NOT NULL;
        RAISE NOTICE 'Added NOT NULL constraint to created_by column';
    ELSE
        RAISE NOTICE 'Skipping NOT NULL constraint - some rows have NULL created_by';
    END IF;
END$$;

-- Step 4: Add foreign key constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_type = 'FOREIGN KEY'
        AND table_name = 'asset_annotations'
        AND constraint_name = 'asset_annotations_created_by_fkey'
    ) THEN
        ALTER TABLE asset_annotations
        ADD CONSTRAINT asset_annotations_created_by_fkey
        FOREIGN KEY (created_by) REFERENCES users(id)
        ON DELETE CASCADE;
        
        RAISE NOTICE 'Added foreign key constraint to created_by column';
    ELSE
        RAISE NOTICE 'Foreign key constraint already exists';
    END IF;
END$$;

-- Step 5: Create index on created_by for better query performance
CREATE INDEX IF NOT EXISTS idx_asset_annotations_created_by 
ON asset_annotations(created_by);

-- Step 6: Update RLS policies to use created_by
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view shared annotations" ON asset_annotations;
DROP POLICY IF EXISTS "Users can create their own annotations" ON asset_annotations;
DROP POLICY IF EXISTS "Users can update their own annotations" ON asset_annotations;
DROP POLICY IF EXISTS "Users can delete their own annotations" ON asset_annotations;

-- Create new RLS policies using created_by
CREATE POLICY "Users can view annotations" ON asset_annotations
    FOR SELECT USING (
        created_by = auth.uid() OR
        NOT is_private OR
        auth.uid() = ANY(shared_with)
    );

CREATE POLICY "Users can create annotations" ON asset_annotations
    FOR INSERT WITH CHECK (
        created_by = auth.uid()
    );

CREATE POLICY "Users can update own annotations" ON asset_annotations
    FOR UPDATE USING (
        created_by = auth.uid()
    );

CREATE POLICY "Users can delete own annotations" ON asset_annotations
    FOR DELETE USING (
        created_by = auth.uid()
    );

-- Step 7: Grant necessary permissions
GRANT ALL ON asset_annotations TO authenticated;
GRANT ALL ON asset_annotations TO service_role;

-- Success message
SELECT 'Successfully added created_by column and established foreign key relationship!' as message;