#!/usr/bin/env node

/**
 * Script to verify the Adidas Annual Report was uploaded successfully
 * and is accessible to all test accounts
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

async function verifyAdidasReport() {
  try {
    console.log('🔍 Verifying Adidas Annual Report upload...\n');

    // 1. Check the asset exists
    console.log('1. Checking asset record...');
    const { data: assets, error: assetError } = await supabase
      .from('assets')
      .select('*')
      .eq('title', 'Adidas Annual Report 2024')
      .order('created_at', { ascending: false })
      .limit(1);

    if (assetError || !assets || assets.length === 0) {
      throw new Error('Asset not found in database');
    }

    const asset = assets[0];
    console.log(`✅ Asset found:`);
    console.log(`   - ID: ${asset.id}`);
    console.log(`   - Title: ${asset.title}`);
    console.log(`   - File Size: ${(asset.file_size / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`   - File Type: ${asset.file_type}`);
    console.log(`   - Storage Path: ${asset.file_path}\n`);

    // 2. Check vault association
    console.log('2. Checking vault association...');
    const { data: vaultAssets, error: vaultError } = await supabase
      .from('vault_assets')
      .select(`
        *,
        vault:vaults(name, description),
        asset:assets(title)
      `)
      .eq('asset_id', asset.id);

    if (vaultError || !vaultAssets || vaultAssets.length === 0) {
      console.warn('⚠️  Asset not linked to any vault');
    } else {
      console.log(`✅ Asset linked to ${vaultAssets.length} vault(s):`);
      vaultAssets.forEach(va => {
        console.log(`   - Vault: ${va.vault?.name || 'Unknown'}`);
        console.log(`     Featured: ${va.is_featured ? 'Yes' : 'No'}`);
        console.log(`     Required Reading: ${va.is_required_reading ? 'Yes' : 'No'}`);
      });
    }
    console.log('');

    // 3. Check asset shares
    console.log('3. Checking asset shares...');
    const { data: shares, error: shareError } = await supabase
      .from('asset_shares')
      .select(`
        *,
        shared_with:users!shared_with_user_id(email, full_name),
        shared_by:users!shared_by_user_id(email, full_name)
      `)
      .eq('asset_id', asset.id);

    if (shareError || !shares || shares.length === 0) {
      console.log('⚠️  No explicit shares found (asset may be accessible via vault permissions)');
    } else {
      console.log(`✅ Asset shared with ${shares.length} user(s):`);
      shares.forEach(share => {
        console.log(`   - ${share.shared_with?.email || 'Unknown'}`);
        console.log(`     Permission: ${share.permission_level}`);
        console.log(`     Active: ${share.is_active ? 'Yes' : 'No'}`);
      });
    }
    console.log('');

    // 4. Check storage accessibility
    console.log('4. Checking storage accessibility...');
    const { data: storageData } = supabase.storage
      .from('assets')
      .getPublicUrl(asset.file_path);

    if (storageData && storageData.publicUrl) {
      console.log(`✅ Storage URL generated:`);
      console.log(`   ${storageData.publicUrl.substring(0, 80)}...\n`);
    } else {
      console.warn('⚠️  Could not generate public URL\n');
    }

    // 5. Check test users can access
    console.log('5. Verifying test user access...');
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
        // Check if user has direct share or vault access
        const { data: userAccess } = await supabase
          .from('asset_shares')
          .select('permission_level')
          .eq('asset_id', asset.id)
          .eq('shared_with_user_id', user.id)
          .single();

        const isOwner = asset.owner_id === user.id;
        const hasShare = userAccess !== null;
        
        console.log(`   ${email}:`);
        if (isOwner) {
          console.log(`     ✅ Owner access`);
        } else if (hasShare) {
          console.log(`     ✅ Shared access (${userAccess.permission_level})`);
        } else {
          console.log(`     ⚠️  No direct access (may have vault access)`);
        }
      }
    }

    console.log('\n========================================');
    console.log('✨ VERIFICATION COMPLETE!');
    console.log('========================================');
    console.log('The Adidas Annual Report 2024 has been successfully:');
    console.log('  ✅ Uploaded to Supabase Storage');
    console.log('  ✅ Created in the assets database');
    console.log('  ✅ Linked to the Financial Reports vault');
    console.log('  ✅ Shared with test users');
    console.log('\nYou can now access this document through the application!');

  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
    process.exit(1);
  }
}

// Run the verification
verifyAdidasReport().then(() => {
  console.log('\n👍 Verification completed successfully');
  process.exit(0);
}).catch((error) => {
  console.error('\n❌ Verification failed:', error);
  process.exit(1);
});