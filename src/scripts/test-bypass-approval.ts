#!/usr/bin/env node

/**
 * Test Bypass Approval Route
 * Tests the bypass approval endpoint that works even if user creation fails
 */

import { supabaseAdmin } from '../lib/supabase-admin'

async function testBypassApproval() {
  console.log('🚀 Testing Bypass Approval Route\n')
  
  // Get a pending registration
  const { data: registrations, error } = await supabaseAdmin
    .from('registration_requests')
    .select('*')
    .eq('status', 'pending')
    .not('approval_token', 'is', null)
    .limit(1)
  
  if (error || !registrations || registrations.length === 0) {
    console.error('❌ No pending registrations with tokens found')
    console.log('\n💡 To create a test registration:')
    console.log('  1. Submit a registration through your app')
    console.log('  2. Or run: npx tsx src/scripts/create-test-registration.ts')
    return
  }
  
  const reg = registrations[0]
  console.log('📋 Found Registration:')
  console.log('  Email:', reg.email)
  console.log('  Name:', reg.full_name)
  console.log('  Company:', reg.company)
  console.log('  ID:', reg.id)
  console.log('  Token:', reg.approval_token?.substring(0, 8) + '...')
  console.log('')
  
  console.log('🔧 BYPASS APPROVAL URLS:\n')
  console.log('These routes will approve the registration WITHOUT requiring user creation to succeed.\n')
  
  // Generate bypass URLs
  const urls = {
    // Standard bypass - still tries to create user but doesn't fail if it doesn't work
    bypass: `https://app-boardguru.vercel.app/api/approve-bypass?id=${reg.id}&token=${reg.approval_token}`,
    
    // Skip user creation entirely
    bypassNoUser: `https://app-boardguru.vercel.app/api/approve-bypass?id=${reg.id}&token=${reg.approval_token}&createUser=false`,
    
    // Force approval even with wrong token
    bypassForce: `https://app-boardguru.vercel.app/api/approve-bypass?id=${reg.id}&token=${reg.approval_token}&skipToken=true`,
    
    // Diagnostic endpoint
    diagnose: `https://app-boardguru.vercel.app/api/diagnose-approval?id=${reg.id}&token=${reg.approval_token}&email=${reg.email}`,
    
    // Local bypass
    local: `http://localhost:3000/api/approve-bypass?id=${reg.id}&token=${reg.approval_token}`
  }
  
  console.log('1️⃣ Standard Bypass (tries user creation, but doesn\'t fail):')
  console.log('  ', urls.bypass)
  console.log('')
  
  console.log('2️⃣ Bypass WITHOUT User Creation:')
  console.log('  ', urls.bypassNoUser)
  console.log('')
  
  console.log('3️⃣ Force Approval (ignores token validation):')
  console.log('  ', urls.bypassForce)
  console.log('')
  
  console.log('4️⃣ Diagnostic Endpoint (shows what\'s wrong):')
  console.log('  ', urls.diagnose)
  console.log('')
  
  console.log('5️⃣ Local Development:')
  console.log('  ', urls.local)
  console.log('')
  
  console.log('📝 How to Use:')
  console.log('  1. Click URL #1 to approve WITH optional user creation')
  console.log('  2. Click URL #2 to approve WITHOUT user creation')
  console.log('  3. Use URL #3 if token validation is failing')
  console.log('  4. Use URL #4 to diagnose what\'s wrong')
  console.log('  5. Use URL #5 if testing locally')
  console.log('')
  
  console.log('⚠️  Important:')
  console.log('  - These bypass routes will mark the registration as APPROVED')
  console.log('  - User account creation is OPTIONAL with these routes')
  console.log('  - You can manually create the user later if needed')
  console.log('  - Run "npx tsx src/scripts/manually-approve.ts" to create users')
  console.log('')
  
  console.log('🧪 Test with curl:')
  console.log(`  curl -i "${urls.diagnose}" | jq .`)
}

testBypassApproval().catch(console.error)