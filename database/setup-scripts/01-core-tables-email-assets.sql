-- =====================================================
-- EMAIL-TO-ASSET CORE TABLES SETUP
-- Script 1: Create all necessary database tables
-- Run this first in Supabase SQL Editor
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 1. CREATE CUSTOM TYPES/ENUMS
-- =====================================================

-- Create user role enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('pending', 'director', 'admin', 'viewer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create user status enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE user_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create organization role enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE organization_role AS ENUM ('owner', 'admin', 'member', 'viewer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create membership status enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE membership_status AS ENUM ('active', 'suspended', 'pending_activation');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create email processing status enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE email_processing_status AS ENUM ('received', 'processing', 'completed', 'failed', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- 2. USERS TABLE (extends auth.users)
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
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ
);

-- =====================================================
-- 3. ORGANIZATIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Basic Information
    name TEXT NOT NULL CHECK (length(name) >= 2 AND length(name) <= 100),
    slug TEXT UNIQUE NOT NULL CHECK (slug ~ '^[a-z0-9-]+$' AND length(slug) >= 2),
    description TEXT CHECK (length(description) <= 500),
    
    -- Branding & Identity
    logo_url TEXT,
    website TEXT,
    industry TEXT,
    organization_size TEXT CHECK (organization_size IN ('startup', 'small', 'medium', 'large', 'enterprise')),
    
    -- Ownership & Timestamps
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Status
    is_active BOOLEAN DEFAULT true
);

-- =====================================================
-- 4. ORGANIZATION MEMBERS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Core Relationships
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Role & Permissions
    role organization_role NOT NULL DEFAULT 'member',
    
    -- Membership Metadata
    invited_by UUID REFERENCES users(id),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    last_accessed TIMESTAMPTZ DEFAULT NOW(),
    
    -- Status & Control
    status membership_status DEFAULT 'active',
    is_primary BOOLEAN DEFAULT false,
    
    -- Constraints
    UNIQUE(organization_id, user_id)
);

-- =====================================================
-- 5. ASSETS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    file_name VARCHAR(500) NOT NULL,
    original_file_name VARCHAR(500) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    mime_type VARCHAR(200) NOT NULL,
    storage_bucket VARCHAR(100) DEFAULT 'assets',
    
    -- Categorization and organization
    category VARCHAR(100) DEFAULT 'general',
    tags TEXT[] DEFAULT '{}',
    folder_path TEXT DEFAULT '/',
    
    -- Asset metadata
    thumbnail_url TEXT,
    preview_url TEXT,
    is_processed BOOLEAN DEFAULT FALSE,
    processing_status VARCHAR(50) DEFAULT 'pending',
    processing_error TEXT,
    
    -- Access and security
    visibility VARCHAR(20) DEFAULT 'private' CHECK (visibility IN ('private', 'shared', 'public')),
    download_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    
    -- Email processing metadata
    source_type VARCHAR(50) DEFAULT 'upload' CHECK (source_type IN ('upload', 'email', 'import')),
    email_message_id TEXT, -- Links to email processing log
    source_email TEXT, -- Original sender email
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_accessed_at TIMESTAMPTZ,
    
    -- Soft delete
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ
);

-- =====================================================
-- 6. EMAIL PROCESSING LOGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS email_processing_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id TEXT NOT NULL UNIQUE,
    from_email TEXT NOT NULL,
    to_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    status email_processing_status DEFAULT 'received',
    user_id UUID REFERENCES users(id),
    organization_id UUID REFERENCES organizations(id),
    assets_created UUID[] DEFAULT '{}',
    error_message TEXT,
    processing_time_ms INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 7. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Organizations table indexes
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_created_by ON organizations(created_by);
CREATE INDEX IF NOT EXISTS idx_organizations_is_active ON organizations(is_active);

-- Organization members table indexes
CREATE INDEX IF NOT EXISTS idx_organization_members_org_id ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_role ON organization_members(role);

-- Assets table indexes
CREATE INDEX IF NOT EXISTS idx_assets_owner_id ON assets(owner_id);
CREATE INDEX IF NOT EXISTS idx_assets_organization_id ON assets(organization_id);
CREATE INDEX IF NOT EXISTS idx_assets_category ON assets(category);
CREATE INDEX IF NOT EXISTS idx_assets_source_type ON assets(source_type);
CREATE INDEX IF NOT EXISTS idx_assets_email_message_id ON assets(email_message_id);
CREATE INDEX IF NOT EXISTS idx_assets_created_at ON assets(created_at);
CREATE INDEX IF NOT EXISTS idx_assets_is_deleted ON assets(is_deleted) WHERE is_deleted = false;

-- Email processing logs indexes
CREATE INDEX IF NOT EXISTS idx_email_processing_logs_message_id ON email_processing_logs(message_id);
CREATE INDEX IF NOT EXISTS idx_email_processing_logs_from_email ON email_processing_logs(from_email);
CREATE INDEX IF NOT EXISTS idx_email_processing_logs_user_id ON email_processing_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_email_processing_logs_status ON email_processing_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_processing_logs_created_at ON email_processing_logs(created_at);

-- =====================================================
-- 8. CREATE TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for all tables with updated_at
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organizations_updated_at 
    BEFORE UPDATE ON organizations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assets_updated_at 
    BEFORE UPDATE ON assets 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_processing_logs_updated_at 
    BEFORE UPDATE ON email_processing_logs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 9. ENABLE ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_processing_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 10. CREATE ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Users table policies
CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Organizations table policies
CREATE POLICY "Users can view organizations they belong to" ON organizations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM organization_members 
            WHERE organization_id = organizations.id 
            AND user_id = auth.uid()
        )
    );

-- Organization members table policies
CREATE POLICY "Users can view members of their organizations" ON organization_members
    FOR SELECT USING (
        user_id = auth.uid() OR 
        EXISTS (
            SELECT 1 FROM organization_members om 
            WHERE om.organization_id = organization_members.organization_id 
            AND om.user_id = auth.uid()
        )
    );

-- Assets table policies
CREATE POLICY "Users can view their own assets and shared assets" ON assets
    FOR SELECT USING (
        owner_id = auth.uid() OR 
        EXISTS (
            SELECT 1 FROM organization_members 
            WHERE organization_id = assets.organization_id 
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own assets" ON assets
    FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update their own assets" ON assets
    FOR UPDATE USING (owner_id = auth.uid());

-- Email processing logs policies
CREATE POLICY "Users can view their own email processing logs" ON email_processing_logs
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can insert email processing logs" ON email_processing_logs
    FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update email processing logs" ON email_processing_logs
    FOR UPDATE USING (true);

-- =====================================================
-- 11. CREATE STORAGE BUCKETS
-- =====================================================

-- Create storage bucket for assets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('assets', 'assets', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for email assets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('email-assets', 'email-assets', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for assets bucket
CREATE POLICY "Users can view their assets" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'assets' AND
        auth.uid() IS NOT NULL
    );

CREATE POLICY "Users can upload assets" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'assets' AND
        auth.uid() IS NOT NULL
    );

-- Storage policies for email-assets bucket
CREATE POLICY "Users can view their email assets" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'email-assets' AND
        auth.uid() IS NOT NULL
    );

CREATE POLICY "System can upload email assets" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'email-assets'
    );

-- =====================================================
-- 12. CREATE HELPFUL FUNCTIONS
-- =====================================================

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
    RETURN NEW;
END;
$$ language plpgsql SECURITY DEFINER;

-- Create trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$ 
BEGIN 
    RAISE NOTICE 'SUCCESS: All core tables for email-to-asset functionality have been created!';
    RAISE NOTICE 'Next: Run script 02-test-user-setup.sql to create test data';
END $$;