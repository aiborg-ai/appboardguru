#!/usr/bin/env node

/**
 * Test Approval Email Workflow
 * Tests the complete approval process including email sending
 */

import { supabaseAdmin } from '../lib/supabase-admin'
import { createUserSimple } from '../lib/create-user-simple'
import { createOtpCode } from '../lib/otp'
import nodemailer from 'nodemailer'
import { env, getSmtpConfig, isEmailServiceConfigured } from '../config/environment'

async function testApprovalEmail() {
  console.log('🧪 Testing Approval Email Workflow\n')
  
  // Get a pending registration
  const { data: registrations, error } = await supabaseAdmin
    .from('registration_requests')
    .select('*')
    .eq('status', 'pending')
    .limit(1)
  
  if (error || !registrations || registrations.length === 0) {
    console.error('❌ No pending registrations found')
    console.log('\n💡 Create a test registration first:')
    console.log('   npx tsx src/scripts/create-test-registration.ts')
    return
  }
  
  const reg = registrations[0]
  console.log('📋 Found Registration:')
  console.log('   Email:', reg.email)
  console.log('   Name:', reg.full_name)
  console.log('   Status:', reg.status)
  console.log('')
  
  // Check email configuration
  if (!isEmailServiceConfigured()) {
    console.error('❌ Email service not configured')
    console.log('   Run: npx tsx src/scripts/test-email-config.ts')
    return
  }
  
  console.log('✅ Email service configured\n')
  
  // Step 1: Update registration to approved
  console.log('1️⃣ Approving registration...')
  const { error: updateError } = await supabaseAdmin
    .from('registration_requests')
    .update({
      status: 'approved',
      reviewed_at: new Date().toISOString(),
      approval_token: null
    })
    .eq('id', reg.id)
  
  if (updateError) {
    console.error('❌ Failed to approve:', updateError)
    return
  }
  console.log('✅ Registration approved\n')
  
  // Step 2: Create user account
  console.log('2️⃣ Creating user account...')
  const { success: userSuccess, error: userError, userRecord } = await createUserSimple(
    reg.email,
    reg.full_name
  )
  
  if (!userSuccess) {
    console.error('❌ User creation failed:', userError)
    console.log('   Continuing with email test anyway...\n')
  } else {
    console.log('✅ User created:', userRecord?.id)
    console.log('')
  }
  
  // Step 3: Generate OTP code
  console.log('3️⃣ Generating OTP code...')
  const { success: otpSuccess, otpCode } = await createOtpCode(
    reg.email,
    'first_login',
    24
  )
  
  if (!otpSuccess || !otpCode) {
    console.error('❌ OTP generation failed')
  } else {
    console.log('✅ OTP code generated:', otpCode)
  }
  console.log('')
  
  // Step 4: Send approval email
  console.log('4️⃣ Sending approval email...')
  
  const smtpConfig = getSmtpConfig()
  if (!smtpConfig) {
    console.error('❌ SMTP not configured')
    return
  }
  
  try {
    const transporter = nodemailer.createTransport(smtpConfig)
    
    const emailHTML = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #059669;">🎉 Registration Approved!</h1>
        <p>Dear ${reg.full_name},</p>
        <p>Your BoardGuru registration has been approved!</p>
        ${otpCode ? `
          <div style="background: #f0f9ff; border: 2px solid #3b82f6; padding: 20px; margin: 20px 0; text-align: center;">
            <h3>Your Sign-In Code</h3>
            <div style="font-size: 32px; font-weight: bold; color: #1e40af; letter-spacing: 5px;">
              ${otpCode}
            </div>
            <p style="color: #6b7280;">Valid for 24 hours</p>
          </div>
        ` : ''}
        <p>Welcome to BoardGuru!</p>
      </div>
    `
    
    const info = await transporter.sendMail({
      from: `"BoardGuru Platform" <${env.SMTP_USER}>`,
      to: reg.email,
      subject: '🎉 BoardGuru Registration Approved - Welcome!',
      html: emailHTML
    })
    
    console.log('✅ Approval email sent successfully!')
    console.log('   To:', reg.email)
    console.log('   Message ID:', info.messageId)
    console.log('   OTP Code:', otpCode || 'Not included')
    
  } catch (error) {
    console.error('❌ Failed to send email:', error)
  }
  
  console.log('\n✅ Approval email test complete!')
  console.log('   Check the inbox for:', reg.email)
}

testApprovalEmail().catch(console.error)