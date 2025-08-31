#!/usr/bin/env node
/**
 * Check current RLS policies in Supabase
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

console.log('🔍 Checking Current RLS Policies\n');

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

async function checkPolicies() {
  try {
    // Query to get all policies (this is a system query that might not work depending on permissions)
    const policiesQuery = `
      SELECT 
        schemaname,
        tablename,
        policyname,
        permissive,
        roles,
        cmd,
        qual,
        with_check
      FROM pg_policies
      WHERE tablename IN ('organizations', 'organization_members')
      ORDER BY tablename, policyname;
    `;

    const { data: policies, error } = await supabase.rpc('exec_sql', { 
      query: policiesQuery 
    });

    if (error) {
      console.log('⚠️  Cannot query policies directly via RPC');
      console.log('  This is normal - service role may not have permission to execute arbitrary SQL');
      console.log('\n📝 Alternative: Check policies in Supabase Dashboard:');
      console.log('  1. Go to your Supabase project dashboard');
      console.log('  2. Navigate to Authentication > Policies');
      console.log('  3. Look for policies on "organization_members" and "organizations" tables');
      console.log('\n🔍 Looking for these problematic patterns:');
      console.log('  ❌ organization_members policy that JOINs or references organizations table');
      console.log('  ❌ organizations policy that JOINs organization_members in its main condition');
      console.log('  ❌ Any policy with nested EXISTS clauses referencing each other');
      console.log('\n✅ Safe patterns:');
      console.log('  ✅ organization_members: auth.uid() = user_id');
      console.log('  ✅ organizations: EXISTS (SELECT 1 FROM organization_members WHERE ...)');
    } else if (policies) {
      console.log('📋 Current Policies:\n');
      policies.forEach((policy: any) => {
        console.log(`Table: ${policy.tablename}`);
        console.log(`Policy: ${policy.policyname}`);
        console.log(`Command: ${policy.cmd}`);
        console.log(`Condition: ${policy.qual}`);
        console.log('---');
      });
    }

    // Try a simpler approach - test actual queries
    console.log('\n🧪 Testing Query Patterns:\n');
    
    // Test 1: Direct organization_members query
    console.log('Test 1: Direct organization_members query (no joins)');
    const { error: test1Error } = await supabase
      .from('organization_members')
      .select('id')
      .limit(1);
    
    if (test1Error?.message.includes('recursion')) {
      console.log('  ❌ RECURSION DETECTED - Policy references organizations table');
    } else if (test1Error) {
      console.log('  ⚠️  Other error:', test1Error.message);
    } else {
      console.log('  ✅ No recursion on direct query');
    }

    // Test 2: organization_members with organization join
    console.log('\nTest 2: organization_members with organizations join');
    const { error: test2Error } = await supabase
      .from('organization_members')
      .select('*, organizations(*)')
      .limit(1);
    
    if (test2Error?.message.includes('recursion')) {
      console.log('  ❌ RECURSION DETECTED - Circular reference in join');
    } else if (test2Error) {
      console.log('  ⚠️  Other error:', test2Error.message);
    } else {
      console.log('  ✅ No recursion on join query');
    }

    // Test 3: Direct organizations query
    console.log('\nTest 3: Direct organizations query');
    const { error: test3Error } = await supabase
      .from('organizations')
      .select('id')
      .limit(1);
    
    if (test3Error?.message.includes('recursion')) {
      console.log('  ❌ RECURSION DETECTED - Policy references organization_members');
    } else if (test3Error) {
      console.log('  ⚠️  Other error:', test3Error.message);
    } else {
      console.log('  ✅ No recursion on direct query');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkPolicies().then(() => {
  console.log('\n📝 Fix Instructions:');
  console.log('1. Go to Supabase Dashboard > SQL Editor');
  console.log('2. Run the script: scripts/fix-rls-policies.sql');
  console.log('3. This will replace problematic policies with simple, non-recursive ones');
  console.log('\n✅ Done!');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});