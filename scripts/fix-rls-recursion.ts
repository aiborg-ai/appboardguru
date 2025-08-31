#!/usr/bin/env node
/**
 * Script to fix RLS infinite recursion issue
 * Run with: npx tsx scripts/fix-rls-recursion.ts
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or ANON_KEY)');
  process.exit(1);
}

console.log('🔍 Checking Supabase connection...');
console.log(`URL: ${supabaseUrl}`);
console.log(`Using key type: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SERVICE_ROLE' : 'ANON'}`);

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

async function checkAndFixRLS() {
  try {
    // Test basic connection
    console.log('\n📊 Testing database connection...');
    const { data: testData, error: testError } = await supabase
      .from('organizations')
      .select('count')
      .limit(1);
    
    if (testError) {
      if (testError.message.includes('infinite recursion')) {
        console.error('❌ Infinite recursion detected in RLS policies!');
        console.log('\n🔧 To fix this issue, you need to:');
        console.log('1. Go to your Supabase dashboard');
        console.log('2. Navigate to Authentication > Policies');
        console.log('3. Check the policies for "organization_members" table');
        console.log('4. Look for policies that reference each other in a circular way');
        console.log('5. Simplify the policies to avoid circular references');
        console.log('\nExample fix:');
        console.log('- Change "organization_members" policy to only check: auth.uid() = user_id');
        console.log('- Don\'t have it reference the organizations table');
        return;
      }
      console.error('❌ Database error:', testError.message);
      return;
    }
    
    console.log('✅ Database connection successful');
    
    // Check if we can query organization_members
    console.log('\n📊 Testing organization_members table...');
    const { data: membersData, error: membersError } = await supabase
      .from('organization_members')
      .select('count')
      .limit(1);
    
    if (membersError) {
      console.error('❌ Error querying organization_members:', membersError.message);
      if (membersError.message.includes('infinite recursion')) {
        console.log('\n⚠️  The organization_members table has RLS recursion issues');
      }
    } else {
      console.log('✅ organization_members table accessible');
    }
    
    // If using service role key, we can try to check policies directly
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.log('\n📋 Checking RLS policies (requires service role)...');
      
      const { data: policies, error: policiesError } = await supabase
        .rpc('get_policies_for_table', { 
          table_name: 'organization_members' 
        })
        .single();
      
      if (policiesError) {
        console.log('ℹ️  Cannot query policies directly (may need different permissions)');
      } else if (policies) {
        console.log('Found policies:', policies);
      }
    }
    
    console.log('\n✅ Check complete!');
    console.log('\n📝 Summary:');
    console.log('- Supabase connection: ✅ Working');
    console.log('- Environment variables: ✅ Configured');
    console.log('- Database access: ' + (testError ? '❌ Has issues' : '✅ Working'));
    console.log('- RLS policies: ⚠️  May have recursion issues - check Supabase dashboard');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the check
checkAndFixRLS().then(() => {
  console.log('\n👋 Done!');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});