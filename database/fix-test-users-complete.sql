-- Complete Test Users Setup with Correct Roles
-- Run this in Supabase SQL Editor

-- 1. First, let's check what role types exist and fix them
DO $$
BEGIN
    -- Check if user_role type exists and what values it has
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        -- Add missing role values if needed
        ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'super_admin';
    END IF;
END $$;

-- 2. Add missing columns to users table (without role since it exists with enum)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 3. Add missing columns to vaults table
ALTER TABLE vaults
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

ALTER TABLE vaults
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- 4. Update all test user profiles with proper data (using existing role enum values)
DO $$
DECLARE
    v_user_id UUID;
    v_org_id UUID;
BEGIN
    -- Get or create Test Board Organization
    SELECT id INTO v_org_id FROM organizations WHERE slug = 'test-board-org';
    IF v_org_id IS NULL THEN
        INSERT INTO organizations (
            name, slug, description, industry, organization_size, is_active, settings
        ) VALUES (
            'Test Board Organization',
            'test-board-org',
            'Test organization for development and testing',
            'Technology',
            'medium',
            true,
            '{"features": ["board_packs", "ai_summarization", "advanced_permissions"], "notifications": true}'::jsonb
        ) RETURNING id INTO v_org_id;
    END IF;

    -- Update test.director@appboardguru.com (use super_admin as highest role)
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'test.director@appboardguru.com';
    IF v_user_id IS NOT NULL THEN
        INSERT INTO users (id, email, full_name, role, is_active, created_at, updated_at)
        VALUES (
            v_user_id,
            'test.director@appboardguru.com',
            'Test Director',
            'super_admin', -- Using super_admin instead of owner
            true,
            NOW(),
            NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            full_name = EXCLUDED.full_name,
            role = EXCLUDED.role,
            is_active = EXCLUDED.is_active,
            updated_at = NOW();
            
        -- Add to organization as owner
        INSERT INTO organization_members (
            organization_id, user_id, role, status, joined_at, is_primary, receive_notifications
        ) VALUES (
            v_org_id, v_user_id, 'owner', 'active', NOW(), true, true
        )
        ON CONFLICT (organization_id, user_id) DO UPDATE SET
            role = 'owner',
            status = 'active',
            is_primary = true;
    END IF;

    -- Update admin.user@appboardguru.com
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'admin.user@appboardguru.com';
    IF v_user_id IS NOT NULL THEN
        INSERT INTO users (id, email, full_name, role, is_active, created_at, updated_at)
        VALUES (
            v_user_id,
            'admin.user@appboardguru.com',
            'Admin User',
            'admin',
            true,
            NOW(),
            NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            full_name = EXCLUDED.full_name,
            role = EXCLUDED.role,
            is_active = EXCLUDED.is_active,
            updated_at = NOW();
            
        -- Add to organization
        INSERT INTO organization_members (
            organization_id, user_id, role, status, joined_at, is_primary, receive_notifications
        ) VALUES (
            v_org_id, v_user_id, 'admin', 'active', NOW(), true, true
        )
        ON CONFLICT (organization_id, user_id) DO UPDATE SET
            role = 'admin',
            status = 'active',
            is_primary = true;
    END IF;

    -- Update board.member@appboardguru.com
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'board.member@appboardguru.com';
    IF v_user_id IS NOT NULL THEN
        INSERT INTO users (id, email, full_name, role, is_active, created_at, updated_at)
        VALUES (
            v_user_id,
            'board.member@appboardguru.com',
            'Board Member',
            'user', -- Using 'user' for regular members
            true,
            NOW(),
            NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            full_name = EXCLUDED.full_name,
            role = EXCLUDED.role,
            is_active = EXCLUDED.is_active,
            updated_at = NOW();
            
        -- Add to organization
        INSERT INTO organization_members (
            organization_id, user_id, role, status, joined_at, is_primary, receive_notifications
        ) VALUES (
            v_org_id, v_user_id, 'member', 'active', NOW(), true, true
        )
        ON CONFLICT (organization_id, user_id) DO UPDATE SET
            role = 'member',
            status = 'active',
            is_primary = true;
    END IF;

    -- Update test.user@appboardguru.com
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'test.user@appboardguru.com';
    IF v_user_id IS NOT NULL THEN
        INSERT INTO users (id, email, full_name, role, is_active, created_at, updated_at)
        VALUES (
            v_user_id,
            'test.user@appboardguru.com',
            'Test User',
            'user',
            true,
            NOW(),
            NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            full_name = EXCLUDED.full_name,
            role = EXCLUDED.role,
            is_active = EXCLUDED.is_active,
            updated_at = NOW();
            
        -- Add to organization
        INSERT INTO organization_members (
            organization_id, user_id, role, status, joined_at, is_primary, receive_notifications
        ) VALUES (
            v_org_id, v_user_id, 'member', 'active', NOW(), true, true
        )
        ON CONFLICT (organization_id, user_id) DO UPDATE SET
            role = 'member',
            status = 'active',
            is_primary = true;
    END IF;

    -- Update demo.director@appboardguru.com
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'demo.director@appboardguru.com';
    IF v_user_id IS NOT NULL THEN
        INSERT INTO users (id, email, full_name, role, is_active, created_at, updated_at)
        VALUES (
            v_user_id,
            'demo.director@appboardguru.com',
            'Demo Director',
            'admin', -- Set as admin in users table
            true,
            NOW(),
            NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            full_name = EXCLUDED.full_name,
            role = EXCLUDED.role,
            is_active = EXCLUDED.is_active,
            updated_at = NOW();
    END IF;
END $$;

-- 5. Create Demo Board Organization for demo.director
INSERT INTO organizations (
    name,
    slug,
    description,
    industry,
    organization_size,
    is_active,
    created_by,
    settings
)
SELECT
    'Demo Board Organization',
    'demo-board-org',
    'Demo organization for testing and demonstrations',
    'Technology',
    'medium',
    true,
    id,
    '{"features": ["board_packs", "ai_summarization", "advanced_permissions"], "notifications": true}'::jsonb
FROM auth.users
WHERE email = 'demo.director@appboardguru.com'
ON CONFLICT (slug) DO NOTHING;

-- 6. Add demo.director to their organization as owner
INSERT INTO organization_members (
    organization_id,
    user_id,
    role,
    status,
    joined_at,
    is_primary,
    receive_notifications
)
SELECT
    o.id,
    u.id,
    'owner', -- Owner in organization_members
    'active',
    NOW(),
    true,
    true
FROM organizations o
CROSS JOIN auth.users u
WHERE o.slug = 'demo-board-org'
AND u.email = 'demo.director@appboardguru.com'
ON CONFLICT (organization_id, user_id) DO UPDATE SET
    role = 'owner',
    status = 'active';

-- 7. Create vaults for Test Board Organization
DO $$
DECLARE
    v_org_id UUID;
    v_user_id UUID;
BEGIN
    -- Get Test Board Organization ID and creator
    SELECT id INTO v_org_id FROM organizations WHERE slug = 'test-board-org';
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'test.director@appboardguru.com';
    
    IF v_org_id IS NOT NULL AND v_user_id IS NOT NULL THEN
        -- Create vaults
        INSERT INTO vaults (organization_id, name, description, is_public, created_by)
        VALUES 
            (v_org_id, 'Board Documents', 'Board meeting documents and minutes', false, v_user_id),
            (v_org_id, 'Financial Reports', 'Financial statements and reports', false, v_user_id),
            (v_org_id, 'Legal & Compliance', 'Legal documents and compliance materials', false, v_user_id)
        ON CONFLICT (organization_id, name) DO NOTHING;
    END IF;
    
    -- Create vault for Demo Organization
    SELECT id INTO v_org_id FROM organizations WHERE slug = 'demo-board-org';
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'demo.director@appboardguru.com';
    
    IF v_org_id IS NOT NULL AND v_user_id IS NOT NULL THEN
        INSERT INTO vaults (organization_id, name, description, is_public, created_by)
        VALUES (v_org_id, 'Demo Documents', 'Demo board documents', false, v_user_id)
        ON CONFLICT (organization_id, name) DO NOTHING;
    END IF;
END $$;

-- 8. Grant vault access to all users in their organizations
INSERT INTO vault_members (vault_id, user_id, role, permissions)
SELECT 
    v.id as vault_id,
    om.user_id,
    CASE 
        WHEN om.role = 'owner' THEN 'owner'
        WHEN om.role = 'admin' THEN 'admin'
        ELSE 'member'
    END as role,
    jsonb_build_object(
        'can_read', true,
        'can_write', true,
        'can_delete', om.role IN ('owner', 'admin'),
        'can_share', true,
        'can_manage_members', om.role IN ('owner', 'admin')
    ) as permissions
FROM vaults v
INNER JOIN organization_members om ON om.organization_id = v.organization_id
WHERE om.status = 'active'
ON CONFLICT (vault_id, user_id) DO UPDATE SET
    role = EXCLUDED.role,
    permissions = EXCLUDED.permissions;

-- 9. Verify setup and display credentials
SELECT 
    '✅ Test Users Setup Complete!' as status;

-- Display all test users with their credentials and roles
SELECT 
    au.email,
    CASE 
        WHEN au.email = 'test.director@appboardguru.com' THEN 'TestDirector123!'
        WHEN au.email = 'admin.user@appboardguru.com' THEN 'AdminUser123!'
        WHEN au.email = 'board.member@appboardguru.com' THEN 'BoardMember123!'
        WHEN au.email = 'test.user@appboardguru.com' THEN 'TestUser123!'
        WHEN au.email = 'demo.director@appboardguru.com' THEN 'DemoDirector123!'
    END as password,
    u.role as user_table_role,
    om.role as org_role,
    u.full_name,
    u.is_active,
    o.name as organization
FROM auth.users au
LEFT JOIN users u ON u.id = au.id
LEFT JOIN organization_members om ON om.user_id = au.id
LEFT JOIN organizations o ON o.id = om.organization_id
WHERE au.email IN (
    'test.director@appboardguru.com',
    'admin.user@appboardguru.com',
    'board.member@appboardguru.com',
    'test.user@appboardguru.com',
    'demo.director@appboardguru.com'
)
ORDER BY 
    CASE au.email
        WHEN 'test.director@appboardguru.com' THEN 1
        WHEN 'admin.user@appboardguru.com' THEN 2
        WHEN 'board.member@appboardguru.com' THEN 3
        WHEN 'test.user@appboardguru.com' THEN 4
        WHEN 'demo.director@appboardguru.com' THEN 5
    END;

-- Summary statistics
SELECT 
    COUNT(DISTINCT au.id) as "Auth Users",
    COUNT(DISTINCT u.id) as "User Profiles",
    COUNT(DISTINCT om.id) as "Org Memberships",
    COUNT(DISTINCT v.id) as "Vaults Created",
    COUNT(DISTINCT vm.id) as "Vault Access Granted"
FROM auth.users au
LEFT JOIN users u ON u.id = au.id
LEFT JOIN organization_members om ON om.user_id = au.id
LEFT JOIN vaults v ON v.organization_id = om.organization_id
LEFT JOIN vault_members vm ON vm.user_id = au.id
WHERE au.email LIKE '%@appboardguru.com%';