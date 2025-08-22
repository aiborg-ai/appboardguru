/**
 * Settings Validation Provider
 * Comprehensive validation context and error handling for settings components
 * Follows CLAUDE.md patterns with Result pattern integration and type safety
 */

'use client'

import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react'
import { 
  UserSettings,
  OrganizationSettings,
  UserSettingsUpdate,
  validateUserSettings,
  validateOrganizationSettings,
  validateNotificationSettings,
  validateExportConfiguration,
  validateSecuritySettings,
  AccountType
} from '../../types/settings-validation'
import { 
  RepositoryError,
  ErrorCode,
  ErrorCategory,
  isValidationError,
  isAuthError,
  isResourceError,
  isRecoverableError,
  isCriticalError
} from '../../lib/repositories/result'
import { AlertTriangle, Check, Info, X, RefreshCw } from 'lucide-react'

// ==== Validation Context Types ====

export interface ValidationIssue {
  id: string
  field: string
  path: string[]
  type: 'error' | 'warning' | 'info'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  code?: string
  category?: string
  recoverable: boolean
  suggestions?: string[]
  helpUrl?: string
}

export interface FieldValidationState {
  isValid: boolean
  issues: ValidationIssue[]
  hasErrors: boolean
  hasWarnings: boolean
  canSave: boolean
}

export interface FormValidationState {
  isValid: boolean
  canSubmit: boolean
  fields: Record<string, FieldValidationState>
  globalIssues: ValidationIssue[]
  summary: {
    totalErrors: number
    totalWarnings: number
    criticalIssues: number
    recoverableIssues: number
  }
}

export interface ValidationContextValue {
  // State
  validationState: FormValidationState
  isValidating: boolean
  
  // Actions
  validateField: (field: string, value: any, context?: any) => Promise<FieldValidationState>
  validateForm: (data: any, schema: 'user' | 'organization' | 'notification' | 'export' | 'security') => Promise<FormValidationState>
  clearValidation: (field?: string) => void
  addCustomValidation: (field: string, validator: FieldValidator) => void
  removeCustomValidation: (field: string, validatorId: string) => void
  
  // Error Handling
  handleRepositoryError: (error: RepositoryError, context?: string) => ValidationIssue[]
  formatErrorMessage: (error: RepositoryError) => string
  getRecoveryActions: (error: RepositoryError) => RecoveryAction[]
  
  // UI Helpers
  getFieldStatus: (field: string) => 'valid' | 'invalid' | 'warning' | 'pending'
  getFieldMessage: (field: string) => string | null
  getFieldIcon: (field: string) => React.ReactNode
  shouldShowField: (field: string, accountType: AccountType) => boolean
}

export interface FieldValidator {
  id: string
  validate: (value: any, context?: any) => Promise<ValidationIssue[]> | ValidationIssue[]
  dependencies?: string[]
}

export interface RecoveryAction {
  id: string
  label: string
  description: string
  action: () => Promise<void> | void
  severity: 'primary' | 'secondary' | 'danger'
  icon?: React.ReactNode
}

// ==== Context Implementation ====

const ValidationContext = createContext<ValidationContextValue | null>(null)

export function useValidation() {
  const context = useContext(ValidationContext)
  if (!context) {
    throw new Error('useValidation must be used within a SettingsValidationProvider')
  }
  return context
}

// ==== Provider Component ====

interface SettingsValidationProviderProps {
  children: React.ReactNode
  accountType: AccountType
  organizationPolicies?: any
  onValidationChange?: (state: FormValidationState) => void
}

export function SettingsValidationProvider({
  children,
  accountType,
  organizationPolicies,
  onValidationChange
}: SettingsValidationProviderProps) {
  const [validationState, setValidationState] = useState<FormValidationState>({
    isValid: true,
    canSubmit: true,
    fields: {},
    globalIssues: [],
    summary: {
      totalErrors: 0,
      totalWarnings: 0,
      criticalIssues: 0,
      recoverableIssues: 0
    }
  })

  const [isValidating, setIsValidating] = useState(false)
  const [customValidators, setCustomValidators] = useState<Map<string, FieldValidator[]>>(new Map())

  // Update summary when validation state changes
  useEffect(() => {
    const fields = Object.values(validationState.fields)
    const allIssues = [
      ...validationState.globalIssues,
      ...fields.flatMap(field => field.issues)
    ]

    const summary = {
      totalErrors: allIssues.filter(issue => issue.type === 'error').length,
      totalWarnings: allIssues.filter(issue => issue.type === 'warning').length,
      criticalIssues: allIssues.filter(issue => issue.severity === 'critical').length,
      recoverableIssues: allIssues.filter(issue => issue.recoverable).length
    }

    const isValid = summary.totalErrors === 0
    const canSubmit = isValid && summary.criticalIssues === 0

    setValidationState(prev => ({
      ...prev,
      isValid,
      canSubmit,
      summary
    }))

    if (onValidationChange) {
      onValidationChange({
        ...validationState,
        isValid,
        canSubmit,
        summary
      })
    }
  }, [validationState.fields, validationState.globalIssues, onValidationChange])

  // Field validation
  const validateField = useCallback(async (
    field: string,
    value: any,
    context?: any
  ): Promise<FieldValidationState> => {
    const issues: ValidationIssue[] = []

    // Run custom validators
    const fieldValidators = customValidators.get(field) || []
    for (const validator of fieldValidators) {
      try {
        const validatorIssues = await validator.validate(value, context)
        issues.push(...validatorIssues)
      } catch (error) {
        issues.push({
          id: `${field}-${validator.id}-error`,
          field,
          path: [field],
          type: 'error',
          severity: 'medium',
          message: `Validation error: ${error instanceof Error ? error.message : String(error)}`,
          recoverable: true
        })
      }
    }

    // Run schema-based validation for specific field types
    if (field.includes('email') && value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(value)) {
        issues.push({
          id: `${field}-email-format`,
          field,
          path: [field],
          type: 'error',
          severity: 'medium',
          message: 'Please enter a valid email address',
          code: 'INVALID_EMAIL_FORMAT',
          recoverable: true,
          suggestions: ['Check for typos', 'Ensure format is name@domain.com']
        })
      }
    }

    if (field.includes('password') && value) {
      if (value.length < 8) {
        issues.push({
          id: `${field}-password-length`,
          field,
          path: [field],
          type: 'error',
          severity: 'high',
          message: 'Password must be at least 8 characters long',
          code: 'PASSWORD_TOO_SHORT',
          recoverable: true,
          suggestions: ['Use a longer password', 'Include numbers and symbols']
        })
      }
    }

    // Check organization policies
    if (organizationPolicies && field === 'mfaEnabled' && value === false) {
      if (organizationPolicies.requireMFA) {
        issues.push({
          id: `${field}-policy-violation`,
          field,
          path: [field],
          type: 'error',
          severity: 'critical',
          message: 'Multi-factor authentication is required by organization policy',
          code: 'POLICY_VIOLATION_MFA',
          category: 'POLICY',
          recoverable: false,
          suggestions: ['Contact your administrator to modify the organization policy']
        })
      }
    }

    // Permission-based validation
    if (!shouldShowField(field, accountType)) {
      issues.push({
        id: `${field}-permission-denied`,
        field,
        path: [field],
        type: 'error',
        severity: 'high',
        message: 'You do not have permission to modify this setting',
        code: 'INSUFFICIENT_PERMISSIONS',
        category: 'AUTHORIZATION',
        recoverable: false
      })
    }

    const fieldState: FieldValidationState = {
      isValid: issues.filter(i => i.type === 'error').length === 0,
      issues,
      hasErrors: issues.some(i => i.type === 'error'),
      hasWarnings: issues.some(i => i.type === 'warning'),
      canSave: issues.filter(i => i.type === 'error' && i.severity === 'critical').length === 0
    }

    setValidationState(prev => ({
      ...prev,
      fields: {
        ...prev.fields,
        [field]: fieldState
      }
    }))

    return fieldState
  }, [customValidators, organizationPolicies, accountType])

  // Form validation
  const validateForm = useCallback(async (
    data: any,
    schema: 'user' | 'organization' | 'notification' | 'export' | 'security'
  ): Promise<FormValidationState> => {
    setIsValidating(true)
    const issues: ValidationIssue[] = []

    try {
      let validationResult

      switch (schema) {
        case 'user':
          validationResult = validateUserSettings(data)
          break
        case 'organization':
          validationResult = validateOrganizationSettings(data)
          break
        case 'notification':
          validationResult = validateNotificationSettings(data)
          break
        case 'export':
          validationResult = validateExportConfiguration(data)
          break
        case 'security':
          validationResult = validateSecuritySettings(data)
          break
        default:
          throw new Error(`Unknown schema: ${schema}`)
      }

      if (!validationResult.success) {
        const zodIssues = validationResult.error.issues || []
        for (const zodIssue of zodIssues) {
          issues.push({
            id: `form-${zodIssue.path.join('.')}-${zodIssue.code}`,
            field: zodIssue.path.join('.'),
            path: zodIssue.path.map(String),
            type: 'error',
            severity: 'medium',
            message: zodIssue.message,
            code: zodIssue.code,
            recoverable: true,
            suggestions: getSuggestionsForZodIssue(zodIssue)
          })
        }
      }

      // Business rule validation
      if (schema === 'user' && data.security?.sessionTimeoutMinutes) {
        if (data.security.sessionTimeoutMinutes < 5) {
          issues.push({
            id: 'security-session-timeout-min',
            field: 'security.sessionTimeoutMinutes',
            path: ['security', 'sessionTimeoutMinutes'],
            type: 'warning',
            severity: 'medium',
            message: 'Very short session timeouts may impact user experience',
            recoverable: true,
            suggestions: ['Consider a minimum of 15 minutes for better usability']
          })
        }
      }

      const formState: FormValidationState = {
        isValid: issues.filter(i => i.type === 'error').length === 0,
        canSubmit: issues.filter(i => i.type === 'error' && i.severity === 'critical').length === 0,
        fields: {},
        globalIssues: issues,
        summary: {
          totalErrors: issues.filter(i => i.type === 'error').length,
          totalWarnings: issues.filter(i => i.type === 'warning').length,
          criticalIssues: issues.filter(i => i.severity === 'critical').length,
          recoverableIssues: issues.filter(i => i.recoverable).length
        }
      }

      setValidationState(formState)
      return formState

    } catch (error) {
      const errorIssue: ValidationIssue = {
        id: 'form-validation-error',
        field: 'form',
        path: [],
        type: 'error',
        severity: 'critical',
        message: `Form validation failed: ${error instanceof Error ? error.message : String(error)}`,
        recoverable: false
      }

      const errorState: FormValidationState = {
        isValid: false,
        canSubmit: false,
        fields: {},
        globalIssues: [errorIssue],
        summary: {
          totalErrors: 1,
          totalWarnings: 0,
          criticalIssues: 1,
          recoverableIssues: 0
        }
      }

      setValidationState(errorState)
      return errorState
    } finally {
      setIsValidating(false)
    }
  }, [])

  // Clear validation
  const clearValidation = useCallback((field?: string) => {
    if (field) {
      setValidationState(prev => {
        const newFields = { ...prev.fields }
        delete newFields[field]
        return { ...prev, fields: newFields }
      })
    } else {
      setValidationState({
        isValid: true,
        canSubmit: true,
        fields: {},
        globalIssues: [],
        summary: {
          totalErrors: 0,
          totalWarnings: 0,
          criticalIssues: 0,
          recoverableIssues: 0
        }
      })
    }
  }, [])

  // Custom validator management
  const addCustomValidation = useCallback((field: string, validator: FieldValidator) => {
    setCustomValidators(prev => {
      const fieldValidators = prev.get(field) || []
      const updated = [...fieldValidators.filter(v => v.id !== validator.id), validator]
      const newMap = new Map(prev)
      newMap.set(field, updated)
      return newMap
    })
  }, [])

  const removeCustomValidation = useCallback((field: string, validatorId: string) => {
    setCustomValidators(prev => {
      const fieldValidators = prev.get(field) || []
      const updated = fieldValidators.filter(v => v.id !== validatorId)
      const newMap = new Map(prev)
      if (updated.length === 0) {
        newMap.delete(field)
      } else {
        newMap.set(field, updated)
      }
      return newMap
    })
  }, [])

  // Error handling
  const handleRepositoryError = useCallback((
    error: RepositoryError,
    context?: string
  ): ValidationIssue[] => {
    const issues: ValidationIssue[] = []

    let severity: ValidationIssue['severity'] = 'medium'
    if (isCriticalError(error)) severity = 'critical'
    else if (error.severity === 'high') severity = 'high'
    else if (error.severity === 'low') severity = 'low'

    let type: ValidationIssue['type'] = 'error'
    if (error.category === ErrorCategory.VALIDATION) type = 'warning'

    const issue: ValidationIssue = {
      id: `repo-error-${error.code}-${Date.now()}`,
      field: context || 'form',
      path: context ? [context] : [],
      type,
      severity,
      message: error.message,
      code: error.code,
      category: error.category,
      recoverable: isRecoverableError(error),
      suggestions: getSuggestionsForRepositoryError(error),
      helpUrl: getHelpUrlForError(error)
    }

    issues.push(issue)

    // Add contextual issues based on error type
    if (isAuthError(error)) {
      issues.push({
        id: `auth-context-${Date.now()}`,
        field: 'authentication',
        path: ['auth'],
        type: 'info',
        severity: 'medium',
        message: 'Please verify your authentication status and permissions',
        recoverable: true,
        suggestions: ['Try refreshing the page', 'Log out and log back in']
      })
    }

    return issues
  }, [])

  const formatErrorMessage = useCallback((error: RepositoryError): string => {
    let message = error.message

    // Add context based on error category
    switch (error.category) {
      case ErrorCategory.VALIDATION:
        message = `Validation Error: ${message}`
        break
      case ErrorCategory.AUTHORIZATION:
        message = `Permission Error: ${message}`
        break
      case ErrorCategory.AUTHENTICATION:
        message = `Authentication Error: ${message}`
        break
      case ErrorCategory.NETWORK:
        message = `Network Error: ${message}`
        break
      case ErrorCategory.DATABASE:
        message = `Data Error: ${message}`
        break
    }

    return message
  }, [])

  const getRecoveryActions = useCallback((error: RepositoryError): RecoveryAction[] => {
    const actions: RecoveryAction[] = []

    if (isRecoverableError(error)) {
      if (error.category === ErrorCategory.NETWORK) {
        actions.push({
          id: 'retry-operation',
          label: 'Retry',
          description: 'Try the operation again',
          action: () => window.location.reload(),
          severity: 'primary',
          icon: <RefreshCw className="h-4 w-4" />
        })
      }

      if (error.category === ErrorCategory.AUTHENTICATION) {
        actions.push({
          id: 'refresh-auth',
          label: 'Refresh Session',
          description: 'Refresh your authentication session',
          action: () => window.location.reload(),
          severity: 'primary'
        })
      }

      if (error.category === ErrorCategory.VALIDATION) {
        actions.push({
          id: 'fix-validation',
          label: 'Fix Errors',
          description: 'Review and correct the validation errors',
          action: () => {
            // Focus on first error field
            const firstErrorField = document.querySelector('[data-validation-error="true"]') as HTMLElement
            firstErrorField?.focus()
          },
          severity: 'secondary'
        })
      }
    }

    return actions
  }, [])

  // UI helpers
  const getFieldStatus = useCallback((field: string): 'valid' | 'invalid' | 'warning' | 'pending' => {
    const fieldState = validationState.fields[field]
    if (!fieldState) return 'valid'
    
    if (isValidating) return 'pending'
    if (fieldState.hasErrors) return 'invalid'
    if (fieldState.hasWarnings) return 'warning'
    return 'valid'
  }, [validationState.fields, isValidating])

  const getFieldMessage = useCallback((field: string): string | null => {
    const fieldState = validationState.fields[field]
    if (!fieldState || fieldState.issues.length === 0) return null
    
    // Return the first error, or first warning if no errors
    const firstError = fieldState.issues.find(i => i.type === 'error')
    const firstWarning = fieldState.issues.find(i => i.type === 'warning')
    
    return (firstError || firstWarning)?.message || null
  }, [validationState.fields])

  const getFieldIcon = useCallback((field: string): React.ReactNode => {
    const status = getFieldStatus(field)
    
    switch (status) {
      case 'valid':
        return <Check className="h-4 w-4 text-green-500" />
      case 'invalid':
        return <X className="h-4 w-4 text-red-500" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'pending':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
      default:
        return <Info className="h-4 w-4 text-gray-400" />
    }
  }, [getFieldStatus])

  const shouldShowField = useCallback((field: string, accountType: AccountType): boolean => {
    // Admin-only fields
    const adminOnlyFields = [
      'organizationSettings',
      'globalPolicies',
      'complianceSettings',
      'backupPolicies'
    ]

    if (adminOnlyFields.some(prefix => field.startsWith(prefix))) {
      return ['Superuser', 'Administrator'].includes(accountType)
    }

    // Superuser-only fields
    const superuserOnlyFields = [
      'security.allowedLoginIPs',
      'compliance.regulatoryFrameworks'
    ]

    if (superuserOnlyFields.includes(field)) {
      return accountType === 'Superuser'
    }

    return true
  }, [])

  const contextValue: ValidationContextValue = {
    validationState,
    isValidating,
    validateField,
    validateForm,
    clearValidation,
    addCustomValidation,
    removeCustomValidation,
    handleRepositoryError,
    formatErrorMessage,
    getRecoveryActions,
    getFieldStatus,
    getFieldMessage,
    getFieldIcon,
    shouldShowField
  }

  return (
    <ValidationContext.Provider value={contextValue}>
      {children}
    </ValidationContext.Provider>
  )
}

// ==== Helper Functions ====

function getSuggestionsForZodIssue(issue: any): string[] {
  const suggestions = []

  switch (issue.code) {
    case 'invalid_type':
      suggestions.push(`Expected ${issue.expected}, received ${issue.received}`)
      break
    case 'too_small':
      if (issue.type === 'string') {
        suggestions.push(`Enter at least ${issue.minimum} characters`)
      } else {
        suggestions.push(`Value must be at least ${issue.minimum}`)
      }
      break
    case 'too_big':
      if (issue.type === 'string') {
        suggestions.push(`Enter no more than ${issue.maximum} characters`)
      } else {
        suggestions.push(`Value must be no more than ${issue.maximum}`)
      }
      break
    case 'invalid_string':
      if (issue.validation === 'email') {
        suggestions.push('Enter a valid email address (e.g., user@example.com)')
      } else if (issue.validation === 'url') {
        suggestions.push('Enter a valid URL (e.g., https://example.com)')
      }
      break
  }

  return suggestions
}

function getSuggestionsForRepositoryError(error: RepositoryError): string[] {
  const suggestions = []

  switch (error.code) {
    case ErrorCode.VALIDATION_ERROR:
      suggestions.push('Check the format and content of your input')
      suggestions.push('Ensure all required fields are filled')
      break
    case ErrorCode.UNAUTHORIZED:
      suggestions.push('Log in again to refresh your session')
      suggestions.push('Contact your administrator if the problem persists')
      break
    case ErrorCode.FORBIDDEN:
      suggestions.push('Contact your administrator to request additional permissions')
      break
    case ErrorCode.NOT_FOUND:
      suggestions.push('Refresh the page to get the latest data')
      break
    case ErrorCode.CONFLICT:
      suggestions.push('Someone else may have modified this data. Refresh and try again')
      break
    case ErrorCode.QUOTA_EXCEEDED:
      suggestions.push('Contact your administrator to increase your quota')
      break
    case ErrorCode.NETWORK_ERROR:
      suggestions.push('Check your internet connection')
      suggestions.push('Try again in a moment')
      break
  }

  return suggestions
}

function getHelpUrlForError(error: RepositoryError): string | undefined {
  // Return help URLs based on error type
  switch (error.category) {
    case ErrorCategory.AUTHENTICATION:
      return '/help/authentication'
    case ErrorCategory.AUTHORIZATION:
      return '/help/permissions'
    case ErrorCategory.VALIDATION:
      return '/help/data-validation'
    default:
      return '/help/troubleshooting'
  }
}