#!/usr/bin/env node

/**
 * Diagnostic Script: Test Registration Query
 * Agent: TEST-14 (Test Commander)
 * Purpose: Verify database connectivity and registration query functionality
 * 
 * Usage: npx tsx src/scripts/test-registration-query.ts [registration-id]
 */

import { supabaseAdmin } from '../lib/supabase-admin'
import { env } from '../config/environment'

async function testRegistrationQuery(testId?: string) {
  console.log('🔍 Starting Registration Query Diagnostic...\n')
  
  // 1. Check environment variables
  console.log('1️⃣ Environment Check:')
  console.log('   NEXT_PUBLIC_SUPABASE_URL:', env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing')
  console.log('   SUPABASE_SERVICE_ROLE_KEY:', env.SUPABASE_SERVICE_ROLE_KEY ? `✅ Set (${env.SUPABASE_SERVICE_ROLE_KEY.length} chars)` : '❌ Missing')
  console.log('')
  
  // 2. Test basic connectivity
  console.log('2️⃣ Testing Database Connectivity...')
  try {
    const { count, error: countError } = await supabaseAdmin
      .from('registration_requests')
      .select('*', { count: 'exact', head: true })
    
    if (countError) {
      console.error('   ❌ Failed to connect:', countError.message)
      return
    }
    
    console.log(`   ✅ Connected! Found ${count} registration requests in database`)
  } catch (error) {
    console.error('   ❌ Connection error:', error)
    return
  }
  console.log('')
  
  // 3. Get latest registrations
  console.log('3️⃣ Fetching Latest Registration Requests...')
  try {
    const { data: registrations, error } = await supabaseAdmin
      .from('registration_requests')
      .select('id, email, full_name, status, approval_token, created_at')
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (error) {
      console.error('   ❌ Query failed:', error.message)
      return
    }
    
    if (!registrations || registrations.length === 0) {
      console.log('   ⚠️ No registration requests found in database')
      return
    }
    
    console.log('   Latest registrations:')
    registrations.forEach((reg, i) => {
      console.log(`   ${i + 1}. ${reg.email} (${reg.full_name})`)
      console.log(`      ID: ${reg.id}`)
      console.log(`      Status: ${reg.status}`)
      console.log(`      Has Token: ${!!reg.approval_token}`)
      console.log(`      Created: ${reg.created_at}`)
      console.log('')
    })
  } catch (error) {
    console.error('   ❌ Unexpected error:', error)
    return
  }
  
  // 4. Test specific ID if provided
  if (testId) {
    console.log(`4️⃣ Testing Specific Registration ID: ${testId}`)
    try {
      const { data, error } = await supabaseAdmin
        .from('registration_requests')
        .select('*')
        .eq('id', testId)
        .single()
      
      if (error) {
        console.error('   ❌ Query failed:', error.message)
        console.error('   Error code:', error.code)
        console.error('   Full error:', JSON.stringify(error, null, 2))
        return
      }
      
      if (!data) {
        console.log('   ❌ No registration found with this ID')
        return
      }
      
      console.log('   ✅ Registration found!')
      console.log('   Details:', JSON.stringify(data, null, 2))
      
      // Test approval URL generation
      if (data.approval_token) {
        const approvalUrl = `http://localhost:3000/api/approve-registration?id=${data.id}&token=${data.approval_token}`
        console.log('\n   📧 Approval URL would be:')
        console.log(`   ${approvalUrl}`)
      }
    } catch (error) {
      console.error('   ❌ Unexpected error:', error)
    }
  }
  
  console.log('\n✅ Diagnostic Complete!')
}

// Run the test
const testId = process.argv[2]
if (testId && !testId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
  console.error('❌ Invalid ID format. Please provide a valid UUID.')
  process.exit(1)
}

testRegistrationQuery(testId).catch(console.error)