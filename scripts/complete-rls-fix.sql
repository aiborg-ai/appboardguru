-- Complete RLS Fix for Organization Creation
-- This ensures all necessary policies exist for creating organizations

-- First, check current policies
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename IN ('organizations', 'organization_members')
ORDER BY tablename, cmd;

-- Ensure RLS is enabled
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- Drop and recreate all policies to ensure consistency
-- Organization Members Policies
DROP POLICY IF EXISTS "simple_policy" ON organization_members;
DROP POLICY IF EXISTS "member_select_own" ON organization_members;
DROP POLICY IF EXISTS "member_insert_own" ON organization_members;
DROP POLICY IF EXISTS "member_update_own" ON organization_members;
DROP POLICY IF EXISTS "member_delete_own" ON organization_members;
DROP POLICY IF EXISTS "Users can view their own memberships" ON organization_members;
DROP POLICY IF EXISTS "Users can create their own memberships" ON organization_members;
DROP POLICY IF EXISTS "Users can update their own memberships" ON organization_members;

-- Organizations Policies
DROP POLICY IF EXISTS "org_select_member" ON organizations;
DROP POLICY IF EXISTS "org_insert_authenticated" ON organizations;
DROP POLICY IF EXISTS "org_update_admin" ON organizations;
DROP POLICY IF EXISTS "org_delete_admin" ON organizations;
DROP POLICY IF EXISTS "Users can view organizations they are members of" ON organizations;
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON organizations;
DROP POLICY IF EXISTS "Admins can update their organizations" ON organizations;

-- Create comprehensive policies for organization_members
CREATE POLICY "member_select"
ON organization_members FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "member_insert"
ON organization_members FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "member_update"
ON organization_members FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "member_delete"
ON organization_members FOR DELETE
USING (auth.uid() = user_id AND role = 'owner');

-- Create comprehensive policies for organizations
CREATE POLICY "org_select"
ON organizations FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_id = organizations.id
        AND user_id = auth.uid()
        AND status = 'active'
    )
    OR NOT EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_id = organizations.id
    )
);

CREATE POLICY "org_insert"
ON organizations FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "org_update"
ON organizations FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_id = organizations.id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
);

CREATE POLICY "org_delete"
ON organizations FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_id = organizations.id
        AND user_id = auth.uid()
        AND role = 'owner'
        AND status = 'active'
    )
);

-- Test the policies
SELECT 'Testing policies...' as status;

-- This should work for authenticated users
SELECT COUNT(*) as org_count FROM organizations;
SELECT COUNT(*) as member_count FROM organization_members WHERE user_id = auth.uid();

SELECT 'Policies updated successfully!' as message;