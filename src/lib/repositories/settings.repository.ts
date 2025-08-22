/**
 * Settings Repository
 * Comprehensive repository for user and organization settings management
 * Follows CLAUDE.md architecture with BaseRepository extension, Result pattern, and branded types
 */

import { BaseRepository } from './base.repository'
import { 
  Result, 
  success, 
  failure, 
  RepositoryError,
  ErrorCode,
  wrapAsync 
} from './result'
import {
  UserId,
  OrganizationId,
  createUserId,
  createOrganizationId
} from '../../types/branded'
import {
  UserSettings,
  OrganizationSettings,
  UserSettingsUpdate,
  OrganizationSettingsUpdate,
  UserSettingsSchema,
  OrganizationSettingsSchema,
  UserSettingsUpdateSchema,
  OrganizationSettingsUpdateSchema,
  AccountType,
  NotificationCategory,
  ExportCategory,
  EncryptionMethod
} from '../../types/settings-validation'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database'
import type { QueryOptions, PaginatedResult } from './types'

// ==== Settings Repository Interfaces ====

export interface SettingsFilter {
  userId?: UserId
  organizationId?: OrganizationId
  accountType?: AccountType
  lastUpdatedAfter?: string
  hasNotificationSettings?: boolean
  hasExportSettings?: boolean
  isActive?: boolean
}

export interface SettingsQueryOptions extends QueryOptions {
  includeDefaults?: boolean
  includeSensitive?: boolean
  categoryFilter?: NotificationCategory[]
}

export interface SettingsAuditEntry {
  settingType: 'user' | 'organization'
  settingId: string
  action: 'create' | 'update' | 'delete' | 'reset'
  changes: Record<string, { from: any; to: any }>
  userId: UserId
  timestamp: string
  reason?: string
}

// ==== User Settings Repository ====

export class UserSettingsRepository extends BaseRepository {
  protected getEntityName(): string {
    return 'User Settings'
  }

  protected getSearchFields(): string[] {
    return ['display_name', 'email', 'title', 'department']
  }

  protected getTableName(): string {
    return 'user_settings'
  }

  /**
   * Get user settings by user ID
   */
  async findByUserId(userId: UserId): Promise<Result<UserSettings | null>> {
    return wrapAsync(async () => {
      const { data, error } = await this.supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null // Not found, which is valid
        }
        throw RepositoryError.fromSupabaseError(error, 'find user settings')
      }

      if (!data) {
        return null
      }

      return this.validateAndTransformUserSettings(data)
    })
  }

  /**
   * Get user settings by organization
   */
  async findByOrganization(
    organizationId: OrganizationId,
    options: SettingsQueryOptions = {}
  ): Promise<Result<PaginatedResult<UserSettings>>> {
    return wrapAsync(async () => {
      let query = this.supabase
        .from('user_settings')
        .select('*, profiles!inner(organization_id)', { count: 'exact' })
        .eq('profiles.organization_id', organizationId)

      // Apply filters
      if (options.filters) {
        if (options.filters.accountType) {
          query = query.eq('account_type', options.filters.accountType)
        }
        if (options.filters.isActive !== undefined) {
          query = query.eq('is_active', options.filters.isActive)
        }
        if (options.filters.lastUpdatedAfter) {
          query = query.gte('last_updated_at', options.filters.lastUpdatedAfter)
        }
      }

      // Apply query options
      query = this.applyQueryOptions(query, options)

      const { data, error, count } = await query

      if (error) {
        throw RepositoryError.fromSupabaseError(error, 'find user settings by organization')
      }

      const settings = await Promise.all(
        data.map(item => this.validateAndTransformUserSettings(item))
      )

      return this.createPaginatedResult(settings, count, options).data!
    })
  }

  /**
   * Create user settings
   */
  async create(settings: Omit<UserSettings, 'version' | 'lastUpdatedAt'>): Promise<Result<UserSettings>> {
    return wrapAsync(async () => {
      // Validate input
      const validationResult = UserSettingsSchema.safeParse({
        ...settings,
        version: 1,
        lastUpdatedAt: new Date().toISOString()
      })

      if (!validationResult.success) {
        throw RepositoryError.validation(
          'Invalid user settings data',
          { errors: validationResult.error.issues }
        )
      }

      const currentUserResult = await this.getCurrentUserId()
      if (!currentUserResult.success) {
        throw currentUserResult.error
      }

      const transformedData = this.transformUserSettingsForStorage(validationResult.data)

      const { data, error } = await this.supabase
        .from('user_settings')
        .insert([transformedData])
        .select()
        .single()

      if (error) {
        throw RepositoryError.fromSupabaseError(error, 'create user settings')
      }

      // Log audit activity
      await this.logActivity({
        user_id: currentUserResult.data,
        organization_id: settings.organizationId,
        event_type: 'settings_management',
        event_category: 'create',
        action: 'create_user_settings',
        resource_type: 'user_settings',
        resource_id: settings.userId,
        event_description: `Created user settings for ${settings.userId}`,
        outcome: 'success',
        severity: 'low',
        details: { settingsType: 'user' }
      })

      return this.validateAndTransformUserSettings(data)
    })
  }

  /**
   * Update user settings with optimistic locking
   */
  async update(
    userId: UserId,
    updates: UserSettingsUpdate,
    expectedVersion?: number
  ): Promise<Result<UserSettings>> {
    return wrapAsync(async () => {
      // Validate update data
      const validationResult = UserSettingsUpdateSchema.safeParse({
        ...updates,
        userId,
        lastUpdatedAt: new Date().toISOString(),
        lastUpdatedBy: updates.lastUpdatedBy || userId
      })

      if (!validationResult.success) {
        throw RepositoryError.validation(
          'Invalid user settings update data',
          { errors: validationResult.error.issues }
        )
      }

      const currentUserResult = await this.getCurrentUserId()
      if (!currentUserResult.success) {
        throw currentUserResult.error
      }

      // Get current settings for optimistic locking and audit trail
      const currentResult = await this.findByUserId(userId)
      if (!currentResult.success) {
        throw currentResult.error
      }

      if (!currentResult.data) {
        throw RepositoryError.notFound('User settings', userId)
      }

      const currentSettings = currentResult.data

      // Check version for optimistic locking
      if (expectedVersion !== undefined && currentSettings.version !== expectedVersion) {
        throw RepositoryError.conflict(
          'User settings',
          `Version mismatch. Expected ${expectedVersion}, current ${currentSettings.version}`,
          { currentVersion: currentSettings.version, expectedVersion }
        )
      }

      const newVersion = currentSettings.version + 1
      const transformedUpdates = this.transformUserSettingsForStorage({
        ...validationResult.data,
        version: newVersion
      })

      let query = this.supabase
        .from('user_settings')
        .update(transformedUpdates)
        .eq('user_id', userId)

      if (expectedVersion !== undefined) {
        query = query.eq('version', expectedVersion)
      }

      const { data, error } = await query.select().single()

      if (error) {
        if (error.code === 'PGRST116') {
          throw RepositoryError.conflict(
            'User settings',
            'Settings were modified by another user',
            { expectedVersion, operation: 'update' }
          )
        }
        throw RepositoryError.fromSupabaseError(error, 'update user settings')
      }

      // Create audit trail
      const changes = this.calculateSettingsChanges(currentSettings, validationResult.data)
      await this.createAuditEntry({
        settingType: 'user',
        settingId: userId,
        action: 'update',
        changes,
        userId: currentUserResult.data,
        timestamp: new Date().toISOString(),
        reason: 'User settings update'
      })

      // Log activity
      await this.logActivity({
        user_id: currentUserResult.data,
        organization_id: currentSettings.organizationId,
        event_type: 'settings_management',
        event_category: 'update',
        action: 'update_user_settings',
        resource_type: 'user_settings',
        resource_id: userId,
        event_description: `Updated user settings for ${userId}`,
        outcome: 'success',
        severity: 'low',
        details: { 
          settingsType: 'user',
          changedFields: Object.keys(changes),
          version: newVersion
        }
      })

      return this.validateAndTransformUserSettings(data)
    })
  }

  /**
   * Delete user settings
   */
  async delete(userId: UserId): Promise<Result<void>> {
    return wrapAsync(async () => {
      const currentUserResult = await this.getCurrentUserId()
      if (!currentUserResult.success) {
        throw currentUserResult.error
      }

      // Get current settings for audit trail
      const currentResult = await this.findByUserId(userId)
      if (!currentResult.success) {
        throw currentResult.error
      }

      if (!currentResult.data) {
        throw RepositoryError.notFound('User settings', userId)
      }

      const { error } = await this.supabase
        .from('user_settings')
        .delete()
        .eq('user_id', userId)

      if (error) {
        throw RepositoryError.fromSupabaseError(error, 'delete user settings')
      }

      // Create audit trail
      await this.createAuditEntry({
        settingType: 'user',
        settingId: userId,
        action: 'delete',
        changes: { deleted: { from: currentResult.data, to: null } },
        userId: currentUserResult.data,
        timestamp: new Date().toISOString(),
        reason: 'User settings deletion'
      })

      // Log activity
      await this.logActivity({
        user_id: currentUserResult.data,
        organization_id: currentResult.data.organizationId,
        event_type: 'settings_management',
        event_category: 'delete',
        action: 'delete_user_settings',
        resource_type: 'user_settings',
        resource_id: userId,
        event_description: `Deleted user settings for ${userId}`,
        outcome: 'success',
        severity: 'medium',
        details: { settingsType: 'user' }
      })

      return undefined
    })
  }

  /**
   * Reset user settings to organization defaults
   */
  async resetToDefaults(userId: UserId, organizationId: OrganizationId): Promise<Result<UserSettings>> {
    return wrapAsync(async () => {
      // Get organization defaults
      const orgRepo = new OrganizationSettingsRepository(this.supabase)
      const orgResult = await orgRepo.findByOrganizationId(organizationId)
      
      if (!orgResult.success || !orgResult.data) {
        throw RepositoryError.notFound('Organization settings', organizationId)
      }

      const defaultSettings = orgResult.data.defaultUserSettings

      // Apply defaults while preserving user-specific fields
      const resetSettings: UserSettingsUpdate = {
        userId,
        organizationId,
        ...defaultSettings,
        // Preserve user identity fields
        corporateProfile: {
          ...defaultSettings.corporateProfile,
          firstName: defaultSettings.corporateProfile?.firstName || '',
          lastName: defaultSettings.corporateProfile?.lastName || '',
          email: defaultSettings.corporateProfile?.email || '' as any
        },
        lastUpdatedBy: userId,
        version: undefined // Will be handled by update method
      }

      return this.update(userId, resetSettings)
    })
  }

  /**
   * Bulk update settings for multiple users
   */
  async bulkUpdate(
    updates: Array<{ userId: UserId; settings: UserSettingsUpdate }>
  ): Promise<Result<Array<{ userId: UserId; success: boolean; data?: UserSettings; error?: string }>>> {
    return wrapAsync(async () => {
      const results = await Promise.allSettled(
        updates.map(async ({ userId, settings }) => {
          const result = await this.update(userId, settings)
          return {
            userId,
            success: result.success,
            data: result.success ? result.data : undefined,
            error: result.success ? undefined : result.error.message
          }
        })
      )

      return results.map((result, index) => 
        result.status === 'fulfilled' 
          ? result.value 
          : {
              userId: updates[index].userId,
              success: false,
              error: result.reason?.message || 'Unknown error'
            }
      )
    })
  }

  // ==== Private Helper Methods ====

  private validateAndTransformUserSettings(data: any): UserSettings {
    const validationResult = UserSettingsSchema.safeParse(this.transformUserSettingsFromStorage(data))
    if (!validationResult.success) {
      throw RepositoryError.validation(
        'Invalid user settings data from database',
        { errors: validationResult.error.issues, data }
      )
    }
    return validationResult.data
  }

  private transformUserSettingsForStorage(settings: UserSettings): any {
    return {
      user_id: settings.userId,
      organization_id: settings.organizationId,
      account_overview: settings.accountOverview ? JSON.stringify(settings.accountOverview) : null,
      corporate_profile: settings.corporateProfile ? JSON.stringify(settings.corporateProfile) : null,
      security: settings.security ? JSON.stringify(settings.security) : null,
      delegation: settings.delegation ? JSON.stringify(settings.delegation) : null,
      compliance: settings.compliance ? JSON.stringify(settings.compliance) : null,
      resource_quotas: settings.resourceQuotas ? JSON.stringify(settings.resourceQuotas) : null,
      privacy: settings.privacy ? JSON.stringify(settings.privacy) : null,
      notifications: settings.notifications ? JSON.stringify(settings.notifications) : null,
      exports: settings.exports ? JSON.stringify(settings.exports) : null,
      advanced_security: settings.advancedSecurity ? JSON.stringify(settings.advancedSecurity) : null,
      version: settings.version,
      last_updated_at: settings.lastUpdatedAt,
      last_updated_by: settings.lastUpdatedBy
    }
  }

  private transformUserSettingsFromStorage(data: any): any {
    return {
      userId: data.user_id,
      organizationId: data.organization_id,
      accountOverview: data.account_overview ? JSON.parse(data.account_overview) : undefined,
      corporateProfile: data.corporate_profile ? JSON.parse(data.corporate_profile) : undefined,
      security: data.security ? JSON.parse(data.security) : undefined,
      delegation: data.delegation ? JSON.parse(data.delegation) : undefined,
      compliance: data.compliance ? JSON.parse(data.compliance) : undefined,
      resourceQuotas: data.resource_quotas ? JSON.parse(data.resource_quotas) : undefined,
      privacy: data.privacy ? JSON.parse(data.privacy) : undefined,
      notifications: data.notifications ? JSON.parse(data.notifications) : undefined,
      exports: data.exports ? JSON.parse(data.exports) : undefined,
      advancedSecurity: data.advanced_security ? JSON.parse(data.advanced_security) : undefined,
      version: data.version,
      lastUpdatedAt: data.last_updated_at,
      lastUpdatedBy: data.last_updated_by
    }
  }

  private calculateSettingsChanges(current: UserSettings, updated: Partial<UserSettings>): Record<string, { from: any; to: any }> {
    const changes: Record<string, { from: any; to: any }> = {}

    // Compare each top-level setting section
    const sections = [
      'accountOverview', 'corporateProfile', 'security', 'delegation',
      'compliance', 'resourceQuotas', 'privacy', 'notifications', 
      'exports', 'advancedSecurity'
    ] as const

    for (const section of sections) {
      if (updated[section] !== undefined) {
        const currentValue = current[section]
        const updatedValue = updated[section]
        
        if (JSON.stringify(currentValue) !== JSON.stringify(updatedValue)) {
          changes[section] = {
            from: currentValue,
            to: updatedValue
          }
        }
      }
    }

    return changes
  }

  private async createAuditEntry(entry: SettingsAuditEntry): Promise<void> {
    try {
      await this.supabase
        .from('settings_audit_log')
        .insert([{
          setting_type: entry.settingType,
          setting_id: entry.settingId,
          action: entry.action,
          changes: JSON.stringify(entry.changes),
          user_id: entry.userId,
          timestamp: entry.timestamp,
          reason: entry.reason
        }])
    } catch (error) {
      // Audit logging should not fail the main operation
      console.warn('Failed to create settings audit entry:', error)
    }
  }
}

// ==== Organization Settings Repository ====

export class OrganizationSettingsRepository extends BaseRepository {
  protected getEntityName(): string {
    return 'Organization Settings'
  }

  protected getSearchFields(): string[] {
    return []
  }

  protected getTableName(): string {
    return 'organization_settings'
  }

  /**
   * Get organization settings by organization ID
   */
  async findByOrganizationId(organizationId: OrganizationId): Promise<Result<OrganizationSettings | null>> {
    return wrapAsync(async () => {
      const { data, error } = await this.supabase
        .from('organization_settings')
        .select('*')
        .eq('organization_id', organizationId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null // Not found, which is valid
        }
        throw RepositoryError.fromSupabaseError(error, 'find organization settings')
      }

      if (!data) {
        return null
      }

      return this.validateAndTransformOrganizationSettings(data)
    })
  }

  /**
   * Create organization settings
   */
  async create(settings: Omit<OrganizationSettings, 'version' | 'lastUpdatedAt'>): Promise<Result<OrganizationSettings>> {
    return wrapAsync(async () => {
      // Validate input
      const validationResult = OrganizationSettingsSchema.safeParse({
        ...settings,
        version: 1,
        lastUpdatedAt: new Date().toISOString()
      })

      if (!validationResult.success) {
        throw RepositoryError.validation(
          'Invalid organization settings data',
          { errors: validationResult.error.issues }
        )
      }

      const currentUserResult = await this.getCurrentUserId()
      if (!currentUserResult.success) {
        throw currentUserResult.error
      }

      const transformedData = this.transformOrganizationSettingsForStorage(validationResult.data)

      const { data, error } = await this.supabase
        .from('organization_settings')
        .insert([transformedData])
        .select()
        .single()

      if (error) {
        throw RepositoryError.fromSupabaseError(error, 'create organization settings')
      }

      // Log audit activity
      await this.logActivity({
        user_id: currentUserResult.data,
        organization_id: settings.organizationId,
        event_type: 'settings_management',
        event_category: 'create',
        action: 'create_organization_settings',
        resource_type: 'organization_settings',
        resource_id: settings.organizationId,
        event_description: `Created organization settings for ${settings.organizationId}`,
        outcome: 'success',
        severity: 'medium',
        details: { settingsType: 'organization' }
      })

      return this.validateAndTransformOrganizationSettings(data)
    })
  }

  /**
   * Update organization settings with optimistic locking
   */
  async update(
    organizationId: OrganizationId,
    updates: OrganizationSettingsUpdate,
    expectedVersion?: number
  ): Promise<Result<OrganizationSettings>> {
    return wrapAsync(async () => {
      // Validate update data
      const validationResult = OrganizationSettingsUpdateSchema.safeParse({
        ...updates,
        organizationId,
        lastUpdatedAt: new Date().toISOString()
      })

      if (!validationResult.success) {
        throw RepositoryError.validation(
          'Invalid organization settings update data',
          { errors: validationResult.error.issues }
        )
      }

      const currentUserResult = await this.getCurrentUserId()
      if (!currentUserResult.success) {
        throw currentUserResult.error
      }

      // Get current settings for optimistic locking and audit trail
      const currentResult = await this.findByOrganizationId(organizationId)
      if (!currentResult.success) {
        throw currentResult.error
      }

      if (!currentResult.data) {
        throw RepositoryError.notFound('Organization settings', organizationId)
      }

      const currentSettings = currentResult.data

      // Check version for optimistic locking
      if (expectedVersion !== undefined && currentSettings.version !== expectedVersion) {
        throw RepositoryError.conflict(
          'Organization settings',
          `Version mismatch. Expected ${expectedVersion}, current ${currentSettings.version}`,
          { currentVersion: currentSettings.version, expectedVersion }
        )
      }

      const newVersion = currentSettings.version + 1
      const transformedUpdates = this.transformOrganizationSettingsForStorage({
        ...validationResult.data,
        version: newVersion
      })

      let query = this.supabase
        .from('organization_settings')
        .update(transformedUpdates)
        .eq('organization_id', organizationId)

      if (expectedVersion !== undefined) {
        query = query.eq('version', expectedVersion)
      }

      const { data, error } = await query.select().single()

      if (error) {
        if (error.code === 'PGRST116') {
          throw RepositoryError.conflict(
            'Organization settings',
            'Settings were modified by another user',
            { expectedVersion, operation: 'update' }
          )
        }
        throw RepositoryError.fromSupabaseError(error, 'update organization settings')
      }

      // Create audit trail
      const changes = this.calculateOrganizationSettingsChanges(currentSettings, validationResult.data)
      await this.createAuditEntry({
        settingType: 'organization',
        settingId: organizationId,
        action: 'update',
        changes,
        userId: currentUserResult.data,
        timestamp: new Date().toISOString(),
        reason: 'Organization settings update'
      })

      // Log activity
      await this.logActivity({
        user_id: currentUserResult.data,
        organization_id: organizationId,
        event_type: 'settings_management',
        event_category: 'update',
        action: 'update_organization_settings',
        resource_type: 'organization_settings',
        resource_id: organizationId,
        event_description: `Updated organization settings for ${organizationId}`,
        outcome: 'success',
        severity: 'medium',
        details: { 
          settingsType: 'organization',
          changedFields: Object.keys(changes),
          version: newVersion
        }
      })

      return this.validateAndTransformOrganizationSettings(data)
    })
  }

  // ==== Private Helper Methods ====

  private validateAndTransformOrganizationSettings(data: any): OrganizationSettings {
    const validationResult = OrganizationSettingsSchema.safeParse(this.transformOrganizationSettingsFromStorage(data))
    if (!validationResult.success) {
      throw RepositoryError.validation(
        'Invalid organization settings data from database',
        { errors: validationResult.error.issues, data }
      )
    }
    return validationResult.data
  }

  private transformOrganizationSettingsForStorage(settings: OrganizationSettings): any {
    return {
      organization_id: settings.organizationId,
      default_user_settings: settings.defaultUserSettings ? JSON.stringify(settings.defaultUserSettings) : null,
      global_policies: settings.globalPolicies ? JSON.stringify(settings.globalPolicies) : null,
      compliance_settings: settings.complianceSettings ? JSON.stringify(settings.complianceSettings) : null,
      backup_policies: settings.backupPolicies ? JSON.stringify(settings.backupPolicies) : null,
      version: settings.version,
      last_updated_at: settings.lastUpdatedAt,
      last_updated_by: settings.lastUpdatedBy
    }
  }

  private transformOrganizationSettingsFromStorage(data: any): any {
    return {
      organizationId: data.organization_id,
      defaultUserSettings: data.default_user_settings ? JSON.parse(data.default_user_settings) : undefined,
      globalPolicies: data.global_policies ? JSON.parse(data.global_policies) : undefined,
      complianceSettings: data.compliance_settings ? JSON.parse(data.compliance_settings) : undefined,
      backupPolicies: data.backup_policies ? JSON.parse(data.backup_policies) : undefined,
      version: data.version,
      lastUpdatedAt: data.last_updated_at,
      lastUpdatedBy: data.last_updated_by
    }
  }

  private calculateOrganizationSettingsChanges(current: OrganizationSettings, updated: Partial<OrganizationSettings>): Record<string, { from: any; to: any }> {
    const changes: Record<string, { from: any; to: any }> = {}

    // Compare each top-level setting section
    const sections = [
      'defaultUserSettings', 'globalPolicies', 'complianceSettings', 'backupPolicies'
    ] as const

    for (const section of sections) {
      if (updated[section] !== undefined) {
        const currentValue = current[section]
        const updatedValue = updated[section]
        
        if (JSON.stringify(currentValue) !== JSON.stringify(updatedValue)) {
          changes[section] = {
            from: currentValue,
            to: updatedValue
          }
        }
      }
    }

    return changes
  }

  private async createAuditEntry(entry: SettingsAuditEntry): Promise<void> {
    try {
      await this.supabase
        .from('settings_audit_log')
        .insert([{
          setting_type: entry.settingType,
          setting_id: entry.settingId,
          action: entry.action,
          changes: JSON.stringify(entry.changes),
          user_id: entry.userId,
          timestamp: entry.timestamp,
          reason: entry.reason
        }])
    } catch (error) {
      // Audit logging should not fail the main operation
      console.warn('Failed to create settings audit entry:', error)
    }
  }
}

// ==== Combined Settings Repository ====

export class SettingsRepository {
  private userSettings: UserSettingsRepository
  private organizationSettings: OrganizationSettingsRepository

  constructor(supabase: SupabaseClient<Database>) {
    this.userSettings = new UserSettingsRepository(supabase)
    this.organizationSettings = new OrganizationSettingsRepository(supabase)
  }

  get user() {
    return this.userSettings
  }

  get organization() {
    return this.organizationSettings
  }

  /**
   * Get complete settings for a user (merging user and organization defaults)
   */
  async getCompleteUserSettings(userId: UserId, organizationId: OrganizationId): Promise<Result<UserSettings>> {
    return wrapAsync(async () => {
      // Get user settings
      const userResult = await this.userSettings.findByUserId(userId)
      if (!userResult.success) {
        throw userResult.error
      }

      // If user settings exist, return them
      if (userResult.data) {
        return userResult.data
      }

      // Get organization defaults and create user settings
      const orgResult = await this.organizationSettings.findByOrganizationId(organizationId)
      if (!orgResult.success || !orgResult.data) {
        throw RepositoryError.notFound('Organization settings', organizationId)
      }

      const defaultSettings: Omit<UserSettings, 'version' | 'lastUpdatedAt'> = {
        userId,
        organizationId,
        ...orgResult.data.defaultUserSettings,
        lastUpdatedBy: userId
      }

      // Create user settings with defaults
      const createResult = await this.userSettings.create(defaultSettings)
      if (!createResult.success) {
        throw createResult.error
      }

      return createResult.data
    })
  }

  /**
   * Initialize settings for a new organization
   */
  async initializeOrganizationSettings(
    organizationId: OrganizationId,
    createdBy: UserId,
    initialSettings?: Partial<OrganizationSettings>
  ): Promise<Result<OrganizationSettings>> {
    const defaultSettings: Omit<OrganizationSettings, 'version' | 'lastUpdatedAt'> = {
      organizationId,
      defaultUserSettings: {
        userId: '' as UserId, // Will be filled per user
        organizationId,
        privacy: {
          dataProcessingConsent: true,
          analyticsConsent: true,
          marketingConsent: false,
          thirdPartyIntegrations: true,
          dataRetentionOptOut: false,
          rightToPortability: true,
          rightToErasure: true,
          profileVisibility: 'organization',
          activityVisibility: 'board_members',
          contactable: true,
          directoryListing: true
        },
        notifications: {
          general: {
            userId: '' as UserId,
            organizationId,
            globalEnabled: true,
            categories: [],
            maxNotificationsPerHour: 25,
            bundleSimilar: true,
            smartBatching: true
          }
        },
        lastUpdatedBy: createdBy
      },
      globalPolicies: {
        requireMFA: false,
        allowDelegation: true,
        dataRetentionDays: 2555,
        allowPersonalExports: true,
        requireApprovalForExports: false
      },
      complianceSettings: {
        regulatoryFrameworks: ['SOX'],
        auditTrailLevel: 'detailed',
        retentionPeriodMonths: 84,
        automaticReporting: true,
        complianceReports: [],
        dataClassification: 'confidential',
        encryptionRequired: true
      },
      backupPolicies: [],
      lastUpdatedBy: createdBy,
      ...initialSettings
    }

    return this.organizationSettings.create(defaultSettings)
  }
}