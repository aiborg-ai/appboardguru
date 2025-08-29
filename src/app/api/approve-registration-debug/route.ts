import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAppUrl } from '@/config/environment'
import { createUserForApprovedRegistration } from '@/lib/supabase-admin'

/**
 * Debug Approval Handler - More forgiving approval endpoint for troubleshooting
 * This endpoint provides detailed debugging information and attempts approval even with partial data
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const token = searchParams.get('token')
  const forceApprove = searchParams.get('force') === 'true'
  
  console.log('🔧 DEBUG Approval Request:', {
    id,
    token: token?.substring(0, 8) + '...',
    forceApprove,
    url: request.url,
    headers: Object.fromEntries(request.headers.entries())
  })
  
  // Build debug response
  const debugInfo: any = {
    timestamp: new Date().toISOString(),
    environment: {
      nodeEnv: process.env.NODE_ENV,
      vercelUrl: process.env.VERCEL_URL,
      appUrl: process.env.APP_URL,
      nextAuthUrl: process.env.NEXTAUTH_URL,
      computedAppUrl: getAppUrl(),
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseAnon: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasSupabaseService: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    },
    request: {
      id,
      tokenProvided: !!token,
      tokenLength: token?.length,
      forceMode: forceApprove
    },
    registration: null,
    errors: [],
    suggestions: []
  }
  
  if (!id) {
    debugInfo.errors.push('No registration ID provided')
    debugInfo.suggestions.push('Check the approval link contains ?id=...')
    return NextResponse.json(debugInfo, { status: 400 })
  }
  
  // Try to fetch registration
  try {
    const { data, error } = await supabaseAdmin
      .from('registration_requests')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) {
      debugInfo.errors.push(`Database error: ${error.message}`)
      debugInfo.dbError = {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      }
      
      if (error.code === 'PGRST116') {
        debugInfo.suggestions.push('Registration not found in database')
        debugInfo.suggestions.push('Check if the ID is correct')
        debugInfo.suggestions.push('Verify the registration exists in your Supabase database')
      }
    } else if (data) {
      debugInfo.registration = {
        id: data.id,
        email: data.email,
        name: data.full_name,
        company: data.company,
        status: data.status,
        hasToken: !!data.approval_token,
        tokenMatches: token ? data.approval_token === token : false,
        createdAt: data.created_at,
        reviewedAt: data.reviewed_at
      }
      
      // Check various conditions
      if (data.status !== 'pending') {
        debugInfo.errors.push(`Registration already ${data.status}`)
        debugInfo.suggestions.push('This registration has already been processed')
      }
      
      if (!data.approval_token) {
        debugInfo.errors.push('No approval token in database')
        debugInfo.suggestions.push('Token may have been cleared after use')
        debugInfo.suggestions.push('Run resend-approval-email.ts to generate new token')
      } else if (token && data.approval_token !== token) {
        debugInfo.errors.push('Token mismatch')
        debugInfo.suggestions.push('The provided token does not match database')
        debugInfo.suggestions.push('Check if you have the latest approval email')
      }
      
      // Force approve if requested and user is found
      if (forceApprove && data.status === 'pending') {
        try {
          // Update registration status
          const { error: updateError } = await supabaseAdmin
            .from('registration_requests')
            .update({
              status: 'approved',
              reviewed_at: new Date().toISOString(),
              approval_token: null,
              token_expires_at: null
            })
            .eq('id', id)
          
          if (updateError) {
            debugInfo.errors.push(`Failed to update: ${updateError.message}`)
          } else {
            debugInfo.forceApprovalResult = 'SUCCESS - Registration approved'
            
            // Try to create user
            try {
              const { success, error: userError } = await createUserForApprovedRegistration(
                data.email,
                data.full_name
              )
              
              if (success) {
                debugInfo.userCreated = true
                debugInfo.message = 'Registration approved and user created successfully!'
              } else {
                debugInfo.userCreated = false
                debugInfo.userError = userError
                debugInfo.message = 'Registration approved but user creation failed'
              }
            } catch (e) {
              debugInfo.userCreated = false
              debugInfo.userError = e
            }
          }
        } catch (e) {
          debugInfo.errors.push(`Force approval failed: ${e}`)
        }
      }
    }
  } catch (e) {
    debugInfo.errors.push(`Unexpected error: ${e}`)
  }
  
  // Add final suggestions
  if (debugInfo.errors.length > 0 && !forceApprove) {
    debugInfo.suggestions.push('To force approval, add &force=true to the URL')
    debugInfo.suggestions.push('Or run: npx tsx src/scripts/resend-approval-email.ts')
  }
  
  // Determine status code
  const statusCode = debugInfo.errors.length > 0 ? 400 : 200
  
  return NextResponse.json(debugInfo, { 
    status: statusCode,
    headers: {
      'Content-Type': 'application/json',
    }
  })
}

export async function POST(request: NextRequest) {
  return GET(request)
}