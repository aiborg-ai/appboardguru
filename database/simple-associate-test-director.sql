-- Simple script to associate test director with all organizations
-- This version avoids complex PL/pgSQL and just runs the necessary queries

-- First, get the test director user ID (you'll see it in the output)
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'test.director@appboardguru.com';

-- Show all organizations in the system
SELECT id, name, slug, created_at 
FROM organizations 
ORDER BY created_at DESC;

-- Create organization memberships for test director
-- This will insert memberships for any organizations where test director is not already a member
INSERT INTO organization_members (
    id,
    organization_id,
    user_id,
    role,
    status,
    joined_at,
    created_at,
    updated_at
)
SELECT 
    gen_random_uuid(),
    o.id,
    u.id,
    'owner',
    'active',
    NOW(),
    NOW(),
    NOW()
FROM organizations o
CROSS JOIN auth.users u
WHERE u.email = 'test.director@appboardguru.com'
AND NOT EXISTS (
    SELECT 1 
    FROM organization_members om 
    WHERE om.organization_id = o.id 
    AND om.user_id = u.id
)
ON CONFLICT DO NOTHING;

-- Update any existing memberships to owner role
UPDATE organization_members om
SET 
    role = 'owner',
    status = 'active',
    updated_at = NOW()
FROM auth.users u
WHERE u.email = 'test.director@appboardguru.com'
AND om.user_id = u.id
AND (om.role != 'owner' OR om.status != 'active');

-- Verify the results - show all test director's organization memberships
SELECT 
    o.name as organization_name,
    o.slug,
    o.id as org_id,
    om.role,
    om.status as membership_status,
    om.joined_at::date as joined_date
FROM organizations o
JOIN organization_members om ON om.organization_id = o.id
JOIN auth.users u ON u.id = om.user_id
WHERE u.email = 'test.director@appboardguru.com'
ORDER BY om.joined_at DESC;

-- Show summary count
SELECT 
    COUNT(*) as total_organizations_owned,
    COUNT(CASE WHEN om.role = 'owner' THEN 1 END) as owner_role_count,
    COUNT(CASE WHEN om.status = 'active' THEN 1 END) as active_status_count
FROM organization_members om
JOIN auth.users u ON u.id = om.user_id
WHERE u.email = 'test.director@appboardguru.com';