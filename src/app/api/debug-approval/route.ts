import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAppUrl } from '@/config/environment'

/**
 * Debug Approval Link
 * This endpoint helps diagnose why an approval link might not be working
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const token = searchParams.get('token')
  
  const diagnostics = {
    timestamp: new Date().toISOString(),
    request: {
      id: id || 'missing',
      tokenProvided: !!token,
      tokenLength: token?.length || 0,
      requestUrl: request.url,
      headers: Object.fromEntries(request.headers.entries())
    },
    environment: {
      currentAppUrl: getAppUrl(),
      nodeEnv: process.env.NODE_ENV || 'not set',
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    },
    validation: {
      idFormat: false,
      registrationFound: false,
      tokenValid: false,
      status: 'unknown'
    },
    registration: null as any,
    suggestions: [] as string[]
  }
  
  // Validate ID format
  if (id) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    diagnostics.validation.idFormat = uuidRegex.test(id)
    
    if (!diagnostics.validation.idFormat) {
      diagnostics.suggestions.push('The registration ID format is invalid. It should be a UUID.')
    }
  } else {
    diagnostics.suggestions.push('No registration ID provided in the URL.')
  }
  
  if (!token) {
    diagnostics.suggestions.push('No security token provided in the URL.')
  }
  
  // Try to fetch the registration if ID is valid
  if (id && diagnostics.validation.idFormat) {
    try {
      const { data, error } = await supabaseAdmin
        .from('registration_requests')
        .select('*')
        .eq('id', id)
        .single()
      
      if (data) {
        diagnostics.validation.registrationFound = true
        diagnostics.registration = {
          id: data.id,
          email: data.email,
          name: data.full_name,
          status: data.status,
          hasToken: !!data.approval_token,
          tokenMatches: token ? data.approval_token === token : false,
          createdAt: data.created_at,
          reviewedAt: data.reviewed_at
        }
        diagnostics.validation.status = data.status
        diagnostics.validation.tokenValid = token ? data.approval_token === token : false
        
        // Generate suggestions based on findings
        if (data.status !== 'pending') {
          diagnostics.suggestions.push(`This registration has already been ${data.status}.`)
        }
        
        if (!data.approval_token) {
          diagnostics.suggestions.push('This registration has no approval token set. It may have been cleared after use.')
        } else if (token && data.approval_token !== token) {
          diagnostics.suggestions.push('The provided token does not match the stored token.')
        }
        
        if (data.token_expires_at && new Date(data.token_expires_at) < new Date()) {
          diagnostics.suggestions.push('The approval token has expired.')
        }
        
      } else {
        diagnostics.suggestions.push('No registration found with this ID in the database.')
      }
    } catch (error) {
      diagnostics.suggestions.push('Database error occurred while fetching registration.')
    }
  }
  
  // Add resolution suggestions
  if (diagnostics.suggestions.length === 0) {
    diagnostics.suggestions.push('The approval link appears to be valid. Try using the approval endpoint.')
  } else {
    diagnostics.suggestions.push('To fix this issue, you can:')
    diagnostics.suggestions.push('1. Run: npx tsx src/scripts/resend-approval-email.ts ' + id)
    diagnostics.suggestions.push('2. This will resend the approval email with the correct URL')
  }
  
  return NextResponse.json(diagnostics, { 
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    }
  })
}