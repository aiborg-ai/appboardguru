import { NextRequest } from 'next/server'
import { checkOrganizationSlugAvailability } from '@/lib/services/organization'
import { RateLimiter } from '@/lib/security'
import {
  createSuccessResponse,
  createErrorResponse,
  createValidationErrorResponse,
  createRateLimitErrorResponse,
  withErrorHandling,
  addSecurityHeaders,
  validateRequestMethod,
  getClientIP
} from '@/lib/api-response'

// Rate limiter for slug checking
const slugCheckRateLimiter = new RateLimiter(100, 50, 60 * 1000) // 50 requests per minute per IP

/**
 * Get device information from request
 */
function getDeviceInfo(request: NextRequest) {
  return {
    userAgent: request.headers.get('user-agent') || 'Unknown',
    fingerprint: request.headers.get('x-device-fingerprint') || 'unknown',
    ip: getClientIP(request)
  }
}

/**
 * Validate slug format
 */
function validateSlug(slug: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!slug || typeof slug !== 'string') {
    errors.push('Slug is required')
    return { isValid: false, errors }
  }

  if (slug.length < 2 || slug.length > 50) {
    errors.push('Slug must be between 2 and 50 characters')
  }

  if (!/^[a-z0-9-]+$/.test(slug)) {
    errors.push('Slug must contain only lowercase letters, numbers, and hyphens')
  }

  if (slug.startsWith('-') || slug.endsWith('-')) {
    errors.push('Slug cannot start or end with a hyphen')
  }

  if (slug.includes('--')) {
    errors.push('Slug cannot contain consecutive hyphens')
  }

  // Reserved slugs
  const reservedSlugs = [
    'api', 'admin', 'app', 'www', 'mail', 'ftp', 'ssh', 'ssl', 'pop', 'imap',
    'smtp', 'http', 'https', 'dashboard', 'settings', 'help', 'support',
    'about', 'contact', 'privacy', 'terms', 'legal', 'blog', 'news',
    'auth', 'login', 'logout', 'register', 'signup', 'signin', 'account',
    'profile', 'user', 'users', 'organization', 'organizations', 'vault',
    'vaults', 'asset', 'assets', 'board', 'boards', 'member', 'members',
    'invite', 'invites', 'invitation', 'invitations', 'create', 'new', 'edit',
    'delete', 'remove', 'update', 'manage', 'management', 'config', 'configuration'
  ]

  if (reservedSlugs.includes(slug.toLowerCase())) {
    errors.push('This slug is reserved and cannot be used')
  }

  return { isValid: errors.length === 0, errors }
}

/**
 * GET /api/organizations/check-slug - Check if organization slug is available
 */
async function handleCheckSlug(request: NextRequest) {
  const deviceInfo = getDeviceInfo(request)
  
  // Rate limiting
  if (!slugCheckRateLimiter.isAllowed(deviceInfo.ip)) {
    return createRateLimitErrorResponse(60) // 1 minute
  }

  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug')

  if (!slug) {
    return createValidationErrorResponse(['Slug parameter is required'])
  }

  // Validate slug format
  const validation = validateSlug(slug)
  if (!validation.isValid) {
    return createSuccessResponse(
      { 
        available: false, 
        slug,
        reason: 'invalid_format',
        errors: validation.errors 
      },
      'Slug validation completed'
    )
  }

  try {
    const result = await checkOrganizationSlugAvailability(slug)

    if (!result.success) {
      return createErrorResponse(result.error || 'Failed to check slug availability', 500)
    }

    const response = createSuccessResponse(
      { 
        available: result.available,
        slug,
        reason: result.available ? 'available' : 'taken'
      },
      'Slug availability checked successfully'
    )

    return addSecurityHeaders(response)
  } catch (error) {
    console.error('Error checking slug availability:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

/**
 * Route handlers
 */
async function handleSlugCheck(request: NextRequest) {
  const allowedMethods = ['GET']
  if (!validateRequestMethod(request, allowedMethods)) {
    return createErrorResponse('Method not allowed', 405)
  }

  try {
    switch (request.method) {
      case 'GET':
        return await handleCheckSlug(request)
      default:
        return createErrorResponse('Method not allowed', 405)
    }
  } catch (error) {
    console.error('Unexpected error in slug check API:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

// Export route handlers
export const GET = withErrorHandling(handleSlugCheck)