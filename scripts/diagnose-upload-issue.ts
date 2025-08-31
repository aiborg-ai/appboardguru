#!/usr/bin/env tsx

/**
 * Diagnostic script to identify the exact upload issue
 * Run with: npx tsx scripts/diagnose-upload-issue.ts
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'
import fs from 'fs'

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

console.log('🔍 STORAGE UPLOAD DIAGNOSTIC TOOL\n')
console.log('================================\n')

// Check environment variables
console.log('1. Checking environment variables...')
console.log('   SUPABASE_URL:', SUPABASE_URL ? '✅ Set' : '❌ Missing')
console.log('   SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing')
console.log('   SUPABASE_SERVICE_KEY:', SUPABASE_SERVICE_KEY ? '✅ Set' : '❌ Missing')

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('\n❌ Missing required environment variables!')
  console.error('Please check your .env.local file')
  process.exit(1)
}

// Test with different clients
async function runDiagnostics() {
  console.log('\n2. Testing with ANON key (public client)...')
  const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  
  // Check if bucket exists with anon client
  try {
    const { data: buckets, error } = await anonClient.storage.listBuckets()
    if (error) {
      console.log('   ❌ Cannot list buckets with anon key:', error.message)
    } else {
      console.log('   ✅ Can list buckets with anon key')
      const assetsBucket = buckets?.find(b => b.id === 'assets')
      if (assetsBucket) {
        console.log('   ✅ Assets bucket found:', assetsBucket.name)
      } else {
        console.log('   ❌ Assets bucket NOT found in list')
        console.log('   Available buckets:', buckets?.map(b => b.id).join(', '))
      }
    }
  } catch (err: any) {
    console.log('   ❌ Error checking buckets:', err.message)
  }

  // Test upload with anon client (will fail without auth)
  console.log('\n3. Testing upload with ANON client (should fail)...')
  const testFile = Buffer.from('Test file content')
  const testPath = `test/test-${Date.now()}.txt`
  
  try {
    const { data, error } = await anonClient.storage
      .from('assets')
      .upload(testPath, testFile, {
        contentType: 'text/plain'
      })
    
    if (error) {
      console.log('   ✅ Expected failure (no auth):', error.message)
    } else {
      console.log('   ⚠️  Unexpected success - file uploaded without auth!')
    }
  } catch (err: any) {
    console.log('   Error:', err.message)
  }

  // Test with service role key if available
  if (SUPABASE_SERVICE_KEY) {
    console.log('\n4. Testing with SERVICE ROLE key (should work)...')
    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
    
    try {
      const { data, error } = await serviceClient.storage
        .from('assets')
        .upload(testPath, testFile, {
          contentType: 'text/plain'
        })
      
      if (error) {
        console.log('   ❌ Upload failed even with service key!')
        console.log('   Error:', error.message)
        console.log('   Details:', error)
        
        // Check if it's a bucket issue
        if (error.message.includes('not found')) {
          console.log('\n   🔧 SOLUTION: The bucket does not exist or name is wrong')
          console.log('   Run: database/fix-assets-storage-complete.sql')
        } else if (error.message.includes('policy')) {
          console.log('\n   🔧 SOLUTION: RLS policies are blocking the upload')
          console.log('   Check Supabase Dashboard > Storage > Policies')
        }
      } else {
        console.log('   ✅ Upload successful with service key!')
        console.log('   File path:', data.path)
        
        // Try to delete the test file
        const { error: deleteError } = await serviceClient.storage
          .from('assets')
          .remove([testPath])
        
        if (!deleteError) {
          console.log('   ✅ Test file cleaned up')
        }
      }
    } catch (err: any) {
      console.log('   ❌ Exception during upload:', err.message)
    }
  } else {
    console.log('\n4. Skipping SERVICE ROLE test (key not found in .env.local)')
    console.log('   Add SUPABASE_SERVICE_ROLE_KEY to test with full permissions')
  }

  // Test authentication flow
  console.log('\n5. Testing authentication flow...')
  const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  
  // Try to sign in as test user
  const { data: authData, error: authError } = await authClient.auth.signInWithPassword({
    email: 'test.director@appboardguru.com',
    password: 'TestDirector123!'
  })
  
  if (authError) {
    console.log('   ❌ Cannot authenticate test user:', authError.message)
  } else {
    console.log('   ✅ Test user authenticated successfully')
    console.log('   User ID:', authData.user?.id)
    
    // Test upload with authenticated client
    console.log('\n6. Testing upload with AUTHENTICATED client...')
    const authTestPath = `${authData.user?.id}/test-${Date.now()}.txt`
    
    const { data: uploadData, error: uploadError } = await authClient.storage
      .from('assets')
      .upload(authTestPath, testFile, {
        contentType: 'text/plain'
      })
    
    if (uploadError) {
      console.log('   ❌ Upload failed with authenticated user!')
      console.log('   Error:', uploadError.message)
      console.log('   Full error:', uploadError)
      
      // Detailed error analysis
      if (uploadError.message.includes('row-level security')) {
        console.log('\n   🔧 SOLUTION: RLS policies are blocking authenticated uploads')
        console.log('   1. Go to Supabase Dashboard > Storage > Policies')
        console.log('   2. Ensure there\'s an INSERT policy for authenticated users')
        console.log('   3. Or run: database/fix-assets-storage-complete.sql')
      } else if (uploadError.message.includes('violates')) {
        console.log('\n   🔧 SOLUTION: Storage bucket has restrictions')
        console.log('   Check allowed file types and size limits in Supabase')
      }
    } else {
      console.log('   ✅ Upload successful with authenticated user!')
      console.log('   File path:', uploadData.path)
      
      // Clean up
      await authClient.storage.from('assets').remove([authTestPath])
      console.log('   ✅ Test file cleaned up')
    }
    
    // Sign out
    await authClient.auth.signOut()
  }

  // Final diagnosis
  console.log('\n========== DIAGNOSIS SUMMARY ==========\n')
  
  console.log('Based on the tests above:')
  console.log('1. Check for ❌ marks to identify the issue')
  console.log('2. Follow the 🔧 SOLUTION steps if provided')
  console.log('3. Most common issues:')
  console.log('   - Missing storage bucket (run SQL script)')
  console.log('   - RLS policies blocking uploads (check Dashboard)')
  console.log('   - Missing service role key (check .env.local)')
  console.log('   - Wrong bucket name in code')
  
  console.log('\n📋 Next Steps:')
  console.log('1. Fix any ❌ issues identified above')
  console.log('2. Run: database/fix-assets-storage-complete.sql')
  console.log('3. Check Supabase Dashboard > Storage > assets > Policies')
  console.log('4. Ensure policies allow INSERT for authenticated users')
  console.log('5. Test upload again through the UI')
}

// Run diagnostics
runDiagnostics().catch(console.error)