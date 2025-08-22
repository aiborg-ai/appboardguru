/**
 * Settings Hook
 * Comprehensive React hook for settings management with validation and error handling
 * Follows CLAUDE.md patterns with Result pattern integration and type safety
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { SettingsService, SettingsServiceFactory, type ISettingsService } from '../lib/services/settings.service'
import { 
  Result, 
  isSuccess, 
  isFailure,
  RepositoryError
} from '../lib/repositories/result'
import {
  UserId,
  OrganizationId,
  createUserId,
  createOrganizationId
} from '../types/branded'
import {
  UserSettings,
  OrganizationSettings,
  UserSettingsUpdate,
  OrganizationSettingsUpdate,
  NotificationPreference,
  ExportConfiguration,
  ScheduledExport,
  SecurityEvent,
  AccountType
} from '../types/settings-validation'
import { useSupabase } from './useSupabase' // Assuming this exists
import { useAuth } from './useAuth' // Assuming this exists
import { useOrganization } from './useOrganization' // Assuming this exists

// ==== Hook State Types ====

export interface SettingsState {
  userSettings: UserSettings | null
  organizationSettings: OrganizationSettings | null
  loading: boolean
  error: string | null
  isDirty: boolean
  lastUpdateTimestamp: string | null
}

export interface SettingsActions {
  // User Settings
  loadUserSettings: () => Promise<void>
  updateUserSettings: (updates: UserSettingsUpdate, reason?: string) => Promise<Result<UserSettings>>
  resetUserSettings: () => Promise<Result<UserSettings>>
  
  // Organization Settings (admin only)
  loadOrganizationSettings: () => Promise<void>
  updateOrganizationSettings: (updates: OrganizationSettingsUpdate) => Promise<Result<OrganizationSettings>>
  
  // Notification Management
  updateNotificationPreferences: (preferences: NotificationPreference[]) => Promise<Result<UserSettings>>
  toggleNotificationCategory: (category: string, enabled: boolean) => Promise<Result<UserSettings>>
  
  // Export Management
  createExport: (configuration: ExportConfiguration) => Promise<Result<string>>
  createScheduledExport: (exportConfig: Omit<ScheduledExport, 'id'>) => Promise<Result<ScheduledExport>>
  
  // Security
  logSecurityEvent: (event: Omit<SecurityEvent, 'timestamp'>) => Promise<Result<void>>
  
  // State Management
  clearError: () => void
  markClean: () => void
  refresh: () => Promise<void>
}

export interface SettingsValidation {
  errors: Record<string, string[]>
  warnings: Record<string, string[]>
  isValid: boolean
  canSave: boolean
}

export interface SettingsPermissions {
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

export interface UseSettingsOptions {
  autoLoad?: boolean
  enableValidation?: boolean
  enablePermissionChecks?: boolean
  onSettingsChange?: (settings: UserSettings | OrganizationSettings) => void
  onError?: (error: RepositoryError) => void
}

export interface UseSettingsReturn {
  // State
  state: SettingsState
  actions: SettingsActions
  validation: SettingsValidation
  permissions: SettingsPermissions
  
  // Computed
  hasUnsavedChanges: boolean
  isAdminUser: boolean
  accountType: AccountType | null
}

// ==== Main Hook Implementation ====

export function useSettings(options: UseSettingsOptions = {}): UseSettingsReturn {
  const {
    autoLoad = true,
    enableValidation = true,
    enablePermissionChecks = true,
    onSettingsChange,
    onError
  } = options

  // Dependencies
  const supabase = useSupabase()
  const { user, loading: authLoading } = useAuth()
  const { currentOrganization, loading: orgLoading } = useOrganization()

  // Service instance
  const settingsService = useMemo(() => {
    return SettingsServiceFactory.create(supabase)
  }, [supabase])

  // State
  const [state, setState] = useState<SettingsState>({
    userSettings: null,
    organizationSettings: null,
    loading: false,
    error: null,
    isDirty: false,
    lastUpdateTimestamp: null
  })

  const [validation, setValidation] = useState<SettingsValidation>({
    errors: {},
    warnings: {},
    isValid: true,
    canSave: true
  })

  const [permissions, setPermissions] = useState<SettingsPermissions>({
    canViewSettings: false,
    canEditProfile: false,
    canEditSecurity: false,
    canEditNotifications: false,
    canEditCompliance: false,
    canEditOrganizationSettings: false,
    canExportData: false,
    canCreateScheduledExports: false,
    restrictions: []
  })

  // Computed values
  const hasUnsavedChanges = state.isDirty
  const isAdminUser = state.userSettings?.accountOverview?.accountType === 'Administrator' || 
                     state.userSettings?.accountOverview?.accountType === 'Superuser'
  const accountType = state.userSettings?.accountOverview?.accountType || null

  // Helper to handle async operations
  const handleAsyncOperation = useCallback(async <T>(
    operation: () => Promise<Result<T>>,
    successCallback?: (data: T) => void,
    errorContext?: string
  ): Promise<Result<T>> => {
    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const result = await operation()

      if (isSuccess(result)) {
        if (successCallback) {
          successCallback(result.data)
        }
        setState(prev => ({ 
          ...prev, 
          loading: false, 
          lastUpdateTimestamp: new Date().toISOString() 
        }))
      } else {
        const errorMessage = result.error instanceof RepositoryError 
          ? result.error.message 
          : String(result.error)
        
        setState(prev => ({ 
          ...prev, 
          loading: false, 
          error: errorContext ? `${errorContext}: ${errorMessage}` : errorMessage 
        }))

        if (onError && result.error instanceof RepositoryError) {
          onError(result.error)
        }
      }

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: errorContext ? `${errorContext}: ${errorMessage}` : errorMessage 
      }))
      
      const repositoryError = RepositoryError.internal('Settings operation failed', error)
      if (onError) {
        onError(repositoryError)
      }

      return { success: false, error: repositoryError } as Result<T>
    }
  }, [onError])

  // User Settings Actions
  const loadUserSettings = useCallback(async () => {
    if (!user?.id || !currentOrganization?.id) return

    const userIdResult = createUserId(user.id)
    const orgIdResult = createOrganizationId(currentOrganization.id)

    if (!userIdResult.success || !orgIdResult.success) {
      setState(prev => ({ ...prev, error: 'Invalid user or organization ID' }))
      return
    }

    await handleAsyncOperation(
      () => settingsService.getUserSettings(userIdResult.data!, orgIdResult.data!),
      (settings) => {
        setState(prev => ({ ...prev, userSettings: settings }))
        if (onSettingsChange) {
          onSettingsChange(settings)
        }
      },
      'Failed to load user settings'
    )
  }, [user?.id, currentOrganization?.id, settingsService, handleAsyncOperation, onSettingsChange])

  const updateUserSettings = useCallback(async (
    updates: UserSettingsUpdate, 
    reason?: string
  ): Promise<Result<UserSettings>> => {
    if (!user?.id || !currentOrganization?.id) {
      const error = RepositoryError.unauthorized('User or organization not available')
      return { success: false, error }
    }

    const userIdResult = createUserId(user.id)
    const orgIdResult = createOrganizationId(currentOrganization.id)

    if (!userIdResult.success || !orgIdResult.success) {
      const error = RepositoryError.validation('Invalid user or organization ID')
      return { success: false, error }
    }

    const context = {
      requestingUserId: userIdResult.data!,
      reason,
      ipAddress: undefined, // Would be captured from request context
      userAgent: navigator?.userAgent
    }

    const result = await handleAsyncOperation(
      () => settingsService.updateUserSettings(userIdResult.data!, updates, context),
      (settings) => {
        setState(prev => ({ 
          ...prev, 
          userSettings: settings, 
          isDirty: false 
        }))
        if (onSettingsChange) {
          onSettingsChange(settings)
        }
      },
      'Failed to update user settings'
    )

    return result
  }, [user?.id, currentOrganization?.id, settingsService, handleAsyncOperation, onSettingsChange])

  const resetUserSettings = useCallback(async (): Promise<Result<UserSettings>> => {
    if (!user?.id || !currentOrganization?.id) {
      const error = RepositoryError.unauthorized('User or organization not available')
      return { success: false, error }
    }

    const userIdResult = createUserId(user.id)
    const orgIdResult = createOrganizationId(currentOrganization.id)

    if (!userIdResult.success || !orgIdResult.success) {
      const error = RepositoryError.validation('Invalid user or organization ID')
      return { success: false, error }
    }

    const result = await handleAsyncOperation(
      () => settingsService.resetUserSettingsToDefaults(
        userIdResult.data!, 
        orgIdResult.data!, 
        userIdResult.data!
      ),
      (settings) => {
        setState(prev => ({ 
          ...prev, 
          userSettings: settings, 
          isDirty: false 
        }))
        if (onSettingsChange) {
          onSettingsChange(settings)
        }
      },
      'Failed to reset user settings'
    )

    return result
  }, [user?.id, currentOrganization?.id, settingsService, handleAsyncOperation, onSettingsChange])

  // Organization Settings Actions (Admin only)
  const loadOrganizationSettings = useCallback(async () => {
    if (!user?.id || !currentOrganization?.id || !isAdminUser) return

    const userIdResult = createUserId(user.id)
    const orgIdResult = createOrganizationId(currentOrganization.id)

    if (!userIdResult.success || !orgIdResult.success) {
      setState(prev => ({ ...prev, error: 'Invalid user or organization ID' }))
      return
    }

    await handleAsyncOperation(
      () => settingsService.getOrganizationSettings(orgIdResult.data!, userIdResult.data!),
      (settings) => {
        setState(prev => ({ ...prev, organizationSettings: settings }))
        if (onSettingsChange) {
          onSettingsChange(settings)
        }
      },
      'Failed to load organization settings'
    )
  }, [user?.id, currentOrganization?.id, isAdminUser, settingsService, handleAsyncOperation, onSettingsChange])

  const updateOrganizationSettings = useCallback(async (
    updates: OrganizationSettingsUpdate
  ): Promise<Result<OrganizationSettings>> => {
    if (!user?.id || !currentOrganization?.id) {
      const error = RepositoryError.unauthorized('User or organization not available')
      return { success: false, error }
    }

    const userIdResult = createUserId(user.id)
    const orgIdResult = createOrganizationId(currentOrganization.id)

    if (!userIdResult.success || !orgIdResult.success) {
      const error = RepositoryError.validation('Invalid user or organization ID')
      return { success: false, error }
    }

    const result = await handleAsyncOperation(
      () => settingsService.updateOrganizationSettings(
        orgIdResult.data!, 
        updates, 
        userIdResult.data!
      ),
      (settings) => {
        setState(prev => ({ 
          ...prev, 
          organizationSettings: settings, 
          isDirty: false 
        }))
        if (onSettingsChange) {
          onSettingsChange(settings)
        }
      },
      'Failed to update organization settings'
    )

    return result
  }, [user?.id, currentOrganization?.id, settingsService, handleAsyncOperation, onSettingsChange])

  // Notification Actions
  const updateNotificationPreferences = useCallback(async (
    preferences: NotificationPreference[]
  ): Promise<Result<UserSettings>> => {
    if (!user?.id || !currentOrganization?.id) {
      const error = RepositoryError.unauthorized('User or organization not available')
      return { success: false, error }
    }

    const userIdResult = createUserId(user.id)
    const orgIdResult = createOrganizationId(currentOrganization.id)

    if (!userIdResult.success || !orgIdResult.success) {
      const error = RepositoryError.validation('Invalid user or organization ID')
      return { success: false, error }
    }

    const result = await handleAsyncOperation(
      () => settingsService.updateNotificationPreferences(
        userIdResult.data!,
        orgIdResult.data!,
        preferences,
        userIdResult.data!
      ),
      (settings) => {
        setState(prev => ({ 
          ...prev, 
          userSettings: settings, 
          isDirty: false 
        }))
        if (onSettingsChange) {
          onSettingsChange(settings)
        }
      },
      'Failed to update notification preferences'
    )

    return result
  }, [user?.id, currentOrganization?.id, settingsService, handleAsyncOperation, onSettingsChange])

  const toggleNotificationCategory = useCallback(async (
    category: string,
    enabled: boolean
  ): Promise<Result<UserSettings>> => {
    if (!state.userSettings?.notifications?.general?.categories) {
      const error = RepositoryError.validation('No notification categories found')
      return { success: false, error }
    }

    const updatedCategories = state.userSettings.notifications.general.categories.map(cat =>
      cat.categoryId === category ? { ...cat, enabled } : cat
    )

    const allPreferences = updatedCategories.flatMap(cat => cat.notifications)
    return updateNotificationPreferences(allPreferences)
  }, [state.userSettings, updateNotificationPreferences])

  // Export Actions
  const createExport = useCallback(async (
    configuration: ExportConfiguration
  ): Promise<Result<string>> => {
    if (!user?.id || !currentOrganization?.id) {
      const error = RepositoryError.unauthorized('User or organization not available')
      return { success: false, error }
    }

    const userIdResult = createUserId(user.id)
    const orgIdResult = createOrganizationId(currentOrganization.id)

    if (!userIdResult.success || !orgIdResult.success) {
      const error = RepositoryError.validation('Invalid user or organization ID')
      return { success: false, error }
    }

    const result = await handleAsyncOperation(
      () => settingsService.createExportConfiguration(
        userIdResult.data!,
        orgIdResult.data!,
        configuration,
        userIdResult.data!
      ),
      undefined,
      'Failed to create export'
    )

    return result
  }, [user?.id, currentOrganization?.id, settingsService, handleAsyncOperation])

  const createScheduledExport = useCallback(async (
    exportData: Omit<ScheduledExport, 'id'>
  ): Promise<Result<ScheduledExport>> => {
    if (!user?.id || !currentOrganization?.id) {
      const error = RepositoryError.unauthorized('User or organization not available')
      return { success: false, error }
    }

    const userIdResult = createUserId(user.id)
    const orgIdResult = createOrganizationId(currentOrganization.id)

    if (!userIdResult.success || !orgIdResult.success) {
      const error = RepositoryError.validation('Invalid user or organization ID')
      return { success: false, error }
    }

    const result = await handleAsyncOperation(
      () => settingsService.createScheduledExport(
        userIdResult.data!,
        orgIdResult.data!,
        exportData,
        userIdResult.data!
      ),
      (scheduledExport) => {
        // Update local state with new scheduled export
        setState(prev => {
          if (!prev.userSettings) return prev
          
          const currentExports = prev.userSettings.exports?.scheduled || []
          const updatedExports = [...currentExports, scheduledExport]
          
          return {
            ...prev,
            userSettings: {
              ...prev.userSettings,
              exports: {
                ...prev.userSettings.exports,
                scheduled: updatedExports
              }
            }
          }
        })
      },
      'Failed to create scheduled export'
    )

    return result
  }, [user?.id, currentOrganization?.id, settingsService, handleAsyncOperation])

  // Security Actions
  const logSecurityEvent = useCallback(async (
    eventData: Omit<SecurityEvent, 'timestamp'>
  ): Promise<Result<void>> => {
    if (!user?.id || !currentOrganization?.id) {
      const error = RepositoryError.unauthorized('User or organization not available')
      return { success: false, error }
    }

    const userIdResult = createUserId(user.id)
    const orgIdResult = createOrganizationId(currentOrganization.id)

    if (!userIdResult.success || !orgIdResult.success) {
      const error = RepositoryError.validation('Invalid user or organization ID')
      return { success: false, error }
    }

    const event: SecurityEvent = {
      ...eventData,
      timestamp: new Date().toISOString()
    }

    const result = await handleAsyncOperation(
      () => settingsService.logSecurityEvent(
        userIdResult.data!,
        orgIdResult.data!,
        event
      ),
      undefined,
      'Failed to log security event'
    )

    return result
  }, [user?.id, currentOrganization?.id, settingsService, handleAsyncOperation])

  // State Management Actions
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  const markClean = useCallback(() => {
    setState(prev => ({ ...prev, isDirty: false }))
  }, [])

  const refresh = useCallback(async () => {
    await Promise.all([
      loadUserSettings(),
      isAdminUser ? loadOrganizationSettings() : Promise.resolve()
    ])
  }, [loadUserSettings, loadOrganizationSettings, isAdminUser])

  // Load permissions based on user role and organization
  useEffect(() => {
    if (enablePermissionChecks && state.userSettings) {
      const userAccountType = state.userSettings.accountOverview?.accountType || 'Viewer'
      
      setPermissions({
        canViewSettings: ['Superuser', 'Administrator', 'User', 'Viewer'].includes(userAccountType),
        canEditProfile: ['Superuser', 'Administrator', 'User'].includes(userAccountType),
        canEditSecurity: ['Superuser', 'Administrator', 'User'].includes(userAccountType),
        canEditNotifications: ['Superuser', 'Administrator', 'User'].includes(userAccountType),
        canEditCompliance: ['Superuser', 'Administrator'].includes(userAccountType),
        canEditOrganizationSettings: ['Superuser', 'Administrator'].includes(userAccountType),
        canExportData: ['Superuser', 'Administrator', 'User'].includes(userAccountType),
        canCreateScheduledExports: ['Superuser', 'Administrator'].includes(userAccountType),
        restrictions: userAccountType === 'Viewer' ? ['Read-only access'] : []
      })
    }
  }, [enablePermissionChecks, state.userSettings])

  // Auto-load settings when dependencies are ready
  useEffect(() => {
    if (autoLoad && !authLoading && !orgLoading && user?.id && currentOrganization?.id) {
      loadUserSettings()
      if (isAdminUser) {
        loadOrganizationSettings()
      }
    }
  }, [autoLoad, authLoading, orgLoading, user?.id, currentOrganization?.id, isAdminUser, loadUserSettings, loadOrganizationSettings])

  // Mark dirty when settings change
  const markDirty = useCallback(() => {
    setState(prev => ({ ...prev, isDirty: true }))
  }, [])

  // Validation (placeholder for now - would implement actual validation logic)
  useEffect(() => {
    if (enableValidation && state.userSettings) {
      // Implement validation logic here
      setValidation({
        errors: {},
        warnings: {},
        isValid: true,
        canSave: true
      })
    }
  }, [enableValidation, state.userSettings])

  // Actions object
  const actions: SettingsActions = {
    loadUserSettings,
    updateUserSettings,
    resetUserSettings,
    loadOrganizationSettings,
    updateOrganizationSettings,
    updateNotificationPreferences,
    toggleNotificationCategory,
    createExport,
    createScheduledExport,
    logSecurityEvent,
    clearError,
    markClean,
    refresh
  }

  return {
    state,
    actions,
    validation,
    permissions,
    hasUnsavedChanges,
    isAdminUser,
    accountType
  }
}

// ==== Specialized Hooks ====

/**
 * Hook specifically for notification settings
 */
export function useNotificationSettings(options: UseSettingsOptions = {}) {
  const settings = useSettings(options)
  
  const notificationSettings = settings.state.userSettings?.notifications
  const categories = notificationSettings?.general?.categories || []
  
  return {
    ...settings,
    notificationSettings,
    categories,
    enabledCategories: categories.filter(cat => cat.enabled),
    totalNotifications: categories.reduce((sum, cat) => sum + cat.notifications.length, 0)
  }
}

/**
 * Hook specifically for security settings
 */
export function useSecuritySettings(options: UseSettingsOptions = {}) {
  const settings = useSettings(options)
  
  const securitySettings = settings.state.userSettings?.security
  const advancedSecurity = settings.state.userSettings?.advancedSecurity
  
  return {
    ...settings,
    securitySettings,
    advancedSecurity,
    mfaEnabled: securitySettings?.mfaEnabled || false,
    hasTrustedDevices: (advancedSecurity?.multiFactorAuth?.trustedDevices?.length || 0) > 0
  }
}

/**
 * Hook specifically for export settings
 */
export function useExportSettings(options: UseSettingsOptions = {}) {
  const settings = useSettings(options)
  
  const exportSettings = settings.state.userSettings?.exports
  const scheduledExports = exportSettings?.scheduled || []
  const backupPolicies = exportSettings?.backupPolicies || []
  
  return {
    ...settings,
    exportSettings,
    scheduledExports,
    backupPolicies,
    activeScheduledExports: scheduledExports.filter(exp => exp.enabled),
    nextScheduledExport: scheduledExports
      .filter(exp => exp.enabled)
      .sort((a, b) => new Date(a.nextRun).getTime() - new Date(b.nextRun).getTime())[0]
  }
}