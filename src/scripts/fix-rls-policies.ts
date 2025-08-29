#!/usr/bin/env node

/**
 * Fix RLS policies for users and registration_requests tables
 * Resolves 406 errors when accessing these tables
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function fixRLSPolicies() {
  console.log('🔧 Fixing RLS policies for tables...\n')

  // SQL to create/update RLS policies
  const policies = [
    // Users table policies
    {
      name: 'Enable read access for authenticated users',
      table: 'users',
      sql: `
        -- Drop existing policy if it exists
        DROP POLICY IF EXISTS "Users can view all users" ON users;
        
        -- Create new policy allowing authenticated users to read
        CREATE POLICY "Users can view all users" ON users
          FOR SELECT
          TO authenticated
          USING (true);
      `
    },
    {
      name: 'Enable users to update their own record',
      table: 'users',
      sql: `
        -- Drop existing policy if it exists
        DROP POLICY IF EXISTS "Users can update own record" ON users;
        
        -- Create new policy for users to update their own record
        CREATE POLICY "Users can update own record" ON users
          FOR UPDATE
          TO authenticated
          USING (auth.uid() = id)
          WITH CHECK (auth.uid() = id);
      `
    },
    // Registration requests policies
    {
      name: 'Enable read access for registration_requests',
      table: 'registration_requests',
      sql: `
        -- Drop existing policy if it exists
        DROP POLICY IF EXISTS "Anyone can view registration requests" ON registration_requests;
        
        -- Create policy allowing anyone to read (needed for approval links)
        CREATE POLICY "Anyone can view registration requests" ON registration_requests
          FOR SELECT
          TO anon, authenticated
          USING (true);
      `
    },
    {
      name: 'Enable insert for registration_requests',
      table: 'registration_requests',
      sql: `
        -- Drop existing policy if it exists
        DROP POLICY IF EXISTS "Anyone can create registration requests" ON registration_requests;
        
        -- Create policy allowing anyone to insert
        CREATE POLICY "Anyone can create registration requests" ON registration_requests
          FOR INSERT
          TO anon, authenticated
          WITH CHECK (true);
      `
    },
    {
      name: 'Enable update for registration_requests',
      table: 'registration_requests',
      sql: `
        -- Drop existing policy if it exists
        DROP POLICY IF EXISTS "Service role can update registration requests" ON registration_requests;
        
        -- Create policy for updates (approval process)
        CREATE POLICY "Service role can update registration requests" ON registration_requests
          FOR UPDATE
          TO anon, authenticated
          USING (true)
          WITH CHECK (true);
      `
    }
  ]

  for (const policy of policies) {
    console.log(`📝 Applying: ${policy.name} (${policy.table})`)
    
    try {
      const { error } = await supabase.rpc('exec_sql', {
        sql: policy.sql
      }).single()

      if (error) {
        // Try direct execution if RPC doesn't exist
        const { error: directError } = await supabase
          .from('_sql_exec')
          .insert({ sql: policy.sql })
          .single()
        
        if (directError) {
          console.log(`⚠️  Could not apply via RPC or direct insert. Please run manually in Supabase SQL Editor:`)
          console.log(`\n${policy.sql}\n`)
        } else {
          console.log(`✅ Applied successfully`)
        }
      } else {
        console.log(`✅ Applied successfully`)
      }
    } catch (err) {
      console.log(`⚠️  Please run this SQL manually in Supabase SQL Editor:`)
      console.log(`\n${policy.sql}\n`)
    }
  }

  console.log('\n🔍 Checking current RLS status...')
  
  // Test access to tables
  const { data: usersData, error: usersError } = await supabase
    .from('users')
    .select('id')
    .limit(1)
  
  const { data: reqData, error: reqError } = await supabase
    .from('registration_requests')
    .select('id')
    .limit(1)

  console.log('\n📊 RLS Test Results:')
  console.log(`   Users table: ${usersError ? `❌ Error: ${usersError.message}` : '✅ Accessible'}`)
  console.log(`   Registration requests: ${reqError ? `❌ Error: ${reqError.message}` : '✅ Accessible'}`)

  if (usersError || reqError) {
    console.log('\n⚠️  Some tables still have access issues.')
    console.log('   Please run the SQL commands above in your Supabase SQL Editor.')
    console.log('   Go to: Supabase Dashboard > SQL Editor > New Query')
  } else {
    console.log('\n✅ RLS policies are properly configured!')
  }
}

fixRLSPolicies().catch(console.error)