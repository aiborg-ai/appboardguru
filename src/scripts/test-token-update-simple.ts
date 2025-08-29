#!/usr/bin/env node

/**
 * Test Token Update - Simple version without updated_at
 */

import { supabaseAdmin } from '../lib/supabase-admin'

async function testTokenUpdate() {
  const testId = '99513717-7a72-499a-95e9-93953e1d157a'
  const testToken = 'test_token_' + Date.now()
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  
  console.log('Testing token update for ID:', testId)
  console.log('Token:', testToken)
  console.log('Expires at:', expiresAt)
  
  // Try to update the token WITHOUT updated_at
  const { data, error } = await supabaseAdmin
    .from('registration_requests')
    .update({
      approval_token: testToken,
      token_expires_at: expiresAt
    })
    .eq('id', testId)
    .select()
    .single()
  
  if (error) {
    console.error('❌ Update failed:', error)
    return
  }
  
  console.log('✅ Update successful!')
  console.log('Updated record:', data)
  
  // Generate approval URL
  const approvalUrl = `http://localhost:3000/api/approve-registration?id=${testId}&token=${testToken}`
  console.log('\n📧 Approval URL:')
  console.log(approvalUrl)
}

testTokenUpdate().catch(console.error)