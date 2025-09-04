-- =====================================================
-- QUICK FIX FOR ASSETS TABLE RLS POLICIES
-- =====================================================

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Users can view their own assets" ON assets;
DROP POLICY IF EXISTS "Users can insert assets" ON assets;
DROP POLICY IF EXISTS "Users can update their own assets" ON assets;
DROP POLICY IF EXISTS "Users can delete their own assets" ON assets;
DROP POLICY IF EXISTS "Users can view organization assets" ON assets;

-- Enable RLS on assets table
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

-- Simple policy: Allow authenticated users to do everything with assets
CREATE POLICY "authenticated_users_all_assets" ON assets
FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Grant permissions
GRANT ALL ON assets TO authenticated;
GRANT SELECT ON assets TO anon;

-- Verify
SELECT COUNT(*) as policy_count FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'assets';