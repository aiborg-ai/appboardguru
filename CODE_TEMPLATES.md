# Code Templates - AppBoardGuru DDD Architecture

## 🎯 **Reusable Templates for Rapid Development**

These templates follow the established DDD architecture patterns from CLAUDE.md. Copy and adapt for new features.

---

## **1. Domain Types Template**

```typescript
// src/types/[FEATURE_NAME].ts

import { z } from 'zod'
import { Result, ValidationError } from '@/lib/utils/result'

// ==================== BRANDED TYPES ====================
export type [FEATURE_NAME]Id = string & { readonly __brand: unique symbol }
// Add other entity IDs as needed

// Type constructors with validation
export const create[FEATURE_NAME]Id = (id: string): Result<[FEATURE_NAME]Id> => {
  if (!id || typeof id !== 'string' || !id.match(/^[0-9a-f-]{36}$/)) {
    return { success: false, error: new ValidationError('Invalid [FEATURE_NAME] ID') }
  }
  return { success: true, data: id as [FEATURE_NAME]Id }
}

// ==================== DOMAIN MODELS ====================
export interface [FEATURE_NAME] {
  readonly id: [FEATURE_NAME]Id
  readonly organization_id: OrganizationId
  readonly created_by: UserId
  readonly name: string
  readonly description?: string
  readonly status: '[FEATURE_NAME]_status_1' | '[FEATURE_NAME]_status_2' | 'active' | 'archived'
  readonly priority: 'low' | 'medium' | 'high' | 'urgent'
  readonly tags: string[]
  readonly metadata?: Record<string, unknown>
  readonly created_at: string
  readonly updated_at: string
}

// ==================== REQUEST/RESPONSE TYPES ====================
export interface Create[FEATURE_NAME]Request {
  name: string
  description?: string
  priority?: [FEATURE_NAME]['priority']
  tags?: string[]
  metadata?: Record<string, unknown>
}

export interface Update[FEATURE_NAME]Request {
  name?: string
  description?: string
  status?: [FEATURE_NAME]['status']
  priority?: [FEATURE_NAME]['priority']
  tags?: string[]
  metadata?: Record<string, unknown>
}

export interface [FEATURE_NAME]Filters {
  organization_id?: OrganizationId
  created_by?: UserId
  status?: [FEATURE_NAME]['status']
  priority?: [FEATURE_NAME]['priority']
  tags?: string[]
  search_query?: string
  date_from?: string
  date_to?: string
}

// ==================== VALIDATION SCHEMAS ====================
export const create[FEATURE_NAME]Schema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  tags: z.array(z.string()).max(10).optional(),
  metadata: z.record(z.unknown()).optional()
})

export const update[FEATURE_NAME]Schema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  status: z.enum(['[FEATURE_NAME]_status_1', '[FEATURE_NAME]_status_2', 'active', 'archived']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  tags: z.array(z.string()).max(10).optional(),
  metadata: z.record(z.unknown()).optional()
})

// ==================== DOMAIN EVENTS ====================
export interface [FEATURE_NAME]CreatedEvent {
  type: '[FEATURE_NAME]_CREATED'
  [featureName]Id: [FEATURE_NAME]Id
  organizationId: OrganizationId
  createdBy: UserId
  timestamp: string
}

export interface [FEATURE_NAME]UpdatedEvent {
  type: '[FEATURE_NAME]_UPDATED'
  [featureName]Id: [FEATURE_NAME]Id
  organizationId: OrganizationId
  updatedBy: UserId
  changes: Partial<[FEATURE_NAME]>
  timestamp: string
}

export interface [FEATURE_NAME]DeletedEvent {
  type: '[FEATURE_NAME]_DELETED'
  [featureName]Id: [FEATURE_NAME]Id
  organizationId: OrganizationId
  deletedBy: UserId
  timestamp: string
}
```

---

## **2. Repository Template**

```typescript
// src/lib/repositories/[feature-name].repository.ts

import { BaseRepository } from './base.repository'
import { [FEATURE_NAME], [FEATURE_NAME]Id, [FEATURE_NAME]Filters } from '@/types/[feature-name]'
import { Result } from '@/lib/utils/result'
import { OrganizationId, UserId } from '@/types/branded'

export class [FEATURE_NAME]Repository extends BaseRepository<[FEATURE_NAME]> {
  protected tableName = '[feature_name]s' as const
  
  constructor(supabase: SupabaseClient) {
    super(supabase)
  }

  // ==================== BUSINESS-SPECIFIC QUERIES ====================
  
  async findByOrganization(organizationId: OrganizationId): Promise<Result<[FEATURE_NAME][]>> {
    return this.executeQuery(async () => {
      const { data, error } = await this.queryBuilder()
        .from(this.tableName)
        .select('*')
        .eq('organization_id', organizationId)
        .order('updated_at', { ascending: false })
      
      if (error) throw error
      return data as [FEATURE_NAME][]
    })
  }

  async findByUser(userId: UserId): Promise<Result<[FEATURE_NAME][]>> {
    return this.executeQuery(async () => {
      const { data, error } = await this.queryBuilder()
        .from(this.tableName)
        .select('*')
        .eq('created_by', userId)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data as [FEATURE_NAME][]
    })
  }

  async findByStatus(status: [FEATURE_NAME]['status']): Promise<Result<[FEATURE_NAME][]>> {
    return this.executeQuery(async () => {
      const { data, error } = await this.queryBuilder()
        .from(this.tableName)
        .select('*')
        .eq('status', status)
        .order('priority', { ascending: false })
      
      if (error) throw error
      return data as [FEATURE_NAME][]
    })
  }

  // Advanced search with filters
  async search(filters: [FEATURE_NAME]Filters): Promise<Result<[FEATURE_NAME][]>> {
    return this.executeQuery(async () => {
      let query = this.queryBuilder()
        .from(this.tableName)
        .select('*')

      // Apply filters dynamically
      if (filters.organization_id) query = query.eq('organization_id', filters.organization_id)
      if (filters.created_by) query = query.eq('created_by', filters.created_by)
      if (filters.status) query = query.eq('status', filters.status)
      if (filters.priority) query = query.eq('priority', filters.priority)
      
      // Tag filtering (array contains)
      if (filters.tags?.length) {
        query = query.contains('tags', filters.tags)
      }
      
      // Date range filtering
      if (filters.date_from) query = query.gte('created_at', filters.date_from)
      if (filters.date_to) query = query.lte('created_at', filters.date_to)
      
      // Full-text search
      if (filters.search_query) {
        query = query.or(`name.ilike.%${filters.search_query}%,description.ilike.%${filters.search_query}%`)
      }

      const { data, error } = await query.order('updated_at', { ascending: false })
      
      if (error) throw error
      return data as [FEATURE_NAME][]
    })
  }

  // Get statistics for dashboard
  async getStats(organizationId: OrganizationId): Promise<Result<{
    total: number
    active: number
    archived: number
    high_priority: number
  }>> {
    return this.executeQuery(async () => {
      const { data, error } = await this.queryBuilder()
        .from(this.tableName)
        .select('status, priority')
        .eq('organization_id', organizationId)
      
      if (error) throw error
      
      const total = data.length
      const active = data.filter(item => item.status === 'active').length
      const archived = data.filter(item => item.status === 'archived').length
      const high_priority = data.filter(item => 
        ['high', 'urgent'].includes(item.priority)
      ).length

      return { total, active, archived, high_priority }
    })
  }

  // Override create to add audit logging
  async create(data: Omit<[FEATURE_NAME], 'id' | 'created_at' | 'updated_at'>): Promise<Result<[FEATURE_NAME]>> {
    return this.transaction(async () => {
      const result = await super.create(data)
      
      if (result.success) {
        // Log the creation for audit trail
        await this.auditLogger.log({
          action: 'CREATE_[FEATURE_NAME_UPPER]',
          resource_type: '[feature_name]',
          resource_id: result.data.id,
          user_id: data.created_by,
          metadata: {
            organization_id: data.organization_id,
            name: data.name,
            status: data.status
          }
        })
      }
      
      return result
    })
  }

  // Override update to add audit logging
  async update(
    id: [FEATURE_NAME]Id, 
    data: Partial<Omit<[FEATURE_NAME], 'id' | 'created_at' | 'updated_at'>>
  ): Promise<Result<[FEATURE_NAME]>> {
    return this.transaction(async () => {
      const result = await super.update(id, data)
      
      if (result.success) {
        await this.auditLogger.log({
          action: 'UPDATE_[FEATURE_NAME_UPPER]',
          resource_type: '[feature_name]',
          resource_id: id,
          user_id: data.created_by,
          metadata: { changes: data }
        })
      }
      
      return result
    })
  }

  // Override delete to add audit logging
  async delete(id: [FEATURE_NAME]Id, userId: UserId): Promise<Result<void>> {
    return this.transaction(async () => {
      const result = await super.delete(id)
      
      if (result.success) {
        await this.auditLogger.log({
          action: 'DELETE_[FEATURE_NAME_UPPER]',
          resource_type: '[feature_name]',
          resource_id: id,
          user_id: userId
        })
      }
      
      return result
    })
  }
}
```

---

## **3. Service Template**

```typescript
// src/lib/services/[feature-name].service.ts

import { [FEATURE_NAME]Repository } from '@/lib/repositories/[feature-name].repository'
import { PermissionService } from './permission.service'
import { NotificationService } from './notification.service'
import { EventBus } from './event-bus.service'
import { 
  [FEATURE_NAME], 
  [FEATURE_NAME]Id, 
  Create[FEATURE_NAME]Request, 
  Update[FEATURE_NAME]Request,
  [FEATURE_NAME]Filters,
  [FEATURE_NAME]CreatedEvent,
  [FEATURE_NAME]UpdatedEvent,
  [FEATURE_NAME]DeletedEvent
} from '@/types/[feature-name]'
import { UserId, OrganizationId } from '@/types/branded'
import { Result, PermissionError, NotFoundError, ValidationError } from '@/lib/utils/result'

export class [FEATURE_NAME]Service {
  constructor(
    private [featureName]Repository: [FEATURE_NAME]Repository,
    private permissionService: PermissionService,
    private notificationService: NotificationService,
    private eventBus: EventBus
  ) {}

  // ==================== CRUD OPERATIONS ====================

  async create[FEATURE_NAME](
    userId: UserId,
    organizationId: OrganizationId,
    request: Create[FEATURE_NAME]Request
  ): Promise<Result<[FEATURE_NAME]>> {
    // 1. Validate permissions
    const hasPermission = await this.permissionService.canCreate[FEATURE_NAME](
      userId, 
      organizationId
    )
    if (!hasPermission.success || !hasPermission.data) {
      return { success: false, error: new PermissionError('Cannot create [feature_name]') }
    }

    // 2. Business logic validation
    const validation = await this.validate[FEATURE_NAME]Creation(request, organizationId)
    if (!validation.success) {
      return validation
    }

    // 3. Create the entity
    const [featureName]Data = {
      ...request,
      organization_id: organizationId,
      created_by: userId,
      status: '[FEATURE_NAME]_status_1' as const, // Set initial status
      priority: request.priority || 'medium' as const,
      tags: request.tags || [],
      metadata: request.metadata || {}
    }

    const result = await this.[featureName]Repository.create([featureName]Data)
    
    if (result.success) {
      // 4. Publish domain event
      await this.eventBus.publish({
        type: '[FEATURE_NAME]_CREATED',
        [featureName]Id: result.data.id,
        organizationId,
        createdBy: userId,
        timestamp: new Date().toISOString()
      } as [FEATURE_NAME]CreatedEvent)

      // 5. Send notifications if needed
      await this.notificationService.send[FEATURE_NAME]Created({
        [featureName]Id: result.data.id,
        organizationId,
        createdBy: userId,
        name: result.data.name
      })
    }

    return result
  }

  async update[FEATURE_NAME](
    userId: UserId,
    [featureName]Id: [FEATURE_NAME]Id,
    request: Update[FEATURE_NAME]Request
  ): Promise<Result<[FEATURE_NAME]>> {
    // 1. Check entity exists and get current state
    const existing = await this.[featureName]Repository.findById([featureName]Id)
    if (!existing.success || !existing.data) {
      return { success: false, error: new NotFoundError('[FEATURE_NAME] not found') }
    }

    // 2. Check permissions
    const canUpdate = await this.permissionService.canUpdate[FEATURE_NAME](
      userId, 
      [featureName]Id
    )
    if (!canUpdate.success || !canUpdate.data) {
      return { success: false, error: new PermissionError('Cannot update [feature_name]') }
    }

    // 3. Business logic validation
    const validation = await this.validate[FEATURE_NAME]Update(request, existing.data)
    if (!validation.success) {
      return validation
    }

    // 4. Update entity
    const result = await this.[featureName]Repository.update([featureName]Id, request)
    
    if (result.success) {
      // 5. Publish domain event
      await this.eventBus.publish({
        type: '[FEATURE_NAME]_UPDATED',
        [featureName]Id,
        organizationId: existing.data.organization_id,
        updatedBy: userId,
        changes: request,
        timestamp: new Date().toISOString()
      } as [FEATURE_NAME]UpdatedEvent)

      // 6. Handle status changes
      if (request.status && request.status !== existing.data.status) {
        await this.handle[FEATURE_NAME]StatusChange(
          result.data,
          existing.data.status,
          request.status,
          userId
        )
      }
    }

    return result
  }

  async delete[FEATURE_NAME](
    userId: UserId,
    [featureName]Id: [FEATURE_NAME]Id
  ): Promise<Result<void>> {
    // 1. Check entity exists
    const existing = await this.[featureName]Repository.findById([featureName]Id)
    if (!existing.success || !existing.data) {
      return { success: false, error: new NotFoundError('[FEATURE_NAME] not found') }
    }

    // 2. Check permissions
    const canDelete = await this.permissionService.canDelete[FEATURE_NAME](
      userId, 
      [featureName]Id
    )
    if (!canDelete.success || !canDelete.data) {
      return { success: false, error: new PermissionError('Cannot delete [feature_name]') }
    }

    // 3. Business logic validation (e.g., check dependencies)
    const validation = await this.validate[FEATURE_NAME]Deletion(existing.data)
    if (!validation.success) {
      return validation
    }

    // 4. Delete entity
    const result = await this.[featureName]Repository.delete([featureName]Id, userId)
    
    if (result.success) {
      // 5. Publish domain event
      await this.eventBus.publish({
        type: '[FEATURE_NAME]_DELETED',
        [featureName]Id,
        organizationId: existing.data.organization_id,
        deletedBy: userId,
        timestamp: new Date().toISOString()
      } as [FEATURE_NAME]DeletedEvent)

      // 6. Cleanup related data if needed
      await this.cleanup[FEATURE_NAME]Dependencies(existing.data)
    }

    return result
  }

  // ==================== QUERY OPERATIONS ====================

  async get[FEATURE_NAME]sByOrganization(
    userId: UserId,
    organizationId: OrganizationId,
    filters: [FEATURE_NAME]Filters = {}
  ): Promise<Result<[FEATURE_NAME][]>> {
    // Check permissions
    const canView = await this.permissionService.canView[FEATURE_NAME]s(
      userId, 
      organizationId
    )
    if (!canView.success || !canView.data) {
      return { success: false, error: new PermissionError('Cannot view [feature_name]s') }
    }

    // Apply organization filter
    const enhancedFilters = {
      ...filters,
      organization_id: organizationId
    }

    return this.[featureName]Repository.search(enhancedFilters)
  }

  async get[FEATURE_NAME]ById(
    userId: UserId,
    [featureName]Id: [FEATURE_NAME]Id
  ): Promise<Result<[FEATURE_NAME]>> {
    const result = await this.[featureName]Repository.findById([featureName]Id)
    if (!result.success) {
      return result
    }

    // Check permissions
    const canView = await this.permissionService.canView[FEATURE_NAME](
      userId, 
      [featureName]Id
    )
    if (!canView.success || !canView.data) {
      return { success: false, error: new PermissionError('Cannot view [feature_name]') }
    }

    return result
  }

  async get[FEATURE_NAME]Stats(
    userId: UserId,
    organizationId: OrganizationId
  ): Promise<Result<any>> {
    const canView = await this.permissionService.canView[FEATURE_NAME]s(
      userId, 
      organizationId
    )
    if (!canView.success || !canView.data) {
      return { success: false, error: new PermissionError('Cannot view [feature_name] stats') }
    }

    return this.[featureName]Repository.getStats(organizationId)
  }

  // ==================== BUSINESS OPERATIONS ====================

  async bulk[FEATURE_NAME]StatusUpdate(
    userId: UserId,
    [featureName]Ids: [FEATURE_NAME]Id[],
    status: [FEATURE_NAME]['status']
  ): Promise<Result<[FEATURE_NAME][]>> {
    return this.[featureName]Repository.transaction(async () => {
      const results: [FEATURE_NAME][] = []
      
      for (const [featureName]Id of [featureName]Ids) {
        const result = await this.update[FEATURE_NAME](userId, [featureName]Id, { status })
        if (result.success) {
          results.push(result.data)
        }
      }
      
      return results
    })
  }

  // ==================== PRIVATE HELPER METHODS ====================

  private async validate[FEATURE_NAME]Creation(
    request: Create[FEATURE_NAME]Request,
    organizationId: OrganizationId
  ): Promise<Result<void>> {
    // Add business-specific validation logic
    // Example: Check for duplicate names, validate metadata, etc.
    
    if (!request.name || request.name.length < 1) {
      return { success: false, error: new ValidationError('Name is required') }
    }
    
    // Check for duplicate names in organization
    const existing = await this.[featureName]Repository.search({
      organization_id: organizationId,
      search_query: request.name
    })
    
    if (existing.success && existing.data.some(item => 
      item.name.toLowerCase() === request.name.toLowerCase()
    )) {
      return { success: false, error: new ValidationError('Name already exists') }
    }
    
    return { success: true, data: undefined }
  }

  private async validate[FEATURE_NAME]Update(
    request: Update[FEATURE_NAME]Request,
    existing: [FEATURE_NAME]
  ): Promise<Result<void>> {
    // Add business-specific validation logic for updates
    return { success: true, data: undefined }
  }

  private async validate[FEATURE_NAME]Deletion(
    [featureName]: [FEATURE_NAME]
  ): Promise<Result<void>> {
    // Add business-specific validation logic for deletion
    // Example: Check if entity is referenced by other entities
    return { success: true, data: undefined }
  }

  private async handle[FEATURE_NAME]StatusChange(
    [featureName]: [FEATURE_NAME],
    oldStatus: [FEATURE_NAME]['status'],
    newStatus: [FEATURE_NAME]['status'],
    userId: UserId
  ): Promise<void> {
    // Handle business logic for status changes
    // Example: Send notifications, trigger workflows, etc.
    
    if (newStatus === 'active' && oldStatus !== 'active') {
      await this.notificationService.send[FEATURE_NAME]Activated({
        [featureName]Id: [featureName].id,
        organizationId: [featureName].organization_id,
        activatedBy: userId,
        name: [featureName].name
      })
    }
  }

  private async cleanup[FEATURE_NAME]Dependencies(
    [featureName]: [FEATURE_NAME]
  ): Promise<void> {
    // Cleanup related data when entity is deleted
    // Example: Remove references, cleanup files, etc.
  }
}
```

---

## **4. API Controller Template**

```typescript
// src/app/api/[feature-name]/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { [FEATURE_NAME]Service } from '@/lib/services/[feature-name].service'
import { ServiceFactory } from '@/lib/services'
import { 
  create[FEATURE_NAME]Schema, 
  update[FEATURE_NAME]Schema,
  [FEATURE_NAME]Filters 
} from '@/types/[feature-name]'
import { getCurrentUser } from '@/lib/auth/session'
import { ApiResponse } from '@/lib/api/response'
import { createOrganizationId } from '@/types/branded'

const [featureName]Service = ServiceFactory.get[FEATURE_NAME]Service()

/**
 * @openapi
 * /api/[feature-name]:
 *   post:
 *     summary: Create a new [feature_name]
 *     tags: [[FEATURE_NAME]]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Create[FEATURE_NAME]Request'
 *     responses:
 *       201:
 *         description: [FEATURE_NAME] created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/[FEATURE_NAME]'
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return ApiResponse.unauthorized('Authentication required')
    }

    const body = await request.json()
    
    // Validate request body
    const validation = create[FEATURE_NAME]Schema.safeParse(body)
    if (!validation.success) {
      return ApiResponse.badRequest('Invalid request data', validation.error.errors)
    }

    // Get organization ID from headers or user context
    const orgId = request.headers.get('X-Organization-ID') || user.organization_id
    if (!orgId) {
      return ApiResponse.badRequest('Organization ID required')
    }

    const organizationIdResult = createOrganizationId(orgId)
    if (!organizationIdResult.success) {
      return ApiResponse.badRequest('Invalid organization ID')
    }

    const result = await [featureName]Service.create[FEATURE_NAME](
      user.id,
      organizationIdResult.data,
      validation.data
    )

    if (!result.success) {
      if (result.error.name === 'PermissionError') {
        return ApiResponse.forbidden(result.error.message)
      }
      if (result.error.name === 'ValidationError') {
        return ApiResponse.badRequest(result.error.message)
      }
      return ApiResponse.error(result.error.message)
    }

    return ApiResponse.created(result.data)
    
  } catch (error) {
    console.error('Failed to create [feature_name]:', error)
    return ApiResponse.internalError('Failed to create [feature_name]')
  }
}

/**
 * @openapi
 * /api/[feature-name]:
 *   get:
 *     summary: Get [feature_name]s with filtering and pagination
 *     tags: [[FEATURE_NAME]]
 *     parameters:
 *       - name: organization_id
 *         in: query
 *         description: Organization ID to filter by
 *         schema:
 *           type: string
 *           format: uuid
 *       - name: status
 *         in: query
 *         description: Status to filter by
 *         schema:
 *           type: string
 *           enum: [[FEATURE_NAME]_status_1, [FEATURE_NAME]_status_2, active, archived]
 *       - name: priority
 *         in: query
 *         description: Priority to filter by
 *         schema:
 *           type: string
 *           enum: [low, medium, high, urgent]
 *       - name: search
 *         in: query
 *         description: Search query for name and description
 *         schema:
 *           type: string
 *       - name: tags
 *         in: query
 *         description: Comma-separated list of tags
 *         schema:
 *           type: string
 *       - name: page
 *         in: query
 *         description: Page number (1-based)
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - name: limit
 *         in: query
 *         description: Number of items per page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *     responses:
 *       200:
 *         description: [FEATURE_NAME]s retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/[FEATURE_NAME]'
 *                 pagination:
 *                   $ref: '#/components/schemas/PaginationInfo'
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return ApiResponse.unauthorized('Authentication required')
    }

    const { searchParams } = new URL(request.url)
    
    // Parse filters
    const filters: [FEATURE_NAME]Filters = {
      organization_id: searchParams.get('organization_id') || undefined,
      status: searchParams.get('status') as [FEATURE_NAME]['status'] || undefined,
      priority: searchParams.get('priority') as [FEATURE_NAME]['priority'] || undefined,
      search_query: searchParams.get('search') || undefined,
      tags: searchParams.get('tags')?.split(',').filter(Boolean) || undefined,
    }

    // Parse pagination
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))

    // Get organization ID
    const orgId = filters.organization_id || user.organization_id
    if (!orgId) {
      return ApiResponse.badRequest('Organization ID required')
    }

    const organizationIdResult = createOrganizationId(orgId)
    if (!organizationIdResult.success) {
      return ApiResponse.badRequest('Invalid organization ID')
    }

    const result = await [featureName]Service.get[FEATURE_NAME]sByOrganization(
      user.id,
      organizationIdResult.data,
      filters
    )

    if (!result.success) {
      if (result.error.name === 'PermissionError') {
        return ApiResponse.forbidden(result.error.message)
      }
      return ApiResponse.error(result.error.message)
    }

    // Apply pagination
    const total = result.data.length
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedData = result.data.slice(startIndex, endIndex)

    const response = {
      data: paginatedData,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: endIndex < total,
        hasPrev: page > 1
      }
    }

    return ApiResponse.success(response)
    
  } catch (error) {
    console.error('Failed to get [feature_name]s:', error)
    return ApiResponse.internalError('Failed to get [feature_name]s')
  }
}

// Individual [FEATURE_NAME] operations
// src/app/api/[feature-name]/[id]/route.ts

interface RouteParams {
  params: { id: string }
}

/**
 * @openapi
 * /api/[feature-name]/{id}:
 *   get:
 *     summary: Get a specific [feature_name] by ID
 *     tags: [[FEATURE_NAME]]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: [FEATURE_NAME] ID
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: [FEATURE_NAME] retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/[FEATURE_NAME]'
 */
export async function GET(
  request: NextRequest, 
  { params }: RouteParams
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return ApiResponse.unauthorized()
    }

    const [featureName]IdResult = create[FEATURE_NAME]Id(params.id)
    if (![featureName]IdResult.success) {
      return ApiResponse.badRequest('Invalid [feature_name] ID')
    }

    const result = await [featureName]Service.get[FEATURE_NAME]ById(
      user.id,
      [featureName]IdResult.data
    )

    if (!result.success) {
      if (result.error.name === 'NotFoundError') {
        return ApiResponse.notFound(result.error.message)
      }
      if (result.error.name === 'PermissionError') {
        return ApiResponse.forbidden(result.error.message)
      }
      return ApiResponse.error(result.error.message)
    }

    return ApiResponse.success(result.data)
    
  } catch (error) {
    console.error('Failed to get [feature_name]:', error)
    return ApiResponse.internalError()
  }
}

/**
 * @openapi
 * /api/[feature-name]/{id}:
 *   patch:
 *     summary: Update a [feature_name]
 *     tags: [[FEATURE_NAME]]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Update[FEATURE_NAME]Request'
 *     responses:
 *       200:
 *         description: [FEATURE_NAME] updated successfully
 */
export async function PATCH(
  request: NextRequest, 
  { params }: RouteParams
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return ApiResponse.unauthorized()
    }

    const [featureName]IdResult = create[FEATURE_NAME]Id(params.id)
    if (![featureName]IdResult.success) {
      return ApiResponse.badRequest('Invalid [feature_name] ID')
    }

    const body = await request.json()
    const validation = update[FEATURE_NAME]Schema.safeParse(body)
    if (!validation.success) {
      return ApiResponse.badRequest('Invalid request data', validation.error.errors)
    }

    const result = await [featureName]Service.update[FEATURE_NAME](
      user.id,
      [featureName]IdResult.data,
      validation.data
    )

    if (!result.success) {
      if (result.error.name === 'NotFoundError') {
        return ApiResponse.notFound(result.error.message)
      }
      if (result.error.name === 'PermissionError') {
        return ApiResponse.forbidden(result.error.message)
      }
      if (result.error.name === 'ValidationError') {
        return ApiResponse.badRequest(result.error.message)
      }
      return ApiResponse.error(result.error.message)
    }

    return ApiResponse.success(result.data)
    
  } catch (error) {
    console.error('Failed to update [feature_name]:', error)
    return ApiResponse.internalError()
  }
}

/**
 * @openapi
 * /api/[feature-name]/{id}:
 *   delete:
 *     summary: Delete a [feature_name]
 *     tags: [[FEATURE_NAME]]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: [FEATURE_NAME] deleted successfully
 */
export async function DELETE(
  request: NextRequest, 
  { params }: RouteParams
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return ApiResponse.unauthorized()
    }

    const [featureName]IdResult = create[FEATURE_NAME]Id(params.id)
    if (![featureName]IdResult.success) {
      return ApiResponse.badRequest('Invalid [feature_name] ID')
    }

    const result = await [featureName]Service.delete[FEATURE_NAME](
      user.id,
      [featureName]IdResult.data
    )

    if (!result.success) {
      if (result.error.name === 'NotFoundError') {
        return ApiResponse.notFound(result.error.message)
      }
      if (result.error.name === 'PermissionError') {
        return ApiResponse.forbidden(result.error.message)
      }
      return ApiResponse.error(result.error.message)
    }

    return ApiResponse.noContent()
    
  } catch (error) {
    console.error('Failed to delete [feature_name]:', error)
    return ApiResponse.internalError()
  }
}
```

---

## **5. Component Templates**

### **Atom Component Template**
```typescript
// src/components/atoms/[FeatureName]Badge.tsx

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { [FEATURE_NAME] } from '@/types/[feature-name]'

interface [FEATURE_NAME]BadgeProps {
  status: [FEATURE_NAME]['status']
  priority?: [FEATURE_NAME]['priority']
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export const [FEATURE_NAME]Badge = React.memo(function [FEATURE_NAME]Badge({
  status,
  priority,
  size = 'md',
  className
}: [FEATURE_NAME]BadgeProps) {
  const statusConfig = {
    '[FEATURE_NAME]_status_1': {
      label: 'Status 1',
      className: 'bg-yellow-100 text-yellow-800 border-yellow-200'
    },
    '[FEATURE_NAME]_status_2': {
      label: 'Status 2', 
      className: 'bg-blue-100 text-blue-800 border-blue-200'
    },
    active: {
      label: 'Active',
      className: 'bg-green-100 text-green-800 border-green-200'
    },
    archived: {
      label: 'Archived',
      className: 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const priorityConfig = priority ? {
    low: 'border-l-4 border-l-green-400',
    medium: 'border-l-4 border-l-yellow-400', 
    high: 'border-l-4 border-l-orange-400',
    urgent: 'border-l-4 border-l-red-400'
  }[priority] : ''

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-0.5', 
    lg: 'text-base px-3 py-1'
  }

  const config = statusConfig[status]

  return (
    <Badge
      variant="outline"
      className={cn(
        config.className,
        sizeClasses[size],
        priorityConfig,
        className
      )}
    >
      {config.label}
    </Badge>
  )
})
```

### **Molecule Component Template**
```typescript
// src/components/molecules/[FeatureName]Card.tsx

import React, { useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Edit, Trash2, Calendar } from 'lucide-react'
import { [FEATURE_NAME], [FEATURE_NAME]Id } from '@/types/[feature-name]'
import { [FEATURE_NAME]Badge } from '@/components/atoms/[FeatureName]Badge'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

interface [FEATURE_NAME]CardProps {
  [featureName]: [FEATURE_NAME]
  onEdit?: ([featureName]: [FEATURE_NAME]) => void
  onDelete?: ([featureName]Id: [FEATURE_NAME]Id) => void
  onView?: ([featureName]: [FEATURE_NAME]) => void
  className?: string
}

export const [FEATURE_NAME]Card = React.memo(function [FEATURE_NAME]Card({
  [featureName],
  onEdit,
  onDelete,
  onView,
  className
}: [FEATURE_NAME]CardProps) {
  // Memoized calculations
  const formattedDate = useMemo(() => {
    return format(new Date([featureName].updated_at), 'MMM d, yyyy')
  }, [[featureName].updated_at])

  const hasHighPriority = useMemo(() => {
    return ['high', 'urgent'].includes([featureName].priority)
  }, [[featureName].priority])

  // Event handlers with useCallback
  const handleEdit = useCallback(() => {
    onEdit?.([featureName])
  }, [[featureName], onEdit])

  const handleDelete = useCallback(() => {
    onDelete?.([featureName].id)
  }, [[featureName].id, onDelete])

  const handleView = useCallback(() => {
    onView?.([featureName])
  }, [[featureName], onView])

  return (
    <Card 
      className={cn(
        'transition-all duration-200 hover:shadow-md hover:border-blue-200',
        'cursor-pointer',
        hasHighPriority && 'ring-1 ring-orange-200',
        className
      )}
      onClick={handleView}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <CardTitle className="text-lg font-semibold line-clamp-1">
              {[featureName].name}
            </CardTitle>
            <div className="flex items-center gap-2">
              <[FEATURE_NAME]Badge 
                status={[featureName].status}
                priority={[featureName].priority}
                size="sm"
              />
              {hasHighPriority && (
                <Badge variant="outline" className="text-xs text-orange-600 border-orange-200">
                  {[featureName].priority}
                </Badge>
              )}
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEdit(); }}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={(e) => { e.stopPropagation(); handleDelete(); }}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent>
        {[featureName].description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {[featureName].description}
          </p>
        )}

        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>Updated {formattedDate}</span>
          </div>
          
          {[featureName].tags.length > 0 && (
            <div className="flex items-center gap-1">
              <span>{[featureName].tags.length} tag{[featureName].tags.length !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>

        {[featureName].tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {[featureName].tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {[featureName].tags.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{[featureName].tags.length - 3} more
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
})
```

### **Zustand Store Template**
```typescript
// src/lib/stores/[feature-name]-store.ts

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { 
  [FEATURE_NAME], 
  [FEATURE_NAME]Id, 
  [FEATURE_NAME]Filters,
  Create[FEATURE_NAME]Request,
  Update[FEATURE_NAME]Request
} from '@/types/[feature-name]'
import { Result } from '@/lib/utils/result'

interface [FEATURE_NAME]State {
  // Core data
  [featureName]s: [FEATURE_NAME][]
  current[FEATURE_NAME]: [FEATURE_NAME] | null
  
  // UI state  
  loading: boolean
  error: string | null
  filters: [FEATURE_NAME]Filters
  
  // Pagination
  pagination: {
    page: number
    limit: number
    total: number
    hasNext: boolean
    hasPrev: boolean
  }
  
  // Selection
  selected[FEATURE_NAME]Ids: [FEATURE_NAME]Id[]
  
  // Actions
  set[FEATURE_NAME]s: ([featureName]s: [FEATURE_NAME][]) => void
  setCurrent[FEATURE_NAME]: ([featureName]: [FEATURE_NAME] | null) => void
  setFilters: (filters: [FEATURE_NAME]Filters) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  addSelected: ([featureName]Id: [FEATURE_NAME]Id) => void
  removeSelected: ([featureName]Id: [FEATURE_NAME]Id) => void
  clearSelected: () => void
  
  // Async actions
  load[FEATURE_NAME]s: (filters?: [FEATURE_NAME]Filters, page?: number) => Promise<void>
  create[FEATURE_NAME]: (request: Create[FEATURE_NAME]Request) => Promise<Result<[FEATURE_NAME]>>
  update[FEATURE_NAME]: ([featureName]Id: [FEATURE_NAME]Id, request: Update[FEATURE_NAME]Request) => Promise<Result<[FEATURE_NAME]>>
  delete[FEATURE_NAME]: ([featureName]Id: [FEATURE_NAME]Id) => Promise<Result<void>>
  refresh: () => Promise<void>
}

export const use[FEATURE_NAME]Store = create<[FEATURE_NAME]State>()(
  persist(
    immer((set, get) => ({
      // Initial state
      [featureName]s: [],
      current[FEATURE_NAME]: null,
      loading: false,
      error: null,
      filters: {},
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        hasNext: false,
        hasPrev: false
      },
      selected[FEATURE_NAME]Ids: [],
      
      // Sync actions
      set[FEATURE_NAME]s: ([featureName]s) => set((state) => {
        state.[featureName]s = [featureName]s
        state.error = null
      }),
      
      setCurrent[FEATURE_NAME]: ([featureName]) => set((state) => {
        state.current[FEATURE_NAME] = [featureName]
      }),
      
      setFilters: (filters) => set((state) => {
        state.filters = filters
        state.pagination.page = 1 // Reset to first page when filtering
      }),
      
      setLoading: (loading) => set((state) => {
        state.loading = loading
      }),
      
      setError: (error) => set((state) => {
        state.error = error
        state.loading = false
      }),
      
      addSelected: ([featureName]Id) => set((state) => {
        if (!state.selected[FEATURE_NAME]Ids.includes([featureName]Id)) {
          state.selected[FEATURE_NAME]Ids.push([featureName]Id)
        }
      }),
      
      removeSelected: ([featureName]Id) => set((state) => {
        state.selected[FEATURE_NAME]Ids = state.selected[FEATURE_NAME]Ids.filter(id => id !== [featureName]Id)
      }),
      
      clearSelected: () => set((state) => {
        state.selected[FEATURE_NAME]Ids = []
      }),
      
      // Async actions
      load[FEATURE_NAME]s: async (filters = {}, page = 1) => {
        set((state) => {
          state.loading = true
          state.error = null
        })
        
        try {
          const currentFilters = { ...get().filters, ...filters }
          const limit = get().pagination.limit
          
          const response = await fetch('/api/[feature-name]?' + new URLSearchParams({
            ...Object.fromEntries(
              Object.entries(currentFilters).filter(([_, value]) => 
                value !== undefined && value !== null && value !== ''
              )
            ),
            page: page.toString(),
            limit: limit.toString()
          }))
          
          if (!response.ok) {
            throw new Error('Failed to load [feature_name]s')
          }
          
          const result = await response.json()
          
          set((state) => {
            state.[featureName]s = result.data || []
            state.filters = currentFilters
            state.pagination = {
              ...result.pagination,
              page,
              limit
            }
            state.loading = false
          })
          
        } catch (error) {
          set((state) => {
            state.error = error instanceof Error ? error.message : 'Unknown error'
            state.loading = false
          })
        }
      },
      
      create[FEATURE_NAME]: async (request) => {
        try {
          const response = await fetch('/api/[feature-name]', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request)
          })
          
          if (!response.ok) {
            const error = await response.json()
            return { success: false, error: new Error(error.message) }
          }
          
          const result = await response.json()
          const [featureName] = result.data
          
          // Add to store
          set((state) => {
            state.[featureName]s.unshift([featureName])
            state.pagination.total += 1
          })
          
          return { success: true, data: [featureName] }
          
        } catch (error) {
          return { 
            success: false, 
            error: error instanceof Error ? error : new Error('Unknown error') 
          }
        }
      },
      
      update[FEATURE_NAME]: async ([featureName]Id, request) => {
        try {
          const response = await fetch(`/api/[feature-name]/${[featureName]Id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request)
          })
          
          if (!response.ok) {
            const error = await response.json()
            return { success: false, error: new Error(error.message) }
          }
          
          const result = await response.json()
          const updated[FEATURE_NAME] = result.data
          
          // Update in store
          set((state) => {
            const index = state.[featureName]s.findIndex(item => item.id === [featureName]Id)
            if (index !== -1) {
              state.[featureName]s[index] = updated[FEATURE_NAME]
            }
            
            // Update current if it's the same
            if (state.current[FEATURE_NAME]?.id === [featureName]Id) {
              state.current[FEATURE_NAME] = updated[FEATURE_NAME]
            }
          })
          
          return { success: true, data: updated[FEATURE_NAME] }
          
        } catch (error) {
          return { 
            success: false, 
            error: error instanceof Error ? error : new Error('Unknown error') 
          }
        }
      },
      
      delete[FEATURE_NAME]: async ([featureName]Id) => {
        try {
          const response = await fetch(`/api/[feature-name]/${[featureName]Id}`, {
            method: 'DELETE'
          })
          
          if (!response.ok) {
            const error = await response.json()
            return { success: false, error: new Error(error.message) }
          }
          
          // Remove from store
          set((state) => {
            state.[featureName]s = state.[featureName]s.filter(item => item.id !== [featureName]Id)
            state.pagination.total = Math.max(0, state.pagination.total - 1)
            
            // Clear current if it's the same
            if (state.current[FEATURE_NAME]?.id === [featureName]Id) {
              state.current[FEATURE_NAME] = null
            }
            
            // Remove from selection
            state.selected[FEATURE_NAME]Ids = state.selected[FEATURE_NAME]Ids.filter(id => id !== [featureName]Id)
          })
          
          return { success: true, data: undefined }
          
        } catch (error) {
          return { 
            success: false, 
            error: error instanceof Error ? error : new Error('Unknown error') 
          }
        }
      },
      
      refresh: async () => {
        const { filters, pagination } = get()
        await get().load[FEATURE_NAME]s(filters, pagination.page)
      }
    })),
    {
      name: '[feature-name]-store',
      partialize: (state) => ({ 
        filters: state.filters,
        pagination: { 
          limit: state.pagination.limit 
        }
      })
    }
  )
)

// Selectors for computed values
export const [featureName]Selectors = {
  getActive[FEATURE_NAME]s: (store: [FEATURE_NAME]State) => 
    store.[featureName]s.filter(item => item.status === 'active'),
    
  getHighPriority[FEATURE_NAME]s: (store: [FEATURE_NAME]State) =>
    store.[featureName]s.filter(item => 
      ['high', 'urgent'].includes(item.priority)
    ),
    
  getSelected[FEATURE_NAME]s: (store: [FEATURE_NAME]State) =>
    store.[featureName]s.filter(item => 
      store.selected[FEATURE_NAME]Ids.includes(item.id)
    ),
    
  getTotalPages: (store: [FEATURE_NAME]State) =>
    Math.ceil(store.pagination.total / store.pagination.limit)
}
```

---

## **6. Test Templates**

### **Repository Test Template**
```typescript
// __tests__/repositories/[feature-name].repository.test.ts

import { [FEATURE_NAME]Repository } from '@/lib/repositories/[feature-name].repository'
import { create[FEATURE_NAME]Id } from '@/types/[feature-name]'
import { createTestSupabaseClient } from '../utils/test-supabase-client'
import { [FEATURE_NAME]Factory } from '../factories/[feature-name].factory'

describe('[FEATURE_NAME]Repository', () => {
  let repository: [FEATURE_NAME]Repository
  let testDb: ReturnType<typeof createTestSupabaseClient>

  beforeEach(async () => {
    testDb = createTestSupabaseClient()
    repository = new [FEATURE_NAME]Repository(testDb.client)
    await testDb.cleanup()
  })

  afterEach(async () => {
    await testDb.cleanup()
  })

  describe('create', () => {
    it('should create [feature_name] successfully', async () => {
      // Arrange
      const [featureName]Data = [FEATURE_NAME]Factory.build()
      
      // Act
      const result = await repository.create([featureName]Data)
      
      // Assert
      expect(result.success).toBe(true)
      expect(result.data).toMatchObject([featureName]Data)
      expect(result.data.id).toBeDefined()
      expect(result.data.created_at).toBeDefined()
    })

    it('should handle validation errors', async () => {
      // Arrange
      const invalid[FEATURE_NAME]Data = {
        ...([FEATURE_NAME]Factory.build()),
        name: '', // Invalid: empty name
      }
      
      // Act
      const result = await repository.create(invalid[FEATURE_NAME]Data)
      
      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('findById', () => {
    it('should find existing [feature_name]', async () => {
      // Arrange
      const created = await repository.create([FEATURE_NAME]Factory.build())
      expect(created.success).toBe(true)
      
      // Act
      const result = await repository.findById(created.data!.id)
      
      // Assert
      expect(result.success).toBe(true)
      expect(result.data).toEqual(created.data)
    })

    it('should return null for non-existent [feature_name]', async () => {
      // Arrange
      const non[FEATURE_NAME]Id = create[FEATURE_NAME]Id('550e8400-e29b-41d4-a716-446655440000')
      expect(non[FEATURE_NAME]Id.success).toBe(true)
      
      // Act
      const result = await repository.findById(non[FEATURE_NAME]Id.data!)
      
      // Assert
      expect(result.success).toBe(true)
      expect(result.data).toBeNull()
    })
  })

  describe('findByOrganization', () => {
    it('should return [feature_name]s for organization', async () => {
      // Arrange
      const orgId = createOrganizationId('550e8400-e29b-41d4-a716-446655440001').data!
      const [featureName]1 = await repository.create([FEATURE_NAME]Factory.build({ organization_id: orgId }))
      const [featureName]2 = await repository.create([FEATURE_NAME]Factory.build({ organization_id: orgId }))
      const other[FEATURE_NAME] = await repository.create([FEATURE_NAME]Factory.build()) // Different org
      
      expect([featureName]1.success).toBe(true)
      expect([featureName]2.success).toBe(true)
      expect(other[FEATURE_NAME].success).toBe(true)
      
      // Act
      const result = await repository.findByOrganization(orgId)
      
      // Assert
      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(2)
      expect(result.data.map(item => item.id)).toContain([featureName]1.data!.id)
      expect(result.data.map(item => item.id)).toContain([featureName]2.data!.id)
      expect(result.data.map(item => item.id)).not.toContain(other[FEATURE_NAME].data!.id)
    })
  })

  describe('search', () => {
    beforeEach(async () => {
      // Create test data
      await Promise.all([
        repository.create([FEATURE_NAME]Factory.build({ 
          name: 'Active Feature', 
          status: 'active',
          priority: 'high',
          tags: ['urgent', 'important']
        })),
        repository.create([FEATURE_NAME]Factory.build({ 
          name: 'Archived Feature',
          status: 'archived', 
          priority: 'low',
          tags: ['old']
        })),
        repository.create([FEATURE_NAME]Factory.build({ 
          name: 'Another Active',
          status: 'active',
          priority: 'medium',
          tags: ['test']
        }))
      ])
    })

    it('should filter by status', async () => {
      // Act
      const result = await repository.search({ status: 'active' })
      
      // Assert
      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(2)
      expect(result.data.every(item => item.status === 'active')).toBe(true)
    })

    it('should filter by priority', async () => {
      // Act
      const result = await repository.search({ priority: 'high' })
      
      // Assert
      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(1)
      expect(result.data[0].priority).toBe('high')
    })

    it('should filter by tags', async () => {
      // Act
      const result = await repository.search({ tags: ['urgent'] })
      
      // Assert
      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(1)
      expect(result.data[0].tags).toContain('urgent')
    })

    it('should search by text query', async () => {
      // Act
      const result = await repository.search({ search_query: 'Active' })
      
      // Assert
      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(2)
      expect(result.data.every(item => 
        item.name.includes('Active')
      )).toBe(true)
    })

    it('should combine multiple filters', async () => {
      // Act
      const result = await repository.search({ 
        status: 'active',
        priority: 'high',
        search_query: 'Feature'
      })
      
      // Assert
      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(1)
      expect(result.data[0].name).toBe('Active Feature')
    })
  })

  describe('getStats', () => {
    beforeEach(async () => {
      const orgId = createOrganizationId('550e8400-e29b-41d4-a716-446655440001').data!
      
      await Promise.all([
        repository.create([FEATURE_NAME]Factory.build({ organization_id: orgId, status: 'active', priority: 'high' })),
        repository.create([FEATURE_NAME]Factory.build({ organization_id: orgId, status: 'active', priority: 'medium' })),
        repository.create([FEATURE_NAME]Factory.build({ organization_id: orgId, status: 'archived', priority: 'urgent' })),
        repository.create([FEATURE_NAME]Factory.build({ organization_id: orgId, status: 'active', priority: 'low' }))
      ])
    })

    it('should return correct statistics', async () => {
      // Arrange
      const orgId = createOrganizationId('550e8400-e29b-41d4-a716-446655440001').data!
      
      // Act
      const result = await repository.getStats(orgId)
      
      // Assert
      expect(result.success).toBe(true)
      expect(result.data).toEqual({
        total: 4,
        active: 3,
        archived: 1,
        high_priority: 2 // high + urgent
      })
    })
  })

  describe('transaction support', () => {
    it('should rollback on error', async () => {
      // Arrange
      const [featureName]Data = [FEATURE_NAME]Factory.build()
      
      // Act & Assert
      await expect(repository.transaction(async () => {
        await repository.create([featureName]Data)
        throw new Error('Simulated error')
      })).rejects.toThrow('Simulated error')
      
      // Verify rollback - no [feature_name] should exist
      const allResult = await repository.findAll()
      expect(allResult.success).toBe(true)
      expect(allResult.data).toHaveLength(0)
    })
  })
})
```

---

## **Usage Instructions**

### **To Create a New Feature:**

1. **Replace Template Variables:**
   - `[FEATURE_NAME]` → `BoardMeeting` (PascalCase)
   - `[feature-name]` → `board-meeting` (kebab-case)
   - `[featureName]` → `boardMeeting` (camelCase)
   - `[FEATURE_NAME_UPPER]` → `BOARD_MEETING` (UPPER_SNAKE_CASE)
   - `[feature_name]` → `board_meeting` (snake_case)

2. **Customize Business Logic:**
   - Replace placeholder status values
   - Add feature-specific properties
   - Implement actual business rules
   - Add domain-specific validations

3. **Run Quality Checks:**
   ```bash
   npm run type-check
   npm run lint
   npm run test
   npm run e2e
   ```

These templates ensure every new feature follows the established DDD architecture patterns from CLAUDE.md and maintains the high quality standards achieved through the comprehensive refactoring.