-- Quick check of test director's organization access
-- Run this to see current state

-- 1. Check if test director user exists
SELECT 
    id as user_id,
    email,
    created_at,
    last_sign_in_at
FROM auth.users 
WHERE email = 'test.director@appboardguru.com';

-- 2. List ALL organizations in the system
SELECT 
    id,
    name,
    slug,
    created_at,
    created_by
FROM organizations
ORDER BY created_at DESC;

-- 3. Show which organizations test director has access to
SELECT 
    o.name as organization_name,
    o.id as org_id,
    om.role as member_role,
    om.status as member_status,
    om.joined_at
FROM organizations o
LEFT JOIN organization_members om ON om.organization_id = o.id
LEFT JOIN auth.users u ON u.id = om.user_id AND u.email = 'test.director@appboardguru.com'
ORDER BY o.name;

-- 4. Summary - Organizations WITH test director access
SELECT 
    'Organizations WITH test director access:' as status,
    COUNT(*) as count
FROM organization_members om
JOIN auth.users u ON u.id = om.user_id
WHERE u.email = 'test.director@appboardguru.com'
AND om.status = 'active'

UNION ALL

-- 5. Summary - Organizations WITHOUT test director access  
SELECT 
    'Organizations WITHOUT test director access:' as status,
    COUNT(*) as count
FROM organizations o
WHERE NOT EXISTS (
    SELECT 1 
    FROM organization_members om
    JOIN auth.users u ON u.id = om.user_id
    WHERE om.organization_id = o.id
    AND u.email = 'test.director@appboardguru.com'
    AND om.status = 'active'
);