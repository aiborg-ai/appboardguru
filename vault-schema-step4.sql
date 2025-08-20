-- Step 4: Create Vault Assets Table
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