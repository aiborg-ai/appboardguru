/**
 * BoardMate API Handler
 * Type-safe, reusable handler for boardmate operations
 * Part of Phase 2: API Consolidation
 */

import type { NextRequest } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type { BoardMateAPI } from '@/types/api'
import { createAPIHandler } from '../createAPIHandler'
import { validateAuth, validateOrgAccess } from '../middleware/auth'
import { PaginationParams, PaginationMeta, createPaginationMeta } from '@/types/core'

// Type-safe query parameters
interface BoardMateListQuery extends PaginationParams {
  readonly organization_id: string
  readonly exclude_self?: boolean
  readonly search?: string
  readonly role?: string
  readonly status?: string
}

// Enhanced boardmate profile with typed associations
interface BoardMateProfileWithAssociations {
  readonly id: string
  readonly user_id: string
  readonly organization_id: string
  readonly email: string
  readonly full_name: string
  readonly role: string
  readonly status: string
  readonly avatar_url: string | null
  readonly phone: string | null
  readonly bio: string | null
  readonly departments: readonly string[]
  readonly date_joined: string
  readonly last_login_at: string | null
  readonly org_joined_at: string
  readonly org_last_accessed: string | null
  readonly board_memberships: readonly {
    readonly board_id: string
    readonly board_name: string
    readonly role: string
    readonly joined_at: string
  }[]
  readonly committee_memberships: readonly {
    readonly committee_id: string
    readonly committee_name: string
    readonly role: string
    readonly joined_at: string
  }[]
  readonly vault_memberships: readonly {
    readonly vault_id: string
    readonly vault_name: string
    readonly permission: string
    readonly granted_at: string
  }[]
}

// API Response type
interface BoardMateListResponse {
  readonly boardmates: readonly BoardMateProfileWithAssociations[]
  readonly pagination: PaginationMeta
  readonly organization: {
    readonly id: string
    readonly name: string
  }
}

/**
 * Type-safe BoardMate handler class
 */
export class BoardMateHandler {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly adminClient: SupabaseClient<Database>
  ) {}

  /**
   * List boardmates for an organization
   */
  async listBoardMates(
    request: NextRequest,
    userId: string
  ): Promise<BoardMateListResponse> {
    const query = this.parseQuery(request)
    
    // Validate organization access
    await validateOrgAccess(this.supabase, userId, query.organization_id)

    // Build query with proper typing
    let dbQuery = this.adminClient
      .from('boardmate_profiles')
      .select('*')
      .eq('organization_id', query.organization_id)
      .eq('user_status', 'approved')
      .eq('org_status', 'active')
      .order('full_name')
      .range(query.page * query.limit, (query.page + 1) * query.limit - 1)

    // Apply filters
    if (query.exclude_self) {
      dbQuery = dbQuery.neq('user_id', userId)
    }
    
    if (query.search) {
      dbQuery = dbQuery.or(`full_name.ilike.%${query.search}%,email.ilike.%${query.search}%`)
    }
    
    if (query.role) {
      dbQuery = dbQuery.eq('role', query.role)
    }
    
    if (query.status) {
      dbQuery = dbQuery.eq('status', query.status)
    }

    const { data: boardmates, error } = await dbQuery
    if (error) throw error

    // Get total count for pagination
    const { count, error: countError } = await this.adminClient
      .from('boardmate_profiles')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', query.organization_id)
      .eq('user_status', 'approved')
      .eq('org_status', 'active')

    if (countError) throw countError

    // Transform data with type safety
    const transformedBoardmates = (boardmates || []).map(this.transformBoardMate)

    // Get organization info
    const { data: org } = await this.supabase
      .from('organizations')
      .select('id, name')
      .eq('id', query.organization_id)
      .single()

    return {
      boardmates: transformedBoardmates,
      pagination: createPaginationMeta({
        page: query.page,
        limit: query.limit,
        total: count || 0
      }),
      organization: {
        id: query.organization_id,
        name: org?.name || 'Unknown Organization'
      }
    }
  }

  /**
   * Parse and validate query parameters
   */
  private parseQuery(request: NextRequest): BoardMateListQuery {
    const { searchParams } = new URL(request.url)
    
    const organization_id = searchParams.get('organization_id')
    if (!organization_id) {
      throw new Error('Organization ID is required')
    }

    return {
      organization_id,
      page: Math.max(0, parseInt(searchParams.get('page') || '0')),
      limit: Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50'))),
      exclude_self: searchParams.get('exclude_self') !== 'false',
      search: searchParams.get('search') || undefined,
      role: searchParams.get('role') || undefined,
      status: searchParams.get('status') || undefined,
    }
  }

  /**
   * Transform raw database result to typed response
   */
  private transformBoardMate(boardmate: any): BoardMateProfileWithAssociations {
    return {
      id: boardmate.id,
      user_id: boardmate.user_id,
      organization_id: boardmate.organization_id,
      email: boardmate.email,
      full_name: boardmate.full_name,
      role: boardmate.role,
      status: boardmate.status,
      avatar_url: boardmate.avatar_url,
      phone: boardmate.phone,
      bio: boardmate.bio,
      departments: Array.isArray(boardmate.departments) ? boardmate.departments : [],
      date_joined: boardmate.date_joined,
      last_login_at: boardmate.last_login_at,
      org_joined_at: boardmate.org_joined_at,
      org_last_accessed: boardmate.org_last_accessed,
      board_memberships: Array.isArray(boardmate.board_memberships) 
        ? boardmate.board_memberships.filter((bm: unknown) => bm !== null)
        : [],
      committee_memberships: Array.isArray(boardmate.committee_memberships)
        ? boardmate.committee_memberships.filter((cm: unknown) => cm !== null)
        : [],
      vault_memberships: Array.isArray(boardmate.vault_memberships)
        ? boardmate.vault_memberships.filter((vm: unknown) => vm !== null)
        : []
    }
  }
}

// Export the handler factory function
export const createBoardMateHandler = (
  supabase: SupabaseClient<Database>,
  adminClient: SupabaseClient<Database>
) => new BoardMateHandler(supabase, adminClient)