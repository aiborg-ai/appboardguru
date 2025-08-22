import { renderHook } from '@testing-library/react'
import { useUserContext, useAccountType, useUserIds } from '../useUserContext'
import { authStore } from '@/lib/stores/auth-store'
import { organizationStore } from '@/lib/stores/organization-store'

// Mock the stores
jest.mock('@/lib/stores/auth-store', () => ({
  useAuth: jest.fn(),
  useUser: jest.fn(),
  useIsAuthenticated: jest.fn(),
}))

jest.mock('@/lib/stores/organization-store', () => ({
  useCurrentOrganization: jest.fn(),
  useOrganizations: jest.fn(),
}))

describe('useUserContext', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    full_name: 'Test User',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    profile: {
      display_name: 'Test User',
    },
    preferences: {
      theme: 'light' as const,
      language: 'en',
      timezone: 'UTC',
      email_notifications: true,
      push_notifications: true,
      desktop_notifications: true,
      notification_frequency: 'real_time' as const,
      auto_save: true,
      default_view: 'grid' as const,
    },
  }

  const mockOrganization = {
    id: 'org-456',
    name: 'Test Organization',
    slug: 'test-org',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    userRole: 'admin' as const,
    membershipStatus: 'active' as const,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns success with proper user context when authenticated', () => {
    // Mock store returns
    require('@/lib/stores/auth-store').useUser.mockReturnValue(mockUser)
    require('@/lib/stores/auth-store').useIsAuthenticated.mockReturnValue(true)
    require('@/lib/stores/auth-store').useAuth.mockReturnValue({
      isLoading: false,
      loading: {},
      isInitialized: true,
      errors: {},
    })
    require('@/lib/stores/organization-store').useCurrentOrganization.mockReturnValue(mockOrganization)
    require('@/lib/stores/organization-store').useOrganizations.mockReturnValue([mockOrganization])

    const { result } = renderHook(() => useUserContext())

    expect(result.current.success).toBe(true)
    expect(result.current.data).toBeDefined()
    expect(result.current.data!.user).toEqual(mockUser)
    expect(result.current.data!.userId).toBe('user-123')
    expect(result.current.data!.currentOrganization).toEqual(mockOrganization)
    expect(result.current.data!.organizationId).toBe('org-456')
    expect(result.current.data!.accountType).toBe('Administrator')
    expect(result.current.data!.isAuthenticated).toBe(true)
  })

  it('returns error when user is not authenticated', () => {
    require('@/lib/stores/auth-store').useUser.mockReturnValue(null)
    require('@/lib/stores/auth-store').useIsAuthenticated.mockReturnValue(false)
    require('@/lib/stores/auth-store').useAuth.mockReturnValue({
      isLoading: false,
      loading: {},
      isInitialized: true,
      errors: {},
    })

    const { result } = renderHook(() => useUserContext())

    expect(result.current.success).toBe(false)
    expect(result.current.error?.code).toBe('UNAUTHENTICATED')
  })

  it('determines account type correctly for different roles', () => {
    const testCases = [
      { userRole: 'owner', expected: 'Administrator' },
      { userRole: 'admin', expected: 'Administrator' },
      { userRole: 'member', expected: 'User' },
      { userRole: 'viewer', expected: 'Viewer' },
    ]

    testCases.forEach(({ userRole, expected }) => {
      require('@/lib/stores/auth-store').useUser.mockReturnValue(mockUser)
      require('@/lib/stores/auth-store').useIsAuthenticated.mockReturnValue(true)
      require('@/lib/stores/auth-store').useAuth.mockReturnValue({
        isLoading: false,
        loading: {},
        isInitialized: true,
        errors: {},
      })
      require('@/lib/stores/organization-store').useCurrentOrganization.mockReturnValue({
        ...mockOrganization,
        userRole,
      })

      const { result } = renderHook(() => useAccountType())
      expect(result.current).toBe(expected)
    })
  })

  it('handles superuser role for platform admins', () => {
    const superuserUser = {
      ...mockUser,
      email: 'admin@appboardguru.com',
    }

    require('@/lib/stores/auth-store').useUser.mockReturnValue(superuserUser)
    require('@/lib/stores/auth-store').useIsAuthenticated.mockReturnValue(true)
    require('@/lib/stores/auth-store').useAuth.mockReturnValue({
      isLoading: false,
      loading: {},
      isInitialized: true,
      errors: {},
    })
    require('@/lib/stores/organization-store').useCurrentOrganization.mockReturnValue(mockOrganization)

    const { result } = renderHook(() => useAccountType())
    expect(result.current).toBe('Superuser')
  })

  it('returns proper user IDs with branded types', () => {
    require('@/lib/stores/auth-store').useUser.mockReturnValue(mockUser)
    require('@/lib/stores/auth-store').useIsAuthenticated.mockReturnValue(true)
    require('@/lib/stores/auth-store').useAuth.mockReturnValue({
      isLoading: false,
      loading: {},
      isInitialized: true,
      errors: {},
    })
    require('@/lib/stores/organization-store').useCurrentOrganization.mockReturnValue(mockOrganization)

    const { result } = renderHook(() => useUserIds())

    expect(result.current.userId).toBe('user-123')
    expect(result.current.organizationId).toBe('org-456')
  })
})