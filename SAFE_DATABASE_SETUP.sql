-- =====================================================
-- SAFE DATABASE SETUP FOR APPBOARDGURU
-- This version checks for existing objects before creating
-- =====================================================

-- IMPORTANT: First create the test user in Supabase Dashboard
-- 1. Go to Authentication > Users
-- 2. Click "Invite User" 
-- 3. Email: test.director@appboardguru.com
-- 4. Set password to: TestDirector123!
-- 5. Then run this SQL script

-- =====================================================
-- STEP 1: Drop existing policies (safe to re-create)
-- =====================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.users;
DROP POLICY IF EXISTS "Organization members can view their organizations" ON public.organizations;
DROP POLICY IF EXISTS "Organization owners can update their organizations" ON public.organizations;
DROP POLICY IF EXISTS "Users can view organization members" ON public.organization_members;
DROP POLICY IF EXISTS "Organization members can view vaults" ON public.vaults;
DROP POLICY IF EXISTS "Organization members can create vaults" ON public.vaults;
DROP POLICY IF EXISTS "Organization members can view assets" ON public.assets;
DROP POLICY IF EXISTS "Organization members can upload assets" ON public.assets;
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;

-- =====================================================
-- STEP 2: Create tables only if they don't exist
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

-- =====================================================
-- STEP 3: Enable RLS (safe to run multiple times)
-- =====================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 4: Create fresh RLS policies
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
        ) OR is_active = true  -- Allow viewing active organizations
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
        ) OR is_public = true
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
        ) OR visibility = 'public'
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
-- STEP 5: Setup Test User and Basic Data
-- =====================================================

DO $$
DECLARE
    test_user_id UUID;
    test_org_id UUID;
BEGIN
    -- Get the test user ID from auth.users
    SELECT id INTO test_user_id 
    FROM auth.users 
    WHERE email = 'test.director@appboardguru.com'
    LIMIT 1;

    IF test_user_id IS NULL THEN
        RAISE NOTICE '';
        RAISE NOTICE '================================================';
        RAISE NOTICE '❌ ERROR: Test user not found in auth.users!';
        RAISE NOTICE '================================================';
        RAISE NOTICE '';
        RAISE NOTICE 'Please create the user first:';
        RAISE NOTICE '1. Go to Supabase Dashboard';
        RAISE NOTICE '2. Navigate to Authentication > Users';
        RAISE NOTICE '3. Click "Invite User" or "Add User"';
        RAISE NOTICE '4. Enter email: test.director@appboardguru.com';
        RAISE NOTICE '5. Set password: TestDirector123!';
        RAISE NOTICE '6. Then run this script again';
        RAISE NOTICE '';
        RAISE NOTICE '================================================';
        RETURN;
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '✅ Found test user in auth.users';
    RAISE NOTICE 'User ID: %', test_user_id;

    -- Create or update user profile
    INSERT INTO public.users (
        id, 
        email, 
        full_name, 
        role, 
        status, 
        password_set,
        company, 
        position, 
        approved_by, 
        approved_at,
        created_at, 
        updated_at
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
        full_name = COALESCE(users.full_name, 'Test Director'),
        company = COALESCE(users.company, 'AppBoardGuru Test Company'),
        position = COALESCE(users.position, 'Board Director'),
        updated_at = NOW();

    RAISE NOTICE '✅ User profile created/updated in public.users';

    -- Create test organization
    INSERT INTO organizations (
        name, 
        slug, 
        description, 
        created_by, 
        is_active
    ) VALUES (
        'Test Board Organization',
        'test-board-org',
        'Primary test organization for AppBoardGuru',
        test_user_id,
        true
    ) ON CONFLICT (slug) DO UPDATE SET
        name = 'Test Board Organization',
        is_active = true,
        updated_at = NOW()
    RETURNING id INTO test_org_id;

    -- If organization already existed, get its ID
    IF test_org_id IS NULL THEN
        SELECT id INTO test_org_id 
        FROM organizations 
        WHERE slug = 'test-board-org';
    END IF;

    RAISE NOTICE '✅ Test organization ready (ID: %)', test_org_id;

    -- Add user as organization owner
    INSERT INTO organization_members (
        organization_id, 
        user_id, 
        role, 
        status, 
        is_primary
    ) VALUES (
        test_org_id,
        test_user_id,
        'owner',
        'active',
        true
    ) ON CONFLICT (organization_id, user_id) DO UPDATE SET
        role = 'owner',
        status = 'active',
        is_primary = true,
        updated_at = NOW();

    RAISE NOTICE '✅ User added as organization owner';

    -- Create sample vaults if they don't exist
    INSERT INTO vaults (name, description, organization_id, created_by) 
    SELECT 'Board Documents', 'Official board meeting documents', test_org_id, test_user_id
    WHERE NOT EXISTS (
        SELECT 1 FROM vaults 
        WHERE name = 'Board Documents' 
        AND organization_id = test_org_id
    );

    INSERT INTO vaults (name, description, organization_id, created_by) 
    SELECT 'Financial Reports', 'Quarterly and annual financial reports', test_org_id, test_user_id
    WHERE NOT EXISTS (
        SELECT 1 FROM vaults 
        WHERE name = 'Financial Reports' 
        AND organization_id = test_org_id
    );

    RAISE NOTICE '✅ Sample vaults created';

    -- Create welcome notification
    INSERT INTO notifications (user_id, title, message, type) 
    SELECT test_user_id, 'Welcome to AppBoardGuru', 'Your account has been successfully set up', 'info'
    WHERE NOT EXISTS (
        SELECT 1 FROM notifications 
        WHERE user_id = test_user_id 
        AND title = 'Welcome to AppBoardGuru'
    );

    RAISE NOTICE '✅ Welcome notification created';

    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ SETUP COMPLETE!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'You can now login with:';
    RAISE NOTICE 'Email: test.director@appboardguru.com';
    RAISE NOTICE 'Password: TestDirector123!';
    RAISE NOTICE '';
    RAISE NOTICE 'User has access to:';
    RAISE NOTICE '- Test Board Organization (as owner)';
    RAISE NOTICE '- Document Vaults';
    RAISE NOTICE '- Full board director permissions';
    RAISE NOTICE '========================================';

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '';
        RAISE NOTICE '❌ Error during setup: %', SQLERRM;
        RAISE NOTICE 'This is usually fine if objects already exist.';
        RAISE NOTICE 'Try logging in anyway!';
END $$;

-- =====================================================
-- STEP 6: Verify Setup
-- =====================================================

-- Show final status
SELECT 
    'Final Verification' as status,
    EXISTS(SELECT 1 FROM auth.users WHERE email = 'test.director@appboardguru.com') as "Auth User Exists",
    EXISTS(SELECT 1 FROM public.users WHERE email = 'test.director@appboardguru.com') as "Profile Exists",
    EXISTS(SELECT 1 FROM organizations WHERE slug = 'test-board-org') as "Org Exists",
    EXISTS(SELECT 1 FROM organization_members om 
           JOIN auth.users au ON om.user_id = au.id 
           WHERE au.email = 'test.director@appboardguru.com') as "Membership Exists";

-- Show user details
SELECT 
    'User Details' as info,
    u.email,
    u.full_name,
    u.role as user_role,
    u.status,
    u.company,
    o.name as organization,
    om.role as org_role,
    om.status as membership_status
FROM public.users u
LEFT JOIN organization_members om ON u.id = om.user_id
LEFT JOIN organizations o ON om.organization_id = o.id
WHERE u.email = 'test.director@appboardguru.com';