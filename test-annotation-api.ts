/**
 * Test script to verify annotation API is working
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

// Load environment variables
config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testAnnotationAPI() {
  console.log('🔄 Testing Annotation API...\n')

  try {
    // Step 1: Sign in to get a session
    console.log('1️⃣ Signing in...')
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'test.director@appboardguru.com',
      password: 'TestDirector123!'
    })

    if (authError) {
      console.error('❌ Failed to sign in:', authError.message)
      return
    }

    console.log('✅ Signed in successfully')
    console.log('   User ID:', authData.user?.id)
    console.log('   Access Token:', authData.session?.access_token?.substring(0, 20) + '...')

    // Step 2: Get an asset to annotate
    console.log('\n2️⃣ Finding an asset...')
    const { data: assets, error: assetError } = await supabase
      .from('assets')
      .select('id, file_name')
      .limit(1)

    if (assetError || !assets || assets.length === 0) {
      console.error('❌ No assets found:', assetError?.message)
      return
    }

    const assetId = assets[0].id
    console.log('✅ Found asset:', assetId, '-', assets[0].file_name)

    // Step 3: Test GET annotations endpoint
    console.log('\n3️⃣ Testing GET /api/assets/[id]/annotations...')
    const getResponse = await fetch(`http://localhost:3000/api/assets/${assetId}/annotations`, {
      headers: {
        'Authorization': `Bearer ${authData.session?.access_token}`,
        'Content-Type': 'application/json'
      }
    })

    console.log('   Response status:', getResponse.status, getResponse.statusText)
    
    if (getResponse.ok) {
      const getResult = await getResponse.json()
      console.log('✅ GET successful:', getResult.data?.annotations?.length || 0, 'annotations')
    } else {
      const errorText = await getResponse.text()
      console.error('❌ GET failed:', errorText)
    }

    // Step 4: Test POST annotation endpoint
    console.log('\n4️⃣ Testing POST /api/assets/[id]/annotations...')
    
    const testAnnotation = {
      annotationType: 'highlight',
      content: {
        text: 'Test annotation from API test script'
      },
      pageNumber: 1,
      position: {
        pageNumber: 1,
        rects: [{
          x1: 100,
          y1: 100,
          x2: 200,
          y2: 130,
          width: 100,
          height: 30
        }],
        boundingRect: {
          x1: 100,
          y1: 100,
          x2: 200,
          y2: 130,
          width: 100,
          height: 30
        }
      },
      selectedText: 'Test selected text',
      commentText: 'This is a test comment',
      color: '#FFFF00',
      opacity: 0.3,
      isPrivate: false
    }

    console.log('   Sending annotation data...')
    const postResponse = await fetch(`http://localhost:3000/api/assets/${assetId}/annotations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authData.session?.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testAnnotation)
    })

    console.log('   Response status:', postResponse.status, postResponse.statusText)
    
    if (postResponse.ok) {
      const postResult = await postResponse.json()
      console.log('✅ POST successful:', postResult.success)
      console.log('   Annotation ID:', postResult.data?.annotation?.id)
    } else {
      const errorText = await postResponse.text()
      console.error('❌ POST failed:', errorText)
    }

    // Step 5: Verify in database
    console.log('\n5️⃣ Verifying in database...')
    const { data: dbAnnotations, error: dbError } = await supabase
      .from('asset_annotations')
      .select('id, comment_text, created_by')
      .eq('asset_id', assetId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(5)

    if (dbError) {
      console.error('❌ Database query failed:', dbError.message)
    } else {
      console.log('✅ Found', dbAnnotations?.length || 0, 'annotations in database')
      if (dbAnnotations && dbAnnotations.length > 0) {
        console.log('   Latest:', dbAnnotations[0].comment_text)
      }
    }

    console.log('\n✨ Test completed!')

  } catch (error) {
    console.error('❌ Test failed with error:', error)
  } finally {
    // Sign out
    await supabase.auth.signOut()
    process.exit(0)
  }
}

// Run the test
testAnnotationAPI()