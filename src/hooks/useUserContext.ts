'use client'

import { useMemo } from 'react'
import { useAuth, useUser, useIsAuthenticated } from '@/lib/stores/auth-store'
import { useCurrentOrganization, useOrganizations } from '@/lib/stores/organization-store'
import type { UserId, OrganizationId } from '@/types/branded'
import type { UserWithProfile, OrganizationWithRole } from '@/lib/stores/types'

// User context interface following CLAUDE.md patterns
export interface UserContextData {
  // User information with branded types
  user: UserWithProfile | null
  userId: UserId | null
  isAuthenticated: boolean
  
  // Organization context
  currentOrganization: OrganizationWithRole | null
  organizationId: OrganizationId | null
  organizations: OrganizationWithRole[]
  
  // Account type determination
  accountType: 'Superuser' | 'Administrator' | 'User' | 'Viewer'
  
  // Loading and error states
  isLoading: boolean
  hasError: boolean
  errorMessage: string | null
}

// Result pattern for user context
export interface UserContextResult {
  success: boolean
  data?: UserContextData
  error?: {
    message: string
    code: 'UNAUTHENTICATED' | 'NO_ORGANIZATION' | 'INITIALIZATION_ERROR'
  }
}

/**
 * Enhanced user context hook following CLAUDE.md architecture patterns:
 * - Result pattern for error handling
 * - Branded types for type safety
 * - Comprehensive user and organization context
 * - Loading and error states
 */
export function useUserContext(): UserContextResult {
  // Get auth state
  const user = useUser()
  const isAuthenticated = useIsAuthenticated()
  const authStore = useAuth()
  
  // Get organization state
  const currentOrganization = useCurrentOrganization()
  const organizations = useOrganizations()
  
  // Compute derived state with proper error handling
  const contextData = useMemo((): UserContextData => {
    // Extract user ID with branded type safety
    const userId = user?.id as UserId | null
    
    // Extract organization ID with branded type safety
    const organizationId = currentOrganization?.id as OrganizationId | null
    
    // Determine account type based on organization role and user data
    const accountType = determineAccountType(user, currentOrganization)
    
    // Aggregate loading states
    const isLoading = authStore.isLoading || 
                     authStore.loading.initialize ||
                     !authStore.isInitialized
    
    // Check for errors
    const hasError = !!(authStore.errors.initialize || 
                       authStore.errors.signIn ||
                       authStore.errors.signUp)
    
    const errorMessage = authStore.errors.initialize ||
                        authStore.errors.signIn ||
                        authStore.errors.signUp ||
                        null
    
    return {
      user,
      userId,
      isAuthenticated,
      currentOrganization,
      organizationId,
      organizations,
      accountType,
      isLoading,
      hasError,
      errorMessage
    }
  }, [user, isAuthenticated, currentOrganization, organizations, authStore])
  
  // Apply Result pattern for comprehensive error handling
  if (!isAuthenticated && authStore.isInitialized) {
    return {
      success: false,
      error: {
        message: 'User is not authenticated',
        code: 'UNAUTHENTICATED'
      }
    }
  }
  
  if (contextData.hasError) {
    return {
      success: false,
      error: {
        message: contextData.errorMessage || 'User context initialization failed',
        code: 'INITIALIZATION_ERROR'
      }
    }
  }
  
  // For settings that require organization context
  if (contextData.isAuthenticated && !contextData.currentOrganization && !contextData.isLoading) {
    // This is not always an error - users might not belong to any organization
    // But for settings that require organization context, we should handle this
    console.warn('[UserContext] User is authenticated but has no current organization')
  }
  
  return {
    success: true,
    data: contextData
  }
}

/**
 * Determine account type based on user and organization data
 * Following the platform's role hierarchy
 */
function determineAccountType(
  user: UserWithProfile | null,
  organization: OrganizationWithRole | null
): 'Superuser' | 'Administrator' | 'User' | 'Viewer' {
  if (!user) return 'Viewer'
  
  // Check for platform-level admin role (this would be stored in user metadata)
  if (user.email?.endsWith('@appboardguru.com') || user.profile?.display_name?.includes('Admin')) {
    return 'Superuser'
  }
  
  // Check organization-level role
  if (organization) {
    switch (organization.userRole) {
      case 'owner':
        return 'Administrator'
      case 'admin':
        return 'Administrator'
      case 'member':
        return 'User'
      case 'viewer':
        return 'Viewer'
      default:
        return 'User'
    }
  }
  
  // Default role for authenticated users without organization
  return 'User'
}

/**
 * Type-safe hooks for specific context data
 * Following CLAUDE.md's atomic design principles
 */
export function useUserContextData(): UserContextData | null {
  const result = useUserContext()
  return result.success ? result.data! : null
}

export function useAccountType(): 'Superuser' | 'Administrator' | 'User' | 'Viewer' {
  const result = useUserContext()
  return result.success ? result.data!.accountType : 'Viewer'
}

export function useUserIds(): { userId: UserId | null; organizationId: OrganizationId | null } {
  const result = useUserContext()
  return result.success 
    ? { 
        userId: result.data!.userId, 
        organizationId: result.data!.organizationId 
      }
    : { userId: null, organizationId: null }
}

/**
 * Loading states for UI components
 */
export function useUserContextLoading(): {
  isLoading: boolean
  isInitialized: boolean
  hasError: boolean
  errorMessage: string | null
} {
  const result = useUserContext()
  
  if (result.success) {
    return {
      isLoading: result.data!.isLoading,
      isInitialized: !result.data!.isLoading,
      hasError: result.data!.hasError,
      errorMessage: result.data!.errorMessage
    }
  }
  
  return {
    isLoading: false,
    isInitialized: true,
    hasError: true,
    errorMessage: result.error?.message || 'Unknown error'
  }
}