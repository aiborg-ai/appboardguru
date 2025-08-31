#!/usr/bin/env npx tsx

import { createClient } from '@supabase/supabase-js';
import { NotificationService } from '../src/lib/services/notification.service';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function testFeedbackSystem() {
  console.log('🧪 Testing Feedback System - Direct Email Test');
  console.log('==============================================\n');
  
  try {
    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Initialize NotificationService
    console.log('1️⃣ Initializing NotificationService...');
    const notificationService = new NotificationService(supabase);
    console.log('✅ NotificationService initialized\n');
    
    // Test email configuration
    console.log('2️⃣ Testing email configuration...');
    console.log('   SMTP Host:', process.env.SMTP_HOST || 'Not configured');
    console.log('   SMTP Port:', process.env.SMTP_PORT || 'Not configured');
    console.log('   SMTP User:', process.env.SMTP_USER || 'Not configured');
    console.log('   Admin Email:', process.env.ADMIN_EMAIL || 'hirendra.vikram@boardguru.ai');
    console.log('   Password:', process.env.SMTP_PASS ? '✅ Configured' : '❌ Not configured');
    
    // Prepare test feedback data
    const feedbackData = {
      type: 'bug',
      title: 'Test Feedback - Direct Email Test',
      description: 'This is a test to verify email sending functionality for feedback submissions.',
      userEmail: 'test.director@appboardguru.com',
      userName: 'Test Director',
      timestamp: new Date().toISOString(),
      referenceId: `FB-TEST-${Date.now()}`
    };
    
    // Create email template
    const emailTemplate = {
      subject: `[BoardGuru Feedback] ${feedbackData.type.toUpperCase()}: ${feedbackData.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">New Feedback Received</h2>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px;">
            <p><strong>Reference ID:</strong> ${feedbackData.referenceId}</p>
            <p><strong>Type:</strong> ${feedbackData.type}</p>
            <p><strong>Title:</strong> ${feedbackData.title}</p>
            <p><strong>From:</strong> ${feedbackData.userName} (${feedbackData.userEmail})</p>
            <p><strong>Time:</strong> ${new Date(feedbackData.timestamp).toLocaleString()}</p>
            <hr style="border: 1px solid #e5e7eb; margin: 20px 0;">
            <p><strong>Description:</strong></p>
            <p style="background: white; padding: 15px; border-radius: 4px;">${feedbackData.description}</p>
          </div>
          <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
            This is an automated message from BoardGuru Feedback System.
          </p>
        </div>
      `,
      text: `
New Feedback Received
=====================
Reference ID: ${feedbackData.referenceId}
Type: ${feedbackData.type}
Title: ${feedbackData.title}
From: ${feedbackData.userName} (${feedbackData.userEmail})
Time: ${new Date(feedbackData.timestamp).toLocaleString()}

Description:
${feedbackData.description}

This is an automated message from BoardGuru Feedback System.
      `.trim()
    };
    
    // Try to send email
    console.log('\n3️⃣ Sending test email to admin...');
    console.log('   To: hirendra.vikram@boardguru.ai');
    console.log('   Subject:', emailTemplate.subject);
    
    const emailSent = await notificationService.sendEmail(
      'hirendra.vikram@boardguru.ai',
      emailTemplate,
      'feedback'
    );
    
    if (emailSent) {
      console.log('✅ Email sent successfully!');
    } else {
      console.log('❌ Email sending failed');
      console.log('   Check SMTP configuration in .env.local');
    }
    
    // Test user confirmation email
    console.log('\n4️⃣ Sending confirmation email to user...');
    const confirmationTemplate = {
      subject: 'We received your feedback - ' + feedbackData.referenceId,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Thank you for your feedback!</h2>
          <p>Hi ${feedbackData.userName},</p>
          <p>We have received your feedback and will review it shortly.</p>
          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Reference ID:</strong> ${feedbackData.referenceId}</p>
            <p><strong>Title:</strong> ${feedbackData.title}</p>
            <p><strong>Type:</strong> ${feedbackData.type}</p>
          </div>
          <p>You can use the reference ID above to track the status of your feedback.</p>
          <p>Best regards,<br>The BoardGuru Team</p>
        </div>
      `,
      text: `Thank you for your feedback! Reference ID: ${feedbackData.referenceId}`
    };
    
    const userEmailSent = await notificationService.sendEmail(
      feedbackData.userEmail,
      confirmationTemplate,
      'feedback_confirmation'
    );
    
    if (userEmailSent) {
      console.log('✅ Confirmation email sent to user');
    } else {
      console.log('⚠️  User confirmation email not sent');
    }
    
    console.log('\n==============================================');
    console.log('✅ Test completed');
    console.log('\n📝 Next Steps:');
    console.log('1. Check if hirendra.vikram@boardguru.ai received the test email');
    console.log('2. If not, verify SMTP settings in .env.local');
    console.log('3. Create the feedback_submissions table in Supabase Dashboard');
    console.log('   SQL is in: scripts/create-feedback-table.sql');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testFeedbackSystem();