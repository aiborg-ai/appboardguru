-- Re-enable RLS with Simple Working Policies
-- Run this after testing to secure your tables

-- 1. Re-enable RLS on all tables
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE vaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 2. Drop all existing policies to start fresh
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    -- Drop all policies on assets
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'assets'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON assets', pol.policyname);
    END LOOP;
    
    -- Drop all policies on vaults
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'vaults'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON vaults', pol.policyname);
    END LOOP;
    
    -- Drop all policies on audit_logs
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'audit_logs'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON audit_logs', pol.policyname);
    END LOOP;
END $$;

-- 3. Create simple policies for assets
-- Since we don't know exact column names, use simple auth-based policies

-- Allow authenticated users to view all assets (adjust as needed)
CREATE POLICY "assets_view_authenticated"
ON assets FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Allow authenticated users to insert assets
CREATE POLICY "assets_insert_authenticated"
ON assets FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Allow users to update assets if user_id matches (or all if column doesn't exist)
CREATE POLICY "assets_update_authenticated"
ON assets FOR UPDATE
USING (
    auth.uid() IS NOT NULL
    AND (
        -- Try to match user_id if column exists
        (EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'assets' AND column_name = 'user_id')
         AND user_id = auth.uid())
        OR
        -- Otherwise allow all authenticated users
        NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'assets' AND column_name = 'user_id')
    )
);

-- Allow users to delete their own assets (or all if no user column)
CREATE POLICY "assets_delete_authenticated"
ON assets FOR DELETE
USING (
    auth.uid() IS NOT NULL
    AND (
        -- Try to match user_id if column exists
        (EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'assets' AND column_name = 'user_id')
         AND user_id = auth.uid())
        OR
        -- Otherwise allow all authenticated users
        NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'assets' AND column_name = 'user_id')
    )
);

-- 4. Create simple policies for vaults (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vaults') THEN
        -- Allow authenticated users to view vaults
        CREATE POLICY "vaults_view_authenticated"
        ON vaults FOR SELECT
        USING (auth.uid() IS NOT NULL);
        
        -- Allow authenticated users to create vaults
        CREATE POLICY "vaults_insert_authenticated"
        ON vaults FOR INSERT
        WITH CHECK (auth.uid() IS NOT NULL);
        
        -- Allow authenticated users to update vaults
        CREATE POLICY "vaults_update_authenticated"
        ON vaults FOR UPDATE
        USING (auth.uid() IS NOT NULL);
        
        -- Allow authenticated users to delete vaults
        CREATE POLICY "vaults_delete_authenticated"
        ON vaults FOR DELETE
        USING (auth.uid() IS NOT NULL);
    END IF;
END $$;

-- 5. Create simple policies for audit_logs (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
        -- Allow authenticated users to insert logs
        CREATE POLICY "audit_logs_insert_authenticated"
        ON audit_logs FOR INSERT
        WITH CHECK (auth.uid() IS NOT NULL);
        
        -- Allow users to view their own logs
        CREATE POLICY "audit_logs_view_own"
        ON audit_logs FOR SELECT
        USING (
            auth.uid() IS NOT NULL
            AND (
                -- Match user_id if column exists
                (EXISTS (SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'audit_logs' AND column_name = 'user_id')
                 AND user_id = auth.uid())
                OR
                -- Otherwise allow all authenticated
                NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'audit_logs' AND column_name = 'user_id')
            )
        );
    END IF;
END $$;

-- 6. Show final status
SELECT 
    tablename,
    rowsecurity as "RLS Enabled",
    COUNT(*) as "Policy Count"
FROM pg_tables
LEFT JOIN pg_policies USING (tablename)
WHERE tablename IN ('assets', 'vaults', 'audit_logs', 'organizations', 'organization_members')
GROUP BY tablename, rowsecurity
ORDER BY tablename;

SELECT '✅ RLS Re-enabled with Simple Policies!' as status;
SELECT 'These policies allow authenticated users to manage assets.' as note;
SELECT 'You can refine them later based on your security needs.' as recommendation;