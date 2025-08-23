/**
 * useUserContext Hook Tests
 * Following CLAUDE.md testing guidelines - 85% coverage target for hooks
 */

import { renderHook, waitFor } from '@testing-library/react'
import { jest } from '@jest/globals'
import { useUserContext, type UserContextResult, type UserContextData } from '../useUserContext'
import { UserContextFactory } from '@/testing/settings-test-factories'
import { setupTestEnvironment } from '@/testing/settings-test-config'
import type { UserId, OrganizationId } from '@/types/branded'

// Mock stores
const mockUseUser = jest.fn()
const mockUseIsAuthenticated = jest.fn()
const mockUseCurrentOrganization = jest.fn()
const mockUseOrganizations = jest.fn()
const mockUseAuth = jest.fn()

jest.mock('@/lib/stores/auth-store', () => ({
  useUser: mockUseUser,
  useIsAuthenticated: mockUseIsAuthenticated,
  useAuth: mockUseAuth
}))

jest.mock('@/lib/stores/organization-store', () => ({
  useCurrentOrganization: mockUseCurrentOrganization,
  useOrganizations: mockUseOrganizations
}))

describe('useUserContext Hook', () => {
  beforeEach(() => {
    setupTestEnvironment()
    jest.clearAllMocks()
  })

  describe('Successful Authentication Scenarios', () => {
    test('should return successful result with complete user data', () => {
      // Arrange
      const mockUser = {
        id: 'user-123' as UserId,
        email: 'admin@appboardguru.com',
        name: 'Test Admin'
      }
      
      const mockOrganization = {
        id: 'org-456' as OrganizationId,
        name: 'Test Organization',
        role: 'admin'
      }

      mockUseUser.mockReturnValue(mockUser)
      mockUseIsAuthenticated.mockReturnValue(true)
      mockUseCurrentOrganization.mockReturnValue(mockOrganization)
      mockUseOrganizations.mockReturnValue([mockOrganization])
      mockUseAuth.mockReturnValue({
        isLoading: false,
        loading: { initialize: false },
        isInitialized: true,
        errors: {}
      })

      // Act
      const { result } = renderHook(() => useUserContext())

      // Assert
      expect(result.current.success).toBe(true)
      expect(result.current.data).toBeDefined()
      
      const userData = result.current.data!
      expect(userData.user).toEqual(mockUser)
      expect(userData.userId).toBe('user-123')
      expect(userData.isAuthenticated).toBe(true)
      expect(userData.accountType).toBe('Superuser') // Admin email domain
      expect(userData.organizationId).toBe('org-456')
      expect(userData.isLoading).toBe(false)
      expect(userData.hasError).toBe(false)
    })

    test('should determine Superuser account type for @appboardguru.com emails', () => {
      // Arrange
      const mockUser = {
        id: 'user-123' as UserId,
        email: 'admin@appboardguru.com',
        name: 'Platform Admin'
      }
      
      mockUseUser.mockReturnValue(mockUser)
      mockUseIsAuthenticated.mockReturnValue(true)
      mockUseCurrentOrganization.mockReturnValue(null)
      mockUseOrganizations.mockReturnValue([])
      mockUseAuth.mockReturnValue({
        isLoading: false,
        loading: { initialize: false },
        isInitialized: true,
        errors: {}
      })

      // Act
      const { result } = renderHook(() => useUserContext())

      // Assert
      expect(result.current.success).toBe(true)
      expect(result.current.data?.accountType).toBe('Superuser')
    })

    test('should determine Administrator account type for organization owners', () => {
      // Arrange
      const mockUser = {
        id: 'user-123' as UserId,
        email: 'owner@company.com',
        name: 'Org Owner'
      }
      
      const mockOrganization = {
        id: 'org-456' as OrganizationId,
        name: 'Test Organization',
        role: 'owner'
      }

      mockUseUser.mockReturnValue(mockUser)
      mockUseIsAuthenticated.mockReturnValue(true)
      mockUseCurrentOrganization.mockReturnValue(mockOrganization)
      mockUseOrganizations.mockReturnValue([mockOrganization])
      mockUseAuth.mockReturnValue({
        isLoading: false,
        loading: { initialize: false },
        isInitialized: true,
        errors: {}
      })

      // Act
      const { result } = renderHook(() => useUserContext())

      // Assert
      expect(result.current.success).toBe(true)
      expect(result.current.data?.accountType).toBe('Administrator')
    })

    test('should determine User account type for organization members', () => {
      // Arrange
      const mockUser = {
        id: 'user-123' as UserId,
        email: 'member@company.com',
        name: 'Org Member'
      }
      
      const mockOrganization = {
        id: 'org-456' as OrganizationId,
        name: 'Test Organization',
        role: 'member'
      }

      mockUseUser.mockReturnValue(mockUser)
      mockUseIsAuthenticated.mockReturnValue(true)
      mockUseCurrentOrganization.mockReturnValue(mockOrganization)
      mockUseOrganizations.mockReturnValue([mockOrganization])
      mockUseAuth.mockReturnValue({
        isLoading: false,
        loading: { initialize: false },
        isInitialized: true,
        errors: {}
      })

      // Act
      const { result } = renderHook(() => useUserContext())

      // Assert
      expect(result.current.success).toBe(true)
      expect(result.current.data?.accountType).toBe('User')
    })

    test('should determine Viewer account type for viewers or no organization', () => {
      // Arrange
      const mockUser = {
        id: 'user-123' as UserId,
        email: 'viewer@company.com',
        name: 'Viewer User'
      }
      
      mockUseUser.mockReturnValue(mockUser)
      mockUseIsAuthenticated.mockReturnValue(true)
      mockUseCurrentOrganization.mockReturnValue(null)
      mockUseOrganizations.mockReturnValue([])
      mockUseAuth.mockReturnValue({
        isLoading: false,
        loading: { initialize: false },
        isInitialized: true,
        errors: {}
      })

      // Act
      const { result } = renderHook(() => useUserContext())

      // Assert
      expect(result.current.success).toBe(true)
      expect(result.current.data?.accountType).toBe('Viewer')
    })
  })

  describe('Loading States', () => {
    test('should return loading state when auth is initializing', () => {
      // Arrange
      mockUseUser.mockReturnValue(null)
      mockUseIsAuthenticated.mockReturnValue(false)
      mockUseCurrentOrganization.mockReturnValue(null)
      mockUseOrganizations.mockReturnValue([])
      mockUseAuth.mockReturnValue({
        isLoading: true,
        loading: { initialize: true },
        isInitialized: false,
        errors: {}
      })

      // Act
      const { result } = renderHook(() => useUserContext())

      // Assert
      expect(result.current.success).toBe(true)
      expect(result.current.data?.isLoading).toBe(true)
    })

    test('should return loading state when not initialized', () => {
      // Arrange
      mockUseUser.mockReturnValue(null)
      mockUseIsAuthenticated.mockReturnValue(false)
      mockUseCurrentOrganization.mockReturnValue(null)
      mockUseOrganizations.mockReturnValue([])
      mockUseAuth.mockReturnValue({
        isLoading: false,
        loading: { initialize: false },
        isInitialized: false,
        errors: {}
      })

      // Act
      const { result } = renderHook(() => useUserContext())

      // Assert
      expect(result.current.success).toBe(true)
      expect(result.current.data?.isLoading).toBe(true)
    })
  })

  describe('Error Handling', () => {
    test('should return unauthenticated error when user is not authenticated', () => {
      // Arrange
      mockUseUser.mockReturnValue(null)
      mockUseIsAuthenticated.mockReturnValue(false)
      mockUseCurrentOrganization.mockReturnValue(null)
      mockUseOrganizations.mockReturnValue([])
      mockUseAuth.mockReturnValue({
        isLoading: false,
        loading: { initialize: false },
        isInitialized: true,
        errors: {}
      })

      // Act
      const { result } = renderHook(() => useUserContext())

      // Assert
      expect(result.current.success).toBe(false)
      expect(result.current.error?.code).toBe('UNAUTHENTICATED')
      expect(result.current.error?.message).toBe('User is not authenticated')
    })

    test('should handle initialization errors', () => {
      // Arrange
      const mockError = 'Failed to initialize user session'
      
      mockUseUser.mockReturnValue(null)
      mockUseIsAuthenticated.mockReturnValue(false)
      mockUseCurrentOrganization.mockReturnValue(null)
      mockUseOrganizations.mockReturnValue([])
      mockUseAuth.mockReturnValue({
        isLoading: false,
        loading: { initialize: false },
        isInitialized: true,
        errors: { initialize: mockError }
      })

      // Act
      const { result } = renderHook(() => useUserContext())

      // Assert
      expect(result.current.success).toBe(true)
      expect(result.current.data?.hasError).toBe(true)
      expect(result.current.data?.errorMessage).toBe(mockError)
    })

    test('should handle sign-in errors', () => {
      // Arrange
      const mockError = 'Invalid credentials'
      
      mockUseUser.mockReturnValue(null)
      mockUseIsAuthenticated.mockReturnValue(false)
      mockUseCurrentOrganization.mockReturnValue(null)
      mockUseOrganizations.mockReturnValue([])
      mockUseAuth.mockReturnValue({
        isLoading: false,
        loading: { initialize: false },
        isInitialized: true,
        errors: { signIn: mockError }
      })

      // Act
      const { result } = renderHook(() => useUserContext())

      // Assert
      expect(result.current.success).toBe(true)
      expect(result.current.data?.hasError).toBe(true)
      expect(result.current.data?.errorMessage).toBe(mockError)
    })
  })

  describe('Memoization and Performance', () => {
    test('should memoize result when dependencies do not change', () => {
      // Arrange
      const mockUser = {
        id: 'user-123' as UserId,
        email: 'test@company.com',
        name: 'Test User'
      }
      
      mockUseUser.mockReturnValue(mockUser)
      mockUseIsAuthenticated.mockReturnValue(true)
      mockUseCurrentOrganization.mockReturnValue(null)
      mockUseOrganizations.mockReturnValue([])
      mockUseAuth.mockReturnValue({
        isLoading: false,
        loading: { initialize: false },
        isInitialized: true,
        errors: {}
      })

      // Act
      const { result, rerender } = renderHook(() => useUserContext())
      const firstResult = result.current
      
      rerender()
      const secondResult = result.current

      // Assert - Should be the same object reference due to memoization
      expect(firstResult).toBe(secondResult)
    })

    test('should update result when user changes', () => {
      // Arrange
      const mockUser1 = {
        id: 'user-123' as UserId,
        email: 'user1@company.com',
        name: 'User One'
      }
      
      const mockUser2 = {
        id: 'user-456' as UserId,
        email: 'user2@company.com',
        name: 'User Two'
      }
      
      mockUseUser.mockReturnValue(mockUser1)
      mockUseIsAuthenticated.mockReturnValue(true)
      mockUseCurrentOrganization.mockReturnValue(null)
      mockUseOrganizations.mockReturnValue([])
      mockUseAuth.mockReturnValue({
        isLoading: false,
        loading: { initialize: false },
        isInitialized: true,
        errors: {}
      })

      // Act
      const { result, rerender } = renderHook(() => useUserContext())
      const firstResult = result.current
      
      // Change mock data
      mockUseUser.mockReturnValue(mockUser2)
      rerender()
      const secondResult = result.current

      // Assert
      expect(firstResult).not.toBe(secondResult)
      expect(secondResult.data?.user?.id).toBe('user-456')
      expect(secondResult.data?.user?.name).toBe('User Two')
    })
  })

  describe('Edge Cases', () => {
    test('should handle null user with authenticated state', () => {
      // Arrange
      mockUseUser.mockReturnValue(null)
      mockUseIsAuthenticated.mockReturnValue(true) // Edge case
      mockUseCurrentOrganization.mockReturnValue(null)
      mockUseOrganizations.mockReturnValue([])
      mockUseAuth.mockReturnValue({
        isLoading: false,
        loading: { initialize: false },
        isInitialized: true,
        errors: {}
      })

      // Act
      const { result } = renderHook(() => useUserContext())

      // Assert
      expect(result.current.success).toBe(true)
      expect(result.current.data?.user).toBeNull()
      expect(result.current.data?.userId).toBeNull()
      expect(result.current.data?.accountType).toBe('Viewer')
    })

    test('should handle organizations array without current organization', () => {
      // Arrange
      const mockUser = {
        id: 'user-123' as UserId,
        email: 'user@company.com',
        name: 'Test User'
      }
      
      const mockOrganizations = [
        {
          id: 'org-1' as OrganizationId,
          name: 'Org One',
          role: 'member'
        },
        {
          id: 'org-2' as OrganizationId,
          name: 'Org Two',
          role: 'admin'
        }
      ]
      
      mockUseUser.mockReturnValue(mockUser)
      mockUseIsAuthenticated.mockReturnValue(true)
      mockUseCurrentOrganization.mockReturnValue(null)
      mockUseOrganizations.mockReturnValue(mockOrganizations)
      mockUseAuth.mockReturnValue({
        isLoading: false,
        loading: { initialize: false },
        isInitialized: true,
        errors: {}
      })

      // Act
      const { result } = renderHook(() => useUserContext())

      // Assert
      expect(result.current.success).toBe(true)
      expect(result.current.data?.currentOrganization).toBeNull()
      expect(result.current.data?.organizationId).toBeNull()
      expect(result.current.data?.organizations).toEqual(mockOrganizations)
    })
  })

  describe('Type Safety', () => {
    test('should maintain branded type safety for IDs', () => {
      // Arrange
      const userId = 'user-123' as UserId
      const organizationId = 'org-456' as OrganizationId
      
      const mockUser = {
        id: userId,
        email: 'test@company.com',
        name: 'Test User'
      }
      
      const mockOrganization = {
        id: organizationId,
        name: 'Test Organization',
        role: 'member'
      }

      mockUseUser.mockReturnValue(mockUser)
      mockUseIsAuthenticated.mockReturnValue(true)
      mockUseCurrentOrganization.mockReturnValue(mockOrganization)
      mockUseOrganizations.mockReturnValue([mockOrganization])
      mockUseAuth.mockReturnValue({
        isLoading: false,
        loading: { initialize: false },
        isInitialized: true,
        errors: {}
      })

      // Act
      const { result } = renderHook(() => useUserContext())

      // Assert
      expect(result.current.success).toBe(true)
      
      // TypeScript should enforce these are branded types
      const data = result.current.data!
      expect(data.userId).toBe(userId)
      expect(data.organizationId).toBe(organizationId)
      
      // These should pass TypeScript compilation with branded types
      const userIdTyped: UserId = data.userId!
      const orgIdTyped: OrganizationId = data.organizationId!
      
      expect(userIdTyped).toBe('user-123')
      expect(orgIdTyped).toBe('org-456')
    })
  })
})