-- Step 5: Create Indexes
CREATE INDEX idx_vaults_organization_id ON vaults(organization_id);
CREATE INDEX idx_vaults_status ON vaults(status);
CREATE INDEX idx_vault_members_vault_id ON vault_members(vault_id);
CREATE INDEX idx_vault_members_user_id ON vault_members(user_id);
CREATE INDEX idx_vault_assets_vault_id ON vault_assets(vault_id);
CREATE INDEX idx_vault_assets_asset_id ON vault_assets(asset_id);