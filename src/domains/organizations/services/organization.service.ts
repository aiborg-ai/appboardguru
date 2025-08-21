/**
 * Organization Service
 * Handles business logic for the organization domain
 */

import { BaseService } from '@/lib/services/base.service'
import { OrganizationRepository } from '../repository/organization.repository'
import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import {
  OrganizationEntity,
  OrganizationEntityWithRelations,
  OrganizationEntityPermissions,
  OrganizationRole
} from '../types/entity.types'
import {
  CreateOrganizationDTO,
  UpdateOrganizationDTO,
  OrganizationListFilters,
  OrganizationListResponse
} from '../types/dto.types'

export class OrganizationService extends BaseService {
  private organizationRepository: OrganizationRepository

  constructor(supabase: SupabaseClient<Database>) {
    super(supabase)
    this.organizationRepository = new OrganizationRepository(supabase)
  }

  /**
   * Get organization by ID with permissions check
   */
  async getById(id: string, userId?: string): Promise<OrganizationEntityWithRelations> {
    try {
      // Get organization
      const organization = await this.organizationRepository.findById(id, true)
      if (!organization) {
        throw new Error('Organization not found')
      }

      // Check access if userId provided
      if (userId) {
        const hasAccess = await this.organizationRepository.checkUserAccess(id, userId)
        if (!hasAccess) {
          throw new Error('Access denied')
        }

        // Add user's role and permissions
        const userRole = await this.getUserRole(id, userId)
        const permissions = this.calculatePermissions(userRole || 'viewer')
        
        return {
          ...organization,
          user_role: userRole,
          permissions
        } as any
      }

      return organization
    } catch (error) {
      this.handleError(error, 'getById', { id, userId })
    }
  }

  /**
   * Get organization by slug
   */
  async getBySlug(slug: string, userId?: string): Promise<OrganizationEntityWithRelations> {
    try {
      const organization = await this.organizationRepository.findBySlug(slug)
      if (!organization) {
        throw new Error('Organization not found')
      }

      // Check access if userId provided
      if (userId) {
        const hasAccess = await this.organizationRepository.checkUserAccess(organization.id, userId)
        if (!hasAccess) {
          throw new Error('Access denied')
        }
      }

      return organization
    } catch (error) {
      this.handleError(error, 'getBySlug', { slug, userId })
    }
  }

  /**
   * List organizations for a user
   */
  async listForUser(userId: string): Promise<OrganizationEntityWithRelations[]> {
    try {
      const organizations = await this.organizationRepository.findByUserId(userId)
      
      await this.logActivity('list_organizations', 'organization', undefined, {
        userId,
        result_count: organizations.length
      })

      return organizations
    } catch (error) {
      this.handleError(error, 'listForUser', { userId })
    }
  }

  /**
   * List organizations with filtering and pagination
   */
  async list(filters: OrganizationListFilters = {}): Promise<OrganizationListResponse> {
    try {
      const result = await this.organizationRepository.findMany(filters)

      await this.logActivity('list_organizations_filtered', 'organization', undefined, {
        filters,
        result_count: result.items.length
      })

      return result
    } catch (error) {
      this.handleError(error, 'list', { filters })
    }
  }

  /**
   * Create a new organization
   */
  async create(data: CreateOrganizationDTO, createdBy: string): Promise<OrganizationEntity> {
    try {
      // Validate business rules
      await this.validateCreateData(data)
      
      // Check slug availability
      const isSlugAvailable = await this.organizationRepository.isSlugAvailable(data.slug)
      if (!isSlugAvailable) {
        throw new Error('Organization slug already exists')
      }

      // Create organization
      const organization = await this.organizationRepository.create({
        ...data,
        created_by: createdBy
      })

      // Add creator as owner in organization_members table
      await this.addMember(organization.id, createdBy, 'owner')

      await this.logActivity('create_organization', 'organization', organization.id, {
        name: organization.name,
        slug: organization.slug
      })

      return organization
    } catch (error) {
      this.handleError(error, 'create', { data, createdBy })
    }
  }

  /**
   * Update an existing organization
   */
  async update(id: string, data: UpdateOrganizationDTO, userId: string): Promise<OrganizationEntity> {
    try {
      // Check permissions
      const userRole = await this.getUserRole(id, userId)
      if (!userRole || !['owner', 'admin'].includes(userRole)) {
        throw new Error('Insufficient permissions')
      }

      // Get existing organization for validation
      const existing = await this.organizationRepository.findById(id)
      if (!existing) {
        throw new Error('Organization not found')
      }

      // Validate business rules
      await this.validateUpdateData(data, existing)
      
      // Check slug availability if changing
      if (data.slug && data.slug !== existing.slug) {
        const isSlugAvailable = await this.organizationRepository.isSlugAvailable(data.slug, id)
        if (!isSlugAvailable) {
          throw new Error('Organization slug already exists')
        }
      }

      const organization = await this.organizationRepository.update(id, data)

      await this.logActivity('update_organization', 'organization', organization.id, {
        changes: data,
        previous_slug: existing.slug,
        new_slug: organization.slug
      })

      return organization
    } catch (error) {
      this.handleError(error, 'update', { id, data, userId })
    }
  }

  /**
   * Delete an organization
   */
  async delete(id: string, userId: string, permanent = false): Promise<void> {
    try {
      // Check permissions - only owners can delete
      const userRole = await this.getUserRole(id, userId)
      if (userRole !== 'owner') {
        throw new Error('Only owners can delete organizations')
      }

      const existing = await this.organizationRepository.findById(id)
      if (!existing) {
        throw new Error('Organization not found')
      }

      // Validate deletion rules
      await this.validateDelete(id)

      if (permanent) {
        await this.organizationRepository.hardDelete(id)
      } else {
        await this.organizationRepository.delete(id)
      }

      await this.logActivity('delete_organization', 'organization', id, {
        name: existing.name,
        permanent
      })
    } catch (error) {
      this.handleError(error, 'delete', { id, userId, permanent })
    }
  }

  /**
   * Check if organization slug is available
   */
  async checkSlugAvailability(slug: string, excludeId?: string): Promise<boolean> {
    try {
      return await this.organizationRepository.isSlugAvailable(slug, excludeId)
    } catch (error) {
      this.handleError(error, 'checkSlugAvailability', { slug, excludeId })
    }
  }

  /**
   * Get organization members
   */
  async getMembers(organizationId: string, userId: string): Promise<any[]> {
    try {
      // Check access
      const hasAccess = await this.organizationRepository.checkUserAccess(organizationId, userId)
      if (!hasAccess) {
        throw new Error('Access denied')
      }

      return await this.organizationRepository.getMembers(organizationId)
    } catch (error) {
      this.handleError(error, 'getMembers', { organizationId, userId })
    }
  }

  /**
   * Get user's role in organization
   */
  private async getUserRole(organizationId: string, userId: string): Promise<OrganizationRole | null> {
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
   * Calculate user permissions based on role
   */
  private calculatePermissions(role: OrganizationRole): OrganizationEntityPermissions {
    const permissions: OrganizationEntityPermissions = {
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
   * Add member to organization
   */
  private async addMember(organizationId: string, userId: string, role: OrganizationRole): Promise<void> {
    await this.supabase.from('organization_members').insert({
      organization_id: organizationId,
      user_id: userId,
      role,
      invited_by: userId,
      approved_by: userId,
      status: 'active',
      is_primary: role === 'owner' // First org is primary for owner
    })
  }

  /**
   * Validate create data against business rules
   */
  private async validateCreateData(data: CreateOrganizationDTO): Promise<void> {
    if (!data.name?.trim()) {
      throw new Error('Organization name is required')
    }

    if (data.name.length < 2 || data.name.length > 100) {
      throw new Error('Organization name must be between 2 and 100 characters')
    }

    if (!data.slug?.trim()) {
      throw new Error('Organization slug is required')
    }

    if (!/^[a-z0-9-]+$/.test(data.slug)) {
      throw new Error('Organization slug can only contain lowercase letters, numbers, and hyphens')
    }

    if (data.slug.length < 2 || data.slug.length > 50) {
      throw new Error('Organization slug must be between 2 and 50 characters')
    }
  }

  /**
   * Validate update data against business rules
   */
  private async validateUpdateData(data: UpdateOrganizationDTO, existing: OrganizationEntity): Promise<void> {
    if (data.name !== undefined) {
      if (!data.name?.trim()) {
        throw new Error('Organization name cannot be empty')
      }
      if (data.name.length < 2 || data.name.length > 100) {
        throw new Error('Organization name must be between 2 and 100 characters')
      }
    }

    if (data.slug !== undefined) {
      if (!data.slug?.trim()) {
        throw new Error('Organization slug cannot be empty')
      }
      if (!/^[a-z0-9-]+$/.test(data.slug)) {
        throw new Error('Organization slug can only contain lowercase letters, numbers, and hyphens')
      }
      if (data.slug.length < 2 || data.slug.length > 50) {
        throw new Error('Organization slug must be between 2 and 50 characters')
      }
    }
  }

  /**
   * Validate deletion against business rules
   */
  private async validateDelete(organizationId: string): Promise<void> {
    // Check if there are multiple owners
    const { data: owners } = await this.supabase
      .from('organization_members')
      .select('user_id')
      .eq('organization_id', organizationId)
      .eq('role', 'owner')
      .eq('status', 'active')

    if (owners && owners.length > 1) {
      throw new Error('Cannot delete organization with multiple owners. Transfer ownership first.')
    }

    // Could add more business rules here, like checking for active assets, etc.
  }
}