-- =====================================================
-- VOICE INPUT FUNCTIONALITY - COMPLETE DATABASE SETUP
-- Test Data for Voice Input Search Functionality
-- Run these queries step-by-step in Supabase SQL Editor
-- =====================================================

-- Step 1: Create missing core tables if they don't exist
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create user-related enums if they don't exist
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('pending', 'director', 'admin', 'viewer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE user_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE organization_role AS ENUM ('owner', 'admin', 'member', 'viewer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE membership_status AS ENUM ('active', 'suspended', 'pending_activation');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create meeting-related enums
DO $$ BEGIN
    CREATE TYPE meeting_type AS ENUM ('agm', 'board', 'committee', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE meeting_status AS ENUM ('draft', 'scheduled', 'in_progress', 'completed', 'cancelled', 'postponed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE meeting_visibility AS ENUM ('public', 'organization', 'private');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create vault-related enums
DO $$ BEGIN
    CREATE TYPE vault_status AS ENUM ('draft', 'active', 'archived', 'expired', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE vault_priority AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 2: Create Users table (extends auth.users)
-- =====================================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    role user_role DEFAULT 'pending',
    status user_status DEFAULT 'pending',
    company TEXT,
    position TEXT,
    designation TEXT,
    linkedin_url TEXT,
    bio TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ
);

-- Step 3: Create Organizations table
-- =====================================================

CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL CHECK (length(name) >= 2 AND length(name) <= 100),
    slug TEXT UNIQUE NOT NULL CHECK (slug ~ '^[a-z0-9-]+$' AND length(slug) >= 2),
    description TEXT CHECK (length(description) <= 500),
    logo_url TEXT,
    website TEXT,
    industry TEXT,
    organization_size TEXT CHECK (organization_size IN ('startup', 'small', 'medium', 'large', 'enterprise')),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

-- Step 4: Create Organization Members table
-- =====================================================

CREATE TABLE IF NOT EXISTS organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role organization_role DEFAULT 'member',
    status membership_status DEFAULT 'active',
    invited_by UUID REFERENCES users(id),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    last_accessed TIMESTAMPTZ,
    permissions JSONB DEFAULT '{}',
    UNIQUE(organization_id, user_id)
);

-- Step 5: Create Meetings table
-- =====================================================

CREATE TABLE IF NOT EXISTS meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  title VARCHAR(255) NOT NULL CHECK (length(title) >= 1 AND length(title) <= 255),
  description TEXT CHECK (length(description) <= 2000),
  meeting_type meeting_type NOT NULL DEFAULT 'board',
  status meeting_status DEFAULT 'draft',
  visibility meeting_visibility DEFAULT 'organization',
  scheduled_start TIMESTAMPTZ NOT NULL,
  scheduled_end TIMESTAMPTZ NOT NULL,
  timezone VARCHAR(50) DEFAULT 'UTC',
  location TEXT,
  virtual_meeting_url TEXT,
  is_recurring BOOLEAN DEFAULT false,
  agenda_finalized BOOLEAN DEFAULT false,
  invitations_sent BOOLEAN DEFAULT false,
  documents_locked BOOLEAN DEFAULT false,
  estimated_duration_minutes INTEGER DEFAULT 60,
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  settings JSONB DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  category VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ,
  cancelled_reason TEXT
);

-- Step 6: Create Vaults table
-- =====================================================

CREATE TABLE IF NOT EXISTS vaults (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL CHECK (length(name) >= 2 AND length(name) <= 100),
    description TEXT CHECK (length(description) <= 1000),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id),
    status vault_status DEFAULT 'draft',
    priority vault_priority DEFAULT 'medium',
    meeting_date TIMESTAMPTZ,
    location TEXT,
    is_public BOOLEAN DEFAULT false,
    requires_invitation BOOLEAN DEFAULT true,
    access_code TEXT,
    expires_at TIMESTAMPTZ,
    member_count INTEGER DEFAULT 0,
    asset_count INTEGER DEFAULT 0,
    total_size_bytes BIGINT DEFAULT 0,
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    settings JSONB DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    category TEXT DEFAULT 'board_meeting',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, name)
);

-- Step 7: Create Vault Members table
-- =====================================================

CREATE TABLE IF NOT EXISTS vault_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vault_id UUID NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'editor', 'viewer', 'member')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
    joined_via TEXT DEFAULT 'invitation',
    permissions JSONB DEFAULT '{"can_view": true, "can_download": true, "can_upload": false}',
    added_by UUID REFERENCES users(id),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    last_accessed TIMESTAMPTZ,
    UNIQUE(vault_id, user_id)
);

-- Step 8: Create Assets table
-- =====================================================

CREATE TABLE IF NOT EXISTS assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    owner_id UUID NOT NULL REFERENCES users(id),
    uploaded_by UUID REFERENCES users(id),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    vault_id UUID REFERENCES vaults(id) ON DELETE SET NULL,
    description TEXT,
    tags TEXT[] DEFAULT '{}',
    version INTEGER DEFAULT 1,
    public_url TEXT,
    metadata JSONB DEFAULT '{}',
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 9: Create Documents table (for document search)
-- =====================================================

CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT,
    summary TEXT,
    asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id),
    document_type TEXT DEFAULT 'general',
    status TEXT DEFAULT 'draft',
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 10: Create Boardmate Profiles View (if it doesn't exist)
-- =====================================================

CREATE OR REPLACE VIEW boardmate_profiles AS
SELECT 
    u.id,
    u.email,
    u.full_name,
    u.avatar_url,
    u.designation,
    u.linkedin_url,
    u.bio,
    u.company,
    u.position,
    u.status as user_status,
    o.name as organization_name,
    o.logo_url as organization_logo,
    om.role as org_role,
    om.status as org_status,
    om.joined_at as org_joined_at,
    om.last_accessed as org_last_accessed,
    o.id as organization_id,
    COALESCE(bm_agg.board_memberships, '[]'::jsonb) as board_memberships,
    COALESCE(cm_agg.committee_memberships, '[]'::jsonb) as committee_memberships,
    COALESCE(vm_agg.vault_memberships, '[]'::jsonb) as vault_memberships
FROM users u
JOIN organization_members om ON u.id = om.user_id
JOIN organizations o ON om.organization_id = o.id
LEFT JOIN (
    SELECT 
        bm.user_id,
        bm.organization_id,
        jsonb_agg(
            jsonb_build_object(
                'board_id', b.id,
                'board_name', b.name,
                'role', bm.role,
                'status', bm.status
            ) ORDER BY b.name
        ) as board_memberships
    FROM board_members bm
    JOIN boards b ON bm.board_id = b.id
    WHERE bm.status = 'active'
    GROUP BY bm.user_id, bm.organization_id
) bm_agg ON u.id = bm_agg.user_id AND o.id = bm_agg.organization_id
LEFT JOIN (
    SELECT 
        cm.user_id,
        cm.organization_id,
        jsonb_agg(
            jsonb_build_object(
                'committee_id', c.id,
                'committee_name', c.name,
                'role', cm.role,
                'status', cm.status
            ) ORDER BY c.name
        ) as committee_memberships
    FROM committee_members cm
    JOIN committees c ON cm.committee_id = c.id
    WHERE cm.status = 'active'
    GROUP BY cm.user_id, cm.organization_id
) cm_agg ON u.id = cm_agg.user_id AND o.id = cm_agg.organization_id
LEFT JOIN (
    SELECT 
        vm.user_id,
        vm.organization_id,
        jsonb_agg(
            jsonb_build_object(
                'vault_id', v.id,
                'vault_name', v.name,
                'role', vm.role,
                'status', vm.status
            ) ORDER BY v.name
        ) as vault_memberships
    FROM vault_members vm
    JOIN vaults v ON vm.vault_id = v.id
    WHERE vm.status = 'active'
    GROUP BY vm.user_id, vm.organization_id
) vm_agg ON u.id = vm_agg.user_id AND o.id = vm_agg.organization_id;

-- Step 11: Create necessary indexes for performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organization_members_org_user ON organization_members(organization_id, user_id);
CREATE INDEX IF NOT EXISTS idx_meetings_organization ON meetings(organization_id);
CREATE INDEX IF NOT EXISTS idx_meetings_status ON meetings(status);
CREATE INDEX IF NOT EXISTS idx_vaults_organization ON vaults(organization_id);
CREATE INDEX IF NOT EXISTS idx_vaults_status ON vaults(status);
CREATE INDEX IF NOT EXISTS idx_assets_organization ON assets(organization_id);
CREATE INDEX IF NOT EXISTS idx_assets_vault ON assets(vault_id);
CREATE INDEX IF NOT EXISTS idx_documents_organization ON documents(organization_id);

-- Enable Row Level Security on all tables
-- =====================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE vaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;