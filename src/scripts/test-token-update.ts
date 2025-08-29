#!/usr/bin/env node

/**
 * Test Token Update
 * Test if we can update the approval token directly
 */

import { supabaseAdmin } from '../lib/supabase-admin'

async function testTokenUpdate() {
  const testId = '99513717-7a72-499a-95e9-93953e1d157a'
  const testToken = 'test_token_' + Date.now()
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  
  console.log('Testing token update for ID:', testId)
  console.log('Token:', testToken)
  console.log('Expires at:', expiresAt)
  
  // Try to update the token
  const { data, error } = await supabaseAdmin
    .from('registration_requests')
    .update({
      approval_token: testToken,
      token_expires_at: expiresAt,
      updated_at: new Date().toISOString()
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
  
  // Verify by reading it back
  const { data: verified, error: verifyError } = await supabaseAdmin
    .from('registration_requests')
    .select('id, approval_token, token_expires_at')
    .eq('id', testId)
    .single()
  
  if (verifyError) {
    console.error('❌ Verification failed:', verifyError)
    return
  }
  
  console.log('✅ Verification successful!')
  console.log('Token saved:', verified?.approval_token)
  console.log('Expires at:', verified?.token_expires_at)
}

testTokenUpdate().catch(console.error)