-- =====================================================
-- ASSETS AND VAULTS TABLES SETUP
-- Script 3: Create assets, vaults, and related tables for upload functionality
-- Run this after 01-core-tables and 02-test-user-setup
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 1. CREATE VAULTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS vaults (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Basic Information
    name TEXT NOT NULL CHECK (length(name) >= 2 AND length(name) <= 100),
    description TEXT CHECK (length(description) <= 1000),
    
    -- Organization Relationship
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Ownership & Access
    created_by UUID NOT NULL REFERENCES users(id),
    
    -- Settings
    is_public BOOLEAN DEFAULT false,
    is_archived BOOLEAN DEFAULT false,
    
    -- Metadata
    settings JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(organization_id, name)
);

-- =====================================================
-- 2. CREATE VAULT MEMBERS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS vault_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relationships
    vault_id UUID NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Role & Permissions
    role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'editor', 'viewer', 'member')),
    
    -- Access Control
    permissions JSONB DEFAULT '{"can_view": true, "can_download": true, "can_upload": false, "can_edit": false, "can_delete": false, "can_share": false}',
    
    -- Membership Metadata
    added_by UUID REFERENCES users(id),
    added_at TIMESTAMPTZ DEFAULT NOW(),
    last_accessed TIMESTAMPTZ,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Constraints
    UNIQUE(vault_id, user_id)
);

-- =====================================================
-- 3. ENHANCE ASSETS TABLE (if not comprehensive enough)
-- =====================================================

-- Check if assets table exists and add missing columns
DO $$
BEGIN
    -- Add vault_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'assets' AND column_name = 'vault_id') THEN
        ALTER TABLE assets ADD COLUMN vault_id UUID REFERENCES vaults(id) ON DELETE SET NULL;
    END IF;
    
    -- Add version column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'assets' AND column_name = 'version') THEN
        ALTER TABLE assets ADD COLUMN version INTEGER DEFAULT 1;
    END IF;
    
    -- Add public_url column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'assets' AND column_name = 'public_url') THEN
        ALTER TABLE assets ADD COLUMN public_url TEXT;
    END IF;
    
    -- Add metadata column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'assets' AND column_name = 'metadata') THEN
        ALTER TABLE assets ADD COLUMN metadata JSONB DEFAULT '{}';
    END IF;
    
    -- Add uploaded_by column if it doesn't exist (should match owner_id)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'assets' AND column_name = 'uploaded_by') THEN
        ALTER TABLE assets ADD COLUMN uploaded_by UUID REFERENCES auth.users(id);
        -- Set uploaded_by to owner_id for existing records
        UPDATE assets SET uploaded_by = owner_id WHERE uploaded_by IS NULL;
    END IF;
END $$;

-- =====================================================
-- 4. CREATE ASSET SHARES TABLE (for sharing functionality)
-- =====================================================

CREATE TABLE IF NOT EXISTS asset_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relationships
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    shared_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    shared_with_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Permission levels
    permission_level TEXT DEFAULT 'view' CHECK (permission_level IN ('view', 'download', 'edit', 'admin')),
    
    -- Sharing details
    share_message TEXT,
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    
    -- Access tracking
    accessed_at TIMESTAMPTZ,
    download_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint to prevent duplicate shares
    UNIQUE(asset_id, shared_with_user_id)
);

-- =====================================================
-- 5. CREATE ASSET ANNOTATIONS TABLE (for comments/annotations)
-- =====================================================

CREATE TABLE IF NOT EXISTS asset_annotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relationships
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES asset_annotations(id) ON DELETE CASCADE,
    
    -- Annotation Content
    content TEXT NOT NULL,
    annotation_type TEXT DEFAULT 'comment' CHECK (annotation_type IN ('comment', 'highlight', 'note', 'review')),
    
    -- Position/Location (for PDF annotations, etc.)
    position_data JSONB DEFAULT '{}', -- Can store page, coordinates, etc.
    
    -- Status
    is_resolved BOOLEAN DEFAULT false,
    is_edited BOOLEAN DEFAULT false,
    edited_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Prevent self-referencing
    CHECK (id != parent_id)
);

-- =====================================================
-- 6. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Vaults indexes
CREATE INDEX IF NOT EXISTS idx_vaults_organization_id ON vaults(organization_id);
CREATE INDEX IF NOT EXISTS idx_vaults_created_by ON vaults(created_by);
CREATE INDEX IF NOT EXISTS idx_vaults_created_at ON vaults(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vaults_name ON vaults(name);

-- Vault members indexes
CREATE INDEX IF NOT EXISTS idx_vault_members_vault_id ON vault_members(vault_id);
CREATE INDEX IF NOT EXISTS idx_vault_members_user_id ON vault_members(user_id);
CREATE INDEX IF NOT EXISTS idx_vault_members_role ON vault_members(role);
CREATE INDEX IF NOT EXISTS idx_vault_members_active ON vault_members(is_active) WHERE is_active = true;

-- Asset shares indexes
CREATE INDEX IF NOT EXISTS idx_asset_shares_asset_id ON asset_shares(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_shares_shared_with ON asset_shares(shared_with_user_id);
CREATE INDEX IF NOT EXISTS idx_asset_shares_active ON asset_shares(is_active) WHERE is_active = true;

-- Asset annotations indexes
CREATE INDEX IF NOT EXISTS idx_asset_annotations_asset_id ON asset_annotations(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_annotations_user_id ON asset_annotations(user_id);
CREATE INDEX IF NOT EXISTS idx_asset_annotations_parent_id ON asset_annotations(parent_id);
CREATE INDEX IF NOT EXISTS idx_asset_annotations_created_at ON asset_annotations(created_at DESC);

-- Additional assets indexes for vault relationship
CREATE INDEX IF NOT EXISTS idx_assets_vault_id ON assets(vault_id);

-- =====================================================
-- 7. CREATE TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Vaults updated_at trigger
CREATE TRIGGER update_vaults_updated_at 
    BEFORE UPDATE ON vaults 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Vault members updated_at trigger  
CREATE TRIGGER update_vault_members_updated_at 
    BEFORE UPDATE ON vault_members 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Asset shares updated_at trigger
CREATE TRIGGER update_asset_shares_updated_at 
    BEFORE UPDATE ON asset_shares 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Asset annotations updated_at trigger
CREATE TRIGGER update_asset_annotations_updated_at 
    BEFORE UPDATE ON asset_annotations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 8. ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE vaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_annotations ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 9. CREATE ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Vaults policies
CREATE POLICY "Users can view vaults they have access to" ON vaults
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM vault_members vm
            WHERE vm.vault_id = vaults.id 
            AND vm.user_id = auth.uid()
            AND vm.is_active = true
        )
        OR
        EXISTS (
            SELECT 1 FROM organization_members om
            WHERE om.organization_id = vaults.organization_id
            AND om.user_id = auth.uid()
            AND om.status = 'active'
        )
    );

CREATE POLICY "Organization members can create vaults" ON vaults
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM organization_members om
            WHERE om.organization_id = vaults.organization_id
            AND om.user_id = auth.uid()
            AND om.role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Vault owners can update vaults" ON vaults
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM vault_members vm
            WHERE vm.vault_id = vaults.id
            AND vm.user_id = auth.uid()
            AND vm.role IN ('owner', 'admin')
        )
    );

-- Vault members policies
CREATE POLICY "Users can view vault members for vaults they access" ON vault_members
    FOR SELECT USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM vault_members vm
            WHERE vm.vault_id = vault_members.vault_id
            AND vm.user_id = auth.uid()
            AND vm.is_active = true
        )
    );

CREATE POLICY "Vault admins can manage members" ON vault_members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM vault_members vm
            WHERE vm.vault_id = vault_members.vault_id
            AND vm.user_id = auth.uid()
            AND vm.role IN ('owner', 'admin')
        )
    );

-- Asset shares policies
CREATE POLICY "Users can view shares for their assets" ON asset_shares
    FOR SELECT USING (
        shared_by_user_id = auth.uid() OR 
        shared_with_user_id = auth.uid()
    );

CREATE POLICY "Asset owners can create shares" ON asset_shares
    FOR INSERT WITH CHECK (
        shared_by_user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM assets 
            WHERE id = asset_id AND owner_id = auth.uid()
        )
    );

-- Asset annotations policies
CREATE POLICY "Users can view annotations on accessible assets" ON asset_annotations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM assets a
            WHERE a.id = asset_annotations.asset_id
            AND (
                a.owner_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM vault_members vm
                    WHERE vm.vault_id = a.vault_id
                    AND vm.user_id = auth.uid()
                    AND vm.is_active = true
                ) OR
                EXISTS (
                    SELECT 1 FROM asset_shares ash
                    WHERE ash.asset_id = a.id
                    AND ash.shared_with_user_id = auth.uid()
                    AND ash.is_active = true
                )
            )
        )
    );

CREATE POLICY "Users can create annotations on accessible assets" ON asset_annotations
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM assets a
            WHERE a.id = asset_annotations.asset_id
            AND (
                a.owner_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM vault_members vm
                    WHERE vm.vault_id = a.vault_id
                    AND vm.user_id = auth.uid()
                    AND vm.is_active = true
                ) OR
                EXISTS (
                    SELECT 1 FROM asset_shares ash
                    WHERE ash.asset_id = a.id
                    AND ash.shared_with_user_id = auth.uid()
                    AND ash.is_active = true
                )
            )
        )
    );

-- =====================================================
-- 10. CREATE HELPFUL FUNCTIONS
-- =====================================================

-- Function to add user to vault automatically when vault is created
CREATE OR REPLACE FUNCTION add_creator_to_vault()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO vault_members (vault_id, user_id, role, added_by, added_at, is_active)
    VALUES (NEW.id, NEW.created_by, 'owner', NEW.created_by, NOW(), true);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-add vault creator as owner
CREATE TRIGGER auto_add_vault_creator
    AFTER INSERT ON vaults
    FOR EACH ROW
    EXECUTE FUNCTION add_creator_to_vault();

-- Function to get user's accessible assets (including vault assets)
CREATE OR REPLACE FUNCTION get_user_accessible_assets_with_vaults(p_user_id UUID)
RETURNS TABLE (
    asset_id UUID,
    title TEXT,
    file_name TEXT,
    file_type TEXT,
    file_size BIGINT,
    created_at TIMESTAMPTZ,
    is_owner BOOLEAN,
    access_type TEXT,
    vault_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    -- User's own assets
    SELECT 
        a.id as asset_id,
        a.title,
        a.file_name,
        a.file_type,
        a.file_size,
        a.created_at,
        true as is_owner,
        'owned' as access_type,
        v.name as vault_name
    FROM assets a
    LEFT JOIN vaults v ON a.vault_id = v.id
    WHERE a.owner_id = p_user_id AND a.is_deleted = false
    
    UNION ALL
    
    -- Vault assets (user is member)
    SELECT 
        a.id as asset_id,
        a.title,
        a.file_name,
        a.file_type,
        a.file_size,
        a.created_at,
        false as is_owner,
        'vault_member' as access_type,
        v.name as vault_name
    FROM assets a
    JOIN vaults v ON a.vault_id = v.id
    JOIN vault_members vm ON v.id = vm.vault_id
    WHERE vm.user_id = p_user_id 
      AND vm.is_active = true
      AND a.owner_id != p_user_id
      AND a.is_deleted = false
    
    UNION ALL
    
    -- Directly shared assets
    SELECT 
        a.id as asset_id,
        a.title,
        a.file_name,
        a.file_type,
        a.file_size,
        a.created_at,
        false as is_owner,
        'shared' as access_type,
        v.name as vault_name
    FROM assets a
    LEFT JOIN vaults v ON a.vault_id = v.id
    JOIN asset_shares ash ON a.id = ash.asset_id
    WHERE ash.shared_with_user_id = p_user_id 
      AND ash.is_active = true 
      AND (ash.expires_at IS NULL OR ash.expires_at > NOW())
      AND a.is_deleted = false
    
    ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$ 
BEGIN 
    RAISE NOTICE 'SUCCESS: Assets, vaults, and related tables have been created/enhanced!';
    RAISE NOTICE 'Tables created: vaults, vault_members, asset_shares, asset_annotations';
    RAISE NOTICE 'Assets table enhanced with vault_id, version, public_url, metadata, uploaded_by columns';
    RAISE NOTICE 'Next: Run script 04-synthetic-test-data.sql to create test data';
END $$;