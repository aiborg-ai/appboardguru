/**
 * Enhanced Organization Service
 * Provides robust business logic with transaction support,
 * comprehensive error handling, and audit logging
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import { BaseService } from './base.service'
import { 
  EnhancedOrganizationRepository, 
  CreateOrganizationData, 
  CreateOrganizationResult,
  DatabaseError 
} from '@/lib/repositories/enhanced-organization.repository'

// Business logic types
export interface CreateOrganizationRequest {
  name: string
  slug: string
  description?: string
  logo_url?: string
  website?: string
  industry?: string
  organization_size?: 'startup' | 'small' | 'medium' | 'large' | 'enterprise'
  settings?: Record<string, any>
  compliance_settings?: Record<string, any>
  billing_settings?: Record<string, any>
}

export interface UpdateOrganizationRequest {
  name?: string
  slug?: string
  description?: string
  logo_url?: string
  website?: string
  industry?: string
  organization_size?: 'startup' | 'small' | 'medium' | 'large' | 'enterprise'
  settings?: Record<string, any>
  compliance_settings?: Record<string, any>
  billing_settings?: Record<string, any>
}

export interface OrganizationResponse {
  id: string
  name: string
  slug: string
  description: string | null
  logo_url: string | null
  website: string | null
  industry: string | null
  organization_size: string | null
  created_by: string
  created_at: string | null
  updated_at: string | null
  is_active: boolean | null
  settings: any
  compliance_settings: any
  billing_settings: any
  user_role?: string
  permissions?: OrganizationPermissions
}

export interface OrganizationPermissions {
  canView: boolean
  canEdit: boolean
  canDelete: boolean
  canManageMembers: boolean
  canManageSettings: boolean
  canViewBilling: boolean
  canManageBilling: boolean
}

export interface BusinessLogicError extends Error {
  code: string
  details?: string
  suggestion?: string
}

/**
 * Enhanced Organization Service with comprehensive business logic
 */
export class EnhancedOrganizationService extends BaseService {
  private repository: EnhancedOrganizationRepository

  constructor(supabase: SupabaseClient<Database>) {
    super(supabase)
    this.repository = new EnhancedOrganizationRepository(supabase)
  }

  /**
   * Create organization with full business logic and transaction support
   */
  async createOrganization(
    request: CreateOrganizationRequest,
    createdBy: string
  ): Promise<OrganizationResponse> {
    const startTime = Date.now()

    try {
      // Business rule validation
      await this.validateCreateRequest(request, createdBy)

      // Prepare data for repository
      const createData: CreateOrganizationData = {
        ...request,
        created_by: createdBy
      }

      // Execute creation with transaction
      const result = await this.repository.createOrganizationWithTransaction(createData)

      // Log successful creation
      await this.logActivity(
        'organization_created',
        'organization',
        result.organization.id,
        {
          name: result.organization.name,
          slug: result.organization.slug,
          created_by: createdBy
        }
      )

      // Transform to response format
      const response = this.transformToResponse(result.organization, 'owner')

      const duration = Date.now() - startTime
      this.logPerformance('createOrganization', duration)

      return response

    } catch (error) {
      const duration = Date.now() - startTime
      this.logError('createOrganization', error, { request, createdBy, duration })

      // Transform database errors to business logic errors
      if (this.isDatabaseError(error)) {
        throw this.transformDatabaseError(error)
      }

      throw error
    }
  }

  /**
   * Get organization by ID with permissions
   */
  async getOrganizationById(
    organizationId: string,
    userId: string
  ): Promise<OrganizationResponse> {
    try {
      // Check if user has access
      const hasAccess = await this.checkUserAccess(organizationId, userId)
      if (!hasAccess) {
        throw this.createBusinessLogicError(
          'ACCESS_DENIED',
          'You do not have access to this organization',
          'Request access from an organization member or check the organization ID'
        )
      }

      // Get organization
      const organization = await this.repository.findByIdSafe(organizationId)
      if (!organization) {
        throw this.createBusinessLogicError(
          'ORGANIZATION_NOT_FOUND',
          `Organization with ID ${organizationId} not found`,
          'Check the organization ID or ensure it has not been deleted'
        )
      }

      // Get user role and permissions
      const userRole = await this.getUserRole(organizationId, userId)
      const permissions = this.calculatePermissions(userRole || 'viewer')

      // Transform to response
      const response = this.transformToResponse(organization, userRole, permissions)

      return response

    } catch (error) {
      this.logError('getOrganizationById', error, { organizationId, userId })
      
      if (this.isDatabaseError(error)) {
        throw this.transformDatabaseError(error)
      }

      throw error
    }
  }

  /**
   * Update organization with business rules
   */
  async updateOrganization(
    organizationId: string,
    request: UpdateOrganizationRequest,
    updatedBy: string
  ): Promise<OrganizationResponse> {
    try {
      // Check permissions
      const userRole = await this.getUserRole(organizationId, updatedBy)
      if (!userRole || !['owner', 'admin'].includes(userRole)) {
        throw this.createBusinessLogicError(
          'INSUFFICIENT_PERMISSIONS',
          'Only owners and admins can update organization details',
          'Contact an organization owner or admin for assistance'
        )
      }

      // Business rule validation
      await this.validateUpdateRequest(request, organizationId)

      // Execute update
      const organization = await this.repository.updateSafe(
        organizationId,
        request,
        updatedBy
      )

      // Log update
      await this.logActivity(
        'organization_updated',
        'organization',
        organizationId,
        {
          changes: request,
          updated_by: updatedBy
        }
      )

      // Transform to response
      const permissions = this.calculatePermissions(userRole)
      const response = this.transformToResponse(organization, userRole, permissions)

      return response

    } catch (error) {
      this.logError('updateOrganization', error, { organizationId, request, updatedBy })
      
      if (this.isDatabaseError(error)) {
        throw this.transformDatabaseError(error)
      }

      throw error
    }
  }

  /**
   * Delete organization with business rules
   */
  async deleteOrganization(
    organizationId: string,
    deletedBy: string
  ): Promise<void> {
    try {
      // Check permissions - only owners can delete
      const userRole = await this.getUserRole(organizationId, deletedBy)
      if (userRole !== 'owner') {
        throw this.createBusinessLogicError(
          'INSUFFICIENT_PERMISSIONS',
          'Only organization owners can delete organizations',
          'Transfer ownership to yourself or contact the current owner'
        )
      }

      // Additional business rules
      await this.validateDeleteRequest(organizationId)

      // Execute deletion
      await this.repository.deleteSafe(organizationId, deletedBy)

      // Log deletion
      await this.logActivity(
        'organization_deleted',
        'organization',
        organizationId,
        {
          deleted_by: deletedBy,
          deletion_type: 'soft_delete'
        }
      )

    } catch (error) {
      this.logError('deleteOrganization', error, { organizationId, deletedBy })
      
      if (this.isDatabaseError(error)) {
        throw this.transformDatabaseError(error)
      }

      throw error
    }
  }

  /**
   * Check if organization slug is available
   */
  async checkSlugAvailability(slug: string, excludeId?: string): Promise<boolean> {
    try {
      return await this.repository.isSlugAvailable(slug, excludeId)
    } catch (error) {
      this.logError('checkSlugAvailability', error, { slug, excludeId })
      
      if (this.isDatabaseError(error)) {
        throw this.transformDatabaseError(error)
      }

      throw error
    }
  }

  /**
   * Validate create request business rules
   */
  private async validateCreateRequest(
    request: CreateOrganizationRequest,
    createdBy: string
  ): Promise<void> {
    // Check if user exists and is active
    const { data: user, error } = await this.supabase
      .from('users')
      .select('id, is_active')
      .eq('id', createdBy)
      .single()

    if (error || !user) {
      throw this.createBusinessLogicError(
        'INVALID_USER',
        'User not found or invalid',
        'Ensure the user exists and is properly authenticated'
      )
    }

    if (!user.is_active) {
      throw this.createBusinessLogicError(
        'USER_INACTIVE',
        'Inactive users cannot create organizations',
        'Contact support to reactivate your account'
      )
    }

    // Check user's organization limit (business rule)
    const { count, error: countError } = await this.supabase
      .from('organization_members')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', createdBy)
      .eq('role', 'owner')
      .eq('status', 'active')

    if (countError) {
      throw this.createBusinessLogicError(
        'VALIDATION_FAILED',
        'Failed to validate user organization limits',
        'Try again or contact support'
      )
    }

    const MAX_OWNED_ORGANIZATIONS = 5 // Business rule
    if ((count || 0) >= MAX_OWNED_ORGANIZATIONS) {
      throw this.createBusinessLogicError(
        'ORGANIZATION_LIMIT_REACHED',
        `Users can own a maximum of ${MAX_OWNED_ORGANIZATIONS} organizations`,
        'Delete an existing organization or upgrade your plan'
      )
    }

    // Validate website URL format if provided
    if (request.website && !this.isValidUrl(request.website)) {
      throw this.createBusinessLogicError(
        'INVALID_WEBSITE_URL',
        'Website URL format is invalid',
        'Provide a valid URL starting with http:// or https://'
      )
    }

    // Validate logo URL format if provided
    if (request.logo_url && !this.isValidUrl(request.logo_url)) {
      throw this.createBusinessLogicError(
        'INVALID_LOGO_URL',
        'Logo URL format is invalid',
        'Provide a valid URL starting with http:// or https://'
      )
    }
  }

  /**
   * Validate update request business rules
   */
  private async validateUpdateRequest(
    request: UpdateOrganizationRequest,
    organizationId: string
  ): Promise<void> {
    // Validate website URL format if provided
    if (request.website && !this.isValidUrl(request.website)) {
      throw this.createBusinessLogicError(
        'INVALID_WEBSITE_URL',
        'Website URL format is invalid',
        'Provide a valid URL starting with http:// or https://'
      )
    }

    // Validate logo URL format if provided
    if (request.logo_url && !this.isValidUrl(request.logo_url)) {
      throw this.createBusinessLogicError(
        'INVALID_LOGO_URL',
        'Logo URL format is invalid',
        'Provide a valid URL starting with http:// or https://'
      )
    }
  }

  /**
   * Validate delete request business rules
   */
  private async validateDeleteRequest(organizationId: string): Promise<void> {
    // Check if organization has active board packs
    const { count, error } = await this.supabase
      .from('board_packs')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('status', 'active')

    if (error) {
      throw this.createBusinessLogicError(
        'VALIDATION_FAILED',
        'Failed to validate organization deletion requirements',
        'Try again or contact support'
      )
    }

    if ((count || 0) > 0) {
      throw this.createBusinessLogicError(
        'HAS_ACTIVE_BOARD_PACKS',
        'Cannot delete organization with active board packs',
        'Archive or delete all board packs before deleting the organization'
      )
    }
  }

  /**
   * Check if user has access to organization
   */
  private async checkUserAccess(organizationId: string, userId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('organization_members')
        .select('status')
        .eq('organization_id', organizationId)
        .eq('user_id', userId)
        .eq('status', 'active')
        .single()

      if (error && error.code !== 'PGRST116') {
        return false
      }

      return !!data
    } catch (error) {
      return false
    }
  }

  /**
   * Get user's role in organization
   */
  private async getUserRole(organizationId: string, userId: string): Promise<string | null> {
    try {
      const { data } = await this.supabase
        .from('organization_members')
        .select('role')
        .eq('organization_id', organizationId)
        .eq('user_id', userId)
        .eq('status', 'active')
        .single()

      return data?.role || null
    } catch (error) {
      return null
    }
  }

  /**
   * Calculate permissions based on role
   */
  private calculatePermissions(role: string): OrganizationPermissions {
    const permissions: OrganizationPermissions = {
      canView: false,
      canEdit: false,
      canDelete: false,
      canManageMembers: false,
      canManageSettings: false,
      canViewBilling: false,
      canManageBilling: false
    }

    switch (role) {
      case 'owner':
        return {
          canView: true,
          canEdit: true,
          canDelete: true,
          canManageMembers: true,
          canManageSettings: true,
          canViewBilling: true,
          canManageBilling: true
        }
      case 'admin':
        return {
          canView: true,
          canEdit: true,
          canDelete: false,
          canManageMembers: true,
          canManageSettings: true,
          canViewBilling: true,
          canManageBilling: false
        }
      case 'member':
        return {
          canView: true,
          canEdit: false,
          canDelete: false,
          canManageMembers: false,
          canManageSettings: false,
          canViewBilling: false,
          canManageBilling: false
        }
      case 'viewer':
        return {
          canView: true,
          canEdit: false,
          canDelete: false,
          canManageMembers: false,
          canManageSettings: false,
          canViewBilling: false,
          canManageBilling: false
        }
      default:
        return permissions
    }
  }

  /**
   * Transform database entity to response format
   */
  private transformToResponse(
    organization: any,
    userRole?: string | null,
    permissions?: OrganizationPermissions
  ): OrganizationResponse {
    return {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      description: organization.description,
      logo_url: organization.logo_url,
      website: organization.website,
      industry: organization.industry,
      organization_size: organization.organization_size,
      created_by: organization.created_by,
      created_at: organization.created_at,
      updated_at: organization.updated_at,
      is_active: organization.is_active,
      settings: organization.settings,
      compliance_settings: organization.compliance_settings,
      billing_settings: organization.billing_settings,
      user_role: userRole,
      permissions: permissions
    }
  }

  /**
   * Check if error is a database error
   */
  private isDatabaseError(error: any): error is DatabaseError {
    return error && typeof error === 'object' && 'code' in error
  }

  /**
   * Transform database error to business logic error
   */
  private transformDatabaseError(error: DatabaseError): BusinessLogicError {
    const businessError = new Error(error.message) as BusinessLogicError
    businessError.code = error.code || 'DATABASE_ERROR'
    businessError.details = error.details
    businessError.suggestion = error.hint
    businessError.name = 'BusinessLogicError'
    return businessError
  }

  /**
   * Create business logic error
   */
  private createBusinessLogicError(
    code: string,
    message: string,
    suggestion?: string
  ): BusinessLogicError {
    const error = new Error(message) as BusinessLogicError
    error.code = code
    error.suggestion = suggestion
    error.name = 'BusinessLogicError'
    return error
  }

  /**
   * Validate URL format
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url)
      return url.startsWith('http://') || url.startsWith('https://')
    } catch {
      return false
    }
  }

  /**
   * Log performance metrics
   */
  private logPerformance(operation: string, duration: number): void {
    if (duration > 3000) { // Log slow operations
      console.warn(`⚠️ Slow service operation: ${operation} took ${duration}ms`)
    } else {
      console.log(`📊 Service operation: ${operation} completed in ${duration}ms`)
    }
  }

  /**
   * Log errors with context
   */
  private logError(operation: string, error: any, context?: Record<string, any>): void {
    console.error(`❌ Service error in ${operation}:`, {
      error: {
        message: error.message,
        code: error.code,
        name: error.name
      },
      context,
      timestamp: new Date().toISOString()
    })
  }
}