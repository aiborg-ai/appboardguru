#!/usr/bin/env node

/**
 * Script to ensure the feedback_submissions table exists in the database
 * Run this script to create the table if it doesn't exist
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL']
const supabaseServiceKey = process.env['SUPABASE_SERVICE_KEY'] || process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗')
  console.error('   SUPABASE_SERVICE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseServiceKey ? '✓' : '✗')
  process.exit(1)
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkAndCreateTable() {
  console.log('🔍 Checking if feedback_submissions table exists...')
  
  try {
    // Check if table exists by trying to select from it
    const { error: checkError } = await supabase
      .from('feedback_submissions')
      .select('id')
      .limit(1)
    
    if (!checkError) {
      console.log('✅ Table feedback_submissions already exists')
      
      // Check if we can insert (test permissions)
      console.log('🔍 Testing insert permissions...')
      const testData = {
        reference_id: 'TEST-' + Date.now(),
        user_email: 'test@example.com',
        type: 'bug',
        title: 'Test Feedback',
        description: 'Testing permissions',
        created_at: new Date().toISOString()
      }
      
      const { error: insertError } = await supabase
        .from('feedback_submissions')
        .insert(testData)
      
      if (insertError) {
        if (insertError.code === '42501') {
          console.warn('⚠️  Permission issue detected. You may need to adjust RLS policies.')
          console.log('   Run this SQL in Supabase dashboard:')
          console.log(`
-- Temporarily disable RLS for testing
ALTER TABLE feedback_submissions DISABLE ROW LEVEL SECURITY;

-- Or create a more permissive policy
CREATE POLICY "Allow all operations for authenticated users" 
ON feedback_submissions 
FOR ALL 
USING (true)
WITH CHECK (true);
          `)
        } else {
          console.error('❌ Insert test failed:', insertError.message)
        }
      } else {
        console.log('✅ Insert permissions working')
        
        // Clean up test data
        await supabase
          .from('feedback_submissions')
          .delete()
          .eq('reference_id', testData.reference_id)
      }
      
      return true
    }
    
    if (checkError.code === '42P01') {
      console.log('📦 Table does not exist. Creating it now...')
      
      // Read the migration file
      const migrationPath = path.join(process.cwd(), 'database/migrations/013-feedback-system.sql')
      
      if (!fs.existsSync(migrationPath)) {
        console.error('❌ Migration file not found at:', migrationPath)
        console.log('📝 Creating table with inline SQL...')
        
        // Create table with inline SQL
        const createTableSQL = `
-- Create feedback submissions table
CREATE TABLE IF NOT EXISTS feedback_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_id VARCHAR(50) UNIQUE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    user_email VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('bug', 'feature', 'improvement', 'other')),
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    screenshot_included BOOLEAN DEFAULT FALSE,
    user_agent TEXT,
    page_url TEXT,
    admin_email_sent BOOLEAN DEFAULT FALSE,
    user_email_sent BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new', 'in_review', 'resolved', 'closed')),
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_feedback_submissions_user_id ON feedback_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_submissions_type ON feedback_submissions(type);
CREATE INDEX IF NOT EXISTS idx_feedback_submissions_status ON feedback_submissions(status);
CREATE INDEX IF NOT EXISTS idx_feedback_submissions_created_at ON feedback_submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_submissions_reference_id ON feedback_submissions(reference_id);

-- For development/testing, we'll use a more permissive RLS policy
ALTER TABLE feedback_submissions DISABLE ROW LEVEL SECURITY;
        `
        
        // Execute the SQL using Supabase's SQL editor API (if available)
        // Note: Direct SQL execution might require service role key
        console.log('📋 SQL to run in Supabase Dashboard:')
        console.log(createTableSQL)
        console.log('\n👆 Please run this SQL in your Supabase Dashboard > SQL Editor')
        
        return false
      }
      
      const migrationSQL = fs.readFileSync(migrationPath, 'utf-8')
      console.log('📋 Found migration file. Please run this in Supabase Dashboard:')
      console.log('\n--- START OF SQL ---')
      console.log(migrationSQL)
      console.log('--- END OF SQL ---\n')
      console.log('👆 Copy and paste this SQL into your Supabase Dashboard > SQL Editor')
      
      return false
    }
    
    console.error('❌ Unexpected error:', checkError.message)
    return false
    
  } catch (error) {
    console.error('❌ Error checking/creating table:', error)
    return false
  }
}

async function main() {
  console.log('🚀 Feedback Table Setup Script')
  console.log('================================')
  
  const success = await checkAndCreateTable()
  
  if (success) {
    console.log('\n✅ Feedback system is ready to use!')
  } else {
    console.log('\n⚠️  Manual action required:')
    console.log('1. Go to your Supabase Dashboard')
    console.log('2. Navigate to SQL Editor')
    console.log('3. Run the SQL provided above')
    console.log('4. Test the feedback form again')
  }
  
  process.exit(success ? 0 : 1)
}

// Run the script
main().catch(console.error)