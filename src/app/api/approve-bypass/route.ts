import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAppUrl, env, getSmtpConfig, isEmailServiceConfigured } from '@/config/environment'
import nodemailer from 'nodemailer'
import { createOtpCode } from '@/lib/otp'
import { generatePasswordSetupMagicLink } from '@/lib/supabase-admin'

/**
 * Bypass approval route that approves without creating user
 * This allows approval to succeed even if user creation fails
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const id = url.searchParams.get('id')
  const token = url.searchParams.get('token')
  const createUser = url.searchParams.get('createUser') !== 'false'
  
  console.log('🔧 BYPASS APPROVAL:', { id, tokenProvided: !!token, createUser })
  
  if (!id || !token) {
    const errorUrl = `${getAppUrl()}/approval-result?type=error&title=Missing Parameters&message=Registration ID or token missing`
    return NextResponse.redirect(errorUrl, 302)
  }
  
  try {
    // Create a fresh Supabase client with service role
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !serviceKey) {
      console.error('Missing Supabase configuration')
      const errorUrl = `${getAppUrl()}/approval-result?type=error&title=Configuration Error&message=Server configuration incomplete`
      return NextResponse.redirect(errorUrl, 302)
    }
    
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
    
    // 1. Get the registration
    const { data: registration, error: fetchError } = await supabase
      .from('registration_requests')
      .select('*')
      .eq('id', id)
      .single()
    
    if (fetchError || !registration) {
      console.error('Registration not found:', fetchError)
      const errorUrl = `${getAppUrl()}/approval-result?type=error&title=Not Found&message=Registration request not found`
      return NextResponse.redirect(errorUrl, 302)
    }
    
    // 2. Verify token (optional - can skip with &skipToken=true)
    const skipToken = url.searchParams.get('skipToken') === 'true'
    if (!skipToken && registration.approval_token !== token) {
      console.error('Token mismatch')
      const errorUrl = `${getAppUrl()}/approval-result?type=error&title=Invalid Token&message=Security token does not match`
      return NextResponse.redirect(errorUrl, 302)
    }
    
    // 3. Check if already processed
    if (registration.status !== 'pending') {
      const warningUrl = `${getAppUrl()}/approval-result?type=warning&title=Already Processed&message=This registration has already been ${registration.status}`
      return NextResponse.redirect(warningUrl, 302)
    }
    
    // 4. Update registration status ONLY
    const { error: updateError } = await supabase
      .from('registration_requests')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        approval_token: null
      })
      .eq('id', id)
    
    if (updateError) {
      console.error('Failed to update registration:', updateError)
      const errorUrl = `${getAppUrl()}/approval-result?type=error&title=Update Failed&message=Could not update registration status`
      return NextResponse.redirect(errorUrl, 302)
    }
    
    console.log('✅ Registration approved successfully')
    
    // 5. Optionally try to create user (but don't fail if it doesn't work)
    let userMessage = ''
    if (createUser) {
      try {
        // Check if user already exists
        const { data: authListData } = await supabase.auth.admin.listUsers()
        const userExists = authListData?.users?.some(u => u.email === registration.email)
        
        if (!userExists) {
          const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
            email: registration.email,
            email_confirm: true,
            user_metadata: {
              full_name: registration.full_name
            }
          })
          
          if (authError) {
            console.error('User creation failed (non-fatal):', authError)
            userMessage = ' (Manual user setup required)'
          } else if (authUser?.user) {
            console.log('User created:', authUser.user.id)
            userMessage = ' and user account created'
            
            // Try to add to users table (don't fail if it doesn't work)
            try {
              await supabase
                .from('users')
                .insert({
                  id: authUser.user.id,
                  email: registration.email,
                  full_name: registration.full_name,
                  status: 'approved',
                  role: 'director',
                  password_set: false,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                })
            } catch (e) {
              console.log('Users table insert failed (non-fatal):', e)
            }
          }
        } else {
          userMessage = ' (User already exists)'
        }
      } catch (e) {
        console.error('User creation error (non-fatal):', e)
        userMessage = ' (Manual user setup may be required)'
      }
    }
    
    // 6. Success - registration is approved
    const message = `${registration.full_name} has been approved${userMessage}`
    const successUrl = `${getAppUrl()}/approval-result?type=success&title=Registration Approved&message=${encodeURIComponent(message)}&email=${encodeURIComponent(registration.email)}`
    
    return NextResponse.redirect(successUrl, 302)
    
  } catch (error) {
    console.error('Bypass approval error:', error)
    const errorUrl = `${getAppUrl()}/approval-result?type=error&title=System Error&message=An unexpected error occurred`
    return NextResponse.redirect(errorUrl, 302)
  }
}