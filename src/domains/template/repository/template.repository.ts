/**
 * Template Repository
 * Handles all database operations for the template domain
 */

import { BaseRepository } from '@/lib/repositories/base.repository'
import { withQueryMonitoring } from '@/lib/monitoring'
import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import {
  TemplateEntity,
  TemplateEntityWithRelations,
  TemplateStatus
} from '../types/entity.types'
import {
  CreateTemplateDTO,
  UpdateTemplateDTO,
  TemplateListFilters,
  TemplateListResponse
} from '../types/dto.types'

export class TemplateRepository extends BaseRepository {
  protected tableName = 'templates' // Change to your table name
  
  constructor(supabase: SupabaseClient<Database>) {
    super(supabase)
  }

  /**
   * Find template by ID with optional relations
   */
  @withQueryMonitoring
  async findById(
    id: string, 
    includeRelations = false
  ): Promise<TemplateEntityWithRelations | null> {
    try {
      let query = this.supabase
        .from(this.tableName)
        .select(this.buildSelectString(includeRelations))
        .eq('id', id)
        .single()

      const { data, error } = await query

      if (error) {
        if (error.code === 'PGRST116') return null
        this.handleError(error, 'findById')
      }

      return data as TemplateEntityWithRelations
    } catch (error) {
      this.handleError(error, 'findById')
    }
  }

  /**
   * Find templates with filtering, sorting, and pagination
   */
  @withQueryMonitoring
  async findMany(filters: TemplateListFilters = {}): Promise<TemplateListResponse> {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        status,
        organization_id,
        created_by,
        tags,
        created_after,
        created_before,
        updated_after,
        updated_before,
        sort_by = 'updated_at',
        sort_order = 'desc'
      } = filters

      // Build the query
      let query = this.supabase
        .from(this.tableName)
        .select(this.buildSelectString(true), { count: 'exact' })

      // Apply filters
      if (search) {
        query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
      }

      if (status) {
        if (Array.isArray(status)) {
          query = query.in('status', status)
        } else {
          query = query.eq('status', status)
        }
      }

      if (organization_id) {
        query = query.eq('organization_id', organization_id)
      }

      if (created_by) {
        query = query.eq('created_by', created_by)
      }

      if (tags && tags.length > 0) {
        query = query.contains('tags', tags)
      }

      if (created_after) {
        query = query.gte('created_at', created_after)
      }

      if (created_before) {
        query = query.lte('created_at', created_before)
      }

      if (updated_after) {
        query = query.gte('updated_at', updated_after)
      }

      if (updated_before) {
        query = query.lte('updated_at', updated_before)
      }

      // Apply sorting
      const ascending = sort_order === 'asc'
      query = query.order(sort_by, { ascending })

      // Apply pagination
      const from = (page - 1) * limit
      const to = from + limit - 1
      query = query.range(from, to)

      const { data, error, count } = await query

      if (error) {
        this.handleError(error, 'findMany')
      }

      const total = count || 0
      const totalPages = Math.ceil(total / limit)

      return {
        items: data as TemplateEntityWithRelations[],
        pagination: {
          page,
          limit,
          total,
          total_pages: totalPages,
          has_next: page < totalPages,
          has_prev: page > 1
        },
        filters
      }
    } catch (error) {
      this.handleError(error, 'findMany')
    }
  }

  /**
   * Create a new template
   */
  @withQueryMonitoring
  async create(data: CreateTemplateDTO): Promise<TemplateEntity> {
    try {
      const userId = await this.getCurrentUserId()
      
      const insertData = {
        ...data,
        created_by: userId,
        updated_at: new Date().toISOString()
      }

      const { data: template, error } = await this.supabase
        .from(this.tableName)
        .insert(insertData)
        .select()
        .single()

      if (error) {
        this.handleError(error, 'create')
      }

      return template as TemplateEntity
    } catch (error) {
      this.handleError(error, 'create')
    }
  }

  /**
   * Update an existing template
   */
  @withQueryMonitoring
  async update(id: string, data: UpdateTemplateDTO): Promise<TemplateEntity> {
    try {
      const updateData = {
        ...data,
        updated_at: new Date().toISOString()
      }

      const { data: template, error } = await this.supabase
        .from(this.tableName)
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        this.handleError(error, 'update')
      }

      return template as TemplateEntity
    } catch (error) {
      this.handleError(error, 'update')
    }
  }

  /**
   * Delete a template (soft delete)
   */
  @withQueryMonitoring
  async delete(id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from(this.tableName)
        .update({ 
          status: 'archived' as TemplateStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) {
        this.handleError(error, 'delete')
      }
    } catch (error) {
      this.handleError(error, 'delete')
    }
  }

  /**
   * Hard delete a template (permanent)
   */
  @withQueryMonitoring
  async hardDelete(id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from(this.tableName)
        .delete()
        .eq('id', id)

      if (error) {
        this.handleError(error, 'hardDelete')
      }
    } catch (error) {
      this.handleError(error, 'hardDelete')
    }
  }

  /**
   * Bulk update templates
   */
  @withQueryMonitoring
  async bulkUpdate(ids: string[], data: UpdateTemplateDTO): Promise<TemplateEntity[]> {
    try {
      const updateData = {
        ...data,
        updated_at: new Date().toISOString()
      }

      const { data: templates, error } = await this.supabase
        .from(this.tableName)
        .update(updateData)
        .in('id', ids)
        .select()

      if (error) {
        this.handleError(error, 'bulkUpdate')
      }

      return templates as TemplateEntity[]
    } catch (error) {
      this.handleError(error, 'bulkUpdate')
    }
  }

  /**
   * Check if user has access to template
   */
  @withQueryMonitoring
  async checkAccess(templateId: string, userId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('id')
        .eq('id', templateId)
        .or(`created_by.eq.${userId},organization_id.in.(SELECT organization_id FROM organization_members WHERE user_id = '${userId}' AND status = 'active')`)
        .single()

      if (error && error.code !== 'PGRST116') {
        this.handleError(error, 'checkAccess')
      }

      return !!data
    } catch (error) {
      this.handleError(error, 'checkAccess')
    }
  }

  /**
   * Build select string with optional relations
   */
  private buildSelectString(includeRelations: boolean): string {
    const baseSelect = `
      *,
      organization:organizations!templates_organization_id_fkey(
        id, name, slug
      ),
      created_by_user:users!templates_created_by_fkey(
        id, full_name, email
      )
    `

    if (includeRelations) {
      return `${baseSelect},
        related_count:template_related(count)`
    }

    return baseSelect
  }
}

// Decorator factory for query monitoring
function withQueryMonitoring(
  target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor
) {
  const originalMethod = descriptor.value

  descriptor.value = async function (...args: any[]) {
    const start = Date.now()
    try {
      const result = await originalMethod.apply(this, args)
      const duration = Date.now() - start
      
      // Track query performance
      const { monitor } = await import('@/lib/monitoring')
      monitor.trackDatabaseQuery(
        `${target.constructor.name}.${propertyKey}`,
        duration,
        { args: args.length }
      )
      
      return result
    } catch (error) {
      const { monitor } = await import('@/lib/monitoring')
      monitor.trackError(`${target.constructor.name}.${propertyKey}`, error as Error)
      throw error
    }
  }

  return descriptor
}