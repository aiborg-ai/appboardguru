#!/usr/bin/env node

/**
 * Resend Approval Email for Production/Vercel Environment
 * This handles the case where you need approval links that work with your deployed app
 */

import { supabaseAdmin } from '../lib/supabase-admin'
import nodemailer from 'nodemailer'
import { env, getSmtpConfig } from '@/config/environment'
import crypto from 'crypto'

async function resendApprovalForProduction(registrationId?: string) {
  console.log('📧 Generating Approval Email for Production Environment\n')
  
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
  
  // Generate URLs for PRODUCTION
  const PRODUCTION_URL = 'https://app-boardguru.vercel.app'
  const approveUrl = `${PRODUCTION_URL}/api/approve-registration?id=${registration.id}&token=${token}`
  const rejectUrl = `${PRODUCTION_URL}/api/reject-registration?id=${registration.id}&token=${token}`
  
  console.log('🔗 Generated Production URLs:')
  console.log('  Production URL:', PRODUCTION_URL)
  console.log('  Approve:', approveUrl)
  console.log('  Reject:', rejectUrl)
  console.log('')
  
  // Send email
  try {
    const transporter = nodemailer.createTransport(getSmtpConfig())
    
    await transporter.sendMail({
      from: `"BoardGuru Platform" <${env.SMTP_USER}>`,
      to: env.ADMIN_EMAIL,
      subject: `🔔 [PRODUCTION] Registration Request - ${registration.full_name}`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #10b981; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h2 style="margin: 0;">Registration Approval Request</h2>
            <p style="margin: 5px 0 0 0; opacity: 0.9;">Production Environment</p>
          </div>
          
          <div style="padding: 30px; background: #f9fafb; border: 1px solid #e5e7eb; border-top: none;">
            <h3 style="margin-top: 0;">Applicant Details:</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0;"><strong>Name:</strong></td><td>${registration.full_name}</td></tr>
              <tr><td style="padding: 8px 0;"><strong>Email:</strong></td><td>${registration.email}</td></tr>
              <tr><td style="padding: 8px 0;"><strong>Company:</strong></td><td>${registration.company}</td></tr>
              <tr><td style="padding: 8px 0;"><strong>Position:</strong></td><td>${registration.position}</td></tr>
              ${registration.message ? `<tr><td style="padding: 8px 0; vertical-align: top;"><strong>Message:</strong></td><td>${registration.message}</td></tr>` : ''}
            </table>
            
            <div style="margin: 30px 0; padding: 20px; background: white; border-radius: 8px;">
              <h4 style="margin-top: 0;">Quick Actions:</h4>
              <div style="display: flex; gap: 10px;">
                <a href="${approveUrl}" style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  ✅ Approve Registration
                </a>
                <a href="${rejectUrl}" style="background: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  ❌ Reject Registration
                </a>
              </div>
            </div>
            
            <div style="margin-top: 20px; padding: 15px; background: #fef3c7; border: 1px solid #fbbf24; border-radius: 6px;">
              <p style="margin: 0; font-size: 14px; color: #92400e;">
                <strong>⚠️ Important:</strong> This approval link is configured for your PRODUCTION environment at Vercel.
                Make sure your production database is synced with these registration requests.
              </p>
            </div>
            
            <div style="margin-top: 20px; padding: 12px; background: #f3f4f6; border-radius: 6px;">
              <p style="margin: 0; font-size: 12px; color: #6b7280;">
                <strong>Technical Details:</strong><br>
                Environment: Production (Vercel)<br>
                Base URL: ${PRODUCTION_URL}<br>
                Registration ID: ${registration.id}<br>
                Token: ${token.substring(0, 8)}...<br>
                Generated: ${new Date().toISOString()}
              </p>
            </div>
          </div>
        </div>
      `
    })
    
    console.log('✅ Email sent successfully to:', env.ADMIN_EMAIL)
    console.log('')
    console.log('📝 IMPORTANT NOTES:')
    console.log('  1. This email contains links for your PRODUCTION environment')
    console.log('  2. The approval will work if your Vercel deployment uses the same database')
    console.log('  3. If using different databases, you need to sync the data first')
    console.log('')
    console.log('🔧 Alternative Solutions:')
    console.log('  - Set APP_URL environment variable in Vercel to match your needs')
    console.log('  - Use the local approval URL if working locally:')
    console.log(`    http://localhost:3000/api/approve-registration?id=${registration.id}&token=${token}`)
    
  } catch (error) {
    console.error('❌ Failed to send email:', error)
  }
}

// Get registration ID from command line if provided
const registrationId = process.argv[2]
resendApprovalForProduction(registrationId).catch(console.error)