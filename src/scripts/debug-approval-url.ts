#!/usr/bin/env node

/**
 * Debug Approval URL Generation
 */

import { generateApprovalUrls } from '../utils/url'
import { getAppUrl } from '../config/environment'
import { supabaseAdmin } from '../lib/supabase-admin'

async function debugApprovalUrl(testId?: string) {
  testId = testId || 'e1def59d-37a0-4b4c-a613-db94dfa69ff6'
  
  console.log('🔍 URL Configuration Debug:\n')
  console.log('Environment Variables:')
  console.log('  NODE_ENV:', process.env['NODE_ENV'])
  console.log('  APP_URL:', process.env['APP_URL'] || 'not set')
  console.log('  VERCEL_URL:', process.env['VERCEL_URL'] || 'not set')
  console.log('  NEXTAUTH_URL:', process.env['NEXTAUTH_URL'] || 'not set')
  console.log('  NEXT_PUBLIC_APP_URL:', process.env['NEXT_PUBLIC_APP_URL'] || 'not set')
  
  console.log('\nResolved App URL:')
  const appUrl = getAppUrl()
  console.log('  ', appUrl)
  
  // Get the registration data
  const { data: reg, error } = await supabaseAdmin
    .from('registration_requests')
    .select('*')
    .eq('id', testId)
    .single()
  
  if (error || !reg) {
    console.error('Failed to get registration:', error)
    return
  }
  
  console.log('\nRegistration Data:')
  console.log('  ID:', reg.id)
  console.log('  Token:', reg.approval_token)
  console.log('  Status:', reg.status)
  
  // Generate the URLs as the email service would
  const urls = generateApprovalUrls(reg.id, reg.approval_token || 'no-token')
  
  console.log('\nGenerated URLs:')
  console.log('  Approval URL:')
  console.log('  ', urls.approveUrl)
  console.log('\n  Rejection URL:')
  console.log('  ', urls.rejectUrl)
  
  console.log('\n⚠️  IMPORTANT:')
  console.log('  If the URL above doesn\'t match what\'s in your email,')
  console.log('  the email might have been sent with a different APP_URL.')
  console.log('  The approval link will only work with the exact URL that was used')
  console.log('  when the email was sent.')
}

// Run the debug script
const testId = process.argv[2] || 'e1def59d-37a0-4b4c-a613-db94dfa69ff6'
debugApprovalUrl(testId)