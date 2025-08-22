/**
 * Settings Service
 * Comprehensive business logic for settings management with dependency injection
 * Follows CLAUDE.md architecture with BaseService extension, Result pattern, and event-driven architecture
 */

import { BaseService } from './base.service'
import { SettingsRepository, UserSettingsRepository, OrganizationSettingsRepository } from '../repositories/settings.repository'
import { 
  Result, 
  success, 
  failure, 
  RepositoryError,
  ErrorCode,
  wrapAsync 
} from '../repositories/result'
import {
  UserId,
  OrganizationId,
  Email,
  createUserId,
  createOrganizationId,
  createEmail
} from '../../types/branded'
import {
  UserSettings,
  OrganizationSettings,
  UserSettingsUpdate,
  OrganizationSettingsUpdate,
  AccountType,
  NotificationCategory,
  NotificationPreference,
  ExportConfiguration,
  ScheduledExport,
  ComplianceExport,
  SecurityEvent,
  validateUserSettings,
  validateOrganizationSettings,
  validateNotificationSettings,
  validateExportConfiguration,
  validateSecuritySettings
} from '../../types/settings-validation'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database'

// ==== Service Interfaces ====

export interface SettingsServiceDependencies {
  settingsRepository: SettingsRepository
  eventBus?: SettingsEventBus
  notificationService?: NotificationService
  auditService?: AuditService
}

export interface SettingsEventBus {
  publish(event: SettingsEvent): Promise<void>
}

export interface NotificationService {
  sendSettingsChangeNotification(userId: UserId, changes: SettingsChangeNotification): Promise<Result<void>>
}

export interface AuditService {
  logSettingsChange(entry: SettingsAuditEntry): Promise<Result<void>>
}

export interface SettingsEvent {
  type: 'settings.user.updated' | 'settings.organization.updated' | 'settings.compliance.changed' | 'settings.security.changed'
  userId: UserId
  organizationId: OrganizationId
  data: any
  timestamp: string
  source: 'user' | 'admin' | 'system'
}

export interface SettingsChangeNotification {
  changeType: 'security' | 'privacy' | 'notifications' | 'compliance' | 'general'
  changes: Array<{
    field: string
    oldValue: any
    newValue: any
    impact: 'low' | 'medium' | 'high'
  }>
  requiresAction: boolean
  actionUrl?: string
}

export interface SettingsAuditEntry {
  userId: UserId
  organizationId: OrganizationId
  action: string
  resource: string
  changes: Record<string, any>
  ipAddress?: string
  userAgent?: string
  timestamp: string
}

export interface SettingsValidationContext {
  userId: UserId
  organizationId: OrganizationId
  accountType: AccountType
  currentSettings?: UserSettings | OrganizationSettings
  organizationPolicies?: any
}

export interface SettingsPermissionCheck {
  canViewSettings: boolean
  canEditProfile: boolean
  canEditSecurity: boolean
  canEditNotifications: boolean
  canEditCompliance: boolean
  canEditOrganizationSettings: boolean
  canExportData: boolean
  canCreateScheduledExports: boolean
  restrictions: string[]
}

// ==== Settings Service Implementation ====

export class SettingsService extends BaseService {
  private settingsRepository: SettingsRepository
  private eventBus?: SettingsEventBus
  private notificationService?: NotificationService
  private auditService?: AuditService

  constructor(
    supabase: SupabaseClient<Database>,
    dependencies?: Partial<SettingsServiceDependencies>
  ) {
    super(supabase)
    this.settingsRepository = dependencies?.settingsRepository || new SettingsRepository(supabase)
    this.eventBus = dependencies?.eventBus
    this.notificationService = dependencies?.notificationService
    this.auditService = dependencies?.auditService
  }

  // ==== User Settings Operations ====

  /**
   * Get complete user settings with organization defaults
   */
  async getUserSettings(userId: UserId, organizationId: OrganizationId): Promise<Result<UserSettings>> {
    return this.executeDbOperation(
      async () => {
        const permissionResult = await this.checkPermissions(userId, organizationId, 'view_settings')
        if (!permissionResult.success || !permissionResult.data.canViewSettings) {
          throw RepositoryError.forbidden('view settings', 'Insufficient permissions to view settings')
        }

        const result = await this.settingsRepository.getCompleteUserSettings(userId, organizationId)
        if (!result.success) {
          throw result.error
        }

        return result.data
      },
      'get_user_settings',
      { userId, organizationId }
    )
  }

  /**
   * Update user settings with validation and security checks
   */
  async updateUserSettings(
    userId: UserId,
    updates: UserSettingsUpdate,
    context: { 
      requestingUserId: UserId
      ipAddress?: string
      userAgent?: string
      reason?: string
    }
  ): Promise<Result<UserSettings>> {
    return this.executeDbOperation(
      async () => {
        // Permission checks
        const isOwnSettings = userId === context.requestingUserId
        const permissionResult = await this.checkPermissions(
          context.requestingUserId, 
          updates.organizationId!, 
          isOwnSettings ? 'edit_own_settings' : 'edit_user_settings'
        )

        if (!permissionResult.success) {
          throw permissionResult.error
        }

        const permissions = permissionResult.data
        if (!permissions.canEditProfile && updates.corporateProfile) {
          throw RepositoryError.forbidden('edit profile', 'Insufficient permissions to edit profile settings')
        }

        if (!permissions.canEditSecurity && updates.security) {
          throw RepositoryError.forbidden('edit security', 'Insufficient permissions to edit security settings')
        }

        if (!permissions.canEditNotifications && updates.notifications) {
          throw RepositoryError.forbidden('edit notifications', 'Insufficient permissions to edit notification settings')
        }

        if (!permissions.canEditCompliance && updates.compliance) {
          throw RepositoryError.forbidden('edit compliance', 'Insufficient permissions to edit compliance settings')
        }

        // Get current settings for validation and audit
        const currentResult = await this.settingsRepository.user.findByUserId(userId)
        if (!currentResult.success) {
          throw currentResult.error
        }

        if (!currentResult.data) {
          throw RepositoryError.notFound('User settings', userId)
        }

        const currentSettings = currentResult.data

        // Validate updates against organization policies
        const validationResult = await this.validateSettingsUpdate(updates, {
          userId,
          organizationId: updates.organizationId!,
          accountType: currentSettings.accountOverview?.accountType || 'User',
          currentSettings
        })

        if (!validationResult.success) {
          throw validationResult.error
        }

        // Apply security validations
        const securityValidationResult = await this.validateSecurityChanges(
          currentSettings,
          updates,
          context
        )

        if (!securityValidationResult.success) {
          throw securityValidationResult.error
        }

        // Update settings
        const updateResult = await this.settingsRepository.user.update(
          userId,
          {
            ...updates,
            lastUpdatedBy: context.requestingUserId
          },
          updates.version
        )

        if (!updateResult.success) {
          throw updateResult.error
        }

        const updatedSettings = updateResult.data

        // Create change notification
        const changeNotification = this.createChangeNotification(currentSettings, updatedSettings)

        // Publish events
        await this.publishSettingsEvent({
          type: 'settings.user.updated',
          userId,
          organizationId: updates.organizationId!,
          data: {
            changes: changeNotification.changes,
            version: updatedSettings.version
          },
          timestamp: new Date().toISOString(),
          source: isOwnSettings ? 'user' : 'admin'
        })

        // Send notifications if significant changes
        if (changeNotification.requiresAction && this.notificationService) {
          await this.notificationService.sendSettingsChangeNotification(userId, changeNotification)
        }

        // Create audit entry
        if (this.auditService) {
          await this.auditService.logSettingsChange({
            userId: context.requestingUserId,
            organizationId: updates.organizationId!,
            action: 'update_user_settings',
            resource: `user_settings:${userId}`,
            changes: changeNotification.changes.reduce((acc, change) => {
              acc[change.field] = { from: change.oldValue, to: change.newValue }
              return acc
            }, {} as Record<string, any>),
            ipAddress: context.ipAddress,
            userAgent: context.userAgent,
            timestamp: new Date().toISOString()
          })
        }

        return updatedSettings
      },
      'update_user_settings',
      { userId, requestingUserId: context.requestingUserId }
    )
  }

  /**
   * Reset user settings to organization defaults
   */
  async resetUserSettingsToDefaults(
    userId: UserId,
    organizationId: OrganizationId,
    requestingUserId: UserId
  ): Promise<Result<UserSettings>> {
    return this.executeDbOperation(
      async () => {
        // Permission checks
        const isOwnSettings = userId === requestingUserId
        const permissionResult = await this.checkPermissions(
          requestingUserId,
          organizationId,
          isOwnSettings ? 'reset_own_settings' : 'reset_user_settings'
        )

        if (!permissionResult.success) {
          throw permissionResult.error
        }

        // Reset to defaults
        const resetResult = await this.settingsRepository.user.resetToDefaults(userId, organizationId)
        if (!resetResult.success) {
          throw resetResult.error
        }

        // Publish event
        await this.publishSettingsEvent({
          type: 'settings.user.updated',
          userId,
          organizationId,
          data: {
            action: 'reset_to_defaults',
            version: resetResult.data.version
          },
          timestamp: new Date().toISOString(),
          source: isOwnSettings ? 'user' : 'admin'
        })

        return resetResult.data
      },
      'reset_user_settings',
      { userId, organizationId, requestingUserId }
    )
  }

  // ==== Organization Settings Operations ====

  /**
   * Get organization settings
   */
  async getOrganizationSettings(
    organizationId: OrganizationId,
    requestingUserId: UserId
  ): Promise<Result<OrganizationSettings>> {
    return this.executeDbOperation(
      async () => {
        const permissionResult = await this.checkPermissions(
          requestingUserId,
          organizationId,
          'view_organization_settings'
        )

        if (!permissionResult.success || !permissionResult.data.canViewSettings) {
          throw RepositoryError.forbidden('view organization settings', 'Insufficient permissions')
        }

        const result = await this.settingsRepository.organization.findByOrganizationId(organizationId)
        if (!result.success) {
          throw result.error
        }

        if (!result.data) {
          throw RepositoryError.notFound('Organization settings', organizationId)
        }

        return result.data
      },
      'get_organization_settings',
      { organizationId, requestingUserId }
    )
  }

  /**
   * Update organization settings
   */
  async updateOrganizationSettings(
    organizationId: OrganizationId,
    updates: OrganizationSettingsUpdate,
    requestingUserId: UserId
  ): Promise<Result<OrganizationSettings>> {
    return this.executeDbOperation(
      async () => {
        const permissionResult = await this.checkPermissions(
          requestingUserId,
          organizationId,
          'edit_organization_settings'
        )

        if (!permissionResult.success || !permissionResult.data.canEditOrganizationSettings) {
          throw RepositoryError.forbidden('edit organization settings', 'Insufficient permissions')
        }

        // Get current settings
        const currentResult = await this.settingsRepository.organization.findByOrganizationId(organizationId)
        if (!currentResult.success || !currentResult.data) {
          throw RepositoryError.notFound('Organization settings', organizationId)
        }

        const currentSettings = currentResult.data

        // Validate compliance requirements
        if (updates.complianceSettings) {
          const complianceValidation = await this.validateComplianceSettings(
            updates.complianceSettings,
            currentSettings.complianceSettings
          )

          if (!complianceValidation.success) {
            throw complianceValidation.error
          }
        }

        // Update settings
        const updateResult = await this.settingsRepository.organization.update(
          organizationId,
          {
            ...updates,
            lastUpdatedBy: requestingUserId
          },
          updates.version
        )

        if (!updateResult.success) {
          throw updateResult.error
        }

        // Publish event
        await this.publishSettingsEvent({
          type: 'settings.organization.updated',
          userId: requestingUserId,
          organizationId,
          data: {
            changes: this.calculateOrganizationChanges(currentSettings, updateResult.data),
            version: updateResult.data.version
          },
          timestamp: new Date().toISOString(),
          source: 'admin'
        })

        return updateResult.data
      },
      'update_organization_settings',
      { organizationId, requestingUserId }
    )
  }

  // ==== Notification Settings Operations ====

  /**
   * Update notification preferences
   */
  async updateNotificationPreferences(
    userId: UserId,
    organizationId: OrganizationId,
    preferences: NotificationPreference[],
    requestingUserId: UserId
  ): Promise<Result<UserSettings>> {
    return this.executeDbOperation(
      async () => {
        // Validate notification preferences
        const validationResult = validateNotificationSettings({
          userId,
          organizationId,
          globalEnabled: true,
          categories: preferences.reduce((acc, pref) => {
            const existing = acc.find(cat => cat.categoryId === pref.category)
            if (existing) {
              existing.notifications.push(pref)
            } else {
              acc.push({
                categoryId: pref.category,
                enabled: true,
                defaultFrequency: 'immediate',
                notifications: [pref]
              })
            }
            return acc
          }, [] as any[]),
          maxNotificationsPerHour: 25,
          bundleSimilar: true,
          smartBatching: true
        })

        if (!validationResult.success) {
          throw RepositoryError.validation(
            'Invalid notification preferences',
            { errors: validationResult.error.issues }
          )
        }

        // Update user settings with new notification preferences
        const updateResult = await this.updateUserSettings(userId, {
          userId,
          organizationId,
          notifications: {
            general: validationResult.data
          }
        }, { requestingUserId })

        return updateResult
      },
      'update_notification_preferences',
      { userId, organizationId, requestingUserId }
    )
  }

  // ==== Export & Backup Operations ====

  /**
   * Create export configuration
   */
  async createExportConfiguration(
    userId: UserId,
    organizationId: OrganizationId,
    configuration: ExportConfiguration,
    requestingUserId: UserId
  ): Promise<Result<string>> {
    return this.executeDbOperation(
      async () => {
        const permissionResult = await this.checkPermissions(
          requestingUserId,
          organizationId,
          'create_export'
        )

        if (!permissionResult.success || !permissionResult.data.canExportData) {
          throw RepositoryError.forbidden('create export', 'Insufficient permissions to export data')
        }

        // Validate export configuration
        const validationResult = validateExportConfiguration(configuration)
        if (!validationResult.success) {
          throw RepositoryError.validation(
            'Invalid export configuration',
            { errors: validationResult.error.issues }
          )
        }

        // Create export job (placeholder - would integrate with actual export service)
        const exportId = `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

        // Log export creation
        await this.logActivity(
          'create_export_configuration',
          'export_configuration',
          exportId,
          {
            configuration,
            categories: configuration.categories,
            format: configuration.format,
            encryption: configuration.encryption
          }
        )

        return exportId
      },
      'create_export_configuration',
      { userId, organizationId, requestingUserId }
    )
  }

  /**
   * Create scheduled export
   */
  async createScheduledExport(
    userId: UserId,
    organizationId: OrganizationId,
    scheduledExport: Omit<ScheduledExport, 'id'>,
    requestingUserId: UserId
  ): Promise<Result<ScheduledExport>> {
    return this.executeDbOperation(
      async () => {
        const permissionResult = await this.checkPermissions(
          requestingUserId,
          organizationId,
          'create_scheduled_export'
        )

        if (!permissionResult.success || !permissionResult.data.canCreateScheduledExports) {
          throw RepositoryError.forbidden('create scheduled export', 'Insufficient permissions')
        }

        // Generate ID and validate
        const exportWithId: ScheduledExport = {
          ...scheduledExport,
          id: `scheduled_export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        }

        // Get current user settings to update exports
        const currentResult = await this.settingsRepository.user.findByUserId(userId)
        if (!currentResult.success || !currentResult.data) {
          throw RepositoryError.notFound('User settings', userId)
        }

        const currentExports = currentResult.data.exports?.scheduled || []
        const updatedExports = [...currentExports, exportWithId]

        // Update user settings with new scheduled export
        const updateResult = await this.updateUserSettings(userId, {
          userId,
          organizationId,
          exports: {
            scheduled: updatedExports,
            backupPolicies: currentResult.data.exports?.backupPolicies || []
          }
        }, { requestingUserId })

        if (!updateResult.success) {
          throw updateResult.error
        }

        return exportWithId
      },
      'create_scheduled_export',
      { userId, organizationId, requestingUserId }
    )
  }

  // ==== Security Operations ====

  /**
   * Log security event
   */
  async logSecurityEvent(
    userId: UserId,
    organizationId: OrganizationId,
    event: SecurityEvent
  ): Promise<Result<void>> {
    return this.executeDbOperation(
      async () => {
        // Validate security event
        const validationResult = validateSecuritySettings({ monitoring: { enableActivityLogging: true, logRetentionDays: 365, enableRealTimeAlerts: true, alertThresholds: { failedLoginsPerHour: 10, suspiciousLocationLogins: true, multipleDeviceLogins: true } } })
        
        // Log to audit system
        if (this.auditService) {
          await this.auditService.logSettingsChange({
            userId,
            organizationId,
            action: 'security_event',
            resource: `security_events:${event.eventType}`,
            changes: { event },
            ipAddress: event.ipAddress,
            userAgent: event.userAgent,
            timestamp: event.timestamp
          })
        }

        // Check for security alerts
        if (event.riskScore > 70) {
          await this.publishSettingsEvent({
            type: 'settings.security.changed',
            userId,
            organizationId,
            data: {
              event,
              alertLevel: event.riskScore > 90 ? 'critical' : 'high'
            },
            timestamp: event.timestamp,
            source: 'system'
          })
        }

        return undefined
      },
      'log_security_event',
      { userId, organizationId, eventType: event.eventType }
    )
  }

  // ==== Private Helper Methods ====

  /**
   * Check user permissions for settings operations
   */
  private async checkPermissions(
    userId: UserId,
    organizationId: OrganizationId,
    operation: string
  ): Promise<Result<SettingsPermissionCheck>> {
    return wrapAsync(async () => {
      // Get user's role and permissions (placeholder - would integrate with actual permission system)
      const { data: member, error } = await this.supabase
        .from('organization_members')
        .select('role, status')
        .eq('user_id', userId)
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .single()

      if (error || !member) {
        throw RepositoryError.forbidden('check permissions', 'User not found in organization')
      }

      const role = member.role as AccountType
      
      // Define permissions based on role
      const permissions: SettingsPermissionCheck = {
        canViewSettings: ['Superuser', 'Administrator', 'User', 'Viewer'].includes(role),
        canEditProfile: ['Superuser', 'Administrator', 'User'].includes(role),
        canEditSecurity: ['Superuser', 'Administrator', 'User'].includes(role),
        canEditNotifications: ['Superuser', 'Administrator', 'User'].includes(role),
        canEditCompliance: ['Superuser', 'Administrator'].includes(role),
        canEditOrganizationSettings: ['Superuser', 'Administrator'].includes(role),
        canExportData: ['Superuser', 'Administrator', 'User'].includes(role),
        canCreateScheduledExports: ['Superuser', 'Administrator'].includes(role),
        restrictions: []
      }

      // Add role-specific restrictions
      if (role === 'Viewer') {
        permissions.restrictions.push('Read-only access to most settings')
      }

      if (role === 'User') {
        permissions.restrictions.push('Cannot modify organization-wide settings')
        permissions.restrictions.push('Cannot create scheduled exports')
      }

      return permissions
    })
  }

  /**
   * Validate settings updates against organization policies
   */
  private async validateSettingsUpdate(
    updates: UserSettingsUpdate,
    context: SettingsValidationContext
  ): Promise<Result<void>> {
    return wrapAsync(async () => {
      // Get organization settings for policy validation
      const orgResult = await this.settingsRepository.organization.findByOrganizationId(context.organizationId)
      if (!orgResult.success || !orgResult.data) {
        throw RepositoryError.notFound('Organization settings', context.organizationId)
      }

      const orgSettings = orgResult.data

      // Validate against global policies
      if (updates.security?.mfaEnabled === false && orgSettings.globalPolicies.requireMFA) {
        throw RepositoryError.businessRule(
          'MFA_REQUIRED',
          'Multi-factor authentication is required by organization policy'
        )
      }

      if (updates.delegation && !orgSettings.globalPolicies.allowDelegation) {
        throw RepositoryError.businessRule(
          'DELEGATION_DISABLED',
          'Delegation is disabled by organization policy'
        )
      }

      // Validate export settings
      if (updates.exports && !orgSettings.globalPolicies.allowPersonalExports) {
        throw RepositoryError.businessRule(
          'PERSONAL_EXPORTS_DISABLED',
          'Personal exports are disabled by organization policy'
        )
      }

      return undefined
    })
  }

  /**
   * Validate security-related changes
   */
  private async validateSecurityChanges(
    currentSettings: UserSettings,
    updates: UserSettingsUpdate,
    context: { requestingUserId: UserId; ipAddress?: string; userAgent?: string }
  ): Promise<Result<void>> {
    return wrapAsync(async () => {
      // Check for security-sensitive changes
      const securityChanges = []

      if (updates.security?.mfaEnabled !== currentSettings.security?.mfaEnabled) {
        securityChanges.push('MFA status')
      }

      if (updates.security?.allowedLoginIPs !== currentSettings.security?.allowedLoginIPs) {
        securityChanges.push('Allowed IP addresses')
      }

      if (updates.corporateProfile?.email !== currentSettings.corporateProfile?.email) {
        securityChanges.push('Email address')
      }

      // Log security changes
      if (securityChanges.length > 0) {
        await this.logSecurityEvent(
          context.requestingUserId,
          updates.organizationId!,
          {
            eventType: 'permission_change',
            timestamp: new Date().toISOString(),
            ipAddress: context.ipAddress || '0.0.0.0',
            userAgent: context.userAgent || 'Unknown',
            location: undefined,
            riskScore: securityChanges.length * 20, // Simple risk calculation
            details: {
              changes: securityChanges,
              targetUserId: updates.userId
            }
          }
        )
      }

      return undefined
    })
  }

  /**
   * Validate compliance settings
   */
  private async validateComplianceSettings(
    newSettings: any,
    currentSettings: any
  ): Promise<Result<void>> {
    return wrapAsync(async () => {
      // Validate retention period changes
      if (newSettings.retentionPeriodMonths < currentSettings.retentionPeriodMonths) {
        // Reducing retention period requires additional validation
        if (newSettings.retentionPeriodMonths < 12) {
          throw RepositoryError.businessRule(
            'MINIMUM_RETENTION_PERIOD',
            'Retention period cannot be less than 12 months for compliance'
          )
        }
      }

      // Validate regulatory framework changes
      if (newSettings.regulatoryFrameworks?.includes('SOX') && 
          !currentSettings.regulatoryFrameworks?.includes('SOX')) {
        // Adding SOX compliance requires enhanced controls
        if (!newSettings.encryptionRequired) {
          throw RepositoryError.businessRule(
            'SOX_ENCRYPTION_REQUIRED',
            'Encryption is required when SOX compliance is enabled'
          )
        }
      }

      return undefined
    })
  }

  /**
   * Create change notification for settings updates
   */
  private createChangeNotification(
    current: UserSettings,
    updated: UserSettings
  ): SettingsChangeNotification {
    const changes = []
    let requiresAction = false
    let changeType: 'security' | 'privacy' | 'notifications' | 'compliance' | 'general' = 'general'

    // Check security changes
    if (JSON.stringify(current.security) !== JSON.stringify(updated.security)) {
      changes.push({
        field: 'security',
        oldValue: current.security,
        newValue: updated.security,
        impact: 'high' as const
      })
      changeType = 'security'
      requiresAction = true
    }

    // Check privacy changes
    if (JSON.stringify(current.privacy) !== JSON.stringify(updated.privacy)) {
      changes.push({
        field: 'privacy',
        oldValue: current.privacy,
        newValue: updated.privacy,
        impact: 'medium' as const
      })
      if (changeType === 'general') changeType = 'privacy'
    }

    // Check notification changes
    if (JSON.stringify(current.notifications) !== JSON.stringify(updated.notifications)) {
      changes.push({
        field: 'notifications',
        oldValue: current.notifications,
        newValue: updated.notifications,
        impact: 'low' as const
      })
      if (changeType === 'general') changeType = 'notifications'
    }

    // Check compliance changes
    if (JSON.stringify(current.compliance) !== JSON.stringify(updated.compliance)) {
      changes.push({
        field: 'compliance',
        oldValue: current.compliance,
        newValue: updated.compliance,
        impact: 'high' as const
      })
      changeType = 'compliance'
      requiresAction = true
    }

    return {
      changeType,
      changes,
      requiresAction,
      actionUrl: requiresAction ? '/dashboard/settings' : undefined
    }
  }

  /**
   * Calculate organization settings changes
   */
  private calculateOrganizationChanges(
    current: OrganizationSettings,
    updated: OrganizationSettings
  ): Record<string, { from: any; to: any }> {
    const changes: Record<string, { from: any; to: any }> = {}

    if (JSON.stringify(current.globalPolicies) !== JSON.stringify(updated.globalPolicies)) {
      changes.globalPolicies = { from: current.globalPolicies, to: updated.globalPolicies }
    }

    if (JSON.stringify(current.complianceSettings) !== JSON.stringify(updated.complianceSettings)) {
      changes.complianceSettings = { from: current.complianceSettings, to: updated.complianceSettings }
    }

    if (JSON.stringify(current.backupPolicies) !== JSON.stringify(updated.backupPolicies)) {
      changes.backupPolicies = { from: current.backupPolicies, to: updated.backupPolicies }
    }

    return changes
  }

  /**
   * Publish settings event to event bus
   */
  private async publishSettingsEvent(event: SettingsEvent): Promise<void> {
    if (this.eventBus) {
      try {
        await this.eventBus.publish(event)
      } catch (error) {
        console.warn('Failed to publish settings event:', error)
        // Event publishing failure should not fail the main operation
      }
    }
  }
}

// ==== Service Factory for Dependency Injection ====

export class SettingsServiceFactory {
  static create(
    supabase: SupabaseClient<Database>,
    dependencies?: {
      eventBus?: SettingsEventBus
      notificationService?: NotificationService
      auditService?: AuditService
    }
  ): SettingsService {
    const settingsRepository = new SettingsRepository(supabase)
    
    return new SettingsService(supabase, {
      settingsRepository,
      ...dependencies
    })
  }
}

// ==== Export Service Interface for External Integration ====

export interface ISettingsService {
  getUserSettings(userId: UserId, organizationId: OrganizationId): Promise<Result<UserSettings>>
  updateUserSettings(userId: UserId, updates: UserSettingsUpdate, context: any): Promise<Result<UserSettings>>
  getOrganizationSettings(organizationId: OrganizationId, requestingUserId: UserId): Promise<Result<OrganizationSettings>>
  updateOrganizationSettings(organizationId: OrganizationId, updates: OrganizationSettingsUpdate, requestingUserId: UserId): Promise<Result<OrganizationSettings>>
  updateNotificationPreferences(userId: UserId, organizationId: OrganizationId, preferences: NotificationPreference[], requestingUserId: UserId): Promise<Result<UserSettings>>
  createExportConfiguration(userId: UserId, organizationId: OrganizationId, configuration: ExportConfiguration, requestingUserId: UserId): Promise<Result<string>>
  logSecurityEvent(userId: UserId, organizationId: OrganizationId, event: SecurityEvent): Promise<Result<void>>
}