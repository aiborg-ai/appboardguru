#!/usr/bin/env node

/**
 * Test script to verify feedback submission is working
 * Run with: npx tsx src/scripts/test-feedback-fix.ts
 */

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

async function testFeedbackSubmission() {
  console.log('🧪 Testing Feedback Submission System\n');
  console.log('=' .repeat(60));
  
  // Step 1: Check if feedback_submissions table exists
  console.log('\n1️⃣ Checking feedback_submissions table...');
  const { data: tableCheck, error: tableError } = await supabase
    .from('feedback_submissions')
    .select('id')
    .limit(1);
  
  if (tableError) {
    if (tableError.code === '42P01') {
      console.error('❌ Table feedback_submissions does not exist!');
      console.log('   Run the SQL script: src/scripts/create-feedback-table.sql');
      return;
    } else if (tableError.message?.includes('permission')) {
      console.warn('⚠️  Permission issue accessing table (might be RLS)');
      console.log('   Error:', tableError.message);
    } else {
      console.error('❌ Error checking table:', tableError.message);
    }
  } else {
    console.log('✅ Table feedback_submissions exists');
  }
  
  // Step 2: Test API endpoint
  console.log('\n2️⃣ Testing feedback API endpoint...');
  
  const testFeedback = {
    type: 'bug',
    title: 'Test Feedback - Constructor Fix',
    description: 'Testing if the NotificationService constructor fix resolved the issue',
    screenshot: null
  };
  
  try {
    const response = await fetch('http://localhost:3000/api/feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testFeedback)
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Feedback API responded successfully');
      console.log('   Reference ID:', data.referenceId);
      console.log('   Message:', data.message);
      if (data.warning) {
        console.log('   ⚠️  Warning:', data.warning);
      }
      console.log('   Email Status:');
      console.log('     - Admin:', data.emailsSent?.admin ? '✅' : '❌');
      console.log('     - User:', data.emailsSent?.user ? '✅' : '❌');
    } else {
      console.error('❌ Feedback API returned error');
      console.log('   Status:', response.status);
      console.log('   Error:', data.error);
      if (data.referenceId) {
        console.log('   Reference ID:', data.referenceId);
      }
      if (data.details) {
        console.log('   Details:', data.details);
      }
    }
  } catch (error) {
    console.error('❌ Failed to call feedback API');
    console.error('   Error:', error);
  }
  
  // Step 3: Check if feedback was saved to database
  console.log('\n3️⃣ Checking if feedback was saved to database...');
  
  // Try to query recent feedback submissions
  const { data: recentFeedback, error: queryError } = await supabase
    .from('feedback_submissions')
    .select('reference_id, title, type, created_at')
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (queryError) {
    console.error('❌ Could not query feedback submissions');
    console.log('   Error:', queryError.message);
  } else if (recentFeedback && recentFeedback.length > 0) {
    console.log('✅ Recent feedback submissions found:');
    recentFeedback.forEach(feedback => {
      console.log(`   - ${feedback.reference_id}: ${feedback.title} (${feedback.type})`);
    });
  } else {
    console.log('⚠️  No feedback submissions found in database');
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('\n📊 Summary:');
  console.log('- If all checks passed (✅), the feedback system is working!');
  console.log('- If you see errors, check the specific step that failed');
  console.log('- The reference ID format should be like: FB-XXXXXXXXXXXXX');
  console.log('\n💡 Next Steps:');
  console.log('1. If table doesn\'t exist, run the SQL script in Supabase');
  console.log('2. If API fails, check server logs for constructor errors');
  console.log('3. Test via UI at http://localhost:3000/dashboard/feedback');
}

// Run the test
testFeedbackSubmission().catch(console.error);