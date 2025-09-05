import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function checkUserOrganizations() {
  const testUserId = 'b2fc2f59-447c-495c-af05-31a30d6e364a'
  
  console.log('🔍 Checking Organizations for Test User\n')
  console.log('User ID:', testUserId)
  console.log('=' .repeat(50))
  
  try {
    // Check if user exists
    console.log('\n1. Checking if user exists...')
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', testUserId)
      .single()
    
    if (userError || !user) {
      console.log('❌ User not found in users table')
      console.log('Error:', userError)
    } else {
      console.log('✅ User found:', user.email)
    }
    
    // Check organization memberships
    console.log('\n2. Checking organization memberships...')
    const { data: memberships, error: memberError } = await supabase
      .from('organization_members')
      .select('*')
      .eq('user_id', testUserId)
    
    if (memberError) {
      console.error('❌ Error fetching memberships:', memberError)
    } else if (!memberships || memberships.length === 0) {
      console.log('⚠️  No organization memberships found for this user')
      
      // Create a default organization and membership
      console.log('\n3. Creating default organization for testing...')
      
      // First check if default org exists
      const { data: existingOrg } = await supabase
        .from('organizations')
        .select('*')
        .eq('slug', 'test-company')
        .single()
      
      let orgId: string
      
      if (existingOrg) {
        console.log('✅ Default organization already exists')
        orgId = existingOrg.id
      } else {
        // Create organization
        const { data: newOrg, error: orgError } = await supabase
          .from('organizations')
          .insert({
            name: 'Test Company Inc',
            slug: 'test-company',
            description: 'Default test organization',
            industry: 'Technology',
            organization_size: 'medium',
            is_active: true
          })
          .select()
          .single()
        
        if (orgError || !newOrg) {
          console.error('❌ Failed to create organization:', orgError)
          return
        }
        
        console.log('✅ Created organization:', newOrg.id)
        orgId = newOrg.id
      }
      
      // Check if membership exists
      const { data: existingMembership } = await supabase
        .from('organization_members')
        .select('*')
        .eq('user_id', testUserId)
        .eq('organization_id', orgId)
        .single()
      
      if (existingMembership) {
        console.log('✅ Membership already exists')
      } else {
        // Create membership
        const { data: membership, error: membershipError } = await supabase
          .from('organization_members')
          .insert({
            user_id: testUserId,
            organization_id: orgId,
            role: 'admin',
            status: 'active'
          })
          .select()
          .single()
        
        if (membershipError) {
          console.error('❌ Failed to create membership:', membershipError)
        } else {
          console.log('✅ Created membership for user')
        }
      }
      
    } else {
      console.log(`✅ Found ${memberships.length} membership(s):`)
      memberships.forEach((m, i) => {
        console.log(`   ${i + 1}. Org ID: ${m.organization_id}`)
        console.log(`      Role: ${m.role}`)
        console.log(`      Status: ${m.status}`)
      })
      
      // Get organization details
      const orgIds = memberships.map(m => m.organization_id)
      const { data: orgs } = await supabase
        .from('organizations')
        .select('*')
        .in('id', orgIds)
      
      if (orgs) {
        console.log('\n4. Organization details:')
        orgs.forEach(org => {
          console.log(`   - ${org.name} (${org.slug})`)
        })
      }
    }
    
    // Final check
    console.log('\n5. Final verification...')
    const { data: finalCheck } = await supabase
      .from('organization_members')
      .select(`
        organization_id,
        role,
        status,
        organizations (
          id,
          name,
          slug
        )
      `)
      .eq('user_id', testUserId)
      .eq('status', 'active')
    
    if (finalCheck && finalCheck.length > 0) {
      console.log('✅ User now has active organization memberships')
      finalCheck.forEach(m => {
        console.log(`   - ${m.organizations?.name} (Role: ${m.role})`)
      })
    } else {
      console.log('❌ Still no active memberships found')
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

// Run the check
checkUserOrganizations()