-- Fix Test Users Schema and Complete Setup
-- Run this in Supabase SQL Editor

-- 1. Add missing columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer'));

-- 2. Add missing columns to vaults table
ALTER TABLE vaults
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

ALTER TABLE vaults
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- 3. Update all test user profiles with proper data
DO $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Update test.director@appboardguru.com
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'test.director@appboardguru.com';
    IF v_user_id IS NOT NULL THEN
        INSERT INTO users (id, email, full_name, role, is_active, created_at, updated_at)
        VALUES (
            v_user_id,
            'test.director@appboardguru.com',
            'Test Director',
            'owner',
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
    END IF;

    -- Update board.member@appboardguru.com
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'board.member@appboardguru.com';
    IF v_user_id IS NOT NULL THEN
        INSERT INTO users (id, email, full_name, role, is_active, created_at, updated_at)
        VALUES (
            v_user_id,
            'board.member@appboardguru.com',
            'Board Member',
            'member',
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

    -- Update test.user@appboardguru.com
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'test.user@appboardguru.com';
    IF v_user_id IS NOT NULL THEN
        INSERT INTO users (id, email, full_name, role, is_active, created_at, updated_at)
        VALUES (
            v_user_id,
            'test.user@appboardguru.com',
            'Test User',
            'member',
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

    -- Update demo.director@appboardguru.com
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'demo.director@appboardguru.com';
    IF v_user_id IS NOT NULL THEN
        INSERT INTO users (id, email, full_name, role, is_active, created_at, updated_at)
        VALUES (
            v_user_id,
            'demo.director@appboardguru.com',
            'Demo Director',
            'admin', -- Set as admin to avoid multiple owners
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

-- 4. Create Demo Board Organization for demo.director
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

-- 5. Add demo.director to their organization
INSERT INTO organization_members (
    organization_id,
    user_id,
    role,
    status,
    joined_at,
    is_primary,
    receive_notifications,
    custom_permissions
)
SELECT
    o.id,
    u.id,
    'owner',
    'active',
    NOW(),
    true,
    true,
    '{"can_manage_users": true, "can_manage_vaults": true, "can_upload_assets": true, "can_delete_assets": true, "can_invite_members": true}'::jsonb
FROM organizations o
CROSS JOIN auth.users u
WHERE o.slug = 'demo-board-org'
AND u.email = 'demo.director@appboardguru.com'
ON CONFLICT (organization_id, user_id) DO UPDATE SET
    role = EXCLUDED.role,
    status = EXCLUDED.status,
    custom_permissions = EXCLUDED.custom_permissions;

-- 6. Create vaults for both organizations
DO $$
DECLARE
    v_org_id UUID;
    v_user_id UUID;
    v_vault_id UUID;
BEGIN
    -- Get Test Board Organization ID and creator
    SELECT id INTO v_org_id FROM organizations WHERE slug = 'test-board-org';
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'test.director@appboardguru.com';
    
    IF v_org_id IS NOT NULL AND v_user_id IS NOT NULL THEN
        -- Create Board Documents vault
        INSERT INTO vaults (organization_id, name, description, is_public, created_by)
        VALUES (v_org_id, 'Board Documents', 'Board meeting documents and minutes', false, v_user_id)
        ON CONFLICT (organization_id, name) DO NOTHING
        RETURNING id INTO v_vault_id;
        
        -- Create Financial Reports vault
        INSERT INTO vaults (organization_id, name, description, is_public, created_by)
        VALUES (v_org_id, 'Financial Reports', 'Financial statements and reports', false, v_user_id)
        ON CONFLICT (organization_id, name) DO NOTHING;
        
        -- Create Legal & Compliance vault
        INSERT INTO vaults (organization_id, name, description, is_public, created_by)
        VALUES (v_org_id, 'Legal & Compliance', 'Legal documents and compliance materials', false, v_user_id)
        ON CONFLICT (organization_id, name) DO NOTHING;
    END IF;
    
    -- Do the same for Demo Board Organization
    SELECT id INTO v_org_id FROM organizations WHERE slug = 'demo-board-org';
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'demo.director@appboardguru.com';
    
    IF v_org_id IS NOT NULL AND v_user_id IS NOT NULL THEN
        -- Create vaults for demo org
        INSERT INTO vaults (organization_id, name, description, is_public, created_by)
        VALUES (v_org_id, 'Demo Documents', 'Demo board documents', false, v_user_id)
        ON CONFLICT (organization_id, name) DO NOTHING;
    END IF;
END $$;

-- 7. Grant vault access to all users in their organizations
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

-- 8. Create sample boards for testing
INSERT INTO boards (organization_id, name, description, created_by)
SELECT 
    o.id,
    'Main Board',
    'Primary board for governance and decision making',
    u.id
FROM organizations o
CROSS JOIN auth.users u
WHERE o.slug = 'test-board-org'
AND u.email = 'test.director@appboardguru.com'
ON CONFLICT DO NOTHING;

-- 9. Add board members
INSERT INTO board_members (board_id, user_id, position, joined_at)
SELECT
    b.id,
    u.id,
    CASE 
        WHEN u.email = 'test.director@appboardguru.com' THEN 'Chairman'
        WHEN u.email = 'admin.user@appboardguru.com' THEN 'Secretary'
        ELSE 'Member'
    END,
    NOW()
FROM boards b
CROSS JOIN auth.users u
WHERE b.name = 'Main Board'
AND u.email IN (
    'test.director@appboardguru.com',
    'admin.user@appboardguru.com',
    'board.member@appboardguru.com',
    'test.user@appboardguru.com'
)
ON CONFLICT DO NOTHING;

-- 10. Create some test committees
INSERT INTO committees (board_id, name, description, created_by)
SELECT
    b.id,
    committee_name,
    committee_desc,
    u.id
FROM boards b
CROSS JOIN auth.users u
CROSS JOIN (
    VALUES 
        ('Audit Committee', 'Oversees financial reporting and disclosure'),
        ('Compensation Committee', 'Reviews executive compensation'),
        ('Governance Committee', 'Ensures proper governance practices')
) AS committees(committee_name, committee_desc)
WHERE b.name = 'Main Board'
AND u.email = 'test.director@appboardguru.com'
ON CONFLICT DO NOTHING;

-- Summary query to verify setup
SELECT 
    'Test Users Setup Complete!' as status,
    COUNT(DISTINCT au.id) as auth_users_count,
    COUNT(DISTINCT u.id) as user_profiles_count,
    COUNT(DISTINCT om.id) as org_memberships_count,
    COUNT(DISTINCT v.id) as vaults_count,
    COUNT(DISTINCT vm.id) as vault_access_count
FROM auth.users au
LEFT JOIN users u ON u.id = au.id
LEFT JOIN organization_members om ON om.user_id = au.id
LEFT JOIN vaults v ON v.organization_id = om.organization_id
LEFT JOIN vault_members vm ON vm.user_id = au.id
WHERE au.email IN (
    'test.director@appboardguru.com',
    'admin.user@appboardguru.com',
    'board.member@appboardguru.com',
    'test.user@appboardguru.com',
    'demo.director@appboardguru.com'
);

-- Display test user credentials
SELECT 
    email,
    CASE 
        WHEN email = 'test.director@appboardguru.com' THEN 'TestDirector123!'
        WHEN email = 'admin.user@appboardguru.com' THEN 'AdminUser123!'
        WHEN email = 'board.member@appboardguru.com' THEN 'BoardMember123!'
        WHEN email = 'test.user@appboardguru.com' THEN 'TestUser123!'
        WHEN email = 'demo.director@appboardguru.com' THEN 'DemoDirector123!'
    END as password,
    u.role,
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
    CASE email
        WHEN 'test.director@appboardguru.com' THEN 1
        WHEN 'admin.user@appboardguru.com' THEN 2
        WHEN 'board.member@appboardguru.com' THEN 3
        WHEN 'test.user@appboardguru.com' THEN 4
        WHEN 'demo.director@appboardguru.com' THEN 5
    END;