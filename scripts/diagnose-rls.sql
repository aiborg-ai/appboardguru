-- Diagnose RLS Issues
-- Run this first to see what policies exist

-- Show all policies on organization_members
SELECT 
    'organization_members' as table_name,
    policyname,
    permissive,
    roles,
    cmd,
    qual as policy_condition,
    with_check
FROM pg_policies
WHERE tablename = 'organization_members'
ORDER BY policyname;

-- Show all policies on organizations
SELECT 
    'organizations' as table_name,
    policyname,
    permissive,
    roles,
    cmd,
    qual as policy_condition,
    with_check
FROM pg_policies
WHERE tablename = 'organizations'
ORDER BY policyname;

-- Check if RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename IN ('organizations', 'organization_members');

-- Look for complex conditions that might cause recursion
SELECT 
    tablename,
    policyname,
    CASE 
        WHEN qual LIKE '%organization_members%' AND tablename = 'organizations' THEN 'POTENTIAL RECURSION: organizations policy references organization_members'
        WHEN qual LIKE '%organizations%' AND tablename = 'organization_members' THEN 'POTENTIAL RECURSION: organization_members policy references organizations'
        ELSE 'OK'
    END as recursion_check,
    qual
FROM pg_policies
WHERE tablename IN ('organizations', 'organization_members')
AND (
    (qual LIKE '%organization_members%' AND tablename = 'organizations')
    OR 
    (qual LIKE '%organizations%' AND tablename = 'organization_members')
);