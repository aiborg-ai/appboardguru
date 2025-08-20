import { NextRequest } from 'next/server'
import { 
  createOrganization,
  type CreateOrganizationData
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
import {
  CreateOrganizationRequest,
  OrganizationCreationResponse,
  INDUSTRIES,
  ORGANIZATION_SIZES
} from '@/features/organizations/types'

// Rate limiter for organization creation
const createOrgRateLimiter = new RateLimiter(5, 3, 60 * 60 * 1000) // 3 per hour per IP

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
 * Validate organization creation request
 */
function validateCreateRequest(data: any): { isValid: boolean; errors: string[]; sanitizedData?: CreateOrganizationRequest } {
  const errors: string[] = []

  // Validate organization details
  if (!data.organizationDetails || typeof data.organizationDetails !== 'object') {
    errors.push('Organization details are required')
  } else {
    const org = data.organizationDetails

    if (!org.name || typeof org.name !== 'string') {
      errors.push('Organization name is required')
    } else if (org.name.length < 2 || org.name.length > 100) {
      errors.push('Organization name must be between 2 and 100 characters')
    }

    if (!org.slug || typeof org.slug !== 'string') {
      errors.push('Organization slug is required')
    } else if (!/^[a-z0-9-]+$/.test(org.slug)) {
      errors.push('Organization slug must contain only lowercase letters, numbers, and hyphens')
    } else if (org.slug.length < 2 || org.slug.length > 50) {
      errors.push('Organization slug must be between 2 and 50 characters')
    }

    if (org.description && (typeof org.description !== 'string' || org.description.length > 500)) {
      errors.push('Description must be a string with maximum 500 characters')
    }

    if (org.website && typeof org.website !== 'string') {
      errors.push('Website must be a string')
    }

    if (org.industry && !INDUSTRIES.map(i => i.toLowerCase()).includes(org.industry.toLowerCase())) {
      errors.push('Invalid industry selection')
    }

    if (org.organizationSize && !ORGANIZATION_SIZES.map(s => s.value).includes(org.organizationSize)) {
      errors.push('Invalid organization size')
    }
  }

  // Validate asset settings
  if (!data.assetSettings || typeof data.assetSettings !== 'object') {
    errors.push('Asset settings are required')
  } else {
    const assets = data.assetSettings

    if (!Array.isArray(assets.categories) || assets.categories.length === 0) {
      errors.push('At least one asset category is required')
    }

    if (typeof assets.storageLimit !== 'number' || assets.storageLimit <= 0) {
      errors.push('Storage limit must be a positive number')
    }

    if (typeof assets.approvalWorkflow !== 'boolean') {
      errors.push('Approval workflow setting must be boolean')
    }

    if (typeof assets.aiProcessing !== 'boolean') {
      errors.push('AI processing setting must be boolean')
    }

    if (!['organization', 'restricted', 'private'].includes(assets.defaultPermissions)) {
      errors.push('Invalid default permissions setting')
    }
  }

  // Validate compliance settings
  if (!data.complianceSettings || typeof data.complianceSettings !== 'object') {
    errors.push('Compliance settings are required')
  }

  // Validate members
  if (!data.members || typeof data.members !== 'object') {
    errors.push('Members configuration is required')
  } else {
    if (!Array.isArray(data.members.existing)) {
      errors.push('Existing members must be an array')
    }

    if (!Array.isArray(data.members.invitations)) {
      errors.push('Member invitations must be an array')
    }

    // Validate invitation emails
    if (data.members.invitations.length > 0) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      for (const invitation of data.members.invitations) {
        if (!invitation.email || !emailRegex.test(invitation.email)) {
          errors.push(`Invalid email address: ${invitation.email}`)
        }
        if (!invitation.fullName || invitation.fullName.trim().length === 0) {
          errors.push(`Full name is required for invitation: ${invitation.email}`)
        }
        if (!['owner', 'admin', 'member', 'viewer'].includes(invitation.role)) {
          errors.push(`Invalid role for invitation: ${invitation.email}`)
        }
      }
    }
  }

  if (errors.length > 0) {
    return { isValid: false, errors }
  }

  return {
    isValid: true,
    errors: [],
    sanitizedData: {
      organizationDetails: {
        name: data.organizationDetails.name.trim(),
        slug: data.organizationDetails.slug.toLowerCase().trim(),
        description: data.organizationDetails.description?.trim() || '',
        industry: data.organizationDetails.industry?.trim() || '',
        organizationSize: data.organizationDetails.organizationSize,
        website: data.organizationDetails.website?.trim() || '',
        logoUrl: data.organizationDetails.logoUrl?.trim(),
      },
      assetSettings: data.assetSettings,
      members: {
        existing: data.members.existing || [],
        invitations: data.members.invitations || [],
      },
      complianceSettings: data.complianceSettings,
      notificationSettings: data.notificationSettings || {
        emailUpdates: true,
        securityAlerts: true,
        weeklyReports: false,
      },
    }
  }
}

/**
 * POST /api/organizations/create - Create organization with full wizard data
 */
async function handleCreateOrganizationWizard(request: NextRequest) {
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

  // Validate wizard data
  const validation = validateCreateRequest(body)
  if (!validation.isValid) {
    return createValidationErrorResponse(validation.errors)
  }

  const { sanitizedData } = validation
  if (!sanitizedData) {
    return createErrorResponse('Data validation failed', 500)
  }

  try {
    // Prepare organization data for database
    const organizationData: CreateOrganizationData = {
      name: sanitizedData.organizationDetails.name,
      slug: sanitizedData.organizationDetails.slug,
      description: sanitizedData.organizationDetails.description,
      logo_url: sanitizedData.organizationDetails.logoUrl,
      website: sanitizedData.organizationDetails.website,
      industry: sanitizedData.organizationDetails.industry,
      organization_size: sanitizedData.organizationDetails.organizationSize,
      settings: {
        asset_management: sanitizedData.assetSettings,
        notifications: sanitizedData.notificationSettings,
      },
      compliance_settings: sanitizedData.complianceSettings,
      billing_settings: {
        plan_type: 'free',
        storage_limit_gb: sanitizedData.assetSettings.storageLimit,
      }
    }

    // Create the organization
    const result = await createOrganization(organizationData, body.createdBy)

    if (!result.success) {
      return createErrorResponse(result.error || 'Failed to create organization', 400)
    }

    // TODO: Send member invitations
    let invitationsSent = 0
    if (sanitizedData.members.invitations.length > 0) {
      // TODO: Implement invitation sending logic
      // This would involve creating invitation records and sending emails
      console.log(`Would send ${sanitizedData.members.invitations.length} invitations:`, 
        sanitizedData.members.invitations.map(inv => inv.email))
      invitationsSent = sanitizedData.members.invitations.length
    }

    // TODO: Add existing members to organization
    if (sanitizedData.members.existing.length > 0) {
      // TODO: Implement logic to add existing members
      console.log(`Would add ${sanitizedData.members.existing.length} existing members:`,
        sanitizedData.members.existing.map(member => member.email))
    }

    const response: OrganizationCreationResponse = {
      success: true,
      organization: {
        id: result.organization!.id,
        name: result.organization!.name,
        slug: result.organization!.slug,
      },
      invitationsSent,
    }

    const apiResponse = createSuccessResponse(
      response,
      'Organization created successfully'
    )

    return addSecurityHeaders(apiResponse)
  } catch (error) {
    console.error('Error creating organization:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

/**
 * Route handlers
 */
async function handleOrganizationCreate(request: NextRequest) {
  const allowedMethods = ['POST']
  if (!validateRequestMethod(request, allowedMethods)) {
    return createErrorResponse('Method not allowed', 405)
  }

  try {
    switch (request.method) {
      case 'POST':
        return await handleCreateOrganizationWizard(request)
      default:
        return createErrorResponse('Method not allowed', 405)
    }
  } catch (error) {
    console.error('Unexpected error in organization create API:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

// Export route handlers
export const POST = withErrorHandling(handleOrganizationCreate)