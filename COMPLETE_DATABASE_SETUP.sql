-- =====================================================
-- COMPLETE DATABASE SETUP FOR APPBOARDGURU
-- Run this in Supabase SQL Editor
-- =====================================================

-- IMPORTANT: First create the test user in Supabase Dashboard
-- 1. Go to Authentication > Users
-- 2. Click "Invite User" 
-- 3. Email: test.director@appboardguru.com
-- 4. Set password to: TestDirector123!
-- 5. Then run this SQL script

-- =====================================================
-- STEP 1: Create all required tables if they don't exist
-- =====================================================

-- Create users table if not exists
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role TEXT DEFAULT 'member',
    status TEXT DEFAULT 'pending',
    password_set BOOLEAN DEFAULT false,
    company TEXT,
    position TEXT,
    phone TEXT,
    avatar_url TEXT,
    bio TEXT,
    location TEXT,
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create organizations table if not exists
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    website TEXT,
    industry TEXT,
    organization_size TEXT,
    logo_url TEXT,
    settings JSONB DEFAULT '{}',
    compliance_settings JSONB DEFAULT '{}',
    billing_settings JSONB DEFAULT '{}',
    created_by UUID REFERENCES auth.users(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    deletion_scheduled_for TIMESTAMP WITH TIME ZONE
);

-- Create organization_members table if not exists
CREATE TABLE IF NOT EXISTS public.organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member',
    status TEXT DEFAULT 'active',
    invited_by UUID REFERENCES auth.users(id),
    approved_by UUID REFERENCES auth.users(id),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_accessed TIMESTAMP WITH TIME ZONE,
    is_primary BOOLEAN DEFAULT false,
    receive_notifications BOOLEAN DEFAULT true,
    custom_permissions JSONB DEFAULT '{}',
    access_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id, user_id)
);

-- Create vaults table if not exists
CREATE TABLE IF NOT EXISTS public.vaults (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id),
    is_public BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    archived_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create assets table if not exists
CREATE TABLE IF NOT EXISTS public.assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_name TEXT NOT NULL,
    original_file_name TEXT,
    file_size BIGINT,
    mime_type TEXT,
    file_path TEXT,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    vault_id UUID REFERENCES vaults(id) ON DELETE CASCADE,
    owner_id UUID REFERENCES auth.users(id),
    uploaded_by UUID REFERENCES auth.users(id),
    processing_status TEXT DEFAULT 'pending',
    processing_error TEXT,
    version INTEGER DEFAULT 1,
    visibility TEXT DEFAULT 'private',
    public_url TEXT,
    view_count INTEGER DEFAULT 0,
    download_count INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    tags TEXT[],
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create boards table if not exists
CREATE TABLE IF NOT EXISTS public.boards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id),
    is_active BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create committees table if not exists
CREATE TABLE IF NOT EXISTS public.committees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create meetings table if not exists
CREATE TABLE IF NOT EXISTS public.meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    board_id UUID REFERENCES boards(id),
    committee_id UUID REFERENCES committees(id),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    scheduled_at TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER,
    location TEXT,
    meeting_link TEXT,
    status TEXT DEFAULT 'scheduled',
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notifications table if not exists
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT,
    type TEXT DEFAULT 'info',
    status TEXT DEFAULT 'unread',
    action_url TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE
);

-- Create activity_logs table if not exists
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    organization_id UUID REFERENCES organizations(id),
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id UUID,
    metadata JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- STEP 2: Enable Row Level Security (RLS)
-- =====================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.committees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 3: Create RLS Policies
-- =====================================================

-- Users policies
CREATE POLICY "Users can view their own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Public profiles are viewable by everyone" ON public.users
    FOR SELECT USING (true);

-- Organizations policies
CREATE POLICY "Organization members can view their organizations" ON public.organizations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM organization_members 
            WHERE organization_id = organizations.id 
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Organization owners can update their organizations" ON public.organizations
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM organization_members 
            WHERE organization_id = organizations.id 
            AND user_id = auth.uid() 
            AND role IN ('owner', 'admin')
        )
    );

-- Organization members policies
CREATE POLICY "Users can view organization members" ON public.organization_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM organization_members om
            WHERE om.organization_id = organization_members.organization_id
            AND om.user_id = auth.uid()
        )
    );

-- Vaults policies
CREATE POLICY "Organization members can view vaults" ON public.vaults
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM organization_members
            WHERE organization_id = vaults.organization_id
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Organization members can create vaults" ON public.vaults
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM organization_members
            WHERE organization_id = vaults.organization_id
            AND user_id = auth.uid()
        )
    );

-- Assets policies
CREATE POLICY "Organization members can view assets" ON public.assets
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM organization_members
            WHERE organization_id = assets.organization_id
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Organization members can upload assets" ON public.assets
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM organization_members
            WHERE organization_id = assets.organization_id
            AND user_id = auth.uid()
        )
    );

-- Notifications policies
CREATE POLICY "Users can view their own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- =====================================================
-- STEP 4: Setup Test User and Data
-- =====================================================

DO $$
DECLARE
    test_user_id UUID;
    test_org_id UUID;
    test_board_id UUID;
    test_vault_id UUID;
BEGIN
    -- Get the test user ID from auth.users
    SELECT id INTO test_user_id 
    FROM auth.users 
    WHERE email = 'test.director@appboardguru.com'
    LIMIT 1;

    IF test_user_id IS NULL THEN
        RAISE NOTICE '❌ ERROR: Test user not found in auth.users!';
        RAISE NOTICE 'Please create the user first in Supabase Dashboard:';
        RAISE NOTICE '1. Go to Authentication > Users';
        RAISE NOTICE '2. Click "Invite User"';
        RAISE NOTICE '3. Email: test.director@appboardguru.com';
        RAISE NOTICE '4. Password: TestDirector123!';
        RETURN;
    END IF;

    -- Create or update user profile
    INSERT INTO public.users (
        id, email, full_name, role, status, password_set,
        company, position, approved_by, approved_at,
        created_at, updated_at
    ) VALUES (
        test_user_id,
        'test.director@appboardguru.com',
        'Test Director',
        'director',
        'approved',
        true,
        'AppBoardGuru Test Company',
        'Board Director',
        test_user_id,
        NOW(),
        NOW(),
        NOW()
    ) ON CONFLICT (id) DO UPDATE SET
        status = 'approved',
        password_set = true,
        role = 'director',
        full_name = 'Test Director',
        company = 'AppBoardGuru Test Company',
        position = 'Board Director',
        updated_at = NOW();

    RAISE NOTICE '✅ User profile created/updated in public.users';

    -- Create test organization
    INSERT INTO organizations (
        name, slug, description, created_by, is_active
    ) VALUES (
        'Test Board Organization',
        'test-board-org',
        'Primary test organization for AppBoardGuru',
        test_user_id,
        true
    ) ON CONFLICT (slug) DO UPDATE SET
        name = 'Test Board Organization',
        updated_at = NOW()
    RETURNING id INTO test_org_id;

    RAISE NOTICE '✅ Test organization created';

    -- Add user as organization owner
    INSERT INTO organization_members (
        organization_id, user_id, role, status, is_primary
    ) VALUES (
        test_org_id,
        test_user_id,
        'owner',
        'active',
        true
    ) ON CONFLICT (organization_id, user_id) DO UPDATE SET
        role = 'owner',
        status = 'active',
        is_primary = true;

    RAISE NOTICE '✅ User added as organization owner';

    -- Create test board
    INSERT INTO boards (
        name, description, organization_id, created_by
    ) VALUES (
        'Main Board',
        'Primary board of directors',
        test_org_id,
        test_user_id
    ) RETURNING id INTO test_board_id;

    RAISE NOTICE '✅ Test board created';

    -- Create test committees
    INSERT INTO committees (name, description, board_id, organization_id, created_by) VALUES
        ('Audit Committee', 'Oversees financial reporting and auditing', test_board_id, test_org_id, test_user_id),
        ('Compensation Committee', 'Reviews executive compensation', test_board_id, test_org_id, test_user_id),
        ('Nominating Committee', 'Identifies board candidates', test_board_id, test_org_id, test_user_id);

    RAISE NOTICE '✅ Test committees created';

    -- Create test vaults
    INSERT INTO vaults (name, description, organization_id, created_by) VALUES
        ('Board Documents', 'Official board meeting documents', test_org_id, test_user_id),
        ('Financial Reports', 'Quarterly and annual financial reports', test_org_id, test_user_id),
        ('Legal & Compliance', 'Legal documents and compliance materials', test_org_id, test_user_id)
    RETURNING id INTO test_vault_id;

    RAISE NOTICE '✅ Test vaults created';

    -- Create sample assets
    INSERT INTO assets (
        file_name, original_file_name, file_size, mime_type,
        organization_id, vault_id, owner_id, uploaded_by,
        processing_status, visibility
    ) VALUES
        ('board-minutes-2024-q1.pdf', 'Board Minutes Q1 2024.pdf', 2048000, 'application/pdf',
         test_org_id, test_vault_id, test_user_id, test_user_id, 'completed', 'private'),
        ('financial-report-2024.xlsx', 'Annual Financial Report 2024.xlsx', 5120000, 'application/vnd.ms-excel',
         test_org_id, test_vault_id, test_user_id, test_user_id, 'completed', 'private'),
        ('strategic-plan-2025.pptx', 'Strategic Plan 2025.pptx', 10240000, 'application/vnd.ms-powerpoint',
         test_org_id, test_vault_id, test_user_id, test_user_id, 'completed', 'private');

    RAISE NOTICE '✅ Sample assets created';

    -- Create sample meetings
    INSERT INTO meetings (
        title, description, board_id, organization_id,
        scheduled_at, duration_minutes, status, created_by
    ) VALUES
        ('Q1 Board Meeting', 'Quarterly board review meeting', test_board_id, test_org_id,
         NOW() + INTERVAL '7 days', 120, 'scheduled', test_user_id),
        ('Annual General Meeting', 'Annual shareholders meeting', test_board_id, test_org_id,
         NOW() + INTERVAL '30 days', 180, 'scheduled', test_user_id);

    RAISE NOTICE '✅ Sample meetings created';

    -- Create sample notifications
    INSERT INTO notifications (user_id, title, message, type) VALUES
        (test_user_id, 'Welcome to AppBoardGuru', 'Your account has been successfully set up', 'info'),
        (test_user_id, 'Upcoming Meeting', 'Q1 Board Meeting scheduled for next week', 'reminder'),
        (test_user_id, 'New Document Available', 'Strategic Plan 2025 has been uploaded', 'document');

    RAISE NOTICE '✅ Sample notifications created';

    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ DATABASE SETUP COMPLETE!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'You can now login with:';
    RAISE NOTICE 'Email: test.director@appboardguru.com';
    RAISE NOTICE 'Password: TestDirector123!';
    RAISE NOTICE '';
    RAISE NOTICE 'Test data includes:';
    RAISE NOTICE '- 1 Organization (Test Board Organization)';
    RAISE NOTICE '- 1 Board with 3 Committees';
    RAISE NOTICE '- 3 Document Vaults';
    RAISE NOTICE '- 3 Sample Assets';
    RAISE NOTICE '- 2 Scheduled Meetings';
    RAISE NOTICE '- 3 Notifications';
    RAISE NOTICE '========================================';

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Error during setup: %', SQLERRM;
        RAISE NOTICE 'Please check the error and try again.';
END $$;

-- =====================================================
-- STEP 5: Verify Setup
-- =====================================================

-- Check if everything was created successfully
SELECT 
    'Setup Verification' as check_type,
    (SELECT COUNT(*) FROM auth.users WHERE email = 'test.director@appboardguru.com') as auth_users,
    (SELECT COUNT(*) FROM public.users WHERE email = 'test.director@appboardguru.com') as public_users,
    (SELECT COUNT(*) FROM organizations WHERE slug = 'test-board-org') as organizations,
    (SELECT COUNT(*) FROM organization_members WHERE user_id = (SELECT id FROM auth.users WHERE email = 'test.director@appboardguru.com')) as memberships,
    (SELECT COUNT(*) FROM vaults WHERE organization_id = (SELECT id FROM organizations WHERE slug = 'test-board-org')) as vaults,
    (SELECT COUNT(*) FROM assets WHERE organization_id = (SELECT id FROM organizations WHERE slug = 'test-board-org')) as assets;

-- Show user details
SELECT 
    u.email,
    u.full_name,
    u.role,
    u.status,
    u.company,
    u.position,
    o.name as organization,
    om.role as org_role
FROM public.users u
LEFT JOIN organization_members om ON u.id = om.user_id
LEFT JOIN organizations o ON om.organization_id = o.id
WHERE u.email = 'test.director@appboardguru.com';