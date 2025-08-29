#!/usr/bin/env node

/**
 * Script to upload Adidas Annual Report 2024 as a test asset
 * This will make the PDF available to all test accounts in the system
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  process.exit(1);
}

// Initialize Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

async function uploadAdidasReport() {
  try {
    console.log('Starting Adidas Annual Report upload process...\n');

    // 1. Read the PDF file
    const pdfPath = path.join(__dirname, '..', 'annual-report-adidas-ar24.pdf');
    
    if (!fs.existsSync(pdfPath)) {
      throw new Error(`PDF file not found at: ${pdfPath}`);
    }

    const fileBuffer = fs.readFileSync(pdfPath);
    const fileStats = fs.statSync(pdfPath);
    const fileSizeInBytes = fileStats.size;
    const fileSizeInMB = (fileSizeInBytes / (1024 * 1024)).toFixed(2);

    console.log(`📄 File found: annual-report-adidas-ar24.pdf`);
    console.log(`📏 File size: ${fileSizeInMB} MB (${fileSizeInBytes} bytes)\n`);

    // 2. Get test users and organization
    console.log('Fetching test users and organization...');
    
    const { data: testDirector, error: directorError } = await supabase
      .from('users')
      .select('id, email, full_name')
      .eq('email', 'test.director@appboardguru.com')
      .single();

    if (directorError || !testDirector) {
      throw new Error('Test director user not found. Please run database setup scripts first.');
    }

    const { data: adminUser } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', 'admin.user@appboardguru.com')
      .single();

    const { data: boardMember } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', 'board.member@appboardguru.com')
      .single();

    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, slug')
      .eq('slug', 'test-board-org')
      .single();

    if (orgError || !organization) {
      throw new Error('Test organization not found. Please run database setup scripts first.');
    }

    console.log(`✅ Found test director: ${testDirector.email}`);
    console.log(`✅ Found organization: ${organization.name}\n`);

    // 3. Get the Financial Reports vault
    const { data: vault, error: vaultError } = await supabase
      .from('vaults')
      .select('id, name')
      .eq('name', 'Financial Reports')
      .eq('organization_id', organization.id)
      .single();

    if (vaultError || !vault) {
      throw new Error('Financial Reports vault not found. Please run database setup scripts first.');
    }

    console.log(`📁 Using vault: ${vault.name}\n`);

    // 4. Upload file to Supabase Storage
    console.log('Uploading file to Supabase Storage...');
    
    const timestamp = Date.now();
    const uniqueFileName = `adidas-annual-report-2024-${timestamp}.pdf`;
    const storagePath = `${testDirector.id}/${organization.id}/financial-reports/${uniqueFileName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('assets')
      .upload(storagePath, fileBuffer, {
        contentType: 'application/pdf',
        upsert: false,
        metadata: {
          originalName: 'annual-report-adidas-ar24.pdf',
          uploadedBy: testDirector.id,
          organizationId: organization.id
        }
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      throw new Error(`Failed to upload file to storage: ${uploadError.message}`);
    }

    console.log(`✅ File uploaded to storage: ${storagePath}\n`);

    // 5. Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('assets')
      .getPublicUrl(storagePath);

    // 6. Create asset record in database
    console.log('Creating asset record in database...');

    const assetData = {
      owner_id: testDirector.id,
      title: 'Adidas Annual Report 2024',
      description: 'Official Adidas annual report for 2024. This document contains comprehensive financial information, strategic initiatives, and business performance metrics for testing purposes.',
      file_name: uniqueFileName,
      original_file_name: 'annual-report-adidas-ar24.pdf',
      file_path: storagePath,
      file_size: fileSizeInBytes,
      file_type: 'pdf',
      mime_type: 'application/pdf',
      category: 'financial-reports',
      tags: ['annual-report', 'financial', 'adidas', '2024', 'test-data'],
      folder_path: '/financial-reports',
      processing_status: 'completed',
      visibility: 'private',
      is_processed: true,
      storage_bucket: 'assets',
      view_count: 0,
      download_count: 0,
      is_deleted: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: asset, error: assetError } = await supabase
      .from('assets')
      .insert(assetData)
      .select()
      .single();

    if (assetError) {
      console.error('Asset creation error:', assetError);
      throw new Error(`Failed to create asset record: ${assetError.message}`);
    }

    console.log(`✅ Asset created with ID: ${asset.id}\n`);

    // 7. Link asset to vault via vault_assets table
    console.log('Linking asset to vault...');
    
    const { error: vaultAssetError } = await supabase
      .from('vault_assets')
      .insert({
        vault_id: vault.id,
        asset_id: asset.id,
        organization_id: organization.id,
        added_by_user_id: testDirector.id,
        is_featured: true,
        is_required_reading: true,
        visibility: 'private',
        download_permissions: 'all_members',
        display_order: 1,
        folder_path: '/financial-reports',
        added_at: new Date().toISOString()
      });

    if (vaultAssetError) {
      console.warn('Warning: Could not link asset to vault:', vaultAssetError.message);
    } else {
      console.log(`✅ Asset linked to vault successfully\n`);
    }

    // 8. Create asset shares for other test users
    console.log('Creating asset shares for test users...');

    const shares = [];
    
    if (adminUser) {
      shares.push({
        asset_id: asset.id,
        shared_with_user_id: adminUser.id,
        shared_by_user_id: testDirector.id,
        permission_level: 'download',
        is_active: true,
        share_message: 'Shared for testing purposes - Admin access',
        created_at: new Date().toISOString()
      });
    }

    if (boardMember) {
      shares.push({
        asset_id: asset.id,
        shared_with_user_id: boardMember.id,
        shared_by_user_id: testDirector.id,
        permission_level: 'download',
        is_active: true,
        share_message: 'Shared for testing purposes - Board member access',
        created_at: new Date().toISOString()
      });
    }

    if (shares.length > 0) {
      const { error: shareError } = await supabase
        .from('asset_shares')
        .insert(shares);

      if (shareError) {
        console.warn('Warning: Could not create asset shares:', shareError.message);
      } else {
        console.log(`✅ Created ${shares.length} asset share(s)\n`);
      }
    }

    // 9. Summary
    console.log('========================================');
    console.log('✨ UPLOAD COMPLETE!');
    console.log('========================================');
    console.log(`📄 Asset Title: ${asset.title}`);
    console.log(`🆔 Asset ID: ${asset.id}`);
    console.log(`📁 Vault: ${vault.name}`);
    console.log(`🏢 Organization: ${organization.name}`);
    console.log(`👤 Owner: ${testDirector.email}`);
    console.log(`📏 File Size: ${fileSizeInMB} MB`);
    console.log(`🔗 Storage Path: ${storagePath}`);
    console.log('\nThe asset is now available for all test accounts:');
    console.log('  - test.director@appboardguru.com (owner)');
    if (adminUser) console.log('  - admin.user@appboardguru.com (shared)');
    if (boardMember) console.log('  - board.member@appboardguru.com (shared)');
    console.log('\n✅ You can now test asset viewing/downloading in the application!');

  } catch (error) {
    console.error('\n❌ Error uploading Adidas report:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

// Run the upload
uploadAdidasReport().then(() => {
  console.log('\n👍 Script completed successfully');
  process.exit(0);
}).catch((error) => {
  console.error('\n❌ Script failed:', error);
  process.exit(1);
});