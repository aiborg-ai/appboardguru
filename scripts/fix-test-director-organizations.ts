#!/usr/bin/env tsx

/**
 * Script to fix test director's organization access
 * This ensures test.director@appboardguru.com has at least one organization
 * Run with: npx tsx scripts/fix-test-director-organizations.ts
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables!')
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function fixTestDirectorOrganizations() {
  console.log('🔧 FIXING TEST DIRECTOR ORGANIZATION ACCESS\n')
  console.log('========================================\n')
  
  try {
    // Step 1: Get test director user from auth.users
    console.log('📍 Step 1: Finding test director user...')
    const { data: authData } = await supabase.auth.admin.listUsers()
    const testDirector = authData?.users?.find(u => u.email === 'test.director@appboardguru.com')
    
    if (!testDirector) {
      console.error('❌ Test director user not found in auth.users!')
      console.error('   Please ensure test.director@appboardguru.com account exists')
      return
    }
    
    console.log('✅ Found test director:')
    console.log(`   ID: ${testDirector.id}`)
    console.log(`   Email: ${testDirector.email}`)
    console.log(`   Created: ${new Date(testDirector.created_at).toLocaleDateString()}\n`)
    
    const userId = testDirector.id
    
    // Step 2: Check existing organizations
    console.log('📍 Step 2: Checking existing organizations...')
    const { data: allOrgs, error: orgsError } = await supabase
      .from('organizations')
      .select('*')
      .eq('is_active', true)
    
    if (orgsError) {
      console.error('❌ Error fetching organizations:', orgsError)
      return
    }
    
    console.log(`   Found ${allOrgs?.length || 0} active organization(s) in system\n`)
    
    // Step 3: Check test director's memberships
    console.log('📍 Step 3: Checking test director memberships...')
    const { data: memberships, error: memError } = await supabase
      .from('organization_members')
      .select('*, organizations(*)')
      .eq('user_id', userId)
    
    if (memError) {
      console.error('❌ Error fetching memberships:', memError)
      return
    }
    
    console.log(`   Test director has ${memberships?.length || 0} membership(s)\n`)
    
    // Step 4: Fix organizations
    console.log('📍 Step 4: Fixing organization access...\n')
    
    if (!allOrgs || allOrgs.length === 0) {
      // No organizations exist - create default ones
      console.log('   Creating default organizations...')
      
      const orgsToCreate = [
        {
          name: 'Fortune 500 Companies',
          slug: 'fortune-500-companies',
          description: 'Leading Fortune 500 companies board management',
          industry: 'Enterprise',
          organization_size: 'enterprise'
        },
        {
          name: 'Tech Startups Inc',
          slug: 'tech-startups-inc',
          description: 'Innovative technology startups board',
          industry: 'Technology',
          organization_size: 'startup'
        },
        {
          name: 'Global Ventures Board',
          slug: 'global-ventures-board',
          description: 'International venture capital board',
          industry: 'Finance',
          organization_size: 'large'
        }
      ]
      
      for (const orgData of orgsToCreate) {
        const { data: newOrg, error: createError } = await supabase
          .from('organizations')
          .insert({
            ...orgData,
            created_by: userId,
            is_active: true,
            settings: {},
            compliance_settings: {},
            billing_settings: {}
          })
          .select()
          .single()
        
        if (createError) {
          console.error(`   ❌ Failed to create ${orgData.name}:`, createError.message)
          continue
        }
        
        console.log(`   ✅ Created organization: ${newOrg.name}`)
        
        // Create membership
        const { error: memberError } = await supabase
          .from('organization_members')
          .insert({
            organization_id: newOrg.id,
            user_id: userId,
            role: 'owner',
            status: 'active',
            joined_at: new Date().toISOString(),
            is_primary: orgData.slug === 'fortune-500-companies'
          })
        
        if (memberError) {
          console.error(`   ❌ Failed to create membership:`, memberError.message)
        } else {
          console.log(`   ✅ Added test director as owner`)
        }
      }
    } else {
      // Organizations exist - ensure test director is a member
      console.log('   Ensuring test director has access to existing organizations...')
      
      for (const org of allOrgs) {
        // Check if membership exists
        const existingMembership = memberships?.find(m => 
          (m.organizations as any)?.id === org.id
        )
        
        if (existingMembership) {
          console.log(`   ✅ Already member of: ${org.name} (${existingMembership.role})`)
        } else {
          // Create membership
          const { error: memberError } = await supabase
            .from('organization_members')
            .insert({
              organization_id: org.id,
              user_id: userId,
              role: 'owner',
              status: 'active',
              joined_at: new Date().toISOString(),
              is_primary: org.slug === 'fortune-500-companies'
            })
          
          if (memberError) {
            console.error(`   ❌ Failed to add to ${org.name}:`, memberError.message)
          } else {
            console.log(`   ✅ Added to: ${org.name} as owner`)
          }
        }
      }
    }
    
    // Step 5: Verify the fix
    console.log('\n📍 Step 5: Verifying the fix...')
    const { data: finalMemberships, error: finalError } = await supabase
      .from('organization_members')
      .select('*, organizations(name, slug, is_active)')
      .eq('user_id', userId)
      .eq('status', 'active')
    
    if (finalError) {
      console.error('❌ Error verifying fix:', finalError)
      return
    }
    
    console.log('\n========================================')
    console.log('✅ FIX COMPLETE!')
    console.log('========================================\n')
    
    console.log(`Test director now has access to ${finalMemberships?.length || 0} organization(s):\n`)
    
    for (const mem of finalMemberships || []) {
      const org = mem.organizations as any
      console.log(`  📁 ${org.name}`)
      console.log(`     Slug: ${org.slug}`)
      console.log(`     Role: ${mem.role}`)
      console.log(`     Status: ${mem.status}`)
      console.log(`     Primary: ${mem.is_primary ? 'Yes' : 'No'}`)
      console.log('')
    }
    
    console.log('🎉 Test director should now see organizations in the application!')
    console.log('\nNext steps:')
    console.log('1. Log out and log back in as test.director@appboardguru.com')
    console.log('2. Check the sidebar - organizations should now be visible')
    console.log('3. Try uploading an asset to test full functionality')
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

// Run the fix
fixTestDirectorOrganizations().catch(console.error)