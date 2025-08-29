#!/usr/bin/env node

/**
 * Test Approval Link Directly
 * Tests if the approval endpoint is accessible and working
 */

import { supabaseAdmin } from '../lib/supabase-admin'

async function testApprovalDirectly() {
  console.log('🔍 Testing Approval Link Directly\n')
  
  // Get a pending registration
  const { data: registrations, error } = await supabaseAdmin
    .from('registration_requests')
    .select('*')
    .eq('status', 'pending')
    .not('approval_token', 'is', null)
    .limit(1)
  
  if (error || !registrations || registrations.length === 0) {
    console.error('❌ No pending registrations with tokens found')
    return
  }
  
  const reg = registrations[0]
  console.log('📋 Testing with registration:')
  console.log('  Email:', reg.email)
  console.log('  Name:', reg.full_name)
  console.log('  ID:', reg.id)
  console.log('  Has Token:', !!reg.approval_token)
  console.log('')
  
  const approvalUrl = `http://localhost:3000/api/approve-registration?id=${reg.id}&token=${reg.approval_token}`
  
  console.log('🔗 Approval URL:')
  console.log('  ', approvalUrl)
  console.log('')
  
  console.log('📝 To test this approval:')
  console.log('  1. Copy the URL above')
  console.log('  2. Open it in your browser')
  console.log('  3. Or run: curl -i "' + approvalUrl + '"')
  console.log('')
  
  console.log('⚠️  Note:')
  console.log('  If this URL works but the email link doesn\'t,')
  console.log('  the email was likely sent with a different base URL.')
  console.log('  Check your email client to see the actual URL in the email.')
}

testApprovalDirectly().catch(console.error)