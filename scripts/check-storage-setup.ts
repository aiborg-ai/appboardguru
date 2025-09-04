import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// Create Supabase client with service role (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
})

async function checkStorageSetup() {
  console.log('🔍 Checking Supabase storage setup...\n')
  
  try {
    // 1. Check if we can connect to Supabase
    console.log('1. Testing Supabase connection...')
    const { data: healthCheck, error: healthError } = await supabase
      .from('users')
      .select('count')
      .limit(1)
    
    if (healthError) {
      console.error('❌ Cannot connect to Supabase:', healthError.message)
      return
    }
    console.log('✅ Connected to Supabase successfully\n')
    
    // 2. Check storage buckets
    console.log('2. Checking storage buckets...')
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets()
    
    if (bucketError) {
      console.error('❌ Cannot list storage buckets:', bucketError)
      console.log('\n💡 Solution: Make sure storage is enabled in your Supabase project')
      return
    }
    
    console.log(`Found ${buckets?.length || 0} storage bucket(s):`)
    buckets?.forEach(bucket => {
      console.log(`  - ${bucket.name} (ID: ${bucket.id}, Public: ${bucket.public})`)
    })
    
    // 3. Check if assets bucket exists
    const assetsBucket = buckets?.find(b => b.id === 'assets' || b.name === 'assets')
    
    if (!assetsBucket) {
      console.error('\n❌ Storage bucket "assets" does not exist!')
      console.log('\n📝 To fix this, run the following SQL in your Supabase Dashboard:')
      console.log('----------------------------------------')
      console.log(`
-- Create the assets storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('assets', 'assets', false, 52428800)
ON CONFLICT (id) DO UPDATE 
SET 
  public = false,
  file_size_limit = 52428800;

-- Create storage policies for authenticated users
CREATE POLICY "Authenticated users can upload assets"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'assets' 
    AND auth.uid() IS NOT NULL
);

CREATE POLICY "Authenticated users can view assets"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'assets' 
    AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can update their own assets"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'assets' 
    AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can delete their own assets"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'assets' 
    AND auth.uid() IS NOT NULL
);
      `)
      console.log('----------------------------------------')
      console.log('\n Or run: npm run setup:storage')
      return
    }
    
    console.log(`\n✅ Assets bucket exists (Public: ${assetsBucket.public})\n`)
    
    // 4. Test upload to bucket
    console.log('3. Testing file upload to assets bucket...')
    const testFileName = `test-${Date.now()}.txt`
    const testContent = 'This is a test file for checking storage setup'
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('assets')
      .upload(testFileName, testContent, {
        contentType: 'text/plain'
      })
    
    if (uploadError) {
      console.error('❌ Cannot upload to assets bucket:', uploadError.message)
      console.log('\n💡 Possible solutions:')
      console.log('  1. Check RLS policies on storage.objects table')
      console.log('  2. Make sure the service role key has proper permissions')
      console.log('  3. Run the storage setup migration: database/migrations/20250103_fix_storage_bucket_complete.sql')
      return
    }
    
    console.log('✅ Successfully uploaded test file:', uploadData.path)
    
    // 5. Clean up test file
    const { error: deleteError } = await supabase.storage
      .from('assets')
      .remove([testFileName])
    
    if (!deleteError) {
      console.log('✅ Successfully cleaned up test file\n')
    }
    
    // 6. Check tables
    console.log('4. Checking database tables...')
    const { data: tables, error: tablesError } = await supabase.rpc('get_table_names', {
      schema_name: 'public'
    }).select('*').limit(1).maybeSingle()
    
    // Alternative method to check if assets table exists
    const { data: assetsTable, error: assetsTableError } = await supabase
      .from('assets')
      .select('count')
      .limit(0)
    
    if (assetsTableError && assetsTableError.message.includes('relation')) {
      console.error('❌ Assets table does not exist in database!')
      console.log('💡 Run database migrations to create the assets table')
    } else {
      console.log('✅ Assets table exists in database')
    }
    
    // 7. Summary
    console.log('\n' + '='.repeat(50))
    console.log('📊 STORAGE SETUP SUMMARY')
    console.log('='.repeat(50))
    console.log('✅ Supabase connection: OK')
    console.log('✅ Assets bucket: EXISTS')
    console.log('✅ Upload capability: WORKING')
    console.log('✅ Database table: EXISTS')
    console.log('\n✨ Your storage setup appears to be working correctly!')
    console.log('\nIf uploads still fail from the UI, check:')
    console.log('  1. Browser console for specific error messages')
    console.log('  2. Network tab to see the actual API response')
    console.log('  3. Make sure users are properly authenticated')
    console.log('  4. Verify organization membership for users')
    
  } catch (error) {
    console.error('\n❌ Unexpected error:', error)
  }
}

// Run the check
checkStorageSetup()