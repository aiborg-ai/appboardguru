/**
 * Diagnostic script to troubleshoot magic link issues
 */

import { supabaseAdmin } from '@/lib/supabase-admin'
import { generatePasswordSetupMagicLink } from '@/lib/supabase-admin'
import { config } from 'dotenv'
import path from 'path'
import { getAppUrl } from '@/config/environment'

// Load environment variables
config({ path: path.resolve(process.cwd(), '.env.local') })

async function diagnoseMagicLink(email: string) {
  const normalizedEmail = email.toLowerCase().trim()
  
  console.log('🔍 Magic Link Diagnostic Tool')
  console.log('================================')
  console.log(`📧 Checking: ${normalizedEmail}`)
  console.log('')
  
  try {
    // 1. Check Auth User
    console.log('1️⃣ Checking Auth User...')
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (authError) {
      console.error('❌ Failed to list auth users:', authError)
      return
    }
    
    const authUser = authUsers.users.find(u => u.email?.toLowerCase() === normalizedEmail)
    
    if (!authUser) {
      console.log('❌ No auth user found')
      console.log('   → User needs to be created first')
      return
    }
    
    console.log('✅ Auth user exists:')
    console.log(`   ID: ${authUser.id}`)
    console.log(`   Email: ${authUser.email}`)
    console.log(`   Created: ${authUser.created_at}`)
    console.log(`   Confirmed: ${authUser.email_confirmed_at ? 'Yes' : 'No'}`)
    console.log('')
    
    // 2. Check Registration Request
    console.log('2️⃣ Checking Registration Request...')
    const { data: registration, error: regError } = await supabaseAdmin
      .from('registration_requests')
      .select('*')
      .eq('email', normalizedEmail)
      .single()
    
    if (regError) {
      if (regError.code === 'PGRST116') {
        console.log('❌ No registration request found')
      } else {
        console.error('❌ Error checking registration:', regError)
      }
    } else {
      console.log('✅ Registration request exists:')
      console.log(`   Status: ${registration.status}`)
      console.log(`   Full Name: ${registration.full_name}`)
      console.log(`   Reviewed: ${registration.reviewed_at || 'Not reviewed'}`)
    }
    console.log('')
    
    // 3. Check Users Table
    console.log('3️⃣ Checking Users Table...')
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single()
    
    if (userError) {
      if (userError.code === 'PGRST116') {
        console.log('❌ No users table entry found')
      } else {
        console.error('❌ Error checking users table:', userError)
      }
    } else {
      console.log('✅ Users table entry exists:')
      console.log(`   Email: ${userData.email}`)
      console.log(`   Password Set: ${userData.password_set}`)
      console.log(`   Status: ${userData.status}`)
      console.log(`   Role: ${userData.role}`)
    }
    console.log('')
    
    // 4. Test Magic Link Generation
    console.log('4️⃣ Testing Magic Link Generation...')
    console.log(`   App URL: ${getAppUrl()}`)
    
    const { magicLink, success, error } = await generatePasswordSetupMagicLink(normalizedEmail)
    
    if (!success || !magicLink) {
      console.error('❌ Failed to generate magic link:', error)
      return
    }
    
    console.log('✅ Magic link generated successfully!')
    console.log('')
    
    // 5. Parse and Analyze the Link
    console.log('5️⃣ Analyzing Magic Link Structure...')
    try {
      const url = new URL(magicLink)
      console.log(`   Host: ${url.host}`)
      console.log(`   Path: ${url.pathname}`)
      console.log(`   Type: ${url.searchParams.get('type')}`)
      console.log(`   Redirect To: ${url.searchParams.get('redirect_to')}`)
      
      const token = url.searchParams.get('token')
      if (token) {
        console.log(`   Token: ${token.substring(0, 20)}...`)
        console.log(`   Token Length: ${token.length} characters`)
      }
      
      // Check if redirect URL matches expected
      const expectedRedirect = `${getAppUrl()}/auth/set-password`
      const actualRedirect = url.searchParams.get('redirect_to')
      
      if (actualRedirect !== expectedRedirect) {
        console.log(`\n⚠️  Redirect URL mismatch!`)
        console.log(`   Expected: ${expectedRedirect}`)
        console.log(`   Actual: ${actualRedirect}`)
      }
    } catch (urlError) {
      console.error('❌ Invalid URL format:', urlError)
    }
    console.log('')
    
    // 6. Verify Token (without consuming it)
    console.log('6️⃣ Checking Magic Link Token...')
    const url = new URL(magicLink)
    const token = url.searchParams.get('token')
    const type = url.searchParams.get('type')
    
    if (!token) {
      console.error('❌ No token found in magic link')
      return
    }
    
    // Note: We can't fully verify the token without consuming it,
    // but we can check its format
    console.log(`   Token format: Valid (${token.length} chars)`)
    console.log(`   Link type: ${type}`)
    console.log('')
    
    // 7. Summary
    console.log('📊 SUMMARY')
    console.log('==========')
    console.log('✅ Auth user exists')
    console.log(registration ? '✅ Registration exists' : '❌ Registration missing')
    console.log(userData ? '✅ User record exists' : '❌ User record missing')
    console.log('✅ Magic link generated')
    console.log('')
    console.log('🔗 FULL MAGIC LINK:')
    console.log(magicLink)
    console.log('')
    console.log('📝 NEXT STEPS:')
    console.log('1. Click the link above in a browser')
    console.log('2. It should redirect to: ' + getAppUrl() + '/auth/set-password')
    console.log('3. The set-password page should load with a valid session')
    console.log('')
    console.log('If the link doesn\'t work:')
    console.log('- Check if the Supabase project URL is correct')
    console.log('- Verify the redirect URL is allowed in Supabase settings')
    console.log('- Check browser console for errors')
    console.log('- Ensure cookies are enabled')
    
  } catch (error) {
    console.error('❌ Diagnostic failed:', error)
  }
}

// Run the diagnostic
const email = process.argv[2] || 'hirendra.vikram@aiborg.ai'
diagnoseMagicLink(email).catch(console.error)