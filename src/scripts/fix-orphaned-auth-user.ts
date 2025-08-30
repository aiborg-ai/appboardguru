/**
 * Fix Orphaned Auth User Script
 * 
 * This script fixes cases where a Supabase Auth user exists but is missing
 * corresponding entries in the registration_requests and users tables.
 * 
 * Usage: npm run ts-node src/scripts/fix-orphaned-auth-user.ts [email]
 */

import { supabaseAdmin } from '@/lib/supabase-admin'
import { config } from 'dotenv'
import path from 'path'

// Load environment variables
config({ path: path.resolve(process.cwd(), '.env.local') })

async function fixOrphanedAuthUser(email?: string) {
  console.log('🔧 Starting orphaned auth user fix script...')
  
  try {
    // If email provided, fix specific user, otherwise find all orphaned users
    if (email) {
      console.log(`\n📧 Fixing specific user: ${email}`)
      await fixSingleUser(email)
    } else {
      console.log('\n🔍 Finding all orphaned auth users...')
      await fixAllOrphanedUsers()
    }
    
    console.log('\n✅ Script completed successfully!')
  } catch (error) {
    console.error('❌ Script failed:', error)
    process.exit(1)
  }
}

async function fixSingleUser(email: string) {
  const normalizedEmail = email.toLowerCase().trim()
  
  console.log(`\n🔍 Checking auth user: ${normalizedEmail}`)
  
  // 1. Check if auth user exists
  const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers()
  
  if (authError) {
    throw new Error(`Failed to list auth users: ${authError.message}`)
  }
  
  const authUser = authUsers.users.find(u => u.email?.toLowerCase() === normalizedEmail)
  
  if (!authUser) {
    console.log(`❌ No auth user found for ${normalizedEmail}`)
    return
  }
  
  console.log(`✅ Auth user found: ${authUser.id}`)
  
  // 2. Check registration_requests table
  const { data: registration, error: regError } = await supabaseAdmin
    .from('registration_requests')
    .select('*')
    .eq('email', normalizedEmail)
    .single()
  
  if (regError && regError.code !== 'PGRST116') { // PGRST116 = no rows found
    throw new Error(`Failed to check registration: ${regError.message}`)
  }
  
  if (!registration) {
    console.log(`⚠️  No registration request found, creating...`)
    
    // Create registration request entry
    const { error: insertRegError } = await supabaseAdmin
      .from('registration_requests')
      .insert({
        email: normalizedEmail,
        full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Unknown',
        company: 'Unknown',
        position: 'Director',
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        reviewed_by: null, // No specific reviewer for system fixes
        created_at: authUser.created_at || new Date().toISOString()
      })
    
    if (insertRegError) {
      console.error(`❌ Failed to create registration: ${insertRegError.message}`)
    } else {
      console.log(`✅ Registration request created with approved status`)
    }
  } else {
    console.log(`✅ Registration request exists: ${registration.status}`)
    
    // If not approved, update to approved
    if (registration.status !== 'approved') {
      const { error: updateError } = await supabaseAdmin
        .from('registration_requests')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: null
        })
        .eq('email', normalizedEmail)
      
      if (updateError) {
        console.error(`❌ Failed to update registration: ${updateError.message}`)
      } else {
        console.log(`✅ Registration updated to approved status`)
      }
    }
  }
  
  // 3. Check users table
  const { data: userData, error: userError } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single()
  
  if (userError && userError.code !== 'PGRST116') {
    throw new Error(`Failed to check users table: ${userError.message}`)
  }
  
  if (!userData) {
    console.log(`⚠️  No users table entry found, creating...`)
    
    // Create users table entry
    const { error: insertUserError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authUser.id,
        email: normalizedEmail,
        full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Unknown',
        password_set: false, // They need to set password
        status: 'approved',
        role: 'director',
        created_at: authUser.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    
    if (insertUserError) {
      console.error(`❌ Failed to create user record: ${insertUserError.message}`)
    } else {
      console.log(`✅ User record created with password_set: false`)
    }
  } else {
    console.log(`✅ User record exists: password_set=${userData.password_set}`)
    
    // If password_set is null, update to false
    if (userData.password_set === null) {
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({ password_set: false })
        .eq('id', authUser.id)
      
      if (updateError) {
        console.error(`❌ Failed to update user record: ${updateError.message}`)
      } else {
        console.log(`✅ User record updated: password_set=false`)
      }
    }
  }
  
  console.log(`\n🎯 User ${normalizedEmail} is now ready to request magic link!`)
}

async function fixAllOrphanedUsers() {
  // Get all auth users
  const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers()
  
  if (authError) {
    throw new Error(`Failed to list auth users: ${authError.message}`)
  }
  
  console.log(`\n📊 Found ${authUsers.users.length} total auth users`)
  
  // Get all users from users table
  const { data: dbUsers, error: dbError } = await supabaseAdmin
    .from('users')
    .select('id, email')
  
  if (dbError) {
    throw new Error(`Failed to get users: ${dbError.message}`)
  }
  
  const dbUserIds = new Set(dbUsers?.map(u => u.id) || [])
  
  // Find orphaned auth users
  const orphanedUsers = authUsers.users.filter(authUser => 
    authUser.id && !dbUserIds.has(authUser.id)
  )
  
  console.log(`\n⚠️  Found ${orphanedUsers.length} orphaned auth users`)
  
  // Fix each orphaned user
  for (const authUser of orphanedUsers) {
    if (authUser.email) {
      console.log(`\n───────────────────────────────`)
      await fixSingleUser(authUser.email)
    }
  }
}

// Run the script
const email = process.argv[2]
fixOrphanedAuthUser(email).catch(console.error)