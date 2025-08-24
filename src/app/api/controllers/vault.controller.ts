/**
 * Vault Controller
 * Consolidated controller for all secure document vault features
 * Following enterprise architecture with Repository Pattern and Result<T> types
 * 
 * Consolidates vault-related API routes into a single controller:
 * - Vault CRUD operations and management
 * - Vault security and access control
 * - Asset management within vaults
 * - Vault sharing and collaboration
 * - Vault analytics and audit trails
 * - Vault backup and recovery
 * - Vault encryption and compliance
 * - Vault templates and automation
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { VaultRepository } from '@/lib/repositories/vault.repository'
import { VaultService } from '@/lib/services/vault.service'
import { SecurityService } from '@/lib/services/security.service'
import { NotificationService } from '@/lib/services/notification.service'
import { AnalyticsService } from '@/lib/services/analytics.service'
import { RepositoryFactory } from '@/lib/repositories'
import { Result } from '@/lib/repositories/result'
import { createUserId, createOrganizationId, createVaultId, createAssetId } from '@/lib/utils/branded-type-helpers'
import { logError, logActivity } from '@/lib/utils/logging'
import { validateRequest } from '@/lib/utils/validation'
import { withAuth } from '@/lib/middleware/auth'
import { withRateLimit } from '@/lib/middleware/rate-limit'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Vault Types
export interface Vault {
  id?: string
  name: string
  description?: string
  vaultType: 'board_pack' | 'compliance_vault' | 'project_vault' | 'archive' | 'shared_workspace' | 'personal'
  organizationId: string
  status: 'active' | 'archived' | 'locked' | 'suspended'
  accessLevel: 'public' | 'organization' | 'team' | 'private'
  security: {
    encryptionEnabled: boolean
    encryptionAlgorithm?: string
    accessLogging: boolean
    requireMFA: boolean
    allowedIPs?: string[]
    sessionTimeout?: number // minutes
    downloadRestricted: boolean
    watermarkEnabled: boolean
    expiryDate?: string
  }
  permissions: {
    owners: string[]
    admins: string[]
    editors: string[]
    viewers: string[]
    collaborators: Array<{
      userId: string
      role: 'owner' | 'admin' | 'editor' | 'viewer'
      permissions: string[]
      grantedBy: string
      grantedAt: string
      expiresAt?: string
    }>
  }
  metadata: {
    createdBy: string
    createdAt?: string
    updatedAt?: string
    lastAccessedAt?: string
    assetCount?: number
    totalSize?: number // bytes
    tags: string[]
    categories: string[]
    compliance?: {
      standards: string[]
      retentionPeriod?: number // days
      auditRequired: boolean
      classificationLevel: 'public' | 'internal' | 'confidential' | 'restricted'
    }
    backup?: {
      enabled: boolean
      frequency: 'daily' | 'weekly' | 'monthly'
      retentionDays: number
      lastBackup?: string
    }
  }
  template?: {
    isTemplate: boolean
    templateName?: string
    templateCategory?: string
    templateVariables?: Record<string, any>
  }
}

interface VaultAccessRequest {
  vaultId: string
  requestType: 'access' | 'permission_change' | 'ownership_transfer'
  targetUserId?: string
  requestedRole?: 'admin' | 'editor' | 'viewer'
  requestedPermissions?: string[]
  reason?: string
  urgency?: 'low' | 'normal' | 'high' | 'urgent'
}

interface VaultBackupRequest {
  vaultId: string
  backupType: 'full' | 'incremental' | 'differential'
  includeVersions?: boolean
  includeMetadata?: boolean
  encryptBackup?: boolean
  destinationPath?: string
  retentionDays?: number
}

interface VaultAuditRequest {
  vaultId: string
  auditType: 'access_log' | 'permission_changes' | 'content_changes' | 'security_events' | 'compliance_review'
  dateRange?: {
    startDate: string
    endDate: string
  }
  userFilter?: string[]
  eventTypes?: string[]
  exportFormat?: 'json' | 'csv' | 'pdf'
}

interface VaultSharingRequest {
  vaultId: string
  shareType: 'link' | 'email' | 'organization' | 'external'
  recipients?: string[]
  permissions: 'read' | 'comment' | 'contribute' | 'manage'
  expiryDate?: string
  requireAuth?: boolean
  allowDownload?: boolean
  message?: string
  notifyRecipients?: boolean
}

interface VaultComplianceRequest {
  vaultId: string
  operation: 'review' | 'certify' | 'audit' | 'remediate'
  standards: string[]
  reviewNotes?: string
  remediation?: Array<{
    issue: string
    action: string
    priority: 'low' | 'medium' | 'high' | 'critical'
    dueDate?: string
  }>
  certificationExpiry?: string
}

// Validation Schemas
const vaultSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  vaultType: z.enum(['board_pack', 'compliance_vault', 'project_vault', 'archive', 'shared_workspace', 'personal']),
  organizationId: z.string().min(1, 'Organization ID is required'),
  accessLevel: z.enum(['public', 'organization', 'team', 'private']).default('organization'),
  security: z.object({
    encryptionEnabled: z.boolean().default(true),
    encryptionAlgorithm: z.string().optional(),
    accessLogging: z.boolean().default(true),
    requireMFA: z.boolean().default(false),
    allowedIPs: z.array(z.string().ip()).optional(),
    sessionTimeout: z.number().min(15).max(480).optional(),
    downloadRestricted: z.boolean().default(false),
    watermarkEnabled: z.boolean().default(false),
    expiryDate: z.string().datetime().optional()
  }),
  permissions: z.object({
    owners: z.array(z.string()).default([]),
    admins: z.array(z.string()).default([]),
    editors: z.array(z.string()).default([]),
    viewers: z.array(z.string()).default([])
  }),
  metadata: z.object({
    tags: z.array(z.string()).default([]),
    categories: z.array(z.string()).default([]),
    compliance: z.object({
      standards: z.array(z.string()).default([]),
      retentionPeriod: z.number().min(1).optional(),
      auditRequired: z.boolean().default(false),
      classificationLevel: z.enum(['public', 'internal', 'confidential', 'restricted']).default('internal')
    }).optional(),
    backup: z.object({
      enabled: z.boolean().default(true),
      frequency: z.enum(['daily', 'weekly', 'monthly']).default('weekly'),
      retentionDays: z.number().min(7).max(365).default(30)
    }).optional()
  }),
  template: z.object({
    isTemplate: z.boolean().default(false),
    templateName: z.string().optional(),
    templateCategory: z.string().optional(),
    templateVariables: z.record(z.any()).optional()
  }).optional()
})

const vaultAccessSchema = z.object({
  vaultId: z.string().min(1, 'Vault ID is required'),
  requestType: z.enum(['access', 'permission_change', 'ownership_transfer']),
  targetUserId: z.string().optional(),
  requestedRole: z.enum(['admin', 'editor', 'viewer']).optional(),
  requestedPermissions: z.array(z.string()).optional(),
  reason: z.string().max(500, 'Reason too long').optional(),
  urgency: z.enum(['low', 'normal', 'high', 'urgent']).default('normal')
})

const vaultBackupSchema = z.object({
  vaultId: z.string().min(1, 'Vault ID is required'),
  backupType: z.enum(['full', 'incremental', 'differential']).default('incremental'),
  includeVersions: z.boolean().default(true),
  includeMetadata: z.boolean().default(true),
  encryptBackup: z.boolean().default(true),
  destinationPath: z.string().optional(),
  retentionDays: z.number().min(7).max(2555).default(90) // ~7 years max
})

const vaultAuditSchema = z.object({
  vaultId: z.string().min(1, 'Vault ID is required'),
  auditType: z.enum(['access_log', 'permission_changes', 'content_changes', 'security_events', 'compliance_review']),
  dateRange: z.object({
    startDate: z.string().datetime(),
    endDate: z.string().datetime()
  }).optional(),
  userFilter: z.array(z.string()).optional(),
  eventTypes: z.array(z.string()).optional(),
  exportFormat: z.enum(['json', 'csv', 'pdf']).default('json')
})

const vaultSharingSchema = z.object({
  vaultId: z.string().min(1, 'Vault ID is required'),
  shareType: z.enum(['link', 'email', 'organization', 'external']),
  recipients: z.array(z.string().email()).optional(),
  permissions: z.enum(['read', 'comment', 'contribute', 'manage']),
  expiryDate: z.string().datetime().optional(),
  requireAuth: z.boolean().default(true),
  allowDownload: z.boolean().default(true),
  message: z.string().max(1000, 'Message too long').optional(),
  notifyRecipients: z.boolean().default(true)
})

const vaultComplianceSchema = z.object({
  vaultId: z.string().min(1, 'Vault ID is required'),
  operation: z.enum(['review', 'certify', 'audit', 'remediate']),
  standards: z.array(z.string()),
  reviewNotes: z.string().max(2000, 'Review notes too long').optional(),
  remediation: z.array(z.object({
    issue: z.string(),
    action: z.string(),
    priority: z.enum(['low', 'medium', 'high', 'critical']),
    dueDate: z.string().datetime().optional()
  })).optional(),
  certificationExpiry: z.string().datetime().optional()
})

export class VaultController {
  private vaultService: VaultService
  private securityService: SecurityService
  private notificationService: NotificationService
  private analyticsService: AnalyticsService
  private repositoryFactory: RepositoryFactory

  constructor() {
    this.repositoryFactory = new RepositoryFactory(this.createSupabaseClient())
    this.vaultService = new VaultService(this.repositoryFactory)
    this.securityService = new SecurityService(this.repositoryFactory)
    this.notificationService = new NotificationService(this.repositoryFactory)
    this.analyticsService = new AnalyticsService(this.repositoryFactory)
  }

  private createSupabaseClient() {
    const cookieStore = cookies()
    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )
  }

  /**
   * GET /api/vaults
   * Retrieve vaults with filtering and pagination
   */
  async getVaults(request: NextRequest): Promise<NextResponse> {
    try {
      const user = await this.getCurrentUser()
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      const url = new URL(request.url)
      const organizationId = url.searchParams.get('organizationId')
      const vaultType = url.searchParams.get('vaultType')
      const status = url.searchParams.get('status')
      const accessLevel = url.searchParams.get('accessLevel')
      const tags = url.searchParams.getAll('tags')
      const search = url.searchParams.get('search')
      const limit = parseInt(url.searchParams.get('limit') || '20')
      const offset = parseInt(url.searchParams.get('offset') || '0')

      const vaultsResult = await this.vaultService.getVaults({
        userId: createUserId(user.id),
        organizationId: organizationId ? createOrganizationId(organizationId) : undefined,
        vaultType: vaultType as Vault['vaultType'] || undefined,
        status: status as Vault['status'] || undefined,
        accessLevel: accessLevel as Vault['accessLevel'] || undefined,
        tags,
        search,
        limit,
        offset
      })

      if (!vaultsResult.success) {
        return NextResponse.json(
          { success: false, error: vaultsResult.error },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        data: vaultsResult.data
      })

    } catch (error) {
      logError('Vaults retrieval failed', error)
      return NextResponse.json(
        { success: false, error: 'Vaults retrieval failed' },
        { status: 500 }
      )
    }
  }

  /**
   * POST /api/vaults
   * Create a new vault
   */
  async createVault(request: NextRequest): Promise<NextResponse> {
    try {
      const validation = await validateRequest(request, vaultSchema)
      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: validation.error },
          { status: 400 }
        )
      }

      const user = await this.getCurrentUser()
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      const vaultData = validation.data as Vault

      // Create vault with security settings
      const vaultResult = await this.vaultService.createVault({
        ...vaultData,
        organizationId: createOrganizationId(vaultData.organizationId),
        permissions: {
          ...vaultData.permissions,
          owners: [user.id] // Creator becomes owner
        },
        metadata: {
          ...vaultData.metadata,
          createdBy: user.id
        }
      }, createUserId(user.id))

      if (!vaultResult.success) {
        return NextResponse.json(
          { success: false, error: vaultResult.error },
          { status: 500 }
        )
      }

      // Initialize vault security
      await this.securityService.initializeVaultSecurity({
        vaultId: createVaultId(vaultResult.data.id),
        securityConfig: vaultData.security,
        ownerId: createUserId(user.id)
      })

      // Log vault creation
      await logActivity({
        userId: user.id,
        action: 'vault_created',
        details: {
          vaultId: vaultResult.data.id,
          vaultName: vaultData.name,
          vaultType: vaultData.vaultType,
          organizationId: vaultData.organizationId
        }
      })

      return NextResponse.json({
        success: true,
        data: vaultResult.data
      }, { status: 201 })

    } catch (error) {
      logError('Vault creation failed', error)
      return NextResponse.json(
        { success: false, error: 'Vault creation failed' },
        { status: 500 }
      )
    }
  }

  /**
   * GET /api/vaults/[id]
   * Get a specific vault
   */
  async getVault(request: NextRequest, vaultId: string): Promise<NextResponse> {
    try {
      const user = await this.getCurrentUser()
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      const vaultResult = await this.vaultService.getVaultById({
        vaultId: createVaultId(vaultId),
        userId: createUserId(user.id)
      })

      if (!vaultResult.success) {
        return NextResponse.json(
          { success: false, error: vaultResult.error },
          { status: vaultResult.error === 'Vault not found' ? 404 : 500 }
        )
      }

      // Log vault access
      await this.securityService.logVaultAccess({
        vaultId: createVaultId(vaultId),
        userId: createUserId(user.id),
        accessType: 'view',
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown'
      })

      return NextResponse.json({
        success: true,
        data: vaultResult.data
      })

    } catch (error) {
      logError('Vault retrieval failed', error)
      return NextResponse.json(
        { success: false, error: 'Vault retrieval failed' },
        { status: 500 }
      )
    }
  }

  /**
   * PUT /api/vaults/[id]
   * Update a vault
   */
  async updateVault(request: NextRequest, vaultId: string): Promise<NextResponse> {
    try {
      const validation = await validateRequest(request, vaultSchema.partial())
      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: validation.error },
          { status: 400 }
        )
      }

      const user = await this.getCurrentUser()
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      const updateData = validation.data

      const vaultResult = await this.vaultService.updateVault({
        vaultId: createVaultId(vaultId),
        userId: createUserId(user.id),
        updateData: {
          ...updateData,
          organizationId: updateData.organizationId ? createOrganizationId(updateData.organizationId) : undefined
        }
      })

      if (!vaultResult.success) {
        return NextResponse.json(
          { success: false, error: vaultResult.error },
          { status: vaultResult.error === 'Vault not found' ? 404 : 500 }
        )
      }

      // Update security settings if changed
      if (updateData.security) {
        await this.securityService.updateVaultSecurity({
          vaultId: createVaultId(vaultId),
          securityConfig: updateData.security,
          updatedBy: createUserId(user.id)
        })
      }

      // Log vault update
      await logActivity({
        userId: user.id,
        action: 'vault_updated',
        details: {
          vaultId,
          changesCount: Object.keys(updateData).length
        }
      })

      return NextResponse.json({
        success: true,
        data: vaultResult.data
      })

    } catch (error) {
      logError('Vault update failed', error)
      return NextResponse.json(
        { success: false, error: 'Vault update failed' },
        { status: 500 }
      )
    }
  }

  /**
   * DELETE /api/vaults/[id]
   * Delete a vault
   */
  async deleteVault(request: NextRequest, vaultId: string): Promise<NextResponse> {
    try {
      const user = await this.getCurrentUser()
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      const deleteResult = await this.vaultService.deleteVault({
        vaultId: createVaultId(vaultId),
        userId: createUserId(user.id)
      })

      if (!deleteResult.success) {
        return NextResponse.json(
          { success: false, error: deleteResult.error },
          { status: deleteResult.error === 'Vault not found' ? 404 : 500 }
        )
      }

      // Log vault deletion
      await logActivity({
        userId: user.id,
        action: 'vault_deleted',
        details: {
          vaultId
        }
      })

      return NextResponse.json({
        success: true,
        message: 'Vault deleted successfully'
      })

    } catch (error) {
      logError('Vault deletion failed', error)
      return NextResponse.json(
        { success: false, error: 'Vault deletion failed' },
        { status: 500 }
      )
    }
  }

  /**
   * GET /api/vaults/[id]/assets
   * Get assets in a vault
   */
  async getVaultAssets(request: NextRequest, vaultId: string): Promise<NextResponse> {
    try {
      const user = await this.getCurrentUser()
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      const url = new URL(request.url)
      const limit = parseInt(url.searchParams.get('limit') || '50')
      const offset = parseInt(url.searchParams.get('offset') || '0')
      const search = url.searchParams.get('search')
      const fileType = url.searchParams.get('fileType')
      const category = url.searchParams.get('category')

      const assetsResult = await this.vaultService.getVaultAssets({
        vaultId: createVaultId(vaultId),
        userId: createUserId(user.id),
        limit,
        offset,
        search,
        fileType,
        category
      })

      if (!assetsResult.success) {
        return NextResponse.json(
          { success: false, error: assetsResult.error },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        data: assetsResult.data
      })

    } catch (error) {
      logError('Vault assets retrieval failed', error)
      return NextResponse.json(
        { success: false, error: 'Assets retrieval failed' },
        { status: 500 }
      )
    }
  }

  /**
   * POST /api/vaults/[id]/access-request
   * Request access to a vault
   */
  async requestAccess(request: NextRequest, vaultId: string): Promise<NextResponse> {
    try {
      const validation = await validateRequest(request, vaultAccessSchema.omit({ vaultId: true }))
      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: validation.error },
          { status: 400 }
        )
      }

      const user = await this.getCurrentUser()
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      const accessRequestData = validation.data

      const requestResult = await this.vaultService.requestAccess({
        vaultId: createVaultId(vaultId),
        requesterId: createUserId(user.id),
        ...accessRequestData
      })

      if (!requestResult.success) {
        return NextResponse.json(
          { success: false, error: requestResult.error },
          { status: 500 }
        )
      }

      // Notify vault owners/admins
      await this.notificationService.sendVaultAccessRequest({
        vaultId: createVaultId(vaultId),
        requester: {
          id: user.id,
          email: user.email!,
          name: user.user_metadata?.name || user.email
        },
        requestType: accessRequestData.requestType,
        reason: accessRequestData.reason,
        urgency: accessRequestData.urgency
      })

      // Log access request
      await logActivity({
        userId: user.id,
        action: 'vault_access_requested',
        details: {
          vaultId,
          requestType: accessRequestData.requestType,
          urgency: accessRequestData.urgency
        }
      })

      return NextResponse.json({
        success: true,
        data: requestResult.data
      })

    } catch (error) {
      logError('Vault access request failed', error)
      return NextResponse.json(
        { success: false, error: 'Access request failed' },
        { status: 500 }
      )
    }
  }

  /**
   * POST /api/vaults/[id]/backup
   * Create a backup of the vault
   */
  async createBackup(request: NextRequest, vaultId: string): Promise<NextResponse> {
    try {
      const validation = await validateRequest(request, vaultBackupSchema.omit({ vaultId: true }))
      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: validation.error },
          { status: 400 }
        )
      }

      const user = await this.getCurrentUser()
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      const backupData = validation.data

      const backupResult = await this.vaultService.createBackup({
        vaultId: createVaultId(vaultId),
        userId: createUserId(user.id),
        ...backupData
      })

      if (!backupResult.success) {
        return NextResponse.json(
          { success: false, error: backupResult.error },
          { status: 500 }
        )
      }

      // Log backup creation
      await logActivity({
        userId: user.id,
        action: 'vault_backup_created',
        details: {
          vaultId,
          backupType: backupData.backupType,
          backupId: backupResult.data.backupId
        }
      })

      return NextResponse.json({
        success: true,
        data: backupResult.data
      })

    } catch (error) {
      logError('Vault backup failed', error)
      return NextResponse.json(
        { success: false, error: 'Backup creation failed' },
        { status: 500 }
      )
    }
  }

  /**
   * POST /api/vaults/[id]/audit
   * Generate audit report for vault
   */
  async generateAudit(request: NextRequest, vaultId: string): Promise<NextResponse> {
    try {
      const validation = await validateRequest(request, vaultAuditSchema.omit({ vaultId: true }))
      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: validation.error },
          { status: 400 }
        )
      }

      const user = await this.getCurrentUser()
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      const auditData = validation.data

      const auditResult = await this.securityService.generateVaultAudit({
        vaultId: createVaultId(vaultId),
        userId: createUserId(user.id),
        ...auditData
      })

      if (!auditResult.success) {
        return NextResponse.json(
          { success: false, error: auditResult.error },
          { status: 500 }
        )
      }

      // Log audit generation
      await logActivity({
        userId: user.id,
        action: 'vault_audit_generated',
        details: {
          vaultId,
          auditType: auditData.auditType,
          exportFormat: auditData.exportFormat
        }
      })

      // Return appropriate content type based on export format
      const contentTypes = {
        json: 'application/json',
        csv: 'text/csv',
        pdf: 'application/pdf'
      }

      if (auditData.exportFormat === 'json') {
        return NextResponse.json({
          success: true,
          data: auditResult.data
        })
      } else {
        return new Response(auditResult.data.content, {
          status: 200,
          headers: {
            'Content-Type': contentTypes[auditData.exportFormat],
            'Content-Disposition': `attachment; filename="vault_audit.${auditData.exportFormat}"`,
            'Cache-Control': 'no-store'
          }
        })
      }

    } catch (error) {
      logError('Vault audit generation failed', error)
      return NextResponse.json(
        { success: false, error: 'Audit generation failed' },
        { status: 500 }
      )
    }
  }

  /**
   * POST /api/vaults/[id]/share
   * Share vault with users or generate sharing links
   */
  async shareVault(request: NextRequest, vaultId: string): Promise<NextResponse> {
    try {
      const validation = await validateRequest(request, vaultSharingSchema.omit({ vaultId: true }))
      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: validation.error },
          { status: 400 }
        )
      }

      const user = await this.getCurrentUser()
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      const sharingData = validation.data

      const sharingResult = await this.vaultService.shareVault({
        vaultId: createVaultId(vaultId),
        sharedBy: createUserId(user.id),
        ...sharingData
      })

      if (!sharingResult.success) {
        return NextResponse.json(
          { success: false, error: sharingResult.error },
          { status: 500 }
        )
      }

      // Send notifications if requested
      if (sharingData.notifyRecipients && sharingData.recipients) {
        await this.notificationService.sendVaultSharingNotifications({
          vaultId: createVaultId(vaultId),
          sharedBy: {
            id: user.id,
            email: user.email!,
            name: user.user_metadata?.name || user.email
          },
          recipients: sharingData.recipients,
          permissions: sharingData.permissions,
          message: sharingData.message
        })
      }

      // Log sharing activity
      await logActivity({
        userId: user.id,
        action: 'vault_shared',
        details: {
          vaultId,
          shareType: sharingData.shareType,
          permissions: sharingData.permissions,
          recipientsCount: sharingData.recipients?.length || 0
        }
      })

      return NextResponse.json({
        success: true,
        data: sharingResult.data
      })

    } catch (error) {
      logError('Vault sharing failed', error)
      return NextResponse.json(
        { success: false, error: 'Vault sharing failed' },
        { status: 500 }
      )
    }
  }

  /**
   * POST /api/vaults/[id]/compliance
   * Handle compliance operations
   */
  async handleCompliance(request: NextRequest, vaultId: string): Promise<NextResponse> {
    try {
      const validation = await validateRequest(request, vaultComplianceSchema.omit({ vaultId: true }))
      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: validation.error },
          { status: 400 }
        )
      }

      const user = await this.getCurrentUser()
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      const complianceData = validation.data

      const complianceResult = await this.vaultService.handleCompliance({
        vaultId: createVaultId(vaultId),
        userId: createUserId(user.id),
        ...complianceData
      })

      if (!complianceResult.success) {
        return NextResponse.json(
          { success: false, error: complianceResult.error },
          { status: 500 }
        )
      }

      // Log compliance activity
      await logActivity({
        userId: user.id,
        action: `vault_compliance_${complianceData.operation}`,
        details: {
          vaultId,
          operation: complianceData.operation,
          standards: complianceData.standards
        }
      })

      return NextResponse.json({
        success: true,
        data: complianceResult.data
      })

    } catch (error) {
      logError('Vault compliance operation failed', error)
      return NextResponse.json(
        { success: false, error: 'Compliance operation failed' },
        { status: 500 }
      )
    }
  }

  /**
   * GET /api/vaults/templates
   * Get vault templates
   */
  async getTemplates(request: NextRequest): Promise<NextResponse> {
    try {
      const user = await this.getCurrentUser()
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      const url = new URL(request.url)
      const organizationId = url.searchParams.get('organizationId')
      const vaultType = url.searchParams.get('vaultType')
      const category = url.searchParams.get('category')

      const templatesResult = await this.vaultService.getTemplates({
        userId: createUserId(user.id),
        organizationId: organizationId ? createOrganizationId(organizationId) : undefined,
        vaultType: vaultType as Vault['vaultType'] || undefined,
        category
      })

      if (!templatesResult.success) {
        return NextResponse.json(
          { success: false, error: templatesResult.error },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        data: templatesResult.data
      })

    } catch (error) {
      logError('Vault templates retrieval failed', error)
      return NextResponse.json(
        { success: false, error: 'Templates retrieval failed' },
        { status: 500 }
      )
    }
  }

  private async getCurrentUser() {
    try {
      const supabase = this.createSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      return user
    } catch (error) {
      logError('Failed to get current user', error)
      return null
    }
  }
}

// Export controller instance
export const vaultController = new VaultController()

// Route handlers for different HTTP methods and endpoints
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const pathname = url.pathname
  
  // Apply rate limiting
  const rateLimitResult = await withRateLimit(request, {
    limit: 120, // 120 requests per minute for read operations
    window: 60 * 1000
  })
  
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { success: false, error: 'Rate limit exceeded' },
      { status: 429 }
    )
  }

  if (pathname.includes('/templates')) {
    return await vaultController.getTemplates(request)
  } else if (pathname.includes('/assets')) {
    const vaultId = pathname.split('/vaults/')[1]?.split('/')[0]
    if (vaultId) {
      return await vaultController.getVaultAssets(request, vaultId)
    }
  } else if (pathname.includes('/vaults/')) {
    const vaultId = pathname.split('/vaults/')[1]?.split('/')[0]
    if (vaultId) {
      return await vaultController.getVault(request, vaultId)
    }
  } else if (pathname.includes('/vaults')) {
    return await vaultController.getVaults(request)
  }
  
  return NextResponse.json(
    { success: false, error: 'Endpoint not found' },
    { status: 404 }
  )
}

export async function POST(request: NextRequest) {
  const url = new URL(request.url)
  const pathname = url.pathname
  
  // Apply rate limiting for POST operations
  const rateLimitResult = await withRateLimit(request, {
    limit: 50, // 50 requests per minute for write operations
    window: 60 * 1000
  })
  
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { success: false, error: 'Rate limit exceeded' },
      { status: 429 }
    )
  }

  const vaultId = pathname.split('/vaults/')[1]?.split('/')[0]

  if (pathname.includes('/compliance') && vaultId) {
    return await vaultController.handleCompliance(request, vaultId)
  } else if (pathname.includes('/share') && vaultId) {
    return await vaultController.shareVault(request, vaultId)
  } else if (pathname.includes('/audit') && vaultId) {
    return await vaultController.generateAudit(request, vaultId)
  } else if (pathname.includes('/backup') && vaultId) {
    return await vaultController.createBackup(request, vaultId)
  } else if (pathname.includes('/access-request') && vaultId) {
    return await vaultController.requestAccess(request, vaultId)
  } else if (pathname.includes('/vaults') && !vaultId) {
    return await vaultController.createVault(request)
  }
  
  return NextResponse.json(
    { success: false, error: 'Endpoint not found' },
    { status: 404 }
  )
}

export async function PUT(request: NextRequest) {
  const url = new URL(request.url)
  const pathname = url.pathname
  
  // Apply rate limiting for PUT operations
  const rateLimitResult = await withRateLimit(request, {
    limit: 50,
    window: 60 * 1000
  })
  
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { success: false, error: 'Rate limit exceeded' },
      { status: 429 }
    )
  }

  const vaultId = pathname.split('/vaults/')[1]?.split('/')[0]
  
  if (!vaultId) {
    return NextResponse.json(
      { success: false, error: 'Vault ID required' },
      { status: 400 }
    )
  }

  return await vaultController.updateVault(request, vaultId)
}

export async function DELETE(request: NextRequest) {
  const url = new URL(request.url)
  const pathname = url.pathname
  
  // Apply rate limiting for DELETE operations
  const rateLimitResult = await withRateLimit(request, {
    limit: 20,
    window: 60 * 1000
  })
  
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { success: false, error: 'Rate limit exceeded' },
      { status: 429 }
    )
  }

  const vaultId = pathname.split('/vaults/')[1]?.split('/')[0]
  
  if (!vaultId) {
    return NextResponse.json(
      { success: false, error: 'Vault ID required' },
      { status: 400 }
    )
  }

  return await vaultController.deleteVault(request, vaultId)
}