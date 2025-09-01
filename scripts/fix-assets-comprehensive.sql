-- Comprehensive Fix for Assets Table
-- This script adds all potentially missing columns and sets up working RLS policies

-- Step 1: Add missing columns (only if they don't exist)
DO $$
BEGIN
    -- Add owner_id if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'assets' AND column_name = 'owner_id') THEN
        ALTER TABLE assets ADD COLUMN owner_id UUID REFERENCES auth.users(id);
        RAISE NOTICE 'Added owner_id column';
    END IF;
    
    -- Add user_id if missing (alias for owner)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'assets' AND column_name = 'user_id') THEN
        ALTER TABLE assets ADD COLUMN user_id UUID REFERENCES auth.users(id);
        RAISE NOTICE 'Added user_id column';
    END IF;
    
    -- Add uploaded_by if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'assets' AND column_name = 'uploaded_by') THEN
        ALTER TABLE assets ADD COLUMN uploaded_by UUID REFERENCES auth.users(id);
        RAISE NOTICE 'Added uploaded_by column';
    END IF;
    
    -- Add organization_id if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'assets' AND column_name = 'organization_id') THEN
        ALTER TABLE assets ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added organization_id column';
    END IF;
    
    -- Add vault_id if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'assets' AND column_name = 'vault_id') THEN
        ALTER TABLE assets ADD COLUMN vault_id UUID REFERENCES vaults(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added vault_id column';
    END IF;
    
    -- Add timestamps if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'assets' AND column_name = 'created_at') THEN
        ALTER TABLE assets ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
        RAISE NOTICE 'Added created_at column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'assets' AND column_name = 'updated_at') THEN
        ALTER TABLE assets ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
        RAISE NOTICE 'Added updated_at column';
    END IF;
    
    -- Add metadata columns if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'assets' AND column_name = 'title') THEN
        ALTER TABLE assets ADD COLUMN title TEXT;
        RAISE NOTICE 'Added title column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'assets' AND column_name = 'description') THEN
        ALTER TABLE assets ADD COLUMN description TEXT;
        RAISE NOTICE 'Added description column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'assets' AND column_name = 'category') THEN
        ALTER TABLE assets ADD COLUMN category TEXT;
        RAISE NOTICE 'Added category column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'assets' AND column_name = 'tags') THEN
        ALTER TABLE assets ADD COLUMN tags TEXT[];
        RAISE NOTICE 'Added tags column';
    END IF;
    
    -- Add folder_path if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'assets' AND column_name = 'folder_path') THEN
        ALTER TABLE assets ADD COLUMN folder_path TEXT DEFAULT '/';
        RAISE NOTICE 'Added folder_path column';
    END IF;
    
    -- Add thumbnail_url if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'assets' AND column_name = 'thumbnail_url') THEN
        ALTER TABLE assets ADD COLUMN thumbnail_url TEXT;
        RAISE NOTICE 'Added thumbnail_url column';
    END IF;
END $$;

-- Step 2: Update existing records to have owner information
-- If there are assets without owner info, set them to the first user (for testing)
DO $$
DECLARE
    first_user_id UUID;
BEGIN
    -- Get the first user ID (your test user)
    SELECT id INTO first_user_id FROM auth.users LIMIT 1;
    
    IF first_user_id IS NOT NULL THEN
        -- Update records that have no owner
        UPDATE assets 
        SET owner_id = first_user_id 
        WHERE owner_id IS NULL;
        
        UPDATE assets 
        SET user_id = first_user_id 
        WHERE user_id IS NULL;
        
        UPDATE assets 
        SET uploaded_by = first_user_id 
        WHERE uploaded_by IS NULL;
        
        RAISE NOTICE 'Updated existing records with owner information';
    END IF;
END $$;

-- Step 3: Enable RLS
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

-- Step 4: Drop all existing policies
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'assets'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON assets', pol.policyname);
    END LOOP;
END $$;

-- Step 5: Create organization-based policies
-- These policies allow users to access assets in their organizations

-- SELECT: Users can view assets in their organizations
CREATE POLICY "assets_select_org_members"
ON assets FOR SELECT
USING (
    auth.uid() IS NOT NULL 
    AND (
        -- User owns the asset
        owner_id = auth.uid()
        OR user_id = auth.uid()
        OR uploaded_by = auth.uid()
        OR
        -- User is in the same organization
        organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid() 
            AND status = 'active'
        )
        OR
        -- No organization specified (personal assets)
        organization_id IS NULL
    )
);

-- INSERT: Users can create assets
CREATE POLICY "assets_insert_authenticated"
ON assets FOR INSERT
WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
        -- User is setting themselves as owner
        (owner_id = auth.uid() OR owner_id IS NULL)
        AND (user_id = auth.uid() OR user_id IS NULL)
        AND (uploaded_by = auth.uid() OR uploaded_by IS NULL)
    )
    AND (
        -- Organization must be one user belongs to
        organization_id IS NULL
        OR organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid() 
            AND status = 'active'
        )
    )
);

-- UPDATE: Users can update their own assets or org assets
CREATE POLICY "assets_update_org_members"
ON assets FOR UPDATE
USING (
    auth.uid() IS NOT NULL
    AND (
        owner_id = auth.uid()
        OR user_id = auth.uid()
        OR uploaded_by = auth.uid()
        OR organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid() 
            AND role IN ('owner', 'admin')
            AND status = 'active'
        )
    )
)
WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
        owner_id = auth.uid()
        OR user_id = auth.uid()
        OR uploaded_by = auth.uid()
        OR organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid() 
            AND role IN ('owner', 'admin')
            AND status = 'active'
        )
    )
);

-- DELETE: Users can delete their own assets
CREATE POLICY "assets_delete_own"
ON assets FOR DELETE
USING (
    auth.uid() IS NOT NULL
    AND (
        owner_id = auth.uid()
        OR user_id = auth.uid()
        OR uploaded_by = auth.uid()
        OR (
            -- Org admins can delete org assets
            organization_id IN (
                SELECT organization_id 
                FROM organization_members 
                WHERE user_id = auth.uid() 
                AND role IN ('owner', 'admin')
                AND status = 'active'
            )
        )
    )
);

-- Step 6: Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_assets_updated_at ON assets;
CREATE TRIGGER update_assets_updated_at
    BEFORE UPDATE ON assets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Step 7: Show final structure
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'assets'
ORDER BY ordinal_position;

-- Step 8: Show policies
SELECT 
    policyname,
    cmd
FROM pg_policies
WHERE tablename = 'assets';

SELECT '✅ Assets table has been comprehensively fixed!' as status;
SELECT 'All required columns added and RLS policies configured.' as message;
SELECT 'Asset uploads should now work properly!' as result;