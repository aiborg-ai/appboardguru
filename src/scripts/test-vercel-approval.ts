#!/usr/bin/env node

/**
 * Test Vercel Approval
 * Tests the approval workflow on your Vercel deployment
 */

import { supabaseAdmin } from '../lib/supabase-admin'

async function testVercelApproval() {
  console.log('🚀 Testing Vercel Approval Workflow\n')
  
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
  
  // Generate URLs for different environments
  const urls = {
    vercelMain: `https://app-boardguru.vercel.app/api/approve-registration?id=${reg.id}&token=${reg.approval_token}`,
    vercelDebug: `https://app-boardguru.vercel.app/api/approve-registration-debug?id=${reg.id}&token=${reg.approval_token}`,
    vercelForce: `https://app-boardguru.vercel.app/api/approve-registration-debug?id=${reg.id}&token=${reg.approval_token}&force=true`,
    local: `http://localhost:3000/api/approve-registration?id=${reg.id}&token=${reg.approval_token}`
  }
  
  console.log('🔗 Test URLs:\n')
  console.log('1️⃣ Main Vercel Approval URL:')
  console.log('  ', urls.vercelMain)
  console.log('')
  
  console.log('2️⃣ Debug Endpoint (shows detailed info):')
  console.log('  ', urls.vercelDebug)
  console.log('')
  
  console.log('3️⃣ Force Approval (bypasses token check):')
  console.log('  ', urls.vercelForce)
  console.log('')
  
  console.log('4️⃣ Local Development:')
  console.log('  ', urls.local)
  console.log('')
  
  console.log('📝 Testing Instructions:')
  console.log('  1. Click URL #1 to test normal approval flow')
  console.log('  2. If it fails, click URL #2 to see debug info')
  console.log('  3. If token is invalid, use URL #3 to force approve')
  console.log('  4. Use URL #4 if testing locally')
  console.log('')
  
  console.log('🧪 Quick Test with curl:')
  console.log(`  curl -i "${urls.vercelDebug}"`)
  console.log('')
  
  console.log('⚠️  Important Notes:')
  console.log('  - Your Vercel deployment must use the same Supabase database')
  console.log('  - Check Vercel logs if approval fails')
  console.log('  - The debug endpoint will show exactly what\'s wrong')
}

testVercelApproval().catch(console.error)