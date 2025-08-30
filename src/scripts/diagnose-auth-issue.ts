/**
 * Diagnostic script to identify authentication issues
 */

import { createClient } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'
import { config } from 'dotenv'
import path from 'path'

// Load environment variables
config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

console.log('🔍 Authentication Diagnostics')
console.log('=============================')
console.log('')

// Test 1: Create different client types
console.log('📋 Client Configuration Tests:')
console.log('-------------------------------')

// Test regular client
const regularClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storageKey: 'boardguru-auth',
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
})

console.log('✅ Regular client created with localStorage persistence')

// Test browser client (SSR)
const browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey, {
  cookies: {
    get(name: string) {
      console.log(`  [Cookie GET] Attempted to read: ${name}`)
      return ''
    },
    set(name: string, value: string) {
      console.log(`  [Cookie SET] ${name} = ${value?.substring(0, 50)}...`)
    },
    remove(name: string) {
      console.log(`  [Cookie REMOVE] ${name}`)
    }
  }
})

console.log('✅ Browser client created with cookie management')
console.log('')

// Test 2: Authentication Flow
console.log('🔐 Testing Authentication Flow:')
console.log('--------------------------------')

async function testAuth() {
  const testEmail = 'test.director@appboardguru.com'
  const testPassword = 'TestDirector123!'
  
  console.log(`📧 Testing with: ${testEmail}`)
  
  // Test with regular client
  console.log('\n1️⃣ Regular Client Test:')
  const { data: authData1, error: authError1 } = await regularClient.auth.signInWithPassword({
    email: testEmail,
    password: testPassword
  })
  
  if (authError1) {
    console.log(`  ❌ Auth failed: ${authError1.message}`)
  } else if (authData1?.user) {
    console.log(`  ✅ Auth successful! User ID: ${authData1.user.id}`)
    
    // Check session
    const { data: { session: session1 } } = await regularClient.auth.getSession()
    console.log(`  📌 Session exists: ${session1 ? 'YES' : 'NO'}`)
    if (session1) {
      console.log(`     - Access token: ${session1.access_token?.substring(0, 20)}...`)
      console.log(`     - Expires at: ${session1.expires_at}`)
    }
    
    // Sign out
    await regularClient.auth.signOut()
    console.log('  🚪 Signed out')
  }
  
  // Test with browser client
  console.log('\n2️⃣ Browser Client Test:')
  const { data: authData2, error: authError2 } = await browserClient.auth.signInWithPassword({
    email: testEmail,
    password: testPassword
  })
  
  if (authError2) {
    console.log(`  ❌ Auth failed: ${authError2.message}`)
  } else if (authData2?.user) {
    console.log(`  ✅ Auth successful! User ID: ${authData2.user.id}`)
    
    // Check session
    const { data: { session: session2 } } = await browserClient.auth.getSession()
    console.log(`  📌 Session exists: ${session2 ? 'YES' : 'NO'}`)
    if (session2) {
      console.log(`     - Access token: ${session2.access_token?.substring(0, 20)}...`)
      console.log(`     - Expires at: ${session2.expires_at}`)
    }
    
    // Sign out
    await browserClient.auth.signOut()
    console.log('  🚪 Signed out')
  }
}

// Test 3: Check localStorage vs Cookies
console.log('\n💾 Storage Mechanism Test:')
console.log('---------------------------')

async function testStorage() {
  // Sign in with regular client
  const { data, error } = await regularClient.auth.signInWithPassword({
    email: 'test.director@appboardguru.com',
    password: 'TestDirector123!'
  })
  
  if (data?.user) {
    console.log('✅ Signed in successfully')
    
    // Check what's in localStorage (simulated)
    console.log('\n📦 Storage Keys:')
    console.log('  - Regular client uses: localStorage with key "boardguru-auth"')
    console.log('  - Browser client uses: cookies with prefix "sb-"')
    
    // Create new instances and check if session persists
    console.log('\n🔄 Session Persistence Test:')
    
    const newRegularClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        storageKey: 'boardguru-auth',
        autoRefreshToken: true
      }
    })
    
    const { data: { session: newSession } } = await newRegularClient.auth.getSession()
    console.log(`  New regular client sees session: ${newSession ? 'YES ✅' : 'NO ❌'}`)
    
    const newBrowserClient = createBrowserClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get() { return '' },
        set() {},
        remove() {}
      }
    })
    
    const { data: { session: newBrowserSession } } = await newBrowserClient.auth.getSession()
    console.log(`  New browser client sees session: ${newBrowserSession ? 'YES ✅' : 'NO ❌'}`)
    
    // Clean up
    await regularClient.auth.signOut()
  }
}

// Run tests
async function runDiagnostics() {
  try {
    await testAuth()
    await testStorage()
    
    console.log('\n📊 Diagnosis Summary:')
    console.log('---------------------')
    console.log('The issue appears to be that:')
    console.log('1. signin page uses: supabase (regular client with localStorage)')
    console.log('2. dashboard uses: createSupabaseBrowserClient (SSR client with cookies)')
    console.log('3. These two clients use DIFFERENT storage mechanisms!')
    console.log('4. Sessions stored in localStorage are NOT visible to cookie-based clients')
    console.log('')
    console.log('🔧 Solution: Both pages must use the SAME client type and storage mechanism')
    
  } catch (error) {
    console.error('❌ Diagnostic error:', error)
  }
}

runDiagnostics().catch(console.error)