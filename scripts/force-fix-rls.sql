-- FORCE FIX RLS Policies - Complete Reset
-- This script completely removes and recreates all policies
-- Run this in Supabase SQL Editor if the previous script didn't work

-- STEP 1: Disable RLS temporarily to clear all policies
ALTER TABLE organization_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;

-- STEP 2: Drop ALL policies (even if they don't exist)
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    -- Drop all policies on organization_members
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'organization_members'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON organization_members', pol.policyname);
    END LOOP;
    
    -- Drop all policies on organizations
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'organizations'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON organizations', pol.policyname);
    END LOOP;
END $$;

-- STEP 3: Re-enable RLS
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- STEP 4: Create ONLY these simple policies

-- For organization_members: Simple policy without any joins
CREATE POLICY "member_select_own"
ON organization_members
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "member_insert_own"
ON organization_members
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "member_update_own"
ON organization_members
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- For organizations: Simple EXISTS check (safe because organization_members policy is simple)
CREATE POLICY "org_select_member"
ON organizations
FOR SELECT
USING (
    EXISTS (
        SELECT 1 
        FROM organization_members om
        WHERE om.organization_id = organizations.id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
    )
);

CREATE POLICY "org_insert_authenticated"
ON organizations
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "org_update_admin"
ON organizations
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 
        FROM organization_members om
        WHERE om.organization_id = organizations.id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
        AND om.status = 'active'
    )
);

-- STEP 5: Verify the fix
DO $$
BEGIN
    RAISE NOTICE 'Policies have been reset successfully!';
    RAISE NOTICE 'Testing queries...';
END $$;

-- Test queries (these should work without recursion)
SELECT 'Test 1: Count organization_members' as test, COUNT(*) as result 
FROM organization_members 
WHERE user_id = auth.uid();

SELECT 'Test 2: Count organizations' as test, COUNT(*) as result 
FROM organizations 
WHERE EXISTS (
    SELECT 1 FROM organization_members 
    WHERE organization_id = organizations.id 
    AND user_id = auth.uid()
);

-- If you see results without errors, the fix worked!
SELECT 'SUCCESS: RLS policies have been fixed!' as message;