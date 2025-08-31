#!/usr/bin/env tsx

/**
 * Diagnostic script to check test director organization visibility issue
 * Run with: npx tsx scripts/diagnose-org-issue.ts
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'
import fetch from 'node-fetch'

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing required environment variables!')
  process.exit(1)
}

// Create service client (admin access)
const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Create anon client (simulates frontend)
const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function diagnoseOrganizationIssue() {
  console.log('🔍 DIAGNOSING TEST DIRECTOR ORGANIZATION VISIBILITY\n')
  console.log('========================================\n')
  
  try {
    // Step 1: Get test director from auth.users
    console.log('📍 Step 1: Checking auth.users table...')
    const { data: authData } = await serviceClient.auth.admin.listUsers()
    const testDirector = authData?.users?.find(u => u.email === 'test.director@appboardguru.com')
    
    if (!testDirector) {
      console.error('❌ Test director not found in auth.users!')
      return
    }
    
    console.log('✅ Found in auth.users:')
    console.log(`   ID: ${testDirector.id}`)
    console.log(`   Email: ${testDirector.email}`)
    console.log(`   Confirmed: ${testDirector.email_confirmed_at ? 'Yes' : 'No'}`)
    console.log(`   Role: ${testDirector.role || 'authenticated'}\n`)
    
    const userId = testDirector.id
    
    // Step 2: Check if user exists in public.users table
    console.log('📍 Step 2: Checking public.users table...')
    const { data: publicUser, error: userError } = await serviceClient
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (userError || !publicUser) {
      console.log('⚠️  User not found in public.users table')
      console.log('   This might cause issues with some queries\n')
    } else {
      console.log('✅ Found in public.users:')
      console.log(`   ID: ${publicUser.id}`)
      console.log(`   Email: ${publicUser.email}\n`)
    }
    
    // Step 3: Direct query to organization_members
    console.log('📍 Step 3: Direct query to organization_members...')
    const { data: directMembers, error: directError } = await serviceClient
      .from('organization_members')
      .select('*')
      .eq('user_id', userId)
    
    console.log(`   Found ${directMembers?.length || 0} membership records`)
    if (directError) {
      console.error('   Error:', directError)
    }
    
    // Step 4: Query with join (as done by API)
    console.log('\n📍 Step 4: Query with organizations join (API style)...')
    const { data: joinedData, error: joinError } = await serviceClient
      .from('organization_members')
      .select(`
        organization_id,
        role,
        status,
        is_primary,
        organizations (
          id,
          name,
          slug,
          description,
          logo_url,
          website,
          industry,
          organization_size,
          is_active
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'active')
    
    console.log(`   Found ${joinedData?.length || 0} active memberships with org data`)
    if (joinError) {
      console.error('   Error:', joinError)
    } else if (joinedData && joinedData.length > 0) {
      console.log('\n   Organizations visible:')
      joinedData.forEach(item => {
        const org = item.organizations as any
        if (org) {
          console.log(`   - ${org.name} (${item.role})`)
        }
      })
    }
    
    // Step 5: Check organizations table directly
    console.log('\n📍 Step 5: Checking organizations table directly...')
    const { data: allOrgs, error: orgsError } = await serviceClient
      .from('organizations')
      .select('id, name, slug, is_active')
      .eq('is_active', true)
    
    console.log(`   Total active organizations: ${allOrgs?.length || 0}`)
    if (orgsError) {
      console.error('   Error:', orgsError)
    }
    
    // Step 6: Test the actual API endpoint
    console.log('\n📍 Step 6: Testing /api/organizations/simple endpoint...')
    console.log('   (This simulates what the frontend does)\n')
    
    // Get a session token for test director
    const { data: session, error: signInError } = await serviceClient.auth.signInWithPassword({
      email: 'test.director@appboardguru.com',
      password: 'TestDirector123!'
    })
    
    if (signInError || !session) {
      console.error('   ❌ Could not sign in as test director:', signInError)
      console.log('   Cannot test API endpoint without authentication\n')
    } else {
      console.log('   ✅ Signed in successfully')
      console.log(`   Session token: ${session.session?.access_token?.substring(0, 20)}...`)
      
      // Make API request with auth token
      const apiUrl = `${process.env.APP_URL || 'http://localhost:3000'}/api/organizations/simple`
      console.log(`   Calling: ${apiUrl}`)
      
      try {
        const response = await fetch(apiUrl, {
          headers: {
            'Authorization': `Bearer ${session.session?.access_token}`,
            'Content-Type': 'application/json'
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          console.log(`   ✅ API returned ${Array.isArray(data) ? data.length : 0} organizations`)
          if (Array.isArray(data) && data.length > 0) {
            console.log('\n   Organizations from API:')
            data.forEach(org => {
              console.log(`   - ${org.name} (${org.userRole})`)
            })
          }
        } else {
          console.error(`   ❌ API returned error: ${response.status} ${response.statusText}`)
          const errorText = await response.text()
          console.error(`   Response: ${errorText}`)
        }
      } catch (apiError) {
        console.error('   ❌ Failed to call API:', apiError)
      }
    }
    
    // Step 7: Check for any RLS policies
    console.log('\n📍 Step 7: Checking Row Level Security (RLS)...')
    console.log('   Note: RLS policies can only be checked via Supabase dashboard')
    console.log('   If organizations are not showing, check:')
    console.log('   1. RLS is enabled on organizations table')
    console.log('   2. Policy allows SELECT for authenticated users')
    console.log('   3. Policy on organization_members allows SELECT')
    
    // Summary
    console.log('\n========================================')
    console.log('DIAGNOSIS SUMMARY')
    console.log('========================================\n')
    
    const hasAuthUser = !!testDirector
    const hasPublicUser = !!publicUser
    const hasMemberships = (directMembers?.length || 0) > 0
    const hasJoinedData = (joinedData?.length || 0) > 0
    const hasOrganizations = (allOrgs?.length || 0) > 0
    
    console.log(`✅ Auth user exists: ${hasAuthUser}`)
    console.log(`${hasPublicUser ? '✅' : '⚠️'} Public user exists: ${hasPublicUser}`)
    console.log(`${hasMemberships ? '✅' : '❌'} Has memberships: ${hasMemberships} (${directMembers?.length || 0} records)`)
    console.log(`${hasJoinedData ? '✅' : '❌'} Joined query works: ${hasJoinedData} (${joinedData?.length || 0} records)`)
    console.log(`${hasOrganizations ? '✅' : '❌'} Organizations exist: ${hasOrganizations} (${allOrgs?.length || 0} records)`)
    
    if (!hasMemberships) {
      console.log('\n🔧 FIX NEEDED: No membership records found!')
      console.log('   Run: npx tsx scripts/fix-test-director-organizations.ts')
    } else if (!hasJoinedData) {
      console.log('\n🔧 FIX NEEDED: Join query not returning data!')
      console.log('   This might be an RLS policy issue')
    } else {
      console.log('\n✅ Database looks correct!')
      console.log('   Issue is likely in the frontend:')
      console.log('   1. Check if user is in demo mode')
      console.log('   2. Clear browser cache and localStorage')
      console.log('   3. Check React Query cache')
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

// Run diagnosis
diagnoseOrganizationIssue().catch(console.error)