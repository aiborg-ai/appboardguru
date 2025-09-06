#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkStorageConfiguration() {
  console.log('🔍 Checking Supabase Storage Configuration\n');
  console.log('URL:', supabaseUrl);
  
  try {
    // 1. List buckets
    console.log('1️⃣ Listing storage buckets...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('❌ Failed to list buckets:', bucketsError);
    } else {
      console.log('✅ Buckets found:', buckets?.length || 0);
      buckets?.forEach(bucket => {
        console.log(`   - ${bucket.name} (${bucket.public ? 'public' : 'private'})`);
      });
    }
    
    // 2. Check if 'assets' bucket exists
    console.log('\n2️⃣ Checking "assets" bucket...');
    const assetsBucket = buckets?.find(b => b.name === 'assets');
    
    if (!assetsBucket) {
      console.log('⚠️ "assets" bucket does not exist!');
      console.log('Creating "assets" bucket...');
      
      const { data: createData, error: createError } = await supabase.storage.createBucket('assets', {
        public: false,
        allowedMimeTypes: undefined,
        fileSizeLimit: 52428800 // 50MB
      });
      
      if (createError) {
        console.error('❌ Failed to create bucket:', createError);
      } else {
        console.log('✅ "assets" bucket created successfully');
      }
    } else {
      console.log('✅ "assets" bucket exists');
      console.log('   Public:', assetsBucket.public);
      console.log('   Created:', assetsBucket.created_at);
    }
    
    // 3. Try to upload a test file
    console.log('\n3️⃣ Testing file upload to "assets" bucket...');
    const testContent = Buffer.from('Test file content');
    const testPath = `test/test-${Date.now()}.txt`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('assets')
      .upload(testPath, testContent, {
        contentType: 'text/plain',
        upsert: false
      });
    
    if (uploadError) {
      console.error('❌ Upload test failed:', uploadError);
    } else {
      console.log('✅ Upload test successful');
      console.log('   Path:', uploadData.path);
      
      // Clean up test file
      const { error: deleteError } = await supabase.storage
        .from('assets')
        .remove([testPath]);
      
      if (!deleteError) {
        console.log('   Test file cleaned up');
      }
    }
    
    // 4. Check storage policies (RLS for storage)
    console.log('\n4️⃣ Checking storage policies...');
    console.log('Note: Storage policies must be configured in Supabase Dashboard');
    console.log('Go to: Storage > Policies > assets bucket');
    console.log('Ensure policies allow authenticated users to:');
    console.log('  - INSERT files');
    console.log('  - SELECT their own files');
    console.log('  - UPDATE their own files');
    console.log('  - DELETE their own files');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkStorageConfiguration().then(() => {
  console.log('\n✨ Storage check complete');
}).catch(err => {
  console.error('❌ Check failed:', err);
  process.exit(1);
});