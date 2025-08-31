#!/usr/bin/env node
/**
 * Test database queries to check if RLS is fixed
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

console.log('🔍 Testing Database Queries After RLS Fix\n');

// Test with service role (bypasses RLS)
async function testWithServiceRole() {
  console.log('📊 Testing with SERVICE ROLE key (bypasses RLS)...');
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false }
  });

  try {
    // Test organizations table
    const { data: orgs, error: orgsError } = await supabase
      .from('organizations')
      .select('id, name')
      .limit(1);
    
    if (orgsError) {
      console.log('❌ Organizations query failed:', orgsError.message);
    } else {
      console.log('✅ Organizations query successful');
    }

    // Test organization_members table
    const { data: members, error: membersError } = await supabase
      .from('organization_members')
      .select('id, user_id, organization_id')
      .limit(1);
    
    if (membersError) {
      console.log('❌ Organization members query failed:', membersError.message);
    } else {
      console.log('✅ Organization members query successful');
    }

  } catch (error) {
    console.error('❌ Service role test failed:', error);
  }
}

// Test with anon key (uses RLS)
async function testWithAnonKey() {
  console.log('\n📊 Testing with ANON key (uses RLS)...');
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false }
  });

  try {
    // Test organizations table without auth
    console.log('\n1️⃣ Testing without authentication:');
    const { data: orgs1, error: orgsError1 } = await supabase
      .from('organizations')
      .select('id')
      .limit(1);
    
    if (orgsError1) {
      console.log('  ❌ Organizations query failed:', orgsError1.message);
      if (orgsError1.message.includes('recursion')) {
        console.log('  ⚠️  STILL HAS RECURSION ISSUE!');
      }
    } else {
      console.log('  ✅ Organizations query successful (returned', orgs1?.length || 0, 'rows)');
    }

    // Test organization_members table without auth
    const { data: members1, error: membersError1 } = await supabase
      .from('organization_members')
      .select('id')
      .limit(1);
    
    if (membersError1) {
      console.log('  ❌ Organization members query failed:', membersError1.message);
      if (membersError1.message.includes('recursion')) {
        console.log('  ⚠️  STILL HAS RECURSION ISSUE!');
      }
    } else {
      console.log('  ✅ Organization members query successful (returned', members1?.length || 0, 'rows)');
    }

    // Test with a mock authenticated user (if we have test credentials)
    console.log('\n2️⃣ Testing with test user authentication:');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'test.director@appboardguru.com',
      password: 'TestDirector123!'
    });

    if (authError) {
      console.log('  ⚠️  Could not authenticate test user:', authError.message);
    } else if (authData.user) {
      console.log('  ✅ Authenticated as:', authData.user.email);
      
      // Test queries as authenticated user
      const { data: userOrgs, error: userOrgsError } = await supabase
        .from('organizations')
        .select('id, name')
        .limit(5);
      
      if (userOrgsError) {
        console.log('  ❌ User organizations query failed:', userOrgsError.message);
        if (userOrgsError.message.includes('recursion')) {
          console.log('  ⚠️  STILL HAS RECURSION ISSUE!');
        }
      } else {
        console.log('  ✅ User organizations query successful (returned', userOrgs?.length || 0, 'organizations)');
      }

      // Test organization_members as authenticated user
      const { data: userMemberships, error: userMembershipsError } = await supabase
        .from('organization_members')
        .select('organization_id, role')
        .eq('user_id', authData.user.id);
      
      if (userMembershipsError) {
        console.log('  ❌ User memberships query failed:', userMembershipsError.message);
        if (userMembershipsError.message.includes('recursion')) {
          console.log('  ⚠️  STILL HAS RECURSION ISSUE!');
        }
      } else {
        console.log('  ✅ User memberships query successful (returned', userMemberships?.length || 0, 'memberships)');
      }

      // Sign out
      await supabase.auth.signOut();
    }

  } catch (error) {
    console.error('❌ Anon key test failed:', error);
  }
}

// Run tests
async function runTests() {
  await testWithServiceRole();
  await testWithAnonKey();
  
  console.log('\n📝 Summary:');
  console.log('If you still see recursion errors above, the RLS policies need further adjustment.');
  console.log('Check the Supabase dashboard and ensure policies don\'t reference each other circularly.');
}

runTests().then(() => {
  console.log('\n✅ Tests complete!');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});