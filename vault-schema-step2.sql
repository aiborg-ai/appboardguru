-- Step 2: Create Vaults Table
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