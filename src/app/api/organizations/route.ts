import { NextRequest } from 'next/server'
import { 
  createOrganization,
  getUserOrganizations,
  updateOrganization,
  deleteOrganization,
  getOrganization,
  type CreateOrganizationData,
  type UpdateOrganizationData
} from '@/lib/services/organization'
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

// Rate limiters
const createOrgRateLimiter = new RateLimiter(10, 5, 60 * 60 * 1000) // 5 per hour per IP
const listOrgRateLimiter = new RateLimiter(50, 30, 60 * 1000) // 30 per minute per IP

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
 * Validate organization data
 */
function validateCreateOrganizationData(data: any): { isValid: boolean; errors: string[]; sanitizedData?: CreateOrganizationData } {
  const errors: string[] = []

  if (!data.name || typeof data.name !== 'string') {
    errors.push('Organization name is required')
  } else if (data.name.length < 2 || data.name.length > 100) {
    errors.push('Organization name must be between 2 and 100 characters')
  }

  if (!data.slug || typeof data.slug !== 'string') {
    errors.push('Organization slug is required')
  } else if (!/^[a-z0-9-]+$/.test(data.slug)) {
    errors.push('Organization slug must contain only lowercase letters, numbers, and hyphens')
  } else if (data.slug.length < 2 || data.slug.length > 50) {
    errors.push('Organization slug must be between 2 and 50 characters')
  }

  if (data.description && (typeof data.description !== 'string' || data.description.length > 500)) {
    errors.push('Description must be a string with maximum 500 characters')
  }

  if (data.website && typeof data.website !== 'string') {
    errors.push('Website must be a string')
  }

  if (data.industry && typeof data.industry !== 'string') {
    errors.push('Industry must be a string')
  }

  if (data.organizationSize && !['startup', 'small', 'medium', 'large', 'enterprise'].includes(data.organizationSize)) {
    errors.push('Invalid organization size')
  }

  if (errors.length > 0) {
    return { isValid: false, errors }
  }

  return {
    isValid: true,
    errors: [],
    sanitizedData: {
      name: data.name.trim(),
      slug: data.slug.toLowerCase().trim(),
      description: data.description?.trim(),
      website: data.website?.trim(),
      industry: data.industry?.trim(),
      organizationSize: data.organizationSize
    }
  }
}

/**
 * POST /api/organizations - Create a new organization
 */
async function handleCreateOrganization(request: NextRequest) {
  const deviceInfo = getDeviceInfo(request)
  
  // Rate limiting
  if (!createOrgRateLimiter.isAllowed(deviceInfo.ip)) {
    return createRateLimitErrorResponse(60 * 60) // 1 hour
  }

  let body: any
  try {
    body = await request.json()
  } catch (error) {
    return createErrorResponse('Invalid JSON in request body', 400)
  }

  // Validate user ID
  if (!body.createdBy || typeof body.createdBy !== 'string') {
    return createValidationErrorResponse(['User ID is required'])
  }

  // Validate organization data
  const validation = validateCreateOrganizationData(body)
  if (!validation.isValid) {
    return createValidationErrorResponse(validation.errors)
  }

  const { sanitizedData } = validation
  if (!sanitizedData) {
    return createErrorResponse('Data validation failed', 500)
  }

  try {
    const result = await createOrganization(sanitizedData, body.createdBy, deviceInfo)

    if (!result.success) {
      return createErrorResponse(result.error || 'Failed to create organization', 400)
    }

    const response = createSuccessResponse(
      result.organization,
      'Organization created successfully'
    )

    return addSecurityHeaders(response)
  } catch (error) {
    console.error('Error creating organization:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

/**
 * GET /api/organizations - List user's organizations or get single organization
 */
async function handleGetOrganizations(request: NextRequest) {
  const deviceInfo = getDeviceInfo(request)
  
  // Rate limiting
  if (!listOrgRateLimiter.isAllowed(deviceInfo.ip)) {
    return createRateLimitErrorResponse(60) // 1 minute
  }

  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')
  const organizationId = searchParams.get('id')

  if (!userId) {
    return createValidationErrorResponse(['User ID is required'])
  }

  try {
    if (organizationId) {
      // Get single organization
      const result = await getOrganization(organizationId, userId)
      
      if (!result.success) {
        return createErrorResponse(result.error || 'Failed to get organization', 400)
      }

      const response = createSuccessResponse(
        result.organization,
        'Organization retrieved successfully'
      )

      return addSecurityHeaders(response)
    } else {
      // Get user's organizations
      const result = await getUserOrganizations(userId)

      if (!result.success) {
        return createErrorResponse(result.error || 'Failed to list organizations', 400)
      }

      const response = createSuccessResponse(
        {
          organizations: result.organizations || [],
          total: result.organizations?.length || 0
        },
        'Organizations retrieved successfully'
      )

      return addSecurityHeaders(response)
    }
  } catch (error) {
    console.error('Error getting organizations:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

/**
 * PUT /api/organizations - Update organization
 */
async function handleUpdateOrganization(request: NextRequest) {
  const deviceInfo = getDeviceInfo(request)
  
  // Rate limiting
  if (!createOrgRateLimiter.isAllowed(deviceInfo.ip)) {
    return createRateLimitErrorResponse(60 * 60) // 1 hour
  }

  let body: any
  try {
    body = await request.json()
  } catch (error) {
    return createErrorResponse('Invalid JSON in request body', 400)
  }

  if (!body.organizationId || typeof body.organizationId !== 'string') {
    return createValidationErrorResponse(['Organization ID is required'])
  }

  if (!body.userId || typeof body.userId !== 'string') {
    return createValidationErrorResponse(['User ID is required'])
  }

  // Extract update data
  const updateData: UpdateOrganizationData = {}
  
  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || body.name.length < 2 || body.name.length > 100) {
      return createValidationErrorResponse(['Organization name must be between 2 and 100 characters'])
    }
    updateData.name = body.name.trim()
  }

  if (body.description !== undefined) {
    if (body.description !== null && (typeof body.description !== 'string' || body.description.length > 500)) {
      return createValidationErrorResponse(['Description must be a string with maximum 500 characters'])
    }
    updateData.description = body.description?.trim()
  }

  if (body.website !== undefined) {
    updateData.website = body.website?.trim()
  }

  if (body.industry !== undefined) {
    updateData.industry = body.industry?.trim()
  }

  if (body.organizationSize !== undefined) {
    if (body.organizationSize && !['startup', 'small', 'medium', 'large', 'enterprise'].includes(body.organizationSize)) {
      return createValidationErrorResponse(['Invalid organization size'])
    }
    updateData.organizationSize = body.organizationSize
  }

  if (body.logoUrl !== undefined) {
    updateData.logoUrl = body.logoUrl?.trim()
  }

  try {
    const result = await updateOrganization(
      body.organizationId,
      updateData,
      body.userId,
      deviceInfo
    )

    if (!result.success) {
      return createErrorResponse(result.error || 'Failed to update organization', 400)
    }

    const response = createSuccessResponse(
      result.organization,
      'Organization updated successfully'
    )

    return addSecurityHeaders(response)
  } catch (error) {
    console.error('Error updating organization:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

/**
 * DELETE /api/organizations - Delete organization
 */
async function handleDeleteOrganization(request: NextRequest) {
  const deviceInfo = getDeviceInfo(request)
  
  const { searchParams } = new URL(request.url)
  const organizationId = searchParams.get('id')
  const userId = searchParams.get('userId')
  const deleteImmediately = searchParams.get('immediate') === 'true'

  if (!organizationId) {
    return createValidationErrorResponse(['Organization ID is required'])
  }

  if (!userId) {
    return createValidationErrorResponse(['User ID is required'])
  }

  try {
    const result = await deleteOrganization(
      organizationId,
      userId,
      deleteImmediately,
      deviceInfo
    )

    if (!result.success) {
      return createErrorResponse(result.error || 'Failed to delete organization', 400)
    }

    const response = createSuccessResponse(
      { 
        organizationId, 
        scheduledDeletion: !deleteImmediately,
        deletionDate: result.deletionDate
      },
      deleteImmediately ? 'Organization deleted immediately' : 'Organization scheduled for deletion'
    )

    return addSecurityHeaders(response)
  } catch (error) {
    console.error('Error deleting organization:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

/**
 * Route handlers
 */
async function handleOrganizations(request: NextRequest) {
  const allowedMethods = ['GET', 'POST', 'PUT', 'DELETE']
  if (!validateRequestMethod(request, allowedMethods)) {
    return createErrorResponse('Method not allowed', 405)
  }

  try {
    switch (request.method) {
      case 'POST':
        return await handleCreateOrganization(request)
      case 'GET':
        return await handleGetOrganizations(request)
      case 'PUT':
        return await handleUpdateOrganization(request)
      case 'DELETE':
        return await handleDeleteOrganization(request)
      default:
        return createErrorResponse('Method not allowed', 405)
    }
  } catch (error) {
    console.error('Unexpected error in organizations API:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

// Export route handlers
export const GET = withErrorHandling(handleOrganizations)
export const POST = withErrorHandling(handleOrganizations)
export const PUT = withErrorHandling(handleOrganizations)
export const DELETE = withErrorHandling(handleOrganizations)