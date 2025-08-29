#!/usr/bin/env node

/**
 * Check what role values are valid in the users table
 */

import { supabaseAdmin } from '../lib/supabase-admin'

async function checkRoleEnum() {
  console.log('🔍 Checking valid role values...\n')
  
  // Get distinct role values from existing users
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('role')
    .not('role', 'is', null)
  
  if (error) {
    console.error('❌ Error querying roles:', error)
  } else if (data) {
    const uniqueRoles = [...new Set(data.map(u => u.role))]
    console.log('📋 Existing role values in database:')
    uniqueRoles.forEach(role => {
      console.log(`  - ${role}`)
    })
  }
  
  // Try to insert with different role values
  console.log('\n🧪 Testing role values:')
  const testRoles = ['user', 'admin', 'super_admin', 'director', 'member', 'owner']
  
  for (const role of testRoles) {
    try {
      // Try to update a test record with this role
      const { error } = await supabaseAdmin
        .from('users')
        .update({ role })
        .eq('email', 'test.director@boardguru.ai')
        .select()
        .single()
      
      if (error) {
        if (error.message.includes('invalid input value for enum')) {
          console.log(`  ❌ '${role}': INVALID (not in enum)`)
        } else {
          console.log(`  ⚠️  '${role}': Error - ${error.message}`)
        }
      } else {
        console.log(`  ✅ '${role}': VALID`)
      }
    } catch (e) {
      console.log(`  ❌ '${role}': ERROR`)
    }
  }
  
  // Reset the test user role
  await supabaseAdmin
    .from('users')
    .update({ role: 'admin' })
    .eq('email', 'test.director@boardguru.ai')
}

checkRoleEnum().catch(console.error)