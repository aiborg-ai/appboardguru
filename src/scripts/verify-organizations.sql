-- Verify Organizations for Test Director
-- Run this in Supabase SQL Editor to check if the seeding worked

-- Check the test director user
SELECT 
    id,
    email,
    created_at
FROM auth.users 
WHERE email = 'test.director@appboardguru.com';

-- Count organizations for test director
SELECT 
    COUNT(*) as total_organizations
FROM organizations o
JOIN organization_members om ON o.id = om.organization_id
WHERE om.user_id = (SELECT id FROM auth.users WHERE email = 'test.director@appboardguru.com');

-- List all organizations for test director
SELECT 
    o.id,
    o.name,
    o.slug,
    o.industry,
    o.organization_size,
    om.role,
    om.status,
    om.is_primary,
    o.created_at
FROM organizations o
JOIN organization_members om ON o.id = om.organization_id
WHERE om.user_id = (SELECT id FROM auth.users WHERE email = 'test.director@appboardguru.com')
ORDER BY om.is_primary DESC, o.name;

-- Check if there are any RLS policies that might be causing issues
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
WHERE tablename IN ('organizations', 'organization_members')
ORDER BY tablename, policyname;