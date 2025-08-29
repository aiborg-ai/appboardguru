#!/usr/bin/env node

/**
 * Script to test asset visibility for different users
 * This will check what assets each test user can see
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

async function testAssetVisibility() {
  try {
    console.log('🔍 Testing Asset Visibility for Different Users\n');
    console.log('=' .repeat(60) + '\n');

    // Get the test organization
    const { data: org } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('slug', 'test-board-org')
      .single();

    if (!org) {
      throw new Error('Test organization not found');
    }

    console.log(`📂 Organization: ${org.name}\n`);

    // Get all vaults for the organization
    const { data: vaults } = await supabase
      .from('vaults')
      .select('id, name, description')
      .eq('organization_id', org.id)
      .order('name');

    console.log('📁 Vaults in this organization:');
    if (vaults && vaults.length > 0) {
      vaults.forEach(v => {
        console.log(`   - ${v.name} (${v.id})`);
        if (v.description) console.log(`     ${v.description}`);
      });
    } else {
      console.log('   (no vaults found)');
    }
    console.log('');

    // Check assets in each vault
    for (const vault of vaults || []) {
      console.log(`\n📁 Vault: ${vault.name}`);
      console.log('-'.repeat(40));

      // Method 1: Direct assets query (incorrect way that VaultAssetGrid uses)
      const { data: directAssets } = await supabase
        .from('assets')
        .select('id, title, file_name')
        .eq('vault_id', vault.id);

      console.log(`  Direct query (assets.vault_id): ${directAssets?.length || 0} assets`);
      if (directAssets && directAssets.length > 0) {
        directAssets.forEach(a => console.log(`    - ${a.title}`));
      }

      // Method 2: Through vault_assets table (correct way)
      const { data: vaultAssets } = await supabase
        .from('vault_assets')
        .select(`
          asset_id,
          is_featured,
          is_required_reading,
          assets!inner(
            id,
            title,
            file_name,
            file_type,
            file_size
          )
        `)
        .eq('vault_id', vault.id);

      console.log(`  Vault_assets query (correct): ${vaultAssets?.length || 0} assets`);
      if (vaultAssets && vaultAssets.length > 0) {
        vaultAssets.forEach(va => {
          console.log(`    - ${va.assets.title}`);
          if (va.is_featured) console.log('      ⭐ Featured');
          if (va.is_required_reading) console.log('      📖 Required Reading');
        });
      }
    }

    // Check all assets in the organization
    console.log('\n📊 All Assets in Organization');
    console.log('=' .repeat(40));

    const { data: allAssets } = await supabase
      .from('assets')
      .select(`
        id,
        title,
        file_name,
        file_type,
        owner_id,
        created_at
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    console.log(`Total assets found: ${allAssets?.length || 0}`);
    if (allAssets && allAssets.length > 0) {
      console.log('\nRecent assets:');
      allAssets.forEach(a => {
        console.log(`  - ${a.title} (${a.file_type})`);
        console.log(`    Created: ${new Date(a.created_at).toLocaleDateString()}`);
      });
    }

    // Check specifically for Adidas report
    console.log('\n🔍 Searching for Adidas Annual Report...');
    const { data: adidasAsset } = await supabase
      .from('assets')
      .select('*')
      .eq('title', 'Adidas Annual Report 2024')
      .single();

    if (adidasAsset) {
      console.log('✅ Adidas report found!');
      console.log(`   ID: ${adidasAsset.id}`);
      console.log(`   File: ${adidasAsset.file_name}`);
      console.log(`   Size: ${(adidasAsset.file_size / (1024 * 1024)).toFixed(2)} MB`);
      
      // Check vault association
      const { data: adidasVaultLink } = await supabase
        .from('vault_assets')
        .select(`
          vault_id,
          vaults!inner(name)
        `)
        .eq('asset_id', adidasAsset.id)
        .single();

      if (adidasVaultLink) {
        console.log(`   Vault: ${adidasVaultLink.vaults.name}`);
      } else {
        console.log('   ⚠️  Not linked to any vault!');
      }
    } else {
      console.log('❌ Adidas report not found');
    }

    // Test user access
    console.log('\n👥 Testing User Access');
    console.log('=' .repeat(40));

    const testUsers = [
      'test.director@appboardguru.com',
      'admin.user@appboardguru.com',
      'board.member@appboardguru.com'
    ];

    for (const email of testUsers) {
      const { data: user } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', email)
        .single();

      if (user) {
        console.log(`\n${email}:`);
        
        // Check organization membership
        const { data: membership } = await supabase
          .from('organization_members')
          .select('role, status')
          .eq('user_id', user.id)
          .eq('organization_id', org.id)
          .single();

        if (membership) {
          console.log(`  ✅ Organization member (${membership.role}, ${membership.status})`);
        } else {
          console.log(`  ❌ Not a member of the organization`);
        }
      }
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the test
testAssetVisibility().then(() => {
  console.log('\n✅ Visibility test completed');
  process.exit(0);
}).catch((error) => {
  console.error('\n❌ Test failed:', error);
  process.exit(1);
});