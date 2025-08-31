#!/usr/bin/env tsx

/**
 * Script to check all organizations and test director's memberships
 * Run with: npx tsx scripts/check-organizations.ts
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables!')
  console.error('Please check your .env.local file')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function checkOrganizations() {
  console.log('🔍 CHECKING ORGANIZATIONS AND TEST DIRECTOR MEMBERSHIPS\n')
  console.log('========================================')
  
  // Get test director user
  const { data: testDirector, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('email', 'test.director@appboardguru.com')
    .single()
  
  if (userError || !testDirector) {
    // Try auth.users table
    const { data: authData } = await supabase.auth.admin.listUsers()
    const authUser = authData?.users?.find(u => u.email === 'test.director@appboardguru.com')
    
    if (!authUser) {
      console.error('❌ Test director user not found!')
      return
    }
    
    console.log('✅ Found test director in auth.users:')
    console.log(`   ID: ${authUser.id}`)
    console.log(`   Email: ${authUser.email}`)
    console.log(`   Created: ${new Date(authUser.created_at).toLocaleDateString()}`)
    console.log('')
    
    // Use auth user ID for queries
    const userId = authUser.id
    
    // Get all organizations
    console.log('📁 ALL ORGANIZATIONS IN THE SYSTEM:')
    console.log('========================================')
    
    const { data: orgs, error: orgsError } = await supabase
      .from('organizations')
      .select(`
        *,
        organization_members!inner(
          user_id,
          role,
          status
        )
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
    
    if (orgsError) {
      console.error('Error fetching organizations:', orgsError)
      return
    }
    
    if (!orgs || orgs.length === 0) {
      console.log('⚠️  No organizations found in the system!')
      console.log('\nCreating a default organization for test director...')
      
      // Create a default organization
      const { data: newOrg, error: createError } = await supabase
        .from('organizations')
        .insert({
          name: 'Test Director Default Org',
          slug: `test-director-org-${Date.now()}`,
          description: 'Auto-created organization for test director',
          created_by: userId,
          status: 'active',
          industry: 'Technology',
          organization_size: 'medium'
        })
        .select()
        .single()
      
      if (createError) {
        console.error('Failed to create organization:', createError)
      } else {
        console.log(`✅ Created organization: ${newOrg.name} (${newOrg.id})`)
        
        // Create membership
        await supabase
          .from('organization_members')
          .insert({
            organization_id: newOrg.id,
            user_id: userId,
            role: 'owner',
            status: 'active',
            joined_at: new Date().toISOString()
          })
        
        console.log('✅ Added test director as owner')
      }
    } else {
      console.log(`Found ${orgs.length} organization(s):\n`)
      
      for (const org of orgs) {
        const memberCount = org.organization_members?.length || 0
        const isTestDirectorMember = org.organization_members?.some(
          (m: any) => m.user_id === userId
        )
        const testDirectorRole = org.organization_members?.find(
          (m: any) => m.user_id === userId
        )?.role
        
        console.log(`📁 ${org.name}`)
        console.log(`   ID: ${org.id}`)
        console.log(`   Slug: ${org.slug}`)
        console.log(`   Status: ${org.status}`)
        console.log(`   Industry: ${org.industry || 'Not specified'}`)
        console.log(`   Size: ${org.organization_size || 'Not specified'}`)
        console.log(`   Members: ${memberCount}`)
        console.log(`   Created: ${new Date(org.created_at).toLocaleDateString()}`)
        
        if (isTestDirectorMember) {
          console.log(`   ✅ Test Director Role: ${testDirectorRole}`)
        } else {
          console.log(`   ❌ Test Director: NOT A MEMBER`)
        }
        console.log('')
      }
    }
    
    // Get test director's memberships
    console.log('👤 TEST DIRECTOR MEMBERSHIPS:')
    console.log('========================================')
    
    const { data: memberships, error: memError } = await supabase
      .from('organization_members')
      .select(`
        *,
        organizations(
          id,
          name,
          slug,
          status
        )
      `)
      .eq('user_id', userId)
      .order('joined_at', { ascending: false })
    
    if (memError) {
      console.error('Error fetching memberships:', memError)
      return
    }
    
    if (!memberships || memberships.length === 0) {
      console.log('⚠️  Test director has no organization memberships!')
      console.log('\nTo fix this, run the SQL script:')
      console.log('  database/associate-test-director-all-orgs.sql')
    } else {
      console.log(`Test director is a member of ${memberships.length} organization(s):\n`)
      
      for (const mem of memberships) {
        const org = mem.organizations as any
        if (org) {
          console.log(`✅ ${org.name}`)
          console.log(`   Role: ${mem.role}`)
          console.log(`   Status: ${mem.status}`)
          console.log(`   Joined: ${new Date(mem.joined_at).toLocaleDateString()}`)
          console.log('')
        }
      }
    }
    
    // Summary
    console.log('========================================')
    console.log('SUMMARY:')
    console.log('========================================')
    
    const ownerCount = memberships?.filter(m => m.role === 'owner').length || 0
    const adminCount = memberships?.filter(m => m.role === 'admin').length || 0
    const memberCount = memberships?.filter(m => m.role === 'member').length || 0
    const activeCount = memberships?.filter(m => m.status === 'active').length || 0
    
    console.log(`📊 Total organizations in system: ${orgs?.length || 0}`)
    console.log(`👤 Test director memberships: ${memberships?.length || 0}`)
    console.log(`   - Owner role: ${ownerCount}`)
    console.log(`   - Admin role: ${adminCount}`)
    console.log(`   - Member role: ${memberCount}`)
    console.log(`   - Active status: ${activeCount}`)
    
    if (memberships && memberships.length < (orgs?.length || 0)) {
      console.log(`\n⚠️  Test director is not a member of all organizations!`)
      console.log(`Missing from ${(orgs?.length || 0) - memberships.length} organization(s)`)
      console.log('\nTo associate test director with ALL organizations, run:')
      console.log('  database/associate-test-director-all-orgs.sql')
    }
  }
}

// Run the check
checkOrganizations().catch(console.error)