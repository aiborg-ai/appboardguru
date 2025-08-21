/**
 * Template Service
 * Handles business logic for the template domain
 */

import { BaseService } from '@/lib/services/base.service'
import { TemplateRepository } from '../repository/template.repository'
import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import {
  TemplateEntity,
  TemplateEntityWithRelations,
  TemplateEntityPermissions
} from '../types/entity.types'
import {
  CreateTemplateDTO,
  UpdateTemplateDTO,
  TemplateListFilters,
  TemplateListResponse,
  BulkTemplateOperation,
  BulkTemplateResponse
} from '../types/dto.types'

export class TemplateService extends BaseService {
  private templateRepository: TemplateRepository

  constructor(supabase: SupabaseClient<Database>) {
    super(supabase)
    this.templateRepository = new TemplateRepository(supabase)
  }

  /**
   * Get template by ID with permissions check
   */
  async getById(id: string): Promise<TemplateEntityWithRelations> {
    try {
      const user = await this.getCurrentUser()
      
      // Check access
      const hasAccess = await this.templateRepository.checkAccess(id, user.id)
      if (!hasAccess) {
        throw new Error('Access denied')
      }

      const template = await this.templateRepository.findById(id, true)
      if (!template) {
        throw new Error('Template not found')
      }

      // Add permissions
      const permissions = await this.calculatePermissions(template, user.id)
      
      return {
        ...template,
        permissions
      } as any
    } catch (error) {
      this.handleError(error, 'getById', { id })
    }
  }

  /**
   * List templates with filtering and pagination
   */
  async list(filters: TemplateListFilters = {}): Promise<TemplateListResponse> {
    try {
      const user = await this.getCurrentUser()
      
      // Apply user-specific filters
      const userFilters: TemplateListFilters = {
        ...filters,
        // Only show templates user has access to
        organization_id: filters.organization_id || user.user_metadata?.organizationId
      }

      const result = await this.templateRepository.findMany(userFilters)
      
      // Add permissions to each item
      const itemsWithPermissions = await Promise.all(
        result.items.map(async (template) => {
          const permissions = await this.calculatePermissions(template, user.id)
          return {
            ...template,
            permissions
          }
        })
      )

      await this.logActivity('list_templates', 'template', undefined, {
        filters: userFilters,
        result_count: result.items.length
      })

      return {
        ...result,
        items: itemsWithPermissions as any
      }
    } catch (error) {
      this.handleError(error, 'list', { filters })
    }
  }

  /**
   * Create a new template
   */
  async create(data: CreateTemplateDTO): Promise<TemplateEntity> {
    try {
      const user = await this.getCurrentUser()
      
      // Validate business rules
      await this.validateCreateData(data, user.id)
      
      // Set creator and organization
      const createData: CreateTemplateDTO = {
        ...data,
        organization_id: data.organization_id || user.user_metadata?.organizationId,
      }

      const template = await this.templateRepository.create(createData)

      await this.logActivity('create_template', 'template', template.id, {
        name: template.name,
        status: template.status
      })

      return template
    } catch (error) {
      this.handleError(error, 'create', { data })
    }
  }

  /**
   * Update an existing template
   */
  async update(id: string, data: UpdateTemplateDTO): Promise<TemplateEntity> {
    try {
      const user = await this.getCurrentUser()
      
      // Check permissions
      const hasAccess = await this.templateRepository.checkAccess(id, user.id)
      if (!hasAccess) {
        throw new Error('Access denied')
      }

      // Get existing template for validation
      const existing = await this.templateRepository.findById(id)
      if (!existing) {
        throw new Error('Template not found')
      }

      // Validate business rules
      await this.validateUpdateData(data, existing, user.id)
      
      const template = await this.templateRepository.update(id, data)

      await this.logActivity('update_template', 'template', template.id, {
        changes: data,
        previous_status: existing.status,
        new_status: template.status
      })

      return template
    } catch (error) {
      this.handleError(error, 'update', { id, data })
    }
  }

  /**
   * Delete a template
   */
  async delete(id: string, permanent = false): Promise<void> {
    try {
      const user = await this.getCurrentUser()
      
      // Check permissions
      const hasAccess = await this.templateRepository.checkAccess(id, user.id)
      if (!hasAccess) {
        throw new Error('Access denied')
      }

      const existing = await this.templateRepository.findById(id)
      if (!existing) {
        throw new Error('Template not found')
      }

      // Validate deletion rules
      await this.validateDelete(existing, user.id)

      if (permanent) {
        await this.templateRepository.hardDelete(id)
      } else {
        await this.templateRepository.delete(id)
      }

      await this.logActivity('delete_template', 'template', id, {
        name: existing.name,
        permanent
      })
    } catch (error) {
      this.handleError(error, 'delete', { id, permanent })
    }
  }

  /**
   * Bulk operations on templates
   */
  async bulkOperation(operation: BulkTemplateOperation): Promise<BulkTemplateResponse> {
    try {
      const user = await this.getCurrentUser()
      const { operation: op, ids, data } = operation
      
      const successful_ids: string[] = []
      const failed_ids: { id: string; error: string }[] = []

      // Process each ID
      await Promise.allSettled(
        ids.map(async (id) => {
          try {
            switch (op) {
              case 'update':
                if (!data) throw new Error('Update data required')
                await this.update(id, data)
                break
              case 'delete':
                await this.delete(id)
                break
              case 'archive':
                await this.update(id, { status: 'archived' })
                break
              default:
                throw new Error(`Unknown operation: ${op}`)
            }
            successful_ids.push(id)
          } catch (error) {
            failed_ids.push({
              id,
              error: error instanceof Error ? error.message : 'Unknown error'
            })
          }
        })
      )

      await this.logActivity('bulk_operation', 'template', undefined, {
        operation: op,
        total_requested: ids.length,
        successful: successful_ids.length,
        failed: failed_ids.length
      })

      return {
        successful_ids,
        failed_ids,
        total_processed: ids.length
      }
    } catch (error) {
      this.handleError(error, 'bulkOperation', { operation })
    }
  }

  /**
   * Calculate user permissions for a template
   */
  private async calculatePermissions(
    template: TemplateEntity,
    userId: string
  ): Promise<TemplateEntityPermissions> {
    try {
      const isOwner = template.created_by === userId
      
      // Get user's organization role
      const { data: membership } = await this.supabase
        .from('organization_members')
        .select('role')
        .eq('organization_id', template.organization_id)
        .eq('user_id', userId)
        .single()

      const isAdmin = membership?.role === 'admin' || membership?.role === 'owner'
      const isMember = !!membership

      return {
        canView: isMember,
        canEdit: isOwner || isAdmin,
        canDelete: isOwner || isAdmin,
        canShare: isOwner || isAdmin,
        canManage: isOwner || isAdmin
      }
    } catch (error) {
      // Default to minimal permissions on error
      return {
        canView: false,
        canEdit: false,
        canDelete: false,
        canShare: false,
        canManage: false
      }
    }
  }

  /**
   * Validate create data against business rules
   */
  private async validateCreateData(data: CreateTemplateDTO, userId: string): Promise<void> {
    // Check if user can create in this organization
    if (data.organization_id) {
      const { data: membership } = await this.supabase
        .from('organization_members')
        .select('role')
        .eq('organization_id', data.organization_id)
        .eq('user_id', userId)
        .single()

      if (!membership) {
        throw new Error('Cannot create template in this organization')
      }
    }

    // Validate name uniqueness within organization
    const { data: existing } = await this.supabase
      .from('templates')
      .select('id')
      .eq('name', data.name)
      .eq('organization_id', data.organization_id)
      .single()

    if (existing) {
      throw new Error('Template name already exists in this organization')
    }

    // Add other business rule validations here
  }

  /**
   * Validate update data against business rules
   */
  private async validateUpdateData(
    data: UpdateTemplateDTO,
    existing: TemplateEntity,
    userId: string
  ): Promise<void> {
    // Check name uniqueness if name is being changed
    if (data.name && data.name !== existing.name) {
      const { data: duplicate } = await this.supabase
        .from('templates')
        .select('id')
        .eq('name', data.name)
        .eq('organization_id', existing.organization_id)
        .neq('id', existing.id)
        .single()

      if (duplicate) {
        throw new Error('Template name already exists in this organization')
      }
    }

    // Add other business rule validations here
  }

  /**
   * Validate deletion against business rules
   */
  private async validateDelete(template: TemplateEntity, userId: string): Promise<void> {
    // Check if template is being used somewhere
    // Add checks for dependencies here

    // Example: Check if template has related items
    const { count } = await this.supabase
      .from('template_related') // Replace with actual related table
      .select('*', { count: 'exact', head: true })
      .eq('template_id', template.id)

    if (count && count > 0) {
      throw new Error('Cannot delete template with existing related items')
    }
  }
}