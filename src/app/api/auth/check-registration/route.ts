import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { z } from 'zod'
import {
  createSuccessResponse,
  createErrorResponse,
  addSecurityHeaders,
  validateRequestMethod
} from '@/lib/api-response'

const requestSchema = z.object({
  email: z.string().email('Valid email is required')
})

async function handleCheckRegistration(request: NextRequest) {
  // Validate request method
  if (!validateRequestMethod(request, ['POST'])) {
    return createErrorResponse('Method not allowed', 405)
  }

  try {
    // Parse and validate request body
    const body = await request.json()
    const { email } = requestSchema.parse(body)
    
    // Normalize email for consistent queries
    const normalizedEmail = email.toLowerCase().trim()

    // Use admin client to bypass RLS policies
    // Check if user exists in registration_requests and is approved
    const { data: registrationData, error: regError } = await supabaseAdmin
      .from('registration_requests')
      .select('status, email, full_name')
      .eq('email', normalizedEmail)
      .single()

    // If no registration found, return not found
    if (regError || !registrationData) {
      return createSuccessResponse({
        exists: false,
        approved: false,
        needsPasswordSetup: false
      })
    }

    // Check if registration is approved
    const isApproved = registrationData.status === 'approved'
    
    // If approved, check if user needs password setup
    let needsPasswordSetup = false
    if (isApproved) {
      const { data: userData } = await supabaseAdmin
        .from('users')
        .select('password_set')
        .eq('email', normalizedEmail)
        .single()
      
      // User needs password setup if:
      // 1. No user record exists yet, OR
      // 2. User exists but password_set is false
      needsPasswordSetup = !userData || userData.password_set === false
    }

    return createSuccessResponse({
      exists: true,
      approved: isApproved,
      needsPasswordSetup,
      fullName: registrationData.full_name
    })

  } catch (error) {
    console.error('Check registration error:', error)
    return createErrorResponse(
      error instanceof Error ? error.message : 'Failed to check registration status',
      500
    )
  }
}

export async function POST(request: NextRequest) {
  const response = await handleCheckRegistration(request)
  return addSecurityHeaders(response)
}