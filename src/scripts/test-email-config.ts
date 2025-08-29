#!/usr/bin/env node

/**
 * Test Email Configuration
 * Verifies SMTP settings and sends a test email
 */

import nodemailer from 'nodemailer'
import { env, getSmtpConfig, isEmailServiceConfigured, getAppUrl } from '../config/environment'

async function testEmailConfig() {
  console.log('📧 Testing Email Configuration\n')
  
  // Check if email service is configured
  if (!isEmailServiceConfigured()) {
    console.error('❌ Email service is not configured!')
    console.log('\n⚠️  Missing environment variables:')
    console.log(`   SMTP_HOST: ${env.SMTP_HOST ? '✅' : '❌ Not set'}`)
    console.log(`   SMTP_USER: ${env.SMTP_USER ? '✅' : '❌ Not set'}`)
    console.log(`   SMTP_PASS: ${env.SMTP_PASS ? '✅' : '❌ Not set'}`)
    console.log(`   SMTP_PORT: ${env.SMTP_PORT || '587 (default)'}`)
    console.log(`   ADMIN_EMAIL: ${env.ADMIN_EMAIL || 'Not set'}`)
    
    console.log('\n💡 To fix this:')
    console.log('1. Add the following to your .env.local file:')
    console.log('   SMTP_HOST=smtp.gmail.com')
    console.log('   SMTP_USER=your-email@gmail.com')
    console.log('   SMTP_PASS=your-app-password')
    console.log('   SMTP_PORT=587')
    console.log('   ADMIN_EMAIL=admin@yourdomain.com')
    console.log('\n2. For Gmail, use an App Password:')
    console.log('   https://support.google.com/accounts/answer/185833')
    return
  }
  
  console.log('✅ Email service is configured')
  console.log('   SMTP Host:', env.SMTP_HOST)
  console.log('   SMTP Port:', env.SMTP_PORT || '587')
  console.log('   SMTP User:', env.SMTP_USER)
  console.log('   Admin Email:', env.ADMIN_EMAIL || 'Not set')
  console.log('')
  
  // Try to create transporter
  const smtpConfig = getSmtpConfig()
  if (!smtpConfig) {
    console.error('❌ Failed to get SMTP configuration')
    return
  }
  
  console.log('📬 Creating email transporter...')
  const transporter = nodemailer.createTransport(smtpConfig)
  
  // Verify connection
  try {
    console.log('🔌 Verifying SMTP connection...')
    await transporter.verify()
    console.log('✅ SMTP connection successful!')
  } catch (error) {
    console.error('❌ SMTP connection failed:', error)
    console.log('\n💡 Common issues:')
    console.log('1. Wrong credentials (check SMTP_USER and SMTP_PASS)')
    console.log('2. Less secure apps blocked (enable 2FA and use App Password)')
    console.log('3. Firewall blocking SMTP port')
    console.log('4. Wrong SMTP host or port')
    return
  }
  
  // Send test email
  const testEmail = env.ADMIN_EMAIL || env.SMTP_USER
  console.log(`\n📮 Sending test email to ${testEmail}...`)
  
  try {
    const info = await transporter.sendMail({
      from: `"BoardGuru Test" <${env.SMTP_USER}>`,
      to: testEmail,
      subject: '🧪 Test Email from BoardGuru',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Test Email Successful!</h2>
          <p>This is a test email from your BoardGuru application.</p>
          <p>If you're seeing this, your email configuration is working correctly.</p>
          <hr>
          <p><strong>Configuration Details:</strong></p>
          <ul>
            <li>SMTP Host: ${env.SMTP_HOST}</li>
            <li>SMTP Port: ${env.SMTP_PORT || '587'}</li>
            <li>From: ${env.SMTP_USER}</li>
            <li>App URL: ${getAppUrl()}</li>
          </ul>
          <p>Your approval emails should now be working!</p>
        </div>
      `
    })
    
    console.log('✅ Test email sent successfully!')
    console.log('   Message ID:', info.messageId)
    console.log('   Accepted:', info.accepted)
    
    console.log('\n🎉 Email configuration is working correctly!')
    console.log('   Approval emails will be sent when users are approved.')
    
  } catch (error) {
    console.error('❌ Failed to send test email:', error)
    console.log('\n💡 Check your spam folder if the email doesn\'t arrive.')
  }
}

testEmailConfig().catch(console.error)