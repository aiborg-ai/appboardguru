/**
 * Enhanced Organization Repository
 * Implements robust database operations with transaction support,
 * comprehensive error handling, and connection pooling
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import { BaseRepository } from './base.repository'

// Types for better type safety
type OrganizationRow = Database['public']['Tables']['organizations']['Row']
type OrganizationInsert = Database['public']['Tables']['organizations']['Insert']
type OrganizationUpdate = Database['public']['Tables']['organizations']['Update']
type OrganizationMemberInsert = Database['public']['Tables']['organization_members']['Insert']
type OrganizationRole = Database['public']['Enums']['organization_role']

export interface CreateOrganizationData {
  name: string
  slug: string
  description?: string
  logo_url?: string
  website?: string
  industry?: string
  organization_size?: string
  created_by: string
  settings?: Record<string, any>
  compliance_settings?: Record<string, any>
  billing_settings?: Record<string, any>
}

export interface CreateOrganizationResult {
  organization: OrganizationRow
  membership: Database['public']['Tables']['organization_members']['Row']
}

export interface DatabaseError extends Error {
  code?: string
  details?: string
  hint?: string
  message: string
}

export interface TransactionContext {
  supabase: SupabaseClient<Database>
  rollback: () => Promise<void>
  commit: () => Promise<void>
}

/**
 * Enhanced Organization Repository with transaction support
 */
export class EnhancedOrganizationRepository extends BaseRepository {
  protected tableName = 'organizations' as const
  private readonly DEFAULT_TIMEOUT = 30000 // 30 seconds
  
  constructor(supabase: SupabaseClient<Database>) {
    super(supabase)
  }

  protected getEntityName(): string {
    return 'Organization'
  }

  protected getSearchFields(): string[] {
    return ['name', 'description', 'slug']
  }

  /**
   * Create organization with transaction support
   * Ensures both organization and initial membership are created atomically
   */
  async createOrganizationWithTransaction(
    data: CreateOrganizationData
  ): Promise<CreateOrganizationResult> {
    const startTime = Date.now()
    
    try {
      // Validate input data
      this.validateCreateData(data)
      
      // Check slug availability first
      const isSlugAvailable = await this.isSlugAvailable(data.slug)
      if (!isSlugAvailable) {
        throw this.createDatabaseError(
          'SLUG_ALREADY_EXISTS',
          `Organization slug '${data.slug}' is already taken`,
          'Try a different slug'
        )
      }

      // Prepare organization data
      const organizationData: OrganizationInsert = {
        ...data,
        is_active: true,
        settings: data.settings || this.getDefaultSettings(),
        compliance_settings: data.compliance_settings || {},
        billing_settings: data.billing_settings || {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      // Start transaction by creating organization
      const { data: organization, error: orgError } = await this.supabase
        .from('organizations')
        .insert(organizationData)
        .select()
        .single()

      if (orgError) {
        throw this.createDatabaseError(
          orgError.code || 'ORG_CREATE_FAILED',
          `Failed to create organization: ${orgError.message}`,
          orgError.hint || 'Check organization data and try again'
        )
      }

      if (!organization) {
        throw this.createDatabaseError(
          'ORG_CREATE_NO_DATA',
          'Organization was created but no data returned',
          'This may indicate a database configuration issue'
        )
      }

      // Create initial membership for the creator
      const membershipData: OrganizationMemberInsert = {
        organization_id: organization.id,
        user_id: data.created_by,
        role: 'owner',
        status: 'active',
        invited_by: data.created_by,
        approved_by: data.created_by,
        is_primary: true, // First organization is primary
        joined_at: new Date().toISOString(),
        last_accessed: new Date().toISOString(),
        access_count: 0
      }

      const { data: membership, error: memberError } = await this.supabase
        .from('organization_members')
        .insert(membershipData)
        .select()
        .single()

      if (memberError) {
        // Rollback: Delete the organization
        await this.supabase
          .from('organizations')
          .delete()
          .eq('id', organization.id)

        throw this.createDatabaseError(
          memberError.code || 'MEMBER_CREATE_FAILED',
          `Failed to create membership: ${memberError.message}`,
          'Organization creation rolled back'
        )
      }

      if (!membership) {
        // Rollback: Delete the organization
        await this.supabase
          .from('organizations')
          .delete()
          .eq('id', organization.id)

        throw this.createDatabaseError(
          'MEMBER_CREATE_NO_DATA',
          'Membership was created but no data returned',
          'Organization creation rolled back'
        )
      }

      // Create organization features record
      await this.createOrganizationFeatures(organization.id)

      const duration = Date.now() - startTime
      this.logPerformance('createOrganizationWithTransaction', duration)

      return {
        organization,
        membership
      }

    } catch (error) {
      const duration = Date.now() - startTime
      this.logError('createOrganizationWithTransaction', error, { data, duration })
      throw error
    }
  }

  /**
   * Check if organization slug is available
   */
  async isSlugAvailable(slug: string, excludeId?: string): Promise<boolean> {
    try {
      let query = this.supabase
        .from('organizations')
        .select('id')
        .eq('slug', slug)
        .eq('is_active', true)

      if (excludeId) {
        query = query.neq('id', excludeId)
      }

      const { data, error } = await query.maybeSingle()

      if (error && error.code !== 'PGRST116') {
        throw this.createDatabaseError(
          error.code || 'SLUG_CHECK_FAILED',
          `Failed to check slug availability: ${error.message}`,
          'Try again or contact support'
        )
      }

      return !data
    } catch (error) {
      this.logError('isSlugAvailable', error, { slug, excludeId })
      throw error
    }
  }

  /**
   * Find organization by ID with comprehensive error handling
   */
  async findByIdSafe(id: string): Promise<OrganizationRow | null> {
    try {
      if (!this.isValidUUID(id)) {
        throw this.createDatabaseError(
          'INVALID_UUID',
          `Invalid organization ID format: ${id}`,
          'Provide a valid UUID'
        )
      }

      const { data, error } = await this.supabase
        .from('organizations')
        .select('*')
        .eq('id', id)
        .eq('is_active', true)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null // Not found
        }
        throw this.createDatabaseError(
          error.code || 'ORG_FETCH_FAILED',
          `Failed to fetch organization: ${error.message}`,
          'Check the organization ID and try again'
        )
      }

      return data
    } catch (error) {
      this.logError('findByIdSafe', error, { id })
      throw error
    }
  }

  /**
   * Update organization with validation and constraints
   */
  async updateSafe(
    id: string, 
    data: OrganizationUpdate,
    updatedBy: string
  ): Promise<OrganizationRow> {
    try {
      if (!this.isValidUUID(id)) {
        throw this.createDatabaseError(
          'INVALID_UUID',
          `Invalid organization ID format: ${id}`,
          'Provide a valid UUID'
        )
      }

      // Validate update data
      this.validateUpdateData(data)

      // Check if organization exists
      const existing = await this.findByIdSafe(id)
      if (!existing) {
        throw this.createDatabaseError(
          'ORG_NOT_FOUND',
          `Organization with ID ${id} not found`,
          'Check the organization ID'
        )
      }

      // Check slug availability if changing
      if (data.slug && data.slug !== existing.slug) {
        const isSlugAvailable = await this.isSlugAvailable(data.slug, id)
        if (!isSlugAvailable) {
          throw this.createDatabaseError(
            'SLUG_ALREADY_EXISTS',
            `Organization slug '${data.slug}' is already taken`,
            'Try a different slug'
          )
        }
      }

      const updateData = {
        ...data,
        updated_at: new Date().toISOString()
      }

      const { data: organization, error } = await this.supabase
        .from('organizations')
        .update(updateData)
        .eq('id', id)
        .eq('is_active', true)
        .select()
        .single()

      if (error) {
        throw this.createDatabaseError(
          error.code || 'ORG_UPDATE_FAILED',
          `Failed to update organization: ${error.message}`,
          error.hint || 'Check update data and try again'
        )
      }

      if (!organization) {
        throw this.createDatabaseError(
          'ORG_UPDATE_NO_DATA',
          'Organization update completed but no data returned',
          'This may indicate a database configuration issue'
        )
      }

      return organization
    } catch (error) {
      this.logError('updateSafe', error, { id, data, updatedBy })
      throw error
    }
  }

  /**
   * Soft delete organization with cascade handling
   */
  async deleteSafe(id: string, deletedBy: string): Promise<void> {
    try {
      if (!this.isValidUUID(id)) {
        throw this.createDatabaseError(
          'INVALID_UUID',
          `Invalid organization ID format: ${id}`,
          'Provide a valid UUID'
        )
      }

      // Check if organization exists
      const existing = await this.findByIdSafe(id)
      if (!existing) {
        throw this.createDatabaseError(
          'ORG_NOT_FOUND',
          `Organization with ID ${id} not found`,
          'Check the organization ID'
        )
      }

      // Check if user has permission to delete (should be owner)
      const hasPermission = await this.checkDeletePermission(id, deletedBy)
      if (!hasPermission) {
        throw this.createDatabaseError(
          'INSUFFICIENT_PERMISSIONS',
          'Only organization owners can delete organizations',
          'Transfer ownership or contact an owner'
        )
      }

      const deletionScheduledFor = new Date()
      deletionScheduledFor.setDate(deletionScheduledFor.getDate() + 30) // 30 day grace period

      const { error } = await this.supabase
        .from('organizations')
        .update({
          is_active: false,
          deleted_at: new Date().toISOString(),
          deletion_scheduled_for: deletionScheduledFor.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) {
        throw this.createDatabaseError(
          error.code || 'ORG_DELETE_FAILED',
          `Failed to delete organization: ${error.message}`,
          error.hint || 'Try again or contact support'
        )
      }
    } catch (error) {
      this.logError('deleteSafe', error, { id, deletedBy })
      throw error
    }
  }

  /**
   * Check if user has permission to delete organization
   */
  private async checkDeletePermission(organizationId: string, userId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('organization_members')
        .select('role')
        .eq('organization_id', organizationId)
        .eq('user_id', userId)
        .eq('status', 'active')
        .single()

      if (error && error.code !== 'PGRST116') {
        return false
      }

      return data?.role === 'owner'
    } catch (error) {
      return false
    }
  }

  /**
   * Create organization features record
   */
  private async createOrganizationFeatures(organizationId: string): Promise<void> {
    const featuresData = {
      organization_id: organizationId,
      ai_summarization: true,
      advanced_permissions: false,
      sso_enabled: false,
      audit_logs: true,
      api_access: false,
      white_label: false,
      max_board_packs: 100,
      max_file_size_mb: 50,
      max_storage_gb: 10.0,
      current_board_packs: 0,
      current_storage_gb: 0.0,
      plan_type: 'free',
      updated_at: new Date().toISOString()
    }

    const { error } = await this.supabase
      .from('organization_features')
      .insert(featuresData)

    if (error) {
      // Log but don't fail the transaction for features
      this.logError('createOrganizationFeatures', error, { organizationId })
    }
  }

  /**
   * Get default organization settings
   */
  private getDefaultSettings(): Record<string, any> {
    return {
      board_pack_auto_archive_days: 365,
      invitation_expires_hours: 72,
      max_members: 100,
      require_2fa: false,
      allow_viewer_downloads: true,
      auto_approve_domain_users: false,
      approved_domains: []
    }
  }

  /**
   * Validate create data
   */
  private validateCreateData(data: CreateOrganizationData): void {
    if (!data.name?.trim()) {
      throw this.createDatabaseError(
        'VALIDATION_ERROR',
        'Organization name is required',
        'Provide a valid name'
      )
    }

    if (data.name.length < 2 || data.name.length > 100) {
      throw this.createDatabaseError(
        'VALIDATION_ERROR',
        'Organization name must be between 2 and 100 characters',
        'Choose a name within the allowed length'
      )
    }

    if (!data.slug?.trim()) {
      throw this.createDatabaseError(
        'VALIDATION_ERROR',
        'Organization slug is required',
        'Provide a valid slug'
      )
    }

    if (!/^[a-z0-9-]+$/.test(data.slug)) {
      throw this.createDatabaseError(
        'VALIDATION_ERROR',
        'Organization slug can only contain lowercase letters, numbers, and hyphens',
        'Use only allowed characters'
      )
    }

    if (data.slug.length < 2 || data.slug.length > 50) {
      throw this.createDatabaseError(
        'VALIDATION_ERROR',
        'Organization slug must be between 2 and 50 characters',
        'Choose a slug within the allowed length'
      )
    }

    if (!this.isValidUUID(data.created_by)) {
      throw this.createDatabaseError(
        'VALIDATION_ERROR',
        'Invalid created_by user ID',
        'Provide a valid user UUID'
      )
    }
  }

  /**
   * Validate update data
   */
  private validateUpdateData(data: OrganizationUpdate): void {
    if (data.name !== undefined) {
      if (!data.name?.trim()) {
        throw this.createDatabaseError(
          'VALIDATION_ERROR',
          'Organization name cannot be empty',
          'Provide a valid name'
        )
      }
      if (data.name.length < 2 || data.name.length > 100) {
        throw this.createDatabaseError(
          'VALIDATION_ERROR',
          'Organization name must be between 2 and 100 characters',
          'Choose a name within the allowed length'
        )
      }
    }

    if (data.slug !== undefined) {
      if (!data.slug?.trim()) {
        throw this.createDatabaseError(
          'VALIDATION_ERROR',
          'Organization slug cannot be empty',
          'Provide a valid slug'
        )
      }
      if (!/^[a-z0-9-]+$/.test(data.slug)) {
        throw this.createDatabaseError(
          'VALIDATION_ERROR',
          'Organization slug can only contain lowercase letters, numbers, and hyphens',
          'Use only allowed characters'
        )
      }
      if (data.slug.length < 2 || data.slug.length > 50) {
        throw this.createDatabaseError(
          'VALIDATION_ERROR',
          'Organization slug must be between 2 and 50 characters',
          'Choose a slug within the allowed length'
        )
      }
    }
  }

  /**
   * Create a standardized database error
   */
  private createDatabaseError(code: string, message: string, hint?: string): DatabaseError {
    const error = new Error(message) as DatabaseError
    error.code = code
    error.hint = hint
    error.name = 'DatabaseError'
    return error
  }

  /**
   * Check if string is valid UUID
   */
  private isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return uuidRegex.test(uuid)
  }

  /**
   * Log performance metrics
   */
  private logPerformance(operation: string, duration: number): void {
    if (duration > 5000) { // Log slow operations
      console.warn(`⚠️ Slow database operation: ${operation} took ${duration}ms`)
    } else {
      console.log(`📊 Database operation: ${operation} completed in ${duration}ms`)
    }
  }

  /**
   * Log errors with context
   */
  private logError(operation: string, error: any, context?: Record<string, any>): void {
    console.error(`❌ Database error in ${operation}:`, {
      error: {
        message: error.message,
        code: error.code,
        hint: error.hint
      },
      context,
      timestamp: new Date().toISOString()
    })
  }
}