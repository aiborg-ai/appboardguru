/**
 * Test script to verify authentication is working with the fixed client
 */

import { config } from 'dotenv'
import path from 'path'

// Load environment variables
config({ path: path.resolve(process.cwd(), '.env.local') })

// Import our fixed client
import { supabase, createSupabaseBrowserClient } from '../lib/supabase-client'

console.log('🔍 Testing Fixed Authentication')
console.log('================================')
console.log('')

async function testAuthentication() {
  const testEmail = 'test.director@appboardguru.com'
  const testPassword = 'TestDirector123!'
  
  console.log(`📧 Testing with: ${testEmail}`)
  console.log('')
  
  // Test 1: Sign in with singleton client
  console.log('1️⃣ Sign-in Test (singleton client):')
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword
  })
  
  if (authError) {
    console.log(`  ❌ Sign-in failed: ${authError.message}`)
    return
  }
  
  console.log(`  ✅ Sign-in successful!`)
  console.log(`     User ID: ${authData.user?.id}`)
  console.log(`     Email: ${authData.user?.email}`)
  
  // Test 2: Check if session persists with same client
  console.log('\n2️⃣ Session Check (same client):')
  const { data: { session: session1 } } = await supabase.auth.getSession()
  console.log(`  Session exists: ${session1 ? '✅ YES' : '❌ NO'}`)
  if (session1) {
    console.log(`  Access token: ${session1.access_token?.substring(0, 20)}...`)
  }
  
  // Test 3: Create a new client instance and check if it sees the session
  console.log('\n3️⃣ Session Check (new client instance):')
  const newClient = createSupabaseBrowserClient()
  const { data: { session: session2 } } = await newClient.auth.getSession()
  console.log(`  Session exists: ${session2 ? '✅ YES' : '❌ NO'}`)
  if (session2) {
    console.log(`  Access token: ${session2.access_token?.substring(0, 20)}...`)
    console.log(`  ✅ SUCCESS: Session persists across client instances!`)
  } else {
    console.log(`  ❌ FAILURE: Session not visible to new client instance`)
  }
  
  // Test 4: Check what's in cookies
  console.log('\n4️⃣ Cookie Inspection:')
  if (typeof document !== 'undefined') {
    const cookies = document.cookie.split(';').map(c => c.trim())
    const supabaseCookies = cookies.filter(c => c.includes('sb-'))
    console.log(`  Found ${supabaseCookies.length} Supabase cookies`)
    supabaseCookies.forEach(cookie => {
      const [name] = cookie.split('=')
      console.log(`    - ${name}`)
    })
  } else {
    console.log('  (Cookies not available in Node.js environment)')
  }
  
  // Clean up
  console.log('\n5️⃣ Cleanup:')
  await supabase.auth.signOut()
  console.log('  🚪 Signed out')
  
  console.log('\n✅ Test Complete!')
  console.log('If session persisted across client instances, the fix is working.')
}

testAuthentication().catch(console.error)