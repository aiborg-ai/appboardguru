#!/usr/bin/env node

/**
 * Manually approve a registration and create user
 */

import { supabaseAdmin } from '../lib/supabase-admin'
import { createUserForApprovedRegistration } from '../lib/supabase-admin'

async function manuallyApprove(email?: string) {
  console.log('🔧 Manual Approval Tool\n')
  
  // Get pending registration
  let query = supabaseAdmin
    .from('registration_requests')
    .select('*')
    .eq('status', 'pending')
  
  if (email) {
    query = query.eq('email', email)
  } else {
    query = query.limit(1)
  }
  
  const { data: registrations, error } = await query
  
  if (error || !registrations || registrations.length === 0) {
    console.error('❌ No pending registrations found')
    return
  }
  
  const reg = registrations[0]
  console.log('📋 Found Registration:')
  console.log('  Email:', reg.email)
  console.log('  Name:', reg.full_name)
  console.log('  Company:', reg.company)
  console.log('  Status:', reg.status)
  console.log('')
  
  // Step 1: Update registration status
  console.log('1️⃣ Updating registration status...')
  const { error: updateError } = await supabaseAdmin
    .from('registration_requests')
    .update({
      status: 'approved',
      reviewed_at: new Date().toISOString(),
      approval_token: null,
      token_expires_at: null
    })
    .eq('id', reg.id)
  
  if (updateError) {
    console.error('❌ Failed to update registration:', updateError)
    return
  }
  console.log('✅ Registration marked as approved')
  
  // Step 2: Create user account
  console.log('\n2️⃣ Creating user account...')
  const { success, error: userError, userRecord } = await createUserForApprovedRegistration(
    reg.email,
    reg.full_name
  )
  
  if (success) {
    console.log('✅ User account created successfully!')
    if (userRecord) {
      console.log('  User ID:', userRecord.id)
      console.log('  Email:', userRecord.email)
      console.log('  Role:', userRecord.role)
    }
  } else {
    console.error('❌ Failed to create user:', userError)
    console.log('\n💡 Alternative: Create user manually in Supabase Dashboard')
    console.log('  1. Go to Authentication → Users')
    console.log('  2. Click "Add User"')
    console.log('  3. Enter email:', reg.email)
    console.log('  4. Set a temporary password')
  }
  
  console.log('\n✅ Manual approval complete!')
  console.log('  The user can now sign in with their email and set up their password.')
}

// Get email from command line if provided
const email = process.argv[2]
if (email && !email.includes('@')) {
  console.error('❌ Invalid email format')
  process.exit(1)
}

manuallyApprove(email).catch(console.error)