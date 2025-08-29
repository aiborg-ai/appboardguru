/**
 * Registration Request API Endpoint
 * Agent: API-03 (API Conductor)
 * Purpose: Handle registration form submissions using repository pattern
 */

import { NextRequest, NextResponse } from 'next/server';
import { RegistrationService } from '@/lib/services/registration.service';
import { RateLimiter } from '@/lib/security/rate-limiter';
import {
  createSuccessResponse,
  createErrorResponse,
  createValidationErrorResponse,
  createRateLimitErrorResponse,
  withErrorHandling,
  addSecurityHeaders,
  validateRequestMethod,
  getClientIP
} from '@/lib/api-response';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// Validation schema for registration data
const registrationSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100),
  email: z.string().email('Valid email is required'),
  company: z.string().min(2, 'Company name must be at least 2 characters').max(100),
  position: z.string().min(2, 'Position must be at least 2 characters').max(100),
  message: z.string().max(500).optional().nullable(),
});

// Rate limiter: 5 registration attempts per 15 minutes per IP
const registrationRateLimiter = new RateLimiter(5, 5, 15 * 60 * 1000);

// Service instance (singleton)
let registrationService: RegistrationService | null = null;

function getRegistrationService(): RegistrationService {
  if (!registrationService) {
    registrationService = new RegistrationService();
  }
  return registrationService;
}

async function handleRegistrationRequest(request: NextRequest) {
  // Validate request method
  if (!validateRequestMethod(request, ['POST'])) {
    return createErrorResponse('Method not allowed', 405);
  }

  // Check rate limiting
  const clientIP = getClientIP(request);
  if (!registrationRateLimiter.isAllowed(clientIP)) {
    console.log(`Rate limit exceeded for IP: ${clientIP}`);
    return createRateLimitErrorResponse(900); // 15 minutes
  }

  try {
    // Parse request body
    const body = await request.json();

    // Validate input data
    const validation = registrationSchema.safeParse(body);
    if (!validation.success) {
      const errors = validation.error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));
      return createValidationErrorResponse(errors);
    }

    const { fullName, email, company, position, message } = validation.data;

    // Use registration service to handle the request
    const service = getRegistrationService();
    const result = await service.submitRegistration({
      email,
      full_name: fullName,
      company,
      position,
      message: message || undefined
    });

    if (!result.success) {
      // Handle specific error types
      const errorMessage = result.error?.message || 'Failed to submit registration request';
      
      // Check for specific error conditions
      if (errorMessage.includes('already pending')) {
        return createErrorResponse(errorMessage, 409); // Conflict
      }
      
      if (errorMessage.includes('already been approved')) {
        return createErrorResponse(errorMessage, 409); // Conflict
      }

      if (errorMessage.includes('Invalid registration data')) {
        return createErrorResponse(errorMessage, 400); // Bad Request
      }

      // Generic error
      return createErrorResponse(errorMessage, 500);
    }

    // Success response
    const response = createSuccessResponse(
      {
        registrationId: result.data.registrationId,
        email: result.data.email,
        status: result.data.status,
        message: result.data.message
      },
      result.data.message
    );

    return addSecurityHeaders(response);

  } catch (error) {
    console.error('Registration endpoint error:', error);
    
    if (error instanceof SyntaxError) {
      return createErrorResponse('Invalid JSON in request body', 400);
    }
    
    if (error instanceof Error) {
      // Log detailed error for debugging
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });

      // Don't expose internal error details to client
      return createErrorResponse('An error occurred while processing your registration', 500);
    }
    
    return createErrorResponse('An unexpected error occurred', 500);
  }
}

// Export the POST handler with error handling wrapper
export const POST = withErrorHandling(handleRegistrationRequest);

// Handle other HTTP methods
export async function GET() {
  return createErrorResponse('Method not allowed', 405);
}

export async function PUT() {
  return createErrorResponse('Method not allowed', 405);
}

export async function DELETE() {
  return createErrorResponse('Method not allowed', 405);
}