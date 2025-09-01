-- Fix vaults table structure and permissions

-- 1. Check if vaults table exists
SELECT 'Checking vaults table...' as status;

DO $$
BEGIN
    -- Create vaults table if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vaults') THEN
        CREATE TABLE vaults (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            description TEXT,
            created_by UUID REFERENCES auth.users(id),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            is_public BOOLEAN DEFAULT false,
            metadata JSONB DEFAULT '{}',
            is_archived BOOLEAN DEFAULT false,
            archived_at TIMESTAMPTZ,
            deleted_at TIMESTAMPTZ
        );
        RAISE NOTICE 'Created vaults table';
    ELSE
        RAISE NOTICE 'Vaults table already exists';
    END IF;
    
    -- Add missing columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'vaults' AND column_name = 'organization_id') THEN
        ALTER TABLE vaults ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added organization_id column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'vaults' AND column_name = 'created_by') THEN
        ALTER TABLE vaults ADD COLUMN created_by UUID REFERENCES auth.users(id);
        RAISE NOTICE 'Added created_by column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'vaults' AND column_name = 'is_public') THEN
        ALTER TABLE vaults ADD COLUMN is_public BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added is_public column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'vaults' AND column_name = 'metadata') THEN
        ALTER TABLE vaults ADD COLUMN metadata JSONB DEFAULT '{}';
        RAISE NOTICE 'Added metadata column';
    END IF;
END $$;

-- 2. Create vault_members table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vault_members') THEN
        CREATE TABLE vault_members (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            vault_id UUID REFERENCES vaults(id) ON DELETE CASCADE,
            user_id UUID REFERENCES auth.users(id),
            organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
            role TEXT CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
            status TEXT DEFAULT 'active',
            joined_at TIMESTAMPTZ DEFAULT NOW(),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(vault_id, user_id)
        );
        RAISE NOTICE 'Created vault_members table';
    ELSE
        RAISE NOTICE 'vault_members table already exists';
    END IF;
END $$;

-- 3. Enable RLS on vaults table
ALTER TABLE vaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_members ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing policies
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'vaults'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON vaults', pol.policyname);
    END LOOP;
    
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'vault_members'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON vault_members', pol.policyname);
    END LOOP;
END $$;

-- 5. Create simple policies for vaults

-- SELECT: Users can view vaults in their organizations
CREATE POLICY "vaults_select_org_members"
ON vaults FOR SELECT
USING (
    auth.uid() IS NOT NULL 
    AND (
        created_by = auth.uid()
        OR is_public = true
        OR organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid() 
            AND status = 'active'
        )
    )
);

-- INSERT: Users can create vaults in their organizations
CREATE POLICY "vaults_insert_org_members"
ON vaults FOR INSERT
WITH CHECK (
    auth.uid() IS NOT NULL
    AND created_by = auth.uid()
    AND (
        organization_id IS NULL
        OR organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid() 
            AND status = 'active'
        )
    )
);

-- UPDATE: Users can update vaults they created or are admins of
CREATE POLICY "vaults_update_own_or_admin"
ON vaults FOR UPDATE
USING (
    auth.uid() IS NOT NULL
    AND (
        created_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM vault_members
            WHERE vault_id = id
            AND user_id = auth.uid()
            AND role IN ('owner', 'admin')
        )
    )
);

-- DELETE: Users can delete vaults they created
CREATE POLICY "vaults_delete_own"
ON vaults FOR DELETE
USING (
    auth.uid() IS NOT NULL
    AND created_by = auth.uid()
);

-- 6. Create policies for vault_members

-- SELECT: Users can see vault members for vaults they have access to
CREATE POLICY "vault_members_select"
ON vault_members FOR SELECT
USING (
    auth.uid() IS NOT NULL
    AND (
        user_id = auth.uid()
        OR vault_id IN (
            SELECT id FROM vaults
            WHERE created_by = auth.uid()
            OR is_public = true
        )
    )
);

-- INSERT: Users can add members to vaults they own
CREATE POLICY "vault_members_insert"
ON vault_members FOR INSERT
WITH CHECK (
    auth.uid() IS NOT NULL
    AND vault_id IN (
        SELECT id FROM vaults
        WHERE created_by = auth.uid()
    )
);

-- UPDATE: Vault owners can update member roles
CREATE POLICY "vault_members_update"
ON vault_members FOR UPDATE
USING (
    auth.uid() IS NOT NULL
    AND vault_id IN (
        SELECT id FROM vaults
        WHERE created_by = auth.uid()
    )
);

-- DELETE: Vault owners can remove members
CREATE POLICY "vault_members_delete"
ON vault_members FOR DELETE
USING (
    auth.uid() IS NOT NULL
    AND vault_id IN (
        SELECT id FROM vaults
        WHERE created_by = auth.uid()
    )
);

-- 7. Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_vaults_updated_at ON vaults;
CREATE TRIGGER update_vaults_updated_at
    BEFORE UPDATE ON vaults
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_vault_members_updated_at ON vault_members;
CREATE TRIGGER update_vault_members_updated_at
    BEFORE UPDATE ON vault_members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 8. Show final structure
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'vaults'
ORDER BY ordinal_position;

-- 9. Show policies
SELECT 
    tablename,
    policyname,
    cmd
FROM pg_policies
WHERE tablename IN ('vaults', 'vault_members')
ORDER BY tablename, cmd;

SELECT '✅ Vaults table structure and permissions fixed!' as status;
SELECT 'Vault creation should now work properly.' as message;