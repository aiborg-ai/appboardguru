/**
 * ABAC Permission Evaluator
 * Context-aware permission evaluation with resource attributes and dynamic policy resolution
 */

import {
  AccessRequest,
  AccessDecision,
  Subject,
  Resource,
  Action,
  Environment,
  ABACPolicy,
  RequestContext,
  AttributeResolver,
  SubjectAttributes,
  ResourceAttributes,
  ActionAttributes,
  EnvironmentAttributes
} from './types'
import { PolicyEngine } from './policy-engine'
import { logSecurityEvent, logDataAccess } from '../audit'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * High-level permission evaluator that provides context-aware access control
 */
export class PermissionEvaluator {
  private policyEngine: PolicyEngine
  private attributeCache: Map<string, { value: unknown; expiry: number }> = new Map()
  private readonly cacheTimeout = 300000 // 5 minutes

  constructor(policyEngine: PolicyEngine) {
    this.policyEngine = policyEngine
    this.setupDefaultAttributeResolvers()
    this.setupDefaultObligationHandlers()
  }

  /**
   * Check if subject can perform action on resource
   */
  async checkPermission(
    subjectId: string,
    resourceType: string,
    resourceId: string,
    action: string,
    context?: Partial<RequestContext>
  ): Promise<AccessDecision> {
    try {
      // Build access request
      const request = await this.buildAccessRequest(
        subjectId,
        resourceType,
        resourceId,
        action,
        context
      )

      // Evaluate with policy engine
      const decision = await this.policyEngine.evaluate(request)

      // Log access attempt
      await this.logAccessAttempt(request, decision)

      return decision
    } catch (error) {
      await logSecurityEvent('permission_evaluation_error', {
        subjectId,
        resourceType,
        resourceId,
        action,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 'high')

      return {
        decision: 'indeterminate',
        confidence: 0,
        riskScore: 100,
        reasons: [{
          type: 'policy',
          description: `Permission evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          severity: 'error'
        }],
        appliedPolicies: [],
        obligations: [],
        advice: [],
        metadata: {
          requestId: this.generateId(),
          timestamp: new Date(),
          evaluationTime: 0,
          evaluatedPolicies: 0,
          version: '1.0.0'
        }
      }
    }
  }

  /**
   * Check multiple permissions at once
   */
  async checkPermissions(
    subjectId: string,
    permissions: Array<{
      resourceType: string
      resourceId: string
      action: string
    }>,
    context?: Partial<RequestContext>
  ): Promise<AccessDecision[]> {
    const decisions: AccessDecision[] = []

    for (const permission of permissions) {
      const decision = await this.checkPermission(
        subjectId,
        permission.resourceType,
        permission.resourceId,
        permission.action,
        context
      )
      decisions.push(decision)
    }

    return decisions
  }

  /**
   * Check if subject has any of the specified permissions
   */
  async hasAnyPermission(
    subjectId: string,
    permissions: Array<{
      resourceType: string
      resourceId: string
      action: string
    }>,
    context?: Partial<RequestContext>
  ): Promise<boolean> {
    const decisions = await this.checkPermissions(subjectId, permissions, context)
    return decisions.some(decision => decision.decision === 'permit')
  }

  /**
   * Check if subject has all specified permissions
   */
  async hasAllPermissions(
    subjectId: string,
    permissions: Array<{
      resourceType: string
      resourceId: string
      action: string
    }>,
    context?: Partial<RequestContext>
  ): Promise<boolean> {
    const decisions = await this.checkPermissions(subjectId, permissions, context)
    return decisions.every(decision => decision.decision === 'permit')
  }

  /**
   * Get effective permissions for subject on resource
   */
  async getEffectivePermissions(
    subjectId: string,
    resourceType: string,
    resourceId: string,
    actions: string[],
    context?: Partial<RequestContext>
  ): Promise<Record<string, AccessDecision>> {
    const permissions: Record<string, AccessDecision> = {}

    for (const action of actions) {
      permissions[action] = await this.checkPermission(
        subjectId,
        resourceType,
        resourceId,
        action,
        context
      )
    }

    return permissions
  }

  /**
   * Filter resources based on permissions
   */
  async filterResources<T extends { id: string; type?: string }>(
    subjectId: string,
    resources: T[],
    action: string,
    context?: Partial<RequestContext>
  ): Promise<T[]> {
    const authorized: T[] = []

    for (const resource of resources) {
      const decision = await this.checkPermission(
        subjectId,
        resource.type || 'resource',
        resource.id,
        action,
        context
      )

      if (decision.decision === 'permit') {
        authorized.push(resource)
      }
    }

    return authorized
  }

  /**
   * Build access request from parameters
   */
  private async buildAccessRequest(
    subjectId: string,
    resourceType: string,
    resourceId: string,
    action: string,
    context?: Partial<RequestContext>
  ): Promise<AccessRequest> {
    // Resolve subject attributes
    const subjectAttributes = await this.resolveSubjectAttributes(subjectId)
    const subject: Subject = {
      id: subjectId,
      type: 'user',
      attributes: subjectAttributes
    }

    // Resolve resource attributes
    const resourceAttributes = await this.resolveResourceAttributes(resourceType, resourceId)
    const resource: Resource = {
      id: resourceId,
      type: resourceType,
      attributes: resourceAttributes
    }

    // Build action
    const actionObj: Action = {
      type: action,
      attributes: {
        action,
        method: this.inferHttpMethod(action),
        scope: this.inferScope(action),
        urgency: context?.urgency || 'normal'
      }
    }

    // Build environment
    const environment: Environment = {
      attributes: await this.resolveEnvironmentAttributes(context)
    }

    return {
      subject,
      resource,
      action: actionObj,
      environment,
      context: {
        correlationId: this.generateId(),
        businessJustification: context?.businessJustification,
        urgency: context?.urgency,
        deadline: context?.deadline,
        riskAssessment: context?.riskAssessment,
        complianceRequirements: context?.complianceRequirements,
        ...context
      }
    }
  }

  /**
   * Resolve subject attributes from database and cache
   */
  private async resolveSubjectAttributes(subjectId: string): Promise<SubjectAttributes> {
    const cacheKey = `subject:${subjectId}`
    const cached = this.getFromCache(cacheKey)
    if (cached) {
      return cached as SubjectAttributes
    }

    try {
      // Get user details
      const { data: user, error: userError } = await supabaseAdmin
        .from('users')
        .select(`
          id,
          email,
          full_name,
          role,
          status,
          last_login_at,
          failed_login_count,
          created_at,
          organization_members (
            organization_id,
            role,
            status,
            joined_at
          )
        `)
        .eq('id', subjectId)
        .single()

      if (userError || !user) {
        throw new Error(`User not found: ${subjectId}`)
      }

      // Get additional context like recent sessions, security events
      const { data: recentSessions } = await supabaseAdmin
        .from('audit_logs')
        .select('*')
        .eq('user_id', subjectId)
        .eq('event_type', 'authentication')
        .order('created_at', { ascending: false })
        .limit(5)

      const attributes: SubjectAttributes = {
        userId: user.id,
        role: user.role,
        organizationId: user.organization_members?.[0]?.organization_id,
        organizationRole: user.organization_members?.[0]?.role,
        accountStatus: user.status,
        lastLoginAt: user.last_login_at ? new Date(user.last_login_at) : undefined,
        failedLoginCount: user.failed_login_count || 0,
        permissions: await this.getUserPermissions(subjectId),
        groups: await this.getUserGroups(subjectId),
        customAttributes: {
          memberSince: user.created_at,
          organizationCount: user.organization_members?.length || 0,
          recentSessionCount: recentSessions?.length || 0
        }
      }

      this.setCache(cacheKey, attributes)
      return attributes
    } catch (error) {
      console.error('Error resolving subject attributes:', error)
      
      // Return minimal attributes for unknown subjects
      return {
        userId: subjectId,
        role: 'unknown',
        accountStatus: 'pending',
        failedLoginCount: 0,
        permissions: [],
        groups: []
      }
    }
  }

  /**
   * Resolve resource attributes from database and metadata
   */
  private async resolveResourceAttributes(
    resourceType: string,
    resourceId: string
  ): Promise<ResourceAttributes> {
    const cacheKey = `resource:${resourceType}:${resourceId}`
    const cached = this.getFromCache(cacheKey)
    if (cached) {
      return cached as ResourceAttributes
    }

    try {
      let attributes: ResourceAttributes = {
        resourceId,
        resourceType,
        classification: 'internal',
        sensitivity: 'medium',
        categories: [],
        tags: [],
        metadata: {}
      }

      // Get resource-specific attributes based on type
      switch (resourceType) {
        case 'organization':
          attributes = await this.getOrganizationAttributes(resourceId)
          break
        case 'vault':
          attributes = await this.getVaultAttributes(resourceId)
          break
        case 'asset':
          attributes = await this.getAssetAttributes(resourceId)
          break
        case 'meeting':
          attributes = await this.getMeetingAttributes(resourceId)
          break
        default:
          // Generic resource attributes
          attributes.resourceId = resourceId
          attributes.resourceType = resourceType
      }

      this.setCache(cacheKey, attributes)
      return attributes
    } catch (error) {
      console.error('Error resolving resource attributes:', error)
      
      return {
        resourceId,
        resourceType,
        classification: 'restricted', // Default to most restrictive
        sensitivity: 'high',
        categories: [],
        tags: [],
        metadata: {}
      }
    }
  }

  /**
   * Get organization-specific attributes
   */
  private async getOrganizationAttributes(organizationId: string): Promise<ResourceAttributes> {
    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single()

    return {
      resourceId: organizationId,
      resourceType: 'organization',
      organizationId,
      ownerId: org?.created_by,
      classification: 'internal',
      sensitivity: 'medium',
      categories: ['governance'],
      tags: org?.tags || [],
      metadata: {
        name: org?.name,
        type: org?.type,
        industry: org?.industry,
        memberCount: 0 // TODO: count members
      },
      createdAt: org?.created_at ? new Date(org.created_at) : undefined,
      customAttributes: {
        subscriptionTier: org?.subscription_tier,
        complianceLevel: org?.compliance_level
      }
    }
  }

  /**
   * Get vault-specific attributes
   */
  private async getVaultAttributes(vaultId: string): Promise<ResourceAttributes> {
    const { data: vault } = await supabaseAdmin
      .from('vaults')
      .select('*')
      .eq('id', vaultId)
      .single()

    return {
      resourceId: vaultId,
      resourceType: 'vault',
      organizationId: vault?.organization_id,
      ownerId: vault?.created_by,
      classification: vault?.classification || 'confidential',
      sensitivity: 'high',
      categories: ['document_storage'],
      tags: vault?.tags || [],
      metadata: {
        name: vault?.name,
        description: vault?.description,
        assetCount: 0 // TODO: count assets
      },
      createdAt: vault?.created_at ? new Date(vault.created_at) : undefined,
      encryptionStatus: 'at_rest',
      retentionPolicy: vault?.retention_policy,
      legalHold: vault?.legal_hold || false
    }
  }

  /**
   * Get asset-specific attributes
   */
  private async getAssetAttributes(assetId: string): Promise<ResourceAttributes> {
    const { data: asset } = await supabaseAdmin
      .from('assets')
      .select('*')
      .eq('id', assetId)
      .single()

    return {
      resourceId: assetId,
      resourceType: 'asset',
      organizationId: asset?.organization_id,
      ownerId: asset?.uploaded_by,
      classification: asset?.classification || 'confidential',
      sensitivity: this.determineSensitivityFromFileType(asset?.file_type),
      categories: [asset?.category || 'document'],
      tags: asset?.tags || [],
      metadata: {
        fileName: asset?.file_name,
        fileType: asset?.file_type,
        mimeType: asset?.mime_type
      },
      size: asset?.file_size,
      createdAt: asset?.created_at ? new Date(asset.created_at) : undefined,
      modifiedAt: asset?.updated_at ? new Date(asset.updated_at) : undefined,
      version: asset?.version || 1,
      encryptionStatus: asset?.encrypted ? 'at_rest' : 'none',
      parentResource: asset?.vault_id,
      customAttributes: {
        downloadCount: asset?.download_count || 0,
        shareCount: asset?.share_count || 0
      }
    }
  }

  /**
   * Get meeting-specific attributes
   */
  private async getMeetingAttributes(meetingId: string): Promise<ResourceAttributes> {
    const { data: meeting } = await supabaseAdmin
      .from('meetings')
      .select('*')
      .eq('id', meetingId)
      .single()

    return {
      resourceId: meetingId,
      resourceType: 'meeting',
      organizationId: meeting?.organization_id,
      ownerId: meeting?.created_by,
      classification: 'confidential',
      sensitivity: 'high',
      categories: ['governance', 'meeting'],
      tags: meeting?.tags || [],
      metadata: {
        title: meeting?.title,
        type: meeting?.type,
        status: meeting?.status,
        attendeeCount: 0 // TODO: count attendees
      },
      createdAt: meeting?.created_at ? new Date(meeting.created_at) : undefined,
      customAttributes: {
        isRecorded: meeting?.is_recorded || false,
        hasTranscript: meeting?.has_transcript || false
      }
    }
  }

  /**
   * Resolve environment attributes
   */
  private async resolveEnvironmentAttributes(
    context?: Partial<RequestContext>
  ): Promise<EnvironmentAttributes> {
    const now = new Date()
    const hour = now.getHours()
    const day = now.getDay()

    return {
      timestamp: now,
      requestId: this.generateId(),
      timeOfDay: this.determineTimeOfDay(hour, day),
      threatLevel: 'low', // TODO: integrate with threat detection
      anomalyScore: 0,
      riskFactors: [],
      complianceContext: context?.complianceRequirements || [],
      businessContext: {
        department: 'unknown'
      },
      technicalContext: {
        applicationVersion: '1.0.0',
        platform: 'web'
      },
      customAttributes: context?.customContext || {}
    }
  }

  /**
   * Setup default attribute resolvers
   */
  private setupDefaultAttributeResolvers(): void {
    // Current time resolver
    this.policyEngine.registerAttributeResolver('environment.current_time', async () => new Date())

    // Business hours resolver
    this.policyEngine.registerAttributeResolver('environment.is_business_hours', async () => {
      const hour = new Date().getHours()
      return hour >= 9 && hour <= 17
    })

    // User's organization count resolver
    this.policyEngine.registerAttributeResolver('subject.organization_count', async (_, request) => {
      const orgs = request.subject.attributes.customAttributes?.organizationCount
      return orgs || 0
    })

    // Resource age resolver
    this.policyEngine.registerAttributeResolver('resource.age_days', async (_, request) => {
      const createdAt = request.resource.attributes.createdAt
      if (!createdAt) return 0
      return Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24))
    })
  }

  /**
   * Setup default obligation handlers
   */
  private setupDefaultObligationHandlers(): void {
    // Audit logging obligation
    this.policyEngine.registerObligationHandler('audit', async (obligation, request) => {
      await logDataAccess(
        request.subject.id,
        request.resource.type,
        request.resource.id,
        request.action.type,
        {
          organizationId: request.resource.attributes.organizationId,
          obligation: obligation.id,
          parameters: obligation.parameters
        }
      )
    })

    // Notification obligation
    this.policyEngine.registerObligationHandler('notify', async (obligation, request) => {
      await logSecurityEvent('notification_obligation', {
        obligationId: obligation.id,
        notificationTarget: obligation.parameters.target,
        message: obligation.parameters.message,
        subject: request.subject.id,
        resource: request.resource.id
      }, 'low')
    })

    // Approval obligation
    this.policyEngine.registerObligationHandler('approve', async (obligation, request) => {
      // TODO: Integrate with approval workflow system
      await logSecurityEvent('approval_required', {
        obligationId: obligation.id,
        approver: obligation.parameters.approver,
        subject: request.subject.id,
        resource: request.resource.id,
        action: request.action.type
      }, 'medium')
    })
  }

  /**
   * Utility methods
   */
  private inferHttpMethod(action: string): 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' {
    if (action.includes('create')) return 'POST'
    if (action.includes('update') || action.includes('modify')) return 'PUT'
    if (action.includes('delete') || action.includes('remove')) return 'DELETE'
    if (action.includes('patch')) return 'PATCH'
    return 'GET'
  }

  private inferScope(action: string): 'self' | 'organization' | 'global' {
    if (action.includes('admin') || action.includes('global')) return 'global'
    if (action.includes('organization') || action.includes('org')) return 'organization'
    return 'self'
  }

  private determineTimeOfDay(hour: number, day: number): 'business_hours' | 'after_hours' | 'weekend' | 'holiday' {
    if (day === 0 || day === 6) return 'weekend'
    if (hour >= 9 && hour <= 17) return 'business_hours'
    return 'after_hours'
  }

  private determineSensitivityFromFileType(fileType?: string): 'low' | 'medium' | 'high' | 'critical' {
    if (!fileType) return 'medium'
    
    const type = fileType.toLowerCase()
    if (type.includes('financial') || type.includes('tax') || type.includes('bank')) return 'critical'
    if (type.includes('legal') || type.includes('contract') || type.includes('confidential')) return 'high'
    if (type.includes('internal') || type.includes('private')) return 'medium'
    return 'low'
  }

  private async getUserPermissions(userId: string): Promise<string[]> {
    // TODO: Implement user permission resolution
    return []
  }

  private async getUserGroups(userId: string): Promise<string[]> {
    // TODO: Implement user group resolution
    return []
  }

  private async logAccessAttempt(request: AccessRequest, decision: AccessDecision): Promise<void> {
    await logDataAccess(
      request.subject.id,
      request.resource.type,
      request.resource.id,
      request.action.type,
      {
        decision: decision.decision,
        riskScore: decision.riskScore,
        appliedPolicies: decision.appliedPolicies,
        organizationId: request.resource.attributes.organizationId
      }
    )
  }

  private getFromCache(key: string): unknown | null {
    const entry = this.attributeCache.get(key)
    if (!entry) return null
    
    if (Date.now() > entry.expiry) {
      this.attributeCache.delete(key)
      return null
    }
    
    return entry.value
  }

  private setCache(key: string, value: unknown): void {
    this.attributeCache.set(key, {
      value,
      expiry: Date.now() + this.cacheTimeout
    })
  }

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}