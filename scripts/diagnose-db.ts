#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

console.log('='.repeat(80));
console.log('DATABASE DIAGNOSTIC REPORT');
console.log('='.repeat(80));
console.log();

// 1. Check environment variables
console.log('1. ENVIRONMENT VARIABLES CHECK');
console.log('-'.repeat(40));
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? `✓ Set (${supabaseUrl.substring(0, 30)}...)` : '✗ Missing');
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? `✓ Set (${supabaseAnonKey.substring(0, 20)}...)` : '✗ Missing');
console.log();

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('ERROR: Missing required environment variables!');
  console.log('Please ensure .env.local has the correct values from Supabase dashboard.');
  process.exit(1);
}

// 2. Test database connection
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runDiagnostics() {
  console.log('2. DATABASE CONNECTION TEST');
  console.log('-'.repeat(40));
  
  try {
    // Test basic connection
    const { data: testData, error: testError } = await supabase
      .from('organizations')
      .select('count')
      .limit(1);
    
    if (testError) {
      console.log('Connection test: ✗ Failed');
      console.log('Error:', testError.message);
    } else {
      console.log('Connection test: ✓ Success');
    }
  } catch (err) {
    console.log('Connection test: ✗ Failed');
    console.log('Error:', err);
  }
  console.log();

  // 3. Check table existence
  console.log('3. TABLE EXISTENCE CHECK');
  console.log('-'.repeat(40));
  
  const tables = [
    'organizations',
    'users', 
    'boards',
    'meetings',
    'organization_members',
    'board_members',
    'meeting_attendees'
  ];

  for (const table of tables) {
    try {
      const { error } = await supabase
        .from(table)
        .select('id')
        .limit(1);
      
      if (error) {
        if (error.message.includes('does not exist')) {
          console.log(`${table}: ✗ Table does not exist`);
        } else {
          console.log(`${table}: ⚠ Table exists but has issues - ${error.message}`);
        }
      } else {
        console.log(`${table}: ✓ Table exists`);
      }
    } catch (err) {
      console.log(`${table}: ✗ Error checking - ${err}`);
    }
  }
  console.log();

  // 4. Check column existence for key tables
  console.log('4. COLUMN EXISTENCE CHECK');
  console.log('-'.repeat(40));
  
  const columnChecks = [
    { table: 'organizations', columns: ['id', 'name', 'slug', 'status'] },
    { table: 'users', columns: ['id', 'email', 'status', 'role'] },
    { table: 'boards', columns: ['id', 'name', 'organization_id', 'status'] },
    { table: 'meetings', columns: ['id', 'title', 'board_id', 'status', 'scheduled_start'] }
  ];

  for (const check of columnChecks) {
    console.log(`\n${check.table} table columns:`);
    
    try {
      // Try to select all specified columns
      const { data, error } = await supabase
        .from(check.table)
        .select(check.columns.join(','))
        .limit(1);
      
      if (error) {
        console.log(`  Error: ${error.message}`);
        
        // Check each column individually
        for (const col of check.columns) {
          const { error: colError } = await supabase
            .from(check.table)
            .select(col)
            .limit(1);
          
          if (colError) {
            console.log(`  - ${col}: ✗ Missing or inaccessible`);
          } else {
            console.log(`  - ${col}: ✓ Exists`);
          }
        }
      } else {
        check.columns.forEach(col => {
          console.log(`  - ${col}: ✓ Exists`);
        });
      }
    } catch (err) {
      console.log(`  Error checking columns: ${err}`);
    }
  }
  console.log();

  // 5. Check RLS policies
  console.log('5. ROW LEVEL SECURITY CHECK');
  console.log('-'.repeat(40));
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        if (error.message.includes('row-level security')) {
          console.log(`${table}: RLS enabled (may need policy adjustment)`);
        } else {
          console.log(`${table}: Error - ${error.message}`);
        }
      } else {
        console.log(`${table}: RLS policies allow access`);
      }
    } catch (err) {
      console.log(`${table}: Error - ${err}`);
    }
  }
  console.log();

  // 6. Test specific meeting creation scenario
  console.log('6. MEETING CREATION TEST');
  console.log('-'.repeat(40));
  
  try {
    // First, check if we can get organizations
    const { data: orgs, error: orgError } = await supabase
      .from('organizations')
      .select('id, name')
      .limit(1);
    
    if (orgError) {
      console.log('Cannot fetch organizations:', orgError.message);
    } else if (orgs && orgs.length > 0) {
      console.log(`Found organization: ${orgs[0].name} (${orgs[0].id})`);
      
      // Try to check boards for this org
      const { data: boards, error: boardError } = await supabase
        .from('boards')
        .select('id, name')
        .eq('organization_id', orgs[0].id)
        .limit(1);
      
      if (boardError) {
        console.log('Cannot fetch boards:', boardError.message);
      } else if (boards && boards.length > 0) {
        console.log(`Found board: ${boards[0].name} (${boards[0].id})`);
      } else {
        console.log('No boards found for this organization');
      }
    } else {
      console.log('No organizations found in database');
    }
  } catch (err) {
    console.log('Error during meeting creation test:', err);
  }
  console.log();

  // 7. Summary and recommendations
  console.log('7. SUMMARY & RECOMMENDATIONS');
  console.log('-'.repeat(40));
  console.log(`
Based on the diagnostic results above:

1. If tables are missing:
   - Run migration: 003_create_missing_tables.sql

2. If 'status' columns are missing:
   - Run migration: 004_add_status_column_everywhere.sql

3. If RLS policies are blocking access:
   - Check authentication status
   - Review RLS policies in Supabase dashboard

4. Next steps:
   - Apply the appropriate migration in Supabase SQL Editor
   - Restart your development server
   - Test the application again
`);

  console.log('='.repeat(80));
  console.log('DIAGNOSTIC COMPLETE');
  console.log('='.repeat(80));
}

runDiagnostics().catch(console.error);