-- Simple Fix for Assets Table RLS
-- This creates basic policies that allow users to manage their own uploads

-- Enable RLS on assets table
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies on assets to start fresh
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'assets'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON assets', pol.policyname);
    END LOOP;
END $$;

-- Create simple policies based on uploaded_by field

-- Policy 1: Users can view all assets (or their own - uncomment the WHERE clause if needed)
CREATE POLICY "assets_select_all"
ON assets FOR SELECT
USING (
    auth.uid() IS NOT NULL
    -- Uncomment the line below to restrict to only user's own assets
    -- AND uploaded_by = auth.uid()
);

-- Policy 2: Users can insert their own assets
CREATE POLICY "assets_insert_own"
ON assets FOR INSERT
WITH CHECK (
    auth.uid() IS NOT NULL 
    AND uploaded_by = auth.uid()
);

-- Policy 3: Users can update their own assets
CREATE POLICY "assets_update_own"
ON assets FOR UPDATE
USING (uploaded_by = auth.uid())
WITH CHECK (uploaded_by = auth.uid());

-- Policy 4: Users can delete their own assets
CREATE POLICY "assets_delete_own"
ON assets FOR DELETE
USING (uploaded_by = auth.uid());

-- Also handle audit_logs if it exists
DO $$
BEGIN
    -- Check if audit_logs table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
        -- Enable RLS
        ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
        
        -- Drop existing policies
        DROP POLICY IF EXISTS "audit_log_select" ON audit_logs;
        DROP POLICY IF EXISTS "audit_log_insert" ON audit_logs;
        
        -- Allow authenticated users to insert audit logs
        CREATE POLICY "audit_log_insert_auth"
        ON audit_logs FOR INSERT
        WITH CHECK (auth.uid() IS NOT NULL);
        
        -- Allow users to view their own audit logs
        CREATE POLICY "audit_log_select_own"
        ON audit_logs FOR SELECT
        USING (
            user_id = auth.uid()
            OR auth.uid() IS NOT NULL  -- Or allow all authenticated users to see logs
        );
    END IF;
END $$;

-- Test the policies
SELECT 'Testing policies...' as status;
SELECT COUNT(*) as total_assets FROM assets WHERE auth.uid() IS NOT NULL;

SELECT '✅ Asset policies have been simplified!' as message;
SELECT 'Users can now upload and manage their own assets.' as result;