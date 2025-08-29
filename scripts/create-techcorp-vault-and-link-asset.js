#!/usr/bin/env node

/**
 * Script to create Financial Reports vault for TechCorp Solutions
 * and link the existing Adidas report to it
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

// Initialize Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

async function createTechCorpVaultAndLinkAsset() {
  try {
    console.log('🏢 Setting up Financial Reports vault for TechCorp Solutions...\n');

    // 1. Find TechCorp Solutions organization
    const { data: techcorp, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, slug')
      .or('slug.eq.techcorp-solutions,name.eq.TechCorp Solutions')
      .single();

    if (orgError || !techcorp) {
      console.error('TechCorp Solutions organization not found:', orgError);
      throw new Error('TechCorp Solutions organization not found');
    }

    console.log(`✅ Found organization: ${techcorp.name} (${techcorp.id})`);

    // 2. Get the owner/admin of TechCorp Solutions
    const { data: orgMember } = await supabase
      .from('organization_members')
      .select('user_id, role')
      .eq('organization_id', techcorp.id)
      .in('role', ['owner', 'admin'])
      .limit(1)
      .single();

    if (!orgMember) {
      throw new Error('No owner/admin found for TechCorp Solutions');
    }

    console.log(`✅ Found organization admin/owner\n`);

    // 3. Check if Financial Reports vault already exists for TechCorp
    const { data: existingVault } = await supabase
      .from('vaults')
      .select('id, name')
      .eq('name', 'Financial Reports')
      .eq('organization_id', techcorp.id)
      .single();

    let vaultId;
    
    if (existingVault) {
      console.log('📁 Financial Reports vault already exists for TechCorp Solutions');
      vaultId = existingVault.id;
    } else {
      // 4. Create Financial Reports vault for TechCorp Solutions
      console.log('Creating Financial Reports vault for TechCorp Solutions...');
      
      const { data: newVault, error: vaultError } = await supabase
        .from('vaults')
        .insert({
          name: 'Financial Reports',
          description: 'Quarterly and annual financial reports including the Adidas Annual Report 2024',
          organization_id: techcorp.id,
          created_by: orgMember.user_id,
          category: 'audit_committee',
          status: 'active',
          priority: 'high',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (vaultError) {
        throw new Error(`Failed to create vault: ${vaultError.message}`);
      }

      console.log('✅ Financial Reports vault created successfully!');
      vaultId = newVault.id;
    }

    // 5. Find the Adidas Annual Report asset
    const { data: adidasAsset, error: assetError } = await supabase
      .from('assets')
      .select('id, title, file_name')
      .eq('title', 'Adidas Annual Report 2024')
      .single();

    if (assetError || !adidasAsset) {
      console.error('Adidas Annual Report not found');
      throw new Error('Adidas Annual Report asset not found');
    }

    console.log(`\n📄 Found Adidas Annual Report (${adidasAsset.id})`);

    // 6. Check if asset is already linked to this vault
    const { data: existingLink } = await supabase
      .from('vault_assets')
      .select('id')
      .eq('vault_id', vaultId)
      .eq('asset_id', adidasAsset.id)
      .single();

    if (existingLink) {
      console.log('✅ Asset is already linked to the vault');
    } else {
      // 7. Link the asset to the TechCorp vault
      console.log('Linking Adidas Annual Report to TechCorp Financial Reports vault...');
      
      const { error: linkError } = await supabase
        .from('vault_assets')
        .insert({
          vault_id: vaultId,
          asset_id: adidasAsset.id,
          organization_id: techcorp.id,
          added_by_user_id: orgMember.user_id,
          is_featured: true,
          is_required_reading: true,
          visibility: 'private',
          download_permissions: 'all_members',
          display_order: 1,
          folder_path: '/annual-reports',
          added_at: new Date().toISOString()
        });

      if (linkError) {
        console.warn('Warning: Could not link asset to vault:', linkError.message);
      } else {
        console.log('✅ Asset successfully linked to TechCorp vault!');
      }
    }

    // 8. Verify the setup
    console.log('\n========================================');
    console.log('✨ SETUP COMPLETE!');
    console.log('========================================');
    console.log(`📁 Vault: Financial Reports`);
    console.log(`🏢 Organization: ${techcorp.name}`);
    console.log(`📄 Asset: Adidas Annual Report 2024`);
    console.log(`\n✅ The Financial Reports vault with the Adidas report should now be visible in TechCorp Solutions!`);
    console.log('\nRefresh your browser to see the new vault.');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

// Run the script
createTechCorpVaultAndLinkAsset().then(() => {
  console.log('\n👍 Script completed successfully');
  process.exit(0);
}).catch((error) => {
  console.error('\n❌ Script failed:', error);
  process.exit(1);
});