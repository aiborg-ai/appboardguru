-- Step 6: Enable RLS and Create Policies
ALTER TABLE vaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_members ENABLE ROW LEVEL SECURITY;  
ALTER TABLE vault_assets ENABLE ROW LEVEL SECURITY;

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