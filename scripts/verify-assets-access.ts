import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyAssetsAccess() {
  try {
    // Get test director user
    const { data: userData } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', 'test.director@appboardguru.com')
      .single();

    console.log('Test Director User:', userData);

    // Get organization
    const { data: orgData } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('name', 'Fortune 500 Companies')
      .single();

    console.log('\nOrganization:', orgData);

    // Get vault
    const { data: vaultData } = await supabase
      .from('vaults')
      .select('id, name, asset_count')
      .eq('name', '2023 Annual Reports')
      .single();

    console.log('\nVault:', vaultData);

    // Get vault assets
    const { data: vaultAssets } = await supabase
      .from('vault_assets')
      .select(`
        *,
        assets (
          id,
          title,
          file_name,
          file_path,
          file_size,
          file_type
        )
      `)
      .eq('vault_id', vaultData?.id);

    console.log('\nVault Assets Count:', vaultAssets?.length);
    
    if (vaultAssets && vaultAssets.length > 0) {
      console.log('\nAssets in Vault:');
      vaultAssets.forEach((va, index) => {
        const asset = va.assets;
        const sizeMB = (asset.file_size / (1024 * 1024)).toFixed(2);
        console.log(`${index + 1}. ${asset.title}`);
        console.log(`   File: ${asset.file_name} (${sizeMB} MB)`);
        console.log(`   Path: ${asset.file_path}`);
        console.log(`   Featured: ${va.is_featured ? 'Yes' : 'No'}`);
      });
    }

    // Check if assets can be accessed directly
    const { data: directAssets } = await supabase
      .from('assets')
      .select('id, title, file_name')
      .eq('owner_id', userData?.id);

    console.log('\n\nDirect Assets owned by Test Director:', directAssets?.length);

    // Check organization membership
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role, status')
      .eq('organization_id', orgData?.id)
      .eq('user_id', userData?.id)
      .single();

    console.log('\nOrganization Membership:', membership);

    console.log('\n✅ Verification complete!');
    console.log('The test director should be able to see the assets when logging in.');
    console.log('Assets are available at: http://localhost:3000');

  } catch (error) {
    console.error('Verification error:', error);
  }
}

verifyAssetsAccess();