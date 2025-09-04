import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing environment variables')
  process.exit(1)
}

// Create client with service role (bypasses RLS)
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
})

async function testDirectUpload() {
  console.log('🧪 Testing Direct Supabase Upload\n')
  console.log('URL:', supabaseUrl)
  console.log('Using service role key\n')
  
  try {
    // Step 1: Check if assets bucket exists
    console.log('1. Checking storage buckets...')
    const { data: buckets, error: bucketListError } = await supabase.storage.listBuckets()
    
    if (bucketListError) {
      console.error('❌ Cannot list buckets:', bucketListError)
      return
    }
    
    const assetsBucket = buckets?.find(b => b.id === 'assets')
    if (!assetsBucket) {
      console.error('❌ Assets bucket does not exist!')
      console.log('\n📝 Creating assets bucket...')
      
      // Try to create the bucket via direct SQL
      const { error: createError } = await supabase.rpc('create_storage_bucket', {
        bucket_name: 'assets',
        is_public: false
      }).single()
      
      if (createError) {
        console.log('Cannot create bucket via RPC, it might not exist.')
        console.log('Please run this SQL in Supabase Dashboard:')
        console.log('INSERT INTO storage.buckets (id, name, public) VALUES (\'assets\', \'assets\', false);')
      }
    } else {
      console.log('✅ Assets bucket exists')
    }
    
    // Step 2: Test storage upload
    console.log('\n2. Testing storage upload...')
    const testContent = 'This is a test file content'
    const testFileName = `test-${Date.now()}.txt`
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('assets')
      .upload(testFileName, testContent, {
        contentType: 'text/plain',
        upsert: false
      })
    
    if (uploadError) {
      console.error('❌ Storage upload failed:', uploadError.message)
      console.log('\nPossible solutions:')
      console.log('1. Check storage policies in Supabase Dashboard')
      console.log('2. Make sure the bucket exists')
      console.log('3. Check if service role key has proper permissions')
      return
    }
    
    console.log('✅ Storage upload successful!')
    console.log('   Path:', uploadData.path)
    
    // Step 3: Test database insert
    console.log('\n3. Testing database insert...')
    
    // First, check if the assets table exists
    const { data: tableCheck, error: tableError } = await supabase
      .from('assets')
      .select('id')
      .limit(1)
    
    if (tableError && tableError.message.includes('relation')) {
      console.error('❌ Assets table does not exist!')
      console.log('Please create the assets table in your database')
      return
    }
    
    // Try to insert a record
    const { data: assetData, error: insertError } = await supabase
      .from('assets')
      .insert({
        title: 'Test Document',
        file_name: testFileName,
        file_path: uploadData.path,
        file_size: testContent.length,
        file_type: 'txt',
        mime_type: 'text/plain',
        category: 'document',
        owner_id: 'b2fc2f59-447c-495c-af05-31a30d6e364a', // Test user
        status: 'ready',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (insertError) {
      console.error('❌ Database insert failed:', insertError.message)
      console.log('Error code:', insertError.code)
      console.log('Error hint:', insertError.hint)
      
      if (insertError.code === '42501') {
        console.log('\n⚠️ RLS policy issue detected!')
        console.log('Run this SQL to fix:')
        console.log(`
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

-- Create a simple policy for testing
CREATE POLICY "service_role_all" ON assets
FOR ALL
USING (true)
WITH CHECK (true);
        `)
      }
      
      // Clean up storage file
      await supabase.storage.from('assets').remove([uploadData.path])
      return
    }
    
    console.log('✅ Database insert successful!')
    console.log('   Asset ID:', assetData?.id)
    
    // Step 4: Clean up
    console.log('\n4. Cleaning up test data...')
    
    if (assetData?.id) {
      await supabase.from('assets').delete().eq('id', assetData.id)
    }
    await supabase.storage.from('assets').remove([uploadData.path])
    
    console.log('✅ Cleanup complete')
    
    // Summary
    console.log('\n' + '='.repeat(50))
    console.log('✨ ALL TESTS PASSED!')
    console.log('='.repeat(50))
    console.log('Your Supabase setup is working correctly:')
    console.log('  ✅ Storage bucket exists')
    console.log('  ✅ Can upload to storage')
    console.log('  ✅ Assets table exists')
    console.log('  ✅ Can insert into database')
    console.log('\nThe issue might be in the application code or authentication.')
    
  } catch (error) {
    console.error('\n❌ Unexpected error:', error)
  }
}

// Run the test
testDirectUpload()