-- Check and Fix User Roles for Test Accounts
-- Run these queries in order in Supabase SQL Editor

-- 1. First, check what role enum values exist
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
ORDER BY enumsortorder;

-- 2. Check current structure of users table
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('role', 'is_active')
ORDER BY ordinal_position;

-- 3. Add missing columns safely
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 4. Update test users with correct roles based on existing enum
-- Using 'user' for regular users and 'admin' for admins since 'owner' doesn't exist in enum
UPDATE users u
SET 
    full_name = CASE 
        WHEN u.email = 'test.director@appboardguru.com' THEN 'Test Director'
        WHEN u.email = 'admin.user@appboardguru.com' THEN 'Admin User'
        WHEN u.email = 'board.member@appboardguru.com' THEN 'Board Member'
        WHEN u.email = 'test.user@appboardguru.com' THEN 'Test User'
        WHEN u.email = 'demo.director@appboardguru.com' THEN 'Demo Director'
        ELSE u.full_name
    END,
    role = CASE 
        WHEN u.email IN ('test.director@appboardguru.com', 'demo.director@appboardguru.com') THEN 
            CASE 
                WHEN EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'super_admin' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')) THEN 'super_admin'::user_role
                ELSE 'admin'::user_role
            END
        WHEN u.email = 'admin.user@appboardguru.com' THEN 'admin'::user_role
        ELSE 'user'::user_role
    END,
    is_active = true,
    updated_at = NOW()
FROM auth.users au
WHERE u.id = au.id
AND au.email IN (
    'test.director@appboardguru.com',
    'admin.user@appboardguru.com',
    'board.member@appboardguru.com',
    'test.user@appboardguru.com',
    'demo.director@appboardguru.com'
);

-- 5. Ensure organization memberships are set correctly
-- The organization_members table uses different role values (owner, admin, member, viewer)
UPDATE organization_members om
SET 
    role = CASE 
        WHEN u.email IN ('test.director@appboardguru.com') THEN 'owner'
        WHEN u.email IN ('demo.director@appboardguru.com') THEN 'owner'  
        WHEN u.email = 'admin.user@appboardguru.com' THEN 'admin'
        ELSE 'member'
    END,
    status = 'active',
    is_primary = true,
    receive_notifications = true
FROM auth.users u
WHERE om.user_id = u.id
AND u.email IN (
    'test.director@appboardguru.com',
    'admin.user@appboardguru.com',
    'board.member@appboardguru.com',
    'test.user@appboardguru.com',
    'demo.director@appboardguru.com'
);

-- 6. Fix Demo Director organization ownership
-- First remove as member from test org if exists
DELETE FROM organization_members
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'demo.director@appboardguru.com')
AND organization_id = (SELECT id FROM organizations WHERE slug = 'test-board-org');

-- Ensure demo.director owns demo-board-org
UPDATE organization_members
SET role = 'owner', status = 'active'
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'demo.director@appboardguru.com')
AND organization_id = (SELECT id FROM organizations WHERE slug = 'demo-board-org');

-- 7. Display final setup
SELECT 
    au.email,
    u.role as user_role,
    om.role as org_role,
    u.full_name,
    u.is_active,
    o.name as organization,
    CASE 
        WHEN au.email = 'test.director@appboardguru.com' THEN 'TestDirector123!'
        WHEN au.email = 'admin.user@appboardguru.com' THEN 'AdminUser123!'
        WHEN au.email = 'board.member@appboardguru.com' THEN 'BoardMember123!'
        WHEN au.email = 'test.user@appboardguru.com' THEN 'TestUser123!'
        WHEN au.email = 'demo.director@appboardguru.com' THEN 'DemoDirector123!'
    END as password
FROM auth.users au
LEFT JOIN users u ON u.id = au.id
LEFT JOIN organization_members om ON om.user_id = au.id AND om.status = 'active'
LEFT JOIN organizations o ON o.id = om.organization_id
WHERE au.email IN (
    'test.director@appboardguru.com',
    'admin.user@appboardguru.com',
    'board.member@appboardguru.com',
    'test.user@appboardguru.com',
    'demo.director@appboardguru.com'
)
ORDER BY au.email;