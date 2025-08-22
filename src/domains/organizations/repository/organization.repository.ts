/**
 * Organization Repository
 * Handles all database operations for the organization domain
 */

import { BaseRepository } from '@/lib/repositories/base.repository'
import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import {
  OrganizationEntity,
  OrganizationEntityWithRelations,
  OrganizationMemberEntity
} from '../types/entity.types'
import {
  CreateOrganizationDTO,
  UpdateOrganizationDTO,
  OrganizationListFilters,
  OrganizationListResponse
} from '../types/dto.types'

export class OrganizationRepository extends BaseRepository {
  protected tableName = 'organizations' as const
  
  constructor(supabase: SupabaseClient<Database>) {
    super(supabase)
  }

  protected getEntityName(): string {
    return 'Organization'
  }

  protected getSearchFields(): string[] {
    return ['name', 'description', 'slug']
  }

  private handleError(error: any, operation: string): void {
    console.error(`OrganizationRepository.${operation}:`, error)
  }

  /**
   * Find organization by ID with optional relations
   */
  async findById(
    id: string, 
    includeRelations = false
  ): Promise<OrganizationEntityWithRelations | null> {
    try {
      let query = this.supabase
        .from(this.tableName)
        .select(this.buildSelectString(includeRelations))
        .eq('id', id)
        .eq('is_active', true)
        .single()

      const { data, error } = await query

      if (error) {
        if (error.code === 'PGRST116') return null
        this.handleError(error, 'findById')
        return null
      }

      return data as any as OrganizationEntityWithRelations
    } catch (error) {
      this.handleError(error, 'findById')
      return null
    }
  }

  /**
   * Find organization by slug
   */
  async findBySlug(slug: string): Promise<OrganizationEntityWithRelations | null> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select(this.buildSelectString(true))
        .eq('slug', slug)
        .eq('is_active', true)
        .single()

      if (error) {
        if (error.code === 'PGRST116') return null
        this.handleError(error, 'findBySlug')
        return null
      }

      return data as any as OrganizationEntityWithRelations
    } catch (error) {
      this.handleError(error, 'findBySlug')
      return null
    }
  }

  /**
   * Find organizations for a user
   */
  async findByUserId(userId: string): Promise<OrganizationEntityWithRelations[]> {
    try {
      const { data, error } = await this.supabase
        .from('organization_members')
        .select(`
          role,
          status,
          is_primary,
          joined_at,
          organizations!inner (
            id,
            name,
            slug,
            description,
            logo_url,
            website,
            industry,
            organization_size,
            created_by,
            created_at,
            updated_at,
            is_active,
            settings,
            compliance_settings,
            billing_settings
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'active')
        .eq('organizations.is_active', true)
        .order('is_primary', { ascending: false })
        .order('joined_at', { ascending: false })

      if (error) {
        this.handleError(error, 'findByUserId')
        return []
      }

      return (data as any[])?.map(item: unknown) => ({
        ...item.organizations,
        user_role: item.role,
        user_status: item.status,
        is_primary: item.is_primary,
        joined_at: item.joined_at,
      })) || []
    } catch (error) {
      this.handleError(error, 'findByUserId')
      return []
    }
  }

  /**
   * Find organizations with filtering, sorting, and pagination
   */
  async findMany(filters: OrganizationListFilters = {}): Promise<OrganizationListResponse> {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        status,
        created_by,
        organization_size,
        industry,
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
        .eq('is_active', true)

      // Apply filters
      if (search) {
        query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,slug.ilike.%${search}%`)
      }

      if (status) {
        if (Array.isArray(status)) {
          query = query.in('status', status)
        } else {
          query = query.eq('status', status)
        }
      }

      if (created_by) {
        query = query.eq('created_by', created_by)
      }

      if (organization_size) {
        if (Array.isArray(organization_size)) {
          query = query.in('organization_size', organization_size)
        } else {
          query = query.eq('organization_size', organization_size)
        }
      }

      if (industry) {
        query = query.eq('industry', industry)
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
        return {
          items: [],
          pagination: {
            page: 1,
            limit: 20,
            total: 0,
            total_pages: 0,
            has_next: false,
            has_prev: false
          },
          filters
        }
      }

      const total = count || 0
      const totalPages = Math.ceil(total / limit)

      return {
        items: (data || []) as unknown as OrganizationEntityWithRelations[],
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
      return {
        items: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          total_pages: 0,
          has_next: false,
          has_prev: false
        },
        filters
      }
    }
  }

  /**
   * Create a new organization
   */
  async create(data: CreateOrganizationDTO & { created_by: string }): Promise<OrganizationEntity> {
    try {
      const insertData = {
        ...data,
        is_active: true,
        settings: data.settings || {},
        compliance_settings: data.compliance_settings || {},
        billing_settings: data.billing_settings || {},
        updated_at: new Date().toISOString()
      }

      const { data: organization, error } = await this.supabase
        .from(this.tableName)
        .insert(insertData)
        .select()
        .single()

      if (error) {
        this.handleError(error, 'create')
      }

      return organization as OrganizationEntity
    } catch (error) {
      this.handleError(error, 'create')
      throw error
    }
  }

  /**
   * Update an existing organization
   */
  async update(id: string, data: UpdateOrganizationDTO): Promise<OrganizationEntity> {
    try {
      const updateData = {
        ...data,
        updated_at: new Date().toISOString()
      }

      const { data: organization, error } = await this.supabase
        .from(this.tableName)
        .update(updateData)
        .eq('id', id)
        .eq('is_active', true)
        .select()
        .single()

      if (error) {
        this.handleError(error, 'update')
      }

      return organization as OrganizationEntity
    } catch (error) {
      this.handleError(error, 'update')
      throw error
    }
  }

  /**
   * Delete an organization (soft delete)
   */
  async delete(id: string): Promise<void> {
    try {
      const deletionScheduledFor = new Date()
      deletionScheduledFor.setDate(deletionScheduledFor.getDate() + 30) // 30 day grace period

      const { error } = await this.supabase
        .from(this.tableName)
        .update({ 
          is_active: false,
          deleted_at: new Date().toISOString(),
          deletion_scheduled_for: deletionScheduledFor.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) {
        this.handleError(error, 'delete')
      }
    } catch (error) {
      this.handleError(error, 'delete')
      throw error
    }
  }

  /**
   * Hard delete an organization (permanent)
   */
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
      throw error
    }
  }

  /**
   * Check if user has access to organization
   */
  async checkUserAccess(organizationId: string, userId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('organization_members')
        .select('role, status')
        .eq('organization_id', organizationId)
        .eq('user_id', userId)
        .eq('status', 'active')
        .single()

      if (error && error.code !== 'PGRST116') {
        this.handleError(error, 'checkUserAccess')
        return false
      }

      return !!data
    } catch (error) {
      this.handleError(error, 'checkUserAccess')
      return false
    }
  }

  /**
   * Get organization members
   */
  async getMembers(organizationId: string): Promise<OrganizationMemberEntity[]> {
    try {
      const { data, error } = await this.supabase
        .from('organization_members')
        .select(`
          *,
          users!inner (
            id,
            email,
            full_name,
            avatar_url
          )
        `)
        .eq('organization_id', organizationId)
        .in('status', ['active', 'suspended'])
        .order('role')
        .order('joined_at')

      if (error) {
        this.handleError(error, 'getMembers')
        return []
      }

      return (data as any[])?.map((member: any) => ({
        ...member,
        user: member.users,
        users: undefined, // Remove the users property
      })) || []
    } catch (error) {
      this.handleError(error, 'getMembers')
      return []
    }
  }

  /**
   * Check if organization slug is available
   */
  async isSlugAvailable(slug: string, excludeId?: string): Promise<boolean> {
    try {
      let query = this.supabase
        .from(this.tableName)
        .select('id')
        .eq('slug', slug)
        .eq('is_active', true)

      if (excludeId) {
        query = query.neq('id', excludeId)
      }

      const { data, error } = await query.single()

      if (error && error.code !== 'PGRST116') {
        this.handleError(error, 'isSlugAvailable')
        return false
      }

      // If no organization found with this slug, it's available
      return !data
    } catch (error) {
      this.handleError(error, 'isSlugAvailable')
      return false
    }
  }

  /**
   * Build select string with optional relations
   */
  private buildSelectString(includeRelations: boolean): string {
    const baseSelect = '*'

    if (includeRelations) {
      return `${baseSelect},
        created_by_user:users!organizations_created_by_fkey(
          id, full_name, email
        ),
        member_count:organization_members(count)`
    }

    return baseSelect
  }
}