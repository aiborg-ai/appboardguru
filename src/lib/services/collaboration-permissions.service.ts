/**
 * Collaboration Permissions Service
 * Fine-grained access control system for collaborative document editing
 * Role-based permissions with expiration, inheritance, and audit trails
 * Following CLAUDE.md patterns with Result pattern and enterprise security
 */

import { BaseService } from './base.service'
import { Result, success, failure, wrapAsync } from '../repositories/result'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database'
import type {
  CollaborationPermissions,
  DocumentCollaborationSession,
  CollaborationSessionId,
  DocumentId,
  UserId,
  OrganizationId
} from '../../types/document-collaboration'

export interface CollaborationRole {
  id: string
  name: string
  description: string
  permissions: CollaborationPermissions
  isSystemRole: boolean
  createdAt: string
  updatedAt: string
}

export interface PermissionRule {
  id: string
  name: string
  description: string
  condition: string // JSON expression for dynamic evaluation
  permissions: Partial<CollaborationPermissions>
  priority: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface UserPermission {
  userId: UserId
  documentId?: DocumentId
  sessionId?: CollaborationSessionId
  organizationId?: OrganizationId
  roleId?: string
  customPermissions?: Partial<CollaborationPermissions>
  expiresAt?: string
  grantedBy: UserId
  grantedAt: string
  reason?: string
}

export interface PermissionContext {
  user: {
    id: UserId
    organizationId: OrganizationId
    roles: string[]
    attributes: Record<string, any>
  }
  document: {
    id: DocumentId
    organizationId: OrganizationId
    isPublic: boolean
    sensitivity: 'public' | 'internal' | 'confidential' | 'restricted'
    tags: string[]
    createdBy: UserId
  }
  session: {
    id: CollaborationSessionId
    type: 'editing' | 'review' | 'planning' | 'approval'
    settings: any
  }
  time: {
    current: Date
    businessHours: boolean
    timezone: string
  }
  device: {
    type: 'desktop' | 'mobile' | 'tablet'
    trusted: boolean
    location?: string
  }
}

export interface PermissionEvaluationResult {
  permissions: CollaborationPermissions
  appliedRoles: string[]
  appliedRules: string[]
  warnings: string[]
  audit: {
    evaluatedAt: string
    context: Partial<PermissionContext>
    duration: number
  }
}

export class CollaborationPermissionsService extends BaseService {
  private roleCache = new Map<string, CollaborationRole>()
  private ruleCache = new Map<string, PermissionRule>()
  private permissionCache = new Map<string, { permissions: CollaborationPermissions; expiresAt: Date }>()

  constructor(supabase: SupabaseClient<Database>) {
    super(supabase)
    this.initializeSystemRoles()
  }

  // ================================
  // Role Management
  // ================================

  /**
   * Get all available collaboration roles
   */
  async getRoles(): Promise<Result<CollaborationRole[]>> {
    return wrapAsync(async () => {
      const { data, error } = await this.supabase
        .from('collaboration_roles')
        .select('*')
        .order('name')

      if (error) {
        throw new Error(`Failed to fetch collaboration roles: ${error.message}`)
      }

      const roles = (data || []).map(this.mapToCollaborationRole)
      
      // Cache roles
      roles.forEach(role => this.roleCache.set(role.id, role))

      return roles
    })
  }

  /**
   * Get role by ID
   */
  async getRoleById(roleId: string): Promise<Result<CollaborationRole | null>> {
    return wrapAsync(async () => {
      // Check cache first
      const cached = this.roleCache.get(roleId)
      if (cached) {
        return cached
      }

      const { data, error } = await this.supabase
        .from('collaboration_roles')
        .select('*')
        .eq('id', roleId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null
        }
        throw new Error(`Failed to fetch collaboration role: ${error.message}`)
      }

      const role = this.mapToCollaborationRole(data)
      this.roleCache.set(role.id, role)

      return role
    })
  }

  /**
   * Create a new collaboration role
   */
  async createRole(
    role: Omit<CollaborationRole, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Result<CollaborationRole>> {
    return wrapAsync(async () => {
      const userResult = await this.getCurrentUser()
      if (!userResult.success) {
        throw userResult.error
      }

      // Check permissions
      const permissionResult = await this.checkPermissionWithContext(
        userResult.data.id,
        'collaboration',
        'manage_roles'
      )
      if (!permissionResult.success) {
        throw permissionResult.error
      }

      const roleData = {
        name: role.name,
        description: role.description,
        permissions: role.permissions,
        is_system_role: role.isSystemRole,
        created_by: userResult.data.id
      }

      const { data, error } = await this.supabase
        .from('collaboration_roles')
        .insert(roleData)
        .select('*')
        .single()

      if (error) {
        throw new Error(`Failed to create collaboration role: ${error.message}`)
      }

      const newRole = this.mapToCollaborationRole(data)
      this.roleCache.set(newRole.id, newRole)

      // Log activity
      await this.logActivity('create_collaboration_role', 'role', newRole.id, {
        roleName: newRole.name,
        permissions: newRole.permissions
      })

      return newRole
    })
  }

  /**
   * Update an existing collaboration role
   */
  async updateRole(
    roleId: string,
    updates: Partial<Omit<CollaborationRole, 'id' | 'createdAt' | 'updatedAt' | 'isSystemRole'>>
  ): Promise<Result<CollaborationRole>> {
    return wrapAsync(async () => {
      const userResult = await this.getCurrentUser()
      if (!userResult.success) {
        throw userResult.error
      }

      // Check if role exists and is not a system role
      const existingRole = await this.getRoleById(roleId)
      if (!existingRole.success) {
        throw existingRole.error
      }
      if (!existingRole.data) {
        throw new Error('Role not found')
      }
      if (existingRole.data.isSystemRole) {
        throw new Error('Cannot modify system roles')
      }

      // Check permissions
      const permissionResult = await this.checkPermissionWithContext(
        userResult.data.id,
        'collaboration',
        'manage_roles'
      )
      if (!permissionResult.success) {
        throw permissionResult.error
      }

      const updateData = {
        ...updates,
        updated_at: new Date().toISOString()
      }

      const { data, error } = await this.supabase
        .from('collaboration_roles')
        .update(updateData)
        .eq('id', roleId)
        .select('*')
        .single()

      if (error) {
        throw new Error(`Failed to update collaboration role: ${error.message}`)
      }

      const updatedRole = this.mapToCollaborationRole(data)
      this.roleCache.set(updatedRole.id, updatedRole)

      // Clear permission cache for affected users
      this.clearPermissionCache()

      // Log activity
      await this.logActivity('update_collaboration_role', 'role', roleId, {
        updates,
        roleName: updatedRole.name
      })

      return updatedRole
    })
  }

  // ================================
  // Permission Evaluation
  // ================================

  /**
   * Evaluate permissions for a user in a specific context
   */
  async evaluatePermissions(
    context: PermissionContext
  ): Promise<Result<PermissionEvaluationResult>> {
    return wrapAsync(async () => {
      const startTime = Date.now()
      const cacheKey = this.buildPermissionCacheKey(context)

      // Check cache first
      const cached = this.permissionCache.get(cacheKey)
      if (cached && cached.expiresAt > new Date()) {
        return {
          permissions: cached.permissions,
          appliedRoles: [],
          appliedRules: [],
          warnings: [],
          audit: {
            evaluatedAt: new Date().toISOString(),
            context: { user: context.user, document: context.document },
            duration: Date.now() - startTime
          }
        }
      }

      const result = await this.performPermissionEvaluation(context)
      
      // Cache result for 5 minutes
      this.permissionCache.set(cacheKey, {
        permissions: result.permissions,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000)
      })

      result.audit = {
        evaluatedAt: new Date().toISOString(),
        context: {
          user: context.user,
          document: context.document,
          session: context.session
        },
        duration: Date.now() - startTime
      }

      return result
    })
  }

  /**
   * Check if user has specific permission
   */
  async hasPermission(
    context: PermissionContext,
    permission: keyof CollaborationPermissions
  ): Promise<Result<boolean>> {
    return wrapAsync(async () => {
      const evaluationResult = await this.evaluatePermissions(context)
      if (!evaluationResult.success) {
        throw evaluationResult.error
      }

      return evaluationResult.data.permissions[permission] || false
    })
  }

  /**
   * Get user's effective permissions for a document/session
   */
  async getUserPermissions(
    userId: UserId,
    documentId?: DocumentId,
    sessionId?: CollaborationSessionId,
    organizationId?: OrganizationId
  ): Promise<Result<CollaborationPermissions>> {
    return wrapAsync(async () => {
      // Build context
      const context = await this.buildPermissionContext(
        userId,
        documentId,
        sessionId,
        organizationId
      )
      if (!context.success) {
        throw context.error
      }

      const evaluationResult = await this.evaluatePermissions(context.data)
      if (!evaluationResult.success) {
        throw evaluationResult.error
      }

      return evaluationResult.data.permissions
    })
  }

  /**
   * Grant permissions to a user
   */
  async grantPermissions(
    granteeId: UserId,
    permissions: UserPermission
  ): Promise<Result<void>> {
    return wrapAsync(async () => {
      const userResult = await this.getCurrentUser()
      if (!userResult.success) {
        throw userResult.error
      }

      // Check if granter has permission to grant these permissions
      const granterContext = await this.buildPermissionContext(
        userResult.data.id,
        permissions.documentId,
        permissions.sessionId,
        permissions.organizationId
      )
      if (!granterContext.success) {
        throw granterContext.error
      }

      const granterPermissions = await this.evaluatePermissions(granterContext.data)
      if (!granterPermissions.success) {
        throw granterPermissions.error
      }

      // Check if granter can manage permissions
      if (!granterPermissions.data.permissions.canManageVersions && 
          !granterPermissions.data.permissions.canApprove) {
        throw new Error('Insufficient permissions to grant access')
      }

      const permissionData = {
        user_id: permissions.userId,
        document_id: permissions.documentId,
        session_id: permissions.sessionId,
        organization_id: permissions.organizationId,
        role_id: permissions.roleId,
        custom_permissions: permissions.customPermissions,
        expires_at: permissions.expiresAt,
        granted_by: userResult.data.id,
        granted_at: new Date().toISOString(),
        reason: permissions.reason
      }

      const { error } = await this.supabase
        .from('collaboration_user_permissions')
        .insert(permissionData)

      if (error) {
        throw new Error(`Failed to grant permissions: ${error.message}`)
      }

      // Clear permission cache
      this.clearPermissionCache()

      // Log activity
      await this.logActivity('grant_collaboration_permissions', 'permission', granteeId, {
        granteeId: permissions.userId,
        documentId: permissions.documentId,
        sessionId: permissions.sessionId,
        permissions: permissions.customPermissions,
        reason: permissions.reason
      })
    })
  }

  /**
   * Revoke permissions from a user
   */
  async revokePermissions(
    userId: UserId,
    documentId?: DocumentId,
    sessionId?: CollaborationSessionId,
    reason?: string
  ): Promise<Result<void>> {
    return wrapAsync(async () => {
      const userResult = await this.getCurrentUser()
      if (!userResult.success) {
        throw userResult.error
      }

      // Check permissions
      const granterContext = await this.buildPermissionContext(
        userResult.data.id,
        documentId,
        sessionId
      )
      if (!granterContext.success) {
        throw granterContext.error
      }

      const granterPermissions = await this.evaluatePermissions(granterContext.data)
      if (!granterPermissions.success) {
        throw granterPermissions.error
      }

      if (!granterPermissions.data.permissions.canManageVersions && 
          !granterPermissions.data.permissions.canApprove) {
        throw new Error('Insufficient permissions to revoke access')
      }

      let query = this.supabase
        .from('collaboration_user_permissions')
        .delete()
        .eq('user_id', userId)

      if (documentId) {
        query = query.eq('document_id', documentId)
      }
      if (sessionId) {
        query = query.eq('session_id', sessionId)
      }

      const { error } = await query

      if (error) {
        throw new Error(`Failed to revoke permissions: ${error.message}`)
      }

      // Clear permission cache
      this.clearPermissionCache()

      // Log activity
      await this.logActivity('revoke_collaboration_permissions', 'permission', userId, {
        userId,
        documentId,
        sessionId,
        reason
      })
    })
  }

  // ================================
  // Permission Rules
  // ================================

  /**
   * Create a dynamic permission rule
   */
  async createPermissionRule(
    rule: Omit<PermissionRule, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Result<PermissionRule>> {
    return wrapAsync(async () => {
      const userResult = await this.getCurrentUser()
      if (!userResult.success) {
        throw userResult.error
      }

      // Validate rule condition
      const validationResult = this.validateRuleCondition(rule.condition)
      if (!validationResult) {
        throw new Error('Invalid rule condition syntax')
      }

      const ruleData = {
        name: rule.name,
        description: rule.description,
        condition: rule.condition,
        permissions: rule.permissions,
        priority: rule.priority,
        is_active: rule.isActive,
        created_by: userResult.data.id
      }

      const { data, error } = await this.supabase
        .from('collaboration_permission_rules')
        .insert(ruleData)
        .select('*')
        .single()

      if (error) {
        throw new Error(`Failed to create permission rule: ${error.message}`)
      }

      const newRule = this.mapToPermissionRule(data)
      this.ruleCache.set(newRule.id, newRule)

      // Clear permission cache
      this.clearPermissionCache()

      return newRule
    })
  }

  /**
   * Get all active permission rules
   */
  async getActivePermissionRules(): Promise<Result<PermissionRule[]>> {
    return wrapAsync(async () => {
      const { data, error } = await this.supabase
        .from('collaboration_permission_rules')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: false })

      if (error) {
        throw new Error(`Failed to fetch permission rules: ${error.message}`)
      }

      const rules = (data || []).map(this.mapToPermissionRule)
      
      // Cache rules
      rules.forEach(rule => this.ruleCache.set(rule.id, rule))

      return rules
    })
  }

  // ================================
  // Private Methods
  // ================================

  private async performPermissionEvaluation(
    context: PermissionContext
  ): Promise<PermissionEvaluationResult> {
    const basePermissions: CollaborationPermissions = {
      canView: false,
      canEdit: false,
      canComment: false,
      canSuggest: false,
      canResolveComments: false,
      canManageVersions: false,
      canLockSections: false,
      canMerge: false,
      canApprove: false
    }

    let finalPermissions = { ...basePermissions }
    const appliedRoles: string[] = []
    const appliedRules: string[] = []
    const warnings: string[] = []

    try {
      // 1. Apply role-based permissions
      for (const roleId of context.user.roles) {
        const roleResult = await this.getRoleById(roleId)
        if (roleResult.success && roleResult.data) {
          finalPermissions = this.mergePermissions(finalPermissions, roleResult.data.permissions)
          appliedRoles.push(roleId)
        }
      }

      // 2. Apply user-specific permissions
      const userPermissionsResult = await this.getUserSpecificPermissions(
        context.user.id,
        context.document?.id,
        context.session?.id
      )
      if (userPermissionsResult.success && userPermissionsResult.data) {
        finalPermissions = this.mergePermissions(finalPermissions, userPermissionsResult.data)
      }

      // 3. Apply dynamic permission rules
      const rulesResult = await this.getActivePermissionRules()
      if (rulesResult.success) {
        for (const rule of rulesResult.data) {
          if (this.evaluateRuleCondition(rule.condition, context)) {
            finalPermissions = this.mergePermissions(finalPermissions, rule.permissions)
            appliedRules.push(rule.id)
          }
        }
      }

      // 4. Apply contextual restrictions
      finalPermissions = this.applyContextualRestrictions(finalPermissions, context, warnings)

      // 5. Apply security policies
      finalPermissions = this.applySecurityPolicies(finalPermissions, context, warnings)

      return {
        permissions: finalPermissions,
        appliedRoles,
        appliedRules,
        warnings,
        audit: {
          evaluatedAt: new Date().toISOString(),
          context: {},
          duration: 0
        }
      }

    } catch (error) {
      console.error('Permission evaluation failed:', error)
      
      // Return minimal permissions on error
      return {
        permissions: { ...basePermissions, canView: true },
        appliedRoles: [],
        appliedRules: [],
        warnings: [`Permission evaluation failed: ${error.message}`],
        audit: {
          evaluatedAt: new Date().toISOString(),
          context: {},
          duration: 0
        }
      }
    }
  }

  private async buildPermissionContext(
    userId: UserId,
    documentId?: DocumentId,
    sessionId?: CollaborationSessionId,
    organizationId?: OrganizationId
  ): Promise<Result<PermissionContext>> {
    return wrapAsync(async () => {
      // Get user information
      const { data: userData, error: userError } = await this.supabase
        .from('users')
        .select('*, organization_members(*)')
        .eq('id', userId)
        .single()

      if (userError) {
        throw new Error(`Failed to fetch user data: ${userError.message}`)
      }

      // Get document information if provided
      let documentData = null
      if (documentId) {
        const { data, error } = await this.supabase
          .from('assets')
          .select('*')
          .eq('id', documentId)
          .single()

        if (!error && data) {
          documentData = data
        }
      }

      // Get session information if provided
      let sessionData = null
      if (sessionId) {
        const { data, error } = await this.supabase
          .from('document_collaboration_sessions')
          .select('*')
          .eq('id', sessionId)
          .single()

        if (!error && data) {
          sessionData = data
        }
      }

      const context: PermissionContext = {
        user: {
          id: userId,
          organizationId: organizationId || userData.organization_members?.[0]?.organization_id,
          roles: userData.roles || [],
          attributes: {
            email: userData.email,
            createdAt: userData.created_at,
            isAdmin: userData.is_admin || false
          }
        },
        document: documentData ? {
          id: documentId!,
          organizationId: documentData.organization_id,
          isPublic: documentData.is_public || false,
          sensitivity: documentData.sensitivity_level || 'internal',
          tags: documentData.tags || [],
          createdBy: documentData.created_by
        } : {} as any,
        session: sessionData ? {
          id: sessionId!,
          type: sessionData.session_type || 'editing',
          settings: sessionData.settings || {}
        } : {} as any,
        time: {
          current: new Date(),
          businessHours: this.isBusinessHours(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        device: {
          type: 'desktop', // Default - in real implementation, detect from user agent
          trusted: true,    // Default - in real implementation, check device registry
        }
      }

      return context
    })
  }

  private mergePermissions(
    base: CollaborationPermissions,
    additional: Partial<CollaborationPermissions>
  ): CollaborationPermissions {
    return {
      canView: base.canView || additional.canView || false,
      canEdit: base.canEdit || additional.canEdit || false,
      canComment: base.canComment || additional.canComment || false,
      canSuggest: base.canSuggest || additional.canSuggest || false,
      canResolveComments: base.canResolveComments || additional.canResolveComments || false,
      canManageVersions: base.canManageVersions || additional.canManageVersions || false,
      canLockSections: base.canLockSections || additional.canLockSections || false,
      canMerge: base.canMerge || additional.canMerge || false,
      canApprove: base.canApprove || additional.canApprove || false,
      expiresAt: additional.expiresAt || base.expiresAt
    }
  }

  private applyContextualRestrictions(
    permissions: CollaborationPermissions,
    context: PermissionContext,
    warnings: string[]
  ): CollaborationPermissions {
    const restricted = { ...permissions }

    // Time-based restrictions
    if (!context.time.businessHours && context.document?.sensitivity === 'restricted') {
      restricted.canEdit = false
      restricted.canApprove = false
      warnings.push('Editing restricted outside business hours for sensitive documents')
    }

    // Device-based restrictions
    if (context.device.type === 'mobile' && context.document?.sensitivity === 'confidential') {
      restricted.canEdit = false
      warnings.push('Editing confidential documents restricted on mobile devices')
    }

    // Location-based restrictions (if available)
    if (context.device.location && !context.device.trusted) {
      restricted.canEdit = false
      restricted.canMerge = false
      warnings.push('Editing restricted from untrusted locations')
    }

    return restricted
  }

  private applySecurityPolicies(
    permissions: CollaborationPermissions,
    context: PermissionContext,
    warnings: string[]
  ): CollaborationPermissions {
    const secured = { ...permissions }

    // Document owner always has full permissions
    if (context.user.id === context.document?.createdBy) {
      return {
        canView: true,
        canEdit: true,
        canComment: true,
        canSuggest: true,
        canResolveComments: true,
        canManageVersions: true,
        canLockSections: true,
        canMerge: true,
        canApprove: true
      }
    }

    // Organizational boundaries
    if (context.user.organizationId !== context.document?.organizationId) {
      if (!context.document?.isPublic) {
        return {
          canView: false,
          canEdit: false,
          canComment: false,
          canSuggest: false,
          canResolveComments: false,
          canManageVersions: false,
          canLockSections: false,
          canMerge: false,
          canApprove: false
        }
      } else {
        // Limited permissions for external users
        secured.canEdit = false
        secured.canManageVersions = false
        secured.canLockSections = false
        secured.canMerge = false
        secured.canApprove = false
        warnings.push('Limited permissions for external organization')
      }
    }

    return secured
  }

  private evaluateRuleCondition(condition: string, context: PermissionContext): boolean {
    try {
      // Simple condition evaluation - in production, use a proper expression evaluator
      // For now, support basic conditions like "user.roles.includes('admin')"
      
      if (condition.includes('user.roles.includes')) {
        const roleMatch = condition.match(/user\.roles\.includes\(['"]([^'"]+)['"]\)/)
        if (roleMatch) {
          return context.user.roles.includes(roleMatch[1])
        }
      }

      if (condition.includes('document.sensitivity')) {
        const sensitivityMatch = condition.match(/document\.sensitivity\s*===\s*['"]([^'"]+)['"]/)
        if (sensitivityMatch) {
          return context.document?.sensitivity === sensitivityMatch[1]
        }
      }

      if (condition.includes('time.businessHours')) {
        return context.time.businessHours
      }

      // Default to false for unknown conditions
      return false

    } catch (error) {
      console.error('Rule condition evaluation failed:', error)
      return false
    }
  }

  private validateRuleCondition(condition: string): boolean {
    try {
      // Basic validation - check for dangerous patterns
      const dangerousPatterns = [
        'eval(',
        'Function(',
        'require(',
        'process.',
        'global.',
        '__proto__'
      ]

      return !dangerousPatterns.some(pattern => condition.includes(pattern))
    } catch {
      return false
    }
  }

  private async getUserSpecificPermissions(
    userId: UserId,
    documentId?: DocumentId,
    sessionId?: CollaborationSessionId
  ): Promise<Result<Partial<CollaborationPermissions> | null>> {
    return wrapAsync(async () => {
      let query = this.supabase
        .from('collaboration_user_permissions')
        .select('*')
        .eq('user_id', userId)
        .or('expires_at.is.null,expires_at.gt.now()')

      if (documentId) {
        query = query.eq('document_id', documentId)
      }
      if (sessionId) {
        query = query.eq('session_id', sessionId)
      }

      const { data, error } = await query

      if (error) {
        throw new Error(`Failed to fetch user permissions: ${error.message}`)
      }

      if (!data || data.length === 0) {
        return null
      }

      // Merge all applicable permissions
      let mergedPermissions: Partial<CollaborationPermissions> = {}
      
      for (const permission of data) {
        if (permission.custom_permissions) {
          mergedPermissions = {
            ...mergedPermissions,
            ...permission.custom_permissions
          }
        }
      }

      return mergedPermissions
    })
  }

  private buildPermissionCacheKey(context: PermissionContext): string {
    return `perm:${context.user.id}:${context.document?.id || 'no-doc'}:${context.session?.id || 'no-session'}`
  }

  private clearPermissionCache(): void {
    this.permissionCache.clear()
  }

  private isBusinessHours(): boolean {
    const now = new Date()
    const hour = now.getHours()
    const day = now.getDay()
    
    // Monday to Friday, 9 AM to 5 PM
    return day >= 1 && day <= 5 && hour >= 9 && hour < 17
  }

  private initializeSystemRoles(): void {
    // System roles would be initialized from database in a real implementation
    const systemRoles: CollaborationRole[] = [
      {
        id: 'viewer',
        name: 'Viewer',
        description: 'Can view documents and add comments',
        permissions: {
          canView: true,
          canEdit: false,
          canComment: true,
          canSuggest: false,
          canResolveComments: false,
          canManageVersions: false,
          canLockSections: false,
          canMerge: false,
          canApprove: false
        },
        isSystemRole: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'editor',
        name: 'Editor',
        description: 'Can edit documents and manage suggestions',
        permissions: {
          canView: true,
          canEdit: true,
          canComment: true,
          canSuggest: true,
          canResolveComments: true,
          canManageVersions: false,
          canLockSections: false,
          canMerge: false,
          canApprove: false
        },
        isSystemRole: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'approver',
        name: 'Approver',
        description: 'Can approve changes and manage versions',
        permissions: {
          canView: true,
          canEdit: true,
          canComment: true,
          canSuggest: true,
          canResolveComments: true,
          canManageVersions: true,
          canLockSections: true,
          canMerge: true,
          canApprove: true
        },
        isSystemRole: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]

    // Cache system roles
    systemRoles.forEach(role => this.roleCache.set(role.id, role))
  }

  private mapToCollaborationRole(data: any): CollaborationRole {
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      permissions: data.permissions,
      isSystemRole: data.is_system_role,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    }
  }

  private mapToPermissionRule(data: any): PermissionRule {
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      condition: data.condition,
      permissions: data.permissions,
      priority: data.priority,
      isActive: data.is_active,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    }
  }
}