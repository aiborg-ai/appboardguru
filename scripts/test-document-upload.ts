import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing environment variables')
  process.exit(1)
}

async function testDocumentUpload() {
  console.log('🧪 Testing Document Upload Flow\n')
  
  // 1. Authenticate as test user
  console.log('1. Authenticating as test user...')
  const supabase = createClient(supabaseUrl, supabaseAnonKey)
  
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'test.director@appboardguru.com',
    password: 'TestDirector123!'
  })
  
  if (authError) {
    console.error('❌ Authentication failed:', authError.message)
    return
  }
  
  console.log('✅ Authenticated as:', authData.user?.email)
  console.log('   User ID:', authData.user?.id)
  
  // 2. Check user's organizations
  console.log('\n2. Checking user organizations...')
  const { data: memberships, error: membershipError } = await supabase
    .from('organization_members')
    .select('organization_id, organizations(id, name, slug)')
    .eq('user_id', authData.user!.id)
    .eq('status', 'active')
  
  if (membershipError) {
    console.error('❌ Could not fetch organizations:', membershipError.message)
  } else if (memberships && memberships.length > 0) {
    console.log('✅ User belongs to', memberships.length, 'organization(s):')
    memberships.forEach((m: any) => {
      console.log(`   - ${m.organizations?.name} (${m.organization_id})`)
    })
  } else {
    console.log('⚠️ User has no organization memberships')
  }
  
  // 3. Test file upload via API
  console.log('\n3. Testing file upload via API...')
  
  // Create a test file
  const testContent = 'This is a test document for upload testing'
  const testFile = new Blob([testContent], { type: 'text/plain' })
  
  const formData = new FormData()
  formData.append('file', testFile, 'test-document.txt')
  formData.append('title', 'Test Document Upload')
  formData.append('description', 'Testing document upload functionality')
  formData.append('category', 'document')
  formData.append('folderPath', '/')
  formData.append('tags', 'test,upload')
  
  // If user has an organization, use it
  if (memberships && memberships.length > 0) {
    formData.append('organizationId', memberships[0].organization_id)
  }
  
  // Get the auth token
  const session = await supabase.auth.getSession()
  const token = session.data.session?.access_token
  
  if (!token) {
    console.error('❌ No auth token available')
    return
  }
  
  console.log('📤 Uploading test file...')
  const response = await fetch(`http://localhost:3004/api/assets/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  })
  
  const responseData = await response.json()
  
  if (!response.ok) {
    console.error('❌ Upload failed with status:', response.status)
    console.error('Error:', responseData.error || responseData.message)
    console.error('Code:', responseData.code)
    if (responseData.validationErrors) {
      console.error('Validation errors:')
      responseData.validationErrors.forEach((err: any) => {
        console.error(`  - ${err.field}: ${err.message}`)
      })
    }
    if (responseData.details) {
      console.error('Details:', JSON.stringify(responseData.details, null, 2))
    }
    if (responseData.solution) {
      console.log('\n💡 Solution:', responseData.solution)
    }
  } else {
    console.log('✅ Upload successful!')
    console.log('Response:', JSON.stringify(responseData, null, 2))
    console.log('Asset ID:', responseData.asset?.id)
    console.log('File name:', responseData.asset?.fileName)
    console.log('File size:', responseData.asset?.fileSize, 'bytes')
  }
  
  // 4. Test direct storage upload
  console.log('\n4. Testing direct storage upload...')
  const { data: storageData, error: storageError } = await supabase.storage
    .from('assets')
    .upload(`test-direct-${Date.now()}.txt`, testContent)
  
  if (storageError) {
    console.error('❌ Direct storage upload failed:', storageError.message)
  } else {
    console.log('✅ Direct storage upload successful!')
    console.log('Path:', storageData.path)
    
    // Clean up
    await supabase.storage.from('assets').remove([storageData.path])
    console.log('🧹 Cleaned up test file')
  }
  
  // Sign out
  await supabase.auth.signOut()
  console.log('\n✅ Test complete!')
}

// Run the test
testDocumentUpload().catch(console.error)