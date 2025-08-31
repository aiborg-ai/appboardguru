#!/usr/bin/env npx tsx

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function testFeedbackSubmission() {
  console.log('🧪 Testing Feedback Submission System');
  console.log('=====================================\n');
  
  try {
    // 1. First authenticate as test director
    console.log('1️⃣ Authenticating as test director...');
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'test.director@appboardguru.com',
      password: 'TestDirector123!'
    });
    
    if (authError || !authData.session) {
      console.error('❌ Authentication failed:', authError);
      return;
    }
    
    console.log('✅ Authenticated successfully');
    console.log('   User ID:', authData.user.id);
    console.log('   Email:', authData.user.email);
    
    // 2. Prepare feedback data
    console.log('\n2️⃣ Preparing feedback data...');
    const feedbackData = {
      type: 'bug',
      title: 'Test Feedback Submission - Upload Issue',
      description: 'Testing the feedback system to ensure it saves to database and sends emails correctly. This is related to the upload stuck at 7% issue.',
      screenshot: null // Can add base64 screenshot if needed
    };
    
    console.log('   Type:', feedbackData.type);
    console.log('   Title:', feedbackData.title);
    
    // 3. Submit feedback via API
    console.log('\n3️⃣ Submitting feedback to API...');
    const response = await fetch('http://localhost:3000/api/feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authData.session.access_token}`,
        'Cookie': `sb-auth-token=${authData.session.access_token}`
      },
      body: JSON.stringify(feedbackData)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Feedback submitted successfully!');
      console.log('   Reference ID:', result.referenceId);
      console.log('   Database saved:', result.dbSaved ? '✅' : '❌');
      console.log('   Admin email sent:', result.adminEmailSent ? '✅' : '❌');
      console.log('   User email sent:', result.userEmailSent ? '✅' : '❌');
      
      if (result.referenceId) {
        console.log('\n4️⃣ Verifying in database...');
        
        // Check if it was saved to database
        const { data: feedbackRecord, error: fetchError } = await supabase
          .from('feedback_submissions')
          .select('*')
          .eq('reference_id', result.referenceId)
          .single();
        
        if (fetchError) {
          if (fetchError.code === 'PGRST116') {
            console.log('❌ Table feedback_submissions does not exist!');
            console.log('   Please run: npx tsx scripts/ensure-feedback-table.ts');
            console.log('   Then create the table in Supabase Dashboard');
          } else {
            console.log('❌ Could not verify in database:', fetchError.message);
          }
        } else if (feedbackRecord) {
          console.log('✅ Feedback found in database!');
          console.log('   ID:', feedbackRecord.id);
          console.log('   Created at:', feedbackRecord.created_at);
        }
      }
      
      console.log('\n📧 Email Status:');
      if (result.adminEmailSent) {
        console.log('✅ Admin email sent to: hirendra.vikram@boardguru.ai');
      } else {
        console.log('⚠️  Admin email not sent (check SMTP configuration)');
      }
      
      if (result.userEmailSent) {
        console.log('✅ Confirmation email sent to:', authData.user.email);
      } else {
        console.log('⚠️  User confirmation email not sent');
      }
      
    } else {
      console.error('❌ Feedback submission failed:', result.error);
      if (result.details) {
        console.error('   Details:', result.details);
      }
    }
    
    // 5. Sign out
    console.log('\n5️⃣ Signing out...');
    await supabase.auth.signOut();
    console.log('✅ Signed out');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
  
  console.log('\n=====================================');
  console.log('Test completed');
}

// Run the test
testFeedbackSubmission();