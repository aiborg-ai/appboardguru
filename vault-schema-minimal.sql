-- Minimal Vault Schema for Supabase Dashboard
-- Copy and paste this into Supabase SQL Editor

-- Create vault status enum
CREATE TYPE vault_status AS ENUM ('draft', 'active', 'archived', 'expired', 'cancelled');

-- Create vault priority enum  
CREATE TYPE vault_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- Create vault category enum
CREATE TYPE vault_category AS ENUM ('board_meeting', 'committee_meeting', 'strategic_planning', 'audit_committee', 'other');

-- Create vaults table
CREATE TABLE vaults (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    meeting_date TIMESTAMPTZ,
    location VARCHAR(255),
    status vault_status DEFAULT 'draft',
    priority vault_priority DEFAULT 'medium',
    category vault_category DEFAULT 'other',
    member_count INTEGER DEFAULT 0,
    asset_count INTEGER DEFAULT 0,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create vault members table
CREATE TABLE vault_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vault_id UUID NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'viewer',
    status VARCHAR(50) DEFAULT 'active',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(vault_id, user_id)
);

-- Create vault assets table  
CREATE TABLE vault_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vault_id UUID NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    added_by_user_id UUID NOT NULL REFERENCES auth.users(id),
    folder_path VARCHAR(255) DEFAULT '/',
    display_order INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT false,
    is_required_reading BOOLEAN DEFAULT false,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    view_count INTEGER DEFAULT 0,
    download_count INTEGER DEFAULT 0,
    visibility VARCHAR(50) DEFAULT 'inherit',
    download_permissions VARCHAR(50) DEFAULT 'inherit',
    UNIQUE(vault_id, asset_id)
);

-- Create basic indexes
CREATE INDEX idx_vaults_organization_id ON vaults(organization_id);
CREATE INDEX idx_vaults_status ON vaults(status);
CREATE INDEX idx_vault_members_vault_id ON vault_members(vault_id);
CREATE INDEX idx_vault_members_user_id ON vault_members(user_id);
CREATE INDEX idx_vault_assets_vault_id ON vault_assets(vault_id);
CREATE INDEX idx_vault_assets_asset_id ON vault_assets(asset_id);

-- Enable Row Level Security
ALTER TABLE vaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_members ENABLE ROW LEVEL SECURITY;  
ALTER TABLE vault_assets ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies
CREATE POLICY "Users can view vaults they are members of" ON vaults
    FOR SELECT USING (
        auth.uid() IN (
            SELECT user_id FROM vault_members 
            WHERE vault_id = vaults.id AND status = 'active'
        )
    );

CREATE POLICY "Users can view their vault memberships" ON vault_members
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view vault assets they have access to" ON vault_assets
    FOR SELECT USING (
        auth.uid() IN (
            SELECT user_id FROM vault_members 
            WHERE vault_id = vault_assets.vault_id AND status = 'active'
        )
    );