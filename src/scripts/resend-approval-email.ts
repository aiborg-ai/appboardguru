#!/usr/bin/env node

/**
 * Resend Approval Email with Correct URL
 * Fixes the URL mismatch issue by resending emails with current environment URL
 */

import { supabaseAdmin } from '../lib/supabase-admin'
import nodemailer from 'nodemailer'
import { env, getSmtpConfig, getAppUrl } from '@/config/environment'
import { generateApprovalUrls } from '@/utils/url'
import crypto from 'crypto'

async function resendApprovalEmail(registrationId?: string) {
  console.log('📧 Resending Approval Email with Correct URL\n')
  
  // Get the registration
  let query = supabaseAdmin
    .from('registration_requests')
    .select('*')
    .eq('status', 'pending')
  
  if (registrationId) {
    query = query.eq('id', registrationId)
  } else {
    query = query.limit(1)
  }
  
  const { data: registrations, error } = await query
  
  if (error || !registrations || registrations.length === 0) {
    console.error('❌ No pending registrations found')
    return
  }
  
  const registration = registrations[0]
  
  console.log('📋 Registration Details:')
  console.log('  Email:', registration.email)
  console.log('  Name:', registration.full_name)
  console.log('  Company:', registration.company)
  console.log('  ID:', registration.id)
  console.log('')
  
  // Generate new token if needed
  let token = registration.approval_token
  if (!token) {
    token = crypto.randomBytes(32).toString('hex')
    const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
    
    // Update with new token
    const { error: updateError } = await supabaseAdmin
      .from('registration_requests')
      .update({
        approval_token: token,
        token_expires_at: tokenExpiresAt.toISOString()
      })
      .eq('id', registration.id)
    
    if (updateError) {
      console.error('❌ Failed to update token:', updateError)
      return
    }
    console.log('✅ Generated new approval token')
  }
  
  // Generate URLs with current environment
  const currentAppUrl = getAppUrl()
  const { approveUrl, rejectUrl } = generateApprovalUrls(registration.id!, token)
  
  console.log('🔗 Generated URLs:')
  console.log('  App URL:', currentAppUrl)
  console.log('  Approve:', approveUrl)
  console.log('  Reject:', rejectUrl)
  console.log('')
  
  // Send email
  try {
    const transporter = nodemailer.createTransport(getSmtpConfig())
    
    await transporter.sendMail({
      from: `"BoardGuru Platform" <${env.SMTP_USER}>`,
      to: env.ADMIN_EMAIL,
      subject: `🔔 [RESENT] Registration Request - ${registration.full_name}`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
            <strong>⚠️ This is a RESENT approval email with corrected URLs</strong>
          </div>
          <h2>Registration Request (Resent)</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0;"><strong>Name:</strong></td><td>${registration.full_name}</td></tr>
            <tr><td style="padding: 8px 0;"><strong>Email:</strong></td><td>${registration.email}</td></tr>
            <tr><td style="padding: 8px 0;"><strong>Company:</strong></td><td>${registration.company}</td></tr>
            <tr><td style="padding: 8px 0;"><strong>Position:</strong></td><td>${registration.position}</td></tr>
            ${registration.message ? `<tr><td style="padding: 8px 0;"><strong>Message:</strong></td><td>${registration.message}</td></tr>` : ''}
          </table>
          <div style="margin-top: 30px;">
            <a href="${approveUrl}" style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-right: 10px;">Approve</a>
            <a href="${rejectUrl}" style="background: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reject</a>
          </div>
          <div style="margin-top: 20px; padding: 12px; background: #f3f4f6; border-radius: 6px;">
            <p style="margin: 0; font-size: 12px; color: #6b7280;">
              <strong>Debug Info:</strong><br>
              Current Environment URL: ${currentAppUrl}<br>
              Registration ID: ${registration.id}<br>
              Token Length: ${token.length} chars
            </p>
          </div>
        </div>
      `
    })
    
    console.log('✅ Email sent successfully to:', env.ADMIN_EMAIL)
    console.log('')
    console.log('📝 Next Steps:')
    console.log('  1. Check your admin email for the new approval email')
    console.log('  2. Click the Approve button in the email')
    console.log('  3. The link should now work with your current environment')
    
  } catch (error) {
    console.error('❌ Failed to send email:', error)
  }
}

// Get registration ID from command line if provided
const registrationId = process.argv[2]
resendApprovalEmail(registrationId).catch(console.error)