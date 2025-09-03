#!/usr/bin/env node

/**
 * Setup script to create the assets storage bucket via Supabase Management API
 * This script uses the service role key to create the bucket programmatically
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', SERVICE_ROLE_KEY ? '✓' : '✗');
  console.error('\nPlease ensure these are set in your .env.local file');
  process.exit(1);
}

async function setupStorageBucket() {
  console.log('🚀 Starting storage bucket setup...\n');

  // Create Supabase client with service role key
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    // Step 1: Check if bucket already exists
    console.log('1️⃣ Checking for existing buckets...');
    const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('❌ Error listing buckets:', listError.message);
      console.error('\nThis might mean:');
      console.error('- Your service role key is invalid');
      console.error('- Storage is not enabled in your Supabase project');
      return;
    }

    const assetsBucket = existingBuckets?.find(b => b.id === 'assets' || b.name === 'assets');
    
    if (assetsBucket) {
      console.log('✅ Assets bucket already exists!');
      console.log('   ID:', assetsBucket.id);
      console.log('   Name:', assetsBucket.name);
      console.log('   Public:', assetsBucket.public);
      console.log('   Created:', assetsBucket.created_at);
    } else {
      // Step 2: Create the bucket
      console.log('2️⃣ Creating assets bucket...');
      
      const { data: newBucket, error: createError } = await supabase.storage.createBucket('assets', {
        public: false,
        fileSizeLimit: 52428800, // 50MB
        allowedMimeTypes: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'text/plain',
          'text/csv',
          'text/markdown',
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          'image/svg+xml',
          'video/mp4',
          'video/quicktime',
          'audio/mpeg',
          'audio/wav',
          'application/zip'
        ]
      });

      if (createError) {
        console.error('❌ Error creating bucket:', createError.message);
        
        if (createError.message.includes('already exists')) {
          console.log('\n💡 The bucket might exist but with different settings.');
          console.log('   Please check your Supabase Dashboard > Storage');
        } else if (createError.message.includes('permission')) {
          console.log('\n💡 Permission issue. Please ensure:');
          console.log('   1. You are using the service role key (not anon key)');
          console.log('   2. Storage is enabled in your Supabase project');
        }
        return;
      }

      console.log('✅ Assets bucket created successfully!');
      console.log('   Name:', newBucket.name);
    }

    // Step 3: Test the bucket
    console.log('\n3️⃣ Testing bucket access...');
    
    // Try to list files (should be empty or have some files)
    const testPath = 'test/';
    const { data: files, error: testError } = await supabase.storage
      .from('assets')
      .list(testPath, { limit: 1 });

    if (testError && !testError.message.includes('not found')) {
      console.error('⚠️  Warning: Could not list files:', testError.message);
      console.log('   This might be normal if RLS policies are strict.');
    } else {
      console.log('✅ Bucket is accessible!');
    }

    // Step 4: Provide next steps
    console.log('\n' + '='.repeat(60));
    console.log('✨ Setup complete!');
    console.log('='.repeat(60));
    console.log('\n📝 Next steps:');
    console.log('1. Go to Supabase Dashboard > Storage > assets bucket');
    console.log('2. Click on "Policies" tab');
    console.log('3. Add RLS policies for authenticated users:');
    console.log('   - Allow authenticated SELECT (view)');
    console.log('   - Allow authenticated INSERT (upload)');
    console.log('   - Allow authenticated UPDATE own files');
    console.log('   - Allow authenticated DELETE own files');
    console.log('\n4. Test file upload in your application');
    console.log('5. Check /api/assets/diagnose endpoint for verification');

    console.log('\n💡 Tip: If uploads fail, check:');
    console.log('   - User is authenticated');
    console.log('   - User belongs to an organization');
    console.log('   - RLS policies are configured');
    console.log('   - File size is under 50MB');

  } catch (error) {
    console.error('\n❌ Unexpected error:', error.message);
    console.error('\nPlease check:');
    console.error('1. Your Supabase URL is correct');
    console.error('2. Your service role key is valid');
    console.error('3. Your Supabase project is active');
  }
}

// Run the setup
setupStorageBucket()
  .then(() => {
    console.log('\n✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });