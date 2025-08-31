-- Enable RLS on organization_members table
-- This is the fix for the recursion issue!

-- STEP 1: Enable RLS on organization_members
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- STEP 2: Verify RLS is enabled on both tables
SELECT 
    tablename,
    rowsecurity as "RLS Enabled"
FROM pg_tables
WHERE tablename IN ('organizations', 'organization_members');

-- STEP 3: Test that queries work now
SELECT 'Testing organization_members access...' as status;
SELECT COUNT(*) as member_count FROM organization_members WHERE user_id = auth.uid();

SELECT 'Testing organizations access...' as status;
SELECT COUNT(*) as org_count FROM organizations;

SELECT 'SUCCESS: RLS is now enabled and queries should work!' as message;