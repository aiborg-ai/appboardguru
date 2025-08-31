-- Check RLS policies for potential infinite recursion issues
-- This script identifies and helps fix circular dependencies in RLS policies

-- Check organization_members policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'organization_members'
ORDER BY policyname;

-- Check organizations policies  
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'organizations'
ORDER BY policyname;

-- Common fix for infinite recursion in organization_members
-- This happens when policies reference each other in a circular way
-- For example: organization_members checking organizations which checks organization_members

-- Proposed simplified policies that avoid recursion:

/*
-- Drop existing problematic policies (if needed)
DROP POLICY IF EXISTS "Users can view organizations they are members of" ON organization_members;
DROP POLICY IF EXISTS "Users can view their organization memberships" ON organization_members;

-- Create new non-recursive policy for organization_members
CREATE POLICY "Users can view their own memberships"
ON organization_members
FOR SELECT
USING (auth.uid() = user_id);

-- Create policy for organizations without circular reference
CREATE POLICY "Users can view organizations they belong to"
ON organizations
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM organization_members om
        WHERE om.organization_id = organizations.id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
    )
);
*/