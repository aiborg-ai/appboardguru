import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAppUrl } from '@/config/environment'

/**
 * Simplified approval route that bypasses user creation complexities
 * This focuses on just approving the registration and creating a basic user
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const id = url.searchParams.get('id')
  const token = url.searchParams.get('token')
  
  console.log('🎯 SIMPLIFIED APPROVAL:', { id, tokenProvided: !!token })
  
  if (!id || !token) {
    const errorUrl = `${getAppUrl()}/approval-result?type=error&title=Missing Parameters&message=Registration ID or token missing`
    return NextResponse.redirect(errorUrl, 302)
  }
  
  try {
    // 1. Get the registration
    const { data: registration, error: fetchError } = await supabaseAdmin
      .from('registration_requests')
      .select('*')
      .eq('id', id)
      .single()
    
    if (fetchError || !registration) {
      console.error('Registration not found:', fetchError)
      const errorUrl = `${getAppUrl()}/approval-result?type=error&title=Not Found&message=Registration request not found`
      return NextResponse.redirect(errorUrl, 302)
    }
    
    // 2. Verify token
    if (registration.approval_token !== token) {
      console.error('Token mismatch')
      const errorUrl = `${getAppUrl()}/approval-result?type=error&title=Invalid Token&message=Security token does not match`
      return NextResponse.redirect(errorUrl, 302)
    }
    
    // 3. Check if already processed
    if (registration.status !== 'pending') {
      const warningUrl = `${getAppUrl()}/approval-result?type=warning&title=Already Processed&message=This registration has already been ${registration.status}`
      return NextResponse.redirect(warningUrl, 302)
    }
    
    // 4. Update registration status
    const { error: updateError } = await supabaseAdmin
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
    
    // 5. Try to create auth user (but don't fail if it doesn't work)
    let userCreated = false
    let userId = null
    
    try {
      // First check if user already exists
      const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers()
      const userExists = existingUser?.users?.some(u => u.email === registration.email)
      
      if (!userExists) {
        // Create new auth user
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: registration.email,
          email_confirm: true,
          user_metadata: {
            full_name: registration.full_name,
            company: registration.company,
            position: registration.position
          }
        })
        
        if (authError) {
          console.error('Auth user creation error:', authError)
        } else if (authUser?.user) {
          userId = authUser.user.id
          userCreated = true
          
          // Try to create users table record
          try {
            const { error: userTableError } = await supabaseAdmin
              .from('users')
              .insert({
                id: userId,
                email: registration.email,
                full_name: registration.full_name,
                status: 'approved',
                role: 'director', // Valid values: director, admin, pending
                password_set: false,
                company: registration.company,
                position: registration.position,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
            
            if (userTableError) {
              // Try to update if already exists
              if (userTableError.code === '23505') {
                await supabaseAdmin
                  .from('users')
                  .update({
                    status: 'approved',
                    role: 'director',
                    password_set: false,
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', userId)
              } else {
                console.error('Users table error:', userTableError)
              }
            }
          } catch (e) {
            console.error('Users table operation failed:', e)
          }
        }
      } else {
        console.log('User already exists for:', registration.email)
      }
    } catch (error) {
      console.error('User creation error:', error)
    }
    
    // 6. Success - registration is approved regardless of user creation
    const message = userCreated 
      ? `${registration.full_name} has been approved and their account has been created`
      : `${registration.full_name} has been approved. User account setup may be required.`
    
    const successUrl = `${getAppUrl()}/approval-result?type=success&title=Registration Approved&message=${encodeURIComponent(message)}&email=${encodeURIComponent(registration.email)}`
    
    return NextResponse.redirect(successUrl, 302)
    
  } catch (error) {
    console.error('Approval error:', error)
    const errorUrl = `${getAppUrl()}/approval-result?type=error&title=System Error&message=An unexpected error occurred`
    return NextResponse.redirect(errorUrl, 302)
  }
}