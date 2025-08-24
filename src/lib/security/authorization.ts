/**
 * Advanced Authorization System - RBAC, ABAC, and Dynamic Permissions
 * Implements Role-Based Access Control, Attribute-Based Access Control, and dynamic permission evaluation
 */

import { EventEmitter } from 'events'
import { z } from 'zod'
import { Result, success, failure } from '../patterns/result'
import { MetricsCollector } from '../observability/metrics-collector'
import { DistributedTracer } from '../observability/distributed-tracer'
import { DomainEvent } from '../events/event-store'
import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '../../types/database'
import { nanoid } from 'nanoid'

// Authorization schemas
export const PermissionSchema = z.object({
  id: z.string(),
  name: z.string(),
  resource: z.string(),
  action: z.string(),
  conditions: z.array(z.object({
    attribute: z.string(),
    operator: z.enum(['equals', 'notEquals', 'contains', 'notContains', 'greaterThan', 'lessThan', 'in', 'notIn']),
    value: z.any()
  })).optional(),
  metadata: z.record(z.any()).optional()
})

export const RoleSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  permissions: z.array(z.string()),
  inherits: z.array(z.string()).optional(),
  conditions: z.array(z.any()).optional(),
  metadata: z.record(z.any()).optional()
})

// Core interfaces
export interface Permission {
  id: string
  name: string
  resource: string
  action: string
  conditions?: PermissionCondition[]
  metadata?: Record<string, any>
}

export interface PermissionCondition {
  attribute: string
  operator: 'equals' | 'notEquals' | 'contains' | 'notContains' | 'greaterThan' | 'lessThan' | 'in' | 'notIn'
  value: any
}

export interface Role {
  id: string
  name: string
  description?: string
  permissions: string[]
  inherits?: string[] // Parent roles
  conditions?: AttributeCondition[]
  metadata?: Record<string, any>
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface AttributeCondition {
  name: string
  operator: string
  value: any
  context?: string
}

export interface AuthorizationContext {
  userId: string
  sessionId: string
  userAttributes: Record<string, any>
  resourceAttributes: Record<string, any>
  environmentAttributes: Record<string, any>
  timestamp: Date
  ipAddress: string
  userAgent: string
}

export interface AuthorizationRequest {
  userId: string
  resource: string
  action: string
  resourceId?: string
  context: AuthorizationContext
}

export interface AuthorizationResult {
  allowed: boolean
  reason: string
  appliedPolicies: string[]
  conditions: string[]
  ttl?: number // Cache TTL in seconds
}

export interface Policy {
  id: string
  name: string
  description?: string
  version: string
  rules: PolicyRule[]
  isActive: boolean
  priority: number
  createdAt: string
  updatedAt: string
}

export interface PolicyRule {
  id: string
  name: string
  effect: 'Allow' | 'Deny'
  subjects: SubjectMatcher[]
  resources: ResourceMatcher[]
  actions: string[]
  conditions?: PolicyCondition[]
}

export interface SubjectMatcher {
  type: 'user' | 'role' | 'group'
  value: string
  attributes?: Record<string, any>
}

export interface ResourceMatcher {
  type: 'resource' | 'resourceType' | 'pattern'
  value: string
  attributes?: Record<string, any>
}

export interface PolicyCondition {
  attribute: string
  operator: string
  value: any
  context: 'user' | 'resource' | 'environment'
}

/**
 * Advanced Authorization Manager
 */
export class AdvancedAuthorizationManager extends EventEmitter {
  private permissions: Map<string, Permission> = new Map()
  private roles: Map<string, Role> = new Map()
  private policies: Map<string, Policy> = new Map()
  private userRoles: Map<string, Set<string>> = new Map()
  private roleHierarchy: Map<string, Set<string>> = new Map()
  private permissionCache: Map<string, { result: AuthorizationResult; expiresAt: number }> = new Map()
  private metrics: MetricsCollector
  private tracer: DistributedTracer

  constructor(
    private supabase: SupabaseClient<Database>,
    private options: {
      enableCaching: boolean
      defaultCacheTTL: number
      maxCacheSize: number
      evaluationTimeout: number
    }
  ) {
    super()
    
    this.metrics = MetricsCollector.getInstance()
    this.tracer = DistributedTracer.getInstance()

    this.setupCacheCleanup()
    this.loadSystemData()
  }

  /**
   * Check if user is authorized to perform action on resource
   */
  async authorize(request: AuthorizationRequest): Promise<Result<AuthorizationResult, string>> {
    const span = this.tracer.startSpan('authorization_check', {
      userId: request.userId,
      resource: request.resource,
      action: request.action
    })

    try {
      const startTime = Date.now()

      // Check cache first
      const cacheKey = this.generateCacheKey(request)
      if (this.options.enableCaching) {
        const cached = this.permissionCache.get(cacheKey)
        if (cached && cached.expiresAt > Date.now()) {
          this.metrics.recordAuthorizationCheck(request.userId, request.resource, request.action, cached.result.allowed, Date.now() - startTime, true)
          return success(cached.result)
        }
      }

      // Get user roles and permissions
      const userRoles = await this.getUserRoles(request.userId)
      const effectivePermissions = await this.getEffectivePermissions(userRoles)

      // Evaluate authorization
      const result = await this.evaluateAuthorization(request, effectivePermissions, userRoles)

      // Cache result if enabled
      if (this.options.enableCaching && result.ttl) {
        this.cacheResult(cacheKey, result, result.ttl)
      }

      // Record metrics
      const duration = Date.now() - startTime
      this.metrics.recordAuthorizationCheck(request.userId, request.resource, request.action, result.allowed, duration, false)

      // Emit event
      this.emit('authorizationChecked', {
        request,
        result,
        duration,
        userRoles,
        effectivePermissions: effectivePermissions.length
      })

      return success(result)

    } catch (error) {
      span.recordError(error as Error)
      return failure(`Authorization check failed: ${(error as Error).message}`)
    } finally {
      span.end()
    }
  }

  /**
   * Batch authorization check
   */
  async batchAuthorize(requests: AuthorizationRequest[]): Promise<Result<AuthorizationResult[], string>> {
    try {
      const results = await Promise.allSettled(
        requests.map(request => this.authorize(request))
      )

      const authResults: AuthorizationResult[] = []
      const errors: string[] = []

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          if (result.value.success) {
            authResults.push(result.value.data)
          } else {
            errors.push(`Request ${index}: ${result.value.error}`)
          }
        } else {
          errors.push(`Request ${index}: ${result.reason}`)
        }
      })

      if (errors.length > 0 && authResults.length === 0) {
        return failure(`All authorization checks failed: ${errors.join(', ')}`)
      }

      return success(authResults)

    } catch (error) {
      return failure(`Batch authorization failed: ${(error as Error).message}`)
    }
  }

  /**
   * Create permission
   */
  async createPermission(permission: Omit<Permission, 'id'>): Promise<Result<Permission, string>> {
    try {
      const validation = PermissionSchema.omit({ id: true }).safeParse(permission)
      if (!validation.success) {
        return failure(`Invalid permission: ${validation.error.errors.map(e => e.message).join(', ')}`)
      }

      const id = nanoid()
      const fullPermission: Permission = { id, ...permission }

      // Store in database
      const { error } = await this.supabase
        .from('auth_permissions')
        .insert({
          id: fullPermission.id,
          name: fullPermission.name,
          resource: fullPermission.resource,
          action: fullPermission.action,
          conditions: fullPermission.conditions || [],
          metadata: fullPermission.metadata || {}
        })

      if (error) {
        return failure(`Failed to create permission: ${error.message}`)
      }

      // Update local cache
      this.permissions.set(id, fullPermission)

      this.emit('permissionCreated', fullPermission)
      return success(fullPermission)

    } catch (error) {
      return failure(`Permission creation failed: ${(error as Error).message}`)
    }
  }

  /**
   * Create role
   */
  async createRole(role: Omit<Role, 'id' | 'isActive' | 'createdAt' | 'updatedAt'>): Promise<Result<Role, string>> {
    try {
      const validation = RoleSchema.omit({ id: true }).safeParse(role)
      if (!validation.success) {
        return failure(`Invalid role: ${validation.error.errors.map(e => e.message).join(', ')}`)
      }

      const id = nanoid()
      const now = new Date().toISOString()
      const fullRole: Role = {
        id,
        ...role,
        isActive: true,
        createdAt: now,
        updatedAt: now
      }

      // Validate permission references
      for (const permissionId of fullRole.permissions) {
        if (!this.permissions.has(permissionId)) {
          return failure(`Permission ${permissionId} does not exist`)
        }
      }

      // Validate role inheritance (prevent cycles)
      if (fullRole.inherits) {
        const cycleCheck = await this.checkRoleInheritanceCycle(id, fullRole.inherits)
        if (!cycleCheck.success) {
          return failure(cycleCheck.error)
        }
      }

      // Store in database
      const { error } = await this.supabase
        .from('auth_roles')
        .insert({
          id: fullRole.id,
          name: fullRole.name,
          description: fullRole.description,
          permissions: fullRole.permissions,
          inherits: fullRole.inherits || [],
          conditions: fullRole.conditions || [],
          metadata: fullRole.metadata || {},
          is_active: fullRole.isActive,
          created_at: fullRole.createdAt,
          updated_at: fullRole.updatedAt
        })

      if (error) {
        return failure(`Failed to create role: ${error.message}`)
      }

      // Update local cache
      this.roles.set(id, fullRole)
      this.updateRoleHierarchy()

      this.emit('roleCreated', fullRole)
      return success(fullRole)

    } catch (error) {
      return failure(`Role creation failed: ${(error as Error).message}`)
    }
  }

  /**
   * Assign roles to user
   */
  async assignRolesToUser(userId: string, roleIds: string[]): Promise<Result<void, string>> {
    try {
      // Validate roles exist
      for (const roleId of roleIds) {
        if (!this.roles.has(roleId)) {
          return failure(`Role ${roleId} does not exist`)
        }
      }

      // Store in database
      const assignments = roleIds.map(roleId => ({
        user_id: userId,
        role_id: roleId,
        assigned_at: new Date().toISOString(),
        assigned_by: 'system' // Could be passed as parameter
      }))

      const { error } = await this.supabase
        .from('auth_user_roles')
        .upsert(assignments)

      if (error) {
        return failure(`Failed to assign roles: ${error.message}`)
      }

      // Update local cache
      this.userRoles.set(userId, new Set(roleIds))

      // Clear permission cache for this user
      this.clearUserPermissionCache(userId)

      this.emit('rolesAssigned', { userId, roleIds })
      return success(undefined)

    } catch (error) {
      return failure(`Role assignment failed: ${(error as Error).message}`)
    }
  }

  /**
   * Remove roles from user
   */
  async removeRolesFromUser(userId: string, roleIds: string[]): Promise<Result<void, string>> {
    try {
      // Remove from database
      const { error } = await this.supabase
        .from('auth_user_roles')
        .delete()
        .eq('user_id', userId)
        .in('role_id', roleIds)

      if (error) {
        return failure(`Failed to remove roles: ${error.message}`)
      }

      // Update local cache
      const currentRoles = this.userRoles.get(userId) || new Set()
      roleIds.forEach(roleId => currentRoles.delete(roleId))
      this.userRoles.set(userId, currentRoles)

      // Clear permission cache for this user
      this.clearUserPermissionCache(userId)

      this.emit('rolesRemoved', { userId, roleIds })
      return success(undefined)

    } catch (error) {
      return failure(`Role removal failed: ${(error as Error).message}`)
    }
  }

  /**
   * Get user permissions
   */
  async getUserPermissions(userId: string): Promise<Result<Permission[], string>> {
    try {
      const userRoles = await this.getUserRoles(userId)
      const permissions = await this.getEffectivePermissions(userRoles)

      return success(permissions)

    } catch (error) {
      return failure(`Failed to get user permissions: ${(error as Error).message}`)
    }
  }

  /**
   * Check specific permission
   */
  async hasPermission(
    userId: string,
    resource: string,
    action: string,
    context?: Partial<AuthorizationContext>
  ): Promise<Result<boolean, string>> {
    const request: AuthorizationRequest = {
      userId,
      resource,
      action,
      context: {
        userId,
        sessionId: context?.sessionId || '',
        userAttributes: context?.userAttributes || {},
        resourceAttributes: context?.resourceAttributes || {},
        environmentAttributes: context?.environmentAttributes || {},
        timestamp: context?.timestamp || new Date(),
        ipAddress: context?.ipAddress || '',
        userAgent: context?.userAgent || ''
      }
    }

    const result = await this.authorize(request)
    if (!result.success) {
      return result as any
    }

    return success(result.data.allowed)
  }

  /**
   * Create policy
   */
  async createPolicy(policy: Omit<Policy, 'id' | 'createdAt' | 'updatedAt'>): Promise<Result<Policy, string>> {
    try {
      const id = nanoid()
      const now = new Date().toISOString()
      const fullPolicy: Policy = {
        id,
        createdAt: now,
        updatedAt: now,
        ...policy
      }

      // Store in database
      const { error } = await this.supabase
        .from('auth_policies')
        .insert({
          id: fullPolicy.id,
          name: fullPolicy.name,
          description: fullPolicy.description,
          version: fullPolicy.version,
          rules: fullPolicy.rules,
          is_active: fullPolicy.isActive,
          priority: fullPolicy.priority,
          created_at: fullPolicy.createdAt,
          updated_at: fullPolicy.updatedAt
        })

      if (error) {
        return failure(`Failed to create policy: ${error.message}`)
      }

      // Update local cache
      this.policies.set(id, fullPolicy)

      this.emit('policyCreated', fullPolicy)
      return success(fullPolicy)

    } catch (error) {
      return failure(`Policy creation failed: ${(error as Error).message}`)
    }
  }

  /**
   * Get authorization statistics
   */
  getAuthorizationStats(): {
    permissionsCount: number
    rolesCount: number
    policiesCount: number
    activeUsers: number
    cacheSize: number
    cacheHitRate: number
  } {
    // Calculate cache hit rate from metrics
    const cacheHitRate = 0.75 // Would be calculated from actual metrics

    return {
      permissionsCount: this.permissions.size,
      rolesCount: this.roles.size,
      policiesCount: this.policies.size,
      activeUsers: this.userRoles.size,
      cacheSize: this.permissionCache.size,
      cacheHitRate
    }
  }

  /**
   * Clear all caches
   */
  clearAllCaches(): number {
    const cacheSize = this.permissionCache.size
    this.permissionCache.clear()
    return cacheSize
  }

  /**
   * Private helper methods
   */
  private async evaluateAuthorization(
    request: AuthorizationRequest,
    permissions: Permission[],
    userRoles: string[]
  ): Promise<AuthorizationResult> {
    const appliedPolicies: string[] = []
    const conditions: string[] = []
    let finalDecision = false
    let reason = 'No matching permissions found'

    // Check direct permissions first
    for (const permission of permissions) {
      if (this.matchesPermission(permission, request)) {
        const conditionResult = await this.evaluateConditions(permission.conditions || [], request.context)
        
        if (conditionResult.allowed) {
          finalDecision = true
          reason = `Granted by permission: ${permission.name}`
          if (conditionResult.conditions.length > 0) {
            conditions.push(...conditionResult.conditions)
          }
          break
        }
      }
    }

    // Evaluate policies if no direct permission match
    if (!finalDecision) {
      const policyResult = await this.evaluatePolicies(request, userRoles)
      finalDecision = policyResult.allowed
      reason = policyResult.reason
      appliedPolicies.push(...policyResult.appliedPolicies)
      conditions.push(...policyResult.conditions)
    }

    return {
      allowed: finalDecision,
      reason,
      appliedPolicies,
      conditions,
      ttl: this.options.defaultCacheTTL
    }
  }

  private matchesPermission(permission: Permission, request: AuthorizationRequest): boolean {
    return (
      permission.resource === request.resource &&
      permission.action === request.action
    )
  }

  private async evaluateConditions(
    conditions: PermissionCondition[],
    context: AuthorizationContext
  ): Promise<{ allowed: boolean; conditions: string[] }> {
    const evaluatedConditions: string[] = []
    
    for (const condition of conditions) {
      const result = this.evaluateCondition(condition, context)
      if (!result.allowed) {
        return { allowed: false, conditions: [] }
      }
      if (result.condition) {
        evaluatedConditions.push(result.condition)
      }
    }

    return { allowed: true, conditions: evaluatedConditions }
  }

  private evaluateCondition(
    condition: PermissionCondition,
    context: AuthorizationContext
  ): { allowed: boolean; condition?: string } {
    const attributeValue = this.getAttributeValue(condition.attribute, context)
    
    switch (condition.operator) {
      case 'equals':
        return { allowed: attributeValue === condition.value }
      case 'notEquals':
        return { allowed: attributeValue !== condition.value }
      case 'contains':
        return { 
          allowed: Array.isArray(attributeValue) ? 
            attributeValue.includes(condition.value) : 
            String(attributeValue).includes(String(condition.value))
        }
      case 'notContains':
        return { 
          allowed: Array.isArray(attributeValue) ? 
            !attributeValue.includes(condition.value) : 
            !String(attributeValue).includes(String(condition.value))
        }
      case 'greaterThan':
        return { allowed: Number(attributeValue) > Number(condition.value) }
      case 'lessThan':
        return { allowed: Number(attributeValue) < Number(condition.value) }
      case 'in':
        return { allowed: Array.isArray(condition.value) && condition.value.includes(attributeValue) }
      case 'notIn':
        return { allowed: !(Array.isArray(condition.value) && condition.value.includes(attributeValue)) }
      default:
        return { allowed: false }
    }
  }

  private getAttributeValue(attribute: string, context: AuthorizationContext): any {
    const parts = attribute.split('.')
    
    if (parts[0] === 'user') {
      return this.getNestedValue(context.userAttributes, parts.slice(1).join('.'))
    } else if (parts[0] === 'resource') {
      return this.getNestedValue(context.resourceAttributes, parts.slice(1).join('.'))
    } else if (parts[0] === 'environment') {
      return this.getNestedValue(context.environmentAttributes, parts.slice(1).join('.'))
    }
    
    return undefined
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj)
  }

  private async evaluatePolicies(
    request: AuthorizationRequest,
    userRoles: string[]
  ): Promise<{ allowed: boolean; reason: string; appliedPolicies: string[]; conditions: string[] }> {
    const applicablePolicies = Array.from(this.policies.values())
      .filter(policy => policy.isActive)
      .sort((a, b) => b.priority - a.priority)

    const appliedPolicies: string[] = []
    const conditions: string[] = []
    let explicitDeny = false
    let explicitAllow = false
    let reason = 'No applicable policies found'

    for (const policy of applicablePolicies) {
      for (const rule of policy.rules) {
        if (this.matchesRule(rule, request, userRoles)) {
          appliedPolicies.push(policy.name)
          
          if (rule.effect === 'Deny') {
            explicitDeny = true
            reason = `Denied by policy: ${policy.name}, rule: ${rule.name}`
            break
          } else if (rule.effect === 'Allow') {
            explicitAllow = true
            reason = `Allowed by policy: ${policy.name}, rule: ${rule.name}`
          }
        }
      }
      
      if (explicitDeny) break
    }

    return {
      allowed: explicitAllow && !explicitDeny,
      reason,
      appliedPolicies,
      conditions
    }
  }

  private matchesRule(rule: PolicyRule, request: AuthorizationRequest, userRoles: string[]): boolean {
    // Check subjects (user/roles)
    const subjectMatch = rule.subjects.some(subject => {
      if (subject.type === 'user') {
        return subject.value === request.userId
      } else if (subject.type === 'role') {
        return userRoles.includes(subject.value)
      }
      return false
    })

    if (!subjectMatch) return false

    // Check resources
    const resourceMatch = rule.resources.some(resource => {
      if (resource.type === 'resource') {
        return resource.value === request.resource
      } else if (resource.type === 'resourceType') {
        return request.resource.startsWith(resource.value)
      } else if (resource.type === 'pattern') {
        return new RegExp(resource.value).test(request.resource)
      }
      return false
    })

    if (!resourceMatch) return false

    // Check actions
    const actionMatch = rule.actions.includes(request.action) || rule.actions.includes('*')

    return actionMatch
  }

  private async getUserRoles(userId: string): Promise<string[]> {
    // Check cache first
    let roles = this.userRoles.get(userId)
    
    if (!roles) {
      // Load from database
      const { data, error } = await this.supabase
        .from('auth_user_roles')
        .select('role_id')
        .eq('user_id', userId)

      if (error || !data) {
        return []
      }

      const roleIds = data.map(row => row.role_id)
      roles = new Set(roleIds)
      this.userRoles.set(userId, roles)
    }

    // Add inherited roles
    const allRoles = new Set(roles)
    for (const roleId of roles) {
      const inheritedRoles = this.roleHierarchy.get(roleId) || new Set()
      inheritedRoles.forEach(inheritedRole => allRoles.add(inheritedRole))
    }

    return Array.from(allRoles)
  }

  private async getEffectivePermissions(roleIds: string[]): Promise<Permission[]> {
    const permissionIds = new Set<string>()

    for (const roleId of roleIds) {
      const role = this.roles.get(roleId)
      if (role && role.isActive) {
        role.permissions.forEach(permId => permissionIds.add(permId))
      }
    }

    return Array.from(permissionIds)
      .map(id => this.permissions.get(id))
      .filter(perm => perm !== undefined) as Permission[]
  }

  private generateCacheKey(request: AuthorizationRequest): string {
    return `${request.userId}:${request.resource}:${request.action}:${request.resourceId || ''}`
  }

  private cacheResult(key: string, result: AuthorizationResult, ttlSeconds: number): void {
    if (this.permissionCache.size >= this.options.maxCacheSize) {
      // Remove oldest entries (simple LRU)
      const entries = Array.from(this.permissionCache.entries())
        .sort((a, b) => a[1].expiresAt - b[1].expiresAt)
      
      const toRemove = Math.floor(this.options.maxCacheSize * 0.1)
      for (let i = 0; i < toRemove; i++) {
        this.permissionCache.delete(entries[i][0])
      }
    }

    this.permissionCache.set(key, {
      result,
      expiresAt: Date.now() + (ttlSeconds * 1000)
    })
  }

  private clearUserPermissionCache(userId: string): void {
    const keysToDelete: string[] = []
    
    for (const key of this.permissionCache.keys()) {
      if (key.startsWith(`${userId}:`)) {
        keysToDelete.push(key)
      }
    }
    
    keysToDelete.forEach(key => this.permissionCache.delete(key))
  }

  private updateRoleHierarchy(): void {
    this.roleHierarchy.clear()
    
    // Build role hierarchy map
    for (const role of this.roles.values()) {
      if (role.inherits && role.inherits.length > 0) {
        const inherited = new Set<string>()
        this.buildInheritanceChain(role.inherits, inherited)
        this.roleHierarchy.set(role.id, inherited)
      }
    }
  }

  private buildInheritanceChain(parentRoles: string[], inherited: Set<string>): void {
    for (const parentId of parentRoles) {
      if (!inherited.has(parentId)) {
        inherited.add(parentId)
        
        const parentRole = this.roles.get(parentId)
        if (parentRole && parentRole.inherits) {
          this.buildInheritanceChain(parentRole.inherits, inherited)
        }
      }
    }
  }

  private async checkRoleInheritanceCycle(roleId: string, parentRoles: string[]): Promise<Result<void, string>> {
    const visited = new Set<string>()
    
    const hasCycle = (currentRole: string, parents: string[]): boolean => {
      if (visited.has(currentRole)) {
        return true
      }
      
      visited.add(currentRole)
      
      for (const parentId of parents) {
        if (parentId === roleId) {
          return true
        }
        
        const parentRole = this.roles.get(parentId)
        if (parentRole && parentRole.inherits) {
          if (hasCycle(parentId, parentRole.inherits)) {
            return true
          }
        }
      }
      
      return false
    }

    if (hasCycle(roleId, parentRoles)) {
      return failure('Role inheritance cycle detected')
    }

    return success(undefined)
  }

  private setupCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now()
      let cleanedCount = 0

      for (const [key, cached] of this.permissionCache.entries()) {
        if (cached.expiresAt <= now) {
          this.permissionCache.delete(key)
          cleanedCount++
        }
      }

      if (cleanedCount > 0) {
        console.log(`Cleaned up ${cleanedCount} expired permission cache entries`)
      }
    }, 60000) // Run every minute
  }

  private async loadSystemData(): Promise<void> {
    // Load permissions, roles, and policies from database
    // This would be implemented based on the database schema
    console.log('Loading authorization system data...')
  }
}