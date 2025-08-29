#!/usr/bin/env node

/**
 * Check users table structure
 */

import { supabaseAdmin } from '../lib/supabase-admin'

async function checkUsersTable() {
  console.log('🔍 Checking users table structure...\n')
  
  // Try to get a sample user to see what columns exist
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .limit(1)
  
  if (error) {
    console.error('❌ Error querying users table:', error)
    return
  }
  
  if (data && data.length > 0) {
    console.log('📋 Users table columns:')
    const columns = Object.keys(data[0])
    columns.forEach(col => {
      console.log(`  - ${col}: ${typeof data[0][col]} (sample: ${JSON.stringify(data[0][col])?.substring(0, 50)})`)
    })
  } else {
    console.log('⚠️  No users found in table')
  }
  
  // Try to check if certain columns exist
  console.log('\n🧪 Testing specific columns:')
  
  const testColumns = ['id', 'email', 'full_name', 'role', 'status', 'password_set', 'is_active']
  
  for (const col of testColumns) {
    try {
      const { error } = await supabaseAdmin
        .from('users')
        .select(col)
        .limit(1)
      
      if (error) {
        console.log(`  ❌ ${col}: NOT FOUND`)
      } else {
        console.log(`  ✅ ${col}: EXISTS`)
      }
    } catch (e) {
      console.log(`  ❌ ${col}: ERROR`)
    }
  }
}

checkUsersTable().catch(console.error)