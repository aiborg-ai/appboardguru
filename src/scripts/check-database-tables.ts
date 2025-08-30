#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  console.log('Checking database tables...\n');

  // Try to query organizations table
  const { data: orgs, error: orgError } = await supabase
    .from('organizations')
    .select('count')
    .limit(1);

  if (orgError) {
    console.log('❌ organizations table:', orgError.message);
  } else {
    console.log('✓ organizations table exists');
  }

  // Try to query organization_members table
  const { data: members, error: memberError } = await supabase
    .from('organization_members')
    .select('count')
    .limit(1);

  if (memberError) {
    console.log('❌ organization_members table:', memberError.message);
  } else {
    console.log('✓ organization_members table exists');
  }

  // Try to get auth user
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'test.director@appboardguru.com',
    password: 'TestDirector123!'
  });

  if (authError) {
    console.log('\n❌ Could not authenticate test director:', authError.message);
  } else if (authData.user) {
    console.log('\n✓ Test director user exists in auth');
    console.log('  User ID:', authData.user.id);
    console.log('  Email:', authData.user.email);

    // Check if user has any organizations
    const { data: memberships, error: membershipError } = await supabase
      .from('organization_members')
      .select('*, organizations(*)')
      .eq('user_id', authData.user.id);

    if (!membershipError) {
      console.log(`\n📊 Organization memberships: ${memberships?.length || 0}`);
      if (memberships && memberships.length > 0) {
        memberships.forEach((m: any, i: number) => {
          console.log(`  ${i + 1}. ${m.organizations?.name || 'Unknown'} (${m.role})`);
        });
      }
    }
  }
}

checkTables().catch(console.error);