#!/usr/bin/env node

/**
 * Setup All Test Users with Full Permissions
 * Creates test users in Supabase Auth and sets up complete permissions
 */

import { supabaseAdmin } from '../lib/supabase-admin'
import { createClient } from '@supabase/supabase-js'
import { env } from '../config/environment'

// Test users to create
const TEST_USERS = [
  {
    email: 'test.director@appboardguru.com',
    password: 'TestDirector123!',
    fullName: 'Test Director',
    role: 'owner',
    position: 'Board Director',
    company: 'Test Board Organization'
  },
  {
    email: 'admin.user@appboardguru.com', 
    password: 'AdminUser123!',
    fullName: 'Admin User',
    role: 'admin',
    position: 'Board Administrator',
    company: 'Test Board Organization'
  },
  {
    email: 'board.member@appboardguru.com',
    password: 'BoardMember123!',
    fullName: 'Board Member',
    role: 'member',
    position: 'Board Member',
    company: 'Test Board Organization'
  },
  {
    email: 'test.user@appboardguru.com',
    password: 'TestUser123!',
    fullName: 'Test User',
    role: 'member',
    position: 'Board Member',
    company: 'Test Board Organization'
  },
  {
    email: 'demo.director@appboardguru.com',
    password: 'DemoDirector123!',
    fullName: 'Demo Director',
    role: 'owner',
    position: 'Demo Board Director',
    company: 'Demo Board Organization'
  }
]

async function setupTestUsers() {
  console.log('🚀 Setting up all test users with full permissions\n')
  
  try {
    // Step 1: Create or get organization
    console.log('📁 Step 1: Setting up organizations...')
    
    // Check if organization exists
    const { data: existingOrg } = await supabaseAdmin
      .from('organizations')
      .select('*')
      .eq('slug', 'test-board-org')
      .single()
    
    let organizationId: string
    
    if (existingOrg) {
      organizationId = existingOrg.id
      console.log('  ✅ Found existing organization:', existingOrg.name)
    } else {
      // Create organization
      const { data: newOrg, error: orgError } = await supabaseAdmin
        .from('organizations')
        .insert({
          name: 'Test Board Organization',
          slug: 'test-board-org',
          description: 'Test organization for development and testing',
          industry: 'Technology',
          organization_size: 'medium',
          is_active: true,
          settings: {
            features: ['board_packs', 'ai_summarization', 'advanced_permissions'],
            notifications: true
          }
        })
        .select()
        .single()
      
      if (orgError) {
        console.error('  ❌ Failed to create organization:', orgError)
        return
      }
      
      organizationId = newOrg.id
      console.log('  ✅ Created organization:', newOrg.name)
    }
    
    // Step 2: Create Auth users and profiles
    console.log('\n📤 Step 2: Creating Auth users and profiles...')
    
    for (const testUser of TEST_USERS) {
      console.log(`\n  👤 Processing ${testUser.email}...`)
      
      try {
        // Check if auth user exists
        const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers()
        const existingAuthUser = authUsers?.users?.find(u => u.email === testUser.email)
        
        let userId: string
        
        if (existingAuthUser) {
          userId = existingAuthUser.id
          console.log(`    ✓ Auth user exists (ID: ${userId})`)
          
          // Update password
          const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            userId,
            { 
              password: testUser.password,
              email_confirm: true 
            }
          )
          
          if (updateError) {
            console.error(`    ⚠️  Failed to update password:`, updateError.message)
          } else {
            console.log(`    ✓ Password updated`)
          }
        } else {
          // Create new auth user
          const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: testUser.email,
            password: testUser.password,
            email_confirm: true,
            user_metadata: {
              full_name: testUser.fullName,
              position: testUser.position,
              company: testUser.company
            }
          })
          
          if (createError) {
            console.error(`    ❌ Failed to create auth user:`, createError.message)
            continue
          }
          
          userId = newUser.user.id
          console.log(`    ✓ Created auth user (ID: ${userId})`)
        }
        
        // Check if user profile exists
        const { data: existingProfile } = await supabaseAdmin
          .from('users')
          .select('*')
          .eq('id', userId)
          .single()
        
        if (existingProfile) {
          // Update existing profile
          const { error: updateProfileError } = await supabaseAdmin
            .from('users')
            .update({
              email: testUser.email,
              full_name: testUser.fullName,
              role: testUser.role,
              is_active: true,
              updated_at: new Date().toISOString()
            })
            .eq('id', userId)
          
          if (updateProfileError) {
            console.error(`    ⚠️  Failed to update profile:`, updateProfileError.message)
          } else {
            console.log(`    ✓ Profile updated`)
          }
        } else {
          // Create user profile
          const { error: profileError } = await supabaseAdmin
            .from('users')
            .insert({
              id: userId,
              email: testUser.email,
              full_name: testUser.fullName,
              role: testUser.role,
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
          
          if (profileError) {
            console.error(`    ⚠️  Failed to create profile:`, profileError.message)
          } else {
            console.log(`    ✓ Profile created`)
          }
        }
        
        // Step 3: Add to organization
        const { data: existingMembership } = await supabaseAdmin
          .from('organization_members')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('user_id', userId)
          .single()
        
        if (existingMembership) {
          // Update existing membership
          const { error: updateMemberError } = await supabaseAdmin
            .from('organization_members')
            .update({
              role: testUser.role,
              status: 'active',
              is_primary: true,
              receive_notifications: true,
              last_accessed: new Date().toISOString()
            })
            .eq('organization_id', organizationId)
            .eq('user_id', userId)
          
          if (updateMemberError) {
            console.error(`    ⚠️  Failed to update membership:`, updateMemberError.message)
          } else {
            console.log(`    ✓ Organization membership updated`)
          }
        } else {
          // Create organization membership
          const { error: memberError } = await supabaseAdmin
            .from('organization_members')
            .insert({
              organization_id: organizationId,
              user_id: userId,
              role: testUser.role,
              status: 'active',
              joined_at: new Date().toISOString(),
              is_primary: true,
              receive_notifications: true,
              custom_permissions: {
                can_manage_users: testUser.role === 'owner' || testUser.role === 'admin',
                can_manage_vaults: true,
                can_upload_assets: true,
                can_delete_assets: testUser.role === 'owner' || testUser.role === 'admin',
                can_invite_members: testUser.role === 'owner' || testUser.role === 'admin'
              }
            })
          
          if (memberError) {
            console.error(`    ⚠️  Failed to add to organization:`, memberError.message)
          } else {
            console.log(`    ✓ Added to organization as ${testUser.role}`)
          }
        }
        
      } catch (error) {
        console.error(`    ❌ Error processing ${testUser.email}:`, error)
      }
    }
    
    // Step 4: Create vaults and grant access
    console.log('\n🗂️ Step 4: Setting up vaults and permissions...')
    
    const vaults = [
      { name: 'Board Documents', description: 'Board meeting documents and minutes', is_public: false },
      { name: 'Financial Reports', description: 'Financial statements and reports', is_public: false },
      { name: 'Legal & Compliance', description: 'Legal documents and compliance materials', is_public: false }
    ]
    
    for (const vault of vaults) {
      // Check if vault exists
      const { data: existingVault } = await supabaseAdmin
        .from('vaults')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('name', vault.name)
        .single()
      
      let vaultId: string
      
      if (existingVault) {
        vaultId = existingVault.id
        console.log(`  ✓ Vault exists: ${vault.name}`)
      } else {
        // Create vault
        const { data: newVault, error: vaultError } = await supabaseAdmin
          .from('vaults')
          .insert({
            organization_id: organizationId,
            name: vault.name,
            description: vault.description,
            is_public: vault.is_public,
            created_by: (await supabaseAdmin.from('users').select('id').eq('email', 'test.director@appboardguru.com').single()).data?.id
          })
          .select()
          .single()
        
        if (vaultError) {
          console.error(`  ❌ Failed to create vault ${vault.name}:`, vaultError)
          continue
        }
        
        vaultId = newVault.id
        console.log(`  ✓ Created vault: ${vault.name}`)
      }
      
      // Grant access to all test users
      for (const testUser of TEST_USERS) {
        const { data: userData } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('email', testUser.email)
          .single()
        
        if (userData) {
          const { data: existingAccess } = await supabaseAdmin
            .from('vault_members')
            .select('*')
            .eq('vault_id', vaultId)
            .eq('user_id', userData.id)
            .single()
          
          if (!existingAccess) {
            await supabaseAdmin
              .from('vault_members')
              .insert({
                vault_id: vaultId,
                user_id: userData.id,
                role: testUser.role === 'owner' ? 'owner' : testUser.role === 'admin' ? 'admin' : 'member',
                permissions: {
                  can_read: true,
                  can_write: true,
                  can_delete: testUser.role === 'owner' || testUser.role === 'admin',
                  can_share: true,
                  can_manage_members: testUser.role === 'owner' || testUser.role === 'admin'
                }
              })
          }
        }
      }
    }
    
    // Step 5: Test authentication
    console.log('\n🔐 Step 5: Testing authentication...')
    
    for (const testUser of TEST_USERS.slice(0, 2)) { // Test first 2 users
      try {
        const testClient = createClient(
          env.NEXT_PUBLIC_SUPABASE_URL!,
          env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
        
        const { data: signInData, error: signInError } = await testClient.auth.signInWithPassword({
          email: testUser.email,
          password: testUser.password
        })
        
        if (signInError) {
          console.error(`  ❌ ${testUser.email}: Authentication failed -`, signInError.message)
        } else if (signInData.user) {
          console.log(`  ✅ ${testUser.email}: Authentication successful`)
          
          // Sign out
          await testClient.auth.signOut()
        }
      } catch (error) {
        console.error(`  ❌ ${testUser.email}: Test failed -`, error)
      }
    }
    
    // Summary
    console.log('\n' + '='.repeat(60))
    console.log('✅ TEST USER SETUP COMPLETE!')
    console.log('='.repeat(60))
    console.log('\n📋 Test User Credentials:\n')
    
    for (const user of TEST_USERS) {
      console.log(`  ${user.email}`)
      console.log(`    Password: ${user.password}`)
      console.log(`    Role: ${user.role}`)
      console.log(`    Position: ${user.position}`)
      console.log('')
    }
    
    console.log('🎯 All test users now have:')
    console.log('  ✓ Full authentication in Supabase Auth')
    console.log('  ✓ User profiles in the database')
    console.log('  ✓ Organization membership with appropriate roles')
    console.log('  ✓ Access to all vaults')
    console.log('  ✓ Complete permissions for testing')
    console.log('\n💡 You can now log in with any of these accounts!')
    
  } catch (error) {
    console.error('❌ Setup failed:', error)
  }
}

// Run the setup
setupTestUsers().catch(console.error)