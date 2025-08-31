#!/usr/bin/env npx tsx

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createFeedbackTable() {
  console.log('🔄 Creating feedback_submissions table...\n');
  
  try {
    // First check if table exists
    const { error: checkError } = await supabase
      .from('feedback_submissions')
      .select('id')
      .limit(1);
    
    if (!checkError) {
      console.log('✅ Table feedback_submissions already exists!');
      return true;
    }
    
    if (checkError.code === 'PGRST116' || checkError.message?.includes('not found')) {
      console.log('📝 Table does not exist. Please create it using Supabase Dashboard:');
      console.log('\n1. Go to: https://supabase.com/dashboard/project/pgeuvjihhfmzqymoygwb/editor');
      console.log('2. Click on "SQL Editor" in the left sidebar');
      console.log('3. Copy and paste the SQL from: scripts/create-feedback-table.sql');
      console.log('4. Click "Run" to execute the migration\n');
      
      console.log('Or use this simplified version for quick setup:\n');
      console.log(`
-- Minimal feedback_submissions table
CREATE TABLE IF NOT EXISTS public.feedback_submissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    reference_id VARCHAR(50) UNIQUE NOT NULL,
    user_id UUID,
    user_email VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    screenshot_included BOOLEAN DEFAULT false,
    user_agent TEXT,
    page_url TEXT,
    admin_email_sent BOOLEAN DEFAULT false,
    user_email_sent BOOLEAN DEFAULT false,
    status VARCHAR(50) DEFAULT 'pending',
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.feedback_submissions ENABLE ROW LEVEL SECURITY;

-- Allow inserts from anyone (including anonymous)
CREATE POLICY "Allow all inserts" ON public.feedback_submissions
    FOR INSERT
    WITH CHECK (true);

-- Allow users to view their own feedback
CREATE POLICY "Users can view own feedback" ON public.feedback_submissions
    FOR SELECT
    USING (auth.uid() = user_id OR user_id IS NULL);
      `);
      
      return false;
    }
    
    console.log('⚠️  Unexpected error:', checkError.message);
    return false;
    
  } catch (error) {
    console.error('❌ Error:', error);
    return false;
  }
}

async function testInsert() {
  console.log('\n🧪 Testing feedback submission...\n');
  
  const testData = {
    reference_id: `FB-TEST-${Date.now()}`,
    user_id: null,
    user_email: 'test@example.com',
    type: 'bug',
    title: 'Test Feedback',
    description: 'This is a test feedback submission',
    screenshot_included: false,
    admin_email_sent: false,
    user_email_sent: false
  };
  
  const { data, error } = await supabase
    .from('feedback_submissions')
    .insert(testData)
    .select()
    .single();
  
  if (error) {
    console.error('❌ Test insert failed:', error.message);
    if (error.code === 'PGRST116') {
      console.log('Table does not exist. Please create it first.');
    }
    return false;
  }
  
  console.log('✅ Test insert successful!');
  console.log('Reference ID:', data.reference_id);
  
  // Clean up test data
  await supabase
    .from('feedback_submissions')
    .delete()
    .eq('reference_id', data.reference_id);
  
  console.log('🧹 Test data cleaned up');
  return true;
}

async function main() {
  console.log('📊 Feedback Table Setup Script');
  console.log('================================\n');
  
  const tableCreated = await createFeedbackTable();
  
  if (tableCreated) {
    await testInsert();
  }
  
  console.log('\n✅ Script completed');
}

main().catch(console.error);