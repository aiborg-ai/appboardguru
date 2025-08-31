#!/usr/bin/env node

/**
 * Script to associate test director with all organizations
 * Run with: node scripts/associate-test-director.js
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing required environment variables!');
  console.error('SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗');
  console.error('SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? '✓' : '✗');
  process.exit(1);
}

// Use service role key if available to bypass RLS
const supabase = createClient(
  SUPABASE_URL, 
  SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY, 
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    db: {
      schema: 'public'
    }
  }
);

// Create a separate client for auth operations
const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function associateTestDirector() {
  console.log('🚀 Associating test director with all organizations...\n');

  try {
    // First, sign in as test director to get the user ID using auth client
    const { data: signInData, error: signInError } = await authClient.auth.signInWithPassword({
      email: 'test.director@appboardguru.com',
      password: 'TestDirector123!'
    });
    
    if (signInError || !signInData.user) {
      console.error('❌ Could not sign in as test director');
      console.error('Error:', signInError);
      console.log('\nMake sure the test.director@appboardguru.com account exists with password: TestDirector123!');
      return;
    }

    const userId = signInData.user.id;
    console.log('✅ Found test director user:', userId);
    console.log('   Email:', signInData.user.email);
    console.log('');

    // Get all organizations (remove status filter as column might not exist)
    const { data: organizations, error: orgsError } = await supabase
      .from('organizations')
      .select('*');

    if (orgsError) {
      console.error('❌ Error fetching organizations:', orgsError);
      return;
    }

    if (!organizations || organizations.length === 0) {
      console.log('⚠️  No organizations found. Creating a default organization...\n');
      
      // Create a default organization
      const { data: newOrg, error: createError } = await supabase
        .from('organizations')
        .insert({
          name: 'Test Director Organization',
          slug: `test-director-org-${Date.now()}`,
          description: 'Default organization for test director',
          created_by: userId,
          industry: 'Technology',
          organization_size: 'medium'
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ Failed to create organization:', createError);
        return;
      }

      organizations.push(newOrg);
      console.log('✅ Created organization:', newOrg.name);
      console.log('   ID:', newOrg.id);
      console.log('');
    }

    console.log(`📁 Found ${organizations.length} organization(s) in the system\n`);

    let created = 0;
    let updated = 0;
    let unchanged = 0;

    // Process each organization
    for (const org of organizations) {
      console.log(`\n📁 Processing: ${org.name}`);
      console.log(`   ID: ${org.id}`);
      console.log(`   Slug: ${org.slug}`);

      // Check if membership exists
      const { data: existingMembership, error: checkError } = await supabase
        .from('organization_members')
        .select('*')
        .eq('organization_id', org.id)
        .eq('user_id', userId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('   ❌ Error checking membership:', checkError);
        continue;
      }

      if (existingMembership) {
        if (existingMembership.role !== 'owner' || existingMembership.status !== 'active') {
          // Update to owner
          const { error: updateError } = await supabase
            .from('organization_members')
            .update({
              role: 'owner',
              status: 'active',
              updated_at: new Date().toISOString()
            })
            .eq('id', existingMembership.id);

          if (updateError) {
            console.error('   ❌ Failed to update membership:', updateError);
          } else {
            console.log('   ✅ UPDATED to owner role');
            updated++;
          }
        } else {
          console.log('   ✓ Already an active owner');
          unchanged++;
        }
      } else {
        // Create new membership
        const { error: insertError } = await supabase
          .from('organization_members')
          .insert({
            organization_id: org.id,
            user_id: userId,
            role: 'owner',
            status: 'active',
            joined_at: new Date().toISOString()
          });

        if (insertError) {
          console.error('   ❌ Failed to create membership:', insertError);
        } else {
          console.log('   ✅ ADDED as owner');
          created++;
        }
      }
    }

    // Final summary
    console.log('\n========================================');
    console.log('SUMMARY:');
    console.log('========================================');
    console.log(`📊 Total organizations: ${organizations.length}`);
    console.log(`✅ New memberships created: ${created}`);
    console.log(`🔄 Memberships updated: ${updated}`);
    console.log(`✓ Unchanged (already owner): ${unchanged}`);
    console.log('\n✅ Test director is now OWNER of ALL organizations!');

    // Verify the associations
    console.log('\n========================================');
    console.log('VERIFICATION:');
    console.log('========================================');

    const { data: memberships, error: verifyError } = await supabase
      .from('organization_members')
      .select(`
        role,
        status,
        organizations(
          name,
          slug
        )
      `)
      .eq('user_id', userId);

    if (verifyError) {
      console.error('❌ Error verifying memberships:', verifyError);
    } else if (memberships) {
      console.log(`\nTest director is now a member of ${memberships.length} organization(s):`);
      memberships.forEach((m, i) => {
        const org = m.organizations;
        console.log(`\n${i + 1}. ${org.name}`);
        console.log(`   Slug: ${org.slug}`);
        console.log(`   Role: ${m.role}`);
        console.log(`   Status: ${m.status}`);
      });
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the association
associateTestDirector();